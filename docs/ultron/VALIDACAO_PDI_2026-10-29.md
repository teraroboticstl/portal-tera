# Fase 10.1 — validação com backup real

Backup de 29/10/2026: hash SHA-256 do arquivo descriptografado `810FF90CC62928436F8BE9614B78FA30260B4A806C541182C13AA73D10E4D0E0`.

## Escopo comprovado

Restaurados `public`, `auth` e `extensions` em PostgreSQL 18 portátil ligado exclusivamente a 127.0.0.1. Backup de origem PostgreSQL 17.6. Não há equivalência total de versões/infraestrutura. Papéis locais sem login foram preparados; ownership remapeado ao administrador local por `--no-owner`; ACLs de objetos restauradas. Namespaces gerenciados e extensões pgcrypto/uuid-ossp foram preparados localmente. USAGE de auth para anon/authenticated foi conferido em produção por consulta READ ONLY e reproduzido no teste. Não foram substituídas as funções reais de autorização por mocks.

A migração nova foi aplicada no banco restaurado. Confirmados: ativação inicial desligada, pendência para todos os perfis, hashes agregados de profiles/pdis/pdi_frcs inalterados e rollback não destrutivo.

Contas fictícias foram criadas somente na cópia local, dentro de transação revertida. Os testes exercitaram público, aluno, treinamento, membro integrado, líder, mentor explícito e administrador; rejeição de anon, preservação de acesso AVA do aluno, cadastro obrigatório para integrante e administrador, proposta privada, UUID da sessão, payload com user_id rejeitado, saudação escolhida, idempotência, escrita direta negada, isolamento entre membros, mentor legado sem flag sem acesso, mentor explícito/líder com acesso de revisão. As fixtures respeitam o trigger real que impede alteração de perfis sem identidade administrativa.

O servidor local foi encerrado. Não houve escrita em produção durante essa validação. Arquivos temporários de dump/roles em claro foram removidos; a cópia restaurada permanece em pasta local de ACL restrita. Nenhum conteúdo pessoal foi impresso no relatório.

Resultado local: `pdi-restore-c1865ec6f92c4597b1f48da5cd759588/result.json`, na pasta privada de ferramentas fora do repositório. Cinco testes de aplicação/PGlite, lint e build com configuração fictícia passaram na rodada anterior de 29/10.

## Limites

Não é restauração integral do Supabase: vault, storage, configurações hospedadas, arquivos externos e chaves de criptografia não foram validados. DPAPI exige o perfil Windows de origem; não é recuperação independente do PC. A matriz é SQL local com papéis reais restaurados, não cinco sessões de navegador em produção. A fase cria uma proposta inicial separada para revisão; não inclui aprovação/conversão em PDI definitivo nem notas geradas por IA.

## Implantação autorizada

O usuário autorizou explicitamente concluir e publicar a fase no projeto existente. Aplicar a migração inicialmente desligada; conferir tabelas/RPC/RLS; publicar somente os arquivos de recadastro; ativar após o frontend compatível estar Ready e acessível. Verificar a tela com sessão autorizada sem preencher respostas pessoais pelo usuário. Para rollback, desligar `member_registration_settings.enabled` mantendo cadastros e PDIs anteriores. Não incluir o bloco independente Visibilidade de Páginas nesta release.
