BEGIN;
ALTER TABLE public.portal_user_access DROP CONSTRAINT portal_user_access_access_level_check;
ALTER TABLE public.portal_user_access ADD CONSTRAINT portal_user_access_access_level_check
 CHECK(access_level IN ('public','student','trainee','member','leader','technician'));

-- Technical staff retain the same trusted admin roles used throughout existing APIs/RLS.
-- No account is promoted by installing this migration.
ALTER FUNCTION public.portal_set_access(jsonb) RENAME TO portal_set_access_before_technicians;
REVOKE ALL ON FUNCTION public.portal_set_access_before_technicians(jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.portal_set_access(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE desired text:=p_data->>'access_level'; target uuid:=(p_data->>'user_id')::uuid; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF desired='technician' THEN
  -- Keep the original recovery-account guard: seed administrators remain leaders.
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=target AND lower(email) IN ('teraroboticstl@gmail.com','nathannovaes16@gmail.com')) THEN RAISE EXCEPTION 'As contas responsáveis pela recuperação do portal devem permanecer líderes.'; END IF;
  result:=public.portal_set_access_before_technicians(p_data || jsonb_build_object('access_level','leader'));
  UPDATE public.portal_user_access SET access_level='technician' WHERE user_id=target;
  INSERT INTO public.ava_audit_logs(actor_id,action,entity_id,details)
   VALUES(auth.uid(),'set_technician_level',target::text,jsonb_build_object('access_level','technician','status',p_data->>'status'));
  RETURN result;
 END IF;
 RETURN public.portal_set_access_before_technicians(p_data);
END $$;
REVOKE ALL ON FUNCTION public.portal_set_access(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_set_access(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_access_level() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT CASE WHEN public.is_admin() THEN
  CASE WHEN EXISTS(SELECT 1 FROM public.portal_user_access WHERE user_id=auth.uid() AND access_level='technician') THEN 'technician' ELSE 'leader' END
 ELSE coalesce((SELECT coalesce(a.access_level,
  CASE WHEN p.status='approved' AND coalesce(a.portal_internal,true) THEN CASE WHEN p.member_role='member' OR p.role='mentor' THEN 'member' ELSE 'trainee' END
  WHEN a.user_id IS NOT NULL THEN 'student' ELSE 'public' END)
  FROM public.profiles p LEFT JOIN public.portal_user_access a ON a.user_id=p.id WHERE p.id=auth.uid()),'public') END;
$$;
COMMIT;
