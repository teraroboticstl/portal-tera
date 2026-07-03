import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

function RegisterTeamContent({ user }) {
  const [teamNumber, setTeamNumber] = useState('');
  const [teamName, setTeamName] = useState('');
  const qc = useQueryClient();

  const { data: teams = [] } = useQuery({
    queryKey: ['frc-teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frc-teams'] });
      setTeamNumber('');
      setTeamName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['frc-teams'] }),
  });

  const handleAdd = async () => {
    if (!teamNumber) {
      alert('Digite o número do time');
      return;
    }
    await createMutation.mutateAsync({
      team_number: String(teamNumber),
      team_name: teamName || `Team ${teamNumber}`,
      status: 'Ativa',
    });
  };

  const frcTeams = teams.filter(t => t.team_number);

  return (
    <InternalPageLayout user={user} currentPage="InternalFRCTeamsRegister" title="Registrar Equipes FRC">
      <div className="space-y-6 max-w-2xl mx-auto">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/30 rounded-2xl p-6">
          <h1 className="text-3xl font-black text-white mb-2">🤖 Registrar Equipes FRC</h1>
          <p className="text-[#B8BDC7]">{frcTeams.length} equipes registradas</p>
        </motion.div>

        {/* Formulário */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wide mb-4">Adicionar Nova Equipe</h2>
          
          <div>
            <label className="text-xs font-bold text-[#B8BDC7] uppercase mb-2 block">Número do Time</label>
            <Input 
              value={teamNumber} 
              onChange={e => setTeamNumber(e.target.value)}
              placeholder="Ex: 10343"
              type="number"
              className="bg-[#1F222B] border-[#2F3340] text-white font-bold text-lg"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#B8BDC7] uppercase mb-2 block">Nome da Equipe (opcional)</label>
            <Input 
              value={teamName} 
              onChange={e => setTeamName(e.target.value)}
              placeholder="Ex: TeraRobotics"
              className="bg-[#1F222B] border-[#2F3340] text-white"
            />
          </div>

          <Button 
            onClick={handleAdd}
            disabled={createMutation.isPending || !teamNumber}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black uppercase">
            <Plus className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Adicionando...' : 'Adicionar Equipe'}
          </Button>
        </motion.div>

        {/* Lista de Equipes */}
        {frcTeams.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
            <h2 className="text-sm font-black text-white uppercase tracking-wide mb-4">Equipes Registradas</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {frcTeams.map(team => (
                <div key={team.id} className="flex items-center justify-between bg-[#1F222B] rounded-lg p-4">
                  <div>
                    <p className="font-black text-white text-lg">#{team.team_number}</p>
                    <p className="text-[#B8BDC7] text-sm">{team.team_name}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(team.id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <p className="text-xs text-[#555] text-center">
          💡 Dica: Equipes também são criadas automaticamente quando você faz um scout
        </p>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFRCTeamsRegister() {
  return (
    <ProtectedRoute requireApproved={true}>
      <RegisterTeamContent />
    </ProtectedRoute>
  );
}