import { google } from 'googleapis';

/**
 * Recebe o código de autorização OAuth do Google e extrai o GOOGLE_REFRESH_TOKEN
 * Rota: GET /api/auth/google/callback
 */
export default async function handler(req, res) {
  const code = req.query?.code || new URL(req.url, `http://${req.headers.host}`).searchParams.get('code');
  const error = req.query?.error || new URL(req.url, `http://${req.headers.host}`).searchParams.get('error');

  if (error) {
    return res.status(400).send(`
      <html>
        <body style="font-family:sans-serif; background:#0B0B0D; color:#fff; padding:40px; text-align:center;">
          <h2 style="color:#E10600;">Autorização Cancelada ou Recusada</h2>
          <p>${error}</p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html>
        <body style="font-family:sans-serif; background:#0B0B0D; color:#fff; padding:40px; text-align:center;">
          <h2 style="color:#E10600;">Código OAuth Ausente</h2>
          <p>Nenhum código de autorização foi fornecido na requisição.</p>
        </body>
      </html>
    `);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return res.status(200).send(`
        <html>
          <head><title>Portal Tera - Google OAuth</title></head>
          <body style="font-family:system-ui,sans-serif; background:#0B0B0D; color:#fff; padding:40px; line-height:1.6;">
            <div style="max-width:600px; margin:0 auto; background:#111217; border:1px solid #1F222B; border-radius:12px; padding:32px;">
              <h2 style="color:#ffaa00; margin-top:0;">Aviso: Refresh Token Não Retornado</h2>
              <p>O Google não retornou um novo <code>refresh_token</code> nesta tentativa porque a conta institucional já havia concedido permissão anteriormente.</p>
              <p><strong>Como resolver:</strong></p>
              <ol style="color:#B8BDC7;">
                <li>Acesse as <a href="https://myaccount.google.com/permissions" target="_blank" style="color:#E10600;">Permissões da Conta Google</a> com <code>teraroboticstl@gmail.com</code>.</li>
                <li>Remova o acesso do aplicativo <strong>Portal Tera</strong>.</li>
                <li>Tente a autorização novamente no Portal Tera.</li>
              </ol>
            </div>
          </body>
        </html>
      `);
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Portal Tera - Google OAuth Concluído</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family:system-ui, -apple-system, sans-serif; background:#0B0B0D; color:#F0F2F5; padding:40px 20px; display:flex; justify-content:center; align-items:center; min-height:80vh;">
          <div style="max-width:640px; width:100%; background:#111217; border:1px solid #1F222B; border-radius:16px; padding:36px; box-shadow:0 12px 32px rgba(0,0,0,0.5);">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
              <div style="width:36px; height:36px; border-radius:8px; background:#E10600; display:flex; align-items:center; justify-content:center; font-weight:bold; color:white;">T</div>
              <h2 style="margin:0; font-size:22px;">Autorização Concluída com Sucesso!</h2>
            </div>
            <p style="color:#B8BDC7; font-size:14px; margin-bottom:24px;">
              O Google Drive da conta <strong>teraroboticstl@gmail.com</strong> foi conectado com permissão offline. Copie o token abaixo e cadastre nas variáveis de ambiente da Vercel.
            </p>
            
            <label style="display:block; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; color:#B8BDC7; margin-bottom:8px;">
              GOOGLE_REFRESH_TOKEN
            </label>
            <div style="background:#000; border:1px solid #2A2D38; border-radius:8px; padding:14px; font-family:monospace; font-size:13px; color:#4ade80; word-break:break-all; user-select:all; margin-bottom:20px;">
              ${refreshToken}
            </div>

            <button onclick="navigator.clipboard.writeText('${refreshToken}'); alert('Refresh Token copiado para a área de transferência!');" style="background:#E10600; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:14px; width:100%;">
              Copiar Refresh Token
            </button>

            <div style="margin-top:24px; border-top:1px solid #1F222B; padding-top:16px; font-size:12px; color:#6B7280;">
              Próximo passo: Cole este valor na variável <code>GOOGLE_REFRESH_TOKEN</code> na Vercel (Configurações → Environment Variables) e faça o redeploy.
            </div>
          </div>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('[Google OAuth Callback] Erro na troca de tokens:', err);
    return res.status(500).send(`
      <html>
        <body style="font-family:sans-serif; background:#0B0B0D; color:#fff; padding:40px; text-align:center;">
          <h2 style="color:#E10600;">Erro na Troca de Tokens</h2>
          <p>${err.message}</p>
        </body>
      </html>
    `);
  }
}
