-- Restore server read access required by public FLL season and audio APIs.
-- Verified: anon/authenticated had SELECT; service_role did not.
-- Writes remain scoped to the authenticated user. RLS policies are unchanged.
BEGIN;
GRANT SELECT ON TABLE public.seasons TO service_role;
COMMIT;
