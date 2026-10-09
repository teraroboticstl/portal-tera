BEGIN;
-- Keep public reading and existing section-specific author/admin rules.
-- Restrictive policies add a minimum access level; they never grant new access.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['tir_equipes','tir_regras','tir_fotos','robots','products','sponsors','seasons','event_galleries','event_medias','tournament_memorials'] LOOP
  IF to_regclass('public.'||tab) IS NULL THEN RAISE EXCEPTION 'Expected table missing: %',tab; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('DROP POLICY IF EXISTS portal_public_insert_level ON public.%I',tab);
  EXECUTE format('DROP POLICY IF EXISTS portal_public_update_level ON public.%I',tab);
  EXECUTE format('DROP POLICY IF EXISTS portal_public_delete_level ON public.%I',tab);
  EXECUTE format('CREATE POLICY portal_public_insert_level ON public.%I AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(public.portal_can_edit())',tab);
  EXECUTE format('CREATE POLICY portal_public_update_level ON public.%I AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(public.portal_can_edit()) WITH CHECK(public.portal_can_edit())',tab);
  EXECUTE format('CREATE POLICY portal_public_delete_level ON public.%I AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(public.portal_can_edit())',tab);
 END LOOP;
END $$;
COMMIT;
