BEGIN;
-- Scouting-only soft removal; all existing rows and relationships are preserved.
ALTER TABLE public.seasons ADD COLUMN scouting_archived_at timestamptz;
ALTER TABLE public.tournament_configs ADD COLUMN scouting_archived_at timestamptz;
ALTER TABLE public.teams ADD COLUMN scouting_archived_at timestamptz;

CREATE FUNCTION public.frc_scouting_archive_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(20261125,10343);
 IF TG_TABLE_NAME='tournament_configs' THEN
  IF NEW.category='FRC' AND NEW.scouting_season_id IS NOT NULL AND NEW.scouting_archived_at IS NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.seasons s WHERE s.id=NEW.scouting_season_id AND s.scouting_archived_at IS NULL) THEN
    RAISE EXCEPTION 'FRC_SEASON_ARCHIVED' USING ERRCODE='23514'; END IF;
   IF EXISTS(SELECT 1 FROM public.tournament_configs c WHERE c.id IS DISTINCT FROM NEW.id AND c.category='FRC'
    AND c.scouting_season_id=NEW.scouting_season_id AND c.scouting_archived_at IS NULL
    AND lower(btrim(c.tournament_name))=lower(btrim(NEW.tournament_name))) THEN
    RAISE EXCEPTION 'FRC_DUPLICATE_NAME' USING ERRCODE='23505'; END IF;
  END IF;
 END IF;
 IF (TG_OP='INSERT' AND NEW.scouting_archived_at IS NOT NULL) OR
    (TG_OP='UPDATE' AND NEW.scouting_archived_at IS DISTINCT FROM OLD.scouting_archived_at) THEN
  IF NOT coalesce(public.is_admin(),false) OR NOT coalesce(public.portal_has_modality('FRC'),false)
   THEN RAISE EXCEPTION 'FRC_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.frc_scouting_archive_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER frc_archive_guard BEFORE INSERT OR UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_archive_guard();
CREATE TRIGGER frc_archive_guard BEFORE INSERT OR UPDATE ON public.tournament_configs FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_archive_guard();
CREATE TRIGGER frc_archive_guard BEFORE INSERT OR UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_archive_guard();

CREATE FUNCTION public.frc_scouting_context_active(p_season uuid,p_event uuid,p_team text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT auth.uid() IS NOT NULL AND coalesce(public.portal_has_modality('FRC'),false) AND EXISTS(SELECT 1 FROM public.tournament_configs c JOIN public.seasons s ON s.id=c.scouting_season_id
 JOIN public.frc_scouting_event_teams p ON p.event_id=c.id JOIN public.teams t ON t.id=p.team_id
 WHERE c.id=p_event AND s.id=p_season AND c.category='FRC' AND s.program='FRC' AND t.program='FRC'
 AND t.number=p_team AND c.scouting_archived_at IS NULL AND s.scouting_archived_at IS NULL AND t.scouting_archived_at IS NULL);
$$;
REVOKE ALL ON FUNCTION public.frc_scouting_context_active(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.frc_scouting_context_active(uuid,uuid,text) TO authenticated;
CREATE POLICY frc_active_context ON public.frc_scouts AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(scouting_event_id IS NULL OR public.frc_scouting_context_active(scouting_season_id,scouting_event_id,team_number));
CREATE POLICY frc_active_participation ON public.frc_scouting_event_teams AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.tournament_configs c JOIN public.seasons s ON s.id=c.scouting_season_id
 WHERE c.id=event_id AND c.scouting_archived_at IS NULL AND s.scouting_archived_at IS NULL)
 AND EXISTS(SELECT 1 FROM public.teams t WHERE t.id=team_id AND t.scouting_archived_at IS NULL));

CREATE FUNCTION public.frc_scouting_manage(p_kind text,p_id uuid,p_action text,p_name text,p_expected_name text,p_expected_archived boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE tab text; col text; mode_col text; row_data jsonb; old_name text; new_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(),false) OR NOT coalesce(public.portal_has_modality('FRC'),false)
  THEN RAISE EXCEPTION 'FRC_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 CASE p_kind WHEN 'season' THEN tab:='seasons';col:='theme';mode_col:='program';
 WHEN 'event' THEN tab:='tournament_configs';col:='tournament_name';mode_col:='category';
 WHEN 'team' THEN tab:='teams';col:='name';mode_col:='program';
 ELSE RAISE EXCEPTION 'FRC_INVALID_KIND' USING ERRCODE='22023'; END CASE;
 IF p_action IS NULL OR p_action NOT IN ('rename','archive','restore') OR p_expected_name IS NULL OR p_expected_archived IS NULL THEN
  RAISE EXCEPTION 'FRC_INVALID_ACTION' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(20261125,10343);
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND %I=''FRC'' FOR UPDATE',tab,mode_col) INTO row_data USING p_id;
 IF row_data IS NULL THEN RAISE EXCEPTION 'FRC_RECORD_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 old_name:=row_data->>col;
 IF old_name IS DISTINCT FROM p_expected_name OR ((row_data->>'scouting_archived_at') IS NOT NULL) IS DISTINCT FROM p_expected_archived THEN
  RAISE EXCEPTION 'FRC_RECORD_CHANGED' USING ERRCODE='40001'; END IF;
 IF p_action='rename' THEN
  new_name:=btrim(p_name);
  IF new_name IS NULL OR length(new_name)=0 OR length(new_name)>120 THEN RAISE EXCEPTION 'FRC_INVALID_NAME' USING ERRCODE='22023'; END IF;
  IF p_kind='event' AND EXISTS(SELECT 1 FROM public.tournament_configs c WHERE c.id<>p_id AND c.category='FRC'
   AND c.scouting_season_id IS NOT DISTINCT FROM (row_data->>'scouting_season_id')::uuid
   AND lower(btrim(c.tournament_name))=lower(new_name) AND c.scouting_archived_at IS NULL) THEN
   RAISE EXCEPTION 'FRC_DUPLICATE_NAME' USING ERRCODE='23505'; END IF;
  EXECUTE format('UPDATE public.%I SET %I=$1 WHERE id=$2',tab,col) USING new_name,p_id;
 ELSE
  EXECUTE format('UPDATE public.%I SET scouting_archived_at=$1 WHERE id=$2',tab)
   USING CASE WHEN p_action='archive' THEN clock_timestamp() ELSE NULL::timestamptz END,p_id;
 END IF;
 INSERT INTO public.audit_logs(user_id,user_name,user_email,action_type,description,entity_name)
 VALUES(auth.uid(),'Administrador autenticado','','update',jsonb_build_object('action',p_action,'record_id',p_id,
  'previous_name',old_name,'new_name',CASE WHEN p_action='rename' THEN new_name ELSE old_name END,
  'previous_archived',p_expected_archived,'new_archived',CASE WHEN p_action='archive' THEN true WHEN p_action='restore' THEN false ELSE p_expected_archived END)::text,'FRCScouting:'||p_kind);
 RETURN jsonb_build_object('actor',auth.uid(),'id',p_id,'action',p_action);
END $$;
REVOKE ALL ON FUNCTION public.frc_scouting_manage(text,uuid,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.frc_scouting_manage(text,uuid,text,text,text,boolean) TO authenticated;
COMMIT;
