import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute

export function usePresence(user, currentPage) {
  const presenceIdRef = useRef(null);

  useEffect(() => {
    if (!user?.email) return;

    let heartbeatTimer;
    let presenceId = null;

    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return;
      } catch {
        return;
      }

      try {
        const existing = await base44.entities.UserPresence.filter({ user_email: user.email });
        const now = new Date().toISOString();

        if (existing && existing.length > 0) {
          presenceId = existing[0].id;
          await base44.entities.UserPresence.update(presenceId, {
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
          presenceId = record.id;
        }

        presenceIdRef.current = presenceId;

        heartbeatTimer = setInterval(async () => {
          if (presenceId) {
            try {
              await base44.entities.UserPresence.update(presenceId, {
                is_online: true,
                last_seen: new Date().toISOString(),
                current_page: currentPage || '',
              });
            } catch {}
          }
        }, HEARTBEAT_INTERVAL);
      } catch {
        // Silently ignore presence errors
      }
    };

    init();

    // Mark offline when leaving
    const markOffline = async () => {
      if (presenceIdRef.current) {
        try {
          await base44.entities.UserPresence.update(presenceIdRef.current, {
            is_online: false,
            last_seen: new Date().toISOString(),
          });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', markOffline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        markOffline();
      } else if (document.visibilityState === 'visible' && presenceIdRef.current) {
        base44.entities.UserPresence.update(presenceIdRef.current, {
          is_online: true,
          last_seen: new Date().toISOString(),
        }).catch(() => {});
      }
    });

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', markOffline);
      markOffline();
    };
  }, [user?.email]);

  // Update current page when it changes
  useEffect(() => {
    if (presenceIdRef.current && currentPage) {
      base44.entities.UserPresence.update(presenceIdRef.current, {
        current_page: currentPage,
        last_seen: new Date().toISOString(),
      }).catch(() => {});
    }
  }, [currentPage]);
}