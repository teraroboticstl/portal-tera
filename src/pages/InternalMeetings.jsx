import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, Filter, Calendar, Users, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ProtectedRoute, { canEdit as userCanEdit, isAdmin } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import MeetingForm from '@/components/internal/MeetingForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function InternalMeetingsContent({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [filterProgram, setFilterProgram] = useState('all');
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.MeetingNote.list('-date'),
  });

  const deleteMeeting = useMutation({
    mutationFn: (id) => base44.entities.MeetingNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião excluída!');
    }
  });

  const filteredMeetings = filterProgram === 'all' 
    ? meetings 
    : meetings.filter(m => m.program === filterProgram);

  const canCreate = userCanEdit(user);
  const canEditMeeting = (meeting) => {
    if (!userCanEdit(user)) return false;
    return isAdmin(user) || meeting.created_by === user.email;
  };
  const canDeleteMeeting = () => isAdmin(user);

  return (
    <InternalPageLayout user={user} currentPage="InternalMeetings" title="Reuniões">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#E10600]" />
              Registro de Reuniões
            </h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Documente as reuniões da equipe</p>
          </div>
          {canCreate ? (
            <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Reunião
            </Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7] cursor-not-allowed">
              <Lock className="w-4 h-4 mr-2" />
              Apenas Visualização
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-[#B8BDC7]" />
          <Tabs value={filterProgram} onValueChange={setFilterProgram}>
            <TabsList className="bg-[#111217] border border-[#1F222B]">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#E10600]">Todos</TabsTrigger>
              <TabsTrigger value="Geral" className="data-[state=active]:bg-[#E10600]">Geral</TabsTrigger>
              <TabsTrigger value="FRC" className="data-[state=active]:bg-red-500">FRC</TabsTrigger>
              <TabsTrigger value="FTC" className="data-[state=active]:bg-orange-500">FTC</TabsTrigger>
              <TabsTrigger value="FLL" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">FLL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : filteredMeetings.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Calendar className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhuma reunião encontrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetings.map((meeting, index) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 hover:border-[#E10600]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant={meeting.program?.toLowerCase()}>{meeting.program}</Badge>
                      <span className="flex items-center gap-1 text-sm text-[#B8BDC7]">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(meeting.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">Pauta: {meeting.agenda && meeting.agenda.length > 80 ? meeting.agenda.substring(0, 80) + '...' : meeting.agenda}</h3>
                    {meeting.participants?.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-[#B8BDC7]">
                        <Users className="w-4 h-4" />
                        {meeting.participants.slice(0, 3).join(', ')}
                        {meeting.participants.length > 3 && ` +${meeting.participants.length - 3}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setViewingMeeting(meeting)} className="text-[#B8BDC7] hover:text-[#F5F7FA]">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEditMeeting(meeting) && (
                      <Button variant="ghost" size="icon" onClick={() => setEditingMeeting(meeting)} className="text-[#B8BDC7] hover:text-[#F5F7FA]">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteMeeting() && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMeeting.mutate(meeting.id)}
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

        <Dialog open={showForm || !!editingMeeting} onOpenChange={() => { setShowForm(false); setEditingMeeting(null); }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMeeting ? 'Editar Reunião' : 'Nova Reunião'}</DialogTitle>
            </DialogHeader>
            <MeetingForm 
              meeting={editingMeeting} 
              onClose={() => { setShowForm(false); setEditingMeeting(null); }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingMeeting} onOpenChange={() => setViewingMeeting(null)}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-3xl max-h-[90vh] overflow-y-auto">
            {viewingMeeting && (
              <>
                <DialogHeader>
                  <Badge variant={viewingMeeting.program?.toLowerCase()}>{viewingMeeting.program}</Badge>
                  <DialogTitle className="mt-2">
                    {format(new Date(viewingMeeting.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  {viewingMeeting.participants?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Participantes</h4>
                      <div className="flex flex-wrap gap-2">
                        {viewingMeeting.participants.map((p, i) => (
                          <span key={i} className="px-3 py-1 bg-[#1F222B] rounded-full text-sm">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-[#E10600] mb-2">Pauta</h4>
                    <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingMeeting.agenda}</p>
                  </div>
                  {viewingMeeting.technical_discussions && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Discussões Técnicas</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingMeeting.technical_discussions}</p>
                    </div>
                  )}
                  {viewingMeeting.final_decisions && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Decisões Finais</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingMeeting.final_decisions}</p>
                    </div>
                  )}
                  {viewingMeeting.pending_items && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Pendências</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingMeeting.pending_items}</p>
                    </div>
                  )}
                  {viewingMeeting.responsible_deadlines && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Responsáveis e Prazos</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingMeeting.responsible_deadlines}</p>
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

export default function InternalMeetings() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalMeetingsContent />
    </ProtectedRoute>
  );
}