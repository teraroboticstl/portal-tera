BEGIN;
CREATE TABLE IF NOT EXISTS public.member_histories(
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 entry_year integer, modalities text[] NOT NULL, responsibilities text NOT NULL,
 history text NOT NULL, seasons text NOT NULL DEFAULT '', contributions text NOT NULL DEFAULT '',
 completed_version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_histories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_histories FROM anon,authenticated;
GRANT SELECT ON public.member_histories TO authenticated;
DROP POLICY IF EXISTS member_history_read ON public.member_histories;
CREATE POLICY member_history_read ON public.member_histories FOR SELECT TO authenticated USING(public.is_admin() OR (user_id=auth.uid() AND public.portal_internal_access()));
CREATE OR REPLACE FUNCTION public.member_history_read(p_user uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE target_id uuid:=coalesce(p_user,auth.uid()); record jsonb;
BEGIN
 IF auth.uid() IS NULL OR (NOT public.is_admin() AND (target_id!=auth.uid() OR NOT public.portal_internal_access())) THEN RAISE EXCEPTION 'Acesso restrito aos integrantes autorizados da Tera.'; END IF;
 SELECT to_jsonb(h) INTO record FROM member_histories h WHERE user_id=target_id;
 RETURN jsonb_build_object('history',record,'required',record IS NULL OR coalesce((record->>'completed_version')::int,0)<1);
END $$;
CREATE OR REPLACE FUNCTION public.member_history_save(p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE joined integer; modes text[]; roles text:=trim(coalesce(p_data->>'responsibilities','')); story text:=trim(coalesce(p_data->>'history','')); seasons text:=trim(coalesce(p_data->>'seasons','')); contributions text:=trim(coalesce(p_data->>'contributions',''));
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'Acesso restrito aos integrantes autorizados da Tera.'; END IF;
 IF octet_length(p_data::text)>30000 THEN RAISE EXCEPTION 'Cadastro excede o tamanho permitido.'; END IF;
 joined:=nullif(p_data->>'entry_year','')::integer;
 IF joined IS NOT NULL AND (joined<1900 OR joined>extract(year from now())) THEN RAISE EXCEPTION 'Informe um ano de ingresso válido.'; END IF;
 IF jsonb_typeof(p_data->'modalities') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Selecione as modalidades de sua trajetória.'; END IF;
 SELECT array_agg(DISTINCT m) INTO modes FROM jsonb_array_elements_text(p_data->'modalities') m;
 IF coalesce(array_length(modes,1),0)=0 OR NOT modes <@ ARRAY['FLL','FTC','FRC','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2']::text[] THEN RAISE EXCEPTION 'Selecione modalidades válidas.'; END IF;
 IF char_length(roles)<2 OR char_length(roles)>500 OR char_length(story)<20 OR char_length(story)>4000 OR char_length(seasons)>1500 OR char_length(contributions)>3000 THEN RAISE EXCEPTION 'Preencha funções e história dentro dos limites indicados.'; END IF;
 INSERT INTO member_histories(user_id,entry_year,modalities,responsibilities,history,seasons,contributions)
 VALUES(auth.uid(),joined,modes,roles,story,seasons,contributions)
 ON CONFLICT(user_id) DO UPDATE SET entry_year=excluded.entry_year,modalities=excluded.modalities,responsibilities=excluded.responsibilities,history=excluded.history,seasons=excluded.seasons,contributions=excluded.contributions,completed_version=1,updated_at=now();
 RETURN public.member_history_read();
END $$;
REVOKE ALL ON FUNCTION public.member_history_read(uuid),public.member_history_save(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_history_read(uuid),public.member_history_save(jsonb) TO authenticated;
COMMIT;
