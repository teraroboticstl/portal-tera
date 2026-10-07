BEGIN;
-- The existing admin and public read policies are preserved.
-- Approved internal users may create/edit projects; delete remains admin-only.
DROP POLICY IF EXISTS "Projetos criados por usuarios internos aprovados" ON public.projects;
CREATE POLICY "Projetos criados por usuarios internos aprovados" ON public.projects
FOR INSERT TO authenticated WITH CHECK (
 public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='approved')
);
DROP POLICY IF EXISTS "Projetos editados por usuarios internos aprovados" ON public.projects;
CREATE POLICY "Projetos editados por usuarios internos aprovados" ON public.projects
FOR UPDATE TO authenticated USING (
 public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='approved')
) WITH CHECK (
 public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='approved')
);
GRANT SELECT,INSERT,UPDATE ON public.projects TO authenticated;
COMMIT;
