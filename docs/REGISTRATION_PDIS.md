# PDIs reais a partir do recadastro — 04/11/2026

O recadastro concluído salvava `initial_pdi` como proposta, mas não inseria registros nas tabelas lidas pelas telas. A correção cria um PDI real por modalidade na mesma transação de conclusão: FRC em `pdi_frcs`; demais modalidades em `pdis`, com discriminador `modality`. FTC filtra explicitamente FTC.

O vínculo usa exclusivamente `member_registrations.user_id`, preenchido pela RPC autenticada. Não há associação por nome, reenvio do formulário nem substituição de registros manuais. A unicidade `(participant_id, modality, registration_version)` protege repetição; reconciliar novamente preserva edições posteriores. Um registro legado sem vínculo continua sem vínculo e disponível ao administrador para revisão.

`/MyPDI` e o menu do perfil oferecem Meu PDI; AdminPanel?tab=pdis reúne Todos os PDIs. O banco restringe leitura ao titular e aos administradores atuais, inclusive contra políticas legadas permissivas. A consulta usa sessão antes/depois e paginação por cursor (100 registros/página). Não muda aprovações ou libera modalidades por autodeclaração.

O preenchimento não mede evolução. PDIs gerados iniciam em 0%, com avaliação pendente e sem nota de IA; o controle legado de arrastar porcentagem não se aplica a eles. O mecanismo de avaliação por evidências, revisão e histórico ainda é outra etapa. Nenhum dado é enviado a provedor externo.

## Ativação e reversão

1. Proteger os dados atuais e conferir schema/políticas. Snapshot de 04/11 criptografado fora do Git contém somente tabelas envolvidas, não é um backup completo de Auth/Storage.
2. Aplicar `20261104_registration_pdis.sql`: flag inicialmente falsa; alterações aditivas, políticas restritivas e trigger.
3. Publicar frontend compatível e executar `supabase/audits/20261104_enable_registration_pdis.sql`. A reconciliação aborta se houver modalidade sem registro. Conferir totais e registros originais.
4. Rollback operacional: `supabase/rollbacks/20261104_registration_pdis.sql` desliga geração futura, preservando respostas, PDIs e proteção de acesso. Não remover colunas/políticas nem retornar a uma interface que exponha registros sem UUID.

## Validação

Testes executam SQL real em PGlite com papéis distintos: geração, histórico, multimodalidade, duplicidade, homônimos, sessão trocada, acesso negado, alteração indevida de vínculo/nota, exclusão proibida, paginação e rollback. A suíte de 173 testes, lint e build passaram em 04/11. Isso não representa teste de login real com todos os níveis de acesso.

Teste funcional: concluir cadastro de um integrante autorizado; abrir Meu PDI no perfil e a modalidade correspondente; administrador consulta Todos os PDIs. Reentrar deve manter os mesmos IDs. Quem já cadastrou não precisa cadastrar novamente. Avaliações e fotos privadas não foram implementadas nesta correção.
