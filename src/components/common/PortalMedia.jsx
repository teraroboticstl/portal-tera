import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { fetchPrivateMedia, isPrivateMediaPath, isMediaAddress } from '@/api/privateMedia';

export default function PortalMedia({ src, type = 'image', alt = '', children, ...props }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState('');
  const privatePath = isPrivateMediaPath(src);
  useEffect(() => {
    let live = true, objectUrl;
    const controller = new AbortController();
    setLoaded(null);
    setError('');
    if (privatePath) {
      fetchPrivateMedia(src, user?.id, controller.signal).then(blob => {
        if (live) {
          objectUrl = URL.createObjectURL(blob);
          setLoaded({ src, actor: user.id, url: objectUrl });
        }
      }).catch(() => {
        if (live) setError('Não foi possível carregar este anexo. Verifique sua conexão e seu acesso.');
      });
    }
    return () => { live = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, privatePath, user?.id]);
  const url = privatePath ? (loaded?.src === src && loaded.actor === user?.id ? loaded.url : null) : src;
  if (error) return <p role="alert" className="text-sm text-red-300">{error}</p>;
  if (!isMediaAddress(src)) return <p>Endereço de anexo inválido.</p>;
  if (!url) return <p role="status" className="text-sm">Carregando anexo…</p>;
  if (type === 'video') return <video {...props} src={url} controls preload="metadata" playsInline />;
  if (type === 'link') return <a {...props} href={url} target="_blank" rel="noopener noreferrer">{children || 'Abrir anexo'}</a>;
  return <img {...props} src={url} alt={alt} loading="lazy" />;
}
