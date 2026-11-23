BEGIN;
ALTER TABLE public.portal_user_access DROP CONSTRAINT portal_user_access_access_level_check;
ALTER TABLE public.portal_user_access ADD CONSTRAINT portal_user_access_access_level_check CHECK(access_level IN ('public','student','trainee','member','leader','technician','management_readonly'));
CREATE FUNCTION public.portal_management_assigned() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.portal_user_access WHERE user_id=auth.uid() AND access_level='management_readonly');
$$;
CREATE FUNCTION public.portal_management_reader() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.portal_management_assigned() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND status='approved');
$$;
-- Existing writer/admin predicates remain untouched. Management has no internal writer scope.
ALTER FUNCTION public.portal_set_access(jsonb) RENAME TO portal_set_access_before_management;
CREATE FUNCTION public.portal_set_access(p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; target uuid:=(p_data->>'user_id')::uuid;
BEGIN
 IF auth.uid() IS NULL OR public.portal_management_assigned() OR NOT public.is_admin() THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_data->>'access_level'='management_readonly' THEN
  IF coalesce((p_data->>'mentor')::boolean,false) THEN RAISE EXCEPTION 'MANAGEMENT_CANNOT_MENTOR'; END IF;
  result:=public.portal_set_access_before_management(p_data || jsonb_build_object('access_level','student','mentor',false));
  UPDATE public.portal_user_access SET access_level='management_readonly',portal_internal=false,ava_admin=false,mentor=false WHERE user_id=target;
  INSERT INTO public.ava_audit_logs(actor_id,action,entity_id,details) VALUES(auth.uid(),'set_management_readonly',target::text,jsonb_build_object('status',p_data->>'status'));
  RETURN result;
 END IF;
 RETURN public.portal_set_access_before_management(p_data);
END $$;
ALTER FUNCTION public.ava_mutate(text,jsonb) RENAME TO ava_mutate_before_management;
CREATE FUNCTION public.ava_mutate(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF public.portal_management_assigned() THEN RAISE EXCEPTION 'MANAGEMENT_READ_ONLY' USING ERRCODE='42501'; END IF;
 RETURN public.ava_mutate_before_management(p_action,p_data);
END $$;
-- Only the two self-service identity tables need additional direct-write restrictions.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['profiles','portal_user_access'] LOOP
  EXECUTE format('CREATE POLICY management_no_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(NOT public.portal_management_assigned())',tab);
  EXECUTE format('CREATE POLICY management_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(NOT public.portal_management_assigned()) WITH CHECK(NOT public.portal_management_assigned())',tab);
  EXECUTE format('CREATE POLICY management_no_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(NOT public.portal_management_assigned())',tab);
 END LOOP;
END $$;
CREATE FUNCTION public.portal_management_records(p_source text,p_after text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; more boolean; next_key text;
BEGIN
 IF NOT public.portal_management_reader() AND NOT (auth.uid() IS NOT NULL AND public.is_admin() AND NOT public.portal_management_assigned()) THEN RAISE EXCEPTION 'MANAGEMENT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF p_source IS NULL OR p_source NOT IN ('pdis','pdi_frcs','daily_logs','team_logs','meeting_notes','board_diaries','portal_work_items','fll_missions','fll_tasks','fll_innovation_projects','fll_core_values','fll_judge_preps','fll_members','fll_attachments','frc_scouts','scout_ftcs','internal_projects','project_risks','esg_initiatives','tir_equipes','tir_regras') OR length(coalesce(p_after,''))>200 THEN RAISE EXCEPTION 'MANAGEMENT_INVALID_SOURCE'; END IF;
 IF to_regclass('public.'||p_source) IS NULL THEN RETURN jsonb_build_object('actor',auth.uid(),'source',p_source,'items','[]'::jsonb,'has_more',false,'next_cursor',NULL,'available',false); END IF;
 EXECUTE format($q$
 WITH source AS (SELECT to_jsonb(t) doc FROM public.%I t),
 page AS (SELECT doc->>'id' key,(SELECT coalesce(jsonb_object_agg(k,v),'{}') FROM jsonb_each(doc) e(k,v) WHERE k=ANY($1)) item FROM source
 WHERE doc->>'id' IS NOT NULL AND ($2 IS NULL OR (doc->>'id') COLLATE "C">$2 COLLATE "C") ORDER BY doc->>'id' COLLATE "C" LIMIT 51),
 numbered AS (SELECT *,row_number() OVER(ORDER BY key COLLATE "C") rn FROM page)
 SELECT coalesce(jsonb_agg(jsonb_build_object('cursor',key,'record',item) ORDER BY key COLLATE "C") FILTER(WHERE rn<=50),'[]'),count(*)>50,max(key COLLATE "C") FILTER(WHERE rn=50) FROM numbered
 $q$,p_source) INTO result,more,next_key USING ARRAY['id','title','name','member_name','full_name','created_at','updated_at','date','season','modality','program','category','area','description','content','notes','summary','decisions','objectives','competencies','goals','skills','progress','percentage','status','priority','due_date','team_name','team_number','score','auto_score','teleop_score','endgame_score','evidence','attachments','images','file_url','image_url','main_role','other_roles','time_in_team','learning_goal','how_to_learn','activities','main_learning','challenge_learning','teamwork','final_reflection','certificates','progress_override','initial_competencies'],p_after;
 RETURN jsonb_build_object('actor',auth.uid(),'source',p_source,'items',result,'has_more',more,'next_cursor',CASE WHEN more THEN next_key ELSE NULL END,'available',true);
END $$;
REVOKE ALL ON FUNCTION public.portal_set_access_before_management(jsonb),public.ava_mutate_before_management(text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.portal_management_assigned(),public.portal_management_reader(),public.portal_management_records(text,text),public.portal_set_access(jsonb),public.ava_mutate(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_management_assigned(),public.portal_management_reader(),public.portal_management_records(text,text),public.portal_set_access(jsonb),public.ava_mutate(text,jsonb) TO authenticated;
COMMIT;
