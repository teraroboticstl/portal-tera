BEGIN;
-- Reuse the access record. Questionnaire data is only an initial, explicit bootstrap.
ALTER TABLE public.portal_user_access ADD COLUMN allowed_modalities text[] NOT NULL DEFAULT '{}',
 ADD COLUMN modality_revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.portal_user_access ADD CONSTRAINT allowed_modalities_valid
 CHECK(allowed_modalities <@ ARRAY['FLL','FTC','FRC','OBR']::text[]);
ALTER TABLE public.member_registration_settings ADD COLUMN modality_access_enabled boolean NOT NULL DEFAULT false;

INSERT INTO public.portal_user_access(user_id,allowed_modalities)
 SELECT r.user_id,array_agg(DISTINCT CASE WHEN m.value LIKE 'OBR%' THEN 'OBR' ELSE m.value END)
 FROM public.member_registrations r
 CROSS JOIN LATERAL jsonb_array_elements_text(r.profile->'modalities') m
 WHERE r.completed_version=1 AND m.value IN ('FLL','FTC','FRC','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2')
 GROUP BY r.user_id
 ON CONFLICT(user_id) DO UPDATE SET allowed_modalities=excluded.allowed_modalities;

CREATE FUNCTION public.portal_modality_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF current_user <> (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid=TG_RELID) AND
 ((TG_OP='INSERT' AND (NEW.allowed_modalities<>'{}' OR NEW.modality_revision<>0)) OR
  (TG_OP='UPDATE' AND (NEW.allowed_modalities IS DISTINCT FROM OLD.allowed_modalities OR NEW.modality_revision IS DISTINCT FROM OLD.modality_revision)))
 THEN RAISE EXCEPTION 'MODALITY_ADMIN_RPC_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_modality_guard BEFORE INSERT OR UPDATE ON public.portal_user_access FOR EACH ROW EXECUTE FUNCTION public.portal_modality_guard();

CREATE FUNCTION public.portal_modality_all() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT auth.uid() IS NOT NULL AND public.portal_internal_access() AND
 (public.is_admin() OR public.portal_access_level()='leader' OR NOT (SELECT modality_access_enabled FROM public.member_registration_settings WHERE singleton));
$$;
CREATE FUNCTION public.portal_has_modality(p_program text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT auth.uid() IS NOT NULL AND public.portal_internal_access() AND
 (public.portal_modality_all() OR p_program='Geral' OR
 EXISTS(SELECT 1 FROM public.portal_user_access WHERE user_id=auth.uid() AND
  (CASE WHEN p_program IN ('OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2') THEN 'OBR' ELSE p_program END)=ANY(allowed_modalities)));
$$;
CREATE FUNCTION public.portal_modality_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'MODALITY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('actor',auth.uid(),'all_modalities',public.portal_modality_all(),
 'modalities',coalesce((SELECT to_jsonb(allowed_modalities) FROM public.portal_user_access WHERE user_id=auth.uid()),'[]'::jsonb));
END $$;
CREATE FUNCTION public.portal_modality_user(p_user uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'MODALITY_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user) THEN RAISE EXCEPTION 'MODALITY_USER_UNKNOWN'; END IF;
 RETURN jsonb_build_object('user_id',p_user,'modalities',coalesce((SELECT to_jsonb(allowed_modalities) FROM public.portal_user_access WHERE user_id=p_user),'[]'::jsonb),
 'revision',coalesce((SELECT modality_revision FROM public.portal_user_access WHERE user_id=p_user),0));
END $$;
CREATE FUNCTION public.portal_modality_set(p_user uuid,p_modalities text[],p_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE previous text[];
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'MODALITY_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_modalities IS NULL OR array_position(p_modalities,NULL) IS NOT NULL OR NOT p_modalities <@ ARRAY['FLL','FTC','FRC','OBR']::text[] OR p_revision IS NULL OR p_revision<0 THEN RAISE EXCEPTION 'MODALITY_INVALID'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MODALITY_USER_UNKNOWN'; END IF;
 INSERT INTO public.portal_user_access(user_id) VALUES(p_user) ON CONFLICT(user_id) DO NOTHING;
 SELECT allowed_modalities INTO previous FROM public.portal_user_access WHERE user_id=p_user FOR UPDATE;
 UPDATE public.portal_user_access SET allowed_modalities=ARRAY(SELECT DISTINCT unnest(p_modalities) ORDER BY 1),modality_revision=modality_revision+1
 WHERE user_id=p_user AND modality_revision=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'MODALITY_CONFLICT'; END IF;
 INSERT INTO public.ava_audit_logs(actor_id,action,entity_id,details) VALUES(auth.uid(),'set_modalities',p_user::text,jsonb_build_object('before',previous,'after',p_modalities));
 RETURN public.portal_modality_user(p_user);
END $$;

CREATE FUNCTION public.portal_page_modality(p_page text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN p_page LIKE 'InternalFRC%' THEN 'FRC' WHEN p_page LIKE 'InternalFTC%' THEN 'FTC'
 WHEN p_page LIKE 'InternalFLL%' THEN 'FLL' WHEN p_page='InternalOBR' THEN 'OBR' ELSE 'Geral' END;
$$;
ALTER FUNCTION public.ava_identity() RENAME TO ava_identity_before_modalities;
REVOKE ALL ON FUNCTION public.ava_identity_before_modalities() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.ava_identity() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.ava_identity_before_modalities() || jsonb_build_object(
 'modality_access_enabled',(SELECT modality_access_enabled FROM public.member_registration_settings WHERE singleton),
 'all_modalities',public.portal_modality_all(),
 'allowed_modalities',coalesce((SELECT to_jsonb(allowed_modalities) FROM public.portal_user_access WHERE user_id=auth.uid()),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.ava_identity() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ava_identity() TO authenticated;
CREATE OR REPLACE FUNCTION public.portal_page_visibility_snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (coalesce(public.is_admin(),false) OR coalesce(public.portal_internal_access(),false))
 THEN RAISE EXCEPTION 'PAGE_VISIBILITY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('actor',auth.uid(),'is_admin',coalesce(public.is_admin(),false),
 'all_modalities',public.portal_modality_all(),
 'modalities',coalesce((SELECT to_jsonb(allowed_modalities) FROM public.portal_user_access WHERE user_id=auth.uid()),'[]'::jsonb),
 'pages',(SELECT jsonb_object_agg(page_key,jsonb_build_object('visible',visible AND public.portal_has_modality(public.portal_page_modality(page_key)),'revision',revision)) FROM public.portal_page_visibility));
END $$;

-- Restrictive policies compose with existing identity, ownership and privacy rules.
CREATE FUNCTION public.portal_record_modality(p_table text,p_row jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE mode text;
BEGIN
 IF p_table LIKE 'fll_%' THEN RETURN public.portal_has_modality('FLL'); END IF;
 IF p_table IN ('frc_scouts','pdi_frcs') THEN RETURN public.portal_has_modality('FRC'); END IF;
 -- matches has FTC gate/classified score columns and is consumed only by FTC scorer/history.
 IF p_table IN ('scout_ftcs','matches') THEN RETURN public.portal_has_modality('FTC'); END IF;
 IF p_table LIKE 'tir_%' THEN RETURN public.portal_has_modality('OBR'); END IF;
 mode:=coalesce(nullif(p_row->>'modality',''),nullif(p_row->>'program',''),
 CASE WHEN p_table IN ('daily_logs','prototype_tests','priorities','board_diaries') AND p_row->>'category' IN ('FLL','FTC','FRC','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2') THEN p_row->>'category' END,'Geral');
 RETURN public.portal_has_modality(mode);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['daily_logs','meeting_notes','prototype_tests','priorities','board_diaries','team_logs','portal_work_items','pdis','pdi_frcs','frc_scouts','scout_ftcs','matches','teams','tournament_configs','tournament_memorials','internal_projects','project_risks','esg_initiatives','fll_members','fll_missions','fll_tasks','fll_attachments','fll_core_values','fll_innovation_projects','fll_judge_preps','tir_equipes','tir_regras','tir_fotos'] LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('CREATE POLICY portal_modality_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.portal_record_modality(%L,to_jsonb(%I))) WITH CHECK(public.portal_record_modality(%L,to_jsonb(%I)))',t,t,t,t,t);
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.portal_modality_guard(),public.portal_modality_all(),public.portal_has_modality(text),public.portal_modality_access(),public.portal_modality_user(uuid),public.portal_modality_set(uuid,text[],integer),public.portal_record_modality(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_modality_all(),public.portal_has_modality(text),public.portal_modality_access(),public.portal_modality_user(uuid),public.portal_modality_set(uuid,text[],integer),public.portal_record_modality(text,jsonb) TO authenticated;
COMMIT;
