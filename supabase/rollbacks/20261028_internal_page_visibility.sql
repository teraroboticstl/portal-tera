-- Availability rollback: keep the additive schema/RPCs so the deployed client remains compatible.
-- Run only by an authorized database administrator; no existing business records are touched.
BEGIN;
UPDATE public.portal_page_visibility
SET visible=true,revision=revision+1,updated_at=clock_timestamp(),updated_by=auth.uid()
WHERE NOT visible;
COMMIT;
