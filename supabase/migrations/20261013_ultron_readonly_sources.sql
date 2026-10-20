BEGIN;
-- Safe paginated overload; the legacy one-argument RPC remains for existing form consumers.
-- No data copy, index, new member database, write capability or SECURITY DEFINER bypass.
CREATE FUNCTION public.portal_work_sources(p_query text, p_source text, p_after uuid,
 p_limit integer, p_ids uuid[] DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE title_expr text; text_expr text; date_expr text; area_expr text:='NULL::text';
 program_expr text:='NULL::text'; kind_expr text; status_expr text:='NULL::text'; archived_expr text:='false';
 docs jsonb; actor uuid:=auth.uid(); more boolean; cursor_id text;
BEGIN
 IF actor IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'ULTRON_ACCESS_DENIED'; END IF;
 IF p_query IS NULL OR length(p_query)>160 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR (p_ids IS NOT NULL AND cardinality(p_ids)>100) THEN RAISE EXCEPTION 'ULTRON_INVALID_QUERY'; END IF;
 CASE p_source
 WHEN 'portal_work_items' THEN
  title_expr:='r.title'; text_expr:='r.description'; date_expr:='coalesce(r.occurred_on::text,r.updated_at::text)';
  area_expr:='r.area'; program_expr:='r.program'; kind_expr:='r.kind'; status_expr:='r.status'; archived_expr:='r.archived';
 WHEN 'priorities' THEN
  title_expr:='r.title'; text_expr:='r.description'; date_expr:='r.updated_at::text';
  area_expr:='r.area'; program_expr:='r.category'; status_expr:='r.status';
 WHEN 'fll_tasks' THEN
  title_expr:='r.title'; text_expr:='NULL::text'; date_expr:='coalesce(r.deadline::text,r.updated_at::text)';
  area_expr:='r.area'; program_expr:='''FLL''::text'; status_expr:='r.status';
 WHEN 'projects' THEN
  title_expr:='r.title'; text_expr:='r.description'; date_expr:='r.updated_at::text'; status_expr:='r.status';
 WHEN 'seasons' THEN
  -- description can contain a legacy JSON blob with unreviewed notes/configuration.
  title_expr:='concat_ws('' — '',r.year::text,r.theme)'; text_expr:='NULL::text'; date_expr:='r.updated_at::text';
 WHEN 'team_knowledge_bases' THEN
  title_expr:='r.team_name';
  -- Explicit institutional fields; exclude current_members, extra_info and history blobs.
  text_expr:='concat_ws('' · '',r.school_org,r.city_state,r.founded_date,r.team_number_frc,r.team_number_ftc)';
  date_expr:='r.updated_at::text';
 ELSE RAISE EXCEPTION 'ULTRON_SOURCE_DENIED';
 END CASE;
 IF kind_expr IS NULL THEN kind_expr:=quote_literal(p_source)||'::text'; END IF;
 EXECUTE format($sql$
  WITH projected AS (
   SELECT r.id, jsonb_build_object('source',$1,'id',r.id,'kind',%s,
    'title',%s,'text',%s,'date',%s,'area',%s,'program',%s,'status',%s,'archived',%s,'untrusted',true) AS doc
   FROM public.%I r WHERE ($2 IS NULL OR r.id>$2) AND ($5 IS NULL OR r.id=ANY($5))
  ), matched AS (
   SELECT id,doc FROM projected WHERE $3='' OR strpos(lower(coalesce(doc->>'title','')||' '||coalesce(doc->>'text','')),lower($3))>0
   ORDER BY id LIMIT $4+1
  ) SELECT coalesce(jsonb_agg(doc ORDER BY id),'[]'::jsonb) FROM matched
 $sql$,kind_expr,title_expr,text_expr,date_expr,area_expr,program_expr,status_expr,archived_expr,p_source)
 INTO docs USING p_source,p_after,btrim(p_query),p_limit,p_ids;
 more:=jsonb_array_length(docs)>p_limit;
 IF more THEN docs:=docs-(jsonb_array_length(docs)-1); END IF;
 cursor_id:=CASE WHEN jsonb_array_length(docs)>0 THEN docs->(jsonb_array_length(docs)-1)->>'id' ELSE NULL END;
 -- Retrieval searches authorized fields, before trimming result text. Never returns full rows.
 SELECT coalesce(jsonb_agg(value || jsonb_build_object(
  'title',left(coalesce(value->>'title',''),200),
  'text',left(coalesce(value->>'text',''),2000),
  'truncated',length(coalesce(value->>'text',''))>2000) ORDER BY ordinal),'[]'::jsonb)
 INTO docs FROM jsonb_array_elements(docs) WITH ORDINALITY AS entries(value,ordinal);
 IF auth.uid() IS DISTINCT FROM actor OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'ULTRON_ACCESS_DENIED'; END IF;
 RETURN jsonb_build_object('actor_id',actor,'items',docs,'has_more',more,'next_cursor',cursor_id);
END $$;
REVOKE ALL ON FUNCTION public.portal_work_sources(text,text,uuid,integer,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_work_sources(text,text,uuid,integer,uuid[]) TO authenticated;
COMMIT;
