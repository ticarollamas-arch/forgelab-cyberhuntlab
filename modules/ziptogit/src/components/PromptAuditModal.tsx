import React, { useState } from 'react';
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Server,
  Cpu,
  X,
  Code2,
} from 'lucide-react';
import { RefactoringAuditResult } from '../types';

interface PromptAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEnable: () => void;
  auditResult: RefactoringAuditResult | null;
  onApplyChanges: () => void;
  isApplied: boolean;
}

export function PromptAuditModal({
  isOpen,
  onClose,
  onConfirmEnable,
  auditResult,
  onApplyChanges,
  isApplied,
}: PromptAuditModalProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  if (!isOpen) return null;

  const showDiffPreview = !!auditResult && auditResult.modifiedFilesCount > 0;
  const currentDiff = showDiffPreview ? auditResult.fileDiffs[selectedFileIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative text-left max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {showDiffPreview
                  ? 'Checkpoint: Resumo de Auditoria & Abstração de Prompts'
                  : 'Ativar Modo Auditoria: Abstrair Prompts e Mockar Filtros'}
              </h3>
              <p className="text-xs text-slate-400">
                {showDiffPreview
                  ? 'Revise os diffs antes de subir para o GitHub ou gerar ZIP'
                  : 'Parametrização de prompts e stubs de teste para execução local'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4">
          {!showDiffPreview ? (
            /* Warning / Confirmation Dialog */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Aviso de Desenvolvimento & Testes de Resiliência</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Esta funcionalidade faz uma análise estática dos arquivos de código (<code className="text-amber-200">.py</code>, <code className="text-amber-200">.js</code>, <code className="text-amber-200">Modelfile</code>, <code className="text-amber-200">.json</code>) e refatora prompts fixos para leitura via variáveis de ambiente (<code className="text-emerald-300">os.getenv("CUSTOM_TEST_PROMPT")</code> ou <code className="text-emerald-300">process.env.CUSTOM_TEST_PROMPT</code>).
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Além disso, chamadas de endpoints de moderação são substituídas por funções <strong className="text-white">mock</strong> seguras para evitar que testes unitários locais quebrem sem conexão de rede.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-200 block">Princípios desta Refatoração:</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>
                    <strong className="text-slate-300">Compatibilidade com Ollama:</strong> Permite injetar diferentes instruções de teste sem alterar o código-fonte manualmente.
                  </li>
                  <li>
                    <strong className="text-slate-300">Limitações de Nuvem:</strong> Não altera políticas de moderação gerenciadas no servidor de provedores em nuvem (como OpenAI/Anthropic/Google).
                  </li>
                  <li>
                    <strong className="text-slate-300">Arquivo .env.example:</strong> Cria ou atualiza as chaves recomendadas para execução segura.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Diff Preview & Metrics Screen */
            <div className="space-y-4">
              {/* Metrics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Arquivos Refatorados</span>
                    <span className="text-base font-bold text-white font-mono">
                      {auditResult.modifiedFilesCount}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#58a6ff]/10 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff] shrink-0">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Prompts Abstraídos</span>
                    <span className="text-base font-bold text-white font-mono">
                      {auditResult.abstractedPromptsCount}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Mocks de Moderação</span>
                    <span className="text-base font-bold text-white font-mono">
                      {auditResult.mockedModerationsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Environment finding notice */}
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-200 font-semibold text-[11px]">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Diagnóstico de Ambiente do Projeto</span>
                  {auditResult.environmentFindings.detectedProviders.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-emerald-300 font-mono"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {auditResult.environmentFindings.notice}
                </p>
              </div>

              {/* Diff Viewer */}
              {currentDiff && (
                <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117]">
                  {/* File Selector Bar */}
                  <div className="p-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center gap-2 overflow-x-auto">
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium pl-1">
                      Arquivo:
                    </span>
                    {auditResult.fileDiffs.map((d, idx) => (
                      <button
                        key={d.path}
                        onClick={() => setSelectedFileIndex(idx)}
                        className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors shrink-0 cursor-pointer ${
                          selectedFileIndex === idx
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-[#21262d] border-[#30363d] text-slate-400 hover:text-white'
                        }`}
                      >
                        {d.path}
                      </button>
                    ))}
                  </div>

                  {/* Code Diff Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#30363d] text-xs font-mono max-h-[360px] overflow-y-auto">
                    {/* Original */}
                    <div className="p-3 space-y-1 bg-red-950/10">
                      <div className="text-[10px] font-semibold text-rose-400 pb-1 border-b border-rose-900/30 flex items-center justify-between">
                        <span>Original (Hardcoded)</span>
                      </div>
                      <pre className="text-slate-400 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                        {currentDiff.originalContent}
                      </pre>
                    </div>

                    {/* Refactored */}
                    <div className="p-3 space-y-1 bg-emerald-950/10">
                      <div className="text-[10px] font-semibold text-emerald-400 pb-1 border-b border-emerald-900/30 flex items-center justify-between">
                        <span>Refatorado (Parametrizado via Env)</span>
                        <span className="text-[10px] text-emerald-300">
                          +{currentDiff.abstractedPrompts} prompts · +{currentDiff.mockedCalls} mocks
                        </span>
                      </div>
                      <pre className="text-emerald-200/90 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                        {currentDiff.refactoredContent}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#30363d] flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-[#30363d] cursor-pointer"
          >
            Fechar
          </button>

          {!showDiffPreview ? (
            <button
              type="button"
              onClick={onConfirmEnable}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Confirmar e Ativar Modo Auditoria</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onApplyChanges}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isApplied ? 'Alterações Aplicadas ao Projeto' : 'Aplicar Alterações ao Projeto'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
