-- =====================================================================
-- MIGRAÇÃO: SUPORTE A IMAGENS E ACESSIBILIDADE NAS MISSÕES FLL BIOGLOW
-- Armazenamento no Google Drive institucional (04. Torneios & Eventos / FLL BIOGLOW / Missões)
-- =====================================================================

-- 1. Assegurar colunas para imagens e identificação de missão
ALTER TABLE public.fll_missions ADD COLUMN IF NOT EXISTS mission_code TEXT;
ALTER TABLE public.fll_missions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.fll_missions ADD COLUMN IF NOT EXISTS image_alt TEXT;
ALTER TABLE public.fll_missions ADD COLUMN IF NOT EXISTS season TEXT DEFAULT 'BIOGLOW';

-- Criar índice de busca para mission_code e season
CREATE INDEX IF NOT EXISTS idx_fll_missions_code ON public.fll_missions(mission_code);
CREATE INDEX IF NOT EXISTS idx_fll_missions_season ON public.fll_missions(season);

-- 2. Garantir leitura pública aos visitantes sem necessidade de login
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'fll_missions' 
          AND policyname = 'Leitura pública fll_missions'
    ) THEN
        CREATE POLICY "Leitura pública fll_missions" ON public.fll_missions
            FOR SELECT USING (true);
    END IF;
END $$;

-- 3. Conceder permissão explícita de SELECT ao papel anon
GRANT SELECT ON public.fll_missions TO anon;
