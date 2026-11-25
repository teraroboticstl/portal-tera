BEGIN;
-- Adds the capability only. Does not delete any existing event during migration.
CREATE FUNCTION public.frc_scouting_delete_event(p_event uuid,p_expected_name text,p_expected_archived boolean,p_confirmation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE target public.tournament_configs%ROWTYPE; removed integer;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(),false) OR NOT coalesce(public.portal_has_modality('FRC'),false) THEN
  RAISE EXCEPTION 'FRC_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_confirmation IS DISTINCT FROM 'EXCLUIR' OR p_expected_name IS NULL OR p_expected_archived IS NULL THEN
  RAISE EXCEPTION 'FRC_CONFIRMATION_REQUIRED' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(20261125,10343);
 SELECT * INTO target FROM public.tournament_configs WHERE id=p_event AND category='FRC' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRC_EVENT_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 IF target.tournament_name IS DISTINCT FROM p_expected_name OR (target.scouting_archived_at IS NOT NULL) IS DISTINCT FROM p_expected_archived THEN
  RAISE EXCEPTION 'FRC_EVENT_CHANGED' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM public.frc_scouts WHERE scouting_event_id=p_event) THEN
  RAISE EXCEPTION 'FRC_EVENT_HAS_RECORDS' USING ERRCODE='55006'; END IF;
 -- Fail closed if later schema changes introduce a new reference, especially SET NULL/CASCADE.
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='public.tournament_configs'::regclass
  AND conrelid NOT IN ('public.frc_scouts'::regclass,'public.frc_scouting_event_teams'::regclass)) THEN
  RAISE EXCEPTION 'FRC_REFERENCE_REVIEW_REQUIRED' USING ERRCODE='0A000'; END IF;
 DELETE FROM public.frc_scouting_event_teams WHERE event_id=p_event;
 GET DIAGNOSTICS removed=ROW_COUNT;
 DELETE FROM public.tournament_configs WHERE id=p_event;
 INSERT INTO public.audit_logs(user_id,user_name,user_email,action_type,description,entity_name)
 VALUES(auth.uid(),'Administrador autenticado','','delete',jsonb_build_object('action','delete','record_id',p_event,
  'name',target.tournament_name,'date',target.tournament_date,'season_id',target.scouting_season_id,
  'was_archived',target.scouting_archived_at IS NOT NULL,'participations_removed',removed)::text,'FRCScouting:event');
 RETURN jsonb_build_object('actor',auth.uid(),'id',p_event,'action','delete','participations_removed',removed);
END $$;
REVOKE ALL ON FUNCTION public.frc_scouting_delete_event(uuid,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.frc_scouting_delete_event(uuid,text,boolean,text) TO authenticated;
COMMIT;
