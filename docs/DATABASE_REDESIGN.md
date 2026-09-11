# Redesenho de Banco de Dados: NoSQL (Base44) para Relacional (Supabase) (DATABASE_REDESIGN.md)

Este documento descreve detalhadamente as decisões arquitetônicas, melhorias estruturais e estratégias de modelagem de dados adotadas na transição do banco de dados NoSQL do **Base44** para o banco relacional **PostgreSQL** do **Supabase**.

---

## 🏛️ Decisões Arquitetônicas Críticas

O banco NoSQL original baseava-se em coleções desacopladas do Firestore (com esquemas JSONC declarados no Base44), sem integridade referencial nativa nem tipagem rigorosa na camada de persistência. Para o Supabase, estruturamos uma modelagem **Totalmente Relacional**, aproveitando todos os recursos avançados do PostgreSQL.

### 1. Sistema de Usuários Unificado (Profiles & Auth)
No Base44, a verificação de usuários e perfis de controle de acesso (RBAC) dependia de uma estrutura híbrida gerenciada no SSO e coleções de dados indiretas.
- **Nova Abordagem (Supabase Native Auth)**:
  - Criamos a tabela `public.profiles` estendendo a tabela de usuários nativa do sistema (`auth.users`).
  - Implementamos uma trigger SQL de segurança (`on_auth_user_created`) que garante que **qualquer novo cadastro** realizado via Google OAuth ou e-mail/senha gere instantaneamente um perfil de membro sincronizado na tabela pública com perfil `aluno` por padrão.
  - O controle de acesso por papéis (RBAC - `admin`, `mentor`, `aluno`) e categoria (`FLL`, `FTC`, `FRC`, `Marketing`, `Geral`) agora é armazenado diretamente no perfil, otimizando verificações e acelerando consultas.

### 2. Identificadores Universais (`UUID` vs. Strings de Texto)
- **Melhoria**: No Base44, as chaves primárias eram strings auto-geradas flexíveis. No PostgreSQL, todas as tabelas operacionais utilizam `UUID PRIMARY KEY DEFAULT uuid_generate_v4()`.
- **Benefício**: Segurança aprimorada contra enumeração de chaves, compatibilidade perfeita com o ID nativo da tabela de autenticação e facilidade de integração em sistemas distribuídos.

### 3. Integridade Referencial Estrita (`FOREIGN KEY`)
- **Melhoria**: Todas as relações entre as entidades foram mapeadas utilizando chaves estrangeiras (`FOREIGN KEY`) com comportamentos explícitos em cascata.
  - Exemplo: Quando uma equipe do Torneio Interno de Robótica (`tir_equipes`) é excluída, todas as suas mídias associadas (`tir_fotos`) são apagadas automaticamente usando `ON DELETE CASCADE`.
  - Exemplo: Se o perfil de um usuário for removido, suas contribuições em reuniões ou projetos não quebram o banco, permanecendo preservadas sob autoria anônima através de `ON DELETE SET NULL`.

### 4. Timestamps Inteligentes e Atualização Automatizada
- **Melhoria**: Todas as tabelas agora registram obrigatoriamente a data de criação (`created_at`) e a data da última modificação (`updated_at`).
- **Triggers Pl/pgSQL**: Implementamos uma trigger global de atualização de data (`update_updated_at_column`) que recalcula de forma transparente o valor de `updated_at` sempre que uma instrução `UPDATE` for disparada na tabela, eliminando a responsabilidade do cliente React de gerenciar esses campos de controle.

### 5. Otimização de Consultas via Índices (`INDEX`)
Para assegurar tempos de resposta abaixo de 50ms para as equipes de robótica durante torneios e treinos intensos, criamos índices em colunas estratégicas:
- Índices de chaves estrangeiras com alta cardinalidade (ex: `idx_daily_logs_user_id`, `idx_tir_fotos_team_id`).
- Índices de colunas de status e data para otimizar painéis Kanban e relatórios temporais (ex: `idx_priorities_status`, `idx_daily_logs_date`).

---

## 🔒 Segurança de Dados via RLS (Row Level Security)

Ao contrário do Base44, onde as regras dependiam de arquivos externos de diretivas, o Supabase executa a segurança **diretamente na camada do banco de dados**. O RLS impede qualquer acesso direto não autorizado, mesmo se o atacante capturar a chave pública (`anon_key`).

### Políticas de Segurança Configuradas:
- **Perfis (`profiles`)**: Leitura pública para que os alunos vejam quem são seus colegas de equipe, mas edição estritamente restrita ao próprio dono da conta ou administradores.
- **Logs de Trabalho (`daily_logs`)**: Leitura irrestrita para alunos autenticados, gravação vinculada estritamente à própria credencial (`auth.uid()`), permitindo atualização apenas pelo autor ou por mentores/administradores do projeto.
- **Logs de Auditoria (`audit_logs`)**: Visibilidade restrita exclusivamente para administradores do sistema (`role = 'admin'`), e gravação autorizada para todo o ecossistema que processa ações, bloqueando qualquer modificação ou exclusão subsequente.

---

## 📈 Tabela Comparativa de Melhorias

| Tabela / Conceito | No Base44 (NoSQL) | No Supabase (PostgreSQL Relacional) | Melhoria Prática |
| :--- | :--- | :--- | :--- |
| **Identificadores** | String arbitrária | `UUID` strongly typed | Consistência e unicidade garantida no ecossistema de dados. |
| **Integridade** | Sem validação em banco | `FOREIGN KEY` + `CHECK` constraints | Impede o cadastro de status inválidos e órfãos de dados. |
| **RBAC (Papéis)** | Validado no cliente | Restrição na tabela pública vinculada a `auth.uid()` | Segurança robusta e à prova de invasão/manipulação de requests. |
| **Mural de Fotos** | Sem amarração de chave | Vínculo explícito de ID de equipe com exclusão em cascata | Organização livre de mídias quebradas e órfãs de equipes excluídas. |
| **Arrays/Listas** | Arrays flexíveis JSON | Tipo de dados nativo Postgres (`TEXT[]`) | Flexibilidade de busca rápida utilizando operadores de array SQL (`&&`). |
