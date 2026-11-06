BEGIN;
-- Private checklist cards are intentionally separate from shared operational tasks:
-- no dependency graph, team-progress/PDI credit or shared ULTRON source is created.
CREATE TABLE public.portal_demand_cards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 board text NOT NULL CHECK (board IN ('personal','FRC','FTC','FLL','OBR')),
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
 items jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(items)='array' AND jsonb_array_length(items)<=80),
 archived boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 0 CHECK (revision>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT
);
CREATE INDEX portal_demand_board_idx ON public.portal_demand_cards(board,archived,id);
CREATE INDEX portal_demand_owner_idx ON public.portal_demand_cards(owner_id,archived,id) WHERE board='personal';
INSERT INTO public.portal_page_visibility(page_key) VALUES('InternalDemands');

CREATE FUNCTION public.portal_demand_access(p_board text,p_owner uuid,p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(auth.uid() IS NOT NULL AND public.portal_internal_access()
 AND (public.is_admin() OR EXISTS(SELECT 1 FROM public.portal_page_visibility WHERE page_key='InternalDemands' AND visible))
 AND CASE WHEN p_board='personal' THEN p_owner=auth.uid()
 WHEN p_board IN ('FRC','FTC','FLL','OBR') THEN public.portal_has_modality(p_board)
   AND (NOT p_write OR public.portal_can_edit()) ELSE false END,false);
$$;
ALTER TABLE public.portal_demand_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_demand_cards FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.portal_demand_cards TO authenticated;
CREATE POLICY demand_read ON public.portal_demand_cards FOR SELECT TO authenticated
 USING(public.portal_demand_access(board,owner_id,false));
-- No client INSERT/UPDATE/DELETE grants. All writes validate identity and revision below.

CREATE FUNCTION public.portal_demands_read(p_board text DEFAULT 'personal',p_archived boolean DEFAULT false,p_after uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE cards jsonb; more boolean; boards jsonb; actor uuid:=auth.uid();
BEGIN
 IF p_archived IS NULL OR NOT public.portal_demand_access(p_board,actor,false) THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 SELECT jsonb_agg(b ORDER BY ordinal) INTO boards FROM unnest(ARRAY['personal','FRC','FTC','FLL','OBR']) WITH ORDINALITY x(b,ordinal)
 WHERE public.portal_demand_access(b,actor,false);
 WITH page AS (SELECT * FROM public.portal_demand_cards WHERE board=p_board AND archived=p_archived AND (p_after IS NULL OR id>p_after) ORDER BY id LIMIT 51),
 numbered AS (SELECT *,row_number() OVER(ORDER BY id) rn FROM page)
 SELECT coalesce(jsonb_agg(to_jsonb(n)-'rn' ORDER BY id) FILTER(WHERE rn<=50),'[]'),count(*)>50 INTO cards,more FROM numbered n;
 RETURN jsonb_build_object('actor',actor,'board',p_board,'boards',boards,'can_edit',public.portal_demand_access(p_board,actor,true),
 'items',cards,'has_more',more,'next_cursor',CASE WHEN more THEN cards->49->>'id' ELSE NULL END);
END $$;

CREATE FUNCTION public.portal_demands_write(p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=auth.uid(); card public.portal_demand_cards; item jsonb; ids text[]:='{}';
 card_id uuid; item_id uuid; desired_title text; desired_items jsonb; new_items jsonb; changed boolean; inserted boolean;
BEGIN
 IF actor IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('create','edit','toggle','archive') OR p_data IS NULL OR jsonb_typeof(p_data)<>'object'
  OR octet_length(p_data::text)>60000 THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_data) k WHERE NOT k=ANY(CASE p_action
  WHEN 'create' THEN ARRAY['id','board','title','items'] WHEN 'edit' THEN ARRAY['id','revision','title','items']
  WHEN 'toggle' THEN ARRAY['id','revision','item','done'] ELSE ARRAY['id','revision','archived'] END)) THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 card_id:=(p_data->>'id')::uuid;
 IF card_id IS NULL THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 IF p_action IN ('create','edit') THEN
  desired_title:=btrim(p_data->>'title'); desired_items:=p_data->'items';
  IF desired_title IS NULL OR length(desired_title) NOT BETWEEN 1 AND 160 OR desired_items IS NULL
   OR jsonb_typeof(desired_items)<>'array' OR jsonb_array_length(desired_items)>80 THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(desired_items) LOOP
   IF jsonb_typeof(item)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>3
    OR NOT (item ?& ARRAY['id','text','done']) OR jsonb_typeof(item->'text')<>'string'
    OR length(btrim(item->>'text')) NOT BETWEEN 1 AND 500 OR jsonb_typeof(item->'done')<>'boolean'
    OR item->>'id' IS NULL OR (item->>'id')=ANY(ids) THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
   item_id:=(item->>'id')::uuid;
   IF item_id::text<>item->>'id' THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
   ids:=array_append(ids,item->>'id');
  END LOOP;
 END IF;
 IF p_action='create' THEN
  IF NOT public.portal_demand_access(p_data->>'board',actor,true) THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO public.portal_demand_cards(id,board,owner_id,title,items,updated_by)
   VALUES(card_id,p_data->>'board',actor,desired_title,desired_items,actor) ON CONFLICT(id) DO NOTHING RETURNING * INTO card;
  inserted:=FOUND;
  IF NOT inserted THEN
   SELECT * INTO card FROM public.portal_demand_cards WHERE id=card_id;
   IF card.owner_id IS DISTINCT FROM actor OR card.board IS DISTINCT FROM p_data->>'board'
    OR card.title IS DISTINCT FROM desired_title OR card.items IS DISTINCT FROM desired_items OR card.archived THEN RAISE EXCEPTION 'DEMAND_CONFLICT'; END IF;
  END IF;
 ELSE
  SELECT * INTO card FROM public.portal_demand_cards WHERE id=card_id FOR UPDATE;
  IF NOT FOUND OR NOT public.portal_demand_access(card.board,card.owner_id,true) THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_data->'revision') IS DISTINCT FROM 'number' OR card.revision IS DISTINCT FROM (p_data->>'revision')::integer THEN RAISE EXCEPTION 'DEMAND_CONFLICT'; END IF;
  IF p_action='edit' THEN
   IF card.archived THEN RAISE EXCEPTION 'DEMAND_ARCHIVED'; END IF;
   card.title:=desired_title;card.items:=desired_items;
  ELSIF p_action='toggle' THEN
   IF card.archived THEN RAISE EXCEPTION 'DEMAND_ARCHIVED'; END IF;
   IF jsonb_typeof(p_data->'done') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
   item_id:=(p_data->>'item')::uuid;
   SELECT coalesce(jsonb_agg(CASE WHEN value->>'id'=item_id::text THEN jsonb_set(value,'{done}',p_data->'done') ELSE value END ORDER BY ordinal),'[]'),
    coalesce(bool_or(value->>'id'=item_id::text),false) INTO new_items,changed FROM jsonb_array_elements(card.items) WITH ORDINALITY x(value,ordinal);
   IF NOT changed THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
   card.items:=new_items;
  ELSE
   IF jsonb_typeof(p_data->'archived') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
   card.archived:=(p_data->>'archived')::boolean;
  END IF;
  UPDATE public.portal_demand_cards SET title=card.title,items=card.items,archived=card.archived,revision=revision+1,
   updated_at=clock_timestamp(),updated_by=actor WHERE id=card.id RETURNING * INTO card;
 END IF;
 RETURN jsonb_build_object('actor',actor,'card',to_jsonb(card));
END $$;
REVOKE ALL ON FUNCTION public.portal_demand_access(text,uuid,boolean),public.portal_demands_read(text,boolean,uuid),public.portal_demands_write(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_demand_access(text,uuid,boolean),public.portal_demands_read(text,boolean,uuid),public.portal_demands_write(text,jsonb) TO authenticated;
COMMIT;
