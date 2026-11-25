BEGIN;
-- Suspend new writes, preserving all linked and legacy data and original guards.
CREATE FUNCTION public.frc_scouting_suspend() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_TABLE_NAME='frc_scouting_event_teams' THEN
  RAISE EXCEPTION 'FRC_SCOUTING_SUSPENDED' USING ERRCODE='55000';
 END IF;
 IF TG_TABLE_NAME='frc_scouts' THEN
  IF NEW.scouting_event_id IS NOT NULL OR NEW.scouting_user_id IS NOT NULL OR NEW.scouting_season_id IS NOT NULL THEN
   RAISE EXCEPTION 'FRC_SCOUTING_SUSPENDED' USING ERRCODE='55000'; END IF;
 ELSIF NEW.scouting_season_id IS NOT NULL THEN
  RAISE EXCEPTION 'FRC_SCOUTING_SUSPENDED' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.frc_scouting_suspend() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER frc_scouting_suspended BEFORE INSERT OR UPDATE ON public.frc_scouts
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_suspend();
CREATE TRIGGER frc_scouting_suspended BEFORE INSERT OR UPDATE ON public.tournament_configs
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_suspend();
CREATE TRIGGER frc_scouting_suspended BEFORE INSERT OR UPDATE OR DELETE ON public.frc_scouting_event_teams
 FOR EACH ROW EXECUTE FUNCTION public.frc_scouting_suspend();
COMMIT;
