BEGIN;
-- Additive operational layer. Existing tables, grants, OAuth and Drive metadata are unchanged.
CREATE TABLE IF NOT EXISTS public.portal_work_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('goal','task','activity','meeting')),
 title text NOT NULL CHECK(char_length(trim(title)) BETWEEN 3 AND 200),
 description text NOT NULL DEFAULT '' CHECK(char_length(description)<=12000),
 program text NOT NULL DEFAULT 'Geral' CHECK(program IN ('Geral','FLL','FTC','FRC','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2')),
 area text NOT NULL DEFAULT 'Geral' CHECK(char_length(area) BETWEEN 1 AND 100),
 season text NOT NULL DEFAULT '' CHECK(char_length(season)<=120),
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','blocked','done','cancelled')),
 priority text NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
 progress integer NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
 responsible_id uuid REFERENCES public.profiles(id), due_on date,
 goal_id uuid REFERENCES public.portal_work_items(id), task_id uuid REFERENCES public.portal_work_items(id),
 depends_on uuid[] NOT NULL DEFAULT '{}', blocker text NOT NULL DEFAULT '' CHECK(char_length(blocker)<=1500),
 acceptance text NOT NULL DEFAULT '' CHECK(char_length(acceptance)<=2000),
 occurred_on date, is_historical boolean NOT NULL DEFAULT false,
 origin text NOT NULL DEFAULT '' CHECK(char_length(origin)<=1500),
 participants jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(participants)='array'),
 evidence jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(evidence)='array'),
 legacy_refs jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(legacy_refs)='array'),
 author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1, archived boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS portal_work_due_idx ON public.portal_work_items(due_on) WHERE NOT archived;
CREATE INDEX IF NOT EXISTS portal_work_goal_idx ON public.portal_work_items(goal_id);
CREATE INDEX IF NOT EXISTS portal_work_task_idx ON public.portal_work_items(task_id);
CREATE TABLE IF NOT EXISTS public.portal_work_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 item_id uuid NOT NULL REFERENCES public.portal_work_items(id), actor_id uuid NOT NULL REFERENCES public.profiles(id),
 changed_at timestamptz NOT NULL DEFAULT now(), action text NOT NULL, before_data jsonb, after_data jsonb NOT NULL
);
ALTER TABLE public.portal_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_work_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_work_items,public.portal_work_audit FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.portal_work_items TO authenticated;
GRANT SELECT ON public.portal_work_audit TO authenticated;
CREATE POLICY work_read ON public.portal_work_items FOR SELECT TO authenticated USING(public.portal_internal_access());
CREATE POLICY work_insert ON public.portal_work_items FOR INSERT TO authenticated WITH CHECK(public.portal_can_edit() AND author_id=auth.uid());
CREATE POLICY work_update ON public.portal_work_items FOR UPDATE TO authenticated USING(public.portal_can_edit()) WITH CHECK(public.portal_can_edit());
CREATE POLICY work_audit_read ON public.portal_work_audit FOR SELECT TO authenticated USING(public.is_admin());

CREATE OR REPLACE FUNCTION public.portal_work_member(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM profiles p LEFT JOIN portal_user_access a ON a.user_id=p.id WHERE p.id=p_user AND
 (p.role='admin' OR p.member_role='admin' OR (p.status='approved' AND coalesce(a.access_level,CASE WHEN coalesce(a.portal_internal,true) THEN 'trainee' ELSE 'student' END) IN ('trainee','member','leader'))));
$$;
REVOKE ALL ON FUNCTION public.portal_work_member(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.portal_work_roster() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.portal_internal_access() THEN RAISE EXCEPTION 'Área Interna requerida.'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'full_name',full_name) ORDER BY full_name),'[]') FROM profiles WHERE public.portal_work_member(id));
END $$;
REVOKE ALL ON FUNCTION public.portal_work_roster() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_work_roster() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_work_validate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE entry jsonb; ids uuid[]:='{}'; member_id uuid; ref_id uuid; ref_kind text; present boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_can_edit() THEN RAISE EXCEPTION 'Edição restrita a membros integrados e líderes.'; END IF;
 -- Serialize dependency graph changes so concurrent writes cannot introduce cycles.
 PERFORM pg_advisory_xact_lock(17730,10343);
 IF TG_OP='INSERT' THEN NEW.author_id:=auth.uid();NEW.created_at:=now();NEW.version:=1;
 ELSE
  IF NEW.author_id!=OLD.author_id OR NEW.created_at!=OLD.created_at OR NEW.kind!=OLD.kind OR NEW.id!=OLD.id THEN RAISE EXCEPTION 'Autor, tipo e origem da criação são imutáveis.'; END IF;
  NEW.version:=OLD.version+1;
 END IF;
 NEW.updated_at:=now();
 IF NEW.responsible_id IS NOT NULL AND NOT public.portal_work_member(NEW.responsible_id) AND NOT (TG_OP='UPDATE' AND NEW.responsible_id IS NOT DISTINCT FROM OLD.responsible_id) THEN RAISE EXCEPTION 'Responsável deve ser integrante autorizado.'; END IF;
 IF NEW.goal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM portal_work_items WHERE id=NEW.goal_id AND kind='goal' AND id!=NEW.id) THEN RAISE EXCEPTION 'Meta vinculada inválida.'; END IF;
 IF NEW.task_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM portal_work_items WHERE id=NEW.task_id AND kind='task' AND id!=NEW.id) THEN RAISE EXCEPTION 'Tarefa vinculada inválida.'; END IF;
 IF NEW.kind='goal' AND (NEW.goal_id IS NOT NULL OR NEW.task_id IS NOT NULL) THEN RAISE EXCEPTION 'Meta não pode ser filha de tarefa ou meta.'; END IF;
 IF NEW.kind='task' AND NEW.task_id IS NOT NULL THEN RAISE EXCEPTION 'Tarefa deve se vincular a uma meta.'; END IF;
 IF NEW.kind NOT IN ('activity','meeting') AND (NEW.is_historical OR NEW.occurred_on IS NOT NULL OR jsonb_array_length(NEW.participants)>0) THEN RAISE EXCEPTION 'Histórico e participantes pertencem aos registros coletivos.'; END IF;
 IF NEW.kind IN ('activity','meeting') AND NOT NEW.is_historical AND NEW.occurred_on IS NULL THEN RAISE EXCEPTION 'Registro atual exige data da atividade.'; END IF;
 IF NEW.occurred_on>current_date THEN RAISE EXCEPTION 'Data de atividade não pode estar no futuro.'; END IF;
 IF NEW.kind!='task' AND cardinality(NEW.depends_on)>0 THEN RAISE EXCEPTION 'Somente tarefas têm dependências.'; END IF;
 IF cardinality(NEW.depends_on)>30 OR cardinality(NEW.depends_on)!=(SELECT count(DISTINCT d) FROM unnest(NEW.depends_on) d) THEN RAISE EXCEPTION 'Dependências repetidas ou em excesso.'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(NEW.depends_on) d WHERE d=NEW.id OR NOT EXISTS(SELECT 1 FROM portal_work_items WHERE id=d AND kind='task')) THEN RAISE EXCEPTION 'Dependência inválida.'; END IF;
 IF EXISTS(WITH RECURSIVE chain(id,path) AS (
  SELECT d,ARRAY[d] FROM unnest(NEW.depends_on) d UNION ALL
  SELECT d,c.path||d FROM chain c JOIN portal_work_items t ON t.id=c.id CROSS JOIN unnest(t.depends_on) d WHERE NOT d=ANY(c.path)
 ) SELECT 1 FROM chain WHERE id=NEW.id) THEN RAISE EXCEPTION 'Dependências não podem formar ciclos.'; END IF;
 IF NEW.kind='task' AND NEW.status='done' AND EXISTS(SELECT 1 FROM portal_work_items WHERE id=ANY(NEW.depends_on) AND status!='done') THEN RAISE EXCEPTION 'Conclua as dependências antes de concluir a tarefa.'; END IF;
 IF TG_OP='UPDATE' AND OLD.status='done' AND NEW.status!='done' AND EXISTS(SELECT 1 FROM portal_work_items WHERE NEW.id=ANY(depends_on) AND status='done' AND NOT archived) THEN RAISE EXCEPTION 'Reabra primeiro as tarefas concluídas que dependem desta.'; END IF;
 IF NEW.kind='task' AND NEW.status='blocked' AND char_length(trim(NEW.blocker))<3 THEN RAISE EXCEPTION 'Informe o motivo do bloqueio.'; END IF;
 IF NEW.status='done' THEN NEW.progress:=100; END IF;
 IF jsonb_array_length(NEW.participants)>80 OR jsonb_array_length(NEW.evidence)>20 OR jsonb_array_length(NEW.legacy_refs)>20 THEN RAISE EXCEPTION 'Limite de vínculos excedido.'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(NEW.participants) LOOP
  member_id:=(entry->>'user_id')::uuid;
  IF char_length(coalesce(entry->>'contribution',''))>2000 OR char_length(coalesce(entry->>'name',''))>150 THEN RAISE EXCEPTION 'Contribuição ou nome excede o limite.'; END IF;
  IF member_id IS NULL THEN
   IF NOT NEW.is_historical OR char_length(trim(coalesce(entry->>'name','')))<3 THEN RAISE EXCEPTION 'Participante sem cadastro somente em registro histórico, com nome informado.'; END IF;
  ELSE
   IF (NOT public.portal_work_member(member_id) AND NOT (TG_OP='UPDATE' AND OLD.participants @> jsonb_build_array(jsonb_build_object('user_id',member_id)))) OR member_id=ANY(ids) THEN RAISE EXCEPTION 'Participante inválido ou repetido.'; END IF;
   ids:=ids||member_id;
  END IF;
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(NEW.evidence) LOOP
  IF coalesce(entry->>'url','')!~ '^https://(drive\.google\.com|docs\.google\.com|www\.youtube\.com|youtube\.com|youtu\.be)/[^[:space:]]+$' OR char_length(entry->>'url')>1800 OR char_length(coalesce(entry->>'label',''))>200 THEN RAISE EXCEPTION 'Use links HTTPS do Google Drive, Documentos ou YouTube.'; END IF;
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(NEW.legacy_refs) LOOP
  ref_kind:=entry->>'kind';ref_id:=(entry->>'id')::uuid;
  IF ref_kind IS NULL OR ref_kind NOT IN ('daily_logs','team_logs','meeting_notes','priorities','fll_tasks') OR ref_id IS NULL THEN RAISE EXCEPTION 'Referência existente inválida.'; END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1)',ref_kind) INTO present USING ref_id;
  IF NOT present THEN RAISE EXCEPTION 'Referência existente não encontrada.'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.portal_work_validate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER portal_work_validate BEFORE INSERT OR UPDATE ON public.portal_work_items FOR EACH ROW EXECUTE FUNCTION public.portal_work_validate();
CREATE OR REPLACE FUNCTION public.portal_work_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO portal_work_audit(item_id,actor_id,action,before_data,after_data)
 VALUES(NEW.id,auth.uid(),CASE WHEN TG_OP='INSERT' THEN 'create' WHEN NEW.archived AND NOT OLD.archived THEN 'archive' WHEN NOT NEW.archived AND OLD.archived THEN 'restore' ELSE 'update' END,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.portal_work_log() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER portal_work_log AFTER INSERT OR UPDATE ON public.portal_work_items FOR EACH ROW EXECUTE FUNCTION public.portal_work_log();

-- Runs as the caller: all legacy queries continue to respect their existing RLS policies.
CREATE OR REPLACE FUNCTION public.portal_work_sources(p_query text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE tab text; results jsonb:='[]'; rows jsonb;
BEGIN
 IF NOT public.portal_internal_access() THEN RAISE EXCEPTION 'Área Interna requerida.'; END IF;
 IF char_length(p_query)>160 THEN RAISE EXCEPTION 'Busca muito longa.'; END IF;
 FOREACH tab IN ARRAY ARRAY['daily_logs','team_logs','meeting_notes','priorities','fll_tasks'] LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''kind'',$1,''id'',r.id,''data'',to_jsonb(r))),''[]'') FROM (SELECT * FROM public.%I WHERE $2='''' OR to_jsonb(%I)::text ILIKE ''%%''||$2||''%%'' ORDER BY created_at DESC LIMIT 100) r',tab,tab) INTO rows USING tab,p_query;
  results:=results||rows;
 END LOOP;
 RETURN results;
END $$;
REVOKE ALL ON FUNCTION public.portal_work_sources(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_work_sources(text) TO authenticated;
COMMIT;
