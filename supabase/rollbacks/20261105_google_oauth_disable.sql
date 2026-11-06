-- Disable the server-only OAuth store without deleting flows or credentials.
-- Before execution: remove GOOGLE_OAUTH_ENCRYPTION_KEY from the affected runtime
-- and redeploy the previous code; preserve its value in the administrator vault.
-- Existing legacy credentials may still be invalid. This is not token recovery.
BEGIN;
REVOKE ALL ON FUNCTION public.google_oauth_consume(text,text) FROM service_role;
REVOKE ALL ON TABLE public.google_oauth_flows, public.google_oauth_credentials FROM service_role;
COMMIT;
