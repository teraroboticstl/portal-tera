-- Extend permitted categories only. No grants, RLS, policies or authentication changes.
BEGIN;
DO $$
DECLARE target RECORD; expression TEXT;
BEGIN
  FOR target IN
    SELECT c.oid, c.conname, c.conrelid, t.relname
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname IN ('daily_logs', 'prototype_tests', 'priorities', 'board_diaries', 'robots')
      AND c.contype = 'c' AND pg_get_constraintdef(c.oid) LIKE '%category%'
  LOOP
    expression := pg_get_expr((SELECT conbin FROM pg_constraint WHERE oid = target.oid), target.conrelid);
    -- Keep every pre-existing allowed value and validation expression.
    IF expression NOT LIKE '%OBR Resgate Nível 1%' THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', target.relname, target.conname);
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK ((%s) OR category IN (''OBR'', ''OBR Resgate Nível 1'', ''OBR Resgate Nível 2'', ''OBR Artística Nível 1'', ''OBR Artística Nível 2''))', target.relname, target.conname, expression);
    END IF;
  END LOOP;
END $$;
COMMIT;
