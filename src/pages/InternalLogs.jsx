import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, Filter, BookOpen, Calendar, Users, X, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ProtectedRoute, { canEdit as userCanEdit, isAdmin } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import DailyLogForm from '@/components/internal/DailyLogForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function InternalLogsContent({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [viewingLog, setViewingLog] = useState(null);
  const [filterProgram, setFilterProgram] = useState('all');
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['daily-logs'],
    queryFn: () => base44.entities.DailyLog.list('-date'),
  });

  const deleteLog = useMutation({
    mutationFn: (id) => base44.entities.DailyLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      toast.success('Log excluído!');
    }
  });

  const filteredLogs = filterProgram === 'all' 
    ? logs 
    : logs.filter(l => l.program === filterProgram);

  // Verificar permissões baseadas em member_role
  const canCreate = userCanEdit(user);
  
  const canEditLog = (log) => {
    if (!userCanEdit(user)) return false;
    return isAdmin(user) || log.created_by === user.email;
  };

  const canDeleteLog = (log) => {
    return isAdmin(user);
  };

  return (
    <InternalPageLayout user={user} currentPage="InternalLogs" title="Logs Diários">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#E10600]" />
              Logs Diários
            </h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Registre as atividades diárias da equipe</p>
          </div>
          {canCreate ? (
            <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Log
            </Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7] cursor-not-allowed">
              <Lock className="w-4 h-4 mr-2" />
              Apenas Visualização
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-[#B8BDC7]" />
          <Tabs value={filterProgram} onValueChange={setFilterProgram}>
            <TabsList className="bg-[#111217] border border-[#1F222B]">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#E10600]">Todos</TabsTrigger>
              <TabsTrigger value="FRC" className="data-[state=active]:bg-red-500">FRC</TabsTrigger>
              <TabsTrigger value="FTC" className="data-[state=active]:bg-orange-500">FTC</TabsTrigger>
              <TabsTrigger value="FLL" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">FLL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <LoadingSpinner />
        ) : filteredLogs.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhum log encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 hover:border-[#E10600]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant={log.program?.toLowerCase()}>{log.program}</Badge>
                      <Badge>{log.log_type}</Badge>
                      <span className="flex items-center gap-1 text-sm text-[#B8BDC7]">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(log.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-[#F5F7FA] mb-2 line-clamp-2">{log.what_was_done}</p>
                    {log.participants?.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-[#B8BDC7]">
                        <Users className="w-4 h-4" />
                        {log.participants.slice(0, 3).join(', ')}
                        {log.participants.length > 3 && ` +${log.participants.length - 3}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingLog(log)}
                      className="text-[#B8BDC7] hover:text-[#F5F7FA]"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEditLog(log) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingLog(log)}
                        className="text-[#B8BDC7] hover:text-[#F5F7FA]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteLog(log) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLog.mutate(log.id)}
                        className="text-[#B8BDC7] hover:text-[#E10600]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showForm || !!editingLog} onOpenChange={() => { setShowForm(false); setEditingLog(null); }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLog ? 'Editar Log' : 'Novo Log Diário'}</DialogTitle>
            </DialogHeader>
            <DailyLogForm 
              log={editingLog} 
              onClose={() => { setShowForm(false); setEditingLog(null); }}
            />
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-3xl max-h-[90vh] overflow-y-auto">
            {viewingLog && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={viewingLog.program?.toLowerCase()}>{viewingLog.program}</Badge>
                    <Badge>{viewingLog.log_type}</Badge>
                  </div>
                  <DialogTitle>
                    {format(new Date(viewingLog.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  {viewingLog.participants?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Participantes</h4>
                      <div className="flex flex-wrap gap-2">
                        {viewingLog.participants.map((p, i) => (
                          <span key={i} className="px-3 py-1 bg-[#1F222B] rounded-full text-sm">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-[#E10600] mb-2">O que foi feito</h4>
                    <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingLog.what_was_done}</p>
                  </div>
                  {viewingLog.decisions_made && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Decisões tomadas</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingLog.decisions_made}</p>
                    </div>
                  )}
                  {viewingLog.problems_found && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Problemas encontrados</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingLog.problems_found}</p>
                    </div>
                  )}
                  {viewingLog.solutions && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Soluções</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingLog.solutions}</p>
                    </div>
                  )}
                  {viewingLog.next_steps && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Próximos passos</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingLog.next_steps}</p>
                    </div>
                  )}
                  {viewingLog.evidence_images?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Evidências</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {viewingLog.evidence_images.map((img, i) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                            <img src={img} alt={`Evidência ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalLogs() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalLogsContent />
    </ProtectedRoute>
  );
}