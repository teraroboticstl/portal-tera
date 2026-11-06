# Recuperação de formulários — 06/11/2026

## Evidências confirmadas

O usuário relatou tela branca ao selecionar status/salvar na FLL e pediu revisão nas modalidades. A reprodução autenticada encontrou erros na consulta de Missões: `.list('order')` usa coluna inexistente. A inspeção somente leitura de `information_schema.columns`/checks confirmou `mission_number/title/current_score/description` em vez de `order/name/best_score/notes`; o banco aceita Não Iniciada/Em Desenvolvimento/Consistente, e o formulário enviava em_teste/concluida/descartada. A tabela ficava falsamente vazia após erro de consulta.

Outras divergências confirmadas: tarefas FLL exigem `area` e status `em_progresso`; inovação exige array `experts_consulted` e não possui título/data/protótipos/feedbacks/evolução/links; Core Values, anexos, equipe, preparação de juízes, diário, riscos e ESG também apresentavam campos virtuais enviados como colunas reais. Metadados de produção sem registros pessoais estão na fixture `tests/fixtures/legacyFormSchema.json`; não confundir com cópia ou teste completo do banco de produção.

O HTML declarava inglês (`lang=en`), embora as telas fossem em português. As capturas do usuário apresentam texto traduzido pelo navegador. Tradução automática é um fator plausível para falhas de reconciliação React após alterar texto, mas a exceção específica do Chrome do usuário não foi capturada nesta sessão. A troca de status na sessão interna não reproduziu uma tela totalmente branca; não afirmar que a causa exata desse crash foi provada. Datas ausentes eram passadas diretamente ao date-fns, que lança RangeError; registros legados sem data e badges com variante nula passam a ter fallback seguro.

## Correção

Um contrato central traduz nomes UI/SQL no adaptador real, inclusive filtros/ordenação. Status permanecem sujeitos aos checks existentes. Missões usa os estados relacionais compatíveis e conserva o estado editorial exato no metadado: em_teste → Em Desenvolvimento; concluida → Consistente; descartada → Não Iniciada com estado editorial descartada. Consumidores do Portal decodificam esse estado; uma consulta SQL direta ao campo legado não representa integralmente esse estado editorial. Nenhuma restrição foi relaxada.

A migração aditiva acrescenta `portal_form_data` JSONB (objeto, máximo 60 KB) nas onze tabelas existentes. Não duplica membros, tarefas, PDIs ou tabelas. Guarda somente campos editoriais sem coluna correspondente; aliases conhecidos continuam em colunas físicas. Atualização parcial mescla metadados lidos com RLS, preservando campos extras não editados. Não cria controle de revisão concorrente onde o legado não possui; edições simultâneas ainda exigem coordenação. IDs, credenciais, papéis de acesso e escopo não são definidos pelo JSON. Dados de menores/PDI não são migrados.

`team_logs.program` é uma coluna física nova, com Geral como padrão, para que a política de modalidades existente possa verificar o contexto. Histórico sem modalidade permanece Geral; não há associação por nome ou inferência de texto. Nenhuma política, grant, usuário, token ou segredo é alterado pela migração.

Interface FLL apresenta falha de carregamento como erro com opção de tentar novamente, sem declarar inexistência de registros. Erros de salvar aparecem dentro do formulário, que permanece aberto. Consultas/gravações desses contratos têm abort de vinte segundos no SDK, sem retry automático de escrita. Timeout não prova que uma operação não foi gravada: conferir lista antes de reenviar. Fotos/anexos FLL explicitam programa FLL no upload privado. Verificação de referências de mídia passa a incluir os campos físicos/metadados usados, sem torná-los públicos e mantendo falha fechada na exclusão.

Idioma pt-BR, translate=no e notranslate reduzem interferência do tradutor na árvore React. Não alteram preferências do navegador. Barreira de erro na raiz substitui tela branca por aviso/recarregar, sem expor stack, dados ou payload e sem reenviar automaticamente. A barreira é recuperação, não prova de que todos os bugs do Portal desapareceram. Formatação de datas defensiva é compartilhada por FLL/FRC/FTC/logs/reuniões/protótipos/diário; OBR reutiliza os mesmos formulários de registros.

## Implantação e rollback

Conferir backup/baseline de conteúdo, políticas e grants antes de instalar as colunas, testar contra schema real isolado e aprovar a migração concreta. Instalar schema antes do frontend. Não reaplicar CREATE/ALTER se as colunas já existirem. Migração não reescreve histórico; valores novos começam vazios/Geral e os campos anteriores permanecem intactos.

Rollback de frontend deve preservar as colunas e novos conteúdos. Não oferecer DROP de metadados como reversão segura: isso descartaria informação recém-salva. O script em rollbacks documenta esse limite, sem executar alterações destrutivas. Nenhuma publicação de Gemini está incluída.

## Validação

`tests/formContracts.test.js` usa o adaptador CRUD real com SQL executado em PostgreSQL isolado, recriado a partir das colunas/checks efetivos: criar, atualizar parcialmente, listar/ordenar/filtrar os onze contratos, todos os status de missões/tarefas, preservação de registro anterior e metadados. Também verifica datas inválidas, erro sem segredo, badge nulo, recuperação de tela e idioma. A fixture não reproduz todos os triggers/RLS de produção; testes existentes de modalidade/identidade continuam necessários. Separar esses resultados de gravações e smoke tests reais por sessão/modalidade.

## Resultado da liberação

Em 06/11/2026, snapshot cifrado das onze tabelas (todas com zero registros naquele instante) foi restaurado em PostgreSQL isolado, com hash e preservação dos campos anteriores conferidos. Isso não equivale a backup completo de Auth/Storage/PDI. Após autorização explícita do administrador, a migração foi aplicada no projeto existente; as onze colunas JSON e team_logs.program foram confirmadas, com contagens e hashes de políticas/grants idênticos ao baseline.

Validação da árvore exata de release, excluindo os doze arquivos do protótipo Gemini preexistente: 209 testes aprovados, zero falhas/pulos, lint e build concluídos. Dependências locais foram reutilizadas, sem instalação ou alteração de lockfile. O build Windows utilizou o tratamento já existente de WINDOWS_NATIVE_REALPATH_EPERM; Vercel deve reconstruir a partir do Git, nunca reutilizar o dist local com configuração pública sintética. Os doze arquivos preexistentes tiveram hashes preservados.

