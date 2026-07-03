import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Shield, Search, Filter, RefreshCw, Trash2, Plus, Edit, Upload, Settings, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import ProtectedRoute from '@/components/internal/ProtectedRoute';

const ACTION_META = {
  CREATE: { label: 'Criação', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Plus },
  UPDATE: { label: 'Edição', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Edit },
  DELETE: { label: 'Exclusão', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Trash2 },
  UPLOAD: { label: 'Upload', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Upload },
  LOGIN: { label: 'Login', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: LogIn },
  CONFIG: { label: 'Config', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Settings },
};

const PAGE_SIZE = 25;

function ActionBadge({ type }) {
  const meta = ACTION_META[type] || ACTION_META.CONFIG;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function AuditLogContent({ user }) {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [page, setPage] = useState(1);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
    refetchInterval: 30000,
  });

  // Filtros
  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || log.action_type === filterAction;
    const matchUser = filterUser === 'all' || log.user_email === filterUser;
    return matchSearch && matchAction && matchUser;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const uniqueUsers = [...new Set(logs.map(l => l.user_email).filter(Boolean))];

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  // Stats
  const stats = Object.keys(ACTION_META).map(key => ({
    key,
    count: logs.filter(l => l.action_type === key).length,
    ...ACTION_META[key],
  }));

  return (
    <InternalPageLayout user={user} currentPage="audit" title="Audit Log">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#E10600]" />
              Painel de Auditoria
            </h1>
            <p className="text-gray-400 mt-1">Registro completo de ações na área interna</p>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="gap-2 border-[#1F222B]"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.key} className={`rounded-xl border p-3 text-center ${s.color}`}>
                <Icon className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <div className="text-2xl font-black">{s.count}</div>
                <div className="text-xs opacity-70">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Buscar ação, usuário ou entidade..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-[#0B0B0D] border-[#1F222B] text-white"
              />
            </div>
            <Select value={filterAction} onValueChange={handleFilterChange(setFilterAction)}>
              <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B]">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent className="bg-[#111217] border-[#1F222B]">
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(ACTION_META).map(([key, m]) => (
                  <SelectItem key={key} value={key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUser} onValueChange={handleFilterChange(setFilterUser)}>
              <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B]">
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent className="bg-[#111217] border-[#1F222B]">
                <SelectItem value="all">Todos os usuários</SelectItem>
                {uniqueUsers.map(email => (
                  <SelectItem key={email} value={email}>{email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Mostrando {paginated.length} de {filtered.length} registros
            {filtered.length !== logs.length && ` (total: ${logs.length})`}
          </p>
        </div>

        {/* Tabela */}
        <div className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-gray-500">Carregando logs...</div>
          ) : paginated.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1F222B] bg-[#0B0B0D]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ação</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Entidade</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-[#1F222B]/50 hover:bg-[#1F222B]/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        <div>{new Date(log.created_date).toLocaleDateString('pt-BR')}</div>
                        <div className="text-gray-600">{new Date(log.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white truncate max-w-[140px]">{log.user_name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[140px]">{log.user_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge type={log.action_type} />
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs">
                        <p className="truncate" title={log.description}>{log.description}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {log.entity_name && (
                          <span className="text-xs px-2 py-0.5 bg-[#1F222B] text-gray-400 rounded font-mono">
                            {log.entity_name}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-[#1F222B]"
            >
              Anterior
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageNum = totalPages <= 7 ? i + 1 :
                  page <= 4 ? i + 1 :
                  page >= totalPages - 3 ? totalPages - 6 + i :
                  page - 3 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-[#E10600] text-white'
                        : 'text-gray-400 hover:bg-[#1F222B] hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border-[#1F222B]"
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </InternalPageLayout>
  );
}

export default function InternalAuditLog() {
  return (
    <ProtectedRoute requireAdmin>
      <AuditLogContent />
    </ProtectedRoute>
  );
}