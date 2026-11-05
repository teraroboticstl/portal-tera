BEGIN;
CREATE TABLE public.google_oauth_flows (
 state_hash text PRIMARY KEY CHECK(state_hash ~ '^[a-f0-9]{64}$'),
 browser_hash text NOT NULL CHECK(browser_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 sealed_session text NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.google_oauth_credentials (
 id text PRIMARY KEY CHECK(id='institutional'),
 client_hash text NOT NULL,
 sealed_token text NOT NULL,
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.google_oauth_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_oauth_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.google_oauth_flows, public.google_oauth_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.google_oauth_flows TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.google_oauth_credentials TO service_role;
-- DELETE ... RETURNING is atomic: only one concurrent callback can consume a flow.
CREATE FUNCTION public.google_oauth_consume(p_state_hash text, p_browser_hash text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE consumed public.google_oauth_flows;
BEGIN
 DELETE FROM public.google_oauth_flows WHERE state_hash=p_state_hash AND browser_hash=p_browser_hash
 RETURNING * INTO consumed;
 IF consumed.state_hash IS NULL OR consumed.expires_at <= now() THEN RETURN NULL; END IF;
 RETURN to_jsonb(consumed);
END $$;
REVOKE ALL ON FUNCTION public.google_oauth_consume(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.google_oauth_consume(text,text) TO service_role;
COMMIT;
