BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.portal_user_access WHERE access_level='management_readonly') THEN RAISE EXCEPTION 'MANAGEMENT_REASSIGN_BEFORE_ROLLBACK'; END IF;
END $$;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['profiles','portal_user_access'] LOOP
  EXECUTE format('DROP POLICY management_no_insert ON public.%I',tab);
  EXECUTE format('DROP POLICY management_no_update ON public.%I',tab);
  EXECUTE format('DROP POLICY management_no_delete ON public.%I',tab);
 END LOOP;
END $$;
DROP FUNCTION public.portal_management_records(text,text),public.portal_management_reader(),public.portal_management_assigned();
CREATE OR REPLACE FUNCTION public.portal_set_access(p_data jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$SELECT public.portal_set_access_before_management(p_data)$$;
CREATE OR REPLACE FUNCTION public.ava_mutate(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$SELECT public.ava_mutate_before_management(p_action,p_data)$$;
ALTER TABLE public.portal_user_access DROP CONSTRAINT portal_user_access_access_level_check;
ALTER TABLE public.portal_user_access ADD CONSTRAINT portal_user_access_access_level_check CHECK(access_level IN ('public','student','trainee','member','leader','technician'));
COMMIT;
