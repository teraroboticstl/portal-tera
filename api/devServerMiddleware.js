import uploadHandler from './media/upload.js';
import mediaStreamHandler from './media/[id].js';
import authUrlHandler from './auth/google/url.js';
import authCallbackHandler from './auth/google/callback.js';
import fllAudioConfigHandler from './fll/config.js';
import fllAudioStreamHandler from './fll/audio.js';
import fllSeasonHandler from './fll/season.js';

/**
 * Middleware para emular Vercel Serverless Functions durante o desenvolvimento no Vite
 */
export function devApiMiddleware(req, res, next) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = url.pathname;

  // Adicionar método helper res.status() e res.json() se ausentes (Node.js nativo)
  if (!res.status) {
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
  }

  if (!res.json) {
    res.json = function (data) {
      this.setHeader('Content-Type', 'application/json');
      this.end(JSON.stringify(data));
      return this;
    };
  }

  if (!res.send) {
    res.send = function (body) {
      if (typeof body === 'object') {
        return this.json(body);
      }
      this.setHeader('Content-Type', 'text/html; charset=utf-8');
      this.end(body);
      return this;
    };
  }

  // Roteamento de APIs
  if (pathname === '/api/media/upload') {
    return uploadHandler(req, res);
  }

  if (pathname.startsWith('/api/media/') && pathname !== '/api/media/upload') {
    const rawId = pathname.replace('/api/media/', '').split('/')[0];
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      id: rawId
    };
    return mediaStreamHandler(req, res);
  }

  if (pathname === '/api/fll/season' || pathname.startsWith('/api/fll/season/')) {
    req.query = Object.fromEntries(url.searchParams.entries());
    return fllSeasonHandler(req, res);
  }

  if (pathname === '/api/fll/audio/config' || pathname === '/api/fll/config') {
    req.query = Object.fromEntries(url.searchParams.entries());
    return fllAudioConfigHandler(req, res);
  }

  if (pathname === '/api/fll/audio' || pathname.startsWith('/api/fll/audio/')) {
    const rawSlot = pathname.replace('/api/fll/audio/', '').split('/')[0];
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      slot: rawSlot || url.searchParams.get('slot')
    };
    return fllAudioStreamHandler(req, res);
  }

  if (pathname === '/api/auth/google/url') {
    return authUrlHandler(req, res);
  }

  if (pathname === '/api/auth/google/callback') {
    req.query = Object.fromEntries(url.searchParams.entries());
    return authCallbackHandler(req, res);
  }

  next();
}
