import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, BookOpen, Wrench, Code, Megaphone,
  Calendar, Users, Link as LinkIcon, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedRoute, { canEdit as userCanEdit, isAdmin } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import DiaryForm from '@/components/diary/DiaryForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const SECTION_META = {
  Engenharia: { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  Programação: { icon: Code, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  Marketing: { icon: Megaphone, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
};

function EntryCard({ entry, onEdit, onDelete, canEdit, canDelete }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SECTION_META[entry.section] || SECTION_META.Engenharia;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111217] border ${meta.border} rounded-xl overflow-hidden`}
    >
      {/* Header */}
      <div
        className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${meta.color}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{entry.section}</span>
              <span className="text-xs text-[#B8BDC7] bg-[#1F222B] px-2 py-0.5 rounded">{entry.program}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#B8BDC7]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(entry.date + 'T12:00:00'), "d 'de' MMM, yyyy", { locale: ptBR })}
              </span>
              {entry.participants && (
                <span className="flex items-center gap-1 truncate">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{entry.participants}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onEdit(entry); }}
              className="text-[#B8BDC7] hover:text-white h-7 px-2">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
              className="text-red-500 hover:text-red-400 h-7 px-2">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-[#B8BDC7]" /> : <ChevronDown className="w-4 h-4 text-[#B8BDC7]" />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[#1F222B] pt-4">
              {entry.brainstorm && (
                <Section label="💡 Brainstorm" text={entry.brainstorm} />
              )}
              {entry.build_notes && (
                <Section label="🔧 Anotações de Construção / Atividades" text={entry.build_notes} />
              )}
              {entry.process_description && (
                <Section label="📋 Descrição dos Processos" text={entry.process_description} />
              )}
              {entry.links?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#E10600] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> Links
                  </p>
                  <div className="space-y-1">
                    {entry.links.map((l, i) => (
                      <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                        className="block text-blue-400 text-sm hover:underline truncate">{l}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Section({ label, text }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#E10600] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[#B8BDC7] text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

function InternalBoardDiaryContent({ user }) {
  const [filterProgram, setFilterProgram] = useState('FRC');
  const [filterSection, setFilterSection] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['board-diary', filterProgram],
    queryFn: () => base44.entities.BoardDiary.filter({ program: filterProgram }, '-date'),
  });

  const deleteEntry = useMutation({
    mutationFn: id => base44.entities.BoardDiary.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-diary'] }); toast.success('Entrada excluída!'); },
  });

  const filtered = filterSection === 'all' ? entries : entries.filter(e => e.section === filterSection);

  const canCreate = userCanEdit(user);
  const canEditEntry = (e) => userCanEdit(user) && (isAdmin(user) || e.created_by === user.email);
  const canDeleteEntry = () => isAdmin(user);

  return (
    <InternalPageLayout user={user} currentPage="InternalBoardDiary" title="Diário de Bordo">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#E10600]" />
              Diário de Bordo
            </h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Engenharia · Programação · Marketing</p>
          </div>
          {canCreate ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-[#E10600] hover:bg-[#E10600]/90">
              <Plus className="w-4 h-4 mr-2" /> Nova Entrada
            </Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]">
              <Lock className="w-4 h-4 mr-2" /> Apenas Visualização
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Tabs value={filterProgram} onValueChange={setFilterProgram}>
            <TabsList className="bg-[#111217] border border-[#1F222B]">
              <TabsTrigger value="FRC" className="data-[state=active]:bg-red-600">FRC</TabsTrigger>
              <TabsTrigger value="FTC" className="data-[state=active]:bg-orange-500">FTC</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={filterSection} onValueChange={setFilterSection}>
            <TabsList className="bg-[#111217] border border-[#1F222B]">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#E10600]">Todas</TabsTrigger>
              <TabsTrigger value="Engenharia" className="data-[state=active]:bg-blue-600">Engenharia</TabsTrigger>
              <TabsTrigger value="Programação" className="data-[state=active]:bg-green-600">Programação</TabsTrigger>
              <TabsTrigger value="Marketing" className="data-[state=active]:bg-pink-600">Marketing</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Entries */}
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhuma entrada encontrada. Crie a primeira!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={e => { setEditing(e); setShowForm(true); }}
                onDelete={id => deleteEntry.mutate(id)}
                canEdit={canEditEntry(entry)}
                canDelete={canDeleteEntry()}
              />
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Entrada' : 'Nova Entrada no Diário'}</DialogTitle>
            </DialogHeader>
            <DiaryForm
              entry={editing}
              program={filterProgram}
              onClose={() => { setShowForm(false); setEditing(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalBoardDiary() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalBoardDiaryContent />
    </ProtectedRoute>
  );
}