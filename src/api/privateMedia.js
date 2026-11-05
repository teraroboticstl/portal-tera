import { supabase } from './supabaseClient.js';
import { requestDeadline } from './requestDeadline.js';

export const isPrivateMediaPath = value => typeof value === 'string' && /^\/api\/media\/[a-zA-Z0-9_-]+$/.test(value);
export const isMediaAddress = value => isPrivateMediaPath(value) || (typeof value === 'string' && /^https?:\/\//i.test(value));

// Send bearer credentials only to the exact same-origin media route.
export async function fetchPrivateMedia(src, actorId, signal) {
  if (!isPrivateMediaPath(src) || !actorId) throw new Error('Anexo protegido indisponível.');
  return requestDeadline(async deadlineSignal => {
    const { data: { session } } = await supabase.auth.getSession();
    if (signal.aborted || session?.user?.id !== actorId || !session?.access_token) throw new Error('Sessão inválida.');
    const combined = new AbortController();
    const abort = () => combined.abort();
    signal.addEventListener('abort', abort, { once: true });
    deadlineSignal.addEventListener('abort', abort, { once: true });
    try {
      if (signal.aborted || deadlineSignal.aborted) combined.abort();
      const response = await fetch(src, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: combined.signal
      });
      if (!response.ok) throw new Error('Anexo protegido indisponível.');
      return await response.blob();
    } finally {
      signal.removeEventListener('abort', abort);
      deadlineSignal.removeEventListener('abort', abort);
    }
  });
}
