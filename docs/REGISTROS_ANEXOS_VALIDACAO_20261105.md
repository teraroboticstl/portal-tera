# Registros, anexos e revisão responsiva — 05/11/2026

## Diagnóstico confirmado
- Leitura do schema efetivo pelo painel Supabase: daily_logs possui title/content/category/user_id; meeting_notes possui title/content/program/attendees; prototype_tests possui subsystem/hypothesis/result/category. Campos virtuais dos formulários não existem como colunas.
- O armazenamento Supabase consultado não tinha buckets. O shim UploadFile tentava usar o bucket gallery e obter URL pública.
- Rejeições no upload deixavam indicadores ativos sem finally. Várias mutações não exibiam erro.
- O App montava apenas o Toaster da interface antiga; as notificações Sonner usadas nas páginas não tinham renderizador.
- A tela FLL envia participantes em texto; o banco espera text[].

## Correção e compatibilidade
- Codec versionado preserva campos dos formulários em texto estruturado nas colunas já existentes, com resumo legível. Decodifica registros antigos e não aceita identidade dentro dos metadados.
- Logs novos usam user_id da sessão; edição dos próprios logs usa esse UUID. RLS e grants permanecem existentes. Reuniões não ganham autor inventado: o schema atual não tem coluna de autoria e a edição permanece sujeita às regras atuais.
- UploadFile usa o backend existente do Google Drive, sem criar bucket ou serviço novo. Contexto padrão interno/privado. Formulários possuem limite de espera, tratamento de falha e anexos opcionais.
- Limite de envio direto: 4 MiB, compatível com o teto de corpo de 4,5 MB da função Vercel incluindo multipart. Vídeos maiores precisam de link do Drive restrito à equipe. Não foi implementado upload direto ou fragmentado de vídeos grandes.
- PortalMedia envia autorização somente à rota relativa /api/media/ID, verifica a conta ativa e descarta blob URLs ao sair. Não envia bearer a URLs externas. Fotos/certificados PDI novos têm contexto restrito ao remetente e administrador; não se deduz titular por nome.
- Mídias novas de eventos usam contexto event-assets: sem compartilhamento anyone no Drive; acesso público depende do registro explicitamente público no banco, reconsultado sem cache positivo de autorização.
- A exclusão de arquivos passa a considerar referências em logs, reuniões e testes de protótipos. Falhas de consulta mantêm bloqueio de exclusão.
- Rascunhos novos são separados por UUID da conta. Resultados atrasados de upload de uma conta anterior são ignorados pelo hook. Chaves antigas sem identidade são preservadas no dispositivo, sem atribuição automática a outro usuário.
- Diálogos limitados à altura útil, ações de salvar acessíveis com rolagem, filtros flexíveis, labels associados e correção da data local nos formulários e nos detalhes principais.
- Instala Sonner no App e adiciona mensagem genérica para mutações sem tratamento local, sem refletir erro bruto do serviço.

## Validação executada
- 181 testes automatizados, 0 falhas, 0 ignorados, incluindo PostgreSQL isolado via PGlite; lint sem erros.
- Testes do adaptador real com Supabase simulado: criação dos três tipos sem arquivo, autoria pela sessão, edição parcial, negação de escrita e temporada.
- PostgreSQL isolado: inserção e leitura dos payloads nas colunas confirmadas, incluindo foto/PDF na ata; demonstração de rejeição do campo legado inexistente.
- Transporte de upload: sessão ausente, tamanho excedido, 413, rejeição de serviço/rede, bearer e contexto privado; endpoint real carregado com dependências simuladas.
- Mídia: rejeição de URL externa/conta errada/arquivo negado; PDI privado; bloqueio de exclusão por referência operacional; evento retirado de público sem autorização cacheada.
- Navegador com os componentes reais e API fictícia local, CSP sem acesso ao banco: celular 375x812 e notebook 1366x768; criação sem anexos, falha de salvamento com texto preservado, falha de upload liberando salvar, reabertura de rascunho e texto digitado durante upload mantido na ata. Sem transbordamento horizontal nos diálogos medidos.

## Cobertura e limites
- Revisão estática dos consumidores de upload, configuração de rotas e notificações. Não equivale a teste funcional de todas as páginas.
- Não foram disponibilizadas cinco sessões reais de acesso nem aparelhos físicos Android/iOS. O teste de viewport não substitui teste nesses aparelhos.
- Testes locais usam dependências simuladas ou banco isolado. Não demonstram escrita real com todos os papéis de produção.
- Não houve mudança de banco, migração ou redefinição de credenciais nesta correção. Nenhum dado real de membro foi criado para testar formulários.
- A PR #6 de geração de PDI continua separada e preservada; esta correção não aplica sua migração nem ativa o recurso.

## Arquivos
- src/lib/recordCodec.js e adaptador: contrato dos formulários com o schema existente.
- src/api/base44Client.js, googleDriveClient.js, requestDeadline.js, privateMedia.js: upload, timeout e acesso autenticado.
- PortalMedia, RecordAttachments, MeetingAttachments: renderização privada e anexos da ata.
- DailyLogForm, MeetingForm, PrototypeForm, useDraft: submissão, erro, espera, preservação e identidade do rascunho.
- InternalLogs, InternalMeetings, InternalPrototypes, InternalFLLMeetings: leitura compatível e responsividade.
- Páginas de anexos/equipe FLL, PDI FTC/FRC, eventos, memorial, TIR e destaques: consumidores do upload, erros e imagens.
- api/_lib/googleDrive.js, mediaSecurity.js e api/media/[id].js: contextos, privacidade e referências.
- src/App.jsx e src/lib/query-client.js: notificações e falhas de mutação visíveis.
- tests/recordSaving.test.js, recordSchema.test.js, recordMedia.test.js, mutationFeedback.test.js: regressões novas.

## Publicação e reversão
- Publicar somente após build e revisão do diff; conferir Preview do mesmo projeto Vercel.
- Nenhuma migration necessária. Para reversão do código, reverter o commit desta correção por novo commit, preservando o histórico. O texto estruturado permanece armazenado e deve ser mantido; clientes antigos podem exibir o JSON até a correção voltar.
- O build local usa configuração pública sintética apenas para compilação. Não enviar dist pré-compilado para a Vercel; ela deve usar as variáveis existentes do projeto.
