BEGIN;
-- Administrative UI availability, not a replacement for data/table authorization.
CREATE TABLE public.portal_page_visibility (
 page_key text PRIMARY KEY,
 visible boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 0 CHECK(revision >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);
INSERT INTO public.portal_page_visibility(page_key)
SELECT unnest(ARRAY[
 'InternalOperations','InternalLogs','InternalMeetings','InternalPrototypes','InternalMemorial',
 'InternalEventGallery','InternalRiskAnalysis','InternalESG','InternalProjects','InternalProjectsDashboard',
 'InternalSocialProjects','InternalOBR','InternalFRC','InternalFRCMatchHistory','InternalFRCMatches',
 'InternalFRCPDI','InternalFRCPicklist','InternalFRCScout','InternalFRCTeams','InternalFRCTeamsRegister',
 'InternalFTC','InternalFTCMatches','InternalFTCPDI','InternalFTCQualifiersScout','InternalFTCScorer',
 'InternalFTCScout','InternalFTCTeams','InternalBoardDiary','InternalCADAssistant','InternalCADConfig',
 'InternalFLL','InternalFLLDashboard','InternalFLLMeetings','InternalFLLMissions','InternalFLLInnovation',
 'InternalFLLCoreValues','InternalFLLTeam','InternalFLLTasks','InternalFLLJudgePrep','InternalFLLAttachments',
 'InternalSeasonArchive'
 ]::text[]);
ALTER TABLE public.portal_page_visibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_page_visibility FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.portal_page_visibility TO authenticated;
CREATE POLICY page_visibility_read ON public.portal_page_visibility FOR SELECT TO authenticated
 USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.portal_internal_access()));

CREATE FUNCTION public.portal_page_visibility_snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (coalesce(public.is_admin(),false) OR coalesce(public.portal_internal_access(),false))
 THEN RAISE EXCEPTION 'PAGE_VISIBILITY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('actor',auth.uid(),'is_admin',coalesce(public.is_admin(),false),
  'pages',(SELECT jsonb_object_agg(page_key,jsonb_build_object('visible',visible,'revision',revision)) FROM public.portal_page_visibility));
END $$;

CREATE FUNCTION public.portal_page_visibility_set(p_page text,p_visible boolean,p_revision integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(),false)
 THEN RAISE EXCEPTION 'PAGE_VISIBILITY_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_visible IS NULL OR p_revision IS NULL OR p_revision < 0
 THEN RAISE EXCEPTION 'PAGE_VISIBILITY_INVALID'; END IF;
 -- UPDATE only; unknown routes and recovery entry points cannot be inserted by callers.
 UPDATE public.portal_page_visibility SET visible=p_visible, revision=revision+1,
  updated_at=clock_timestamp(),updated_by=auth.uid()
 WHERE page_key=p_page AND revision=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAGE_VISIBILITY_CONFLICT_OR_UNKNOWN'; END IF;
 RETURN public.portal_page_visibility_snapshot();
END $$;
REVOKE ALL ON FUNCTION public.portal_page_visibility_snapshot() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.portal_page_visibility_set(text,boolean,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_page_visibility_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_page_visibility_set(text,boolean,integer) TO authenticated;
COMMIT;
