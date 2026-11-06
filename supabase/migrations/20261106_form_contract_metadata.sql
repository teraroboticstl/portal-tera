BEGIN;
-- Add optional editorial storage to existing rows. No historical rewrite, new
-- member/task table, status-check relaxation, grant or policy change.
DO $$DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['fll_missions','fll_tasks','fll_innovation_projects','fll_core_values','fll_judge_preps','fll_members','fll_attachments','board_diaries','team_logs','project_risks','esg_initiatives'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN portal_form_data jsonb NOT NULL DEFAULT %L::jsonb CHECK(jsonb_typeof(portal_form_data)=%L AND octet_length(portal_form_data::text)<=60000)',t,'{}','object');
 END LOOP;
END$$;
-- The existing modality policy reads program directly. Legacy unclassified logs
-- remain Geral; no modality is guessed from names or document text.
ALTER TABLE public.team_logs ADD COLUMN program text NOT NULL DEFAULT 'Geral' CHECK(program IN ('Geral','FRC','FTC','FLL','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2'));
COMMIT;
