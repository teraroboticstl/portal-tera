BEGIN;
DROP FUNCTION public.portal_work_sources(text,text,uuid,integer,uuid[]);
COMMIT;
-- No data is deleted. Revert only Bloco 6 UI/client after reviewing the mixed local diff.
-- The new client fails closed without this overload; never fall back to the whole-row RPC.
