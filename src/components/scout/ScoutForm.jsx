import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EMPTY = {
  event: '', match_number: '', alliance: 'Vermelha', team_number: '', scout_name: '',
  auto_artifacts: '0', auto_left_zone: false, auto_conflicts: false, auto_patterns: '0', auto_patterns_other: '',
  teleop_overflow: '0', teleop_artifacts: '0–3', teleop_artifacts_other: '',
  teleop_shoot_location: 'Esquerda maior', teleop_cycle_speed: 'Médio',
  teleop_pattern_ability: 'Média', teleop_defense: 'Não defendeu',
  endgame_base: 'Não chegou', endgame_alliance_bonus: false, endgame_parking_consistency: 'Parcial',
  penalty_5pts: 0, penalty_15pts: 0, card: 'Nenhum',
  reliability_issues: [], reliability_other: '',
  general_observations: [], observations_other: '',
  alliance_score_range: '51–100',
  rp_count: 0
};

function SectionTitle({ children }) {
  return <h3 className="text-xs font-bold uppercase tracking-widest text-[#E10600] mb-3 mt-6 border-b border-[#1F222B] pb-1">{children}</h3>;
}

function Chips({ options, value, onChange, multi = false }) {
  const toggle = (opt) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt]);
    } else {
      onChange(opt);
    }
  };
  const isActive = (opt) => multi ? (Array.isArray(value) && value.includes(opt)) : value === opt;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            isActive(opt) ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1F222B] border-[#2A2D38] text-[#B8BDC7] hover:bg-[#2A2D38]'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)}
        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${value ? 'bg-green-600 border-green-600 text-white' : 'bg-[#1F222B] border-[#2A2D38] text-[#B8BDC7]'}`}>
        Sim
      </button>
      <button type="button" onClick={() => onChange(false)}
        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${!value ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1F222B] border-[#2A2D38] text-[#B8BDC7]'}`}>
        Não
      </button>
    </div>
  );
}

function NumSelect({ value, onChange, max = 5 }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: max + 1 }, (_, i) => (
        <button key={i} type="button" onClick={() => onChange(i)}
          className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${
            value === i ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1F222B] border-[#2A2D38] text-[#B8BDC7]'
          }`}>
          {i}
        </button>
      ))}
    </div>
  );
}

function calcIEF(f) {
  let score = 0;
  const autoMap = { '0': 0, '3': 2, '3+3': 4, '3+6': 6, '3+9': 8 };
  score += autoMap[f.auto_artifacts] || 0;
  if (f.auto_left_zone) score += 1;
  const patMap = { '0': 0, '1': 1, '2': 2, '3': 3, 'Outro': 1 };
  score += patMap[f.auto_patterns] || 0;
  const ovMap = { '0': 0, '1–3': 1, '4–6': 2, '7+': 3 };
  score += ovMap[f.teleop_overflow] || 0;
  const artMap = { '0–3': 1, '4–7': 3, '8–11': 5, 'Outro': 2 };
  score += artMap[f.teleop_artifacts] || 0;
  if (f.teleop_cycle_speed === 'Rápido') score += 3;
  else if (f.teleop_cycle_speed === 'Médio') score += 1;
  if (f.teleop_pattern_ability === 'Alta') score += 3;
  else if (f.teleop_pattern_ability === 'Média') score += 1;
  if (f.endgame_base === 'Total') score += 4;
  else if (f.endgame_base === 'Parcial') score += 2;
  if (f.endgame_alliance_bonus) score += 2;
  score -= (f.penalty_5pts || 0) * 1;
  score -= (f.penalty_15pts || 0) * 2;
  if (f.card === 'Amarelo') score -= 2;
  if (f.card === 'Vermelho') score -= 5;
  if (f.reliability_issues && f.reliability_issues.length > 0) score -= f.reliability_issues.length * 2;
  return score;
}

export default function ScoutForm({ onSave, initialData, onCancel }) {
  const [f, setF] = useState(initialData || EMPTY);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const efficiency_index = calcIEF(f);
    onSave({ ...f, efficiency_index });
    setF(EMPTY);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1">

      {/* IDENTIFICAÇÃO */}
      <SectionTitle>Identificação</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#B8BDC7] mb-1 block">Equipe *</label>
          <Input value={f.team_number} onChange={e => set('team_number', e.target.value)} placeholder="Ex: 17730" required
            className="bg-[#1F222B] border-[#2A2D38] text-white placeholder:text-[#555]" />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-1 block">Partida *</label>
          <Input value={f.match_number} onChange={e => set('match_number', e.target.value)} placeholder="Ex: Q1" required
            className="bg-[#1F222B] border-[#2A2D38] text-white placeholder:text-[#555]" />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-1 block">Evento</label>
          <Input value={f.event} onChange={e => set('event', e.target.value)} placeholder="Nome do evento"
            className="bg-[#1F222B] border-[#2A2D38] text-white placeholder:text-[#555]" />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-1 block">Scout</label>
          <Input value={f.scout_name} onChange={e => set('scout_name', e.target.value)} placeholder="Seu nome"
            className="bg-[#1F222B] border-[#2A2D38] text-white placeholder:text-[#555]" />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-xs text-[#B8BDC7] mb-1 block">Aliança</label>
        <Chips options={['Vermelha', 'Azul']} value={f.alliance} onChange={v => set('alliance', v)} />
      </div>

      {/* AUTÔNOMO */}
      <SectionTitle>Autônomo</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Saiu da zona de lançamento?</label>
          <YesNo value={f.auto_left_zone} onChange={v => set('auto_left_zone', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Atrapalha nosso autônomo?</label>
          <YesNo value={f.auto_conflicts} onChange={v => set('auto_conflicts', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Foca em identificar Pattern?</label>
          <Chips options={['0', '1', '2', '3', 'Outro']} value={f.auto_patterns} onChange={v => set('auto_patterns', v)} />
          {f.auto_patterns === 'Outro' && (
            <Input className="mt-2 bg-[#1F222B] border-[#2A2D38] text-white placeholder:text-[#555]"
              placeholder="Descreva o pattern..." value={f.auto_patterns_other} onChange={e => set('auto_patterns_other', e.target.value)} />
          )}
        </div>
      </div>

      {/* TELEOP */}
      <SectionTitle>Teleoperado</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Local de shoot preferido</label>
          <Chips options={['Esquerda maior', 'Esquerda menor', 'Direita maior', 'Direita menor']} value={f.teleop_shoot_location} onChange={v => set('teleop_shoot_location', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Velocidade de ciclo</label>
          <Chips options={['Rápido', 'Médio', 'Lento']} value={f.teleop_cycle_speed} onChange={v => set('teleop_cycle_speed', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Capacidade de classificar padrões</label>
          <Chips options={['Alta', 'Média', 'Baixa']} value={f.teleop_pattern_ability} onChange={v => set('teleop_pattern_ability', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Jogo defensivo</label>
          <Chips options={['Forte', 'Leve', 'Não defendeu']} value={f.teleop_defense} onChange={v => set('teleop_defense', v)} />
        </div>
      </div>

      {/* ENDGAME */}
      <SectionTitle>Endgame</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Terminou na base?</label>
          <Chips options={['Total', 'Parcial', 'Não chegou']} value={f.endgame_base} onChange={v => set('endgame_base', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Bônus de aliança na base?</label>
          <YesNo value={f.endgame_alliance_bonus} onChange={v => set('endgame_alliance_bonus', v)} />
        </div>
      </div>

      {/* RPs */}
      <SectionTitle>Ranking Points (RPs)</SectionTitle>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Quantos RPs a equipe teve nesta partida?</label>
          <NumSelect value={f.rp_count || 0} onChange={v => set('rp_count', v)} max={4} />
        </div>
      </div>

      {/* PENALIDADES */}
      <SectionTitle>Penalidades</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Penalidades de +5 pts</label>
          <NumSelect value={f.penalty_5pts} onChange={v => set('penalty_5pts', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Penalidades de +15 pts</label>
          <NumSelect value={f.penalty_15pts} onChange={v => set('penalty_15pts', v)} />
        </div>
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Cartão</label>
          <Chips options={['Nenhum', 'Amarelo', 'Vermelho']} value={f.card} onChange={v => set('card', v)} />
        </div>
      </div>

      {/* CONFIABILIDADE */}
      <SectionTitle>Confiabilidade</SectionTitle>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#B8BDC7] mb-2 block">Problemas observados</label>
          <Chips options={['Travou', 'Sensor falhou', 'Outro']} value={f.reliability_issues} onChange={v => set('reliability_issues', v)} multi />
          {f.reliability_issues?.includes('Outro') && (
            <Input className="mt-2 bg-[#1F222B] border-[#2A2D38] text-white placeholder:text-[#555]"
              placeholder="Descreva o problema..." value={f.reliability_other} onChange={e => set('reliability_other', e.target.value)} />
          )}
        </div>
      </div>

      {/* OBSERVAÇÕES GERAIS */}
      <SectionTitle>Observações Gerais</SectionTitle>
      <div className="space-y-3">
        <Chips
          options={['Consistente', 'Alta precisão', 'Perdeu artefatos', 'Problemas na coleta', 'Baixa precisão', 'Outro']}
          value={f.general_observations} onChange={v => set('general_observations', v)} multi
        />
        {f.general_observations?.includes('Outro') && (
          <Input className="bg-[#1F222B] border-[#2A2D38] text-white placeholder:text-[#555]"
            placeholder="Outra observação..." value={f.observations_other} onChange={e => set('observations_other', e.target.value)} />
        )}
      </div>

      {/* PONTUAÇÃO */}
      <SectionTitle>Pontuação da Aliança (referência)</SectionTitle>
      <Chips options={['0–50', '51–100', '101–150', '151–200', '201+']} value={f.alliance_score_range} onChange={v => set('alliance_score_range', v)} />

      {/* IEF Preview */}
      <div className="mt-6 bg-[#1F222B] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#B8BDC7]">IEF (pré-cálculo)</p>
          <p className="text-2xl font-black text-white">{calcIEF(f) > 0 ? '+' : ''}{calcIEF(f)}</p>
        </div>
        <div className={`text-xs font-bold px-3 py-1 rounded-full ${
          calcIEF(f) >= 15 ? 'bg-green-900/40 text-green-400' :
          calcIEF(f) >= 7 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'
        }`}>
          {calcIEF(f) >= 15 ? 'Alta Eficiência' : calcIEF(f) >= 7 ? 'Média Eficiência' : 'Baixa Eficiência'}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-[#2A2D38] text-[#B8BDC7]">
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold">
          Salvar Scout
        </Button>
      </div>
      {saved && <p className="text-center text-green-400 text-sm font-medium mt-2">✔ Scout salvo com sucesso!</p>}
    </form>
  );
}