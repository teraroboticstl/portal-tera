# Autenticação e Controle de Acesso (AUTH.md)

Este documento descreve detalhadamente o sistema de **Single Sign-On (SSO)**, o ciclo de vida de tokens, o fluxo de login/logout e o controle de acesso baseado em papéis (RBAC).

---

## 🔐 O Fluxo de Autenticação SSO (Base44 Auth)

O Portal Tera delega o fluxo de credenciais para o microsserviço de autenticação central do **Base44**. Isso significa que as senhas e informações confidenciais de login nunca são trafegadas ou armazenadas diretamente na base de dados deste projeto.

O processo de autenticação segue a arquitetura de fluxos OAuth2/SSO simplificada:

```
[ Usuário clica em Entrar ]
            │
            ▼
[ Redirecionamento para o SSO do Base44 ]  ──► (Inserção de email/senha no portal central)
            │
            ▼
[ Redirecionamento de volta ao Portal Tera ] ──► (Injeta 'access_token' na query string da URL)
            │
            ▼
[ Extração e Persistência do Token (Vite SDK) ] ──► (Salva em LocalStorage e limpa a URL do navegador)
            │
            ▼
[ Autenticação Concluída ] ──► (Inicia requisições para base44.auth.me())
```

---

## 🛠️ Ciclo de Vida do Token (`src/lib/app-params.js`)

A captura e validação dos tokens que circulam nas URLs durante o login e redirecionamentos são coordenadas pelo script de inicialização `app-params.js`:

1. **Varredura de Parâmetros**: O script analisa a query string `window.location.search` em busca da chave `access_token`.
2. **Armazenamento Seguro**: Ao localizar o token, ele o persiste no `localStorage` do navegador sob a chave `base44_access_token`.
3. **Limpeza Sanitária**: Utilizando `window.history.replaceState()`, o token é removido da URL imediatamente para evitar vazamento ou duplicação do token caso o link seja compartilhado.
4. **Logouts e Expurgo**: Se o parâmetro `clear_access_token=true` for detectado, os storages são limpos e o usuário é redirecionado para a tela de encerramento da sessão.

---

## 🧠 O Provedor de Autenticação (`src/lib/AuthContext.jsx`)

O componente `AuthProvider` envolve toda a aplicação React no arquivo principal `src/App.jsx`. Ele mantém cinco estados críticos de autenticação compartilhados globalmente através do hook `useAuth()`:

- **`user`**: Objeto contendo os dados do usuário autenticado (ID, nome completo, e-mail, avatar e funções atribuídas).
- **`isAuthenticated`**: Booleano que indica se há um usuário ativo validado.
- **`isLoadingAuth`**: Flag de carregamento enquanto o SDK verifica a validade do token local com a API remota (`base44.auth.me()`).
- **`isLoadingPublicSettings`**: Flag que monitora a busca de regras de acesso públicas do aplicativo.
- **`authError`**: Armazena erros lançados pelo servidor durante o handshake inicial, divididos em:
  - `auth_required`: Indica que o usuário precisa autenticar-se para acessar aquela área.
  - `user_not_registered`: Ocorre quando o usuário autenticou-se no SSO, mas o administrador do Portal Tera ainda não liberou seu registro para o aplicativo específico.

---

## 👥 Controle de Acesso Baseado em Papéis (RBAC)

Uma vez autenticado, o perfil do usuário determina quais menus laterais, botões e telas estarão visíveis. Os papéis mapeados na aplicação incluem:

1. **`admin` (Administrador)**: Acesso total irrestrito. Visualiza logs de auditoria (`/interna/audit`), painel administrativo de membros (`/interna/admin`) e tem permissão de escrita e exclusão em todas as seções de FLL, FTC, FRC e TIR.
2. **`mentor` (Mentor / Professor)**: Permissão de visualização e escrita em diários de bordo, reuniões, avaliações de PDI e relatórios mecânicos. Não possui acesso de exclusão definitiva de registros nem gerenciamento de novos admins.
3. **`aluno` / Membros de Equipe**:
   - Membros de **FLL** têm acesso liberado à subseção `/interna/fll` para cadastro de garras, missões e projetos de inovação.
   - Membros de **FTC** e **FRC** têm acesso exclusivo a relatórios de scouting, montagem de picklists para as finais de torneios, controle de partidas e preenchimento de seus respectivos PDIs de desenvolvimento.
