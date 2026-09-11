# Mapeamento de Entidades NoSQL para Tabelas Relacionais (ENTITY_MAPPING.md)

Este documento apresenta o dicionário de dados e o mapeamento detalhado das **21 entidades** de dados do Portal Tera, descrevendo a conversão de seus esquemas NoSQL (JSONC) para tabelas fortemente tipadas no banco de dados relacional **PostgreSQL** do **Supabase**.

---

## 🗺️ Tabela de Correspondência Geral

| # | Entidade Original (Base44 NoSQL) | Nova Tabela (Supabase PostgreSQL) | Tipo de Chave Primária | Relacionamentos Principais (FKs) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `AuditLog` | `audit_logs` | `UUID` | `user_id ➔ public.profiles(id)` |
| **2** | `BoardDiary` | `board_diaries` | `UUID` | `author_id ➔ public.profiles(id)` |
| **3** | `DailyLog` | `daily_logs` | `UUID` | `user_id ➔ public.profiles(id)` |
| **4** | `ESGInitiative` | `esg_initiatives` | `UUID` | Nenhuma |
| **5** | `FLLAttachment` | `fll_attachments` | `UUID` | Nenhuma |
| **6** | `FLLCoreValues` | `fll_core_values` | `UUID` | Nenhuma |
| **7** | `FLLInnovationProject` | `fll_innovation_projects` | `UUID` | Nenhuma |
| **8** | `FLLJudgePrep` | `fll_judge_preps` | `UUID` | Nenhuma |
| **9** | `FLLMember` | `fll_members` | `UUID` | `profile_id ➔ public.profiles(id)` |
| **10**| `FLLMission` | `fll_missions` | `UUID` | Nenhuma (Unique `mission_number`) |
| **11**| `FLLTask` | `fll_tasks` | `UUID` | `assignee_id ➔ public.profiles(id)` |
| **12**| `InternalProject` | `internal_projects` | `UUID` | `lead_id ➔ public.profiles(id)` |
| **13**| `MeetingNote` | `meeting_notes` | `UUID` | Nenhuma |
| **14**| `OnshapeConfig` | `onshape_configs` | `UUID` | Nenhuma |
| **15**| `Priority` | `priorities` | `UUID` | Nenhuma |
| **16**| `ProjectRisk` | `project_risks` | `UUID` | Nenhuma |
| **17**| `PrototypeTest` | `prototype_tests` | `UUID` | Nenhuma |
| **18**| `TIREquipe` | `tir_equipes` | `UUID` | Nenhuma (Unique `team_name`) |
| **19**| `TIRFoto` | `tir_fotos` | `UUID` | `team_id ➔ public.tir_equipes(id)` |
| **20**| `TIRMensagem` | `tir_mensagens` | `UUID` | Nenhuma |
| **21**| `TIRRegra` | `tir_regras` | `UUID` | Nenhuma |

---

## 🔍 Detalhamento do Mapeamento de Colunas

Abaixo estão descritos os tipos de dados e os ajustes necessários para garantir o correto funcionamento das consultas após a migração:

### 1. Perfis e Controle de Acesso (`public.profiles`)
Substitui a gestão implícita do SSO.
- `id`: `UUID` (Mapeia um para um com `auth.users.id`).
- `email`: `TEXT` (Armazena e-mail único do usuário).
- `full_name`: `TEXT` (Nome completo).
- `avatar_url`: `TEXT` (URL opcional de imagem).
- `role`: `TEXT` (Restrito via `CHECK` a `'admin'`, `'mentor'` ou `'aluno'`).
- `category`: `TEXT` (Restrito via `CHECK` a `'FLL'`, `'FTC'`, `'FRC'`, `'Marketing'` ou `'Geral'`).

### 2. Logs Diários (`public.daily_logs`)
- `hours_spent`: No NoSQL era numérico flexível. No Postgres, está tipado como `NUMERIC(4,2)` para evitar distorções de ponto flutuante no cálculo total de horas de trabalho da equipe.
- `category`: Restrito a opções operacionais pré-definidas usando restrição de verificação `CHECK` para evitar inserções inconsistentes.

### 3. Notas de Reunião (`public.meeting_notes`)
- `attendees`: Convertido do formato NoSQL (Array de Strings) para `TEXT[]` nativo do PostgreSQL.
- `action_items`: Convertido para `TEXT[]` nativo do PostgreSQL.
- **Ajuste no Código**: Ao consumir no React, o PostgreSQL retorna arrays nativos de forma idêntica ao JSON (`['Gabriel', 'Ana']`), garantindo impacto zero no mapeamento visual das listas de presença.

### 4. Gestão de Projetos (`public.internal_projects`)
- `progress_percentage`: Tipado como `INTEGER` com validação de limite `CHECK (progress_percentage BETWEEN 0 AND 100)`.
- `status`: Campo restrito aos status válidos: `'Pendente'`, `'Em Andamento'`, `'Concluído'` e `'Cancelado'`.

### 5. Equipes e Mídias do Torneio Interno (`public.tir_equipes` & `public.tir_fotos`)
- **Adaptação Relacional**:
  - A tabela `tir_fotos` armazena a referência direta do ID da equipe em `team_id UUID REFERENCES public.tir_equipes(id) ON DELETE CASCADE`.
  - Esta modelagem limpa as inconsistências das postagens associadas a equipes inexistentes ou excluídas.

---

## 🛠️ Guia de Tratamento de Tipos na Refatoração

Durante a substituição das chamadas do React Query, observe as seguintes diretrizes para garantir compatibilidade sintática:

1. **Datas (`DATE` vs. `String`)**:
   - O PostgreSQL armazena formatos de data como `YYYY-MM-DD` de maneira estrita. Campos tipados como `DATE` aceitam e retornam strings nesse formato, de modo que manipulações no frontend com bibliotecas como `date-fns` continuam funcionando sem adaptações adicionais.
   
2. **Booleanos**:
   - Os valores no NoSQL mapeiam diretamente para os tipos lógicos `boolean` (`true` ou `false`) do PostgreSQL.

3. **Retornos de Erro**:
   - Ao lançar erros de banco de dados (ex: violação de constraint), o Supabase retorna uma resposta estruturada contendo a propriedade `error.message`.
   - Ajustaremos as funções de mutação do React Query para capturar esse padrão e repassar alertas amigáveis na interface visual do usuário.
