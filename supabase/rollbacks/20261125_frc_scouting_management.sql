BEGIN;
-- Suspend management without deleting names, archived state or relationships.
REVOKE ALL ON FUNCTION public.frc_scouting_manage(text,uuid,text,text,text,boolean) FROM authenticated;
-- Keep archive guards and the restrictive insert policy active.
COMMIT;
