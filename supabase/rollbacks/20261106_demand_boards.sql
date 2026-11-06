-- Emergency suspension preserving every card and checklist. No DROP/DELETE.
BEGIN;
REVOKE ALL ON public.portal_demand_cards FROM authenticated;
REVOKE ALL ON FUNCTION public.portal_demands_read(text,boolean,uuid),public.portal_demands_write(text,jsonb) FROM authenticated;
UPDATE public.portal_page_visibility SET visible=false,revision=revision+1,updated_at=clock_timestamp() WHERE page_key='InternalDemands';
COMMIT;
