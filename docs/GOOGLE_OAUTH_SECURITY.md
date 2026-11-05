# Bloco 2 — OAuth Google Drive

## Fluxo anterior e consumidores

`api/auth/google/[action].js` aceitava callback com code sem state e retornava refresh token em HTML/JavaScript. `src/components/admin/GoogleDriveTestManagement.jsx` inicia consentimento por `getGoogleAuthUrl` (`src/api/googleDriveClient.js`). Mídias e áudio FLL usam `api/_lib/googleDrive.js`, que configura OAuth2 offline com GOOGLE_REFRESH_TOKEN no servidor. Nenhum token real foi lido nesta implementação.

## Fluxo novo

Somente sessão administrativa válida inicia consentimento. O servidor exige GOOGLE_REDIRECT_URI explícita, no domínio usado pelo portal: HTTPS em produção, sem query/fragmento/credenciais; HTTP somente em localhost fora de produção. Não deriva redirect de Host/X-Forwarded-*.

State e vínculo do navegador têm 32 bytes aleatórios cada. State vai ao Google; o vínculo permanece em cookie HttpOnly, SameSite=Lax e Secure em HTTPS, com duração de cinco minutos. Somente hashes ficam na tabela de fluxo. A sessão Supabase iniciadora é armazenada cifrada por cinco minutos, para revalidar a identidade e os privilégios no callback sem expor o token ao navegador. Uma nova autorização neste navegador substitui o cookie e invalida o vínculo das tentativas anteriores.

A RPC de consumo usa DELETE RETURNING atômico com state e vínculo corretos: callback repetido/concorrente não troca outro código. Expiração é validada no banco e no handler. Recusa OAuth, code ausente, sessão expirada e falha de troca exigem reiniciar o fluxo. Texto de erro externo nunca é refletido nem registrado. Páginas usam no-store, no-referrer e CSP restrita sem JavaScript.

O refresh token recebido é cifrado com AES-256-GCM (IV aleatório e contexto autenticado) e salvo apenas em google_oauth_credentials. A chave fica no ambiente exclusivo do servidor, fora do banco e do frontend. O callback só confirma o resultado. Não há cópia, resposta HTTP contendo credencial, log de erro OAuth ou endpoint público de leitura do segredo.

## Configuração manual obrigatória — nada aplicado

Antes de habilitar o consentimento, um administrador deverá:

1. Revisar/testar e aplicar `supabase/migrations/20261013_google_oauth_protected_storage.sql` em ambiente apropriado. As duas tabelas têm RLS sem políticas de cliente, revogações de PUBLIC/anon/authenticated e grants específicos para service_role. A RPC é SECURITY INVOKER, executável somente por service_role. Revisar grants efetivos, views/RPCs e papéis com bypass antes de produção.
2. Configurar GOOGLE_OAUTH_ENCRYPTION_KEY com 32 bytes criptograficamente aleatórios codificados como 64 caracteres hexadecimais, por processo seguro de administração. Nunca usar VITE_ nem inserir valor em documento, código, logs ou chat. Manter backup seguro da chave; sua substituição sem recriptografar invalida as credenciais armazenadas.
3. Confirmar SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI somente no servidor. Registrar a URI exata no cliente OAuth Google. Iniciar o fluxo no mesmo domínio e navegador; consentir usando a conta institucional correta. O escopo drive.file foi preservado; a implementação não acrescenta escopos de identidade nem verifica o e-mail da conta Google selecionada.
4. Validar build e testes de banco/consentimento antes de publicar. Não usar a produção como teste sem autorização. Não revogar ou girar tokens automaticamente.

Sem chave/role/URI ou tabelas prontas, /url retorna indisponibilidade antes de iniciar consentimento. O código de armazenamento foi definido, mas ainda não foi configurado/testado em ambiente real. Credenciais anteriores em GOOGLE_REFRESH_TOKEN continuam válidas enquanto a chave nova não for habilitada. Com armazenamento habilitado e nenhum registro novo, o servidor usa a configuração anterior. Após consentimento bem-sucedido, o registro cifrado tem prioridade. Erro de leitura/decriptação não usa fallback silencioso. Habilitar a chave antes da migração pode interromper o Drive; coordenar a ativação. Nenhum segredo/variável foi alterado nesta execução.

Os três consumidores do Drive agora aguardam a resolução assíncrona da credencial. Upload, streaming, exclusão e escopo institucional mantêm suas regras anteriores. Fluxos expirados abandonados ficam no banco: definir limpeza administrativa periódica apenas de google_oauth_flows expirados, sem ler/capturar sealed_session. Não há rotação, exclusão de credencial anterior ou implantação automática.

## Testes e limites

`node --experimental-vm-modules --test tests/googleOAuthSecurity.test.js tests/googleOAuthStore.test.js` executa o handler e a camada de armazenamento reais com Google/Supabase simulados. Inclui state ausente/inválido/expirado/repetido/concorrente, vínculo do navegador, recusa OAuth, falhas de autenticação/troca/persistência, token ausente, configuração ausente, origem/host incorretos, criptografia e ausência do token nas respostas.

As verificações de migration e chamadas await são estáticas. O consumo concorrente no teste simula a semântica da RPC; não comprova o comportamento instalado do PostgreSQL. Ainda faltam teste de RLS/grants/consumo concorrente no banco de teste, consentimento real em ambiente autorizado, validação da biblioteca Google instalada, build e inspeção de bundle. Não há dependências locais instaladas; a tentativa de build falhou com MODULE_NOT_FOUND (Vite ausente). Não reconciliar locks neste bloco. Nenhum commit/push/deploy; push em main aciona produção conforme configuração previamente verificada.

Resultado local de 13/10/2026: suíte selecionada com 13 testes OAuth/armazenamento e 11 regressões CAD/acesso/modalidades/operação, 24 aprovados, nenhuma falha. Checagens de sintaxe dos módulos OAuth e git diff --check passaram. As sete alterações anteriores do CAD foram preservadas, sem staging nem descarte.

## Revalidação em 05/11/2026

Correção reaproveitada durante o diagnóstico de anexos. O teste administrativo real encontrou autorização expirada/revogada. Preflight somente leitura: tabelas/RPC ausentes no Supabase e GOOGLE_OAUTH_ENCRYPTION_KEY ausente na Vercel Production, portanto armazenamento ainda não ativado.

Foram acrescentados testes executados em PostgreSQL isolado com as roles anon/authenticated/service_role, consumo único, expiração, vínculo e revogação não destrutiva dos grants. A biblioteca googleapis está instalada e o build da release foi executado. O resultado histórico de 13/10 acima permanece como registro; os limites sobre falta de runtime local naquela data não descrevem este checkout de release.

Não houve migração, alteração de segredo nem novo consentimento real. Configurar a chave antes das tabelas ainda é incorreto; coordenar migração, runtime e autorização institucional. O rollback novo mantém as linhas cifradas e exige preservar a chave fora do banco. O refresh token anterior já rejeitado não constitui garantia de recuperação funcional.
