// Only public, allowlisted explanations reach the form. Never reflect provider
// payloads, connection details, tokens or arbitrary exception messages.
export function recordUploadError(error) {
 const retry=' Seu texto foi preservado. Você pode salvar sem este anexo ou tentar novamente.';
 if(error?.code==='GOOGLE_DRIVE_REAUTH_REQUIRED')return 'A autorização do Google Drive institucional precisa ser renovada pelo administrador.'+retry;
 if(error?.status===401 || /não autenticado/i.test(error?.message||''))return 'Sua sessão expirou ou não pôde ser validada. Entre novamente no Portal.'+retry;
 if(error?.status===403)return 'O servidor não autorizou o envio. Atualize sua sessão; se persistir, peça ao administrador para verificar seu acesso à modalidade e ao envio de arquivos.'+retry;
 if(error?.status===413)return 'O arquivo ultrapassa o limite do envio direto: 4 MB. Para vídeos maiores, use um link do Drive restrito à equipe.'+retry;
 if(error?.status===400 || error?.status===422)return 'O servidor recusou o arquivo ou os dados do envio. Use PNG, JPG ou WebP para imagens; MP4, WebM ou MOV para vídeos, até 4 MB.'+retry;
 if(error?.name==='AbortError'||/conexão demorou/i.test(error?.message||''))return 'O envio demorou além do esperado. Verifique sua conexão e tente novamente.'+retry;
 if(error?.code==='GOOGLE_DRIVE_UNAVAILABLE'||error?.status>=500)return 'O serviço de arquivos está temporariamente indisponível. Tente novamente; se persistir, informe o administrador.'+retry;
 return 'Não foi possível enviar o arquivo. Confira sua conexão e tente novamente.'+retry;
}
