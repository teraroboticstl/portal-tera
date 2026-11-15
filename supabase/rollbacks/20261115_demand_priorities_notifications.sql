BEGIN;
-- Restore the previous frontend first. Preserve all cards, assignments, contacts and notices.
UPDATE public.portal_demand_features SET contact_required=false WHERE singleton;
DROP FUNCTION public.portal_demands_write(text,jsonb);
ALTER FUNCTION public.portal_demands_write_before_assignments(text,jsonb) RENAME TO portal_demands_write;
GRANT EXECUTE ON FUNCTION public.portal_demands_write(text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.portal_demands_v2_read(text,boolean,integer,uuid,uuid),public.portal_demand_inbox(timestamptz,uuid),public.portal_demand_notice_read(uuid),public.portal_demand_contact_required(boolean) FROM PUBLIC,anon,authenticated;
REVOKE SELECT ON public.portal_demand_notifications FROM authenticated;
-- Contact RPC stays self-only; the gate sees required=false, never blocking old sessions.
-- No tables/columns/data are dropped and no WhatsApp/email worker is enabled.
COMMIT;
