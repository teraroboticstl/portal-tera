# Upload privado e layout do PDI — 13/11/2026

O teste real falhou com `GOOGLE_DRIVE_REAUTH_REQUIRED` no endpoint de mídia. O administrador renovou pessoalmente o consentimento Google; o teste administrativo posterior confirmou gravação no Drive. Nenhum token foi incluído neste documento.

FTC e FRC compartilham agora o envio de foto e certificados/anexos: imagens JPG/PNG/WebP/GIF e PDFs (somente anexos), até 4 MiB por arquivo. O envio usa a sessão atual e informa modalidade/temporada; a referência salva continua sendo `/api/media/<id>`. Não há compartilhamento público nem alteração de permissões. A FRC utiliza a coluna `certificates` já existente.

Durante o envio, salvar/cancelar fica indisponível. Uma falha preserva o formulário e os anexos existentes, mostra o erro e permite selecionar o mesmo arquivo novamente. Falhas de salvamento deixam o formulário aberto. Remover um anexo do formulário só altera a referência local até salvar; não apaga o arquivo no Drive.

No celular, os cartões ocupam uma coluna, o estado de avaliação fica abaixo do cartão, os botões se empilham e os campos de texto usam fonte de 16 px. O progresso, a geração automática e a identidade UUID do PDI permanecem inalterados.

## Validação

- `node --experimental-vm-modules --test tests/*.test.js`: inclui os handlers reais dos formulários FTC/FRC, envio privado, erro, repetição e bloqueio durante upload.
- `npm run lint` e `npm run build` em exportação limpa da release, excluindo os protótipos locais preexistentes.
- No navegador: conferir listagem/edição em 375 px e notebook; enviar arquivo técnico pequeno sem salvar alterações em PDI de membro. O teste administrativo de Drive não substitui o teste do formulário.
- Conferir como titular autorizado e conta sem permissão quando houver sessões disponíveis. O teste administrativo não comprova todas as combinações de papéis.

## Limites operacionais

Não houve migração, backfill ou mudança de RLS. A política atual da mídia privada permite leitura ao autor do upload e à administração: um anexo enviado por administrador a PDI alheio não deve ser considerado automaticamente legível pelo titular sem teste específico. Nenhuma permissão foi ampliada para contornar essa regra.

Se o app OAuth externo continuar em **Testing**, o Google documenta expiração de refresh tokens em sete dias para escopos além de identidade. A renovação resolve a autorização atual; publicação/verificação OAuth depende do responsável e não foi alterada automaticamente. Referência: https://developers.google.com/identity/protocols/oauth2/
