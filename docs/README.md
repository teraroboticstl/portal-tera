# Portal Tera - Documentação Técnica

Bem-vindo à documentação técnica oficial do **Portal Tera** (repositório: `teraroboticstl/portal-tera`). Este portal é o centro operacional digital da equipe de robótica **Tera**, fornecendo recursos públicos para engajamento da comunidade e uma Área Interna robusta para gestão operacional, scouting, desenvolvimento de projetos e integração de dados.

## 📌 Visão Geral do Projeto

O Portal Tera é uma aplicação de página única (SPA) modular e altamente interativa. Ele é utilizado por alunos, mentores e administradores de diferentes categorias de robótica (**FLL** - FIRST LEGO League, **FTC** - FIRST Tech Challenge e **FRC** - FIRST Robotics Competition).

A aplicação gerencia dados de competições, pontuações de rounds de treino (Scorers), acompanhamento de projetos de inovação, diários de bordo, logs diários, matrizes de risco, integrações CAD (Onshape) e chats inteligentes assistidos por IA.

---

## 📂 Índice da Documentação

Para facilitar a compreensão e manutenção do projeto, a documentação foi dividida nos seguintes arquivos especializados:

1. **[ARCHITECTURE.md](./ARCHITECTURE.md) (Arquitetura e Tecnologias)**
   - Explicação do framework React + Vite, estilo, empacotamento, e o ecossistema de SDK e compilação do **Base44**.
2. **[DATABASE.md](./DATABASE.md) (Estrutura de Dados e Entidades)**
   - Detalhamento das 21 entidades declaradas nos esquemas JSONC da pasta `base44/entities/` que alimentam o banco de dados.
3. **[API.md](./API.md) (Integrações de API e Funções Serverless)**
   - Funcionamento do cliente `@base44/sdk`, operações CRUD e a função serverless integrada `ftcTeamLookup`.
4. **[COMPONENTS.md](./COMPONENTS.md) (Componentes e Interface do Usuário)**
   - Visão geral sobre os componentes da pasta `src/components/`, incluindo utilitários, widgets de FLL, FTC, FRC, sistemas de presença e componentes UI Shadcn.
5. **[ROUTES.md](./ROUTES.md) (Rotas e Navegação)**
   - Estrutura de rotas públicas e da Área Interna, incluindo permissões baseadas em perfis de usuário definidos em `src/pages.config.js`.
6. **[AUTH.md](./AUTH.md) (Autenticação e Controle de Acesso)**
   - Sistema de login seguro, gerenciamento de tokens via URL/LocalStorage e fluxos de redirecionamento SSO baseados no Base44 Auth.
7. **[DEPLOY.md](./DEPLOY.md) (Processo de Build e Implantação)**
   - Requisitos de compilação, scripts do `package.json`, gerenciamento de variáveis de ambiente e deploy.

---

## ⚡ Inicialização Rápida Local

### Pré-requisitos
- **Node.js** (versão 18 ou superior recomendado)
- **npm** (gerenciador de pacotes padrão)

### Passo a Passo

1. **Instalar Dependências**
   ```bash
   npm install
   ```

2. **Configurar Variáveis de Ambiente**
   Crie ou verifique o arquivo `.env` na raiz do projeto com as chaves obrigatórias do Base44:
   ```env
   VITE_BASE44_APP_ID=seu_app_id
   VITE_BASE44_FUNCTIONS_VERSION=v1
   VITE_BASE44_APP_BASE_URL=https://portal.terarobotics.com.br
   ```

3. **Iniciar Servidor de Desenvolvimento**
   ```bash
   npm run dev
   ```
   *O servidor iniciará localmente no endereço de rede padrão configurado.*

4. **Compilar para Produção**
   ```bash
   npm run build
   ```
   *Os arquivos estáticos compilados serão gerados na pasta `dist/`.*
