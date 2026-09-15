-- =====================================================================
-- MIGRAÇÃO CORRETIVA: PRIVILÉGIOS (GRANTS) PARA CONTEÚDO PÚBLICO E AUTENTICADO
-- Executar no Query Editor do Supabase para corrigir o erro 42501 (permission denied)
-- =====================================================================

-- 1. Garantir permissão de uso no schema public para os papéis da API Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Conceder APENAS leitura (SELECT) ao papel anon nas tabelas de conteúdo institucional público
-- Segurança estrita: Nenhuma permissão de INSERT, UPDATE ou DELETE é concedida ao papel anon nestas tabelas.
-- O Row Level Security (RLS) permanece 100% ativo e obrigatório em todas as tabelas.
GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT ON public.robots TO anon;
GRANT SELECT ON public.seasons TO anon;
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.tournament_memorials TO anon;
GRANT SELECT ON public.event_galleries TO anon;
GRANT SELECT ON public.event_medias TO anon;
GRANT SELECT ON public.tir_equipes TO anon;
GRANT SELECT ON public.tir_regras TO anon;
GRANT SELECT ON public.tir_fotos TO anon;
GRANT SELECT ON public.tir_mensagens TO anon;

-- 3. Conceder permissão de envio (INSERT) anônimo para formulário institucional de contato
-- (Permitido e validado pela policy RLS 'Qualquer visitante pode enviar mensagem de contato')
GRANT INSERT ON public.contact_messages TO anon;

-- 4. Garantir que usuários autenticados possam acessar as tabelas através das políticas de RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
