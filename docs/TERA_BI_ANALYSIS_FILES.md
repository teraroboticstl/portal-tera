# TERA BI — biblioteca privada de análises

Biblioteca disponível dentro dos painéis FRC, FTC e FLL. Recebe relatórios PDF, imagens PNG/JPG/WebP de gráficos, arquivos CSV/XLSX de scouting e relatórios PBIX para download. Imagens têm prévia acionada pelo usuário; os demais formatos são baixados. Arquivos não são executados nem interpretados como instruções, não alteram os registros de scouting e não alimentam automaticamente os indicadores.

O Portal mantém os painéis React existentes. Um PBIX anexado não vira relatório Microsoft interativo: isso depende de publicação no serviço Power BI e configuração de incorporação autenticada. Não usar “Publicar na Web” para análises internas. Referência: https://learn.microsoft.com/en-us/power-bi/service-embed-secure

## Armazenamento e permissões

- Reutiliza o Google Drive institucional já configurado. No primeiro envio, organiza `05. Engenharia & Temporadas/TERA BI/<modalidade>` sob a raiz existente. Não cria tabelas nem copia scouting para outra base.
- `appProperties` gravadas pelo servidor: app `portal_tera`, contexto `bi-analysis`, modalidade validada, visibilidade `private`, autor da sessão. Identidades do autor não são expostas no catálogo.
- `GET /api/bi?scope=analysis&program=FRC` lista 30 arquivos por página, com cursor e verificação de identidade/permissão antes e depois da consulta. A biblioteca tem falha independente dos indicadores.
- Upload usa o endpoint multipart existente e exige edição interna, modalidade e página autorizadas. Listagem, HEAD, leitura e download exigem acesso atual ao painel/modalidade, inclusive para quem conhece o ID do arquivo. Ocultar a página bloqueia também os arquivos para membros comuns.
- Leitura privada usa bearer da sessão apenas na rota de mídia do próprio Portal. Não cria links públicos ou libera permissão `anyone`. O endpoint entrega os arquivos como anexos, com `nosniff` e CSP sandbox.
- Exclusão permanente dessas análises pelo endpoint genérico fica bloqueada. Para arquivar, o administrador pode mover o arquivo para a lixeira recuperável do Drive; itens na lixeira não aparecem nem podem ser baixados pelo Portal. Não implementar exclusão como efeito de “fechar gráfico”.

## Limites explícitos

Envio direto limitado a 4 MiB por arquivo pelo caminho atual da Vercel, incluindo PBIX. Para relatórios maiores, exportar uma versão reduzida em PDF, imagem ou CSV. A assinatura e o tamanho são validados no servidor; CSV/XLSX/PBIX ficam armazenados, não são importados. Não há scanner antivírus ou validação completa da estrutura ZIP; abrir esses arquivos exige a cautela normal do aplicativo de destino.

Conta somente de consulta pode baixar e ver gráficos; envio exige `portal_can_edit` ou administração. Administradores mantêm a exceção existente para modalidades/páginas. Nenhuma mudança nas permissões de PDI, AVA, arquivos antigos ou OAuth. A autorização do Drive precisa estar válida; o estado de teste do app Google pode exigir renovação periódica.

## Testar

1. Abrir TERA BI da modalidade em celular e notebook. Enviar uma imagem pequena e um PDF/CSV de teste sem dados pessoais; atualizar a página e conferir permanência no catálogo, prévia e download.
2. Conferir outra modalidade com usuário sem autorização: nenhum nome, conteúdo ou download deve ser retornado. Testar usuário sem sessão, somente consulta e página oculta.
3. Simular revogação/troca de sessão durante consulta/download: descartar resultados. Testar cursor, mais de 30 itens, arquivo inválido, >4 MiB, indisponibilidade e reautorização do Drive.
4. Rodar a suíte Node, lint e build em exportação limpa, preservando protótipos locais não relacionados. Testes com mocks não substituem validação das sessões reais de todos os níveis.

Rollback do recurso: reverter somente a release de código; não apagar pastas ou arquivos. Contexto desconhecido continuará inacessível para upload; arquivos já guardados devem permanecer privados no Drive. Antes de reverter a política de leitura do backend, conservar a regra de negação do contexto `bi-analysis` para evitar cair no acesso interno genérico da versão antiga.
