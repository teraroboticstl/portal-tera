BEGIN;
-- Stops future deletions; cannot undo deletions already confirmed by an administrator.
REVOKE ALL ON FUNCTION public.frc_scouting_delete_event(uuid,text,boolean,text) FROM authenticated;
COMMIT;
