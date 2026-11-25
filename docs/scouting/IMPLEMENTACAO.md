# Tera Scouting — registro de implementação

## Escopo autorizado em 25/11/2026

As duas partes do prompt original estão preservadas integralmente, sem edição, em
PROMPT_PARTE_1.txt e PROMPT_PARTE_2.txt. As cópias foram verificadas por SHA256.
Usar o login atual do Portal. O sistema pertence exclusivamente à área interna FRC.
As funções Administrador/Configurador/Scout/Visualizador são específicas do scouting;
não devem promover contas a administrador global nem rebaixar permissões preexistentes.

## Conferências e decisões

- Base de código: branch codex/frc-scout-pulse-link-20261124, HEAD
  7f5823be7442915b42fbcafe2bc47452b668d4c6. Doze arquivos preexistentes do
  protótipo Gemini permanecem fora deste escopo.
- O Portal já possui seasons, tournament_configs, teams e frc_scouts. Reutilizar
  identidades e estruturas compatíveis; não criar outro banco de usuários/equipes.
- Consulta somente de information_schema no projeto existente em 25/11 confirmou:
  seasons tem program; teams usa number/name/program; frc_scouts tem scout_name,
  auto_points e teleop_points, mas não tem season_id/event_id/scout_user_id.
  tournament_configs tem category, sem season_id. Nenhuma linha de membro foi lida.
- A tabela matches pertence ao placar FTC segundo a migração de modalidades.
  Não reaproveitá-la cegamente como calendário de partidas FRC.
- FastScoutInterface utiliza nomes e pontuações que diferem dos campos efetivos
  de frc_scouts; não substituir nem converter dados históricos silenciosamente.
- Não vincular scout_name a UUID apenas por nome. Registros antigos permanecem
  legados sem vínculo presumido de autoria, temporada ou campeonato.
- Nenhum dado do Base44 foi importado. A sessão do Base44 não é autenticação
  do Portal e suas permissões não serão copiadas para o Supabase.
- O prompt exige mais que o site de referência: Strategy Center, Live Competition
  Center, qualidade, revisões e offline são requisitos próprios, não funções
  comprovadas pela inspeção da navegação do Base44.
- Login/signup permanecem os existentes por confirmação do usuário. Não alterar
  favicon nem criar contas paralelas. Logo apenas na navegação do novo módulo;
  preservar a apresentação de login atual do Portal.

## Alterações locais realizadas

1. src/lib/teraScouting.js: regras puras de validação, identificação de partida,
   configuração de pontuação com origem, comparação independente, estatísticas
   por campeonato e qualidade com pesos/cobertura. Ainda não conectado à UI/RPC.
2. tests/teraScouting.test.js: testes executáveis de casos válidos, inválidos,
   zero/ausência, duplicação de observadores, divergência e configuração ausente.
3. docs/scouting/PROMPT_PARTE_1.txt e PROMPT_PARTE_2.txt: fontes integrais.
4. Este documento: rastreabilidade das decisões e limitações.

O módulo de regras não é controle de acesso. Qualquer escrita futura deverá
revalidar contexto/autoria/estado e configuração no banco ou servidor. Os pontos
nos testes são fictícios e nunca são configuração oficial ou seed de produção.
Qualidade parcial deve sempre exibir cobertura junto ao indicador; consistência
com uma amostra ou média zero é indeterminada, não 100% por padrão.

## Sequência restante, conforme seção 22 do prompt

1. Finalizar estrutura/segurança: política efetiva e grants, relacionamentos
   aditivos, atribuições específicas, autoria UUID de sessão, revisão humana,
   auditoria transacional, testes isolados e rollback sem exclusão de registros.
2. Identidade visual: shell responsivo FRC, componentes com tema escuro local.
3. Temporadas/campeonatos/equipes: renomear por UUID, sem recriar campeonatos;
   índices e unicidade de participação; não inventar temporadas nem resultados.
4. Match/Pit: respostas tipadas e não observadas; verde/vermelho; dimensões
   largura/comprimento/peso, sem campo de altura; edição com revisão otimista.
5. Dashboard/comparação/alianças/Strategy Center: dados reais e fontes citadas,
   incerteza/amostras visíveis; não tratar estimativa como resultado oficial.
6. Qualidade/revisões/controle: dois scouts preservados, discrepâncias revisadas,
   pesos/metodologia identificados; resultado oficial não valida cada ação.
7. TBA/FIRST e arquivos/offline: credenciais somente servidor, sem chamada paga
   ou dados externos inventados; importação validada; fila por conta com
   idempotência e remoção local apenas após confirmação do servidor.
8. Live/atribuições/histórico/mapa/vídeo: somente onde houver dados/configuração.

## Estado de entrega

Sistema completo em andamento. A migração aditiva foi aplicada em 25/11 ao
Supabase existente por autorização explícita. A interface está conectada no código
local, ainda sem publicação Vercel. Sem commit, push ou instalação de dependência.
As validações de domínio não demonstram RLS, acesso entre modalidades, upload,
funcionamento móvel, APIs ou sincronização offline. Essas validações ainda faltam.

Para repetir os testes da fundação: node --test tests/teraScouting.test.js.

Validação executada em 25/11: 8 testes da fundação e 16 regressões de TERA BI,
importação CSV e biblioteca passaram (24/24, sem skips). node --check passou.
Build Vite terminou com exit 0, usando configuração pública sintética; emitiu o
aviso conhecido WINDOWS_NATIVE_REALPATH_EPERM e usou a resolução original do Vite.
Conferência SHA256 confirmou os 12 arquivos preexistentes integralmente preservados.

## Vínculos preparados em 25/11

- supabase/migrations/20261125_frc_scouting_links.sql: acrescenta
  tournament_configs.scouting_season_id e frc_scouts.scouting_season_id,
  scouting_event_id, scouting_user_id. As chaves estrangeiras impedem exclusão
  das entidades referenciadas. Nenhum backfill, seed ou mudança em contas.
- frc_scouting_event_teams relaciona o diretório teams ao campeonato, sem
  duplicar equipes. Leitura exige a modalidade FRC autorizada; manutenção exige
  administrador com acesso FRC. As políticas antigas não são removidas.
- Triggers conferem programa FRC, temporada do campeonato, participação da equipe,
  número da partida e autoria da sessão. Novos registros vinculados exigem a
  permissão de edição existente. Atualizações não podem trocar ou apagar o contexto
  nem editar registro de outro scout sem ser administrador. O caminho legado
  desvinculado conserva suas regras anteriores; isso NÃO corrige a autorização
  antiga por nome nem estabelece ainda os quatro papéis específicos do scouting.
- Vínculos em uso não podem ser descaracterizados por mudança de modalidade,
  número de equipe, temporada ou remoção de participação. Renomear campeonato
  preserva UUID e registros. Um advisory lock transacional serializa escritas
  dessas relações; operações concorrentes podem exigir retry em caso de deadlock.
- supabase/rollbacks/20261125_frc_scouting_links.sql suspende novas escritas
  vinculadas e conserva dados, colunas e guardas. Não deve ser confundido com
  remoção física da migração. Retomada exige migração revisada para retirar
  somente os três triggers de suspensão e sua função.
- tests/teraScoutingLinks.test.js aplica SQL real no PostgreSQL isolado existente,
  com usuários e funções de acesso fictícios; testa preservação do legado,
  falsificação de autor, acesso negado, mudança de contexto, equipe não inscrita,
  temporada incompatível, renomeação e suspensão sem perda de dados.
  Nove testes de domínio/migração passaram. O teste não demonstra a RLS efetiva
  de produção, integração móvel ou concorrência entre conexões independentes.

## Conexão das telas e aplicação autorizada

1. src/api/frcScoutingClient.js: usa o cliente Supabase autenticado e a RLS, filtra
   FRC, verifica a conta antes/depois das requisições, projeta colunas explícitas e
   não envia autor no insert. Erros do banco não são refletidos integralmente.
2. src/components/frc/LinkedFrcScouting.jsx: seleção de temporada/campeonato,
   configuração administrativa de vínculos/participação, cadastro de entidades,
   formulário manual de pontos observados e lista por evento. Estados de erro e
   bloqueio síncrono contra clique duplo; valores obrigatórios não viram zero.
   Listas limitadas a 200 registros, 200 temporadas/eventos e 1000 equipes;
   isto não representa cobertura completa. Não são pontuações oficiais calculadas.
3. src/pages/InternalFRCScout.jsx: passa a usar a interface vinculada no mesmo
   endereço, conservando ProtectedRoute, layout, modalidade e visibilidade.
   FastScoutInterface permanece em arquivo sem alteração, mas não é montado nessa
   rota: seus valores fixos de pontuação não são usados no novo formulário manual.
4. tests/frcScoutingClient.test.js e tests/frcScoutingUi.test.js: validação de
   payload/colunas, filtros, sessão, erros saneados e controles administrativos.
5. Migração executada no painel autenticado do projeto dqmagpxjsdelpwuofxzz.
   O SQL selecionado foi conferido integralmente com o arquivo antes da execução.
   Consulta posterior confirmou: tabela de participação, quatro colunas, cinco
   triggers, RLS true, SELECT anon false; contagens scouts/teams/events antes e
   depois iguais a zero. Nenhum seed, PDI, conta ou documentação foi modificado.
   Não foi feito registro manual na tabela de histórico de migrações Supabase.
6. Metadados antes/depois e screenshot estão em work fora do repositório.
   Não equivalem a backup de conteúdo. As políticas efetivas foram consultadas;
   testes de escrita ocorreram só no PostgreSQL isolado, sem contas reais.
7. Trinta testes dirigidos (domínio, SQL isolado, cliente/UI e regressões BI/CSV)
   passaram sem skips. Lint passou; build passou com configuração sintética.

Para usar após publicação da interface: entrar como administrador, acessar
InternalFRCScout, cadastrar temporada/equipe/campeonato reais, escolher temporada
e campeonato e inscrever a equipe. O membro com FRC e edição autorizada então
seleciona equipe inscrita/partida, informa pontos observados e salva. Nenhuma dessas
entidades foi inventada ou cadastrada automaticamente no banco real.

Não é entrega completa dos 23 itens: faltam formulário configurável oficial,
Pit, edição/revisão, auditoria de negócio, quatro papéis específicos, dashboards,
integrações externas, importação/offline e centrais avançadas. A tela nova ainda
precisa validação autenticada ponta a ponta e teste visual móvel antes de release.
