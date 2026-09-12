-- =====================================================================
-- SCHEMA DE BANCO DE DATOS - PORTAL TERA (SUPABASE / POSTGRESQL)
-- =====================================================================
-- Versão: 2.0 (Produção - RLS Granular e Controle Estrito de Acesso)
-- Arquitetura: RBAC (Admin, Mentor, Aluno) integrado ao Supabase Auth
-- =====================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Trigger de atualização automática para colunas updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 🔐 FUNÇÕES DE SEGURANÇA E AUXILIARES DE RBAC (SECURITY DEFINER)
-- =====================================================================

-- Retorna se o usuário atual está autenticado

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
    SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Retorna o papel principal do usuário logado na tabela profiles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Verifica se o usuário atual possui privilégios de Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (role = 'admin' OR member_role = 'admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Verifica se o usuário atual é Mentor ou Administrador
CREATE OR REPLACE FUNCTION public.is_mentor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (role IN ('admin', 'mentor') OR member_role IN ('admin', 'member'))
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Verifica se o usuário autenticado está aprovado no sistema
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (status = 'approved' OR role = 'admin' OR member_role = 'admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- =====================================================================
-- 👤 1. SISTEMA DE USUÁRIOS E PERFIS (PROFILES)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'aluno' CHECK (role IN ('admin', 'mentor', 'aluno')),
    member_role TEXT NOT NULL DEFAULT 'user' CHECK (member_role IN ('admin', 'member', 'user')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    category TEXT DEFAULT 'Geral',
    program TEXT DEFAULT 'Geral',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Sincronizar role e member_role caso um deles seja alterado
CREATE OR REPLACE FUNCTION public.sync_profile_roles()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'admin' AND (NEW.member_role IS NULL OR NEW.member_role != 'admin') THEN
        NEW.member_role := 'admin';
    ELSIF NEW.member_role = 'admin' AND NEW.role != 'admin' THEN
        NEW.role := 'admin';
    ELSIF NEW.role = 'mentor' AND (NEW.member_role IS NULL OR NEW.member_role != 'member') THEN
        NEW.member_role := 'member';
    ELSIF NEW.member_role = 'member' AND NEW.role = 'aluno' THEN
        NEW.role := 'mentor';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_profile_roles
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_roles();

-- =====================================================================
-- 🛡️ PROTEÇÃO CONTRA ESCALAÇÃO INDEVIDA DE PRIVILÉGIOS (PROFILES)
-- =====================================================================
-- Esta função e trigger impedem que qualquer usuário não-administrador
-- altere suas próprias permissões ('role', 'member_role') ou seu 'status'
-- de aprovação, mesmo que tente enviar um UPDATE direto pelo cliente Supabase.
CREATE OR REPLACE FUNCTION public.check_profile_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
    admin_exists BOOLEAN;
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR 
        OLD.member_role IS DISTINCT FROM NEW.member_role OR 
        OLD.status IS DISTINCT FROM NEW.status) THEN
        
        -- Administradores têm permissão total para alterar papéis e status
        IF public.is_admin() THEN
            RETURN NEW;
        END IF;

        -- Permitir apenas se for o bootstrap inicial do primeiro admin quando o banco está vazio
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE role = 'admin' OR member_role = 'admin'
        ) INTO admin_exists;

        IF NOT admin_exists THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Apenas administradores podem alterar permissões, papéis ou status de aprovação de membros.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_check_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_role_escalation();

-- =====================================================================
-- 🚀 BOOTSTRAP DE PRIMEIRO USUÁRIO E CRIAÇÃO AUTOMÁTICA DE PERFIL
-- =====================================================================
-- COMPORTAMENTO DE BOOTSTRAP DOCUMENTADO:
-- 1. Quando o banco de dados é novo/vazio, NENHUM perfil existe na tabela 'profiles'.
-- 2. No primeiro cadastro realizado via Supabase Auth (auth.users), a trigger verifica:
--    'admin_exists := EXISTS (SELECT 1 FROM public.profiles WHERE role = "admin" OR member_role = "admin")'.
-- 3. Como admin_exists é FALSO, este primeiro usuário torna-se automaticamente:
--    role = 'admin', member_role = 'admin', status = 'approved'.
-- 4. Para TODOS os usuários subsequentes (quando admin_exists for VERDADEIRO):
--    role = 'aluno', member_role = 'user', status = 'pending'.
--    Eles ficam aguardando aprovação explícita de um administrador no Portal Tera.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_exists BOOLEAN;
    user_name TEXT;
    user_avatar TEXT;
BEGIN
    -- Verificar se já existe algum administrador cadastrado no sistema
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE role = 'admin' OR member_role = 'admin'
    ) INTO admin_exists;

    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        member_role,
        status,
        category,
        program
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_avatar,
        CASE WHEN NOT admin_exists THEN 'admin' ELSE 'aluno' END,
        CASE WHEN NOT admin_exists THEN 'admin' ELSE 'user' END,
        CASE WHEN NOT admin_exists THEN 'approved' ELSE 'pending' END,
        'Geral',
        'Geral'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Políticas RLS para Profiles
CREATE POLICY "Membros autenticados podem listar perfis" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- Política de UPDATE com USING e WITH CHECK estritos:
-- Garante que um usuário comum só pode submeter UPDATE na sua própria linha (auth.uid() = id)
-- e que administradores podem gerenciar qualquer linha. A integridade dos campos sensíveis
-- (role, member_role, status) é defendida de forma intransponível pelo trigger
-- BEFORE UPDATE trg_check_profile_role_escalation.
CREATE POLICY "Usuário atualiza o próprio perfil ou admin atualiza qualquer" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Apenas admin pode deletar perfis" ON public.profiles
    FOR DELETE TO authenticated USING (public.is_admin() AND auth.uid() != id);


-- =====================================================================
-- 📝 2. LOGS DE AUDITORIA (AUDIT_LOGS - IMUTÁVEL)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    entity_name TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas administradores podem consultar logs de auditoria" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Usuários autenticados podem registrar ações de auditoria" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());

-- Logs de auditoria são imutáveis: NÃO há políticas de UPDATE ou DELETE


-- =====================================================================
-- 🌐 3. CONTEÚDO PÚBLICO DO SITE (VITRINE INSTITUCIONAL)
-- =====================================================================

-- Temporadas (seasons)
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL UNIQUE,
    theme TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura pública seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Modificação de seasons restrita a mentores e admins" ON public.seasons FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());

-- Robôs (robots)
CREATE TABLE IF NOT EXISTS public.robots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('FRC', 'FTC', 'FLL')),
    description TEXT,
    cad_link TEXT,
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    images TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_robots_updated_at BEFORE UPDATE ON public.robots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura pública robots" ON public.robots FOR SELECT USING (true);
CREATE POLICY "Modificação de robots restrita a admin" ON public.robots FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Patrocinadores (sponsors)
CREATE TABLE IF NOT EXISTS public.sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('Diamante', 'Ouro', 'Prata', 'Bronze', 'Apoio')),
    logo_url TEXT NOT NULL,
    website TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura pública sponsors" ON public.sponsors FOR SELECT USING (true);
CREATE POLICY "Modificação de sponsors restrita a admin" ON public.sponsors FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Projetos Sociais / Públicos (projects)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Concluído', 'Planejamento')),
    links JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura pública projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Modificação de projects restrita a admin" ON public.projects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Loja Oficial (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('Vestuário', 'Acessórios', 'Colecionáveis', 'Outros')),
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura pública products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Modificação de products restrita a admin" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Memorial Histórico e Conquistas (tournament_memorials)
CREATE TABLE IF NOT EXISTS public.tournament_memorials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    program TEXT NOT NULL DEFAULT 'FRC',
    category TEXT NOT NULL DEFAULT 'Torneio',
    description TEXT,
    location TEXT,
    ranking TEXT,
    images TEXT[] NOT NULL DEFAULT '{}',
    achievements TEXT[] NOT NULL DEFAULT '{}',
    video_urls TEXT[] NOT NULL DEFAULT '{}',
    team_members TEXT,
    highlight BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tournament_memorials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tournament_memorials_updated_at BEFORE UPDATE ON public.tournament_memorials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura pública tournament_memorials" ON public.tournament_memorials FOR SELECT USING (true);
CREATE POLICY "Criação e edição de memorials por mentores e admins" ON public.tournament_memorials FOR INSERT TO authenticated WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Atualização de memorials por mentores e admins" ON public.tournament_memorials FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de memorials restrita a admin" ON public.tournament_memorials FOR DELETE TO authenticated USING (public.is_admin());

-- Galeria de Eventos (event_galleries)
CREATE TABLE IF NOT EXISTS public.event_galleries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'Torneio',
    date_start DATE,
    date_end DATE,
    location TEXT,
    cover_image TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    parent_event_id UUID REFERENCES public.event_galleries(id) ON DELETE SET NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.event_galleries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_event_galleries_updated_at BEFORE UPDATE ON public.event_galleries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura de galerias públicas ou por membros autenticados" ON public.event_galleries
    FOR SELECT USING (is_public = true OR public.is_authenticated());
CREATE POLICY "Modificação de galerias por mentores e admins" ON public.event_galleries
    FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());

-- Mídias da Galeria (event_medias)
CREATE TABLE IF NOT EXISTS public.event_medias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.event_galleries(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.event_medias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de mídias públicas ou por membros autenticados" ON public.event_medias
    FOR SELECT USING (is_public = true OR public.is_authenticated());
CREATE POLICY "Modificação de mídias por mentores e admins" ON public.event_medias
    FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());

-- Mensagens de Contato Institucional (contact_messages)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Qualquer visitante pode enviar mensagem de contato" ON public.contact_messages
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Visualização de mensagens de contato restrita a mentores e admins" ON public.contact_messages
    FOR SELECT TO authenticated USING (public.is_mentor_or_admin());
CREATE POLICY "Atualização e exclusão de mensagens restrita a admin" ON public.contact_messages
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Exclusão de mensagens de contato restrita a admin" ON public.contact_messages
    FOR DELETE TO authenticated USING (public.is_admin());


-- =====================================================================
-- 🏆 4. TORNEIO INTERNO DE ROBÓTICA (TIR)
-- =====================================================================

-- Equipes do TIR (tir_equipes)
CREATE TABLE IF NOT EXISTS public.tir_equipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    modalidade TEXT NOT NULL CHECK (modalidade IN ('FLL', 'FTC', 'FRC', 'Geral')),
    cor TEXT NOT NULL DEFAULT '#E10600',
    pontos_totais INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tir_equipes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tir_equipes_updated_at BEFORE UPDATE ON public.tir_equipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Leitura pública equipes TIR" ON public.tir_equipes FOR SELECT USING (true);
CREATE POLICY "Modificação de equipes TIR restrita a mentores e admins" ON public.tir_equipes
    FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());

-- Regras do TIR (tir_regras)
CREATE TABLE IF NOT EXISTS public.tir_regras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    pontos INTEGER NOT NULL DEFAULT 0,
    categoria TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tir_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública regras TIR" ON public.tir_regras FOR SELECT USING (true);
CREATE POLICY "Modificação de regras TIR restrita a admin" ON public.tir_regras
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Fotos do TIR (tir_fotos)
CREATE TABLE IF NOT EXISTS public.tir_fotos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    legenda TEXT,
    team_id UUID REFERENCES public.tir_equipes(id) ON DELETE SET NULL,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tir_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública fotos TIR" ON public.tir_fotos FOR SELECT USING (true);
CREATE POLICY "Membros autenticados podem enviar fotos TIR" ON public.tir_fotos
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Exclusão de fotos TIR restrita a admin" ON public.tir_fotos
    FOR DELETE TO authenticated USING (public.is_admin());

-- Mural de Mensagens TIR (tir_mensagens)
CREATE TABLE IF NOT EXISTS public.tir_mensagens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    autor TEXT NOT NULL,
    texto TEXT NOT NULL,
    team_id UUID REFERENCES public.tir_equipes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tir_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública mural TIR" ON public.tir_mensagens FOR SELECT USING (true);
CREATE POLICY "Membros autenticados podem publicar no mural TIR" ON public.tir_mensagens
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Moderação e exclusão de mural TIR restrita a admin" ON public.tir_mensagens
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- =====================================================================
-- 🔒 5. DADOS INTERNOS DE ENGENHARIA E OPERAÇÃO (ESTRITAMENTE INTERNOS)
-- =====================================================================

-- Diário de Bordo da Diretoria (board_diaries)
CREATE TABLE IF NOT EXISTS public.board_diaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL DEFAULT 'Geral' CHECK (category IN ('FLL', 'FTC', 'FRC', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.board_diaries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_board_diaries_updated_at BEFORE UPDATE ON public.board_diaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem diários da diretoria" ON public.board_diaries
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Criação de diários da diretoria por mentores e admins" ON public.board_diaries
    FOR INSERT TO authenticated WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Edição de diários da diretoria pelo autor ou admin" ON public.board_diaries
    FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_admin()) WITH CHECK (author_id = auth.uid() OR public.is_admin());
CREATE POLICY "Exclusão de diários da diretoria restrita a admin" ON public.board_diaries
    FOR DELETE TO authenticated USING (public.is_admin());

-- Logs Diários de Membros (daily_logs)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL DEFAULT 'Geral' CHECK (category IN ('FLL', 'FTC', 'FRC', 'Marketing', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem daily_logs" ON public.daily_logs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros criam seus próprios daily_logs" ON public.daily_logs
    FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Membros editam seus próprios logs ou mentores/admins editam" ON public.daily_logs
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_mentor_or_admin()) WITH CHECK (user_id = auth.uid() OR public.is_mentor_or_admin());
CREATE POLICY "Membros excluem seus próprios logs ou admin exclui" ON public.daily_logs
    FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Logs de Equipe (team_logs)
CREATE TABLE IF NOT EXISTS public.team_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.team_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_team_logs_updated_at BEFORE UPDATE ON public.team_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem team_logs" ON public.team_logs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros criam team_logs" ON public.team_logs
    FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Autor ou mentor/admin edita team_logs" ON public.team_logs
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_mentor_or_admin()) WITH CHECK (user_id = auth.uid() OR public.is_mentor_or_admin());
CREATE POLICY "Autor ou admin exclui team_logs" ON public.team_logs
    FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Atas de Reunião (meeting_notes)
CREATE TABLE IF NOT EXISTS public.meeting_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    program TEXT NOT NULL DEFAULT 'Geral',
    attendees TEXT[] NOT NULL DEFAULT '{}',
    action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_meeting_notes_updated_at BEFORE UPDATE ON public.meeting_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem meeting_notes" ON public.meeting_notes
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam meeting_notes" ON public.meeting_notes
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
-- Nota de governança: meeting_notes não possui coluna de autor/responsável (possui apenas array textual attendees).
-- Para permitir que um aluno edite apenas sua própria ata, propõe-se adicionar a coluna:
-- author_id UUID REFERENCES public.profiles(id). Sem essa coluna, a edição é restrita a mentores e admins.
CREATE POLICY "Edição de meeting_notes restrita a mentores e admins" ON public.meeting_notes
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de meeting_notes restrita a mentores e admins" ON public.meeting_notes
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Prioridades Semanais / Kanban (priorities)
CREATE TABLE IF NOT EXISTS public.priorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    area TEXT NOT NULL CHECK (area IN ('Mecânica', 'Programação', 'Elétrica', 'Marketing', 'Geral')),
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Progresso', 'Concluído')),
    urgency TEXT NOT NULL DEFAULT 'Média' CHECK (urgency IN ('Alta', 'Média', 'Baixa')),
    category TEXT NOT NULL DEFAULT 'Geral' CHECK (category IN ('FLL', 'FTC', 'FRC', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_priorities_updated_at BEFORE UPDATE ON public.priorities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem priorities" ON public.priorities
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam priorities" ON public.priorities
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
-- Nota de governança: priorities não possui coluna de responsável (assignee_id/owner_id).
-- Para permitir que um aluno edite apenas prioridades a ele atribuídas, propõe-se adicionar:
-- assignee_id UUID REFERENCES public.profiles(id). Sem essa coluna, a edição fica restrita a mentores e admins.
CREATE POLICY "Edição de priorities restrita a mentores e admins" ON public.priorities
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de priorities restrita a mentores e admins" ON public.priorities
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Matriz de Riscos de Projeto (project_risks)
CREATE TABLE IF NOT EXISTS public.project_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Técnico',
    probability TEXT NOT NULL CHECK (probability IN ('Baixa', 'Média', 'Alta')),
    impact TEXT NOT NULL CHECK (impact IN ('Baixo', 'Médio', 'Alto')),
    mitigation TEXT NOT NULL,
    contingency TEXT,
    responsible TEXT,
    program TEXT NOT NULL DEFAULT 'Geral',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_project_risks_updated_at BEFORE UPDATE ON public.project_risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem project_risks" ON public.project_risks
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados registram project_risks" ON public.project_risks
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Edição de riscos restrita a mentores e admins" ON public.project_risks
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de riscos restrita a admin" ON public.project_risks
    FOR DELETE TO authenticated USING (public.is_admin());

-- Registro de Testes e Protótipos (prototype_tests)
CREATE TABLE IF NOT EXISTS public.prototype_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsystem TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    result TEXT NOT NULL,
    conclusion TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tester_name TEXT,
    category TEXT NOT NULL DEFAULT 'Geral' CHECK (category IN ('FLL', 'FTC', 'FRC', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.prototype_tests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_prototype_tests_updated_at BEFORE UPDATE ON public.prototype_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem prototype_tests" ON public.prototype_tests
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam testes" ON public.prototype_tests
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
-- O membro que executou o teste (tester_name correspondente ao seu perfil) ou mentores/admins podem editar
CREATE POLICY "Tester ou mentor/admin edita prototype_tests" ON public.prototype_tests
    FOR UPDATE TO authenticated 
    USING (public.is_mentor_or_admin() OR tester_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())) 
    WITH CHECK (public.is_mentor_or_admin() OR tester_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Exclusão de testes restrita a mentores e admins" ON public.prototype_tests
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Projetos Internos de Engenharia (internal_projects)
CREATE TABLE IF NOT EXISTS public.internal_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Em Andamento' CHECK (status IN ('Planejamento', 'Em Andamento', 'Concluído', 'Bloqueado')),
    area TEXT NOT NULL CHECK (area IN ('Mecânica', 'Programação', 'Elétrica', 'Social', 'Geral')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.internal_projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_internal_projects_updated_at BEFORE UPDATE ON public.internal_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem internal_projects" ON public.internal_projects
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Criação de projetos internos por mentores e admins" ON public.internal_projects
    FOR INSERT TO authenticated WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Edição de projetos internos pelo líder ou mentores/admins" ON public.internal_projects
    FOR UPDATE TO authenticated USING (lead_id = auth.uid() OR public.is_mentor_or_admin()) WITH CHECK (lead_id = auth.uid() OR public.is_mentor_or_admin());
CREATE POLICY "Exclusão de projetos internos restrita a admin" ON public.internal_projects
    FOR DELETE TO authenticated USING (public.is_admin());

-- Iniciativas ESG Internas (esg_initiatives)
CREATE TABLE IF NOT EXISTS public.esg_initiatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    pillar TEXT NOT NULL CHECK (pillar IN ('Ambiental', 'Social', 'Governança')),
    status TEXT NOT NULL DEFAULT 'Ideia' CHECK (status IN ('Ideia', 'Em Andamento', 'Implementado')),
    impact_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.esg_initiatives ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_esg_initiatives_updated_at BEFORE UPDATE ON public.esg_initiatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem esg_initiatives" ON public.esg_initiatives
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam esg_initiatives" ON public.esg_initiatives
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
-- Nota de governança: esg_initiatives não possui coluna de autor/responsável.
-- A edição fica restrita a mentores e administradores.
CREATE POLICY "Edição de iniciativas ESG restrita a mentores e admins" ON public.esg_initiatives
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de iniciativas ESG restrita a mentores e admins" ON public.esg_initiatives
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Configuração de Integrações CAD Onshape (onshape_configs)
CREATE TABLE IF NOT EXISTS public.onshape_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_url TEXT,
    workspace_id TEXT,
    document_id TEXT,
    element_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.onshape_configs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_onshape_configs_updated_at BEFORE UPDATE ON public.onshape_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem onshape_configs" ON public.onshape_configs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modificação de onshape_configs restrita a mentores e admins" ON public.onshape_configs
    FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());

-- Presença em Tempo Real de Usuários (user_presences)
CREATE TABLE IF NOT EXISTS public.user_presences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_program TEXT,
    is_online BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_page TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_presences ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_user_presences_updated_at BEFORE UPDATE ON public.user_presences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem presenças" ON public.user_presences
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados registram presença" ON public.user_presences
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Membros atualizam sua própria presença" ON public.user_presences
    FOR UPDATE TO authenticated 
    USING (user_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR public.is_admin()) 
    WITH CHECK (user_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR public.is_admin());
CREATE POLICY "Membros ou admins limpam sua própria presença" ON public.user_presences
    FOR DELETE TO authenticated 
    USING (user_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR public.is_admin());

-- Base de Conhecimento Interno da Equipe (team_knowledge_bases)
CREATE TABLE IF NOT EXISTS public.team_knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_name TEXT,
    team_number_frc TEXT,
    team_number_ftc TEXT,
    founded_date TEXT,
    school_org TEXT,
    city_state TEXT,
    modalities JSONB DEFAULT '[]'::jsonb,
    website TEXT,
    social_media TEXT,
    competition_history JSONB DEFAULT '[]'::jsonb,
    current_members JSONB DEFAULT '[]'::jsonb,
    sponsors JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    extra_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.team_knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_team_knowledge_bases_updated_at BEFORE UPDATE ON public.team_knowledge_bases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem a base de conhecimento" ON public.team_knowledge_bases
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modificação de base de conhecimento restrita a mentores e admins" ON public.team_knowledge_bases
    FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());

-- Configuração de Torneios Ativos / Countdown (tournament_configs)
CREATE TABLE IF NOT EXISTS public.tournament_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_name TEXT NOT NULL,
    tournament_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    category TEXT DEFAULT 'Geral',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tournament_configs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tournament_configs_updated_at BEFORE UPDATE ON public.tournament_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem tournament_configs" ON public.tournament_configs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modificação de tournament_configs restrita a mentores e admins" ON public.tournament_configs
    FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());


-- =====================================================================
-- 🎯 6. PLANOS DE DESENVOLVIMENTO INDIVIDUAL (PDI - DADOS PRIVADOS)
-- =====================================================================

-- PDI FTC (pdis)
CREATE TABLE IF NOT EXISTS public.pdis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_name TEXT NOT NULL,
    main_role TEXT NOT NULL,
    other_roles TEXT,
    time_in_team TEXT,
    photo_url TEXT,
    learning_goal TEXT,
    how_to_learn TEXT,
    activities TEXT,
    main_learning TEXT,
    challenge_learning TEXT,
    teamwork TEXT,
    final_reflection TEXT,
    season TEXT NOT NULL DEFAULT 'DECODE 2025',
    status TEXT NOT NULL DEFAULT 'rascunho',
    certificates JSONB NOT NULL DEFAULT '[]'::jsonb,
    progress_override INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.pdis ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_pdis_updated_at BEFORE UPDATE ON public.pdis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados acessam pdis" ON public.pdis
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam pdis" ON public.pdis
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Membro atualiza o próprio PDI ou mentor/admin atualiza" ON public.pdis
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin() OR member_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (public.is_mentor_or_admin() OR member_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Exclusão de pdis restrita a admin" ON public.pdis
    FOR DELETE TO authenticated USING (public.is_admin());

-- PDI FRC (pdi_frcs)
CREATE TABLE IF NOT EXISTS public.pdi_frcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_name TEXT NOT NULL,
    main_role TEXT NOT NULL,
    other_roles TEXT,
    time_in_team TEXT,
    photo_url TEXT,
    learning_goal TEXT,
    how_to_learn TEXT,
    activities TEXT,
    main_learning TEXT,
    challenge_learning TEXT,
    teamwork TEXT,
    final_reflection TEXT,
    season TEXT NOT NULL DEFAULT 'DECODE 2025',
    status TEXT NOT NULL DEFAULT 'rascunho',
    certificates JSONB NOT NULL DEFAULT '[]'::jsonb,
    progress_override INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.pdi_frcs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_pdi_frcs_updated_at BEFORE UPDATE ON public.pdi_frcs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados acessam pdi_frcs" ON public.pdi_frcs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam pdi_frcs" ON public.pdi_frcs
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Membro atualiza o próprio PDI FRC ou mentor/admin atualiza" ON public.pdi_frcs
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin() OR member_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (public.is_mentor_or_admin() OR member_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Exclusão de pdi_frcs restrita a admin" ON public.pdi_frcs
    FOR DELETE TO authenticated USING (public.is_admin());


-- =====================================================================
-- 🤖 7. FIRST LEGO LEAGUE (FLL - ESTRITAMENTE INTERNO)
-- =====================================================================

-- Membros FLL (fll_members)
CREATE TABLE IF NOT EXISTS public.fll_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Membro',
    avatar_url TEXT,
    subsystem TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fll_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas membros autenticados lêem fll_members" ON public.fll_members
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modificação de fll_members restrita a mentores e admins" ON public.fll_members
    FOR ALL TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());

-- Missões do Tapete FLL (fll_missions)
CREATE TABLE IF NOT EXISTS public.fll_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 0,
    current_score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Não Iniciada' CHECK (status IN ('Não Iniciada', 'Em Desenvolvimento', 'Consistente')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fll_missions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_fll_missions_updated_at BEFORE UPDATE ON public.fll_missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem fll_missions" ON public.fll_missions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Criação de fll_missions restrita a mentores e admins" ON public.fll_missions
    FOR INSERT TO authenticated WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Edição de fll_missions restrita a mentores e admins" ON public.fll_missions
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de missões FLL restrita a mentores e admins" ON public.fll_missions
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Tarefas FLL (fll_tasks)
CREATE TABLE IF NOT EXISTS public.fll_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluida')),
    area TEXT NOT NULL CHECK (area IN ('Robot Design', 'Inovação', 'Core Values', 'Geral')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assignee_name TEXT,
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fll_tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_fll_tasks_updated_at BEFORE UPDATE ON public.fll_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem fll_tasks" ON public.fll_tasks
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam fll_tasks" ON public.fll_tasks
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Responsável ou mentor/admin atualiza tarefas FLL" ON public.fll_tasks
    FOR UPDATE TO authenticated USING (assignee_id = auth.uid() OR public.is_mentor_or_admin()) WITH CHECK (assignee_id = auth.uid() OR public.is_mentor_or_admin());
CREATE POLICY "Exclusão de tarefas FLL restrita a mentores e admins" ON public.fll_tasks
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Anexos e Garras do Robô FLL (fll_attachments)
CREATE TABLE IF NOT EXISTS public.fll_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Passivo', 'Motorizado', 'Troca Rápida', 'Outro')),
    missions_served TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'Protótipo' CHECK (status IN ('Ideia', 'Protótipo', 'Finalizado')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fll_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas membros autenticados lêem fll_attachments" ON public.fll_attachments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Criação de anexos FLL restrita a mentores e admins" ON public.fll_attachments
    FOR INSERT TO authenticated WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Edição de anexos FLL restrita a mentores e admins" ON public.fll_attachments
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de anexos FLL restrita a mentores e admins" ON public.fll_attachments
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Core Values FLL (fll_core_values)
CREATE TABLE IF NOT EXISTS public.fll_core_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value_name TEXT NOT NULL,
    evidence TEXT NOT NULL,
    activity_example TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fll_core_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas membros autenticados lêem fll_core_values" ON public.fll_core_values
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Criação de core values FLL restrita a mentores e admins" ON public.fll_core_values
    FOR INSERT TO authenticated WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Edição de core values FLL restrita a mentores e admins" ON public.fll_core_values
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de core values FLL restrita a mentores e admins" ON public.fll_core_values
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Projeto de Inovação FLL (fll_innovation_projects)
CREATE TABLE IF NOT EXISTS public.fll_innovation_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_definition TEXT NOT NULL,
    proposed_solution TEXT NOT NULL,
    experts_consulted TEXT[] NOT NULL DEFAULT '{}',
    presentation_status TEXT NOT NULL DEFAULT 'Em Desenvolvimento',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fll_innovation_projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_fll_innovation_projects_updated_at BEFORE UPDATE ON public.fll_innovation_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem inovação FLL" ON public.fll_innovation_projects
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Criação de inovação FLL restrita a mentores e admins" ON public.fll_innovation_projects
    FOR INSERT TO authenticated WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Edição de projeto de inovação FLL restrita a mentores e admins" ON public.fll_innovation_projects
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de projetos de inovação FLL restrita a mentores e admins" ON public.fll_innovation_projects
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Preparação para Juízes FLL (fll_judge_preps)
CREATE TABLE IF NOT EXISTS public.fll_judge_preps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('Robot Design', 'Innovation Project', 'Core Values')),
    question TEXT NOT NULL,
    key_points TEXT NOT NULL,
    responsible_student TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.fll_judge_preps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas membros autenticados lêem preparação de juízes FLL" ON public.fll_judge_preps
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados criam preparação de juízes FLL" ON public.fll_judge_preps
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Responsável ou mentor/admin edita preparação de juízes FLL" ON public.fll_judge_preps
    FOR UPDATE TO authenticated 
    USING (public.is_mentor_or_admin() OR responsible_student = (SELECT full_name FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (public.is_mentor_or_admin() OR responsible_student = (SELECT full_name FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Exclusão de perguntas de juízes restrita a mentores e admins" ON public.fll_judge_preps
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());


-- =====================================================================
-- 📊 8. SCOUTING, ALIANÇAS E PARTIDAS FRC/FTC (DADOS ESTRATÉGICOS)
-- =====================================================================

-- Diretório de Equipes Adversárias (teams)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    program TEXT NOT NULL CHECK (program IN ('FRC', 'FTC')),
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Brasil',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas membros autenticados lêem diretório de equipes" ON public.teams
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados cadastram equipes" ON public.teams
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
-- Nota de governança: teams é um diretório coletivo de equipes adversárias.
-- Para evitar corrupção acidental de cadastros oficiais, a edição é restrita a mentores e admins.
CREATE POLICY "Edição de equipes restrita a mentores e admins" ON public.teams
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de equipes restrita a mentores e admins" ON public.teams
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Scouting FRC (frc_scouts)
CREATE TABLE IF NOT EXISTS public.frc_scouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_number TEXT NOT NULL,
    match_number TEXT,
    scout_name TEXT,
    auto_points INTEGER NOT NULL DEFAULT 0,
    teleop_points INTEGER NOT NULL DEFAULT 0,
    endgame_status TEXT,
    defense_rating INTEGER CHECK (defense_rating >= 0 AND defense_rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.frc_scouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas membros autenticados lêem scouting FRC" ON public.frc_scouts
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados registram scout FRC" ON public.frc_scouts
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
CREATE POLICY "Scout ou mentor/admin atualiza scout FRC" ON public.frc_scouts
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin() OR scout_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (public.is_mentor_or_admin() OR scout_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Exclusão de scout FRC restrita a mentores e admins" ON public.frc_scouts
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Scouting FTC (scout_ftcs)
CREATE TABLE IF NOT EXISTS public.scout_ftcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alliance TEXT,
    team_number TEXT,
    match_number TEXT,
    event TEXT,
    efficiency_index INTEGER NOT NULL DEFAULT 0,
    auto_artifacts INTEGER NOT NULL DEFAULT 0,
    auto_left_zone BOOLEAN NOT NULL DEFAULT false,
    auto_conflicts BOOLEAN NOT NULL DEFAULT false,
    teleop_artifacts INTEGER NOT NULL DEFAULT 0,
    teleop_artifacts_other TEXT,
    teleop_cycle_speed TEXT,
    teleop_pattern_ability TEXT,
    teleop_shoot_location TEXT,
    endgame_base TEXT,
    penalty_5pts INTEGER NOT NULL DEFAULT 0,
    penalty_15pts INTEGER NOT NULL DEFAULT 0,
    card TEXT,
    reliability_issues TEXT[] NOT NULL DEFAULT '{}',
    reliability_other TEXT,
    general_observations TEXT[] NOT NULL DEFAULT '{}',
    observations_other TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.scout_ftcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas membros autenticados lêem scouting FTC" ON public.scout_ftcs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados registram scout FTC" ON public.scout_ftcs
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
-- Nota de governança: scout_ftcs não possui coluna de identificação do autor/scout (como 'scout_name TEXT' ou 'user_id UUID REFERENCES public.profiles(id)').
-- Sem essa coluna, é impossível garantir via RLS que um aluno edite apenas o seu próprio registro.
-- Portanto, a edição fica restrita a mentores e administradores até que uma coluna de autoria seja adicionada.
CREATE POLICY "Edição de scout FTC restrita a mentores e admins" ON public.scout_ftcs
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de scout FTC restrita a mentores e admins" ON public.scout_ftcs
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());

-- Partidas e Placar FTC/FRC (matches)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_title TEXT,
    red_team1_number TEXT,
    red_team1_auto_classified INTEGER NOT NULL DEFAULT 0,
    red_team1_auto_overflow INTEGER NOT NULL DEFAULT 0,
    red_team1_auto_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    red_team1_teleop_classified INTEGER NOT NULL DEFAULT 0,
    red_team1_teleop_overflow INTEGER NOT NULL DEFAULT 0,
    red_team1_teleop_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    red_team1_penalties INTEGER NOT NULL DEFAULT 0,
    red_team1_total INTEGER NOT NULL DEFAULT 0,
    red_team2_number TEXT,
    red_team2_auto_classified INTEGER NOT NULL DEFAULT 0,
    red_team2_auto_overflow INTEGER NOT NULL DEFAULT 0,
    red_team2_auto_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    red_team2_teleop_classified INTEGER NOT NULL DEFAULT 0,
    red_team2_teleop_overflow INTEGER NOT NULL DEFAULT 0,
    red_team2_teleop_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    red_team2_penalties INTEGER NOT NULL DEFAULT 0,
    red_team2_total INTEGER NOT NULL DEFAULT 0,
    blue_team1_number TEXT,
    blue_team1_auto_classified INTEGER NOT NULL DEFAULT 0,
    blue_team1_auto_overflow INTEGER NOT NULL DEFAULT 0,
    blue_team1_auto_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    blue_team1_teleop_classified INTEGER NOT NULL DEFAULT 0,
    blue_team1_teleop_overflow INTEGER NOT NULL DEFAULT 0,
    blue_team1_teleop_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    blue_team1_penalties INTEGER NOT NULL DEFAULT 0,
    blue_team1_total INTEGER NOT NULL DEFAULT 0,
    blue_team2_number TEXT,
    blue_team2_auto_classified INTEGER NOT NULL DEFAULT 0,
    blue_team2_auto_overflow INTEGER NOT NULL DEFAULT 0,
    blue_team2_auto_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    blue_team2_teleop_classified INTEGER NOT NULL DEFAULT 0,
    blue_team2_teleop_overflow INTEGER NOT NULL DEFAULT 0,
    blue_team2_teleop_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
    blue_team2_penalties INTEGER NOT NULL DEFAULT 0,
    blue_team2_total INTEGER NOT NULL DEFAULT 0,
    red_total INTEGER NOT NULL DEFAULT 0,
    blue_total INTEGER NOT NULL DEFAULT 0,
    winner TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Apenas membros autenticados lêem dados de partidas" ON public.matches
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros autenticados registram partidas" ON public.matches
    FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());
-- Nota de governança: matches armazena placares e resultados consolidados de alianças.
-- A edição e homologação de partidas é restrita a mentores e administradores.
CREATE POLICY "Edição de partidas restrita a mentores e admins" ON public.matches
    FOR UPDATE TO authenticated USING (public.is_mentor_or_admin()) WITH CHECK (public.is_mentor_or_admin());
CREATE POLICY "Exclusão de partidas restrita a mentores e admins" ON public.matches
    FOR DELETE TO authenticated USING (public.is_mentor_or_admin());


-- =====================================================================
-- ⚡ 9. ÍNDICES DE PERFORMANCE E OTIMIZAÇÃO
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_member_role ON public.profiles(member_role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_team_logs_date ON public.team_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_board_diaries_date ON public.board_diaries(date DESC);

CREATE INDEX IF NOT EXISTS idx_priorities_status ON public.priorities(status);
CREATE INDEX IF NOT EXISTS idx_internal_projects_lead_id ON public.internal_projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_fll_tasks_assignee_id ON public.fll_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_fll_tasks_status ON public.fll_tasks(status);

CREATE INDEX IF NOT EXISTS idx_tir_fotos_team_id ON public.tir_fotos(team_id);
CREATE INDEX IF NOT EXISTS idx_tir_mensagens_created_at ON public.tir_mensagens(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_galleries_year ON public.event_galleries(year DESC);
CREATE INDEX IF NOT EXISTS idx_event_galleries_is_public ON public.event_galleries(is_public);
CREATE INDEX IF NOT EXISTS idx_event_medias_event_id ON public.event_medias(event_id);

CREATE INDEX IF NOT EXISTS idx_pdis_season ON public.pdis(season);
CREATE INDEX IF NOT EXISTS idx_pdi_frcs_season ON public.pdi_frcs(season);

CREATE INDEX IF NOT EXISTS idx_frc_scouts_team ON public.frc_scouts(team_number);
CREATE INDEX IF NOT EXISTS idx_scout_ftcs_team ON public.scout_ftcs(team_number);
CREATE INDEX IF NOT EXISTS idx_user_presences_last_seen ON public.user_presences(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
