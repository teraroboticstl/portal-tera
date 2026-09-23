import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Archive, AlertTriangle, 
  Loader2, RefreshCw 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SeasonCloseManagement() {
  const queryClient = useQueryClient();
  const [seasonTag, setSeasonTag] = useState('');
  const [programs, setPrograms] = useState({ FRC: true, FTC: true, FLL: false });
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [counting, setCounting] = useState(false);
  const [previewCounts, setPreviewCounts] = useState(null);

  const selectedPrograms = Object.entries(programs).filter(([, v]) => v).map(([k]) => k);

  const handleFetchPreview = async () => {
    if (selectedPrograms.length === 0) {
      toast.error('Selecione pelo menos um programa (FRC, FTC ou FLL).');
      return;
    }
    setCounting(true);
    try {
      const [logs, priorities, prototypes, meetings] = await Promise.all([
        base44.entities.DailyLog.list('-date', 1000).catch(() => []),
        base44.entities.Priority.list('-created_date', 1000).catch(() => []),
        base44.entities.PrototypeTest.list('-date', 1000).catch(() => []),
        base44.entities.MeetingNote.list('-date', 1000).catch(() => []),
      ]);

      const toTag = (items) => items.filter(r => !r.season_tag && selectedPrograms.includes(r.program));

      const countLogs = toTag(logs).length;
      const countPriorities = toTag(priorities).length;
      const countPrototypes = toTag(prototypes).length;
      const countMeetings = toTag(meetings).length;

      setPreviewCounts({
        logs: countLogs,
        priorities: countPriorities,
        prototypes: countPrototypes,
        meetings: countMeetings,
        total: countLogs + countPriorities + countPrototypes + countMeetings
      });
    } catch (e) {
      console.error('Erro ao verificar registros:', e);
      toast.error('Erro ao calcular registros ativos.');
    } finally {
      setCounting(false);
    }
  };

  const handleArchive = async () => {
    const trimmedTag = seasonTag.trim();
    if (!trimmedTag) {
      toast.error('Defina um identificador de temporada para o arquivamento.');
      return;
    }

    if (selectedPrograms.length === 0) {
      toast.error('Selecione ao menos um programa.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(`Arquivando registros como "${trimmedTag}"...`);

    try {
      // 1. Busca todos os registros ativos dos programas selecionados
      const [allLogs, allPriorities, allPrototypes, allMeetings] = await Promise.all([
        base44.entities.DailyLog.list('-date', 1000).catch(() => []),
        base44.entities.Priority.list('-created_date', 1000).catch(() => []),
        base44.entities.PrototypeTest.list('-date', 1000).catch(() => []),
        base44.entities.MeetingNote.list('-date', 1000).catch(() => []),
      ]);

      const toTag = (items) => items.filter(r => !r.season_tag && selectedPrograms.includes(r.program));

      const logsToTag = toTag(allLogs);
      const prioritiesToTag = toTag(allPriorities);
      const prototypesToTag = toTag(allPrototypes);
      const meetingsToTag = toTag(allMeetings);

      // 2. Marcar registros com a tag da temporada
      await Promise.all([
        ...logsToTag.map(r => base44.entities.DailyLog.update(r.id, { season_tag: trimmedTag })),
        ...prioritiesToTag.map(r => base44.entities.Priority.update(r.id, { season_tag: trimmedTag })),
        ...prototypesToTag.map(r => base44.entities.PrototypeTest.update(r.id, { season_tag: trimmedTag })),
        ...meetingsToTag.map(r => base44.entities.MeetingNote.update(r.id, { season_tag: trimmedTag })),
      ]);

      // 3. Atualizar queries no cache
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['prototype-tests'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-notes'] });
      queryClient.invalidateQueries({ queryKey: ['archive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['archive-priorities'] });
      queryClient.invalidateQueries({ queryKey: ['archive-prototypes'] });
      queryClient.invalidateQueries({ queryKey: ['archive-meetings'] });

      const total = logsToTag.length + prioritiesToTag.length + prototypesToTag.length + meetingsToTag.length;
      toast.success(`Temporada "${trimmedTag}" arquivada com sucesso! (${total} registros catalogados)`, { id: toastId });
      
      setConfirm(false);
      setSeasonTag('');
      setPreviewCounts(null);
    } catch (e) {
      console.error('Erro ao arquivar temporada:', e);
      toast.error('Erro ao arquivar temporada: ' + (e.message || 'Tente novamente.'), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#E10600]/10 border border-[#E10600]/20 flex items-center justify-center text-[#E10600]">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Encerrar e Arquivar Temporada</h2>
            <p className="text-xs text-[#B8BDC7]">Transição de ciclo anual e preservação de histórico</p>
          </div>
        </div>

        <p className="text-[#B8BDC7] text-sm mb-6 leading-relaxed">
          Esta rotina administrativa agrupa e <strong className="text-white">arquiva</strong> todos os Logs Diários, Prioridades do Kanban, Testes de Protótipos e Atas de Reuniões ativos dos programas selecionados. 
          <br />
          <span className="text-emerald-400 font-medium">Nenhum dado é apagado</span> — tudo fica permanentemente consultável no Arquivo Histórico de Temporadas.
        </p>

        <div className="space-y-5">
          {/* Identificador da Temporada */}
          <div>
            <Label className="block text-sm font-medium text-white mb-1.5">
              Identificador da Temporada a Arquivar *
            </Label>
            <Input
              value={seasonTag}
              onChange={e => setSeasonTag(e.target.value)}
              placeholder="Ex: FRC-REEFSCAPE-2025 ou FTC-DECODE-2024"
              className="bg-[#0B0B0D] border-[#1F222B] text-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Dica: Utilize siglas maiúsculas e o ano para facilitar buscas no histórico.
            </p>
          </div>

          {/* Seleção de Programas */}
          <div>
            <Label className="block text-sm font-medium text-white mb-2">
              Programas a serem incluídos no arquivamento
            </Label>
            <div className="flex gap-3">
              {['FRC', 'FTC', 'FLL'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPrograms(prev => ({ ...prev, [p]: !prev[p] }));
                    setPreviewCounts(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    programs[p] 
                      ? 'bg-[#E10600] border-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.3)]' 
                      : 'bg-[#0B0B0D] border-[#1F222B] text-[#B8BDC7] hover:border-zinc-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Pré-visualização de Registros */}
          <div className="p-4 bg-[#0B0B0D] border border-[#1F222B] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#B8BDC7] uppercase tracking-wider">
                Auditoria de Registros Ativos
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetchPreview}
                disabled={counting}
                className="text-xs text-[#E10600] hover:text-[#E10600]/80 h-7 px-2"
              >
                {counting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Verificar contagem
                  </>
                )}
              </Button>
            </div>

            {previewCounts ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 bg-[#111217] rounded-lg border border-[#1F222B]">
                  <p className="text-lg font-bold text-white">{previewCounts.logs}</p>
                  <p className="text-[10px] text-[#B8BDC7]">Logs Diários</p>
                </div>
                <div className="p-2 bg-[#111217] rounded-lg border border-[#1F222B]">
                  <p className="text-lg font-bold text-white">{previewCounts.priorities}</p>
                  <p className="text-[10px] text-[#B8BDC7]">Prioridades</p>
                </div>
                <div className="p-2 bg-[#111217] rounded-lg border border-[#1F222B]">
                  <p className="text-lg font-bold text-white">{previewCounts.prototypes}</p>
                  <p className="text-[10px] text-[#B8BDC7]">Protótipos</p>
                </div>
                <div className="p-2 bg-[#111217] rounded-lg border border-[#1F222B]">
                  <p className="text-lg font-bold text-white">{previewCounts.meetings}</p>
                  <p className="text-[10px] text-[#B8BDC7]">Atas</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Clique em "Verificar contagem" para ver quantos registros serão catalogados.
              </p>
            )}
          </div>

          {/* Confirmação e Ação */}
          {!confirm ? (
            <Button
              type="button"
              onClick={() => {
                if (!seasonTag.trim()) {
                  toast.error('Informe o nome/identificador da temporada antes de prosseguir.');
                  return;
                }
                if (selectedPrograms.length === 0) {
                  toast.error('Selecione ao menos um programa.');
                  return;
                }
                setConfirm(true);
              }}
              className="w-full bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Arquivar e Limpar Temporada Ativa
            </Button>
          ) : (
            <div className="bg-[#1a0a00] border border-[#E10600]/50 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#E10600] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Confirmar arquivamento da temporada "{seasonTag.trim()}"?
                  </p>
                  <p className="text-xs text-[#B8BDC7] mt-1 leading-relaxed">
                    Programas selecionados: <strong className="text-white">{selectedPrograms.join(', ')}</strong>.
                    Os dados ativos serão etiquetados e transferidos para o acervo histórico. A área de trabalho começará limpa para a próxima temporada.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirm(false)}
                  disabled={loading}
                  className="flex-1 border-[#1F222B] text-[#B8BDC7] hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleArchive}
                  disabled={loading}
                  className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Arquivando...
                    </>
                  ) : (
                    'Sim, Arquivar Agora'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
