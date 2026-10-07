BEGIN;
CREATE TABLE public.fll_simulation_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (length(email) <= 254),
  team_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fll_round_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  payload_hash text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.fll_simulation_contacts(id),
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  season_theme text NOT NULL,
  season_year integer NOT NULL,
  rules_version text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('guest','member')),
  team_name text NOT NULL,
  round_name text NOT NULL,
  state_snapshot jsonb NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 530),
  breakdown jsonb NOT NULL,
  is_portfolio boolean NOT NULL DEFAULT false,
  iteration_title text,
  notes text,
  is_tera boolean NOT NULL DEFAULT false,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT is_portfolio OR origin = 'member')
);
CREATE INDEX fll_round_owner ON public.fll_round_simulations(user_id,created_at DESC);
CREATE INDEX fll_round_season ON public.fll_round_simulations(season_theme,season_year,created_at DESC);
CREATE INDEX fll_contact_email ON public.fll_simulation_contacts(email,created_at DESC);
ALTER TABLE public.fll_simulation_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fll_round_simulations ENABLE ROW LEVEL SECURITY;
-- No direct public/authenticated grants. The server returns explicit safe projections.
REVOKE ALL ON public.fll_simulation_contacts, public.fll_round_simulations FROM anon, authenticated;
GRANT SELECT, INSERT ON public.fll_simulation_contacts, public.fll_round_simulations TO service_role;
GRANT UPDATE (share_token,is_tera) ON public.fll_round_simulations TO service_role;
CREATE FUNCTION public.save_fll_round_simulation(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE existing public.fll_round_simulations; contact uuid; saved public.fll_round_simulations; count_recent integer; identity_key text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_record->>'request_id',0));
  SELECT * INTO existing FROM public.fll_round_simulations WHERE request_id=(p_record->>'request_id')::uuid;
  IF FOUND THEN
    IF existing.payload_hash <> p_record->>'payload_hash' THEN RAISE EXCEPTION 'SIMULATION_CONFLICT'; END IF;
    IF existing.share_token IS NULL AND p_record->>'share_token' IS NOT NULL THEN
      UPDATE public.fll_round_simulations SET share_token=p_record->>'share_token' WHERE id=existing.id RETURNING * INTO existing;
    END IF;
    RETURN to_jsonb(existing);
  END IF;
  identity_key := coalesce(p_record->>'user_id',p_record->>'email');
  PERFORM pg_advisory_xact_lock(hashtextextended(identity_key,1));
  SELECT count(*) INTO count_recent FROM public.fll_round_simulations s LEFT JOIN public.fll_simulation_contacts c ON c.id=s.contact_id
    WHERE s.created_at > now()-interval '1 hour' AND
      ((p_record->>'user_id' IS NOT NULL AND s.user_id=(p_record->>'user_id')::uuid)
      OR (p_record->>'user_id' IS NULL AND c.email=p_record->>'email'));
  IF count_recent >= 30 THEN RAISE EXCEPTION 'SIMULATION_RATE_LIMIT'; END IF;
  IF p_record->>'user_id' IS NULL THEN
    INSERT INTO public.fll_simulation_contacts(email,team_name) VALUES(p_record->>'email',p_record->>'team_name') RETURNING id INTO contact;
  END IF;
  INSERT INTO public.fll_round_simulations(request_id,payload_hash,user_id,contact_id,season_id,season_theme,season_year,rules_version,origin,team_name,round_name,state_snapshot,score,breakdown,is_portfolio,iteration_title,notes,share_token)
  VALUES((p_record->>'request_id')::uuid,p_record->>'payload_hash',(p_record->>'user_id')::uuid,contact,(p_record->>'season_id')::uuid,p_record->>'season_theme',(p_record->>'season_year')::integer,p_record->>'rules_version',p_record->>'origin',p_record->>'team_name',p_record->>'round_name',p_record->'state_snapshot',(p_record->>'score')::integer,p_record->'breakdown',(p_record->>'is_portfolio')::boolean,p_record->>'iteration_title',p_record->>'notes',p_record->>'share_token') RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END; $$;
REVOKE ALL ON FUNCTION public.save_fll_round_simulation(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_fll_round_simulation(jsonb) TO service_role;
COMMIT;
