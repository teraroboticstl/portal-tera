import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { 
  Archive, AlertTriangle, 
  Loader2, RefreshCw, FileText, ShieldCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SeasonCloseManagement() {
  const queryClient = useQueryClient();
  const [seasonTag, setSeasonTag] = useState('');
  const [programs, setPrograms] = useState({ FRC: true, FTC: true, FLL: false, OBR: false });
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [counting, setCounting] = useState(false);
  const [previewCounts, setPreviewCounts] = useState(null);
  const [countError, setCountError] = useState(null);
  const [atomicError, setAtomicError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const selectedPrograms = Object.entries(programs).filter(([, v]) => v).map(([k]) => k);

  const handleFetchPreview = async () => {
    if (selectedPrograms.length === 0) {
      toast.error('Selecione pelo menos um programa (OBR, FRC, FTC ou FLL).');
      return;
    }
    setCounting(true);
    setCountError(null);
    setAtomicError(null);

    try {
      // Consultas de contagem exata no Supabase sem limite de 1.000 registros
      // Critério lógico 100% idêntico à RPC PostgreSQL: (campo IS NULL OR campo NOT LIKE '%[season_tag:%')
      const [resLogs, resPriorities, resPrototypes, resMeetings] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('id', { count: 'exact', head: true })
          .in('category', selectedPrograms)
          .or('content.is.null,content.not.ilike.%[season_tag:%'),
        supabase
          .from('priorities')
          .select('id', { count: 'exact', head: true })
          .in('category', selectedPrograms)
          .or('title.is.null,title.not.ilike.%[season_tag:%'),
        supabase
          .from('prototype_tests')
          .select('id', { count: 'exact', head: true })
          .in('category', selectedPrograms)
          .or('conclusion.is.null,conclusion.not.ilike.%[season_tag:%'),
        supabase
          .from('meeting_notes')
          .select('id', { count: 'exact', head: true })
          .in('program', selectedPrograms)
          .or('content.is.null,content.not.ilike.%[season_tag:%')
      ]);

      if (resLogs.error) throw new Error(`Falha ao auditar Daily Logs: ${resLogs.error.message}`);
      if (resPriorities.error) throw new Error(`Falha ao auditar Prioridades: ${resPriorities.error.message}`);
      if (resPrototypes.error) throw new Error(`Falha ao auditar Protótipos: ${resPrototypes.error.message}`);
      if (resMeetings.error) throw new Error(`Falha ao auditar Atas: ${resMeetings.error.message}`);

      const countLogs = resLogs.count ?? 0;
      const countPriorities = resPriorities.count ?? 0;
      const countPrototypes = resPrototypes.count ?? 0;
      const countMeetings = resMeetings.count ?? 0;

      setPreviewCounts({
        logs: countLogs,
        priorities: countPriorities,
        prototypes: countPrototypes,
        meetings: countMeetings,
        total: countLogs + countPriorities + countPrototypes + countMeetings
      });
      toast.success('Auditoria de contagem concluída com sucesso!');
    } catch (e) {
      console.error('Erro na auditoria de contagem:', e);
      setPreviewCounts(null);
      setCountError(e.message || 'Erro ao auditar registros ativos.');
      toast.error('Erro ao auditar registros: ' + (e.message || 'Falha de comunicação.'));
    } finally {
      setCounting(false);
    }
  };

  /**
   * Encerramento estritamente transacional e atômico via RPC PostgreSQL
   * Qualquer falha aciona ROLLBACK imediato no banco, impedindo alterações parciais.
   * Não executa fallback sequencial permissivo.
   */
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

    if (countError) {
      toast.error('Não é possível arquivar enquanto houver erros na contagem de registros.');
      return;
    }

    setLoading(true);
    setAtomicError(null);
    const toastId = toast.loading(`Executando transação atômica da temporada "${trimmedTag}" no PostgreSQL...`);

    try {
      // Chamada obrigatória da função transacional close_season_atomic
      const { data: rpcData, error: rpcError } = await supabase.rpc('close_season_atomic', {
        p_season_tag: trimmedTag,
        p_programs: selectedPrograms
      });

      if (rpcError) {
        const isFuncMissing = rpcError.code === 'PGRST202' || rpcError.message?.toLowerCase().includes('close_season_atomic');
        if (isFuncMissing) {
          throw new Error(
            'A função transacional "close_season_atomic" não está instalada no Supabase. ' +
            'O encerramento foi BLOQUEADO por segurança para impedir alterações parciais no banco de dados. ' +
            'Para autorizar e instalar, execute a migração oficial "supabase/migrations/20260925_close_season_atomic.sql" no SQL Editor do Supabase.'
          );
        }
        throw new Error(`Falha na transação atômica do PostgreSQL: ${rpcError.message}`);
      }

      if (!rpcData || !rpcData.success) {
        throw new Error('A transação atômica do PostgreSQL não confirmou o encerramento da temporada.');
      }

      const totalArchived = rpcData.total_archived ?? 0;

      // Atualizar caches do React Query
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['prototype-tests'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-notes'] });
      queryClient.invalidateQueries({ queryKey: ['archive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['archive-priorities'] });
      queryClient.invalidateQueries({ queryKey: ['archive-prototypes'] });
      queryClient.invalidateQueries({ queryKey: ['archive-meetings'] });

      toast.success(
        `Temporada "${trimmedTag}" arquivada com sucesso de forma 100% transacional! (${totalArchived} registros catalogados)`,
        { id: toastId, duration: 6000 }
      );
      
      setConfirm(false);
      setSeasonTag('');
      setPreviewCounts(null);
      setCountError(null);
      setAtomicError(null);
    } catch (e) {
      console.error('[SeasonClose] Encerramento transacional interrompido:', e);
      setAtomicError(e.message);
      toast.error('Falha no encerramento: ' + (e.message || 'Tente novamente.'), { id: toastId, duration: 10000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E10600]/10 border border-[#E10600]/20 flex items-center justify-center text-[#E10600]">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Encerrar e Arquivar Temporada</h2>
              <p className="text-xs text-[#B8BDC7]">Transição atômica obrigatória e integridade transacional</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs border-[#1F222B] text-[#B8BDC7] hover:text-white"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Instruções RPC
          </Button>
        </div>

        <p className="text-[#B8BDC7] text-sm mb-6 leading-relaxed">
          Esta rotina administrativa agrupa e <strong className="text-white">arquiva</strong> todos os Logs Diários, Prioridades do Kanban, Testes de Protótipos e Atas de Reuniões ativos dos programas selecionados. 
          <br />
          <span className="text-emerald-400 font-medium">Operação atômica no PostgreSQL:</span> se houver qualquer erro durante o processamento, todas as alterações sofrem rollback automático, garantindo que nenhum registro seja modificado parcialmente.
        </p>

        {showInstructions && (
          <div className="mb-6 p-4 bg-[#0B0B0D] border border-blue-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Migração Oficial do Banco de Dados
              </span>
            </div>
            <p className="text-xs text-[#B8BDC7] leading-relaxed">
              O encerramento é obrigatoriamente transacional e requer a função PostgreSQL <code className="text-blue-300 font-mono">close_season_atomic</code>.
            </p>
            <div className="p-3 bg-[#111217] rounded-lg border border-[#1F222B] text-xs text-zinc-300 space-y-2">
              <p className="font-semibold text-white">Como instalar no Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                <li>Abra o Supabase Dashboard e selecione o projeto do Portal Tera.</li>
                <li>No menu lateral, acesse <strong>SQL Editor</strong> e crie uma nova query.</li>
                <li>Execute o arquivo oficial da migração: <code className="text-white font-mono bg-[#0B0B0D] px-1.5 py-0.5 rounded">supabase/migrations/20260925_close_season_atomic.sql</code>.</li>
                <li>Pronto! A função estará ativa e concedida para administradores autenticados.</li>
              </ol>
            </div>
          </div>
        )}

        {atomicError && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-200 uppercase tracking-wide">
                Encerramento Bloqueado por Segurança
              </p>
              <p className="text-xs text-red-300 leading-relaxed">
                {atomicError}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Identificador da Temporada */}
          <div>
            <Label className="block text-sm font-medium text-white mb-1.5">
              Identificador da Temporada a Arquivar *
            </Label>
            <Input
              value={seasonTag}
              onChange={e => {
                setSeasonTag(e.target.value);
                setAtomicError(null);
              }}
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
              {['OBR', 'FRC', 'FTC', 'FLL'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPrograms(prev => ({ ...prev, [p]: !prev[p] }));
                    setPreviewCounts(null);
                    setCountError(null);
                    setAtomicError(null);
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
                Auditoria de Registros Ativos (Exata e Ilimitada)
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
                    Auditando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Verificar contagem
                  </>
                )}
              </Button>
            </div>

            {countError && (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-300">Falha na verificação de contagem</p>
                  <p className="text-xs text-red-400 mt-0.5">{countError}</p>
                </div>
              </div>
            )}

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
            ) : !countError && (
              <p className="text-xs text-zinc-500">
                Clique em "Verificar contagem" para ver exatamente quantos registros serão catalogados.
              </p>
            )}
          </div>

          {/* Confirmação e Ação */}
          {!confirm ? (
            <Button
              type="button"
              disabled={Boolean(countError) || loading}
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
              className="w-full bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              Arquivar e Limpar Temporada Ativa
            </Button>
          ) : (
            <div className="bg-[#1a0a00] border border-[#E10600]/50 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#E10600] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Confirmar arquivamento atômico da temporada "{seasonTag.trim()}"?
                  </p>
                  <p className="text-xs text-[#B8BDC7] mt-1 leading-relaxed">
                    Programas selecionados: <strong className="text-white">{selectedPrograms.join(', ')}</strong>.
                    A operação será executada de forma atômica no PostgreSQL. Se a função RPC não estiver instalada, o encerramento será bloqueado para proteção do histórico.
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
                      Executando Transação...
                    </>
                  ) : (
                    'Sim, Arquivar Atômico'
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
