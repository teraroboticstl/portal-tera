# Componentes e Interface do Usuário (COMPONENTS.md)

O **Portal Tera** possui um rico catálogo de componentes organizados para promover o reuso de código e manter a consistência visual em toda a plataforma.

---

## 🎨 Componentes Comuns (`src/components/common/`)

Componentes reutilizáveis básicos de estilo e feedback:
- **`Badge.jsx`**: Distintivos compactos utilizados para destacar categorias (ex: "FLL", "FTC", "FRC") ou status de tarefas (ex: "Concluído", "Em Andamento").
- **`Card.jsx`**: Container base com bordas sutis e sombras suaves que organiza o conteúdo visual de forma elegante.
- **`LoadingSpinner.jsx`**: Animação de carregamento circular de alta performance baseada em CSS Tailwind para transição de estados assíncronos.
- **`SectionTitle.jsx`**: Cabeçalhos padronizados que estabelecem ritmo tipográfico nas transições de seções das páginas públicas.

---

## 🤖 Componentes de FLL (`src/components/fll/`)

Painéis e widgets específicos para a equipe da FIRST LEGO League:
- **`FLLLeaderboard.jsx`**: Tabela dinâmica de classificação de scores que ordena tentativas de rounds de treino baseados em maior pontuação.
- **`FLLMissions.jsx`**: Lista interativa das missões oficiais da temporada de FLL, permitindo marcar sub-tarefas e somar pontos em tempo real.
- **`FLLTeamPanel.jsx`**: Organiza as informações e avatares dos membros dedicados à categoria.
- **`FLLTimer.jsx`**: Cronômetro de contagem regressiva pré-definido para o tempo regulamentar de rounds de robótica (2 minutos e 50 segundos), com sinais sonoros e controles rápidos de Iniciar, Pausar e Resetar.
- **`TerAIChat.jsx`**: Chat assistido por Inteligência Artificial (Mentor Tera AI) integrado que permite que alunos de FLL tirem dúvidas operacionais e de regras de competições.

---

## 🏎️ Componentes de Scouting e FRC (`src/components/frc/` & `src/components/scout/`)

Sistemas dedicados ao monitoramento e análise de alianças e robôs adversários em campeonatos:
- **`FastScoutInterface.jsx`**: Formulário ágil focado na coleta rápida de métricas em arenas (tempo de ciclo, carregamento de notas, defesas).
- **`ScoutForm.jsx`**: Formulário detalhado de telemetria manual de partidas coletando dados autônomos, de teleoperação e endgame.
- **`ScoutProcessTab.jsx`**: Interface em abas para navegar entre registro, listagem e análise visual.
- **`TeamAnalysis.jsx`**: Painel analítico de equipes contendo médias de pontuação, taxas de acerto e gráficos representados com a biblioteca **Recharts**.

---

## 🏢 Componentes da Área Interna (`src/components/internal/`)

Utilitários de colaboração e produtividade das equipes dentro do portal autenticado:
- **`OnlineUsers.jsx` e `usePresence.jsx`**: Widget e hook para monitorar e exibir em tempo real a presença dos membros logados na Área Interna, estimulando o senso de equipe.
- **`PrioritiesBoard.jsx`**: Quadro Kanban integrado de prioridades semanais. Permite arrastar e soltar (utilizando `@hello-pangea/dnd`) cartões de tarefas e alterar status (Pendente, Fazendo, Concluído).
- **`PDIProgressBar.jsx` e `FTCPDISection.jsx`**: Acompanhamento visual dos Planos de Desenvolvimento Individual (PDI) dos alunos, exibindo progresso de metas e tarefas.
- **`DailyLogForm.jsx`**: Janela flutuante (Dialog) para submissão ágil do relatório diário de trabalho.
- **`MeetingForm.jsx`**: Criador de atas de reunião, registrando data, presentes, resumo e pendências.
- **`PrototypeForm.jsx`**: Formulário técnico para cadastrar testes de protótipos mecânicos e elétricos.
- **`Countdown.jsx`**: Painel visual de contagem regressiva para a data da próxima competição nacional/regional.

---

## 💬 Componentes do Torneio Interno (TIR)

- **`ChatMentor.jsx` (`src/components/tir/`)**: Sala de chat interativa que permite comunicação imediata entre mentores da equipe de robótica e as equipes inscritas no torneio interno de integração.

---

## 🧩 Primitivas UI Shadcn (`src/components/ui/`)

Biblioteca de base agnóstica de design integrada a partir do Radix UI. Os componentes são estilizados localmente com classes Tailwind CSS e fornecem recursos robustos de acessibilidade (WAI-ARIA) prontos para uso:
- **Layouts e Abas**: `tabs.jsx`, `sheet.jsx`, `sidebar.jsx`, `scroll-area.jsx`, `resizable.jsx`, `separator.jsx`.
- **Formulários**: `input.jsx`, `textarea.jsx`, `checkbox.jsx`, `radio-group.jsx`, `select.jsx`, `slider.jsx`, `switch.jsx`, `form.jsx`, `label.jsx`.
- **Modais e Overlays**: `dialog.jsx`, `drawer.jsx`, `popover.jsx`, `alert-dialog.jsx`, `hover-card.jsx`, `tooltip.jsx`.
- **Feedback e Status**: `alert.jsx`, `badge.jsx`, `progress.jsx`, `skeleton.jsx`, `toast.jsx`, `toaster.jsx`, `sonner.jsx`.
- **Navegação e Seleção**: `dropdown-menu.jsx`, `menubar.jsx`, `navigation-menu.jsx`, `pagination.jsx`, `command.jsx`, `calendar.jsx`.
