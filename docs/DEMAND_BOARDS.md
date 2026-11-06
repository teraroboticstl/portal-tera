# Demandas pessoais e por modalidade — 06/11/2026

## Uso

Menu da Área Interna → Minhas demandas, ou menu do perfil → Minhas demandas. Cada seção FRC/FTC/FLL/OBR também oferece seu quadro compartilhado. A página `/InternalDemands` alterna entre quadro pessoal e modalidades autorizadas. `?board=FRC` seleciona FRC sem liberar acesso por URL.

Use Nova caixa, dê um título, preencha uma demanda por linha e salve. Marcar a caixa de seleção move o item para o grupo expansível de concluídos e risca seu texto; desmarcar reabre. Editar altera título/linhas. Arquivar retira o cartão do quadro ativo; Ver arquivados permite restaurar. Não existe exclusão permanente nessa interface. Linhas vazias são ignoradas, até 80 itens por cartão, 500 caracteres por item e 160 no título. Cartão vazio é permitido.

Interface preta/vermelha, grade responsiva, textos com quebra e alvos principais de pelo menos 44px. Cartões e modal usam os componentes existentes, sem incorporar Google Keep ou vincular conta Google.

## Arquitetura e necessidade estrutural

`portal_work_items` foi examinado antes da criação da tabela. Ele representa metas/tarefas/atividades/reuniões compartilhadas, exige validação de dependências/participantes e alimenta Hoje, progresso e fontes ULTRON. Não contém propriedade privada nem lista de marcações por cartão. Usá-lo exigiria alterar sua semântica e proteger dados pessoais contra todos os consumidores existentes. Por isso foi adicionada uma única estrutura `portal_demand_cards`, com discriminador `board` personal/FRC/FTC/FLL/OBR. Não há uma tabela por pessoa/modalidade, cópia de membros nem duplicação de PDI/reuniões/metas. As demandas não alimentam progresso operacional ou pontuação do PDI. Nenhum cartão é indexado ou enviado ao ULTRON/Gemini.

## Permissões

Somente sessão com Área Interna pode consultar. Quadro pessoal: titular por UUID, inclusive para criar/editar; nem administradores/técnicos/líderes recebem bypass para cartões pessoais de outras pessoas. Como em qualquer aplicação, operadores privilegiados do banco/backup continuam sujeitos às responsabilidades administrativas; a promessa de privacidade refere-se aos acessos do Portal e clientes autenticados.

Quadro compartilhado: leitura pela regra `portal_has_modality` já existente. Edição exige também `portal_can_edit`; treinamento consulta a modalidade, mas pode organizar o próprio quadro privado. Administradores/técnicos e líderes mantêm as modalidades que a matriz existente já permite. Público/aluno sem Área Interna não acessa. Trocar questionário não concede novas modalidades. Não muda papéis ou políticas de tabelas anteriores.

RLS na leitura direta, SELECT somente para authenticated, sem grants diretos de INSERT/UPDATE/DELETE. RPC de escrita verifica sessão, autorização atual, escopo imutável e revisão concorrente. Owner/updated_by sempre auth.uid(), nunca dados recebidos do navegador. Não permite transformar um cartão privado em compartilhado silenciosamente; criar um novo cartão é uma decisão explícita do usuário. Conteúdo não é logado.

A revisão impede sobrescrever edição de outro dispositivo; em conflito, atualizar antes de reaplicar. Criação tem UUID estável no cliente e repetição idêntica não duplica o cartão. Arquivamento é reversível. Lista por cursor UUID, cinquenta por página, filtro de ativos/arquivados. Atualiza ao focar e a cada trinta segundos; não é colaboração em tempo real. Erros de autorização ocultam dados em cache e sessão é verificada antes/depois de cada RPC. Timeout de vinte segundos evita spinner permanente; não presumir sucesso depois de falha de rede, atualizar o quadro.

## Implantação e reversão

Migração aditiva `20261106_demand_boards.sql`: tabela nova vazia, três funções, duas estruturas de índice, RLS/grants e uma entrada de visibilidade InternalDemands. Nenhum backfill ou modificação de conteúdo anterior. Primeiro validar em PostgreSQL isolado e conferir baseline de produção; instalar schema antes do frontend, pois o catálogo de visibilidade exige a nova chave.

Rollback `20261106_demand_boards.sql` na pasta rollbacks: suspende RPCs/SELECT de clientes e oculta a página, preservando todos os cartões e dados existentes. Restaurar exige conferir schema/permissões e devolver os grants versionados; não reaplicar CREATE TABLE às cegas. Não restaurar versão antiga que remova validações de privacidade.

## Testes

`tests/demandBoards.test.js`: PostgreSQL real isolado com papéis diferentes, privado inclusive contra admin/líder/técnico, matrizes FRC/FTC/FLL/OBR, treinamento/aluno, negação por URL/RPC/tabela, atribuição da sessão, formatos inválidos, revisão concorrente, idempotência, marcar/desmarcar, arquivar/restaurar, mais de cinquenta cartões, revogação de modalidade, visibilidade e rollback sem remoção. Também executa cliente e renderização real do cartão (texto escapado, checkbox, riscado, grupo de concluídos), timeout e erros sem dados sensíveis. `PDI_TEST_PGLITE_MODULE` é necessário para executar o teste SQL, não ignorá-lo.

Separar resultados locais de testes no Portal publicado. Nenhuma afirmação de teste de login real de todos os perfis deve ser feita sem as respectivas sessões. O trabalho local não publicado do Gemini é preservado e excluído deste release.
