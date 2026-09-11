# Arquitetura da Aplicação (ARCHITECTURE.md)

Este documento descreve as decisões arquiteturais, o ecossistema tecnológico e a estrutura estrutural do **Portal Tera**.

---

## 🏗️ Visão Geral da Arquitetura

O projeto adota uma arquitetura moderna de **Single Page Application (SPA)** enriquecida por um ecossistema **Serverless/Cloud-Native** fornecido pela plataforma **Base44**. 

A principal vantagem desse modelo é a eliminação da necessidade de manter e gerenciar um servidor Express ou banco de dados relacional clássico de forma manual. Toda a persistência, lógica de autenticação e funções de backend são definidas de forma declarativa e executadas de maneira gerenciada através do SDK.

```
       [ Camada de Interface (React + Tailwind CSS) ]
                           │
                           ▼
          [ Gerenciador de Estado / Query Client ]
                    (TanStack React Query)
                           │
                           ▼
          [ SDK Cliente de Integração (Base44) ]
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    [ Banco de Dados ]        [ Funções Serverless ]
 (Persistência Firestore)     (ftcTeamLookup / IA)
```

---

## 🛠️ Stack Tecnológica

### Frontend & Build
- **React 18**: Biblioteca base para construção das interfaces baseadas em componentes funcionais.
- **Vite**: Ferramenta de build rápida (bundle builder) configurada para transpilar JSX/TSX e otimizar ativos de produção.
- **Tailwind CSS (v3)**: Framework CSS utilitário para estilização rápida, responsiva e consistente utilizando variáveis globais declaradas em `src/index.css`.
- **Shadcn/ui (Radix Primitives)**: Conjunto de componentes primitivos acessíveis e altamente customizáveis localizados em `src/components/ui/`.
- **Framer Motion**: Biblioteca utilizada para criar transições fluidas e micro-interações animadas entre páginas e menus.

### Integração & Backend (Base44 Ecosystem)
- **@base44/sdk**: Biblioteca cliente utilizada para consumir dados, invocar funções e interagir com o sistema de autenticação de forma tipada e segura.
- **@base44/vite-plugin**: Plugin integrado ao Vite (`vite.config.js`) que processa as definições de entidades declaradas na pasta `base44/` em tempo de desenvolvimento e compilação.
- **TanStack React Query (v5)**: Motor de sincronização de estado de rede. Ele gerencia as chamadas de API, fornece cache automático, re-validação em segundo plano e estados de carregamento (loading/error) globais.

---

## 📂 Estrutura de Pastas de Alto Nível

A raiz do projeto está dividida entre configurações locais, a pasta de definições do Base44 e o código fonte do frontend (`src`):

```
├── .gitignore
├── README.md
├── components.json             # Configuração do Shadcn UI
├── tailwind.config.js          # Extensão de temas e cores do Tailwind
├── vite.config.js              # Configuração do Vite e carregamento do plugin Base44
│
├── base44/                     # Configurações de Backend & Dados (Base44)
│   ├── .app.jsonc              # Metadados do App Base44
│   ├── config.jsonc            # Configuração geral de endpoints e hooks
│   ├── entities/               # Modelagem de dados (Esquemas JSONC)
│   └── functions/              # Funções Serverless de Backend
│
└── src/                        # Código Fonte do Frontend (React)
    ├── main.jsx                # Ponto de entrada (Bootstrap do DOM)
    ├── App.jsx                 # Configuração de Rotas, Providers e Toaster
    ├── Layout.jsx              # Template mestre com Menus Laterais, Cabeçalho e Rodapé
    ├── index.css               # Folha de estilo global (Tailwind + Cores de Tema)
    ├── pages.config.js         # Configurações de metadados de páginas e permissões
    │
    ├── api/                    # Inicialização do Cliente Base44
    ├── components/             # Subcomponentes extraídos e agrupados por subcategorias
    ├── hooks/                  # Custom hooks (Ex: detecção de mobile)
    ├── lib/                    # Arquivos utilitários de sistema (Auth, Audit, Presença)
    ├── pages/                  # Componentes de visualização de nível de página inteira
    └── utils/                  # Utilitários gerais
```

---

## ⚡ Estado do Cliente & Caching

O gerenciamento de dados remotos no Portal Tera depende estritamente do **React Query** (`src/lib/query-client.js`). Isso garante que os dados sejam sincronizados de maneira ideal:
- **Query Keys Inteligentes**: As chaves de busca utilizam namespaces consistentes associados aos nomes das entidades do Base44 (ex: `['entity', 'DailyLog']`).
- **Estados de Mutação**: Atualizações, deleções e inserções invalidam de forma proativa as chaves afetadas, garantindo que a tela seja atualizada automaticamente sem re-renderizações desnecessárias ou estados desatualizados.
- **Gerenciamento de Erros Silencioso**: Falhas no envio de logs ou no carregamento de presenças não travam o render principal da interface do usuário.
