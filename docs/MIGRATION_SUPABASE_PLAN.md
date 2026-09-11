# Plano de Migração de Base44 para Supabase (MIGRATION_SUPABASE_PLAN.md)

Este documento estabelece um roteiro estruturado, dividido em fases incrementais e seguras, para orientar a transição tecnológica do **Portal Tera** do ecossistema NoSQL/SSO gerenciado do **Base44** para uma infraestrutura autônoma utilizando **Supabase** (PostgreSQL, Supabase Auth, Supabase Storage e Edge Functions).

---

## 🗺️ Visão Geral das Fases

```
[ Fase 1 ] Preparação do Ambiente ──► [ Fase 2 ] Criação do Projeto Supabase
                                                     │
                                                     ▼
[ Fase 4 ] Políticas RLS (Segurança) ◄── [ Fase 3 ] Modelagem das Tabelas (SQL)
      │
      ▼
[ Fase 5 ] Autenticação (SSO / RBAC) ──► [ Fase 6 ] Migração de Storage / Midias
                                                     │
                                                     ▼
[ Fase 8 ] Edge Functions (Backend)  ◄── [ Fase 7 ] Migração de Entidades (CRUDs)
      │
      ▼
[ Fase 9 ] Testes Integrados e Homologação ──► [ Fase 10 ] Deploy e Virada de Chave
```

---

## 🛠️ Detalhamento das Fases

### Fase 1: Preparação do Ambiente
**Objetivo**: Garantir que o repositório local e as dependências estejam preparados e que não haja conflitos de build antes de iniciar as modificações.

- **Arquivos Afetados**:
  - `/package.json`
  - `/vite.config.js`
  - `.env` e `.env.example`
- **Pré-requisitos**:
  - Repositório local completamente limpo de erros do ESLint e build compilando com sucesso (`npm run build`).
  - Instalação das ferramentas de CLI locais do Supabase para desenvolvimento offline.
- **Riscos**:
  - Conflitos de dependências de pacotes após remoção do plugin do Base44.
  - Quebra do build de produção intermediário caso as alterações não sejam isoladas em branches de desenvolvimento (`feature/supabase`).
- **Critérios de Sucesso**:
  - CLI do Supabase inicializada localmente com `supabase init`.
  - Arquivo `.env` configurado com chaves temporárias de teste do Supabase.

---

### Fase 2: Criação do Projeto Supabase
**Objetivo**: Provisionar a infraestrutura de nuvem gerenciada no console do Supabase e configurar as variáveis de ambiente locais.

- **Arquivos Afetados**:
  - `.env` (Adição de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
- **Pré-requisitos**:
  - Conta ativa na plataforma Supabase Cloud.
- **Riscos**:
  - Seleção de região geográfica distante do público-alvo (recomenda-se usar `sa-east-1` - São Paulo para menor latência).
- **Critérios de Sucesso**:
  - Projeto criado com sucesso no dashboard do Supabase.
  - Conexão de teste via CLI ou Console SQL efetuada com sucesso.

---

### Fase 3: Modelagem das Tabelas (PostgreSQL)
**Objetivo**: Traduzir os 21 esquemas declarativos NoSQL localizados em `base44/entities/*.jsonc` para tabelas relacionais em banco de dados PostgreSQL estruturado com chaves primárias, estrangeiras e restrições (constraints).

- **Arquivos Afetados**:
  - Remoção de `/base44/entities/`
  - Criação de scripts SQL em `/supabase/migrations/`
- **Pré-requisitos**:
  - Mapeamento crítico de tipos de dados (ex: converter `string` contendo formato ISO para tipo `timestamptz` ou `date` do PostgreSQL).
- **Riscos**:
  - Perda de integridade referencial ou erros de sintaxe SQL em campos de array de strings (ex: `attendees` nas notas de reunião, que no PostgreSQL devem ser modelados como `text[]` ou em tabelas associativas N:M).
- **Critérios de Sucesso**:
  - Execução bem-sucedida das migrações SQL gerando as 21 tabelas com integridade referencial de chaves estrangeiras (`FOREIGN KEY`).

---

### Fase 4: Políticas de Segurança RLS (Row Level Security)
**Objetivo**: Proteger o banco de dados diretamente na camada do PostgreSQL utilizando Row Level Security, espelhando as permissões de acesso do portal.

- **Arquivos Afetados**:
  - `/supabase/migrations/` (Adição das políticas `CREATE POLICY`)
- **Pré-requisitos**:
  - Tabelas da Fase 3 criadas.
- **Riscos**:
  - Bloqueio acidental de consultas de leitura pública para tabelas que precisam ser expostas sem login (ex: `TIRFoto`, `TIRRegra`, `FLLMission`).
  - Vazamento de permissões de escrita para usuários sem perfil de administrador ou mentor.
- **Critérios de Sucesso**:
  - Comando `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` habilitado em todas as tabelas confidenciais.
  - Testes de CRUD diretos como usuário anônimo sendo rejeitados com erro 401/403.

---

### Fase 5: Autenticação (Supabase Auth & RBAC)
**Objetivo**: Substituir o fluxo SSO proprietário do Base44 pelo provedor nativo do Supabase, migrando os metadados dos perfis dos usuários.

- **Arquivos Afetados**:
  - `/src/lib/AuthContext.jsx` (Substituição integral da lógica de handshake e inicialização do `supabase.auth`)
  - `/src/lib/app-params.js` (Remoção da varredura de query string antiga `access_token`)
  - `/src/components/ProtectedRoute.jsx`
- **Pré-requisitos**:
  - Definição do método de autenticação (OAuth do Google ou Login tradicional por E-mail e Senha).
- **Riscos**:
  - Usuários existentes não conseguirem logar devido a diferenças estruturais de token.
  - Perda do papel (role) do usuário (aluno, mentor, admin). Solução: Criar uma tabela associativa `profiles` vinculada à tabela nativa `auth.users` do Supabase para armazenar e injetar o papel do membro na sessão.
- **Critérios de Sucesso**:
  - Usuário consegue fazer login, persistir a sessão de forma segura e o contexto `useAuth()` identificar corretamente o e-mail e papel administrativo do usuário.

---

### Fase 6: Storage e Upload de Mídias
**Objetivo**: Migrar o armazenamento de imagens e arquivos de anexos da galeria e do TIR para o Supabase Storage.

- **Arquivos Afetados**:
  - `/src/pages/AdminPanel.jsx` (Lógica de upload de banners)
  - `/src/pages/InternalEventGallery.jsx`
  - `/src/pages/InternalFLLAttachments.jsx`
- **Pré-requisitos**:
  - Criação de Buckets públicos e privados no console do Supabase (ex: bucket `attachments` e `gallery`).
- **Riscos**:
  - Links de imagens salvos no banco de dados quebrarem após migração dos arquivos físicos.
- **Critérios de Sucesso**:
  - Upload de arquivos sendo processado e retornando a URL pública gerada pelo Supabase Storage.

---

### Fase 7: Migração de Entidades (Refatoração de CRUDs)
**Objetivo**: Substituir as referências de chamadas assíncronas do cliente `base44.entities` para consultas equivalentes utilizando o cliente javascript do Supabase.

- **Arquivos Afetados**:
  - `/src/api/base44Client.js` (Será excluído e substituído por `/src/api/supabaseClient.js`)
  - Todos os arquivos em `/src/pages/` e `/src/components/` que utilizam chamadas ao cliente `base44` (aproximadamente 35 arquivos mapeados).
- **Pré-requisitos**:
  - Conclusão das Fases 3 e 5.
- **Riscos**:
  - Divergência no formato de retorno das funções do Supabase (que retornam `{ data, error }`) em comparação ao SDK do Base44 (que retorna o payload direto ou lança exceções capturadas pelo React Query).
- **Critérios de Sucesso**:
  - Todos os `useQuery` e `useMutation` adaptados e lendo/escrevendo dados de forma transparente no PostgreSQL.

---

### Fase 8: Migração de Funções Serverless (Edge Functions)
**Objetivo**: Portar a lógica de busca externa `ftcTeamLookup` da infraestrutura Base44 Functions para Supabase Edge Functions.

- **Arquivos Afetados**:
  - `/base44/functions/ftcTeamLookup/entry.ts` (Removido e portado para `/supabase/functions/ftcTeamLookup/index.ts`)
- **Pré-requisitos**:
  - Instalação e login na CLI do Supabase local.
- **Riscos**:
  - Chaves de API externas (ex: `FIRST_API_KEY`) ficarem expostas. Elas devem ser configuradas como segredos de produção usando `supabase secrets set`.
- **Critérios de Sucesso**:
  - Função Edge implantada e respondendo a requisições HTTP autenticadas de forma rápida e segura.

---

### Fase 9: Testes Integrados e Homologação
**Objetivo**: Validar exaustivamente todos os fluxos de dados, comportamentos de rede e níveis de acesso (RBAC) com a nova stack.

- **Arquivos Afetados**:
  - Nenhum (Apenas logs e bateria de testes exploratórios).
- **Pré-requisitos**:
  - Todas as fases anteriores implementadas.
- **Riscos**:
  - Regressões de segurança (por exemplo, alunos conseguindo alterar regras do TIR ou notas de auditoria).
- **Critérios de Sucesso**:
  - 100% dos fluxos de cadastro de logs diários, Kanban de tarefas, simulação de rounds FLL, chat interativo e uploads testados e validados com zero erros no console do navegador.

---

## Fase 10: Deploy e Virada de Chave
**Objetivo**: Publicar a versão migrada em produção substituindo as variáveis ambientais no host de hospedagem (Vercel, Netlify, Cloud Run, etc.) e desativar o app Base44.

- **Arquivos Afetados**:
  - Configurações do servidor de hospedagem de produção (Variáveis de ambiente de deploy).
- **Pré-requisitos**:
  - Homologação completa na fase 9.
- **Riscos**:
  - Downtime na Área Interna se a virada de chave ocorrer em horário de pico de treinamento das equipes de robótica.
- **Critérios de Sucesso**:
  - Portal publicado e operando normalmente em ambiente real sem erros.
  - Tráfego direcionado integralmente para a nova infraestrutura.
