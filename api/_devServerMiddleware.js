import mediaHandler from './media/[id].js';
import authHandler from './auth/google/[action].js';
import avaHandler from './ava/[action].js';
import fllHandler from './fll/[action].js';

/**
 * Middleware para emular Vercel Serverless Functions durante o desenvolvimento local no Vite
 * Atende às 3 Serverless Functions consolidadas:
 *   - /api/media/*        -> mediaHandler (api/media/[id].js)
 *   - /api/auth/google/*  -> authHandler  (api/auth/google/[action].js)
 *   - /api/fll/*          -> fllHandler   (api/fll/[action].js)
 */
export async function devApiMiddleware(req, res, next) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = url.pathname;

  // Adicionar métodos helpers res.status(), res.json(), res.send() se ausentes
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

  if (pathname.startsWith('/api/ava/')) {
    req.query=Object.fromEntries(url.searchParams.entries());
    if(req.method==='POST' && req.body===undefined){
      const chunks=[];let bytes=0;
      for await(const chunk of req){bytes+=chunk.length;if(bytes>150000)return res.status(413).json({error:'Conteúdo excede o tamanho permitido.'});chunks.push(chunk);}
      req.body=Buffer.concat(chunks).toString('utf8');
    }
    return avaHandler(req,res);
  }
  // 1. Roteamento de Mídia (/api/media/*)
  if (pathname === '/api/media/upload' || pathname === '/api/media') {
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      id: 'upload'
    };
    return mediaHandler(req, res);
  }

  if (pathname.startsWith('/api/media/')) {
    const rawId = pathname.replace('/api/media/', '').split('/')[0];
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      id: rawId
    };
    return mediaHandler(req, res);
  }

  // 2. Roteamento FLL (/api/fll/*)
  if (pathname === '/api/fll/season' || pathname.startsWith('/api/fll/season/')) {
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      action: 'season'
    };
    return fllHandler(req, res);
  }

  if (pathname === '/api/fll/audio/config' || pathname === '/api/fll/config') {
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      action: 'config'
    };
    return fllHandler(req, res);
  }

  if (pathname === '/api/fll/audio' || pathname.startsWith('/api/fll/audio/')) {
    const rawSlot = pathname.startsWith('/api/fll/audio/')
      ? pathname.slice('/api/fll/audio/'.length).split('/')[0]
      : '';
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      action: 'audio',
      slot: rawSlot || url.searchParams.get('slot')
    };
    return fllHandler(req, res);
  }

  // 3. Roteamento Google OAuth (/api/auth/google/*)
  if (pathname === '/api/auth/google/url') {
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      action: 'url'
    };
    return authHandler(req, res);
  }

  if (pathname === '/api/auth/google/callback') {
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      action: 'callback'
    };
    return authHandler(req, res);
  }

  next();
}
