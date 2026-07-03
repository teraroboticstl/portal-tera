import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Save, Trophy, Info, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SeasonConfig() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    season_name: '',
    game_name: '',
    kickoff_date: '',
    competition_date: '',
    robot_name: '',
    robot_weight: 0,
    game_manual_a: '',
    game_manual_b: '',
    scoring_zones: '',
    endgame_options: '',
    team_objectives: '',
    awards_targeted: [],
    is_active: true
  });
  const [newAward, setNewAward] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          navigate('/');
        }
      } catch (e) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.filter({ is_active: true }, '-created_date', 1),
    initialData: []
  });

  useEffect(() => {
    if (seasons && seasons.length > 0) {
      setFormData(seasons[0]);
    }
  }, [seasons]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (seasons && seasons.length > 0) {
        return base44.entities.Season.update(seasons[0].id, data);
      } else {
        return base44.entities.Season.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      alert('Configurações salvas com sucesso!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addAward = () => {
    if (newAward.trim()) {
      setFormData({
        ...formData,
        awards_targeted: [...(formData.awards_targeted || []), newAward.trim()]
      });
      setNewAward('');
    }
  };

  const removeAward = (index) => {
    setFormData({
      ...formData,
      awards_targeted: formData.awards_targeted.filter((_, i) => i !== index)
    });
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#F5F7FA] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link to={createPageUrl('AreaInterna')} className="inline-flex items-center gap-2 text-[#B8BDC7] hover:text-white mb-4 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para Área Interna
          </Link>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#E10600]" />
            Configuração da Temporada
          </h1>
          <p className="text-[#B8BDC7]">Informações gerais sobre a temporada</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Temporada */}
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Dados da Temporada</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#B8BDC7]">Nome da Temporada</Label>
                <Input
                  value={formData.season_name}
                  onChange={(e) => setFormData({...formData, season_name: e.target.value})}
                  placeholder="FRC 2026"
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>

              <div>
                <Label className="text-[#B8BDC7]">Nome do Jogo</Label>
                <Input
                  value={formData.game_name}
                  onChange={(e) => setFormData({...formData, game_name: e.target.value})}
                  placeholder="Ex: REEFSCAPE"
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>

              <div>
                <Label className="text-[#B8BDC7]">Data do Kickoff</Label>
                <Input
                  type="date"
                  value={formData.kickoff_date}
                  onChange={(e) => setFormData({...formData, kickoff_date: e.target.value})}
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>

              <div>
                <Label className="text-[#B8BDC7]">Data da Competição</Label>
                <Input
                  type="date"
                  value={formData.competition_date}
                  onChange={(e) => setFormData({...formData, competition_date: e.target.value})}
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>

              <div>
                <Label className="text-[#B8BDC7]">Nome do Robô</Label>
                <Input
                  value={formData.robot_name}
                  onChange={(e) => setFormData({...formData, robot_name: e.target.value})}
                  placeholder="Ex: CORAL 1"
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>

              <div>
                <Label className="text-[#B8BDC7]">Peso do Robô (kg)</Label>
                <Input
                  type="number"
                  value={formData.robot_weight}
                  onChange={(e) => setFormData({...formData, robot_weight: parseFloat(e.target.value)})}
                  placeholder="0"
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>
            </div>
          </div>

          {/* Dados do Game Manual 2026 */}
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#E10600]" />
              Dados do Game Manual 2026
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-[#B8BDC7]">Nome Game Place A</Label>
                <Input
                  value={formData.game_manual_a}
                  onChange={(e) => setFormData({...formData, game_manual_a: e.target.value})}
                  placeholder="Ex: CORAL NORTE CUSC..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>

              <div>
                <Label className="text-[#B8BDC7]">Nome Game Place B</Label>
                <Input
                  value={formData.game_manual_b}
                  onChange={(e) => setFormData({...formData, game_manual_b: e.target.value})}
                  placeholder="Ex: ALGAE CORA..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-[#B8BDC7]">Zonas de Pontuação</Label>
                <Textarea
                  value={formData.scoring_zones}
                  onChange={(e) => setFormData({...formData, scoring_zones: e.target.value})}
                  placeholder="Descreva as zonas de pontuação conforme Game Manual..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA] min-h-[100px]"
                />
              </div>

              <div>
                <Label className="text-[#B8BDC7]">Opções de Endgame</Label>
                <Textarea
                  value={formData.endgame_options}
                  onChange={(e) => setFormData({...formData, endgame_options: e.target.value})}
                  placeholder="Descreva as opções de endgame conforme Game Manual..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA] min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Objetivos da Equipe */}
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Objetivos da Equipe</h2>
            <Textarea
              value={formData.team_objectives}
              onChange={(e) => setFormData({...formData, team_objectives: e.target.value})}
              placeholder="Continuar um robô competitivo, competir e bem documentado para a temporada 2026. Focar em conquistar, ciclos rápidos e endgame funcional."
              className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA] min-h-[120px]"
            />
          </div>

          {/* Awards Almejados */}
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#E10600]" />
              Awards Almejados
            </h2>
            
            <div className="flex gap-2 mb-4">
              <Input
                value={newAward}
                onChange={(e) => setNewAward(e.target.value)}
                placeholder="Ex: Engineering Inspiration Award"
                className="bg-[#0B0B0D] border-[#1F222B] text-[#F5F7FA]"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAward())}
              />
              <Button type="button" onClick={addAward} className="bg-[#E10600] hover:bg-[#E10600]/90">
                Adicionar
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.awards_targeted?.map((award, index) => (
                <div key={index} className="px-3 py-1 bg-[#E10600]/20 border border-[#E10600] text-[#E10600] rounded-full flex items-center gap-2">
                  <span>🏆 {award}</span>
                  <button
                    type="button"
                    onClick={() => removeAward(index)}
                    className="hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full bg-[#E10600] hover:bg-[#E10600]/90 text-white py-6 text-lg"
          >
            <Save className="w-5 h-5 mr-2" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </div>
    </div>
  );
}