# Rotas e Navegação (ROUTES.md)

Este documento mapeia todas as rotas públicas e internas do **Portal Tera**, detalhando as regras de navegação e as restrições de segurança aplicadas.

---

## 🌎 Rotas Públicas (Acesso Sem Autenticação)

As rotas públicas estão disponíveis para qualquer visitante no endereço raiz e são declaradas em `src/App.jsx`.

| Rota | Componente de Página | Descrição |
| :--- | :--- | :--- |
| `/` | `Home.jsx` | Página inicial com slideshow, destaques de robótica e patrocinadores. |
| `/about` | `About.jsx` | História da equipe Tera, missão, valores e infraestrutura. |
| `/team` | `Team.jsx` | Apresentação do elenco de alunos, capitães e mentores. |
| `/sponsors` | `Sponsors.jsx` | Espaço dedicado a expor e captar novos patrocinadores. |
| `/contact` | `Contact.jsx` | Canais oficiais de contato e redes sociais. |
| `/current-robot` | `CurrentRobot` | Ficha técnica detalhada do robô em desenvolvimento na temporada. |
| `/engineering` | `Engineering` | Métodos de engenharia, logs de fabricação e design de protótipos. |
| `/gallery` | `EventGalleryPublic` | Galeria pública de imagens dos principais torneios e oficinas. |
| `/competitions` | `Competitions` | Visão geral dos programas e histórico competitivo. |
| `/competitions/fll`| `CompetitionsFLL` | Histórico específico e regras da FIRST LEGO League. |
| `/competitions/ftc`| `CompetitionsFTC` | Histórico específico e regras da FIRST Tech Challenge. |
| `/competitions/frc`| `CompetitionsFRC` | Histórico específico e regras da FIRST Robotics Competition. |
| `/shop` | `TeraShop.jsx` | Loja virtual com roupas, canecas e souvenirs oficiais da equipe. |
| `/memoria` | `Memoria.jsx` | Linha do tempo interativa relatando a história e conquistas do time. |
| `/memorial` | `Memorial.jsx` | Memorial histórico de robôs, banners e conquistas anteriores. |
| `/fll-scorer` | `FLLScorer.jsx` | Calculadora pública de pontuação para treinos de FLL da temporada. |
| `/setup-admin` | `SetupAdmin.jsx` | Utilitário inicial para provisionamento do primeiro administrador. |
| `/tir2026` | `TIR2026.jsx` | Hub público do Torneio Interno de Robótica (TIR) de 2026. |

---

## 🔒 Rotas Protegidas (Área Interna)

Todas as rotas da Área Interna residem sob o prefixo `/interna`. Elas são empacotadas dentro do componente `ProtectedRoute.jsx`, exigindo autenticação ativa e correspondência de perfis cadastrados.

### 🏠 Painéis Gerais da Área Interna
- `/interna` ou `/interna/dashboard`: **Dashboard Geral** (`AreaInterna.jsx`) - Visão unificada com atalhos de rotinas, contagem regressiva e anúncios.
- `/interna/daily-logs`: **Logs Diários** (`InternalLogs.jsx`) - Listagem e envio de logs de trabalho individuais.
- `/interna/meetings`: **Notas de Reunião** (`InternalMeetings.jsx`) - Repositório de atas e agendamento de reuniões.
- `/interna/prototypes`: **Testes de Protótipo** (`InternalPrototypes.jsx`) - Cadastro e histórico de relatórios de testes mecânicos.
- `/interna/risk`: **Matriz de Riscos** (`InternalRiskAnalysis.jsx`) - Identificação e monitoramento de riscos do projeto.
- `/interna/projects`: **Gestão de Projetos** (`InternalProjectsDashboard.jsx`) - Painel geral de entregas.
- `/interna/projects/:id`: **Detalhes do Projeto** (`ProjectDetail.jsx`) - Detalhamento e tarefas de um projeto específico.
- `/interna/board-diary`: **Diário de Bordo** (`InternalBoardDiary.jsx`) - Diários de bordo gerais da equipe.
- `/interna/gallery`: **Gestão da Galeria** (`InternalEventGallery.jsx`) - Upload e controle de imagens para exibição pública.
- `/interna/memorial`: **Gestão do Memorial** (`InternalMemorial.jsx`) - Cadastro de itens de arquivo histórico.
- `/interna/archive`: **Acervo das Temporadas** (`InternalSeasonArchive.jsx`) - Arquivo de relatórios, códigos e dados de temporadas concluídas.

### 📐 Integrações de CAD
- `/interna/cad-config`: **Configuração CAD** (`InternalCADConfig.jsx`) - Cadastro de links de montagens Onshape.
- `/interna/cad-assistant`: **Assistente CAD** (`InternalCADAssistant.jsx`) - Visualizador interativo e assistente técnico de montagem mecânica.

### 🤖 Painel FIRST LEGO League (FLL)
- `/interna/fll`: Hub da Categoria FLL (`InternalFLL.jsx`).
- `/interna/fll/dashboard`: Painel de Indicadores e Atividades (`InternalFLLDashboard.jsx`).
- `/interna/fll/tasks`: Kanban de Tarefas de FLL (`InternalFLLTasks.jsx`).
- `/interna/fll/meetings`: Atas de Reuniões de FLL (`InternalFLLMeetings.jsx`).
- `/interna/fll/team`: Organograma e Perfis FLL (`InternalFLLTeam.jsx`).
- `/interna/fll/missions`: Simulador de Missões e Práticas de Mesa (`InternalFLLMissions.jsx`).
- `/interna/fll/attachments`: Gestão de Anexos do Robô Lego (`InternalFLLAttachments.jsx`).
- `/interna/fll/core-values`: Atividades de Core Values (`InternalFLLCoreValues.jsx`).
- `/interna/fll/innovation`: Desenvolvimento do Projeto Científico (`InternalFLLInnovation.jsx`).
- `/interna/fll/judge-prep`: Simulação de Apresentação com Juízes (`InternalFLLJudgePrep.jsx`).

### ⚙️ Painel FIRST Tech Challenge (FTC)
- `/interna/ftc`: Hub da Categoria FTC (`InternalFTC.jsx`).
- `/interna/ftc/scout`: Registro de Telemetria de Partidas FTC (`InternalFTCScout.jsx`).
- `/interna/ftc/scorer`: Simulador de Pontuação FTC Oficial (`InternalFTCScorer.jsx`).
- `/interna/ftc/matches`: Visualização de Partidas Gravadas (`InternalFTCMatches.jsx`).
- `/interna/ftc/qualifiers`: Avaliação de Times Adversários em Qualificatórias (`InternalFTCQualifiersScout.jsx`).
- `/interna/ftc/teams`: Cadastro de Equipes Desafiantes FTC (`InternalFTCTeams.jsx`).
- `/interna/ftc/pdi`: Acompanhamento de PDI de FTC (`InternalFTCPDI.jsx`).

### 🛠️ Painel FIRST Robotics Competition (FRC)
- `/interna/frc`: Hub da Categoria FRC (`InternalFRC.jsx`).
- `/interna/frc/scout`: Registro de Telemetria de Partidas FRC (`InternalFRCScout.jsx`).
- `/interna/frc/picklist`: Ordenador de Alianças para Fases Finais FRC (`InternalFRCPicklist.jsx`).
- `/interna/frc/match-history`: Registro Histórico de Partidas Concluídas (`InternalFRCMatchHistory.jsx`).
- `/interna/frc/matches`: Planejamento e Análise de Confrontos FRC (`InternalFRCMatches.jsx`).
- `/interna/frc/teams`: Cadastro de Equipes do Ecossistema FRC (`InternalFRCTeams.jsx`).
- `/interna/frc/teams-register`: Registro Detalhado de Novos Times no Scouting (`InternalFRCTeamsRegister.jsx`).
- `/interna/frc/pdi`: Acompanhamento de PDI de FRC (`InternalFRCPDI.jsx`).

### ⚙️ Administração e Configurações de Sistema
- `/interna/tir-admin`: **Gestão do TIR** (`TIRAdmin.jsx`) - Monitoramento de inscrições e regras do torneio interno de integração.
- `/interna/admin`: **Painel de Controle Geral** (`AdminPanel.jsx`) - Configurações críticas, controle de membros cadastrados e parametrização geral.
- `/interna/audit`: **Auditoria de Logs** (`InternalAuditLog.jsx`) - Painel de leitura dos logs gerados automaticamente pela camada `src/lib/audit.js`.

---

## 🛡️ Guarda de Rotas e Verificação de Papéis

A proteção de rotas no Portal Tera ocorre a partir de dois mecanismos trabalhando em sincronia:
1. **`ProtectedRoute.jsx`**: Envolve as rotas internas garantindo que o estado de `isAuthenticated` do `AuthContext` seja verdadeiro. Caso contrário, redireciona para a tela de login SSO.
2. **`pages.config.js`**: Centraliza os mapeamentos e as restrições de cada página interna por tipo de papel (Ex: Aluno, Mentor, Administrador). Se o usuário logado possuir restrições para a categoria (ex: um membro de FLL tentando entrar em scouts do FTC/FRC), o sistema impede a visualização renderizando uma tela informativa de acesso não autorizado.
