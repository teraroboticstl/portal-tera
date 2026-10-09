BEGIN;
ALTER TABLE public.ava_enrollments DROP CONSTRAINT IF EXISTS ava_enrollments_status_check;
ALTER TABLE public.ava_enrollments ADD CONSTRAINT ava_enrollments_status_check CHECK(status IN ('active','revoked','pending'));
-- Keep the existing access-level and assessment implementations behind private wrappers.
DO $$ BEGIN
 IF to_regprocedure('public.ava_mutate_before_requests(text,jsonb)') IS NULL THEN
  ALTER FUNCTION public.ava_mutate(text,jsonb) RENAME TO ava_mutate_before_requests;
 END IF;
 IF to_regprocedure('public.ava_read_before_requests(text,uuid)') IS NULL THEN
  ALTER FUNCTION public.ava_read(text,uuid) RENAME TO ava_read_before_requests;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.ava_mutate_before_requests(text,jsonb),public.ava_read_before_requests(text,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ava_mutate(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); t uuid; result_status text;
BEGIN
 IF p_action IN ('request_enrollment','enroll') THEN
  IF u IS NULL THEN RAISE EXCEPTION 'AVA_UNAUTHENTICATED'; END IF;
  IF NOT public.ava_has_access() THEN RAISE EXCEPTION 'AVA_ACCESS_DENIED'; END IF;
  t:=(p_data->>'track_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM ava_tracks WHERE id=t AND status='published') THEN RAISE EXCEPTION 'Trilha indisponível para solicitação.'; END IF;
  INSERT INTO ava_enrollments(user_id,track_id,status) VALUES(u,t,'pending')
  ON CONFLICT(user_id,track_id) DO UPDATE SET
   status=CASE WHEN ava_enrollments.status='active' THEN 'active' ELSE 'pending' END,
   created_at=CASE WHEN ava_enrollments.status='revoked' THEN now() ELSE ava_enrollments.created_at END
  RETURNING status INTO result_status;
  INSERT INTO ava_audit_logs(actor_id,action,entity_id,details) VALUES(u,'request_enrollment',t::text,jsonb_build_object('status',result_status));
  RETURN jsonb_build_object('success',true,'status',result_status);
 END IF;
 RETURN public.ava_mutate_before_requests(p_action,p_data);
END $$;
CREATE OR REPLACE FUNCTION public.ava_read(p_view text DEFAULT 'dashboard',p_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 result:=public.ava_read_before_requests(p_view,p_id);
 IF p_view='dashboard' THEN
  result:=result||jsonb_build_object('catalog',(
   SELECT coalesce(jsonb_agg(item||jsonb_build_object('enrollment_status',coalesce(e.status,'none'))),'[]'::jsonb)
   FROM jsonb_array_elements(public.ava_catalog()) item
   LEFT JOIN ava_enrollments e ON e.track_id=(item->>'id')::uuid AND e.user_id=auth.uid()
  ));
 END IF;
 RETURN result;
END $$;
-- Defense in depth: older clients and private legacy code cannot grant themselves access.
CREATE OR REPLACE FUNCTION public.ava_guard_enrollment_reactivation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='active' AND auth.uid() IS NOT NULL AND NOT public.ava_is_admin() THEN
  IF TG_OP='INSERT' THEN RAISE EXCEPTION 'A matrícula depende da aprovação do administrador.'; END IF;
  IF OLD.status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'A matrícula depende da aprovação do administrador.'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ava_enrollment_reactivation_guard ON public.ava_enrollments;
CREATE TRIGGER ava_enrollment_reactivation_guard BEFORE INSERT OR UPDATE OF status ON public.ava_enrollments
 FOR EACH ROW EXECUTE FUNCTION public.ava_guard_enrollment_reactivation();
REVOKE ALL ON FUNCTION public.ava_guard_enrollment_reactivation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ava_read(text,uuid),public.ava_mutate(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ava_read(text,uuid),public.ava_mutate(text,jsonb) TO authenticated;
COMMIT;
