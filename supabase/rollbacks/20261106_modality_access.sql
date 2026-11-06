-- Administrator-only emergency rollback: returns to the previous shared modality scope.
-- Keeps all records, questionnaires, assignments and audit history.
BEGIN;
UPDATE public.member_registration_settings SET modality_access_enabled=false WHERE singleton;
COMMIT;
