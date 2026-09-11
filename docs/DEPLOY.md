# Processo de Build e Implantação (DEPLOY.md)

Este documento detalha os procedimentos para compilação, parametrização ambiental e implantação em servidores de produção do **Portal Tera**.

---

## ⚡ Comandos e Scripts de Build

O gerenciamento de dependências e automação de builds é realizado usando as diretivas oficiais declaradas no arquivo `package.json` da raiz do projeto:

| Comando | Operação Executada | Contexto de Uso |
| :--- | :--- | :--- |
| `npm install` | Instala todas as dependências locais e de desenvolvimento. | Preparação inicial do ambiente local ou CI/CD. |
| `npm run dev` | Inicia o servidor local do Vite com recarregamento rápido. | Desenvolvimento diário. |
| `npm run build` | Compila, minifica e otimiza a aplicação para arquivos de produção. | Geração do pacote para deploy. |
| `npm run preview` | Inicia um servidor local servindo a pasta `/dist` compilada. | Validação e auditoria local pré-deploy. |
| `npm run lint` | Executa o validador estático ESLint para encontrar bugs ou erros. | Testes automáticos em esteiras de integração contínua (CI). |

---

## ⚙️ Variáveis de Ambiente Obrigatórias

Como a aplicação é um **Client-Side SPA** (Single Page Application), todos os valores começados com o prefixo `VITE_` são expostos no código final em tempo de compilação. Essas variáveis devem ser configuradas nas configurações de ambiente do provedor de hospedagem ou em um arquivo `.env` na raiz durante o build:

```env
# ID Único do Aplicativo cadastrado no console do Base44
VITE_BASE44_APP_ID=seu_app_id_exemplo_12345

# Versão do motor de execução das Funções Serverless (Edge Functions)
VITE_BASE44_FUNCTIONS_VERSION=v1

# URL absoluta do portal onde os redirecionamentos do SSO devem retornar
VITE_BASE44_APP_BASE_URL=https://portal.terarobotics.com.br
```

---

## 🚀 Fluxo de Deploy em Produção

O Portal Tera é compilado em ativos estáticos universais (HTML, JS, CSS, imagens). Portanto, ele pode ser hospedado em qualquer infraestrutura moderna de entrega de conteúdo (CDN ou static-site hostings).

### Diretório de Saída: `/dist`
Ao rodar `npm run build`, o compilador Vite reúne todo o código das rotas e componentes na pasta `/dist`. Este diretório conterá:
- `index.html` (ponto de entrada unificado)
- Ativos compactados (arquivos `.js` e `.css` divididos por rotas em subpastas)
- Imagens estáticas e fontes otimizadas

### Regra de Redirecionamento SPA (Muito Importante)
Como a aplicação utiliza roteamento no lado do cliente (`react-router-dom`), qualquer recarregamento de tela ou acesso direto a rotas secundárias (ex: `/interna/daily-logs`) fará com que o servidor de hospedagem retorne um erro **404 Not Found**, pois o arquivo físico correspondente não existe no servidor.

Para evitar isso, você **DEVE** configurar o servidor de hospedagem para reescrever/redirecionar todas as rotas não encontradas para o arquivo raiz:
- **Netlify**: Crie um arquivo `_redirects` na pasta `public/` contendo:
  ```text
  /*    /index.html   200
  ```
- **Vercel**: Adicione uma regra de rewrites no arquivo `vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **Nginx**: Configure a cláusula `try_files` no bloco do servidor:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```
- **Firebase Hosting**: Configure o atributo `rewrites` no arquivo `firebase.json`:
  ```json
  {
    "hosting": {
      "rewrites": [ {
        "source": "**",
        "destination": "/index.html"
      } ]
    }
  }
  ```
