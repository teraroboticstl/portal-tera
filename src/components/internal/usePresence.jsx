import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minuto
const OFFLINE_DEBOUNCE_MS = 15 * 1000; // 15 segundos para evitar flap durante navegação interna SPA

// Estado singleton compartilhado entre transições de páginas da Área Interna
let globalPresenceId = null;
let globalUserEmail = null;
let globalOfflineTimer = null;
let globalSubscribersCount = 0;

export function usePresence(user, currentPage) {
  const lastPageRef = useRef(currentPage);

  useEffect(() => {
    if (!user?.email) return;

    // Cancela qualquer agendamento de offline pendente de transição de rota anterior
    if (globalOfflineTimer) {
      clearTimeout(globalOfflineTimer);
      globalOfflineTimer = null;
    }

    globalSubscribersCount += 1;

    let heartbeatTimer = null;
    let visibilityOfflineTimer = null;
    let isCancelled = false;

    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth || isCancelled) return;

        const now = new Date().toISOString();

        // Se já temos a presença inicializada para o mesmo usuário, reaproveita o ID
        if (globalPresenceId && globalUserEmail === user.email) {
          await base44.entities.UserPresence.update(globalPresenceId, {
            is_online: true,
            last_seen: now,
            current_page: currentPage || '',
          });
        } else {
          const existing = await base44.entities.UserPresence.filter({ user_email: user.email });
          if (isCancelled) return;

          if (existing && existing.length > 0) {
            globalPresenceId = existing[0].id;
            globalUserEmail = user.email;
            await base44.entities.UserPresence.update(globalPresenceId, {
              is_online: true,
              last_seen: now,
              session_start: now,
              current_page: currentPage || '',
              user_name: user.full_name || user.email,
              user_program: user.program || '',
            });
          } else {
            const record = await base44.entities.UserPresence.create({
              user_email: user.email,
              user_name: user.full_name || user.email,
              user_program: user.program || '',
              is_online: true,
              last_seen: now,
              session_start: now,
              current_page: currentPage || '',
            });
            if (isCancelled) return;
            globalPresenceId = record.id;
            globalUserEmail = user.email;
          }
        }

        // Heartbeat periódico (apenas se a aba estiver visível)
        heartbeatTimer = setInterval(async () => {
          if (globalPresenceId && document.visibilityState !== 'hidden') {
            try {
              await base44.entities.UserPresence.update(globalPresenceId, {
                is_online: true,
                last_seen: new Date().toISOString(),
                current_page: currentPage || '',
              });
            } catch {}
          }
        }, HEARTBEAT_INTERVAL);
      } catch {
        // Falhas não críticas de presença não devem interromper o app
      }
    };

    init();

    // Encerramento imediato de sessão ao fechar navegador ou recarregar
    const handleBeforeUnload = () => {
      if (globalPresenceId) {
        try {
          base44.entities.UserPresence.update(globalPresenceId, {
            is_online: false,
            last_seen: new Date().toISOString(),
          }).catch(() => {});
        } catch {}
      }
    };

    // Mudança de visibilidade da aba (não alterna is_online imediatamente)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Aguarda 3 minutos de inatividade em background antes de marcar offline
        visibilityOfflineTimer = setTimeout(() => {
          if (document.visibilityState === 'hidden' && globalPresenceId) {
            base44.entities.UserPresence.update(globalPresenceId, {
              is_online: false,
              last_seen: new Date().toISOString(),
            }).catch(() => {});
          }
        }, 3 * 60 * 1000);
      } else if (document.visibilityState === 'visible') {
        if (visibilityOfflineTimer) {
          clearTimeout(visibilityOfflineTimer);
          visibilityOfflineTimer = null;
        }
        if (globalPresenceId) {
          base44.entities.UserPresence.update(globalPresenceId, {
            is_online: true,
            last_seen: new Date().toISOString(),
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      globalSubscribersCount = Math.max(0, globalSubscribersCount - 1);

      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (visibilityOfflineTimer) clearTimeout(visibilityOfflineTimer);

      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Se todas as instâncias da Área Interna forem desmontadas (ex: usuário foi para área pública),
      // aguarda o debounce antes de marcar como offline para evitar loop durante navegações SPA
      if (globalSubscribersCount === 0 && globalPresenceId) {
        const idToMarkOffline = globalPresenceId;
        globalOfflineTimer = setTimeout(async () => {
          try {
            await base44.entities.UserPresence.update(idToMarkOffline, {
              is_online: false,
              last_seen: new Date().toISOString(),
            });
            if (globalPresenceId === idToMarkOffline) {
              globalPresenceId = null;
              globalUserEmail = null;
            }
          } catch {}
        }, OFFLINE_DEBOUNCE_MS);
      }
    };
  }, [user?.email]);

  // Atualiza current_page apenas quando ela realmente muda e a presença está estabelecida
  useEffect(() => {
    if (globalPresenceId && currentPage && currentPage !== lastPageRef.current) {
      lastPageRef.current = currentPage;
      base44.entities.UserPresence.update(globalPresenceId, {
        current_page: currentPage,
        last_seen: new Date().toISOString(),
      }).catch(() => {});
    }
  }, [currentPage]);
}