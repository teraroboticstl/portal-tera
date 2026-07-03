import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TrendingUp, Star, Zap, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const CATEGORIES = {
  PRECISAMOS: {
    title: 'PRECISAMOS',
    description: 'Itens obrigatórios para competir bem',
    color: 'red',
    icon: TrendingUp,
    bgClass: 'bg-red-900/20 border-red-700/50',
    textClass: 'text-red-400',
    iconBgClass: 'bg-red-600'
  },
  QUEREMOS: {
    title: 'QUEREMOS',
    description: 'Itens importantes, mas negociáveis',
    color: 'yellow',
    icon: Star,
    bgClass: 'bg-yellow-900/20 border-yellow-700/50',
    textClass: 'text-yellow-400',
    iconBgClass: 'bg-yellow-600'
  },
  'SERIA BOM': {
    title: 'SERIA BOM',
    description: 'Se houver tempo',
    color: 'blue',
    icon: Zap,
    bgClass: 'bg-blue-900/20 border-blue-700/50',
    textClass: 'text-blue-400',
    iconBgClass: 'bg-blue-600'
  },
  IGNORAR: {
    title: 'IGNORAR',
    description: 'Decisão consciente de não fazer',
    color: 'gray',
    icon: XCircle,
    bgClass: 'bg-gray-900/20 border-gray-700/50',
    textClass: 'text-gray-400',
    iconBgClass: 'bg-gray-600'
  }
};

export default function PrioritiesBoard({ program }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newPriority, setNewPriority] = useState({ title: '', category: 'PRECISAMOS' });

  const { data: priorities = [], isLoading } = useQuery({
    queryKey: ['priorities', program],
    queryFn: () => base44.entities.Priority.filter({ program }, 'order')
  });

  const createPriority = useMutation({
    mutationFn: (data) => base44.entities.Priority.create({ ...data, program }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priorities', program] });
      setShowForm(false);
      setNewPriority({ title: '', category: 'PRECISAMOS' });
      toast.success('Prioridade adicionada!');
    }
  });

  const deletePriority = useMutation({
    mutationFn: (id) => base44.entities.Priority.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priorities', program] });
      toast.success('Prioridade removida!');
    }
  });

  const prioritiesByCategory = Object.keys(CATEGORIES).reduce((acc, cat) => {
    acc[cat] = priorities.filter(p => p.category === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#E10600]" />
            Prioridades Estratégicas
          </h2>
          <p className="text-[#B8BDC7] text-sm">Organize o que é essencial vs. opcional</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Prioridade
        </Button>
      </div>

      {/* Grid de Categorias */}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(CATEGORIES).map(([key, category]) => {
          const Icon = category.icon;
          const items = prioritiesByCategory[key] || [];
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${category.bgClass} border rounded-xl p-6 min-h-[250px]`}
            >
              {/* Header da Categoria */}
              <div className="flex items-start gap-3 mb-4">
                <div className={`${category.iconBgClass} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${category.iconBgClass}`} />
                    <h3 className={`font-bold ${category.textClass}`}>{category.title}</h3>
                  </div>
                  <p className="text-[#B8BDC7] text-xs">{category.description}</p>
                </div>
              </div>

              {/* Lista de Itens */}
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-[#B8BDC7] text-sm text-center py-8">Nenhum item</p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0B0B0D]/50 rounded-lg p-3 flex items-center justify-between group"
                    >
                      <span className="text-sm text-[#F5F7FA]">{item.title}</span>
                      <button
                        onClick={() => deletePriority.mutate(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dialog para Nova Prioridade */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#111217] border-[#1F222B]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F7FA]">Nova Prioridade</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createPriority.mutate(newPriority);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm text-[#B8BDC7] mb-2 block">Título</label>
              <Input
                value={newPriority.title}
                onChange={(e) => setNewPriority({ ...newPriority, title: e.target.value })}
                placeholder="Ex: Finalizar subsistema de intake"
                className="bg-[#111217] border-[#1F222B] text-[#F5F7FA]"
                required
              />
            </div>
            <div>
              <label className="text-sm text-[#B8BDC7] mb-2 block">Categoria</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewPriority({ ...newPriority, category: key })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      newPriority.category === key
                        ? `${cat.bgClass} border-${cat.color}-700`
                        : 'bg-[#111217] border-[#1F222B]'
                    }`}
                  >
                    <span className={`text-sm font-medium ${cat.textClass}`}>{cat.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#E10600] hover:bg-[#E10600]/90">
              Adicionar Prioridade
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}