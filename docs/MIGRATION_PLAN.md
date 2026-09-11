# Plano de Migração do Portal Tera: Base44 para Supabase (MIGRATION_PLAN.md)

Este documento descreve a estratégia oficial, cronograma e plano de ação estruturado para migrar integralmente o **Portal Tera** do ecossistema NoSQL/SSO gerenciado do **Base44** para uma infraestrutura autônoma e moderna utilizando **Supabase**.

---

## 🎯 Premissas Estratégicas e Diretrizes

Como o ecossistema do Base44 será desativado em breve e não há necessidade de manter ou transportar dados legados de desenvolvimento, adotamos as seguintes premissas:

1. **Descarte de Dados Legados**: Todos os registros atuais de testes do Base44 podem ser descartados com segurança. Não realizaremos scripts de transporte de dados NoSQL para SQL.
2. **Preservação Máxima da Aplicação**: Todas as telas, design de UI, lógica de negócios, navegação, matrizes de permissão e recursos visuais serão rigorosamente preservados.
3. **Novo Cadastro de Usuários**: Todos os membros da equipe (alunos, mentores e administradores) realizarão novos cadastros diretamente no portal usando **Google OAuth** integrado ao Supabase Auth.
4. **Agilidade em Produção**: O foco é concluir a migração com rapidez, segurança e o menor downtime possível para a área interna das equipes de robótica.

---

## 🗺️ Roteiro de Migração em Fases

O processo de migração está estruturado em **6 fases definitivas e incrementais**:

```
[ Fase 1 ] Modelagem & Schema (CONCLUÍDO)
     │
     ▼
[ Fase 2 ] Supabase Auth (Google Login)
     │
     ▼
[ Fase 3 ] Tabelas & Refatoração CRUD
     │
     ▼
[ Fase 4 ] Supabase Storage (Uploads)
     │
     ▼
[ Fase 5 ] Edge Functions (Backend)
     │
     ▼
[ Fase 6 ] Limpeza e Desativação do Base44
```

---

## 🛠️ Detalhamento Técnico das Fases

### 🏁 Fase 1: Modelagem e Redesenho do Banco de Dados
*Foco: Estabelecer a infraestrutura estruturada de dados no PostgreSQL.*
- **Ações**:
  - Modelar as 21 tabelas operacionais em formato relacional.
  - Criar o script SQL de migração automatizada (`schema.sql`).
  - Desenvolver políticas de Row Level Security (RLS) integradas no banco de dados.
- **Entregáveis (Esta Etapa)**:
  - `/supabase/schema.sql`
  - `/docs/DATABASE_REDESIGN.md`
  - `/docs/ENTITY_MAPPING.md`
  - `/docs/MIGRATION_PLAN.md`

### 🔑 Fase 2: Configuração do Supabase Auth e SSO Google
*Foco: Substituir o sistema de login legado e implementar controle RBAC nativo.*
- **Ações**:
  - Substituir integralmente o arquivo `src/lib/AuthContext.jsx` para utilizar `@supabase/supabase-js`.
  - Remover parâmetros legados do SSO Base44 no arquivo `src/lib/app-params.js`.
  - Integrar o fluxo de autenticação via Google OAuth.
  - Implementar verificação de cargos (`admin`, `mentor`, `aluno`) a partir da tabela pública `profiles`.
- **Arquivos Afetados**:
  - `src/lib/AuthContext.jsx`
  - `src/lib/app-params.js`
  - `src/App.jsx`
  - `src/components/ProtectedRoute.jsx`

### 📊 Fase 3: Criação de Tabelas e Refatoração dos CRUDs (React Query)
*Foco: Portar todas as leituras e escritas das páginas visuais para o Supabase.*
- **Ações**:
  - Executar o DDL de `/supabase/schema.sql` no console do projeto de produção do Supabase.
  - Substituir de forma definitiva e global as importações de `base44.entities` por chamadas diretas utilizando o cliente do Supabase (`supabase.from()`).
  - Ajustar as respostas de retorno e erros nas funções `useQuery` e `useMutation` do TanStack React Query.
- **Arquivos Afetados**:
  - Toda a árvore de arquivos de páginas operacionais em `src/pages/` e subcomponentes associados.

### 📷 Fase 4: Migração do Sistema de Uploads (Supabase Storage)
*Foco: Garantir que uploads de fotos do TIR e anexos do robô funcionem sem dependências.*
- **Ações**:
  - Criar Buckets públicos (`gallery`, `attachments`) no console do Supabase.
  - Ajustar as lógicas de upload de arquivos nas telas de administração e galeria para enviar mídias diretamente ao Supabase Storage.
- **Arquivos Afetados**:
  - `src/pages/InternalEventGallery.jsx`
  - `src/pages/InternalFLLAttachments.jsx`
  - `src/pages/AdminPanel.jsx`

### ⚡ Fase 5: Implantação de Edge Functions (Backend de Busca)
*Foco: Substituir as funções serverless legadas por soluções modernas.*
- **Ações**:
  - Portar o script de busca externa `ftcTeamLookup` para o Deno/TypeScript no Supabase Edge Functions.
  - Configurar segredos de produção (`API Keys`) na CLI do Supabase.
- **Arquivos Afetados**:
  - `supabase/functions/ftcTeamLookup/index.ts`

### 🧹 Fase 6: Limpeza e Desativação Completa do Base44
*Foco: Eliminar todo código morto e reduzir consideravelmente o tamanho do bundle final.*
- **Ações**:
  - Desinstalar `@base44/sdk` e `@base44/vite-plugin` via NPM.
  - Remover do arquivo `package.json` todas as dependências relacionadas ao Base44.
  - Deletar a pasta `/base44` na raiz do projeto.
  - Executar bateria completa de linter (`npm run lint`) e build de produção (`npm run build`) para consolidar a migração.
- **Arquivos Afetados**:
  - `package.json`
  - `vite.config.js`
  - `/base44` (Remoção total)
  - `/src/api/adapters` (Remoção total)

---

## ⚠️ Mitigação de Riscos Técnicos

| Risco Técnico Identificado | Impacto | Ação de Mitigação Planejada |
| :--- | :--- | :--- |
| **Quebra do Fluxo de Login** | Bloqueio total de acesso à Área Interna | Criar contas locais de homologação para testes preliminares com e-mail/senha antes de liberar o Google OAuth público. |
| **Erros de Tipos de Dados** | Telas em branco por inconsistência de dados | Monitorar o retorno de arrays (`TEXT[]`) de presença e tarefas, convertendo o payload no React se o banco retornar nulo ao invés de array vazio (`[]`). |
| **Políticas de RLS Restritivas** | Alunos incapazes de salvar ou ler logs de trabalho | Realizar testes exploratórios no painel SQL simulando requests com a credencial de aluno (`auth.uid()`) para auditar as regras de leitura e gravação das tabelas. |
