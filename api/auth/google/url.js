import { google } from 'googleapis';
import { validateUserAuth } from '../../lib/supabaseServer.js';

/**
 * Gera a URL de consentimento OAuth 2.0 para a conta teraroboticstl@gmail.com
 * Rota: GET /api/auth/google/url
 * Apenas acessível por administradores autenticados
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    const user = await validateUserAuth(authHeader);
    if (!user.profile?.is_admin) {
      return res.status(403).json({ error: 'Apenas administradores podem gerar URL de autorização.' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        error: 'GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET ainda não configurados no servidor.'
      });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const scopes = [
      'https://www.googleapis.com/auth/drive.file'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });

    return res.status(200).json({
      authUrl,
      redirectUri
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
