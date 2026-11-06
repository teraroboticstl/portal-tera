# Acesso às modalidades

Solicitação de 06/11/2026: membros veem apenas suas modalidades, com ajuste individual pelo administrador. Administradores e líderes mantêm todas. Conteúdos gerais, site público e AVA conservam suas regras.

## Administração

Painel Admin → Usuários → localizar membro → **Modalidades**. Marcar FRC libera FRC; desmarcar FTC retira FTC. É possível selecionar várias ou nenhuma. OBR inclui suas subcategorias. Salvar não altera papéis, aprovação, PDIs, registros ou matrículas. Cadastros sem modalidade autorizada mantêm conteúdos gerais e dependem de liberação administrativa.

A liberação inicial usa uma única vez os questionários já concluídos, conforme autorização expressa. Não usa nome, e-mail ou `profiles.program` como identidade. Alterações posteriores do questionário não concedem acesso automaticamente; novas contas dependem do administrador. Os PDIs antigos permanecem no banco, e o administrador mantém a consulta centralizada.

## Arquitetura

Reutiliza `portal_user_access`, com `allowed_modalities` e revisão concorrente. RPCs administrativas validam administrador pela sessão; um trigger bloqueia alteração direta das colunas protegidas. Auditoria registra antes/depois. O snapshot de visibilidade integra o bloqueio por modalidade com o bloqueio global de páginas, antes de montar a rota. Menus e dashboard usam o mesmo snapshot. Cache de dados é revalidado quando o escopo muda; menus consultam permissões a cada 30 segundos e ao recuperar foco. RLS passa a valer imediatamente no servidor.

Políticas restritivas nas tabelas operacionais, scout, PDI e FLL compõem-se com as políticas existentes; não concedem leitura adicional. O RPC read-only de fontes do ULTRON continua sujeito a RLS. Mídias internas classificadas por modalidade exigem a mesma autorização no backend, inclusive upload. PDI continua sujeito à privacidade do titular/admin; liderança não passa a ler todos os PDIs.

`matches` é classificado FTC porque o schema efetivo contém os placares gate/classified usados pelo scorer e histórico FTC. Tabelas mistas usam `modality`, `program` ou as categorias de modalidade existentes. Registros legados sem classificação permanecem gerais: não inferir modalidade pelo autor, pelo texto ou por nome. Mídias públicas e simuladores públicos não são transformados em conteúdo interno.

## Rollout e recuperação

1. Preservar snapshot cifrado dos acessos/configuração e verificar restauração isolada; o backup não é integral de Auth/Storage.
2. Aplicar `20261106_modality_access.sql` com o controle desligado. O bootstrap não deve ser repetido nem usado para sobrescrever escolhas administrativas futuras.
3. Publicar interface compatível e conferir o commit Ready e o painel.
4. Ativar `modality_access_enabled` na configuração existente e verificar escopos FTC/FRC/multimodalidade/líder/admin/sem acesso, sem editar registros de membros.
5. O rollback desativa somente esse controle, voltando ao escopo compartilhado anterior. Preserva escolhas e auditoria; exige decisão administrativa, pois volta a ampliar o escopo como antes.

## Validação

Testes executam SQL real em PostgreSQL isolado: bootstrap, isolamento de leitura e gravação, bloqueio de URL, troca de modalidade, múltiplas modalidades, nenhum acesso, administrador, líder sem poder de administração, conflitos de revisão e impossibilidade de autopromoção. Testes do cliente verificam troca de sessão e respostas de outro alvo. Renderização automatizada do menu testa FTC e FRC/OBR. Endpoint real de upload é exercitado com dependências simuladas, incluindo recusa de modalidade diferente. Esses testes não equivalem a login real em todas as contas de produção.
