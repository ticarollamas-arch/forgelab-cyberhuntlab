import React, { useState } from 'react';
import {
  RefreshCw,
  Pause,
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
  Terminal,
  Shield,
  GitBranch,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { GlobalSyncProgress } from '../types';

interface GlobalSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: GlobalSyncProgress;
  onStartSync: () => void;
  onPauseSync: () => void;
  onResumeSync: () => void;
}

const ALL_STEPS = [
  '1. Autenticação e conexão com API oficial do GitHub',
  '2. Mapeamento e inventário de repositórios autorizados',
  '3. Análise estrutural de diretórios e arquivos críticos',
  '4. Avaliação de documentação, tecnologias e dependências',
  '5. Auditoria de segurança e saneamento de configurações',
  '6. Varredura profunda de credenciais e chaves expostas',
  '7. Modernização de metadados, títulos e descrições',
  '8. Reestruturação sênior dos arquivos README.md',
  '9. Remoção de watermarks e conteúdo promocional redundante',
  '10. Criação de documentação sênior (.env.example, SECURITY.md, ARCHITECTURE.md)',
  '11. Geração de propostas de melhoria técnica (Níveis A e B)',
  '12. Preparação de branches individuais de modernização',
  '13. Abertura de Pull Requests para alterações aprovadas',
  '14. Atualização de métricas e status do dashboard',
  '15. Consolidação de relatórios e geração de prompt de portfólio',
];

export const GlobalSyncModal: React.FC<GlobalSyncModalProps> = ({
  isOpen,
  onClose,
  progress,
  onStartSync,
  onPauseSync,
  onResumeSync,
}) => {
  const [showLogsOnly, setShowLogsOnly] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#10131a] border border-[#2b3342] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232a38] bg-[#141822]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#a3e635]/15 border border-[#a3e635]/40 flex items-center justify-center text-[#a3e635]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Motor de Auto-Modernização Global
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-lime-400/20 text-lime-300 border border-lime-400/30">
                  15 ETAPAS AUTÔNOMAS
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Auditoria profunda, saneamento de credenciais, modernização sênior e abertura de PRs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress & Current Repo Banner */}
        <div className="px-6 py-4 bg-[#161a24] border-b border-[#232a38] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${progress.isActive ? 'bg-[#a3e635] animate-ping' : 'bg-zinc-500'}`} />
              {progress.currentStepTitle}
            </span>
            <span className="text-[#a3e635] font-bold text-sm">{progress.percentage}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-[#84cc16] to-[#a3e635] rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(163,230,53,0.5)]"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
              Repositório em foco:{' '}
              <strong className="text-white font-mono">{progress.currentRepoName || 'Todos os autorizados'}</strong>
            </span>
            <span className="text-[11px] text-zinc-400">
              Passo {progress.currentStepIndex} de {progress.totalSteps}
            </span>
          </div>
        </div>

        {/* Center: Steps Grid vs Terminal Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step Progress Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Sequência de Execução Automatizada
              </h4>
              <button
                onClick={() => setShowLogsOnly(!showLogsOnly)}
                className="text-xs text-[#a3e635] hover:underline flex items-center gap-1"
              >
                <Terminal className="w-3 h-3" />
                {showLogsOnly ? 'Ver Etapas' : 'Expandir Terminal de Logs'}
              </button>
            </div>

            {!showLogsOnly ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {ALL_STEPS.map((step, idx) => {
                  const isDone = progress.currentStepIndex > idx + 1;
                  const isCurrent = progress.currentStepIndex === idx + 1;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-all ${
                        isCurrent
                          ? 'bg-[#1b2216] border-[#a3e635]/50 text-white shadow-sm'
                          : isDone
                          ? 'bg-[#12161f] border-emerald-900/40 text-emerald-300'
                          : 'bg-[#101319] border-[#1f2533] text-zinc-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-4 h-4 text-[#a3e635] animate-spin shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[9px] text-zinc-400 shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <span className="line-clamp-1">{step}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Terminal Logs */}
          <div className="bg-[#090b0e] border border-[#232936] rounded-xl p-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Terminal className="w-4 h-4 text-[#a3e635]" />
                <span className="font-bold text-zinc-300">Auditoria & Operações em Tempo Real</span>
              </div>
              <span className="text-[10px] text-zinc-400">Resiliente contra falhas individuais</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {progress.logs.length === 0 ? (
                <p className="text-zinc-400">Nenhum evento registrado ainda.</p>
              ) : (
                progress.logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-zinc-400 text-[10px] shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.type === 'ERROR'
                          ? 'text-rose-400'
                          : log.type === 'WARN'
                          ? 'text-amber-400'
                          : log.type === 'SUCCESS'
                          ? 'text-[#a3e635]'
                          : 'text-sky-400'
                      }`}
                    >
                      [{log.type}]
                    </span>
                    <span className="text-zinc-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-[#141822] border-t border-[#232a38] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Regra Fundamental: Modernizar sem destruir código original ou expor segredos.
          </div>

          <div className="flex items-center gap-3">
            {!progress.isActive ? (
              <button
                onClick={onStartSync}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 shadow-lg shadow-[#a3e635]/20 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Iniciar Sincronização Global
              </button>
            ) : progress.isPaused ? (
              <button
                onClick={onResumeSync}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Retomar Processamento
              </button>
            ) : (
              <button
                onClick={onPauseSync}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pausar Fila
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1c222e] hover:bg-[#252d3d] text-zinc-300 border border-[#2b3342] transition-all"
            >
              Minimizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
