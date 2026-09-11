# Banco de Dados e Entidades (DATABASE.md)

O **Portal Tera** utiliza um banco de dados NoSQL gerenciado (Firestore) por baixo dos panos, integrado através do sistema de **Entidades Declarativas do Base44**.

---

## 💾 O Sistema de Entidades do Base44

Ao contrário dos bancos de dados relacionais tradicionais que usam SQL e migrações de esquemas de tabelas, o Base44 opera com arquivos de especificação de esquema no formato **JSONC** (JSON com suporte a comentários) localizados no diretório `/base44/entities/`.

Cada arquivo JSONC descreve uma entidade como um objeto JSON Schema. O SDK do Base44 lê essas configurações e disponibiliza em tempo de execução operações CRUD (Create, Read, Update, Delete) fortemente tipadas e validadas no lado do cliente e do servidor.

---

## 📊 Detalhamento das Entidades Existentes

Atualmente, o projeto possui **21 entidades** declaradas. Abaixo está a lista detalhada de cada uma delas, seus objetivos de negócio e atributos principais:

### 1. `AuditLog.jsonc` (Log de Auditoria)
- **Objetivo**: Registrar ações críticas realizadas por usuários (segurança, auditoria e histórico).
- **Propriedades**: `user_id`, `user_name`, `user_email`, `action_type` (CREATE, UPDATE, DELETE, etc.), `description`, `entity_name`, `user_agent`.

### 2. `BoardDiary.jsonc` (Diário de Bordo Geral)
- **Objetivo**: Diários de bordo associados aos comitês ou conselhos da equipe.
- **Propriedades**: `title`, `content`, `author_id`, `author_name`, `date`, `category` (FLL, FTC, FRC, Geral).

### 3. `DailyLog.jsonc` (Logs de Trabalho Diário)
- **Objetivo**: Registro diário de atividades de cada membro em reuniões ou oficinas.
- **Propriedades**: `user_id`, `user_name`, `date`, `hours_spent`, `completed_tasks`, `impediments`, `next_steps`, `category`.

### 4. `ESGInitiative.jsonc` (Iniciativas ESG)
- **Objetivo**: Acompanhar ações sociais, sustentáveis e educacionais da equipe (Environmental, Social, and Governance).
- **Propriedades**: `title`, `description`, `date`, `status` (Planejado, Em Andamento, Concluído), `impact_metrics`, `leader_name`.

### 5. `FLLAttachment.jsonc` (Anexos e Peças FLL)
- **Objetivo**: Catálogo de garras e acessórios do robô da categoria FLL.
- **Propriedades**: `name`, `description`, `onshape_url`, `image_url`, `created_by`, `status` (Conceito, Testando, Aprovado).

### 6. `FLLCoreValues.jsonc` (Valores Core FLL)
- **Objetivo**: Registro de momentos, treinos e atividades que exemplificam os valores da FIRST (Inclusão, Impacto, Diversão, Trabalho em Equipe, Coopertition).
- **Propriedades**: `title`, `description`, `members_involved`, `date`, `score` (Auto-avaliação).

### 7. `FLLInnovationProject.jsonc` (Projeto de Inovação FLL)
- **Objetivo**: Controle de tarefas, hipóteses e etapas do projeto científico exigido na FLL.
- **Propriedades**: `title`, `problem_statement`, `solution_details`, `tasks`, `feedback`, `status`.

### 8. `FLLJudgePrep.jsonc` (Preparação de Apresentação FLL)
- **Objetivo**: Script de preparação para as sabatinas com os juízes.
- **Propriedades**: `area` (Core Values, Inovação, Design), `question`, `bullet_points_answer`, `assigned_members`.

### 9. `FLLMember.jsonc` (Membros da Equipe FLL)
- **Objetivo**: Cadastro específico e papéis de membros do subtime de FLL.
- **Propriedades**: `name`, `role` (Programador, Construtor, Designer), `avatar_url`, `years_active`.

### 10. `FLLMission.jsonc` (Missões da Temporada FLL)
- **Objetivo**: Cadastro de missões ativas da arena oficial da temporada (ex: Submerged) para cálculo de scores.
- **Propriedades**: `mission_number`, `title`, `description`, `max_score`, `completed`, `points_scored`, `rules`.

### 11. `FLLTask.jsonc` (Tarefas FLL)
- **Objetivo**: Quadro kanban interno exclusivo do time FLL.
- **Propriedades**: `title`, `description`, `status` (Todo, In Progress, Done), `priority` (High, Medium, Low), `assignee_id`.

### 12. `InternalProject.jsonc` (Projetos Internos)
- **Objetivo**: Gestão de entregáveis grandes que abrangem toda a robótica (como organização de torneios, campanhas de patrocínio, etc.).
- **Propriedades**: `name`, `description`, `lead_id`, `lead_name`, `deadline`, `status`, `progress_percentage`.

### 13. `MeetingNote.jsonc` (Notas de Reunião)
- **Objetivo**: Atas de reuniões gerais de planejamento de robótica.
- **Propriedades**: `title`, `date`, `attendees`, `summary`, `action_items` (lista de afazeres acordados), `category`.

### 14. `OnshapeConfig.jsonc` (Configurações CAD Onshape)
- **Objetivo**: Parâmetros de conexão para visualização dinâmica do robô modelado no Onshape CAD.
- **Propriedades**: `document_id`, `workspace_id`, `element_id`, `category` (FLL, FTC, FRC), `label`, `is_active`.

### 15. `Priority.jsonc` (Prioridades de Equipe)
- **Objetivo**: Quadro Kanban macro da Área Interna que ajuda a alinhar os times nas prioridades da semana.
- **Propriedades**: `title`, `description`, `status` (Pendente, Fazendo, Concluído), `category` (FTC, FRC, FLL, Marketing), `due_date`.

### 16. `ProjectRisk.jsonc` (Gestão de Riscos)
- **Objetivo**: Matriz de riscos operacionais (falta de peças, quebra de robô no torneio, prazos apertados).
- **Propriedades**: `title`, `probability` (Baixa, Média, Alta), `impact` (Baixo, Médio, Alto), `mitigation_strategy`, `status` (Identificado, Monitorado, Mitigado).

### 17. `PrototypeTest.jsonc` (Testes de Protótipo)
- **Objetivo**: Log de engenharia registrando testes físicos de subsistemas (lançadores de argolas, garras, rodas de tração).
- **Propriedades**: `mechanism_name`, `test_objective`, `results`, `success_rate`, `improvements_needed`, `date`.

### 18. `TIREquipe.jsonc` (Equipes TIR - Torneio Interno)
- **Objetivo**: Registro de escopos e elencos do Torneio Interno de Robótica (TIR).
- **Propriedades**: `team_name`, `captain_name`, `members_list`, `category` (Lego, Metal), `points`, `status`.

### 19. `TIRFoto.jsonc` (Fotos do TIR)
- **Objetivo**: Galeria de mídia do torneio interno.
- **Propriedades**: `image_url`, `caption`, `team_id`, `uploaded_by`, `likes_count`.

### 20. `TIRMensagem.jsonc` (Mural de Mensagens TIR)
- **Objetivo**: Sistema de chat/mural em tempo real de mensagens para engajamento no torneio.
- **Propriedades**: `sender_name`, `content`, `timestamp`, `is_announcement`.

### 21. `TIRRegra.jsonc` (Regulamento do TIR)
- **Objetivo**: Regras cadastráveis do torneio interno.
- **Propriedades**: `rule_title`, `description`, `penalty_points`, `category` (Arena, Conduta).

---

## 🔒 Regras de Segurança e Proteção

Cada entidade declarativa possui, por padrão, as regras de segurança herdadas do console Base44. Na aplicação, as permissões de gravação de dados são controladas através de rotas protegidas em `src/App.jsx` com o componente `ProtectedRoute`, e validadas também no momento da chamada pela injeção do token JWT do usuário ativo no cabeçalho das requisições.
