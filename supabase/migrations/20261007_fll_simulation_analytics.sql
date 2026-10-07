BEGIN;
ALTER TABLE public.fll_round_simulations ADD COLUMN is_test boolean NOT NULL DEFAULT false, ADD COLUMN deleted_at timestamptz;
CREATE INDEX fll_round_active_season ON public.fll_round_simulations(season_theme,season_year,created_at) WHERE deleted_at IS NULL;
GRANT UPDATE(deleted_at) ON public.fll_round_simulations TO service_role;
-- Precisely identify the three previous technical validation records.
UPDATE public.fll_round_simulations SET is_test=true WHERE team_name IN ('Teste Codex — visitante','Teste Codex — conta Tera') AND created_at >= '2026-10-07T12:47:00Z' AND created_at < '2026-10-07T12:54:00Z';
CREATE OR REPLACE FUNCTION public.save_fll_round_simulation(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE existing public.fll_round_simulations; contact uuid; saved public.fll_round_simulations; count_recent integer; identity_key text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_record->>'request_id',0));
  SELECT * INTO existing FROM public.fll_round_simulations WHERE request_id=(p_record->>'request_id')::uuid;
  IF FOUND THEN
    IF existing.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'SIMULATION_ARCHIVED'; END IF;
    IF existing.payload_hash <> p_record->>'payload_hash' THEN RAISE EXCEPTION 'SIMULATION_CONFLICT'; END IF;
    IF existing.share_token IS NULL AND p_record->>'share_token' IS NOT NULL THEN
      UPDATE public.fll_round_simulations SET share_token=p_record->>'share_token' WHERE id=existing.id RETURNING * INTO existing;
    END IF;
    RETURN to_jsonb(existing);
  END IF;
  identity_key := coalesce(p_record->>'user_id',p_record->>'email');
  PERFORM pg_advisory_xact_lock(hashtextextended(identity_key,1));
  SELECT count(*) INTO count_recent FROM public.fll_round_simulations s LEFT JOIN public.fll_simulation_contacts c ON c.id=s.contact_id
    WHERE s.created_at > now()-interval '1 hour' AND NOT s.is_test AND
      ((p_record->>'user_id' IS NOT NULL AND s.user_id=(p_record->>'user_id')::uuid)
      OR (p_record->>'user_id' IS NULL AND c.email=p_record->>'email'));
  IF count_recent >= 30 AND NOT coalesce((p_record->>'is_test')::boolean,false) THEN RAISE EXCEPTION 'SIMULATION_RATE_LIMIT'; END IF;
  IF p_record->>'user_id' IS NULL THEN
    INSERT INTO public.fll_simulation_contacts(email,team_name) VALUES(p_record->>'email',p_record->>'team_name') RETURNING id INTO contact;
  END IF;
  INSERT INTO public.fll_round_simulations(request_id,payload_hash,user_id,contact_id,season_id,season_theme,season_year,rules_version,origin,team_name,round_name,state_snapshot,score,breakdown,is_portfolio,iteration_title,notes,share_token,is_test)
  VALUES((p_record->>'request_id')::uuid,p_record->>'payload_hash',(p_record->>'user_id')::uuid,contact,(p_record->>'season_id')::uuid,p_record->>'season_theme',(p_record->>'season_year')::integer,p_record->>'rules_version',p_record->>'origin',p_record->>'team_name',p_record->>'round_name',p_record->'state_snapshot',(p_record->>'score')::integer,p_record->'breakdown',(p_record->>'is_portfolio')::boolean,p_record->>'iteration_title',p_record->>'notes',p_record->>'share_token',coalesce((p_record->>'is_test')::boolean,false)) RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END; $$;

CREATE FUNCTION public.archive_fll_round_simulations(p_ids uuid[],p_restore boolean DEFAULT false) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE affected integer;
BEGIN
  IF cardinality(p_ids) < 1 OR cardinality(p_ids) > 250 THEN RAISE EXCEPTION 'INVALID_BATCH'; END IF;
  UPDATE public.fll_round_simulations SET deleted_at=CASE WHEN p_restore THEN NULL ELSE now() END WHERE id=ANY(p_ids) AND ((p_restore AND deleted_at IS NOT NULL) OR (NOT p_restore AND deleted_at IS NULL));
  GET DIAGNOSTICS affected=ROW_COUNT;
  RETURN affected;
END; $$;
REVOKE ALL ON FUNCTION public.archive_fll_round_simulations(uuid[],boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.archive_fll_round_simulations(uuid[],boolean) TO service_role;
COMMIT;
