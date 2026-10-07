BEGIN;
-- Extend only the score constraint, keeping grants, RLS, ownership and RPCs unchanged.
ALTER TABLE public.fll_round_simulations DROP CONSTRAINT fll_round_simulations_score_check;
ALTER TABLE public.fll_round_simulations ADD CONSTRAINT fll_round_simulations_score_check CHECK (score >= 0 AND score <= CASE WHEN rules_version='industria-interclasse-2026-v11' AND season_theme='DESAFIOS DA INDÚSTRIA' AND season_year=2026 THEN 600 ELSE 530 END);
COMMIT;
