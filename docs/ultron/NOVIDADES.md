# Novidades do ULTRON

## 29/10/2026 — Recuperação limitada ao PDI validada

- Restaurados public/auth/extensions do backup real em PostgreSQL local; migração, pendências, preservação dos dados anteriores, matriz de autorização, conclusão/idempotência e rollback passaram.
- A falha inicial de montagem do teste foi corrigida reproduzindo o USAGE do schema auth verificado em produção. A fixture foi ajustada para respeitar o trigger administrativo de perfis. Nenhuma proteção de produção foi alterada.
- Ver `VALIDACAO_PDI_2026-10-29.md` para escopo, evidências e limites. Não equivale à restauração integral do Supabase. A instalação de Docker deixou de ser requisito para esta validação limitada.

## 29/10/2026 — Revalidação e preparação de ativação da Fase 10.1

- Backup real de 29/10/2026 concluído, protegido por DPAPI do usuário Windows. Hash do arquivo descriptografado conferido. A restauração completa ainda não foi validada; a extensão `supabase_vault` do arquivo não está disponível no PostgreSQL portátil local. Não confundir integridade do arquivo com recuperação integral comprovada.
- Cinco testes específicos de recadastro passaram, sem testes ignorados; lint dos arquivos da fase e build com configuração fictícia também passaram. Nenhuma conexão real foi usada pelo build.
- Consulta de metadados em produção, dentro de transação READ ONLY, confirmou `is_admin`, `portal_internal_access` e `ava_identity`. A última fornece a flag explícita de mentor; `portal_internal_access` admite administradores ou perfis aprovados com nível trainee/member/leader. Isto é inspeção de definições, não validação funcional das cinco sessões.
- `profiles`, `pdis` e `pdi_frcs` têm RLS habilitada. `member_registrations` e `member_registration_settings` não estavam presentes no momento da consulta. Não publicar a interface antes de aplicar e verificar o schema compatível.
- Confirmado apenas um projeto Supabase na organização e nenhuma branch de teste no painel. Esta sessão Windows não possui token de administrador; Docker/Podman não estão disponíveis e WSL não está instalado.
- Nenhuma migração ou ativação aplicada; nenhum deploy do PDI efetuado. Prosseguir com ambiente isolado compatível, recuperação testada, testes de permissões, migração inicialmente desligada, frontend validado e só então ativação. Manter os PDIs antigos e as alterações locais de outros blocos.

## 21/10/2026 — Fase 10.1: recadastro e perfil (implementação local)

- Criados AGENTS.md e ETAPA_10_PDI_CADASTRO_E_DESEMPENHO.md com as decisões confirmadas pelo usuário. Eles orientam o trabalho; não ativam recursos sozinhos.
- Snapshot antes das mudanças: `backup-pre-fase-10-1-20261021-135734.zip`, fora do repositório, em `Documents/Codex/2026-10-09/que/work/`. 418 arquivos versionados/não ignorados; SHA-256 `59EE75B46BD827141325336131F144BF7DF08BC507AB1F0684334183AE9EAC70`. HEAD local `2d2c3073a0e456f097509610c6f2f6cbb40fdb83`. Arquivos ignorados, credenciais locais e banco não fazem parte desse snapshot.
- Novo formulário preto/vermelho para nome escolhido, idade, ingresso, modalidades, áreas, experiências, contribuição, temporada explícita, objetivos e competências.
- Cadastro privado e proposta multimodal de PDI, autorreferida por UUID de sessão e pendente de revisão, salvos atomicamente. PDIs e trajetórias anteriores preservados. Nenhuma promoção de acesso por escolha de modalidade.
- Gate da Área Interna antes de montar páginas protegidas, também para administradores. Público e AVA preservados. Falhas não liberam páginas nem exibem erros internos. Trata-se de requisito de navegação; não de revogação de permissões das APIs antigas.
- Nome escolhido do titular disponível na saudação local do ULTRON; idade e narrativas não são adicionadas à pesquisa compartilhada.
- Schema/RPC/RLS aditivos em `supabase/migrations/20261021_member_re_registration.sql`; dados novos legíveis somente pelo titular e liderança/mentores já autorizados. Flag de mentor do backend é necessária; role=mentor isolado não é usado.
- Instalação inicial prepara pendência para todos os perfis, mas mantém `enabled=false`. A migração NÃO foi aplicada a banco remoto. Sem alteração de produção, commit, push ou deploy nesta fase.
- Rollback não destrutivo: `supabase/rollbacks/20261021_member_re_registration.sql` desliga o requisito, preservando cadastros e propostas.

### Como validar em ambiente isolado

Validação local executada: 212 testes passaram, zero falhas/skips, incluindo a migração/rollback reais em PostgreSQL PGlite com fixtures sintéticas. Lint completo passou. Build passou com configuração e chave pública fictícias de Preview; não conectou a banco real. O dist sintético não deve ser publicado como prebuilt. Nenhuma dependência foi instalada.

Suíte: `node --experimental-vm-modules --test tests/*.test.js`, com `PDI_TEST_PGLITE_MODULE` apontando ao runtime isolado já disponível. Sem essa variável os testes SQL são skipped e não devem ser declarados aprovados. Lint: `node node_modules/eslint/bin/eslint.js . --quiet`. Build: `node node_modules/vite/bin/vite.js build`, nesta execução com ambiente sintético explícito, não uma configuração real de deployment.

Comparação com o snapshot: 412 arquivos anteriores idênticos; seis arquivos ajustados nesta fase; nenhum removido. Os novos arquivos foram adicionados sem sobrescrita de documentos ausentes.

1. Confirmar snapshot do código e backup real do banco de testes; verificar funções `portal_internal_access`, `ava_identity` e `is_admin` efetivas.
2. Aplicar apenas a migração nova no banco de testes compatível. Não usar banco de produção para fixtures.
3. Verificar que a flag começa desligada e que contas/PDIs/trajectórias antigos estão idênticos.
4. No banco de testes, como administrador do banco, executar `UPDATE public.member_registration_settings SET enabled=true WHERE singleton;`.
5. Entrar com conta antiga autorizada: Área Interna deve mostrar cadastro; endereço direto de tela interna também deve ficar no cadastro. Site público e AVA devem manter o acesso prévio.
6. Preencher com dados fictícios; salvar; conferir saudação e acesso interno. Reenviar não deve substituir proposta. Confirmar que outra conta comum não consegue ler idade/narrativas nem concluir pelo titular.
7. Como mentor explicitamente marcado ou líder, conferir a proposta por SELECT autorizado na tabela privada. Esta fase não inclui tela de aprovação ou conversão da proposta em PDI definitivo.
8. Executar rollback no banco de testes e confirmar que o acesso anterior retorna e os novos registros permanecem.

O cadastro anterior de trajetória continua independente e pode exibir seu convite opcional; não foi marcado como concluído nem sobrescrito pelo recadastro novo.

### Para ativar em produção

Não publicar o frontend antes do schema compatível: RPC ausente bloqueia a Área Interna por segurança. Exige backup verificável e plano de recuperação do banco, conferência de schema/grants/RLS efetivos, cinco sessões de teste e aprovação da ativação com ciência do bloqueio. Nenhuma dessas verificações deve ser presumida a partir de testes com fixtures.
