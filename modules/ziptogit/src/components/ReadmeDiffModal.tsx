import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Sparkles,
  Tag,
  Eraser,
  X,
  Copy,
  Check,
  Server,
  ArrowRight,
} from 'lucide-react';
import { ReadmeRebrandResult } from '../types';

interface ReadmeDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ReadmeRebrandResult | null;
  projectName: string;
  onConfirmApply?: () => void;
}

export function ReadmeDiffModal({
  isOpen,
  onClose,
  result,
  projectName,
  onConfirmApply,
}: ReadmeDiffModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'refactored' | 'original' | 'split'>('split');

  if (!isOpen || !result) return null;

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.refactoredContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative text-left max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Checkpoint: Rebranding & Padronização do README.md</span>
                {result.isCreated ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300">
                    Novo Arquivo Criado
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    Refatorado & Paráfrase
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Projeto: <strong className="text-white">{projectName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Status do Documento</span>
                <span className="text-xs font-bold text-white font-mono">
                  {result.isCreated ? 'Criado do zero' : 'Refatorado com Sucesso'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#58a6ff]/10 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff] shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Nome Antigo Substituído</span>
                <span className="text-xs font-bold text-white font-mono">
                  {result.oldNameOccurrencesReplaced} ocorrências
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Eraser className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Metadados Limpos</span>
                <span className="text-xs font-bold text-white font-mono">
                  {result.metadataRemovedCount} boilerplates/marcas
                </span>
              </div>
            </div>
          </div>

          {/* Engine generation notice */}
          <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-[11px]">
              {result.generationSource === 'ai-llm' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gerado via Modelo de IA ({result.providerUsed || 'LLM'})</span>
                </>
              ) : (
                <>
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  <span>Template Técnico Padronizado (Fallback Seguro)</span>
                </>
              )}
            </div>
            {result.notice && (
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {result.notice}
              </p>
            )}
          </div>

          {/* View Mode Toggle Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex rounded-lg border border-[#30363d] bg-[#0d1117] p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'split' ? 'bg-[#21262d] text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                Comparação Lado a Lado
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('refactored')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'refactored' ? 'bg-[#21262d] text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                Novo README.md
              </button>
              {!result.isCreated && (
                <button
                  type="button"
                  onClick={() => setActiveTab('original')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    activeTab === 'original' ? 'bg-[#21262d] text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Original
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar Novo README'}</span>
            </button>
          </div>

          {/* Code Viewer */}
          <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117] text-xs font-mono">
            {activeTab === 'split' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#30363d] max-h-[380px] overflow-y-auto">
                {/* Original */}
                <div className="p-3 space-y-1 bg-red-950/10">
                  <div className="text-[10px] font-semibold text-rose-400 pb-1 border-b border-rose-900/30 flex items-center justify-between">
                    <span>{result.isCreated ? 'Original (Inexistente)' : 'Original (Com Boilerplate)'}</span>
                  </div>
                  <pre className="text-slate-400 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                    {result.originalContent || '/* Nenhum README.md original encontrado no arquivo compactado. */'}
                  </pre>
                </div>

                {/* Refactored */}
                <div className="p-3 space-y-1 bg-emerald-950/10">
                  <div className="text-[10px] font-semibold text-emerald-400 pb-1 border-b border-emerald-900/30 flex items-center justify-between">
                    <span>Novo README.md ({projectName})</span>
                    <span className="text-[10px] text-emerald-300">Padronizado</span>
                  </div>
                  <pre className="text-emerald-200/90 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                    {result.refactoredContent}
                  </pre>
                </div>
              </div>
            ) : activeTab === 'refactored' ? (
              <div className="p-4 max-h-[380px] overflow-y-auto bg-emerald-950/10">
                <pre className="text-emerald-200/90 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                  {result.refactoredContent}
                </pre>
              </div>
            ) : (
              <div className="p-4 max-h-[380px] overflow-y-auto bg-red-950/10">
                <pre className="text-slate-400 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                  {result.originalContent || '/* Nenhum README.md original. */'}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#30363d] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-[#30363d] cursor-pointer"
          >
            Fechar
          </button>
          {onConfirmApply && (
            <button
              type="button"
              onClick={onConfirmApply}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aplicar README ao Projeto</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
