import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, Circle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function formatDuration(sessionStart) {
  if (!sessionStart) return '—';
  const start = new Date(sessionStart);
  const now = new Date();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const remainMins = diffMins % 60;

  if (diffMins < 1) return 'agora';
  if (diffHours === 0) return `${diffMins}min`;
  return `${diffHours}h ${remainMins}min`;
}

function isRecentlyOnline(lastSeen) {
  if (!lastSeen) return false;
  const diff = new Date() - new Date(lastSeen);
  return diff < 2 * 60 * 1000; // 2 minutes
}

function getProgramColor(program) {
  const colors = {
    FRC: 'bg-red-500',
    FTC: 'bg-orange-500',
    FLL: 'bg-yellow-500',
    Mentor: 'bg-blue-500',
  };
  return colors[program] || 'bg-gray-500';
}

export default function OnlineUsers({ currentUser }) {
  const [tick, setTick] = useState(0);

  // Force re-render every 30s to update durations
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: presences = [] } = useQuery({
    queryKey: ['user-presences', tick],
    queryFn: () => base44.entities.UserPresence.list('-last_seen'),
    refetchInterval: 15000,
  });

  // Real-time subscription
  const [livePresences, setLivePresences] = useState(null);

  useEffect(() => {
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      setLivePresences(prev => {
        const list = prev || presences;
        if (event.type === 'create') return [...list, event.data];
        if (event.type === 'update') return list.map(p => p.id === event.id ? event.data : p);
        if (event.type === 'delete') return list.filter(p => p.id !== event.id);
        return list;
      });
    });
    return unsubscribe;
  }, []);

  const allPresences = livePresences || presences;
  const onlineUsers = allPresences.filter(p => p.is_online && isRecentlyOnline(p.last_seen));
  const recentUsers = allPresences.filter(p => !p.is_online || !isRecentlyOnline(p.last_seen)).slice(0, 5);

  return (
    <div className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1F222B]">
        <Users className="w-4 h-4 text-[#E10600]" />
        <h3 className="text-sm font-semibold text-[#F5F7FA]">Membros Online</h3>
        <span className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-500 font-semibold">{onlineUsers.length}</span>
        </span>
      </div>

      {/* Online Users */}
      <div className="p-3 space-y-2">
        {onlineUsers.length === 0 ? (
          <p className="text-xs text-[#B8BDC7] text-center py-2">Nenhum membro online</p>
        ) : (
          <AnimatePresence>
            {onlineUsers.map((presence) => (
              <motion.div
                key={presence.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  presence.user_email === currentUser?.email ? 'bg-[#E10600]/10 border border-[#E10600]/20' : 'bg-[#0B0B0D]'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full ${getProgramColor(presence.user_program)} flex items-center justify-center text-white text-xs font-bold`}>
                    {(presence.user_name || presence.user_email || '?')[0].toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0B0B0D]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#F5F7FA] truncate">
                    {presence.user_name || presence.user_email}
                    {presence.user_email === currentUser?.email && (
                      <span className="ml-1 text-[#E10600]">(você)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#B8BDC7]" />
                    <span className="text-xs text-[#B8BDC7]">{formatDuration(presence.session_start)}</span>
                    {presence.user_program && (
                      <span className={`ml-1 text-xs px-1 rounded ${getProgramColor(presence.user_program)} text-white`}>
                        {presence.user_program}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Recently Seen */}
      {recentUsers.length > 0 && (
        <div className="border-t border-[#1F222B] px-3 pb-3 pt-2">
          <p className="text-xs text-[#B8BDC7] mb-2">Vistos recentemente</p>
          <div className="space-y-1">
            {recentUsers.map((presence) => (
              <div key={presence.id} className="flex items-center gap-2 py-1">
                <div className="relative flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full ${getProgramColor(presence.user_program)} flex items-center justify-center text-white text-xs font-bold opacity-50`}>
                    {(presence.user_name || presence.user_email || '?')[0].toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-gray-500 rounded-full border border-[#111217]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#B8BDC7] truncate opacity-70">
                    {presence.user_name || presence.user_email}
                  </p>
                  <p className="text-xs text-[#B8BDC7]/50">
                    {presence.last_seen
                      ? new Date(presence.last_seen).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}