BEGIN;
-- Nullable links preserve every historical record. No inferred backfill.
ALTER TABLE public.tournament_configs ADD COLUMN scouting_season_id uuid REFERENCES public.seasons(id) ON DELETE RESTRICT;
ALTER TABLE public.frc_scouts
 ADD COLUMN scouting_season_id uuid REFERENCES public.seasons(id) ON DELETE RESTRICT,
 ADD COLUMN scouting_event_id uuid REFERENCES public.tournament_configs(id) ON DELETE RESTRICT,
 ADD COLUMN scouting_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;
CREATE INDEX frc_scouting_event_idx ON public.frc_scouts(scouting_event_id,team_number,match_number);

-- Participation is a relationship, not a second directory of teams.
CREATE TABLE public.frc_scouting_event_teams (
 event_id uuid NOT NULL REFERENCES public.tournament_configs(id) ON DELETE RESTRICT,
 team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
 PRIMARY KEY(event_id,team_id)
);
ALTER TABLE public.frc_scouting_event_teams ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.frc_scouting_event_teams FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.frc_scouting_event_teams TO authenticated;
CREATE POLICY frc_participation_read ON public.frc_scouting_event_teams FOR SELECT TO authenticated
 USING(public.portal_has_modality('FRC'));
CREATE POLICY frc_participation_admin ON public.frc_scouting_event_teams FOR ALL TO authenticated
 USING(public.is_admin() AND public.portal_has_modality('FRC'))
 WITH CHECK(public.is_admin() AND public.portal_has_modality('FRC'));

CREATE FUNCTION public.frc_scouting_context_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE season uuid; event_category text; team_program text;
BEGIN
 -- Serialize context changes with participation/record writes; no cross-event orphan races.
 PERFORM pg_advisory_xact_lock(20261125,10343);
 IF TG_TABLE_NAME='seasons' THEN
  IF NEW.program IS DISTINCT FROM OLD.program AND EXISTS(SELECT 1 FROM public.tournament_configs c WHERE c.scouting_season_id=OLD.id)
   THEN RAISE EXCEPTION 'FRC_SEASON_IN_USE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='teams' THEN
  IF (NEW.number IS DISTINCT FROM OLD.number OR NEW.program IS DISTINCT FROM OLD.program) AND
   EXISTS(SELECT 1 FROM public.frc_scouting_event_teams p WHERE p.team_id=OLD.id)
   THEN RAISE EXCEPTION 'FRC_TEAM_IN_USE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='tournament_configs' THEN
  IF TG_OP='UPDATE' AND OLD.scouting_season_id IS NOT NULL AND
   (NEW.scouting_season_id IS DISTINCT FROM OLD.scouting_season_id OR NEW.category IS DISTINCT FROM OLD.category) AND
   (EXISTS(SELECT 1 FROM public.frc_scouts r WHERE r.scouting_event_id=NEW.id) OR
    EXISTS(SELECT 1 FROM public.frc_scouting_event_teams p WHERE p.event_id=NEW.id)) THEN
   RAISE EXCEPTION 'FRC_EVENT_ALREADY_LINKED' USING ERRCODE='23514'; END IF;
  IF (TG_OP='INSERT' AND NEW.scouting_season_id IS NOT NULL) OR
   (TG_OP='UPDATE' AND NEW.scouting_season_id IS DISTINCT FROM OLD.scouting_season_id) THEN
   IF NOT coalesce(public.is_admin(),false) OR NOT coalesce(public.portal_has_modality('FRC'),false) THEN
    RAISE EXCEPTION 'FRC_CONFIGURATION_DENIED' USING ERRCODE='42501'; END IF;
  END IF;
  IF NEW.scouting_season_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.category IS DISTINCT FROM 'FRC' OR NOT EXISTS (
   SELECT 1 FROM public.seasons s WHERE s.id=NEW.scouting_season_id AND s.program='FRC'
  ) THEN RAISE EXCEPTION 'FRC_SEASON_REQUIRED' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND NEW.scouting_season_id IS DISTINCT FROM OLD.scouting_season_id AND
   (EXISTS(SELECT 1 FROM public.frc_scouts r WHERE r.scouting_event_id=NEW.id) OR
    EXISTS(SELECT 1 FROM public.frc_scouting_event_teams p WHERE p.event_id=NEW.id))
   THEN RAISE EXCEPTION 'FRC_EVENT_ALREADY_LINKED' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='frc_scouting_event_teams' THEN
  IF TG_OP IN ('DELETE','UPDATE') AND EXISTS(SELECT 1 FROM public.frc_scouts r JOIN public.teams t ON t.number=r.team_number
   WHERE r.scouting_event_id=OLD.event_id AND t.id=OLD.team_id) THEN
   RAISE EXCEPTION 'FRC_PARTICIPATION_IN_USE' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  SELECT c.scouting_season_id,c.category INTO season,event_category FROM public.tournament_configs c WHERE c.id=NEW.event_id;
  SELECT t.program INTO team_program FROM public.teams t WHERE t.id=NEW.team_id;
  IF season IS NULL OR event_category IS DISTINCT FROM 'FRC' OR team_program IS DISTINCT FROM 'FRC'
   THEN RAISE EXCEPTION 'FRC_PARTICIPATION_REQUIRED' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 -- Unlinked legacy writes retain their previous behavior. A linked row cannot be unlinked.
 IF NEW.scouting_event_id IS NULL AND NEW.scouting_season_id IS NULL AND NEW.scouting_user_id IS NULL THEN
  IF TG_OP='UPDATE' AND OLD.scouting_event_id IS NOT NULL THEN
   RAISE EXCEPTION 'FRC_CONTEXT_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF auth.uid() IS NULL OR NOT coalesce(public.portal_has_modality('FRC'),false) OR NOT coalesce(public.portal_can_edit(),false)
  THEN RAISE EXCEPTION 'FRC_WRITE_DENIED' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.scouting_user_id IS NOT NULL AND NEW.scouting_user_id<>auth.uid() THEN
   RAISE EXCEPTION 'FRC_AUTHOR_MISMATCH' USING ERRCODE='42501'; END IF;
  NEW.scouting_user_id:=auth.uid();
 ELSE
  IF NEW.scouting_user_id IS DISTINCT FROM OLD.scouting_user_id OR
    NEW.scouting_event_id IS DISTINCT FROM OLD.scouting_event_id OR
    NEW.scouting_season_id IS DISTINCT FROM OLD.scouting_season_id THEN
   RAISE EXCEPTION 'FRC_CONTEXT_IMMUTABLE' USING ERRCODE='23514'; END IF;
  IF OLD.scouting_user_id<>auth.uid() AND NOT public.is_admin() THEN
   RAISE EXCEPTION 'FRC_OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
 END IF;
 SELECT c.scouting_season_id,c.category INTO season,event_category FROM public.tournament_configs c WHERE c.id=NEW.scouting_event_id;
 IF season IS NULL OR event_category IS DISTINCT FROM 'FRC' OR NEW.scouting_season_id IS DISTINCT FROM season THEN
  RAISE EXCEPTION 'FRC_EVENT_SCOPE_MISMATCH' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.frc_scouting_event_teams p JOIN public.teams t ON t.id=p.team_id
  WHERE p.event_id=NEW.scouting_event_id AND t.number=NEW.team_number AND t.program='FRC') THEN
  RAISE EXCEPTION 'FRC_TEAM_NOT_IN_EVENT' USING ERRCODE='23514'; END IF;
 IF nullif(btrim(NEW.match_number),'') IS NULL THEN
  RAISE EXCEPTION 'FRC_MATCH_REQUIRED' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.frc_scouting_context_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER frc_event_context BEFORE INSERT OR UPDATE ON public.tournament_configs
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_context_guard();
CREATE TRIGGER frc_participation_context BEFORE INSERT OR UPDATE OR DELETE ON public.frc_scouting_event_teams
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_context_guard();
CREATE TRIGGER frc_record_context BEFORE INSERT OR UPDATE ON public.frc_scouts
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_context_guard();
CREATE TRIGGER frc_season_context BEFORE UPDATE ON public.seasons
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_context_guard();
CREATE TRIGGER frc_team_context BEFORE UPDATE ON public.teams
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_context_guard();
COMMIT;
