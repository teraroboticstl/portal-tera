-- =====================================================================
-- SCHEMA DE BANCO DE DATOS - PORTAL TERA (SUPABASE / POSTGRESQL)
-- =====================================================================
-- Este arquivo define a estrutura relacional moderna, restrições,
-- índices e políticas de Row Level Security (RLS) para o Portal Tera.
-- =====================================================================

-- Habilitar a extensão para geração de UUIDv4 se não estiver ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Triggers de helper para atualização automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- ==========================================
-- 👤 SISTEMA DE USUÁRIOS E PERFIS (RBAC)
-- ==========================================

-- Tabela de perfis públicos que estende auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'aluno' CHECK (role IN ('admin', 'mentor', 'aluno')),
    category TEXT DEFAULT 'Geral' CHECK (category IN ('FLL', 'FTC', 'FRC', 'Marketing', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS para Perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar perfil automaticamente no cadastro do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, category)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Membro'),
        NEW.raw_user_meta_data->>'avatar_url',
        'aluno',
        'Geral'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 📝 LOGS DE AUDITORIA (Segurança)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action_type TEXT NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    description TEXT NOT NULL,
    entity_name TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 📂 SUBSISTEMA OPERACIONAL COMUM
-- ==========================================

-- Diário de Bordo da Diretoria / Comitê
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

CREATE TRIGGER update_board_diaries_updated_at
    BEFORE UPDATE ON public.board_diaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Logs de Trabalho Diário
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours_spent NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    completed_tasks TEXT NOT NULL,
    impediments TEXT NOT NULL DEFAULT 'Nenhum',
    next_steps TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('FLL', 'FTC', 'FRC', 'Marketing', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_daily_logs_updated_at
    BEFORE UPDATE ON public.daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Atas de Reunião
CREATE TABLE IF NOT EXISTS public.meeting_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    attendees TEXT[] NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL,
    action_items TEXT[] NOT NULL DEFAULT '{}',
    category TEXT NOT NULL DEFAULT 'Geral' CHECK (category IN ('FLL', 'FTC', 'FRC', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_meeting_notes_updated_at
    BEFORE UPDATE ON public.meeting_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Iniciativas ESG
CREATE TABLE IF NOT EXISTS public.esg_initiatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Planejado' CHECK (status IN ('Planejado', 'Em Andamento', 'Concluído')),
    impact_metrics TEXT,
    leader_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.esg_initiatives ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_esg_initiatives_updated_at
    BEFORE UPDATE ON public.esg_initiatives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Projetos Internos
CREATE TABLE IF NOT EXISTS public.internal_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    lead_name TEXT NOT NULL,
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluído', 'Cancelado')),
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.internal_projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_internal_projects_updated_at
    BEFORE UPDATE ON public.internal_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prioridades Semanais (Quadro Kanban Geral)
CREATE TABLE IF NOT EXISTS public.priorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Fazendo', 'Concluído')),
    category TEXT NOT NULL CHECK (category IN ('FLL', 'FTC', 'FRC', 'Marketing', 'Geral')),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_priorities_updated_at
    BEFORE UPDATE ON public.priorities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Matriz de Riscos de Projetos
CREATE TABLE IF NOT EXISTS public.project_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    probability TEXT NOT NULL CHECK (probability IN ('Baixa', 'Média', 'Alta')),
    impact TEXT NOT NULL CHECK (impact IN ('Baixo', 'Médio', 'Alto')),
    mitigation_strategy TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Identificado' CHECK (status IN ('Identificado', 'Monitorado', 'Mitigado', 'Ocorrido')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_project_risks_updated_at
    BEFORE UPDATE ON public.project_risks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Registro de Testes de Protótipos Mecânicos/Elétricos
CREATE TABLE IF NOT EXISTS public.prototype_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanism_name TEXT NOT NULL,
    test_objective TEXT NOT NULL,
    results TEXT NOT NULL,
    success_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (success_rate BETWEEN 0.00 AND 100.00),
    improvements_needed TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prototype_tests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_prototype_tests_updated_at
    BEFORE UPDATE ON public.prototype_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Configurações Onshape CAD Integrado
CREATE TABLE IF NOT EXISTS public.onshape_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    element_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('FLL', 'FTC', 'FRC', 'Geral')),
    label TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onshape_configs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_onshape_configs_updated_at
    BEFORE UPDATE ON public.onshape_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 🤖 SUBSISTEMA FLL (FIRST LEGO League)
-- ==========================================

-- Cadastro de Membros Específicos do Subtime FLL
CREATE TABLE IF NOT EXISTS public.fll_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Programador', 'Construtor', 'Designer', 'Apresentador', 'Líder', 'Outro')),
    avatar_url TEXT,
    years_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fll_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fll_members_updated_at
    BEFORE UPDATE ON public.fll_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Missões Oficiais de Mesa de FLL (Temporada Ativa)
CREATE TABLE IF NOT EXISTS public.fll_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    points_scored INTEGER NOT NULL DEFAULT 0,
    rules TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fll_missions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fll_missions_updated_at
    BEFORE UPDATE ON public.fll_missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Kanban de Tarefas de FLL
CREATE TABLE IF NOT EXISTS public.fll_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Done')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fll_tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fll_tasks_updated_at
    BEFORE UPDATE ON public.fll_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cadastro de Anexos/Garras FLL
CREATE TABLE IF NOT EXISTS public.fll_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    onshape_url TEXT,
    image_url TEXT,
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Conceito' CHECK (status IN ('Conceito', 'Testando', 'Aprovado', 'Descartado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fll_attachments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fll_attachments_updated_at
    BEFORE UPDATE ON public.fll_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Diários e Momentos de Core Values FLL
CREATE TABLE IF NOT EXISTS public.fll_core_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    members_involved TEXT[] NOT NULL DEFAULT '{}',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    score INTEGER NOT NULL DEFAULT 1 CHECK (score BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fll_core_values ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fll_core_values_updated_at
    BEFORE UPDATE ON public.fll_core_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Projeto de Inovação de FLL
CREATE TABLE IF NOT EXISTS public.fll_innovation_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    solution_details TEXT NOT NULL,
    tasks TEXT[] NOT NULL DEFAULT '{}',
    feedback TEXT,
    status TEXT NOT NULL DEFAULT 'Ideia' CHECK (status IN ('Ideia', 'Pesquisa', 'Protótipo', 'Validação', 'Concluído')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fll_innovation_projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fll_innovation_projects_updated_at
    BEFORE UPDATE ON public.fll_innovation_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Scripts de Preparação de Apresentação para Juízes FLL
CREATE TABLE IF NOT EXISTS public.fll_judge_preps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area TEXT NOT NULL CHECK (area IN ('Core Values', 'Inovação', 'Design')),
    question TEXT NOT NULL,
    bullet_points_answer TEXT[] NOT NULL DEFAULT '{}',
    assigned_members TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fll_judge_preps ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_fll_judge_preps_updated_at
    BEFORE UPDATE ON public.fll_judge_preps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 🏆 SUBSISTEMA TIR (Torneio Interno de Robótica)
-- ==========================================

-- Equipes do Torneio Interno
CREATE TABLE IF NOT EXISTS public.tir_equipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_name TEXT NOT NULL UNIQUE,
    captain_name TEXT NOT NULL,
    members_list TEXT[] NOT NULL DEFAULT '{}',
    category TEXT NOT NULL CHECK (category IN ('Lego', 'Metal')),
    points INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Desclassificado', 'Finalista')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tir_equipes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tir_equipes_updated_at
    BEFORE UPDATE ON public.tir_equipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mural de Fotos do TIR
CREATE TABLE IF NOT EXISTS public.tir_fotos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    caption TEXT,
    team_id UUID REFERENCES public.tir_equipes(id) ON DELETE CASCADE,
    uploaded_by TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tir_fotos ENABLE ROW LEVEL SECURITY;

-- Mural de Mensagens do TIR (Chat em Tempo Real)
CREATE TABLE IF NOT EXISTS public.tir_mensagens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_announcement BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tir_mensagens ENABLE ROW LEVEL SECURITY;

-- Regulamentos e Regras Oficiais do TIR
CREATE TABLE IF NOT EXISTS public.tir_regras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_title TEXT NOT NULL,
    description TEXT NOT NULL,
    penalty_points INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('Arena', 'Conduta', 'Geral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tir_regras ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tir_regras_updated_at
    BEFORE UPDATE ON public.tir_regras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 📌 ENTIDADES PÚBLICAS, SEASONS, ROBOTS, SPONSORS & SCOUTS (Novas)
-- ==========================================

-- Temporadas (Seasons)
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_name TEXT NOT NULL,
    game_name TEXT,
    kickoff_date DATE,
    competition_date DATE,
    robot_name TEXT,
    robot_weight NUMERIC,
    awards_targeted TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_seasons_updated_at
    BEFORE UPDATE ON public.seasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Robôs (Robots)
CREATE TABLE IF NOT EXISTS public.robots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- FRC, FTC, FLL
    year INTEGER NOT NULL,
    season_name TEXT,
    description TEXT,
    image_url TEXT,
    game_objective TEXT,
    is_current BOOLEAN NOT NULL DEFAULT false,
    cad_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_robots_updated_at
    BEFORE UPDATE ON public.robots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Patrocinadores (Sponsors)
CREATE TABLE IF NOT EXISTS public.sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Apoio',
    logo_url TEXT,
    link TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sponsors_updated_at
    BEFORE UPDATE ON public.sponsors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Projetos em Destaque (Projects)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date_period TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    link TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    images TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Produtos da Loja (Products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    category TEXT NOT NULL DEFAULT 'Camisetas',
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Equipes / Alianças (Teams)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_number TEXT NOT NULL UNIQUE,
    team_name TEXT,
    team_name_source TEXT,
    status TEXT NOT NULL DEFAULT 'Ativa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Scout FRC (frc_scouts)
CREATE TABLE IF NOT EXISTS public.frc_scouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_key TEXT,
    match_number TEXT,
    team_number TEXT,
    alliance_color TEXT,
    scout_name TEXT,
    auto_mobility BOOLEAN NOT NULL DEFAULT false,
    auto_score INTEGER NOT NULL DEFAULT 0,
    teleop_score INTEGER NOT NULL DEFAULT 0,
    teleop_cycles INTEGER NOT NULL DEFAULT 0,
    endgame_action TEXT,
    endgame_score INTEGER NOT NULL DEFAULT 0,
    defense_played BOOLEAN NOT NULL DEFAULT false,
    defense_effectiveness TEXT,
    total_score INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.frc_scouts ENABLE ROW LEVEL SECURITY;

-- Scout FTC (scout_ftcs)
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

-- Partidas FTC (Matches)
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

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_pdis_updated_at
    BEFORE UPDATE ON public.pdis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_pdi_frcs_updated_at
    BEFORE UPDATE ON public.pdi_frcs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Logs de Equipes (team_logs)
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

CREATE TRIGGER update_team_logs_updated_at
    BEFORE UPDATE ON public.team_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_event_galleries_updated_at
    BEFORE UPDATE ON public.event_galleries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mídia de Eventos (event_medias)
CREATE TABLE IF NOT EXISTS public.event_medias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.event_galleries(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_medias ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 🔍 CRIAÇÃO DE ÍNDICES DE PERFORMANCE
-- ==========================================

-- Perfis e Auditoria
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Operacionais
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_priorities_status ON public.priorities(status);
CREATE INDEX IF NOT EXISTS idx_internal_projects_lead_id ON public.internal_projects(lead_id);

-- FLL
CREATE INDEX IF NOT EXISTS idx_fll_tasks_assignee_id ON public.fll_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_fll_tasks_status ON public.fll_tasks(status);

-- TIR
CREATE INDEX IF NOT EXISTS idx_tir_fotos_team_id ON public.tir_fotos(team_id);
CREATE INDEX IF NOT EXISTS idx_tir_mensagens_created_at ON public.tir_mensagens(created_at);

-- Galeria e Scouts
CREATE INDEX IF NOT EXISTS idx_event_galleries_year ON public.event_galleries(year);
CREATE INDEX IF NOT EXISTS idx_event_medias_event_id ON public.event_medias(event_id);
CREATE INDEX IF NOT EXISTS idx_frc_scouts_team ON public.frc_scouts(team_number);
CREATE INDEX IF NOT EXISTS idx_scout_ftcs_team ON public.scout_ftcs(team_number);


-- ==========================================
-- 🔒 POLÍTICAS DE RLS PADRÃO (Políticas de Segurança)
-- ==========================================

-- 1. Perfis (Profiles)
CREATE POLICY "Leitura pública de perfis" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Atualização própria ou por admin" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 2. Logs de Trabalho (Daily Logs)
CREATE POLICY "Usuários autenticados podem ler logs" ON public.daily_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar seus próprios logs" ON public.daily_logs
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios logs ou admins/mentores" ON public.daily_logs
    FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

CREATE POLICY "Usuários podem deletar seus próprios logs ou admins" ON public.daily_logs
    FOR DELETE USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 3. Mural de Mensagens TIR (Mural aberto para leitura pública, escrita apenas autenticada)
CREATE POLICY "Leitura pública de mensagens TIR" ON public.tir_mensagens
    FOR SELECT USING (true);

CREATE POLICY "Envio autenticado de mensagens TIR" ON public.tir_mensagens
    FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Logs de Auditoria (Apenas Administradores podem visualizar e ninguém pode editar/deletar)
CREATE POLICY "Visualização restrita a admins" ON public.audit_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Inserção pelo sistema autenticado" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- 5. POLÍTICAS GENÉRICAS PARA OUTRAS TABELAS (Permite leitura pública e escrita por usuários autenticados para agilizar desenvolvimento)

-- Seasons
CREATE POLICY "Leitura pública seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada seasons" ON public.seasons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Robots
CREATE POLICY "Leitura pública robots" ON public.robots FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada robots" ON public.robots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sponsors
CREATE POLICY "Leitura pública sponsors" ON public.sponsors FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada sponsors" ON public.sponsors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projects
CREATE POLICY "Leitura pública projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "Leitura pública products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Teams
CREATE POLICY "Leitura pública teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada teams" ON public.teams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FRC Scouts
CREATE POLICY "Leitura pública frc_scouts" ON public.frc_scouts FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada frc_scouts" ON public.frc_scouts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Scout FTC
CREATE POLICY "Leitura pública scout_ftcs" ON public.scout_ftcs FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada scout_ftcs" ON public.scout_ftcs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Matches
CREATE POLICY "Leitura pública matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada matches" ON public.matches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PDI FTC
CREATE POLICY "Leitura pública pdis" ON public.pdis FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada pdis" ON public.pdis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PDI FRC
CREATE POLICY "Leitura pública pdi_frcs" ON public.pdi_frcs FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada pdi_frcs" ON public.pdi_frcs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Team Logs
CREATE POLICY "Leitura pública team_logs" ON public.team_logs FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada team_logs" ON public.team_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Event Galleries
CREATE POLICY "Leitura pública event_galleries" ON public.event_galleries FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada event_galleries" ON public.event_galleries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Event Medias
CREATE POLICY "Leitura pública event_medias" ON public.event_medias FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada event_medias" ON public.event_medias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Board Diaries
CREATE POLICY "Leitura pública board_diaries" ON public.board_diaries FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada board_diaries" ON public.board_diaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ESG Initiatives
CREATE POLICY "Leitura pública esg_initiatives" ON public.esg_initiatives FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada esg_initiatives" ON public.esg_initiatives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Internal Projects
CREATE POLICY "Leitura pública internal_projects" ON public.internal_projects FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada internal_projects" ON public.internal_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Priorities
CREATE POLICY "Leitura pública priorities" ON public.priorities FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada priorities" ON public.priorities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project Risks
CREATE POLICY "Leitura pública project_risks" ON public.project_risks FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada project_risks" ON public.project_risks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Prototype Tests
CREATE POLICY "Leitura pública prototype_tests" ON public.prototype_tests FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada prototype_tests" ON public.prototype_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Onshape Configs
CREATE POLICY "Leitura pública onshape_configs" ON public.onshape_configs FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada onshape_configs" ON public.onshape_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FLL Members
CREATE POLICY "Leitura pública fll_members" ON public.fll_members FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada fll_members" ON public.fll_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FLL Missions
CREATE POLICY "Leitura pública fll_missions" ON public.fll_missions FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada fll_missions" ON public.fll_missions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FLL Tasks
CREATE POLICY "Leitura pública fll_tasks" ON public.fll_tasks FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada fll_tasks" ON public.fll_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FLL Attachments
CREATE POLICY "Leitura pública fll_attachments" ON public.fll_attachments FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada fll_attachments" ON public.fll_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FLL Core Values
CREATE POLICY "Leitura pública fll_core_values" ON public.fll_core_values FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada fll_core_values" ON public.fll_core_values FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FLL Innovation Projects
CREATE POLICY "Leitura pública fll_innovation_projects" ON public.fll_innovation_projects FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada fll_innovation_projects" ON public.fll_innovation_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FLL Judge Preps
CREATE POLICY "Leitura pública fll_judge_preps" ON public.fll_judge_preps FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada fll_judge_preps" ON public.fll_judge_preps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TIR Equipes
CREATE POLICY "Leitura pública tir_equipes" ON public.tir_equipes FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada tir_equipes" ON public.tir_equipes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TIR Fotos
CREATE POLICY "Leitura pública tir_fotos" ON public.tir_fotos FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada tir_fotos" ON public.tir_fotos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TIR Regras
CREATE POLICY "Leitura pública tir_regras" ON public.tir_regras FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada tir_regras" ON public.tir_regras FOR ALL TO authenticated USING (true) WITH CHECK (true);
