BEGIN;
-- Staged activation: deploy the compatible UI, then enable and reconcile.
ALTER TABLE public.member_registration_settings ADD COLUMN pdi_generation_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.pdis ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.pdi_frcs ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.pdis ALTER COLUMN participant_id SET DEFAULT auth.uid();
ALTER TABLE public.pdi_frcs ALTER COLUMN participant_id SET DEFAULT auth.uid();
ALTER TABLE public.pdis ADD COLUMN modality text NOT NULL DEFAULT 'FTC';
ALTER TABLE public.pdi_frcs ADD COLUMN modality text NOT NULL DEFAULT 'FRC';
ALTER TABLE public.pdis ADD COLUMN registration_version integer, ADD COLUMN initial_competencies jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.pdi_frcs ADD COLUMN registration_version integer, ADD COLUMN initial_competencies jsonb NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX pdis_registration_unique ON public.pdis(participant_id,modality,registration_version) WHERE registration_version IS NOT NULL;
CREATE UNIQUE INDEX pdi_frcs_registration_unique ON public.pdi_frcs(participant_id,modality,registration_version) WHERE registration_version IS NOT NULL;

CREATE FUNCTION public.registration_pdi_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 -- The migration owner / generation function may set provenance. API callers may not.
 IF current_user <> (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid=TG_RELID) THEN
  IF TG_OP='INSERT' THEN
   IF NEW.registration_version IS NOT NULL OR NEW.participant_id IS DISTINCT FROM auth.uid()
    OR NEW.initial_competencies <> '[]'::jsonb OR coalesce(NEW.progress_override,0) <> 0
    OR NEW.modality <> (CASE WHEN TG_TABLE_NAME='pdis' THEN 'FTC' ELSE 'FRC' END)
   THEN RAISE EXCEPTION 'PDI_PROVENANCE_PROTECTED'; END IF;
  ELSIF NEW.participant_id IS DISTINCT FROM OLD.participant_id OR NEW.registration_version IS DISTINCT FROM OLD.registration_version
    OR NEW.modality IS DISTINCT FROM OLD.modality OR NEW.initial_competencies IS DISTINCT FROM OLD.initial_competencies THEN
   RAISE EXCEPTION 'PDI_PROVENANCE_PROTECTED';
  END IF;
  IF TG_OP='UPDATE' AND (OLD.registration_version IS NOT NULL OR NOT public.is_admin()) AND NEW.progress_override IS DISTINCT FROM OLD.progress_override THEN
   RAISE EXCEPTION 'PDI_ASSESSMENT_ADMIN_REQUIRED';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.registration_pdi_guard() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['pdis','pdi_frcs'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY registration_pdi_private ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.portal_internal_access() AND (participant_id=auth.uid() OR public.is_admin())) WITH CHECK (public.portal_internal_access() AND (participant_id=auth.uid() OR public.is_admin()))',tab);
  EXECUTE format('CREATE POLICY registration_pdi_anon ON public.%I AS RESTRICTIVE FOR ALL TO anon USING(false) WITH CHECK(false)',tab);
  EXECUTE format('CREATE POLICY registration_pdi_owner_read ON public.%I FOR SELECT TO authenticated USING (public.portal_internal_access() AND (participant_id=auth.uid() OR public.is_admin()))',tab);
  EXECUTE format('CREATE POLICY registration_pdi_owner_update ON public.%I FOR UPDATE TO authenticated USING (public.portal_can_edit() AND (participant_id=auth.uid() OR public.is_admin())) WITH CHECK (public.portal_can_edit() AND (participant_id=auth.uid() OR public.is_admin()))',tab);
  -- Generated rows are retained even if the legacy UI offers physical deletion.
  EXECUTE format('CREATE POLICY registration_pdi_preserve ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (registration_version IS NULL AND public.is_admin())',tab);
  EXECUTE format('CREATE TRIGGER registration_pdi_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.registration_pdi_guard()',tab);
 END LOOP;
END $$;

CREATE FUNCTION public.registration_pdis_generate(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.member_registrations; mode text; target_table text; goals text; areas text;
BEGIN
 IF NOT (SELECT pdi_generation_enabled FROM public.member_registration_settings WHERE singleton) THEN RETURN; END IF;
 SELECT * INTO r FROM public.member_registrations WHERE user_id=p_user AND completed_version=1 FOR SHARE;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT string_agg(value,E'\n') INTO goals FROM jsonb_array_elements_text(r.profile->'objectives');
 SELECT string_agg(value,', ') INTO areas FROM jsonb_array_elements_text(r.profile->'areas');
 FOR mode IN SELECT DISTINCT value FROM jsonb_array_elements_text(r.profile->'modalities') LOOP
  IF mode NOT IN ('FTC','FRC','FLL','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2') THEN RAISE EXCEPTION 'PDI_INVALID_MODALITY'; END IF;
  target_table:=CASE WHEN mode='FRC' THEN 'pdi_frcs' ELSE 'pdis' END;
  EXECUTE format('INSERT INTO public.%I (participant_id,modality,registration_version,member_name,main_role,learning_goal,season,status,progress_override,initial_competencies) VALUES($1,$2,$3,$4,$5,$6,$7,''rascunho'',0,$8) ON CONFLICT (participant_id,modality,registration_version) WHERE registration_version IS NOT NULL DO NOTHING',target_table)
   USING r.user_id,mode,r.completed_version,r.profile->>'preferred_name',coalesce(areas,''),coalesce(goals,''),r.profile->>'season',r.profile->'competencies';
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.registration_pdis_generate(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.registration_pdis_after_complete() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.completed_version=1 THEN PERFORM public.registration_pdis_generate(NEW.user_id); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.registration_pdis_after_complete() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER registration_pdis_after_complete AFTER INSERT OR UPDATE OF completed_version ON public.member_registrations
 FOR EACH ROW EXECUTE FUNCTION public.registration_pdis_after_complete();

CREATE FUNCTION public.member_pdis(p_modality text DEFAULT NULL,p_all boolean DEFAULT false,p_after text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; more boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() OR p_all IS NULL OR (p_all AND NOT public.is_admin()) THEN RAISE EXCEPTION 'PDI_ACCESS_DENIED'; END IF;
 WITH items AS (
  SELECT 'pdis:'||id AS cursor,to_jsonb(p) AS item FROM public.pdis p WHERE (p_all OR participant_id=auth.uid()) AND (p_modality IS NULL OR modality=p_modality)
  UNION ALL
  SELECT 'pdi_frcs:'||id,to_jsonb(p) FROM public.pdi_frcs p WHERE (p_all OR participant_id=auth.uid()) AND (p_modality IS NULL OR modality=p_modality)
 ), page AS (SELECT * FROM items WHERE p_after IS NULL OR cursor>p_after ORDER BY cursor LIMIT 101)
 SELECT coalesce(jsonb_agg(jsonb_build_object('cursor',cursor,'pdi',item) ORDER BY cursor) FILTER(WHERE rn<=100),'[]'),count(*)>100
 INTO result,more FROM (SELECT *,row_number() OVER(ORDER BY cursor) rn FROM page) numbered;
 RETURN jsonb_build_object('actor',auth.uid(),'items',result,'has_more',more,'next_cursor',CASE WHEN more THEN result->99->>'cursor' ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.member_pdis(text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_pdis(text,boolean,text) TO authenticated;
COMMIT;
