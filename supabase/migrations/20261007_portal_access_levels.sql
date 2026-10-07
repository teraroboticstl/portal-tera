BEGIN;
ALTER TABLE public.portal_user_access ADD COLUMN IF NOT EXISTS access_level text CHECK(access_level IN ('public','student','trainee','member','leader'));
-- Preserve existing membership; no existing account is promoted by this migration.
CREATE OR REPLACE FUNCTION public.portal_access_level() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN public.is_admin() THEN 'leader' ELSE coalesce((SELECT coalesce(a.access_level,
 CASE WHEN p.status='approved' AND coalesce(a.portal_internal,true) THEN CASE WHEN p.member_role='member' OR p.role='mentor' THEN 'member' ELSE 'trainee' END
 WHEN a.user_id IS NOT NULL THEN 'student' ELSE 'public' END) FROM profiles p LEFT JOIN portal_user_access a ON a.user_id=p.id WHERE p.id=auth.uid()),'public') END;
$$;
CREATE OR REPLACE FUNCTION public.portal_internal_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_admin() OR (public.portal_access_level() IN ('trainee','member','leader') AND EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='approved'));
$$;
CREATE OR REPLACE FUNCTION public.portal_can_edit() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_admin() OR (public.portal_access_level() IN ('member','leader') AND EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='approved'));
$$;
CREATE OR REPLACE FUNCTION public.ava_has_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_admin() OR (public.portal_access_level() IN ('trainee','member','leader') AND public.portal_internal_access()) OR
 (public.portal_access_level()='student' AND EXISTS(SELECT 1 FROM portal_user_access a JOIN profiles p ON p.id=a.user_id WHERE a.user_id=auth.uid() AND a.ava_status='active' AND p.status='approved'));
$$;
CREATE OR REPLACE FUNCTION public.ava_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_admin(); $$;
CREATE OR REPLACE FUNCTION public.ava_identity() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('access_level',public.portal_access_level(),'portal_can_edit',public.portal_can_edit(),
 'ava_status',CASE WHEN public.ava_has_access() THEN 'active' ELSE coalesce((SELECT ava_status FROM portal_user_access WHERE user_id=auth.uid()),'none') END,
 'ava_admin',public.ava_is_admin(),'portal_admin',public.is_admin(),'portal_internal',public.portal_internal_access(),
 'mentor',public.portal_can_edit() AND coalesce((SELECT mentor FROM portal_user_access WHERE user_id=auth.uid()),false),
 'team_name',coalesce((SELECT team_name FROM portal_user_access WHERE user_id=auth.uid()),''),'city',coalesce((SELECT city FROM portal_user_access WHERE user_id=auth.uid()),''));
$$;
-- Read permission never implies write permission. Existing authorship policies still apply.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['audit_logs','board_diaries','daily_logs','esg_initiatives','fll_attachments','fll_core_values','fll_innovation_projects','fll_judge_preps','fll_members','fll_missions','fll_tasks','frc_scouts','internal_projects','matches','meeting_notes','onshape_configs','pdi_frcs','pdis','priorities','project_risks','prototype_tests','scout_ftcs','team_knowledge_bases','team_logs','teams','tournament_configs','projects'] LOOP
  IF to_regclass('public.'||tab) IS NOT NULL THEN
   EXECUTE format('DROP POLICY IF EXISTS portal_insert_level ON public.%I',tab);
   EXECUTE format('DROP POLICY IF EXISTS portal_update_level ON public.%I',tab);
   EXECUTE format('DROP POLICY IF EXISTS portal_delete_level ON public.%I',tab);
   EXECUTE format('CREATE POLICY portal_insert_level ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.portal_can_edit())',tab);
   EXECUTE format('CREATE POLICY portal_update_level ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.portal_can_edit()) WITH CHECK(public.portal_can_edit())',tab);
   EXECUTE format('CREATE POLICY portal_delete_level ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(public.portal_can_edit())',tab);
  END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.portal_set_access(p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_id uuid:=(p_data->>'user_id')::uuid; desired text:=p_data->>'access_level'; approval text:=p_data->>'status'; responsible boolean:=coalesce((p_data->>'mentor')::boolean,false);
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED'; END IF;
 IF desired IS NULL OR desired NOT IN ('public','student','trainee','member','leader') OR approval IS NULL OR approval NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Nível ou autorização inválidos.'; END IF;
 PERFORM 1 FROM profiles WHERE id=target_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado.'; END IF;
 IF target_id=auth.uid() AND (desired!='leader' OR approval!='approved') THEN RAISE EXCEPTION 'Você não pode remover seu próprio acesso de líder.'; END IF;
 IF EXISTS(SELECT 1 FROM profiles WHERE id=target_id AND lower(email) IN ('teraroboticstl@gmail.com','nathannovaes16@gmail.com')) AND (desired!='leader' OR approval!='approved') THEN RAISE EXCEPTION 'As contas responsáveis pela recuperação do portal devem permanecer líderes.'; END IF;
 IF responsible AND desired NOT IN ('member','leader') THEN RAISE EXCEPTION 'Somente membros integrados ou líderes podem gerenciar mentorias.'; END IF;
 UPDATE profiles SET role=CASE WHEN desired='leader' AND approval='approved' THEN 'admin' WHEN desired='member' THEN 'mentor' ELSE 'aluno' END,
 member_role=CASE WHEN desired='leader' AND approval='approved' THEN 'admin' WHEN desired='member' THEN 'member' ELSE 'user' END,status=approval WHERE id=target_id;
 INSERT INTO portal_user_access(user_id,access_level,portal_internal,ava_status,ava_admin,mentor)
 VALUES(target_id,desired,desired IN ('trainee','member','leader') AND approval='approved',CASE WHEN approval='approved' AND desired!='public' THEN 'active' WHEN approval='rejected' THEN 'blocked' ELSE 'pending' END,desired='leader' AND approval='approved',responsible AND approval='approved')
 ON CONFLICT(user_id) DO UPDATE SET access_level=excluded.access_level,portal_internal=excluded.portal_internal,ava_status=excluded.ava_status,ava_admin=excluded.ava_admin,mentor=excluded.mentor,updated_at=now();
 INSERT INTO ava_audit_logs(actor_id,action,entity_id,details) VALUES(auth.uid(),'set_access_level',target_id::text,jsonb_build_object('access_level',desired,'status',approval,'mentor',responsible));
 RETURN jsonb_build_object('success',true,'id',target_id);
END $$;
REVOKE ALL ON FUNCTION public.portal_set_access(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_set_access(jsonb) TO authenticated;
-- Preserve AVA assessment/enrollment implementation while replacing scope administration.
DO $$ BEGIN
 IF to_regprocedure('public.ava_mutate_legacy(text,jsonb)') IS NULL THEN ALTER FUNCTION public.ava_mutate(text,jsonb) RENAME TO ava_mutate_legacy; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ava_mutate_legacy(text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ava_mutate(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_action='set_access' THEN RETURN public.portal_set_access(p_data); END IF;
 IF p_action IN ('save_mentorship','attendance') AND NOT public.portal_can_edit() THEN RAISE EXCEPTION 'Somente membros integrados e líderes podem editar mentorias.'; END IF;
 RETURN public.ava_mutate_legacy(p_action,p_data);
END $$;
REVOKE ALL ON FUNCTION public.ava_mutate(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ava_mutate(text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.ava_register_media(p_data jsonb,p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor AND (role='admin' OR member_role='admin')) THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED'; END IF;
 IF p_data->>'mime_type' NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN RAISE EXCEPTION 'Formato inválido.'; END IF;
 INSERT INTO ava_media_assets(file_id,module_id,track_id,name,mime_type,size,folder_id,uploaded_by) VALUES(p_data->>'file_id',nullif(p_data->>'module_id','')::uuid,nullif(p_data->>'track_id','')::uuid,p_data->>'name',p_data->>'mime_type',(p_data->>'size')::bigint,p_data->>'folder_id',p_actor);
 INSERT INTO ava_audit_logs(actor_id,action,entity_id) VALUES(p_actor,'upload_media',p_data->>'file_id');
 RETURN jsonb_build_object('success',true);
END $$;
COMMIT;
