BEGIN;
CREATE TABLE IF NOT EXISTS public.portal_user_access (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 ava_status text NOT NULL DEFAULT 'pending' CHECK(ava_status IN ('pending','active','blocked')),
 ava_admin boolean NOT NULL DEFAULT false, mentor boolean NOT NULL DEFAULT false,
 portal_internal boolean, team_name text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ava_tracks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160), subtitle text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 position integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 audience text NOT NULL DEFAULT 'all' CHECK(audience IN ('all','tera','external')), prerequisites uuid[] NOT NULL DEFAULT '{}',
 cover_file_id text, community_url text NOT NULL DEFAULT '', certificate_config jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ava_modules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), track_id uuid NOT NULL REFERENCES public.ava_tracks(id),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160), summary text NOT NULL DEFAULT '', position integer NOT NULL DEFAULT 0,
 duration_minutes integer NOT NULL DEFAULT 30 CHECK(duration_minutes BETWEEN 1 AND 1440),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 contents jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(contents)='array'), version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ava_enrollments (
 user_id uuid NOT NULL REFERENCES public.profiles(id), track_id uuid NOT NULL REFERENCES public.ava_tracks(id),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,track_id)
);
CREATE TABLE IF NOT EXISTS public.ava_progress (
 user_id uuid NOT NULL REFERENCES public.profiles(id), module_id uuid NOT NULL REFERENCES public.ava_modules(id),
 version integer NOT NULL, blocks jsonb NOT NULL DEFAULT '{}', completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,module_id)
);
CREATE TABLE IF NOT EXISTS public.ava_quiz_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id), module_id uuid NOT NULL REFERENCES public.ava_modules(id),
 block_id text NOT NULL, version integer NOT NULL, answers jsonb NOT NULL, score numeric NOT NULL, passed boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ava_mentorships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160), area text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 mentor_id uuid REFERENCES public.profiles(id), mentor_name text NOT NULL DEFAULT '', starts_at timestamptz NOT NULL,
 duration_minutes integer NOT NULL DEFAULT 60 CHECK(duration_minutes BETWEEN 15 AND 240), capacity integer NOT NULL DEFAULT 10 CHECK(capacity BETWEEN 1 AND 500),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')), meeting_url text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ava_mentorship_registrations (
 user_id uuid NOT NULL REFERENCES public.profiles(id), mentorship_id uuid NOT NULL REFERENCES public.ava_mentorships(id),
 status text NOT NULL DEFAULT 'registered' CHECK(status IN ('registered','cancelled','attended')), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,mentorship_id)
);
CREATE TABLE IF NOT EXISTS public.ava_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160), message text NOT NULL CHECK(length(message) BETWEEN 1 AND 6000),
 audience text NOT NULL DEFAULT 'all' CHECK(audience IN ('all','tera','external','track')), track_id uuid REFERENCES public.ava_tracks(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ava_notification_recipients (
 notification_id uuid NOT NULL REFERENCES public.ava_notifications(id), user_id uuid NOT NULL REFERENCES public.profiles(id), read_at timestamptz, PRIMARY KEY(notification_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.ava_media_assets (
 file_id text PRIMARY KEY, module_id uuid REFERENCES public.ava_modules(id), track_id uuid REFERENCES public.ava_tracks(id),
 name text NOT NULL, mime_type text NOT NULL, size bigint NOT NULL CHECK(size BETWEEN 1 AND 15728640), folder_id text NOT NULL,
 uploaded_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ava_audit_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES public.profiles(id), action text NOT NULL,
 entity_id text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ava_modules_track_order ON public.ava_modules(track_id,position);
CREATE INDEX IF NOT EXISTS ava_progress_module ON public.ava_progress(module_id);
CREATE INDEX IF NOT EXISTS ava_notifications_user ON public.ava_notification_recipients(user_id,read_at);

-- RLS: no direct table writes; scoped SECURITY DEFINER RPCs enforce permissions.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['portal_user_access','ava_tracks','ava_modules','ava_enrollments','ava_progress','ava_quiz_attempts','ava_mentorships','ava_mentorship_registrations','ava_notifications','ava_notification_recipients','ava_media_assets','ava_audit_logs'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.portal_internal_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_admin() OR EXISTS(SELECT 1 FROM profiles p LEFT JOIN portal_user_access a ON a.user_id=p.id WHERE p.id=auth.uid() AND p.status='approved' AND coalesce(a.portal_internal,true));
$$;
CREATE OR REPLACE FUNCTION public.ava_has_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_admin() OR EXISTS(SELECT 1 FROM portal_user_access WHERE user_id=auth.uid() AND ava_status='active');
$$;
CREATE OR REPLACE FUNCTION public.ava_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_admin() OR EXISTS(SELECT 1 FROM portal_user_access WHERE user_id=auth.uid() AND ava_status='active' AND ava_admin);
$$;
-- Restrictive policies AND with existing authorship/role policies; preserve public pages.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['audit_logs','board_diaries','daily_logs','esg_initiatives','fll_attachments','fll_core_values','fll_innovation_projects','fll_judge_preps','fll_members','fll_missions','fll_tasks','frc_scouts','internal_projects','matches','meeting_notes','onshape_configs','pdi_frcs','pdis','priorities','project_risks','prototype_tests','scout_ftcs','team_knowledge_bases','team_logs','teams','tournament_configs','user_presences'] LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('DROP POLICY IF EXISTS portal_internal_scope ON public.%I',t);
   EXECUTE format('CREATE POLICY portal_internal_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.portal_internal_access()) WITH CHECK (public.portal_internal_access())',t);
  END IF;
 END LOOP;
END $$;
DROP POLICY IF EXISTS portal_profile_visibility ON public.profiles;
CREATE POLICY portal_profile_visibility ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(id=auth.uid() OR public.portal_internal_access());
DROP POLICY IF EXISTS portal_projects_edit_scope ON public.projects;
CREATE POLICY portal_projects_edit_scope ON public.projects AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.portal_internal_access()) WITH CHECK(public.portal_internal_access());
DROP POLICY IF EXISTS portal_projects_insert_scope ON public.projects;
CREATE POLICY portal_projects_insert_scope ON public.projects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.portal_internal_access());

CREATE OR REPLACE FUNCTION public.ava_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'subtitle',t.subtitle,'description',t.description,'audience',t.audience,'module_count',(SELECT count(*) FROM ava_modules m WHERE m.track_id=t.id AND m.status='published')) ORDER BY t.position),'[]') FROM ava_tracks t WHERE t.status='published';
$$;
CREATE OR REPLACE FUNCTION public.ava_identity() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('ava_status',CASE WHEN public.is_admin() THEN 'active' ELSE coalesce((SELECT ava_status FROM portal_user_access WHERE user_id=auth.uid()),'none') END,'ava_admin',public.ava_is_admin(),'portal_admin',public.is_admin(),'portal_internal',public.portal_internal_access(),'mentor',coalesce((SELECT mentor FROM portal_user_access WHERE user_id=auth.uid()),false),'team_name',coalesce((SELECT team_name FROM portal_user_access WHERE user_id=auth.uid()),''),'city',coalesce((SELECT city FROM portal_user_access WHERE user_id=auth.uid()),''));
$$;
CREATE OR REPLACE FUNCTION public.ava_track_allowed(p_track uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.ava_is_admin() OR (public.ava_has_access() AND EXISTS(SELECT 1 FROM ava_tracks t WHERE t.id=p_track AND t.status='published' AND (t.audience='all' OR (t.audience='tera' AND public.portal_internal_access()) OR (t.audience='external' AND NOT public.portal_internal_access()))));
$$;
CREATE OR REPLACE FUNCTION public.ava_track_progress(p_user uuid,p_track uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN count(*)=0 THEN 0 ELSE round(100.0*count(*) FILTER(WHERE p.completed_at IS NOT NULL AND p.version=m.version)/count(*))::integer END FROM ava_modules m LEFT JOIN ava_progress p ON p.module_id=m.id AND p.user_id=p_user WHERE m.track_id=p_track AND m.status='published';
$$;
-- Never reveal answer keys/feedback before an assessment; admin receives editable source.
CREATE OR REPLACE FUNCTION public.ava_safe_contents(p_contents jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT coalesce(jsonb_agg(CASE WHEN b->>'type'='quiz' THEN jsonb_set(b,'{questions}',coalesce((SELECT jsonb_agg(q - 'correct' - 'feedback') FROM jsonb_array_elements(b->'questions') q),'[]')) ELSE b END),'[]') FROM jsonb_array_elements(p_contents) b;
$$;

CREATE OR REPLACE FUNCTION public.ava_read(p_view text DEFAULT 'dashboard',p_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); result jsonb; module_track_id uuid;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'AVA_UNAUTHENTICATED'; END IF;
 IF p_view='identity' THEN RETURN public.ava_identity(); END IF;
 IF NOT public.ava_has_access() THEN RAISE EXCEPTION 'AVA_ACCESS_DENIED'; END IF;
 IF p_view='mentor' THEN
  IF NOT public.ava_is_admin() AND NOT EXISTS(SELECT 1 FROM portal_user_access WHERE user_id=u AND mentor AND ava_status='active') THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED'; END IF;
  RETURN jsonb_build_object('tracks','[]'::jsonb,'modules','[]'::jsonb,'enrollments','[]'::jsonb,'progress','[]'::jsonb,'notifications','[]'::jsonb,'audit','[]'::jsonb,
   'mentorships',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY starts_at),'[]') FROM ava_mentorships m WHERE mentor_id=u),
   'registrations',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM ava_mentorship_registrations r JOIN ava_mentorships m ON m.id=r.mentorship_id WHERE m.mentor_id=u),
   'users',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'access',jsonb_build_object('team_name',a.team_name,'city',a.city))),'[]') FROM profiles p LEFT JOIN portal_user_access a ON a.user_id=p.id WHERE p.id=u OR EXISTS(SELECT 1 FROM ava_mentorship_registrations r JOIN ava_mentorships m ON m.id=r.mentorship_id WHERE m.mentor_id=u AND r.user_id=p.id)));
 END IF;
 IF p_view='admin' THEN
  IF NOT public.ava_is_admin() THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED'; END IF;
  RETURN jsonb_build_object(
   'users',(SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('access',coalesce(to_jsonb(a),'{}')) ORDER BY p.created_at DESC),'[]') FROM profiles p LEFT JOIN portal_user_access a ON a.user_id=p.id),
   'tracks',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY position),'[]') FROM ava_tracks t),
   'modules',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY position),'[]') FROM ava_modules m),
   'enrollments',(SELECT coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('progress',public.ava_track_progress(e.user_id,e.track_id))),'[]') FROM ava_enrollments e),
   'mentorships',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY starts_at DESC),'[]') FROM ava_mentorships m),
   'registrations',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM ava_mentorship_registrations r),
   'notifications',(SELECT coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('delivered',(SELECT count(*) FROM ava_notification_recipients r WHERE r.notification_id=n.id),'read',(SELECT count(*) FROM ava_notification_recipients r WHERE r.notification_id=n.id AND read_at IS NOT NULL)) ORDER BY created_at DESC),'[]') FROM ava_notifications n),
   'audit',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT * FROM ava_audit_logs ORDER BY created_at DESC LIMIT 100) x),
   'progress',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM ava_progress p),
   'attempts',(SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]') FROM ava_quiz_attempts a)
  );
 END IF;
 IF p_view='module' THEN
  SELECT track_id INTO module_track_id FROM ava_modules WHERE id=p_id AND status='published';
  IF module_track_id IS NULL OR NOT public.ava_track_allowed(module_track_id) OR NOT EXISTS(SELECT 1 FROM ava_enrollments WHERE user_id=u AND track_id=module_track_id AND status='active') THEN RAISE EXCEPTION 'AVA_ENROLLMENT_REQUIRED'; END IF;
  RETURN jsonb_build_object('module',(SELECT to_jsonb(m)||jsonb_build_object('contents',public.ava_safe_contents(m.contents)) FROM ava_modules m WHERE id=p_id),'progress',(SELECT to_jsonb(p) FROM ava_progress p WHERE user_id=u AND module_id=p_id AND version=(SELECT version FROM ava_modules WHERE id=p_id)), 'attempts',(SELECT coalesce(jsonb_agg(jsonb_build_object('block_id',a.block_id,'score',a.score,'passed',a.passed,'created_at',a.created_at)),'[]') FROM ava_quiz_attempts a WHERE a.user_id=u AND a.module_id=p_id AND a.version=(SELECT version FROM ava_modules WHERE id=p_id)));
 END IF;
 RETURN jsonb_build_object('identity',public.ava_identity(),
  'tracks',(SELECT coalesce(jsonb_agg(to_jsonb(t)-'certificate_config'||jsonb_build_object('enrolled',EXISTS(SELECT 1 FROM ava_enrollments e WHERE e.track_id=t.id AND e.user_id=u AND e.status='active'),'progress',public.ava_track_progress(u,t.id)) ORDER BY t.position),'[]') FROM ava_tracks t WHERE public.ava_track_allowed(t.id) AND t.status='published'),
  'modules',(SELECT coalesce(jsonb_agg(to_jsonb(m)-'contents' ORDER BY m.position),'[]') FROM ava_modules m WHERE m.status='published' AND public.ava_track_allowed(m.track_id) AND EXISTS(SELECT 1 FROM ava_enrollments e WHERE e.track_id=m.track_id AND e.user_id=u AND e.status='active')),
  'progress',(SELECT coalesce(jsonb_agg(to_jsonb(p)-'blocks'),'[]') FROM ava_progress p WHERE user_id=u),
  'mentorships',(SELECT coalesce(jsonb_agg(to_jsonb(m)-'meeting_url'||jsonb_build_object('registered',EXISTS(SELECT 1 FROM ava_mentorship_registrations r WHERE r.mentorship_id=m.id AND r.user_id=u AND r.status!='cancelled'),'participants',(SELECT count(*) FROM ava_mentorship_registrations r WHERE r.mentorship_id=m.id AND r.status!='cancelled'),'meeting_url',CASE WHEN EXISTS(SELECT 1 FROM ava_mentorship_registrations r WHERE r.mentorship_id=m.id AND r.user_id=u AND r.status!='cancelled') THEN m.meeting_url ELSE '' END) ORDER BY starts_at),'[]') FROM ava_mentorships m WHERE m.status!='cancelled'),
  'notifications',(SELECT coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('read_at',r.read_at) ORDER BY n.created_at DESC),'[]') FROM ava_notifications n JOIN ava_notification_recipients r ON r.notification_id=n.id WHERE r.user_id=u)
 );
END $$;

CREATE OR REPLACE FUNCTION public.ava_mutate(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); v_id uuid; t uuid; m ava_modules%ROWTYPE; b jsonb; q jsonb; p ava_progress%ROWTYPE; value jsonb; state jsonb; score numeric; hits integer:=0; total integer; attempt_count integer; done boolean; item jsonb; existing portal_user_access%ROWTYPE;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'AVA_UNAUTHENTICATED'; END IF;
 IF octet_length(p_data::text)>150000 THEN RAISE EXCEPTION 'AVA_PAYLOAD_TOO_LARGE'; END IF;
 IF p_action='request_access' THEN
  IF length(trim(coalesce(p_data->>'team_name',''))) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Informe o nome da equipe.'; END IF;
  INSERT INTO portal_user_access(user_id,team_name,city) VALUES(u,left(trim(p_data->>'team_name'),160),left(coalesce(p_data->>'city',''),160)) ON CONFLICT(user_id) DO UPDATE SET team_name=excluded.team_name,city=excluded.city,updated_at=now();
  RETURN public.ava_identity();
 END IF;
 IF NOT public.ava_has_access() THEN RAISE EXCEPTION 'AVA_ACCESS_DENIED'; END IF;
 IF p_action IN ('save_track','save_module','set_access','enroll_user','save_mentorship','attendance','notify','archive_track','archive_module') THEN
  IF NOT public.ava_is_admin() AND NOT (p_action IN ('save_mentorship','attendance') AND EXISTS(SELECT 1 FROM portal_user_access WHERE user_id=u AND ava_status='active' AND mentor)) THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED'; END IF;
  IF p_action='set_access' THEN
   IF NOT public.is_admin() THEN RAISE EXCEPTION 'Somente o administrador do portal pode alterar escopos.'; END IF;
   v_id:=(p_data->>'user_id')::uuid;
   IF EXISTS(SELECT 1 FROM profiles WHERE id=v_id AND (role='admin' OR member_role='admin')) THEN RAISE EXCEPTION 'Administradores do portal mantêm seus privilégios existentes.'; END IF;
   INSERT INTO portal_user_access(user_id,ava_status,ava_admin,mentor,portal_internal) VALUES(v_id,p_data->>'ava_status',coalesce((p_data->>'ava_admin')::boolean,false),coalesce((p_data->>'mentor')::boolean,false),(p_data->>'portal_internal')::boolean)
   ON CONFLICT(user_id) DO UPDATE SET ava_status=excluded.ava_status,ava_admin=excluded.ava_admin,mentor=excluded.mentor,portal_internal=excluded.portal_internal,updated_at=now();
   IF (p_data->>'portal_internal')::boolean THEN UPDATE profiles SET status='approved' WHERE id=v_id; END IF;
  ELSIF p_action='save_track' THEN
   v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_data->'prerequisites','[]')) x WHERE NOT EXISTS(SELECT 1 FROM ava_tracks WHERE id=x::uuid)) THEN RAISE EXCEPTION 'Pré-requisito inexistente.'; END IF;
   IF EXISTS(WITH RECURSIVE deps(id) AS (SELECT jsonb_array_elements_text(coalesce(p_data->'prerequisites','[]'))::uuid UNION SELECT unnest(t.prerequisites) FROM ava_tracks t JOIN deps d ON d.id=t.id) SELECT 1 FROM deps WHERE id=v_id) THEN RAISE EXCEPTION 'Pré-requisitos não podem formar ciclos.'; END IF;
   IF p_data->>'community_url'!='' AND p_data->>'community_url' NOT LIKE 'https://%' THEN RAISE EXCEPTION 'Link da comunidade inválido.'; END IF;
   IF nullif(p_data->>'cover_file_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ava_media_assets WHERE file_id=p_data->>'cover_file_id' AND (track_id=v_id OR track_id IS NULL)) THEN RAISE EXCEPTION 'Capa não pertence ao AVA.'; END IF;
   INSERT INTO ava_tracks(id,slug,title,subtitle,description,position,status,audience,prerequisites,community_url,cover_file_id) VALUES(v_id,coalesce(nullif(p_data->>'slug',''),v_id::text),trim(p_data->>'title'),coalesce(p_data->>'subtitle',''),coalesce(p_data->>'description',''),coalesce((p_data->>'position')::integer,0),coalesce(p_data->>'status','draft'),coalesce(p_data->>'audience','all'),coalesce(ARRAY(SELECT jsonb_array_elements_text(p_data->'prerequisites')::uuid),'{}'),coalesce(p_data->>'community_url',''),nullif(p_data->>'cover_file_id',''))
   ON CONFLICT(id) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,description=excluded.description,position=excluded.position,status=excluded.status,audience=excluded.audience,prerequisites=excluded.prerequisites,community_url=excluded.community_url,cover_file_id=excluded.cover_file_id;
  ELSIF p_action='save_module' THEN
   v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
   IF jsonb_array_length(coalesce(p_data->'contents','[]'))>50 THEN RAISE EXCEPTION 'Limite de 50 blocos por módulo.'; END IF;
   FOR b IN SELECT * FROM jsonb_array_elements(coalesce(p_data->'contents','[]')) LOOP
    IF coalesce(b->>'type','') NOT IN ('text','video','pdf','image','checklist','activity','quiz') OR coalesce(b->>'id','')='' THEN RAISE EXCEPTION 'Tipo ou identificador de conteúdo inválido.'; END IF;
    IF b->>'type' IN ('pdf','image') AND NOT EXISTS(SELECT 1 FROM ava_media_assets WHERE file_id=b->>'file_id' AND module_id=v_id AND mime_type=CASE WHEN b->>'type'='pdf' THEN 'application/pdf' ELSE mime_type END AND (b->>'type'='pdf' OR mime_type IN ('image/jpeg','image/png','image/webp'))) THEN RAISE EXCEPTION 'Mídia deve ser enviada e vinculada a este módulo.'; END IF;
    IF b->>'type'='video' AND coalesce(b->>'youtube_id','') !~ '^[A-Za-z0-9_-]{11}$' THEN RAISE EXCEPTION 'ID do vídeo YouTube inválido.'; END IF;
    IF b->>'type'='checklist' AND (jsonb_array_length(coalesce(b->'items','[]'))<1 OR jsonb_array_length(b->'items')>50) THEN RAISE EXCEPTION 'Checklist requer entre 1 e 50 itens.'; END IF;
    IF b->>'type'='quiz' THEN
     IF jsonb_array_length(coalesce(b->'questions','[]'))<1 OR jsonb_array_length(b->'questions')>50 OR coalesce((b->>'min_score')::integer,70) NOT BETWEEN 1 AND 100 OR coalesce((b->>'max_attempts')::integer,3) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Configuração de quiz inválida.'; END IF;
     FOR q IN SELECT * FROM jsonb_array_elements(b->'questions') LOOP
      IF jsonb_array_length(coalesce(q->'options','[]')) NOT BETWEEN 2 AND 8 OR (q->>'correct')::integer NOT BETWEEN 0 AND jsonb_array_length(q->'options')-1 OR q->>'correct' IS NULL THEN RAISE EXCEPTION 'Gabarito ou alternativas inválidos.'; END IF;
     END LOOP;
    END IF;
   END LOOP;
   IF (SELECT count(*) FROM jsonb_array_elements(coalesce(p_data->'contents','[]')))= (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(coalesce(p_data->'contents','[]')) x) IS NOT TRUE THEN RAISE EXCEPTION 'Identificadores de conteúdo duplicados.'; END IF;
   IF p_data->>'status'='published' AND jsonb_array_length(coalesce(p_data->'contents','[]'))=0 THEN RAISE EXCEPTION 'Adicione conteúdo antes de publicar.'; END IF;
   IF EXISTS(SELECT 1 FROM ava_modules WHERE id=v_id AND track_id!=(p_data->>'track_id')::uuid) THEN RAISE EXCEPTION 'O módulo não pode mudar de trilha.'; END IF;
   INSERT INTO ava_modules(id,track_id,title,summary,position,duration_minutes,status,contents) VALUES(v_id,(p_data->>'track_id')::uuid,trim(p_data->>'title'),coalesce(p_data->>'summary',''),coalesce((p_data->>'position')::integer,0),coalesce((p_data->>'duration_minutes')::integer,30),coalesce(p_data->>'status','draft'),coalesce(p_data->'contents','[]'))
   ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,position=excluded.position,duration_minutes=excluded.duration_minutes,status=excluded.status,contents=excluded.contents,version=ava_modules.version+CASE WHEN ava_modules.contents IS DISTINCT FROM excluded.contents THEN 1 ELSE 0 END,updated_at=now();
  ELSIF p_action IN ('archive_track','archive_module') THEN
   v_id:=(p_data->>'id')::uuid;
   IF p_action='archive_track' THEN UPDATE ava_tracks SET status='archived' WHERE id=v_id; ELSE UPDATE ava_modules SET status='archived' WHERE id=v_id; END IF;
  ELSIF p_action='enroll_user' THEN
   v_id:=(p_data->>'track_id')::uuid;
   INSERT INTO ava_enrollments(user_id,track_id,status) VALUES((p_data->>'user_id')::uuid,v_id,coalesce(p_data->>'status','active')) ON CONFLICT(user_id,track_id) DO UPDATE SET status=excluded.status;
  ELSIF p_action='save_mentorship' THEN
   v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
   IF NOT public.ava_is_admin() AND (nullif(p_data->>'mentor_id','')::uuid IS DISTINCT FROM u OR EXISTS(SELECT 1 FROM ava_mentorships WHERE id=v_id AND mentor_id IS DISTINCT FROM u)) THEN RAISE EXCEPTION 'Mentor pode gerenciar somente suas mentorias.'; END IF;
   IF coalesce(p_data->>'meeting_url','')!='' AND p_data->>'meeting_url' NOT LIKE 'https://%' THEN RAISE EXCEPTION 'Link de reunião inválido.'; END IF;
   IF EXISTS(SELECT 1 FROM ava_mentorships WHERE id=v_id) THEN PERFORM 1 FROM ava_mentorships WHERE id=v_id FOR UPDATE; END IF;
   IF (p_data->>'capacity')::integer<(SELECT count(*) FROM ava_mentorship_registrations WHERE mentorship_id=v_id AND status!='cancelled') THEN RAISE EXCEPTION 'Capacidade menor que o número de inscritos.'; END IF;
   INSERT INTO ava_mentorships(id,title,area,description,mentor_id,mentor_name,starts_at,duration_minutes,capacity,status,meeting_url) VALUES(v_id,p_data->>'title',coalesce(p_data->>'area',''),coalesce(p_data->>'description',''),nullif(p_data->>'mentor_id','')::uuid,coalesce(p_data->>'mentor_name',''),(p_data->>'starts_at')::timestamptz,coalesce((p_data->>'duration_minutes')::integer,60),coalesce((p_data->>'capacity')::integer,10),coalesce(p_data->>'status','scheduled'),coalesce(p_data->>'meeting_url',''))
   ON CONFLICT(id) DO UPDATE SET title=excluded.title,area=excluded.area,description=excluded.description,mentor_id=excluded.mentor_id,mentor_name=excluded.mentor_name,starts_at=excluded.starts_at,duration_minutes=excluded.duration_minutes,capacity=excluded.capacity,status=excluded.status,meeting_url=excluded.meeting_url;
  ELSIF p_action='attendance' THEN
   v_id:=(p_data->>'mentorship_id')::uuid;
   IF NOT public.ava_is_admin() AND NOT EXISTS(SELECT 1 FROM ava_mentorships WHERE id=v_id AND mentor_id=u) THEN RAISE EXCEPTION 'Mentoria de outro responsável.'; END IF;
   UPDATE ava_mentorship_registrations SET status=p_data->>'status' WHERE mentorship_id=v_id AND user_id=(p_data->>'user_id')::uuid;
  ELSIF p_action='notify' THEN
   INSERT INTO ava_notifications(title,message,audience,track_id) VALUES(trim(p_data->>'title'),trim(p_data->>'message'),coalesce(p_data->>'audience','all'),nullif(p_data->>'track_id','')::uuid) RETURNING id INTO v_id;
   IF p_data->>'audience'='track' AND nullif(p_data->>'track_id','') IS NULL THEN RAISE EXCEPTION 'Selecione a trilha do comunicado.'; END IF;
   INSERT INTO ava_notification_recipients(notification_id,user_id)
   SELECT v_id,a.user_id FROM portal_user_access a JOIN profiles pr ON pr.id=a.user_id WHERE a.ava_status='active' AND (coalesce(p_data->>'audience','all')='all' OR (p_data->>'audience'='tera' AND pr.status='approved' AND coalesce(a.portal_internal,true)) OR (p_data->>'audience'='external' AND NOT (pr.status='approved' AND coalesce(a.portal_internal,true))) OR (p_data->>'audience'='track' AND EXISTS(SELECT 1 FROM ava_enrollments e WHERE e.user_id=a.user_id AND e.track_id=(p_data->>'track_id')::uuid AND e.status='active')));
  END IF;
  INSERT INTO ava_audit_logs(actor_id,action,entity_id,details) VALUES(u,p_action,v_id::text,CASE WHEN p_action='set_access' THEN p_data-'user_id' ELSE '{}' END);
  RETURN jsonb_build_object('id',v_id,'success',true);
 END IF;
 IF p_action='enroll' THEN
  t:=(p_data->>'track_id')::uuid;
  IF NOT public.ava_track_allowed(t) THEN RAISE EXCEPTION 'AVA_ACCESS_DENIED'; END IF;
  IF EXISTS(SELECT 1 FROM ava_tracks tr,unnest(tr.prerequisites) pre WHERE tr.id=t AND public.ava_track_progress(u,pre)<100) THEN RAISE EXCEPTION 'Conclua as trilhas pré-requisito.'; END IF;
  INSERT INTO ava_enrollments(user_id,track_id) VALUES(u,t) ON CONFLICT(user_id,track_id) DO UPDATE SET status='active';
 ELSIF p_action='read_notification' THEN UPDATE ava_notification_recipients SET read_at=now() WHERE user_id=u AND notification_id=(p_data->>'id')::uuid;
 ELSIF p_action IN ('register_mentorship','cancel_registration') THEN
  v_id:=(p_data->>'id')::uuid;
  PERFORM 1 FROM ava_mentorships WHERE id=v_id AND status='scheduled' AND starts_at>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mentoria indisponível.'; END IF;
  IF p_action='register_mentorship' THEN
   IF NOT EXISTS(SELECT 1 FROM ava_mentorship_registrations WHERE user_id=u AND mentorship_id=v_id AND status!='cancelled') AND (SELECT count(*) FROM ava_mentorship_registrations WHERE mentorship_id=v_id AND status!='cancelled') >= (SELECT capacity FROM ava_mentorships WHERE id=v_id) THEN RAISE EXCEPTION 'Vagas esgotadas.'; END IF;
   INSERT INTO ava_mentorship_registrations(user_id,mentorship_id) VALUES(u,v_id) ON CONFLICT(user_id,mentorship_id) DO UPDATE SET status='registered';
  ELSE UPDATE ava_mentorship_registrations SET status='cancelled' WHERE user_id=u AND mentorship_id=v_id; END IF;
 ELSIF p_action='progress' THEN
  SELECT * INTO m FROM ava_modules WHERE id=(p_data->>'module_id')::uuid AND status='published';
  IF m.id IS NULL OR NOT public.ava_track_allowed(m.track_id) OR NOT EXISTS(SELECT 1 FROM ava_enrollments WHERE user_id=u AND track_id=m.track_id AND status='active') THEN RAISE EXCEPTION 'AVA_ENROLLMENT_REQUIRED'; END IF;
  IF (p_data->>'version')::integer IS DISTINCT FROM m.version THEN RAISE EXCEPTION 'Conteúdo atualizado. Recarregue o módulo.'; END IF;
  SELECT x INTO b FROM jsonb_array_elements(m.contents) x WHERE x->>'id'=p_data->>'block_id';
  IF b IS NULL THEN RAISE EXCEPTION 'Conteúdo inexistente.'; END IF;
  INSERT INTO ava_progress(user_id,module_id,version) VALUES(u,m.id,m.version) ON CONFLICT(user_id,module_id) DO NOTHING;
  SELECT * INTO p FROM ava_progress WHERE user_id=u AND module_id=m.id FOR UPDATE;
  state:=CASE WHEN p.version=m.version THEN p.blocks ELSE '{}' END;
  value:=p_data->'value'; done:=false;
  IF b->>'type'='quiz' THEN
   SELECT count(*) INTO attempt_count FROM ava_quiz_attempts WHERE user_id=u AND module_id=m.id AND version=m.version AND block_id=b->>'id';
   IF attempt_count>=coalesce((b->>'max_attempts')::integer,3) THEN RAISE EXCEPTION 'Limite de tentativas atingido. Solicite orientação ao mentor.'; END IF;
   total:=jsonb_array_length(b->'questions');
   IF jsonb_typeof(value) IS DISTINCT FROM 'array' OR jsonb_array_length(value)!=total THEN RAISE EXCEPTION 'Responda todas as questões.'; END IF;
   FOR q,item IN SELECT question,answer FROM jsonb_array_elements(b->'questions') WITH ORDINALITY x(question,n) JOIN jsonb_array_elements(value) WITH ORDINALITY y(answer,n) USING(n) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'number' OR (item#>>'{}')::numeric != trunc((item#>>'{}')::numeric) OR (item#>>'{}')::integer NOT BETWEEN 0 AND jsonb_array_length(q->'options')-1 THEN RAISE EXCEPTION 'Alternativa inválida.'; END IF;
    IF (item#>>'{}')::integer=(q->>'correct')::integer THEN hits:=hits+1; END IF;
   END LOOP;
   score:=round(100.0*hits/total,2); done:=score>=coalesce((b->>'min_score')::integer,70);
   INSERT INTO ava_quiz_attempts(user_id,module_id,block_id,version,answers,score,passed) VALUES(u,m.id,b->>'id',m.version,value,score,done);
   state:=jsonb_set(state,ARRAY[b->>'id'],jsonb_build_object('done',done OR coalesce((state->(b->>'id')->>'done')::boolean,false),'score',greatest(score,coalesce((state->(b->>'id')->>'score')::numeric,0))));
  ELSIF b->>'type'='checklist' THEN
   IF jsonb_typeof(value) IS DISTINCT FROM 'array' OR jsonb_array_length(value)!=jsonb_array_length(b->'items') OR EXISTS(SELECT 1 FROM jsonb_array_elements(value) x WHERE jsonb_typeof(x)!='boolean') THEN RAISE EXCEPTION 'Checklist inválido.'; END IF;
   done:=NOT EXISTS(SELECT 1 FROM jsonb_array_elements(value) x WHERE x!='true'::jsonb);
   state:=jsonb_set(state,ARRAY[b->>'id'],jsonb_build_object('done',done,'checks',value));
  ELSIF b->>'type'='activity' THEN
   IF jsonb_typeof(value) IS DISTINCT FROM 'string' OR length(trim(value#>>'{}')) NOT BETWEEN 10 AND 6000 THEN RAISE EXCEPTION 'A resposta deve conter entre 10 e 6000 caracteres.'; END IF;
   state:=jsonb_set(state,ARRAY[b->>'id'],jsonb_build_object('done',true,'answer',value));
  ELSE
   IF value IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirme a conclusão deste conteúdo.'; END IF;
   state:=jsonb_set(state,ARRAY[b->>'id'],jsonb_build_object('done',true));
  END IF;
  done:=jsonb_array_length(m.contents)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(m.contents) x WHERE coalesce((x->>'required')::boolean,true) AND NOT coalesce((state->(x->>'id')->>'done')::boolean,false));
  UPDATE ava_progress SET version=m.version,blocks=state,completed_at=CASE WHEN done THEN coalesce(CASE WHEN p.version=m.version THEN p.completed_at END,now()) ELSE NULL END,updated_at=now() WHERE user_id=u AND module_id=m.id;
  RETURN jsonb_build_object('success',true,'score',score,'passed',CASE WHEN b->>'type'='quiz' THEN score>=coalesce((b->>'min_score')::integer,70) ELSE NULL END,'completed',done,'feedback',CASE WHEN b->>'type'='quiz' THEN (SELECT jsonb_agg(coalesce(feedback_question->>'feedback','')) FROM jsonb_array_elements(b->'questions') feedback_question) ELSE NULL END);
 ELSE RAISE EXCEPTION 'Operação AVA desconhecida.';
 END IF;
 RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION public.ava_media_allowed(p_file text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.ava_is_admin() OR (public.ava_has_access() AND EXISTS(SELECT 1 FROM ava_media_assets a LEFT JOIN ava_modules m ON m.id=a.module_id WHERE a.file_id=p_file AND ((a.track_id IS NOT NULL AND public.ava_track_allowed(a.track_id)) OR (m.status='published' AND public.ava_track_allowed(m.track_id) AND EXISTS(SELECT 1 FROM ava_enrollments e WHERE e.track_id=m.track_id AND e.user_id=auth.uid() AND e.status='active')))));
$$;
CREATE OR REPLACE FUNCTION public.ava_register_media(p_data jsonb,p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles p LEFT JOIN portal_user_access a ON a.user_id=p.id WHERE p.id=p_actor AND (p.role='admin' OR p.member_role='admin' OR (a.ava_status='active' AND a.ava_admin))) THEN RAISE EXCEPTION 'AVA_ADMIN_REQUIRED'; END IF;
 IF p_data->>'mime_type' NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN RAISE EXCEPTION 'Formato inválido.'; END IF;
 INSERT INTO ava_media_assets(file_id,module_id,track_id,name,mime_type,size,folder_id,uploaded_by) VALUES(p_data->>'file_id',nullif(p_data->>'module_id','')::uuid,nullif(p_data->>'track_id','')::uuid,p_data->>'name',p_data->>'mime_type',(p_data->>'size')::bigint,p_data->>'folder_id',p_actor);
 INSERT INTO ava_audit_logs(actor_id,action,entity_id) VALUES(p_actor,'upload_media',p_data->>'file_id');
 RETURN jsonb_build_object('success',true);
END $$;
-- Media registration is server-only: client cannot claim another private Drive file.
REVOKE ALL ON FUNCTION public.ava_register_media(jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ava_register_media(jsonb,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.ava_track_progress(uuid,uuid),public.ava_track_allowed(uuid),public.ava_safe_contents(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ava_read(text,uuid),public.ava_mutate(text,jsonb),public.ava_identity(),public.ava_media_allowed(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ava_read(text,uuid),public.ava_mutate(text,jsonb),public.ava_identity(),public.ava_media_allowed(text) TO authenticated;
REVOKE ALL ON FUNCTION public.ava_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ava_catalog() TO anon,authenticated,service_role;

-- Estrutura editorial real do PROJETO SUSTAIN; nenhum conteúdo fictício publicado.
INSERT INTO public.ava_tracks(id,slug,title,subtitle,description,position,status) VALUES('25ca2ec9-5726-4ee7-ac1a-df0f6231a606','sustain-1','Mundo FIRST','Universo FIRST, oportunidades e cultura','Introdução ao universo FIRST, às modalidades e à organização de equipes.',1,'draft') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('82eca341-6af1-4677-ade9-a136662d7465','25ca2ec9-5726-4ee7-ac1a-df0f6231a606','O que é FIRST','História da FIRST · Valores da FIRST · Core Values · Impacto no mundo',1,'draft','[{"id":"baae1c09-ee66-4935-ab6c-3f93bcfc7602","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- História da FIRST\n- Valores da FIRST\n- Core Values\n- Impacto no mundo","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('e0c398d5-6260-4fad-a60d-c32bef8c19e1','25ca2ec9-5726-4ee7-ac1a-df0f6231a606','Entendendo o FTC','Como funciona o FTC · Estrutura da competição · Temporada · Alianças · Pontuação · Premiações',2,'draft','[{"id":"6c7966c0-e89a-42b3-a865-c5ceec5ed6f2","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Como funciona o FTC\n- Estrutura da competição\n- Temporada\n- Alianças\n- Pontuação\n- Premiações","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('1a5f5153-8946-451f-a436-816d769383c4','25ca2ec9-5726-4ee7-ac1a-df0f6231a606','Temporadas FTC','Reveal · Game Manual · Estratégia · Cronograma ideal',3,'draft','[{"id":"ae941e25-fc2e-49f0-ae52-65d0dc020c59","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Reveal\n- Game Manual\n- Estratégia\n- Cronograma ideal","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('736dcc82-e8dd-403a-ad68-89861c6f431a','25ca2ec9-5726-4ee7-ac1a-df0f6231a606','Oportunidades da Robótica','Bolsas · Networking · Viagens · Universidades · Empresas · Carreira',4,'draft','[{"id":"fc2e3090-995e-45c2-a3ed-ade44b24223c","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Bolsas\n- Networking\n- Viagens\n- Universidades\n- Empresas\n- Carreira","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('d07b1ce9-d708-420e-adcc-8c9bb1a8fbf1','25ca2ec9-5726-4ee7-ac1a-df0f6231a606','Como criar uma equipe','Estrutura · Organização · Lideranças · Planejamento',5,'draft','[{"id":"fe8e66f0-9e19-4139-ac71-b0cba57467fb","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Estrutura\n- Organização\n- Lideranças\n- Planejamento","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_tracks(id,slug,title,subtitle,description,position,status) VALUES('451f5450-b214-40b7-a12e-f0f5a38daac3','sustain-2','AE — Administrativo & Estratégico','Gestão, marketing e impacto','Organização da equipe, comunicação, identidade visual, patrocínios e outreach.',2,'draft') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('6dd53aa3-f55c-422e-a858-4bf23712afae','451f5450-b214-40b7-a12e-f0f5a38daac3','Introdução ao AE','O que é AE · Importância dentro do FTC · Como AE impacta premiações',1,'draft','[{"id":"c3828e9a-8524-48f0-a621-754306a4992c","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- O que é AE\n- Importância dentro do FTC\n- Como AE impacta premiações","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('870f8b4d-1b4b-48c5-a063-5cb24782cfa9','451f5450-b214-40b7-a12e-f0f5a38daac3','Identidade Visual','Branding · Paleta de cores · Tipografia · Logos · Consistência visual',2,'draft','[{"id":"4acb96d2-8da2-4659-a99d-00087139bfa0","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Branding\n- Paleta de cores\n- Tipografia\n- Logos\n- Consistência visual","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('937aa71e-dd89-4752-a9ff-22fc32691963','451f5450-b214-40b7-a12e-f0f5a38daac3','Redes Sociais','Instagram para equipes · Planejamento de posts · Conteúdo estratégico · Reels · Cobertura de eventos',3,'draft','[{"id":"4f0c2606-f666-41a6-aba7-f53e55ee93c1","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Instagram para equipes\n- Planejamento de posts\n- Conteúdo estratégico\n- Reels\n- Cobertura de eventos","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('5f145cca-b5b1-4a02-aa1c-ce13428493c7','451f5450-b214-40b7-a12e-f0f5a38daac3','Design','Canva · Photoshop · Templates · Posts profissionais · Mídia visual',4,'draft','[{"id":"e1a38323-d778-4e7a-a26b-25c7a8047702","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Canva\n- Photoshop\n- Templates\n- Posts profissionais\n- Mídia visual","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('0a7bda1a-307c-4624-a41f-a56506504773','451f5450-b214-40b7-a12e-f0f5a38daac3','Patrocínio','Abordagem de empresas · Mídia kit · Contrapartidas · Apresentação profissional',5,'draft','[{"id":"83851480-9e1a-45c8-a803-ef3111a665be","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Abordagem de empresas\n- Mídia kit\n- Contrapartidas\n- Apresentação profissional","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('c43b0caa-49d5-4dba-ad48-bd2ecce8ea85','451f5450-b214-40b7-a12e-f0f5a38daac3','Outreach','Oficinas · Impacto social · Eventos · Organização de ações · Documentação de impacto',6,'draft','[{"id":"38ca92db-0023-48fc-a8b4-748e964bd30a","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Oficinas\n- Impacto social\n- Eventos\n- Organização de ações\n- Documentação de impacto","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('edefb653-7588-4344-acd3-737c24cd80d2','451f5450-b214-40b7-a12e-f0f5a38daac3','Gestão de Equipe','Organização interna · Reuniões · Cronogramas · Liderança · Planejamento anual',7,'draft','[{"id":"13bbb92a-307d-46f8-ac10-79dd388d42e1","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Organização interna\n- Reuniões\n- Cronogramas\n- Liderança\n- Planejamento anual","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_tracks(id,slug,title,subtitle,description,position,status) VALUES('7fc1a829-a99e-4fc8-a151-17da492cf42b','sustain-3','Engenharia','Do projeto à construção','Sistemas mecânicos, componentes, CAD e estratégia de construção do robô.',3,'draft') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('efa4d430-7f4a-49db-ade4-f85b83f701a4','7fc1a829-a99e-4fc8-a151-17da492cf42b','Introdução à Engenharia FTC','Estrutura do robô · Sistemas · Estratégia mecânica',1,'draft','[{"id":"0f52c274-531d-435d-abc7-81148e463335","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Estrutura do robô\n- Sistemas\n- Estratégia mecânica","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('232859e0-3a9c-4607-a95b-b2cfac89e4fb','7fc1a829-a99e-4fc8-a151-17da492cf42b','Peças e Componentes','Motores · Servos · Estruturas · Sensores',2,'draft','[{"id":"2f16513d-431c-4074-a22a-57691c07fcbd","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Motores\n- Servos\n- Estruturas\n- Sensores","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('de1dd02c-e296-455f-a3f9-e1da61544745','7fc1a829-a99e-4fc8-a151-17da492cf42b','Construção','Chassis · Intake · Lift · Hang · Sistemas comuns',3,'draft','[{"id":"d004e607-5a85-4923-a499-d846478eef33","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Chassis\n- Intake\n- Lift\n- Hang\n- Sistemas comuns","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('e7801c10-1004-41c2-a382-8012ae784133','7fc1a829-a99e-4fc8-a151-17da492cf42b','CAD','Introdução ao CAD · Onshape/Fusion · Modelagem · Organização de projeto',4,'draft','[{"id":"93fa5380-0a09-4477-abe9-19a15b53922d","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Introdução ao CAD\n- Onshape/Fusion\n- Modelagem\n- Organização de projeto","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('69b0715a-6957-4ff4-a4fe-74aedd1417f5','7fc1a829-a99e-4fc8-a151-17da492cf42b','Estratégia Mecânica','Análise do jogo · Eficiência · Ciclos · Design estratégico',5,'draft','[{"id":"3aedc64d-e9fb-4ffc-ab95-54afe37e754d","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Análise do jogo\n- Eficiência\n- Ciclos\n- Design estratégico","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_tracks(id,slug,title,subtitle,description,position,status) VALUES('ce0dc2be-149e-43c8-a2c5-f37b19856a38','sustain-4','Programação','Fundamentos e autonomia','Programação do robô com FTC SDK/Java, sensores e controle.',4,'draft') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('bfbc8f31-51ad-4a2b-a52a-edc8540c6086','ce0dc2be-149e-43c8-a2c5-f37b19856a38','Introdução à Programação FTC','SDK · Android Studio · Estrutura do código',1,'draft','[{"id":"e70152ae-5f3b-4f3a-a4e2-669be6f7ea1e","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- SDK\n- Android Studio\n- Estrutura do código","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('23401ef5-2ff7-4118-ac5d-8c8484f5d0ea','ce0dc2be-149e-43c8-a2c5-f37b19856a38','Java Básico','Variáveis · Loops · Funções · Classes',2,'draft','[{"id":"485bd03e-ba0b-45a0-aaf7-2d721ab0c457","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Variáveis\n- Loops\n- Funções\n- Classes","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('bd5a975e-cbdd-47a1-ad0f-019d5c8f45a5','ce0dc2be-149e-43c8-a2c5-f37b19856a38','TeleOp','Movimentação · Controles · Servos · Motores',3,'draft','[{"id":"d5880b88-c24e-423a-ae6f-762faafa243b","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Movimentação\n- Controles\n- Servos\n- Motores","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('5ca22b93-0c42-4fb8-a23d-124862f8f6c2','ce0dc2be-149e-43c8-a2c5-f37b19856a38','Sensores','Color sensor · Distance sensor · IMU',4,'draft','[{"id":"ddddc5f6-5152-4543-ad07-8cf515d6e566","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Color sensor\n- Distance sensor\n- IMU","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('4fd58123-0445-4364-a170-d77a15ed4e6d','ce0dc2be-149e-43c8-a2c5-f37b19856a38','Autônomo','Encoders · Trajetórias · RoadRunner · PID',5,'draft','[{"id":"d0077d93-5dcc-470e-aa64-9aff780ca003","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Encoders\n- Trajetórias\n- RoadRunner\n- PID","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('f1c56afb-c8ed-4e84-ae2a-0b13e930eb67','ce0dc2be-149e-43c8-a2c5-f37b19856a38','Código Avançado','Organização · Subsystems · FSM · Otimização',6,'draft','[{"id":"1217db5d-8d30-426d-a1f6-92eb71c7d6ae","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Organização\n- Subsystems\n- FSM\n- Otimização","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_tracks(id,slug,title,subtitle,description,position,status) VALUES('1d6801fb-3059-47f3-a0ee-754d8618e869','sustain-5','Drive Team','Estratégia e trabalho em quadra','Preparação e desenvolvimento da equipe que opera o robô.',5,'draft') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('ca6b51b4-1ef2-4860-a271-a73782e47717','1d6801fb-3059-47f3-a0ee-754d8618e869','Função de cada integrante','Responsabilidades do time de quadra',1,'draft','[{"id":"6866878c-d10a-4885-a514-86df838a170b","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Responsabilidades do time de quadra","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('fc54acf9-39a1-4c55-ac11-41fb63eb7016','1d6801fb-3059-47f3-a0ee-754d8618e869','Comunicação','Comunicação da equipe durante a partida',2,'draft','[{"id":"5cbb1758-f67a-46e7-a618-4432c6847d53","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Comunicação da equipe durante a partida","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('a3450da2-11cb-44fc-a275-cccf7168bc35','1d6801fb-3059-47f3-a0ee-754d8618e869','Estratégia','Planejamento de partida',3,'draft','[{"id":"95a26e94-fac9-4629-af43-746b1e5f1e75","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Planejamento de partida","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('9e2fd95e-b2f3-45ec-aba6-2c702a73e67a','1d6801fb-3059-47f3-a0ee-754d8618e869','Treinamento','Rotina de treinamento',4,'draft','[{"id":"ae7b3571-2d91-4177-a8e6-ba91441537a4","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Rotina de treinamento","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('2ae13e74-8e8b-49fa-a880-e0afc0e9c5b5','1d6801fb-3059-47f3-a0ee-754d8618e869','Controle emocional','Preparação para situações de competição',5,'draft','[{"id":"f9e6efeb-8191-442d-a5d8-17b3c9203f83","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Preparação para situações de competição","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('62f79f72-6593-4c0b-a414-fe5e43ad6c28','1d6801fb-3059-47f3-a0ee-754d8618e869','Simulação de partida','Treinamento com simulações de partida',6,'draft','[{"id":"db4ecb2a-cef3-4298-a0a1-f2fca5f715ee","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Treinamento com simulações de partida","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_tracks(id,slug,title,subtitle,description,position,status) VALUES('1316598f-dc20-4a06-acb8-d59cba573b48','sustain-6','Documentação & Premiações','Registros e comunicação do projeto','Documentação do desenvolvimento, apresentação e preparação para entrevistas.',6,'draft') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('0aa65542-37c3-4a47-a7f8-b0fbcb0e95df','1316598f-dc20-4a06-acb8-d59cba573b48','Engineering Notebook','Organização do Engineering Notebook',1,'draft','[{"id":"3f47d0cf-7a1a-43a8-a3e6-161c86ed75e1","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Organização do Engineering Notebook","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('410b7e75-4995-43e6-abfb-c3cff2eb2fa6','1316598f-dc20-4a06-acb8-d59cba573b48','Portfólio','Estruturação do portfólio',2,'draft','[{"id":"7b920817-3236-4a34-a6d3-ba8a0161c27f","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Estruturação do portfólio","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('1c575997-7880-4366-a879-b8f40cf6bf32','1316598f-dc20-4a06-acb8-d59cba573b48','Entrevista','Preparação para entrevistas',3,'draft','[{"id":"2ac06e03-067f-4329-a836-ae0738c29938","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Preparação para entrevistas","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('d4ee1654-a2c4-4b1e-aa1b-f4248d0bb00a','1316598f-dc20-4a06-acb8-d59cba573b48','Como apresentar','Apresentação do trabalho da equipe',4,'draft','[{"id":"a925df8e-0001-4bd5-a248-5c6cea6a6a76","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Apresentação do trabalho da equipe","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('42e14c84-33ea-4ea3-a826-dd28c9f6ad41','1316598f-dc20-4a06-acb8-d59cba573b48','Juízes','Interação com os juízes',5,'draft','[{"id":"ce144837-567f-473c-a641-6f36fb6a5855","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Interação com os juízes","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.ava_modules(id,track_id,title,summary,position,status,contents) VALUES('69ec5eaa-4ce2-41cc-a581-04f9a51929f1','1316598f-dc20-4a06-acb8-d59cba573b48','Premiações FTC','Organização da estratégia de premiações',6,'draft','[{"id":"c829debd-8e87-438a-a2c0-7ff51208291a","type":"text","title":"Roteiro do módulo","text":"## Objetivos de aprendizagem\n\n- Organização da estratégia de premiações","required":true}]'::jsonb) ON CONFLICT(id) DO NOTHING;

COMMIT;
