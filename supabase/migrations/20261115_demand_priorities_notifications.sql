BEGIN;
-- Add metadata without rewriting existing checklist items or their history.
ALTER TABLE public.portal_demand_cards ADD COLUMN item_meta jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(item_meta)='object');
CREATE TABLE public.portal_demand_features(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),contact_required boolean NOT NULL DEFAULT false);
INSERT INTO public.portal_demand_features VALUES(true,false);
CREATE TABLE public.portal_demand_contacts(
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
 phone text CHECK(phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$'), no_phone boolean NOT NULL DEFAULT false,
 whatsapp_opt_in boolean NOT NULL DEFAULT false,email_opt_in boolean NOT NULL DEFAULT false,
 completed boolean NOT NULL DEFAULT false,consent_version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT whatsapp_opt_in OR (phone IS NOT NULL AND NOT no_phone)),CHECK(NOT no_phone OR phone IS NULL)
);
CREATE TABLE public.portal_demand_notifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),card_id uuid NOT NULL REFERENCES public.portal_demand_cards(id) ON DELETE RESTRICT,
 item_id uuid NOT NULL,recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 card_revision integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz,
 UNIQUE(card_id,item_id,recipient_id,card_revision)
);
CREATE INDEX demand_notice_recipient ON public.portal_demand_notifications(recipient_id,created_at DESC,id DESC);
-- No sender/worker is enabled. This outbox contains references, not phones/emails/content.
CREATE TABLE public.portal_demand_delivery_outbox(
 notification_id uuid NOT NULL REFERENCES public.portal_demand_notifications(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK(channel IN ('email','whatsapp')),status text NOT NULL DEFAULT 'not_configured' CHECK(status='not_configured'),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(notification_id,channel)
);
ALTER TABLE public.portal_demand_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_demand_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_demand_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_demand_delivery_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_demand_contacts,public.portal_demand_notifications,public.portal_demand_features,public.portal_demand_delivery_outbox FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.portal_demand_recipient(p_user uuid,p_board text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT CASE WHEN p_board='personal' THEN p_user=auth.uid() AND public.portal_internal_access()
 WHEN p_board IN ('FRC','FTC','FLL','OBR') THEN EXISTS(
 SELECT 1 FROM public.profiles p LEFT JOIN public.portal_user_access a ON a.user_id=p.id WHERE p.id=p_user AND
 ((p.role='admin' OR p.member_role='admin') OR (p.status='approved' AND
 coalesce(a.access_level,CASE WHEN coalesce(a.portal_internal,true) THEN CASE WHEN p.member_role='member' OR p.role='mentor' THEN 'member' ELSE 'trainee' END ELSE 'public' END) IN ('trainee','member','leader','technician')
 AND (a.access_level IN ('leader','technician') OR p_board=ANY(a.allowed_modalities)
 OR NOT (SELECT modality_access_enabled FROM public.member_registration_settings WHERE singleton)))))
 ELSE false END;
$$;

CREATE FUNCTION public.portal_demand_notice_visible(p_card uuid,p_item uuid,p_recipient uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT auth.uid()=p_recipient AND public.portal_internal_access() AND EXISTS(SELECT 1 FROM public.portal_demand_cards c WHERE c.id=p_card AND c.board<>'personal' AND NOT c.archived
 AND public.portal_demand_access(c.board,c.owner_id,false) AND c.item_meta->p_item::text->>'assignee_id'=auth.uid()::text
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(c.items) i WHERE i->>'id'=p_item::text));
$$;
GRANT SELECT ON public.portal_demand_notifications TO authenticated;
CREATE POLICY demand_notice_read ON public.portal_demand_notifications FOR SELECT TO authenticated
 USING(public.portal_demand_notice_visible(card_id,item_id,recipient_id));

-- Keep the strict, existing writer for base items, permission checks, CAS and idempotence.
ALTER FUNCTION public.portal_demands_write(text,jsonb) RENAME TO portal_demands_write_before_assignments;
REVOKE ALL ON FUNCTION public.portal_demands_write_before_assignments(text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.portal_demands_write(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; c public.portal_demand_cards; previous jsonb:='{}'; supplied jsonb; normalized jsonb:='{}'; i jsonb; m jsonb; target uuid; notice uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>90000 THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 SELECT item_meta INTO previous FROM public.portal_demand_cards WHERE id=(p_data->>'id')::uuid FOR UPDATE;
 previous:=coalesce(previous,'{}');
 IF p_data ? 'item_meta' AND p_action NOT IN ('create','edit') THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 supplied:=CASE WHEN p_data ? 'item_meta' THEN p_data->'item_meta' ELSE previous END;
 IF jsonb_typeof(supplied)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(supplied))>80 THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 result:=public.portal_demands_write_before_assignments(p_action,p_data-'item_meta');
 SELECT * INTO c FROM public.portal_demand_cards WHERE id=(result->'card'->>'id')::uuid;
 IF p_data ? 'item_meta' AND EXISTS(SELECT 1 FROM jsonb_object_keys(supplied) k WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.items) entry WHERE entry->>'id'=k)) THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(c.items) LOOP
  m:=coalesce(supplied->(i->>'id'),jsonb_build_object('priority','normal','assignee_id',NULL));
  IF jsonb_typeof(m)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(m) k WHERE k NOT IN ('priority','assignee_id'))
   OR m->>'priority' IS NULL OR m->>'priority' NOT IN ('urgent','high','normal','low')
   OR (m->'assignee_id' IS NOT NULL AND jsonb_typeof(m->'assignee_id') NOT IN ('null','string')) THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
  target:=(m->>'assignee_id')::uuid;
  IF target IS NOT NULL AND (c.board='personal' AND target<>auth.uid() OR
   (target::text IS DISTINCT FROM previous->(i->>'id')->>'assignee_id' AND NOT coalesce(public.portal_demand_recipient(target,c.board),false))) THEN RAISE EXCEPTION 'DEMAND_RECIPIENT_DENIED' USING ERRCODE='42501'; END IF;
  normalized:=normalized||jsonb_build_object(i->>'id',jsonb_build_object('priority',m->>'priority','assignee_id',target));
 END LOOP;
 -- A retried create must match metadata as well; it cannot silently reassign a card.
 IF p_action='create' AND c.item_meta<>'{}' AND c.item_meta IS DISTINCT FROM normalized THEN RAISE EXCEPTION 'DEMAND_CONFLICT'; END IF;
 UPDATE public.portal_demand_cards SET item_meta=normalized WHERE id=c.id RETURNING * INTO c;
 FOR i IN SELECT value FROM jsonb_array_elements(c.items) LOOP
  target:=(normalized->(i->>'id')->>'assignee_id')::uuid;
  IF c.board<>'personal' AND NOT c.archived AND NOT (i->>'done')::boolean AND target IS NOT NULL
   AND target::text IS DISTINCT FROM previous->(i->>'id')->>'assignee_id' THEN
   INSERT INTO public.portal_demand_notifications(card_id,item_id,recipient_id,actor_id,card_revision)
   VALUES(c.id,(i->>'id')::uuid,target,auth.uid(),c.revision) ON CONFLICT DO NOTHING RETURNING id INTO notice;
   IF notice IS NOT NULL THEN
    INSERT INTO public.portal_demand_delivery_outbox(notification_id,channel)
    SELECT notice,channel FROM public.portal_demand_contacts prefs CROSS JOIN LATERAL
    (SELECT 'email'::text channel WHERE prefs.email_opt_in UNION ALL SELECT 'whatsapp' WHERE prefs.whatsapp_opt_in) channels
    WHERE prefs.user_id=target ON CONFLICT DO NOTHING;
   END IF;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('actor',auth.uid(),'card',to_jsonb(c));
END $$;

CREATE FUNCTION public.portal_demand_card_rank(p_items jsonb,p_meta jsonb) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public AS $$
 SELECT coalesce(min(CASE coalesce(p_meta->(i->>'id')->>'priority','normal') WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END) FILTER(WHERE NOT (i->>'done')::boolean),4)
 FROM jsonb_array_elements(p_items) i;
$$;
CREATE FUNCTION public.portal_demands_v2_read(p_board text DEFAULT 'personal',p_archived boolean DEFAULT false,p_after_rank integer DEFAULT NULL,p_after_id uuid DEFAULT NULL,p_card uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cards jsonb; more boolean; recipients jsonb;
BEGIN
 IF p_archived IS NULL OR NOT public.portal_demand_access(p_board,auth.uid(),false) THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF (p_after_rank IS NULL)<>(p_after_id IS NULL) OR p_after_rank NOT BETWEEN 0 AND 4 THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 WITH ranked AS(SELECT c.*,public.portal_demand_card_rank(c.items,c.item_meta) priority_rank FROM public.portal_demand_cards c
  WHERE c.board=p_board AND c.archived=p_archived AND (p_card IS NULL OR c.id=p_card) AND public.portal_demand_access(c.board,c.owner_id,false)),
 page AS(SELECT * FROM ranked WHERE p_after_id IS NULL OR (priority_rank,id)>(p_after_rank,p_after_id) ORDER BY priority_rank,id LIMIT 51),
 numbered AS(SELECT *,row_number() OVER(ORDER BY priority_rank,id) rn FROM page)
 SELECT coalesce(jsonb_agg(to_jsonb(n)-'rn' ORDER BY priority_rank,id) FILTER(WHERE rn<=50),'[]'),count(*)>50 INTO cards,more FROM numbered n;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',left(coalesce(nullif(p.full_name,''),'Membro sem nome'),160)) ORDER BY p.full_name,p.id),'[]') INTO recipients
 FROM(SELECT id,full_name FROM public.profiles p WHERE public.portal_demand_recipient(p.id,p_board) ORDER BY full_name,id LIMIT 500) p;
 RETURN jsonb_build_object('actor',auth.uid(),'board',p_board,'boards',(SELECT jsonb_agg(b ORDER BY ordinal) FROM unnest(ARRAY['personal','FRC','FTC','FLL','OBR']) WITH ORDINALITY x(b,ordinal) WHERE public.portal_demand_access(b,auth.uid(),false)),
 'can_edit',public.portal_demand_access(p_board,auth.uid(),true),'items',cards,'recipients',recipients,'external_delivery','not_configured',
 'has_more',more,'next_cursor',CASE WHEN more THEN jsonb_build_object('rank',cards->49->'priority_rank','id',cards->49->>'id') ELSE NULL END);
END $$;

CREATE FUNCTION public.portal_demand_contact(p_data jsonb DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE prefs public.portal_demand_contacts; required boolean; phone_value text; no_number boolean; whatsapp boolean; email_messages boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF p_data IS NOT NULL THEN
  IF jsonb_typeof(p_data)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_data) k WHERE k NOT IN ('phone','no_phone','whatsapp_opt_in','email_opt_in'))
   OR jsonb_typeof(p_data->'no_phone') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_data->'whatsapp_opt_in') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_data->'email_opt_in') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'CONTACT_INVALID'; END IF;
  no_number:=(p_data->>'no_phone')::boolean;phone_value:=nullif(btrim(p_data->>'phone'),'');whatsapp:=(p_data->>'whatsapp_opt_in')::boolean;email_messages:=(p_data->>'email_opt_in')::boolean;
  IF (NOT no_number AND (phone_value IS NULL OR phone_value !~ '^\+[1-9][0-9]{7,14}$')) OR (no_number AND (phone_value IS NOT NULL OR whatsapp)) THEN RAISE EXCEPTION 'CONTACT_INVALID'; END IF;
  INSERT INTO public.portal_demand_contacts(user_id,phone,no_phone,whatsapp_opt_in,email_opt_in,completed) VALUES(auth.uid(),phone_value,no_number,whatsapp,email_messages,true)
  ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,no_phone=excluded.no_phone,whatsapp_opt_in=excluded.whatsapp_opt_in,email_opt_in=excluded.email_opt_in,completed=true,updated_at=clock_timestamp();
 END IF;
 SELECT * INTO prefs FROM public.portal_demand_contacts WHERE user_id=auth.uid();
 SELECT contact_required INTO required FROM public.portal_demand_features WHERE singleton;
 RETURN jsonb_build_object('actor',auth.uid(),'required',required AND NOT coalesce(prefs.completed,false),'completed',coalesce(prefs.completed,false),
 'phone',prefs.phone,'no_phone',coalesce(prefs.no_phone,false),'whatsapp_opt_in',coalesce(prefs.whatsapp_opt_in,false),'email_opt_in',coalesce(prefs.email_opt_in,false),'external_delivery','not_configured');
END $$;
CREATE FUNCTION public.portal_demand_contact_required(p_required boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT coalesce(public.is_admin(),false) OR auth.uid() IS NULL OR p_required IS NULL THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 UPDATE public.portal_demand_features SET contact_required=p_required WHERE singleton;
 RETURN jsonb_build_object('actor',auth.uid(),'required',p_required);
END $$;
CREATE FUNCTION public.portal_demand_inbox(p_after timestamptz DEFAULT NULL,p_after_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE notices jsonb; more boolean; unread bigint;
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF (p_after IS NULL)<>(p_after_id IS NULL) THEN RAISE EXCEPTION 'DEMAND_INVALID'; END IF;
 SELECT count(*) INTO unread FROM public.portal_demand_notifications WHERE read_at IS NULL;
 WITH page AS(SELECT n.id,n.created_at,n.read_at,c.id card_id,c.board,c.title,i->>'id' item_id,i->>'text' item_text,(i->>'done')::boolean done,
 coalesce(c.item_meta->(i->>'id')->>'priority','normal') priority FROM public.portal_demand_notifications n JOIN public.portal_demand_cards c ON c.id=n.card_id
 CROSS JOIN LATERAL jsonb_array_elements(c.items) i WHERE i->>'id'=n.item_id::text AND (p_after IS NULL OR (n.created_at,n.id)<(p_after,p_after_id)) ORDER BY n.created_at DESC,n.id DESC LIMIT 31),
 numbered AS(SELECT *,row_number() OVER(ORDER BY created_at DESC,id DESC) rn FROM page)
 SELECT coalesce(jsonb_agg(to_jsonb(n)-'rn' ORDER BY created_at DESC,id DESC) FILTER(WHERE rn<=30),'[]'),count(*)>30 INTO notices,more FROM numbered n;
 RETURN jsonb_build_object('actor',auth.uid(),'unread',unread,'items',notices,'has_more',more,'next_cursor',CASE WHEN more THEN jsonb_build_object('date',notices->29->>'created_at','id',notices->29->>'id') ELSE NULL END,'external_delivery','not_configured');
END $$;
CREATE FUNCTION public.portal_demand_notice_read(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.portal_demand_notifications SET read_at=coalesce(read_at,clock_timestamp()) WHERE id=p_id AND recipient_id=auth.uid() AND public.portal_demand_notice_visible(card_id,item_id,recipient_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'DEMAND_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('actor',auth.uid(),'id',p_id);
END $$;
REVOKE ALL ON FUNCTION public.portal_demand_recipient(uuid,text),public.portal_demand_notice_visible(uuid,uuid,uuid),public.portal_demand_card_rank(jsonb,jsonb),public.portal_demands_write(text,jsonb),public.portal_demands_v2_read(text,boolean,integer,uuid,uuid),public.portal_demand_contact(jsonb),public.portal_demand_contact_required(boolean),public.portal_demand_inbox(timestamptz,uuid),public.portal_demand_notice_read(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portal_demand_notice_visible(uuid,uuid,uuid),public.portal_demands_write(text,jsonb),public.portal_demands_v2_read(text,boolean,integer,uuid,uuid),public.portal_demand_contact(jsonb),public.portal_demand_contact_required(boolean),public.portal_demand_inbox(timestamptz,uuid),public.portal_demand_notice_read(uuid) TO authenticated;
COMMIT;
