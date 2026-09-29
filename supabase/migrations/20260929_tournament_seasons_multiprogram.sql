-- =====================================================================
-- MIGRAÇÃO DEFINITIVA: SUPORTE A MÚLTIPLOS PROGRAMAS EM TEMPORADAS (public.seasons)
-- 
-- Estado confirmado em produção:
-- 1. Coluna program TEXT NOT NULL DEFAULT 'FRC'.
-- 2. Constraint seasons_program_check: CHECK (program IN ('OBR', 'FLL', 'FTC', 'FRC')).
-- 3. Constraint seasons_program_year_key: UNIQUE (program, year).
-- 4. Constraint antiga seasons_year_key: REMOVIDA.
-- =====================================================================

-- 1. Adicionar a coluna program com DEFAULT 'FRC' se ainda não existir
ALTER TABLE public.seasons 
ADD COLUMN IF NOT EXISTS program TEXT DEFAULT 'FRC';

-- 2. Normalizar registros históricos com program NULL para 'FRC'
UPDATE public.seasons 
SET program = 'FRC' 
WHERE program IS NULL;

-- 3. Definir program como NOT NULL
ALTER TABLE public.seasons 
ALTER COLUMN program SET NOT NULL;

-- 4. Criar check constraint seasons_program_check se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'seasons_program_check' 
        AND conrelid = 'public.seasons'::regclass
    ) THEN
        ALTER TABLE public.seasons 
        ADD CONSTRAINT seasons_program_check 
        CHECK (program IN ('OBR', 'FLL', 'FTC', 'FRC'));
    END IF;
END $$;

-- 5. Remover a constraint antiga seasons_year_key e criar seasons_program_year_key
DO $$
BEGIN
    -- Remove constraint antiga de ano único se existir
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'seasons_year_key' 
        AND conrelid = 'public.seasons'::regclass
    ) THEN
        ALTER TABLE public.seasons DROP CONSTRAINT seasons_year_key;
    END IF;

    -- Cria constraint composta (program, year) se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'seasons_program_year_key' 
        AND conrelid = 'public.seasons'::regclass
    ) THEN
        ALTER TABLE public.seasons 
        ADD CONSTRAINT seasons_program_year_key UNIQUE (program, year);
    END IF;
END $$;
