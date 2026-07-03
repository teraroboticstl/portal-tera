import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, Filter, FlaskConical, Calendar, CheckCircle, XCircle, RefreshCw, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ProtectedRoute, { canEdit as userCanEdit, isAdmin } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import PrototypeForm from '@/components/internal/PrototypeForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function InternalPrototypesContent({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPrototype, setEditingPrototype] = useState(null);
  const [viewingPrototype, setViewingPrototype] = useState(null);
  const [filterProgram, setFilterProgram] = useState('all');
  const queryClient = useQueryClient();

  const { data: prototypes = [], isLoading } = useQuery({
    queryKey: ['prototypes'],
    queryFn: () => base44.entities.PrototypeTest.list('-date'),
  });

  const deletePrototype = useMutation({
    mutationFn: (id) => base44.entities.PrototypeTest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      toast.success('Protótipo excluído!');
    }
  });

  const filteredPrototypes = filterProgram === 'all' 
    ? prototypes 
    : prototypes.filter(p => p.program === filterProgram);

  const canCreate = userCanEdit(user);
  const canEditProto = (proto) => {
    if (!userCanEdit(user)) return false;
    return isAdmin(user) || proto.created_by === user.email;
  };
  const canDeleteProto = () => isAdmin(user);

  const getConclusionIcon = (conclusion) => {
    switch (conclusion) {
      case 'Aprovado': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Refazer': return <RefreshCw className="w-5 h-5 text-yellow-500" />;
      case 'Cancelado': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <InternalPageLayout user={user} currentPage="InternalPrototypes" title="Protótipos e Testes">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-[#E10600]" />
              Protótipos e Testes
            </h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Registre testes e iterações de protótipos</p>
          </div>
          {canCreate ? (
            <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Teste
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
              <TabsTrigger value="FRC" className="data-[state=active]:bg-red-500">FRC</TabsTrigger>
              <TabsTrigger value="FTC" className="data-[state=active]:bg-orange-500">FTC</TabsTrigger>
              <TabsTrigger value="FLL" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">FLL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : filteredPrototypes.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <FlaskConical className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhum teste encontrado.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredPrototypes.map((proto, index) => (
              <motion.div
                key={proto.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 hover:border-[#E10600]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {getConclusionIcon(proto.conclusion)}
                    <div>
                      <h3 className="font-bold">{proto.subsystem}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#B8BDC7]">
                        <Badge variant={proto.program?.toLowerCase()}>{proto.program}</Badge>
                        <span>{format(new Date(proto.date), "d MMM yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={
                    proto.conclusion === 'Aprovado' ? 'bg-green-500/20 text-green-400' :
                    proto.conclusion === 'Refazer' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }>{proto.conclusion}</Badge>
                </div>
                
                <p className="text-[#B8BDC7] text-sm line-clamp-2 mb-4">{proto.hypothesis}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewingPrototype(proto)} className="text-[#B8BDC7]">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    {canEditProto(proto) && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingPrototype(proto)} className="text-[#B8BDC7]">
                        <Edit2 className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                  {canDeleteProto() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePrototype.mutate(proto.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={showForm || !!editingPrototype} onOpenChange={() => { setShowForm(false); setEditingPrototype(null); }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPrototype ? 'Editar Teste' : 'Novo Teste de Protótipo'}</DialogTitle>
            </DialogHeader>
            <PrototypeForm 
              prototype={editingPrototype} 
              onClose={() => { setShowForm(false); setEditingPrototype(null); }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingPrototype} onOpenChange={() => setViewingPrototype(null)}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-3xl max-h-[90vh] overflow-y-auto">
            {viewingPrototype && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={viewingPrototype.program?.toLowerCase()}>{viewingPrototype.program}</Badge>
                    <Badge className={
                      viewingPrototype.conclusion === 'Aprovado' ? 'bg-green-500/20 text-green-400' :
                      viewingPrototype.conclusion === 'Refazer' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }>{viewingPrototype.conclusion}</Badge>
                  </div>
                  <DialogTitle>{viewingPrototype.subsystem}</DialogTitle>
                  <p className="text-[#B8BDC7] text-sm">
                    {format(new Date(viewingPrototype.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div>
                    <h4 className="font-medium text-[#E10600] mb-2">O que tentamos / Hipótese</h4>
                    <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.hypothesis}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#E10600] mb-2">Como testamos</h4>
                    <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.test_method}</p>
                  </div>
                  {viewingPrototype.result && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Resultado</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.result}</p>
                    </div>
                  )}
                  {viewingPrototype.what_didnt_work && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">O que NÃO funcionou</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.what_didnt_work}</p>
                    </div>
                  )}
                  {viewingPrototype.lessons_learned && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">O que aprendemos</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.lessons_learned}</p>
                    </div>
                  )}
                  {viewingPrototype.improvements && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">O que melhoramos</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.improvements}</p>
                    </div>
                  )}
                  {viewingPrototype.decision_reason && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Por que decidimos isso</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.decision_reason}</p>
                    </div>
                  )}
                  {viewingPrototype.metrics_kpis && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Métricas / KPIs</h4>
                      <p className="text-[#B8BDC7] whitespace-pre-wrap">{viewingPrototype.metrics_kpis}</p>
                    </div>
                  )}
                  {viewingPrototype.evidence_images?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Imagens de Evidência</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {viewingPrototype.evidence_images.map((img, i) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                            <img src={img} alt={`Evidência ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewingPrototype.video_urls?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Vídeos</h4>
                      <div className="space-y-3">
                        {viewingPrototype.video_urls.map((url, i) => {
                          const isFile = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('.avi') || url.includes('base44.app');
                          return (
                            <div key={i} className="bg-[#1A1D24] border border-[#2A2D36] rounded-lg p-2">
                              {isFile ? (
                                <video src={url} controls className="w-full rounded mb-2 max-h-64" />
                              ) : null}
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm truncate block">{url}</a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {viewingPrototype.evidence_links?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-[#E10600] mb-2">Links de Evidências</h4>
                      <div className="space-y-1">
                        {viewingPrototype.evidence_links.map((link, i) => (
                          <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-blue-400 hover:underline text-sm truncate">{link}</a>
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

export default function InternalPrototypes() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalPrototypesContent />
    </ProtectedRoute>
  );
}