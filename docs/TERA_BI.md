# TERA DATA EXPERIENCE e TERA BI

## Entrega e modo de operação
Painéis nativos React/Recharts, somente leitura. Não são um embed Microsoft Power BI e não dependem de conta Fabric, licença ou novas variáveis. Nenhuma tabela, migração, permissão ou dependência foi adicionada.

- `/TeraDataExperience`: menu público Quem Somos → TERA DATA EXPERIENCE.
- `/InternalFRCBI`, `/InternalFTCBI`, `/InternalFLLBI`: entradas **TERA BI — FRC**, **TERA BI — FTC** e **TERA BI — FLL** nas respectivas seções do menu. Não há entrada TERA BI em Geral. Cada link respeita a modalidade e a visibilidade da página correspondente.
- `/InternalTeraBI`: central auxiliar de painéis autorizados, mantida para compatibilidade dos links de retorno. Não libera modalidades adicionais e não aparece no menu Geral. Sem painel autorizado, orienta consultar a administração.
- `/api/bi?scope=public`: cliente Supabase anônimo separado, inclusive para visitante administrador. Somente projetos ativos, nomes/modalidades dos robôs e título/data/modalidade/categoria do memorial já públicos. Não retorna descrições, links, lista de membros ou informações privadas.
- A chamada pública permite somente cookies da mesma origem para a proteção da Vercel no Preview, sem enviar bearer Supabase. O endpoint ignora a identidade do visitante e não eleva a consulta pública.
- `/api/bi?program=FRC|FTC|FLL`: sessão validada, snapshot de modalidade/visibilidade antes da consulta, RLS do solicitante nas fontes normais e gateway restrito para rounds FLL (detalhado abaixo), projeção de campos e nova validação de sessão/permissões antes da resposta. Sem cache HTTP.

## Fontes e significado
- FRC dispõe de uma demonstração local identificada: 12 observações fictícias, quatro equipes fictícias e três datas ilustrativas. Aparece inicialmente apenas se a consulta autorizada não tiver registros; dados reais existentes têm prioridade. O usuário pode alternar entre demonstração e dados reais. Nunca mistura fontes, grava partidas no banco ou exporta os exemplos como scouting real. FTC/FLL permanecem somente com dados reais. Sem autorização/consulta válida não exibe os exemplos. Filtros são limpos ao alternar os modos.
- `frc_scouts`: auto_points + teleop_points (aliases legados auto_score/teleop_score). Não inclui endgame nem equivale ao total oficial. Ausência de componente resulta em valor indisponível.
- `scout_ftcs`: efficiency_index (IEF), sem conversão para pontos de competição.
- `fll_round_simulations`: somente Bioglow 2026/2027, exclui testes/lixeira. Schema efetivo verificado em 12/11: SELECT é exclusivo de service_role, sem leitura direta por authenticated. Reutiliza o gateway existente do simulador, restrito no código a essa tabela: membro ou líder vê apenas user_id da sessão; administrador confirmado pela autenticação e pelo snapshot pode consultar os rounds administrativos. Sessão/permissões são verificadas novamente antes de retornar; perda do papel administrativo descarta a resposta ampliada. Não altera grants/RLS nem amplia a privacidade para toda a modalidade. `fll_missions` mantém o cliente do usuário com RLS e mostra fotografia atual, separada dos filtros/histórico dos rounds.
- Fontes públicas: `projects` com status Ativo, `robots`, `tournament_memorials`. Contagens refletem o cadastro publicado e não totais oficiais da história. Não há fonte consolidada de beneficiários/horas: esses números não são estimados.

Paginação por ID em lotes de 500, até 5.000 por fonte; limite atingido sinaliza cobertura parcial, inclusive se exatamente 5.000. Não é memória completa. Filtros operam sobre os registros carregados. Datas em America/Campo_Grande (Três Lagoas). Observações podem repetir uma partida; não são número de partidas únicas. Filtros por evento são necessários para evitar misturar temporadas/regras distintas. Registros legados sem evento aparecem como não informado, sem inferência.

## Acesso e visibilidade
Os novos links herdam chaves existentes para não alterar o contrato do RPC de visibilidade: FRC → InternalFRCScout, FTC → InternalFTCScout, FLL → InternalFLLDashboard. Ocultar essa página também oculta/bloqueia seu BI; administrador mantém o comportamento de administração existente. Não há chave independente nova nesta entrega. RLS continua sendo aplicada no servidor. Nenhuma permissão é obtida apenas por esconder botões.

CSV contém somente agregados por equipe e métrica do recorte, com proteção contra fórmulas. Exportação revalida sessão/permissões e consulta fontes novamente. Não contém notas, nomes de scouts, UUIDs ou dados do PDI. Navegador elimina dados exibidos durante revalidação/falhas; consulta por ator/modalidade, sem persistência local.

## Conectar Microsoft Power BI posteriormente
Ainda faltam relatórios publicados, decisão de licenciamento/capacidade, identidade Microsoft e definição das fontes/RLS do modelo semântico. Não criar conta/assinatura paga automaticamente. O CSV pode servir como ponto inicial para análise manual no Power BI Desktop; não cria sincronização automática.

Para relatório interno, usar incorporação segura com autorização Microsoft e RLS própria; a sessão/permissão do Portal não é transmitida automaticamente ao Power BI. Nunca usar Publicar na Web para scouting/dados privados. Relatório público futuro deve usar somente dataset previamente aprovado como público. Não colocar segredo, token de embed permanente ou credencial Supabase no frontend.

Referências oficiais: [incorporação segura](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-embed-secure), [riscos de Publicar na Web](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-publish-to-web).

## Verificação
`node --experimental-vm-modules --test tests/teraBi.test.js` cobre autorização, troca/revogação de sessão, projeções públicas, FLL privado, paginação, falha de serviço, filtros, métricas e CSV. Build/lint e smoke no Preview devem ser registrados no relatório da release. Testes com mocks não demonstram a matriz completa de RLS efetiva; registrar os papéis realmente testados. Não inserir registros fictícios em produção para preencher gráficos.
