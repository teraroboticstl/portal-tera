-- Preserve all account privileges while returning the display level to the legacy leader.
BEGIN;
UPDATE public.portal_user_access SET access_level='leader' WHERE access_level='technician';
DROP FUNCTION public.portal_set_access(jsonb);
ALTER FUNCTION public.portal_set_access_before_technicians(jsonb) RENAME TO portal_set_access;
GRANT EXECUTE ON FUNCTION public.portal_set_access(jsonb) TO authenticated;
ALTER TABLE public.portal_user_access DROP CONSTRAINT portal_user_access_access_level_check;
ALTER TABLE public.portal_user_access ADD CONSTRAINT portal_user_access_access_level_check
 CHECK(access_level IN ('public','student','trainee','member','leader'));
COMMIT;
