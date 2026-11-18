# Gestão-leitura

Categoria `management_readonly`, atribuída por ADM/técnico em **Painel Admin →
Usuários → Gerenciar nível → Gestão-leitura → Autorizado**, depois do login normal.
Instalar não promove nenhuma conta nem apaga registros ou PDIs anteriores.

A Área Interna apresenta um espaço próprio de consulta de todas as modalidades,
PDIs e documentos. Não monta editores, Meu PDI, recadastro, contato obrigatório,
histórico pessoal ou geração de PDI. A busca filtra a página atual (50 registros).

A alternativa de gatilhos globais foi descartada. A migração final **não altera
is_admin, portal_internal_access ou portal_can_edit**. Gestão não ganha escopo de
escrita interno nem AVA administrativo: portal_internal=false é intencional;
a leitura é autorizada por portal_management_reader e um RPC STABLE específico.
A associação administrativa delega validação, seeds e auto-rebaixamento ao fluxo
existente e mantém auditoria. Acrescenta RLS restritiva apenas em profiles e
portal_user_access, para bloquear autosserviço direto da identidade dessa categoria.
O wrapper de ava_mutate bloqueia inclusive mutações de autosserviço do AVA.

portal_management_records usa allowlist de tabelas e colunas: PDIs, registros,
atas, diários, operação, scouting, fontes FLL, equipes/regras OBR, projetos, riscos
e ESG. Não inclui OAuth, CAD secreto, tokens, telefones, configuração de
infraestrutura ou demandas pessoais. Texto é inerte. Anexos são referências;
não são tornados públicos nem dispensam sua autorização própria de mídia.
Servidor bloqueia uploads e persistência de simuladores dessa categoria.

O cliente confere a sessão antes/depois da consulta e oculta resultado de sessão
errada, erro ou revalidação. A categoria não vira um ADM escondido. Fonte ausente
é identificada; não se afirma que uma página representa todos os registros.

## Testes e implantação

Testes PostgreSQL aplicam a migração e rollback reais em memória com contas
fictícias: 101 PDIs paginados sem duplicação, segredo excluído, negação a membro,
anônimo, pendente/bloqueado, escrita direta/RPC/recadastro, autoelevação, proteção
das seeds, regressão de membros/técnicos e preservação de dados.
MANAGEMENT_BASELINE_SNAPSHOT permite repetir com funções do schema efetivo,
sem copiar dados de membros. Testes exercitam cliente, gate, consulta, XSS textual,
troca de identidade e upload com flags antigas. Lint/build/regressões devem passar.

Aplicar 20261118_management_readonly.sql uma vez, em transação. Conferir grants,
ausência de atribuição automática e os três predicados originais antes de publicar.
Rollback 20261118_management_readonly.sql recusa remover proteção com contas
ainda atribuídas. Primeiro reatribuir administrativamente um nível conservador;
depois executar rollback, sem apagar contas/documentos. Mantém OIDs dos wrappers
para preservar dependências. Não executar rollback automaticamente em produção.

Não foram usadas sessões reais do gerente/diretor (ainda não atribuídas).
Validação isolada não equivale a teste funcional dessas contas em produção.
