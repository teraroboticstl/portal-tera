BEGIN;
-- Enrollment visibility is independent of publication of teaching materials.
-- Anonymous catalog and protected module reads keep their existing rules.
CREATE OR REPLACE FUNCTION public.ava_read(p_view text DEFAULT 'dashboard',p_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; catalog jsonb;
BEGIN
 result:=public.ava_read_before_requests(p_view,p_id);
 IF p_view='dashboard' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',t.id,'title',t.title,'subtitle',t.subtitle,'description',t.description,
   'audience',t.audience,'status',t.status,'position',t.position,
   'module_count',(SELECT count(*) FROM ava_modules m WHERE m.track_id=t.id AND m.status='published'),
   'enrollment_status',coalesce(e.status,'none'),'enrolled',coalesce(e.status='active',false),
   'can_access',coalesce(e.status='active',false) AND t.status='published' AND public.ava_track_allowed(t.id),
   'progress',public.ava_track_progress(auth.uid(),t.id)) ORDER BY t.position,t.title),'[]'::jsonb)
  INTO catalog FROM ava_tracks t LEFT JOIN ava_enrollments e ON e.track_id=t.id AND e.user_id=auth.uid()
  WHERE t.status IN ('draft','published');
  result:=result||jsonb_build_object('catalog',catalog,'tracks',(
   SELECT coalesce(jsonb_agg(c||coalesce((SELECT old FROM jsonb_array_elements(result->'tracks') old WHERE old->>'id'=c->>'id'),'{}'::jsonb)
    ORDER BY (c->>'position')::integer,c->>'title'),'[]'::jsonb)
   FROM jsonb_array_elements(catalog) c
  ));
 END IF;
 RETURN result;
END $$;
-- Use the same catalog visibility for requests; approval still grants no draft content.
CREATE OR REPLACE FUNCTION public.ava_mutate(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); t uuid; result_status text;
BEGIN
 IF p_action IN ('request_enrollment','enroll') THEN
  IF u IS NULL THEN RAISE EXCEPTION 'AVA_UNAUTHENTICATED'; END IF;
  IF NOT public.ava_has_access() THEN RAISE EXCEPTION 'AVA_ACCESS_DENIED'; END IF;
  t:=(p_data->>'track_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM ava_tracks WHERE id=t AND status IN ('draft','published')) THEN RAISE EXCEPTION 'Trilha indisponível para solicitação.'; END IF;
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
REVOKE ALL ON FUNCTION public.ava_read(text,uuid),public.ava_mutate(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ava_read(text,uuid),public.ava_mutate(text,jsonb) TO authenticated;
COMMIT;
