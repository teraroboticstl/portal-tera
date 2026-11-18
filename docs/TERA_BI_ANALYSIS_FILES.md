# TERA BI — importação privada de análises (FRC, FTC e FLL)

Os três painéis reutilizam a mesma biblioteca, separada por modalidade e permissões atuais. É possível importar PBIX, CSV, PDF, imagens PNG/JPG/WebP e XLSX, listar e baixar os arquivos. Não cria outra base de scouting, não altera registros oficiais e não envia arquivos para IA.

## Arquivos grandes

O envio/download usa partes de 2 MiB, com limite de 1 GiB por arquivo e expiração da sessão de envio em uma hora. Cada parte passa pelo backend autenticado, permanecendo abaixo do limite de payload da Vercel. O upload comum de mídia/PDI mantém seu limite anterior de 4 MB.

O servidor inicia upload retomável no Google Drive institucional e pré-aloca um ID. A URL do Google e o OAuth ficam somente no servidor; o navegador recebe um ticket cifrado, vinculado à identidade, modalidade, arquivo, tamanho e prazo. Cada pedido revalida as permissões. O servidor valida a URL de sessão, offsets, tamanho da parte e assinatura inicial do arquivo. A confirmação final confere ID, tamanho, pasta e metadados privados. Se a resposta final se perder, o mesmo ID é consultado para evitar outro envio. O progresso não é persistido entre recarregamentos; mantenha a página aberta. Interromper não apaga arquivos. Partes incompletas expiram no provedor.

Downloads são conferidos em partes com Content-Range e revalidação da sessão antes/depois. O navegador monta o arquivo completo em um Blob; arquivos grandes exigem memória e espaço disponíveis, principalmente no celular.

A pasta existente recebe `05. Engenharia & Temporadas/TERA BI/<modalidade>`. Os metadados de controle são definidos pelo servidor, sem criar permissões públicas. Nada de links “qualquer pessoa”. O catálogo usa 30 arquivos por página; nomes/autores/credenciais não autorizados não são retornados. O envio exige edição interna; consulta/download exigem acesso atual à modalidade e à página usada pelo TERA BI. Ocultação e revogação valem também para os arquivos.

## CSV nos gráficos

Após importar, escolha “Usar CSV nos gráficos”. A análise lê somente a primeira parte autorizada (até 2 MiB), com até 5.000 linhas completas, e mostra a cobertura parcial quando aplicável. O arquivo original permanece completo para download. São aceitos vírgula, ponto e vírgula ou tabulação, BOM, aspas, campos multilinha, UTF-8 e leitura compatível com Windows-1252. O parser rejeita colunas inconsistentes, cabeçalhos repetidos, aspas quebradas, bytes nulos e campos/colunas excessivos.

O usuário escolhe referência, valor e formato numérico. Não há avaliação de fórmulas/HTML/código; texto e números inválidos não viram pontos. O gráfico mostra até 30 referências e a tabela até 100. Não há soma automática de linhas nem mistura com o scouting/PDI. Essa visualização é uma análise do arquivo selecionado, não uma importação para as tabelas de competição.

## PBIX

PBIX é armazenado e baixado para abrir no Power BI Desktop. Não existe renderizador PBIX no navegador desta release. Para relatório interativo Microsoft, ainda é necessária configuração própria do Power BI/Fabric e incorporação autenticada. Não usar publicação pública de relatório interno. XLSX é armazenado para download, sem execução.

## Rotas e implantação

- `GET /api/bi?scope=analysis&program=FRC`: catálogo privado paginado.
- `POST/PUT/GET /api/bi?scope=analysis-upload&program=FRC`: início, parte e consulta de progresso; ticket somente em header, nunca URL/log/storage.
- `GET /api/bi?scope=analysis-download&program=FRC&file=<id>&offset=<bytes>`: parte autorizada do arquivo.
- A mídia genérica preserva o tratamento privado de `bi-analysis`; não cai em leitura pública ou interna genérica. Exclusão pelo endpoint genérico permanece bloqueada. Arquivamento pode ser feito pela administração na lixeira recuperável do Drive.

Usa a integração existente: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_ENCRYPTION_KEY, credencial institucional protegida e Supabase do servidor. Não cria chave, recurso remoto separado ou migração. A credencial Google precisa estar válida. Não há alteração de consentimento, rotação ou contratação.

## Validação e rollback

Testes automatizados cobrem upload/download com bytes idênticos acima de 4 MB, metadados de relatório de 150 MB, limites/assinaturas, confirmação perdida, ticket adulterado/expirado, troca de identidade, leitura sem edição, modalidades/página negadas, revogação antes da resposta, CSV e interface. O teste de 150 MB é de metadados/protocolo, não prova uma transferência real desse tamanho. Não há scanner antivírus nem validação integral do contêiner PBIX/ZIP. Arquivos não são executados no Portal.

Antes da publicação: suíte, lint/build, interface móvel e teste de transferência com arquivo técnico sem dados pessoais no ambiente autorizado. Relatar separadamente o que foi simulado e o que foi realmente enviado ao Drive. Rollback: reverter o código mantendo a negação explícita de bi-analysis da versão anterior; não apagar arquivos/pastas. Nenhuma migração para desfazer.

Referências oficiais:
- Google Drive, uploads retomáveis: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Limites de Functions Vercel: https://vercel.com/docs/functions/limitations
- Power BI, incorporação segura: https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-embed-secure
