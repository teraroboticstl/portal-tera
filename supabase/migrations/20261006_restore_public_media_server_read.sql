-- Restore server reads used to verify public media references.
-- These tables already grant SELECT to anon; RLS and writes are unchanged.
BEGIN;
GRANT SELECT ON TABLE public.products, public.projects, public.sponsors,
  public.event_galleries, public.event_medias, public.tir_fotos,
  public.robots, public.tournament_memorials TO service_role;
COMMIT;
