# Visibilidade de Páginas — Área Interna

Implementação local de 28/10/2026. Não aplicada ao banco nem publicada nesta etapa.

## Comportamento

- Painel Admin → Visibilidade de Páginas (`/AdminPanel?tab=page_visibility`). Botões Ocultar/Mostrar salvam imediatamente por página, com confirmação ou erro acessível.
- Catálogo explícito das 41 páginas internas. Todas começam visíveis. Não se oculta Análise de Risco automaticamente: ela é uma opção para o administrador.
- Dashboard, Painel Admin, Configuração de Temporada, auditoria administrativa, site público e AVA não são ocultáveis. Isso mantém uma rota de recuperação.
- Administrador confirmado pelo banco continua acessando páginas ocultas; as permissões próprias de cada página continuam em vigor.
- Menus desktop/mobile e cartões de navegação do Dashboard usam a mesma configuração. Links secundários em conteúdos existentes podem continuar presentes; o bloqueio central de rota também se aplica a eles e ao endereço direto, incluindo variações de maiúsculas/minúsculas aceitas pelo roteador.
- Conteúdo protegido não é montado enquanto a configuração está ausente, falhou ou indica página oculta. Uma atualização com erro descarta a autorização de visibilidade em cache.
- Atualização em outras sessões ao navegar, recuperar foco ou consultar a cada 30 segundos enquanto a aba está ativa. Não é revogação instantânea de dados já exibidos. Nenhuma escolha é persistida em localStorage.

## Segurança e escopo

`portal_page_visibility` armazena apenas disponibilidade, revisão e autor/data da última mudança. SELECT exige sessão com acesso interno ou administração; o cliente não tem INSERT/UPDATE/DELETE. O RPC de escrita exige `public.is_admin()` no servidor, usa `auth.uid()` para autoria, aceita apenas chaves já cadastradas e exige revisão atual para evitar sobrescritas concorrentes. PUBLIC/anon não executam RPCs. Cada resposta é vinculada à identidade autenticada antes e depois da chamada.

Este recurso controla disponibilidade de **telas**, não revoga permissões de leitura/escrita de entidades compartilhadas. Políticas RLS e APIs existentes não foram alteradas. Usuários com autorização de dados podem continuar acessando esses dados por outros fluxos permitidos. Ocultar uma tela não é uma forma de tornar seus registros privados, nem remove código do bundle SPA. Restringir dados exigiria regras específicas por entidade, fora desta funcionalidade.

## Implantação e recuperação

1. Conferir no ambiente de destino a implementação efetiva de `public.is_admin()` e `public.portal_internal_access()`; testes locais usam funções equivalentes de fixture, não provam RLS de produção.
2. Garantir backup verificável e validar os cinco níveis com contas de teste autorizadas.
3. Aplicar **somente** `supabase/migrations/20261028_internal_page_visibility.sql` antes de publicar este frontend. A migração é aditiva e cria suas próprias tabelas/funções/política; não modifica tabelas de negócio ou as funções de autorização existentes.
4. Verificar ambos os RPCs. Sem a migração, as telas configuráveis ficam indisponíveis por segurança; Dashboard e Painel Admin permanecem recuperáveis.
5. Publicar apenas o diff desta funcionalidade sobre a versão de produção; preservar o recadastro/PDI já publicado e excluir outras alterações locais. A feature não depende da migração de recadastro.
6. Smoke: membro abre Análise de Risco; admin oculta; membro não vê o menu e recebe indisponibilidade no URL direto; admin ainda abre; admin mostra novamente e membro recupera acesso. Testar desktop/mobile, outra aba, erro de rede e duas edições concorrentes.

Rollback de disponibilidade: `supabase/rollbacks/20261028_internal_page_visibility.sql` reabre páginas e preserva esquema/RPCs; configurações ocultas anteriores precisam ser registradas antes caso se queira reaplicá-las. Rollback de aplicação: reverter apenas o commit desta feature. Não remover RPCs com o novo cliente publicado.

## Validação local

`node --experimental-vm-modules --test tests/pageVisibility.test.js`.
Para executar também PostgreSQL isolado, definir `PDI_TEST_PGLITE_MODULE` para o runtime PGlite já disponível no PC. Sem isso, esse teste é explicitamente marcado como skipped.

Testes exercitam catálogo/rotas, contexto de sessão, parâmetros RPC, resposta inválida, ocultação/retorno, componente real que bloqueia montagem, política RLS, escrita administrativa, negação a aluno/membro/treinamento/anônimo, persistência entre sessões, conflito de revisão, rotas de recuperação e rollback. Nenhuma conexão com banco real é utilizada.

## Revalidação — 02/11/2026

15 testes de visibilidade e regressões de AVA, recadastro e entrada ULTRON passaram, sem skips, incluindo PostgreSQL isolado. Lint completo e build local com chave pública fictícia passaram; o artefato sintético não é um deployment. Consulta somente leitura confirmou ausência da tabela e RPCs em produção antes da preparação desta release. A implantação deve instalar a migração aditiva antes do frontend, mantendo todas as páginas visíveis inicialmente.

Migração aplicada em 02/11/2026 ao projeto existente. Verificação posterior: 41 páginas visíveis, revisão inicial zero, UPDATE direto negado a authenticated e RPC de escrita negado a anon. is_admin e portal_internal_access efetivos foram conferidos previamente. Não houve alteração nas tabelas de negócio. Testes por papéis foram executados em PostgreSQL isolado; não representam cinco sessões reais em produção.
