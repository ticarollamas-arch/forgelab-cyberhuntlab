import React, { useState } from 'react';
import {
  X,
  FileText,
  Shield,
  Layers,
  GitPullRequest,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Lock,
  Eye,
  Code,
  Tag,
  Boxes,
} from 'lucide-react';
import { RepositoryItem, ProposedFileChange } from '../types';

interface RepoDetailModalProps {
  repo: RepositoryItem | null;
  onClose: () => void;
  onApplyLevelA: (repoId: string, changeIndex?: number) => void;
  onOpenPullRequest: (repoId: string) => void;
  onAnalyzeWithGemini: (repoId: string) => void;
  onChangeVisibility?: (repoId: string, isPrivate: boolean) => void;
  isAnalyzing: boolean;
}

export const RepoDetailModal: React.FC<RepoDetailModalProps> = ({
  repo,
  onClose,
  onApplyLevelA,
  onOpenPullRequest,
  onAnalyzeWithGemini,
  onChangeVisibility,
  isAnalyzing,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'security' | 'architecture' | 'metadata' | 'pr'>('diff');
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [diffViewMode, setDiffViewMode] = useState<'side' | 'proposed'>('proposed');
  const [copied, setCopied] = useState(false);

  if (!repo) return null;

  const currentFile = repo.proposedChanges[selectedFileIdx] || repo.proposedChanges[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#10131b] border border-[#262f3f] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141824] border-b border-[#212837]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{repo.name}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {repo.language}
                </span>
                {repo.private && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Privado
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-xl line-clamp-1">
                {repo.metadataUpgrade.proposedDescription || repo.description || 'Repositório sob modernização contínua.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onChangeVisibility && (
              <button
                onClick={() => onChangeVisibility(repo.id, !repo.private)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  !repo.private
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                }`}
                title={!repo.private ? 'Alterar visibilidade para Privado no GitHub' : 'Alterar visibilidade para Público no GitHub'}
              >
                {!repo.private ? <Lock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{!repo.private ? 'Privar Projeto' : 'Tornar Público'}</span>
              </button>
            )}

            <button
              onClick={() => onAnalyzeWithGemini(repo.id)}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1c2331] hover:bg-[#252f42] text-zinc-200 border border-[#2d384e] transition-all flex items-center gap-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#a3e635] ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analisando...' : 'Reavaliar com Gemini'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 bg-[#121620] border-b border-[#212837] overflow-x-auto">
          <button
            onClick={() => setActiveTab('diff')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'diff'
                ? 'border-[#a3e635] text-[#a3e635]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Arquivos Propostos ({repo.proposedChanges.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'security'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Saneamento & Segredos ({repo.secrets.length})
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'architecture'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Arquitetura & Engenharia Sênior
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'metadata'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            Metadados GitHub
          </button>
          <button
            onClick={() => setActiveTab('pr')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'pr'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitPullRequest className="w-4 h-4" />
            Pull Request
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: DIFF VIEWER */}
          {activeTab === 'diff' && (
            <div className="space-y-4">
              {/* File selection bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0c0f16] p-2 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {repo.proposedChanges.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFileIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                        selectedFileIdx === idx
                          ? 'bg-[#1e2534] text-[#a3e635] font-bold border border-[#a3e635]/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      {file.path}
                      <span className="text-[10px] px-1 py-0.2 bg-zinc-800 rounded text-zinc-400">
                        {file.level === 'LEVEL_A_SAFE' ? 'Nível A' : 'Nível B'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#151923] p-1 rounded-lg border border-zinc-800 text-xs font-medium">
                    <button
                      onClick={() => setDiffViewMode('proposed')}
                      className={`px-2 py-1 rounded ${diffViewMode === 'proposed' ? 'bg-[#252f42] text-white' : 'text-zinc-400'}`}
                    >
                      Versão Sugerida
                    </button>
                    <button
                      onClick={() => setDiffViewMode('side')}
                      className={`px-2 py-1 rounded ${diffViewMode === 'side' ? 'bg-[#252f42] text-white' : 'text-zinc-400'}`}
                    >
                      Comparação Lado a Lado
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopy(currentFile?.proposedContent || '')}
                    className="p-1.5 text-zinc-400 hover:text-white rounded bg-[#161a24] border border-zinc-800"
                    title="Copiar conteúdo"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Diff Container */}
              {currentFile && (
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span>
                      Modificação: <strong className="text-zinc-200">{currentFile.description}</strong>
                    </span>
                    <span className="font-mono text-[11px] text-[#a3e635]">
                      {currentFile.status === 'APPLIED_LEVEL_A' ? '✓ Alteração Aplicada' : 'Aguardando Aprovação'}
                    </span>
                  </div>

                  {diffViewMode === 'side' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                      {/* Left: Original */}
                      <div className="border border-red-950/40 rounded-xl bg-[#0b0c10] overflow-hidden">
                        <div className="px-3 py-2 bg-red-950/20 border-b border-red-950/40 text-red-300 font-bold flex items-center justify-between">
                          <span>Original ({currentFile.path})</span>
                          <span className="text-[10px]">Versão Atual</span>
                        </div>
                        <pre className="p-4 text-zinc-400 overflow-x-auto whitespace-pre-wrap max-h-96">
                          {currentFile.originalContent || '// Arquivo inexistente no repositório original'}
                        </pre>
                      </div>

                      {/* Right: Proposed */}
                      <div className="border border-emerald-950/40 rounded-xl bg-[#0b0c10] overflow-hidden">
                        <div className="px-3 py-2 bg-emerald-950/20 border-b border-emerald-950/40 text-[#a3e635] font-bold flex items-center justify-between">
                          <span>Modernizado ({currentFile.path})</span>
                          <span className="text-[10px]">Padrão Sênior</span>
                        </div>
                        <pre className="p-4 text-emerald-200/90 overflow-x-auto whitespace-pre-wrap max-h-96">
                          {currentFile.proposedContent}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-zinc-800 rounded-xl bg-[#090b0f] overflow-hidden font-mono text-xs">
                      <div className="px-4 py-2 bg-[#121622] border-b border-zinc-800 flex items-center justify-between text-zinc-300">
                        <span>{currentFile.path}</span>
                        <span className="text-[10px] text-zinc-500">Preview com formatação limpa</span>
                      </div>
                      <pre className="p-4 text-zinc-200 overflow-x-auto whitespace-pre-wrap max-h-[450px]">
                        {currentFile.proposedContent}
                      </pre>
                    </div>
                  )}

                  {/* Single file approval button */}
                  {currentFile.level === 'LEVEL_A_SAFE' && currentFile.status !== 'APPLIED_LEVEL_A' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => onApplyLevelA(repo.id, selectedFileIdx)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] text-zinc-950 hover:bg-[#bef264] transition-all flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprovar e Aplicar {currentFile.path} (Nível A)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Varredura Concluída:</strong> O GitHub Intelligence AI identificou as seguintes credenciais e gerou automaticamente um arquivo <code>.env.example</code> sanitizado. Todos os segredos foram ocultados.
                </div>
              </div>

              {repo.secrets.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  Nenhum segredo vulnerável detectado neste repositório.
                </div>
              ) : (
                <div className="space-y-3">
                  {repo.secrets.map(secret => (
                    <div key={secret.id} className="p-4 rounded-xl bg-[#0d1017] border border-zinc-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400">
                            {secret.severity}
                          </span>
                          {secret.secretType}
                        </span>
                        <a
                          href={secret.rotationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#a3e635] hover:underline flex items-center gap-1 text-[11px]"
                        >
                          Revogar no Provedor <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="font-mono text-zinc-400">
                        Arquivo: <code className="text-zinc-200">{secret.filePath}:{secret.lineNumber}</code>
                      </div>
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-rose-300">
                        {secret.maskedValue}
                      </div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {secret.revocationGuide}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ARCHITECTURE & SENIOR ENGINEERING */}
          {activeTab === 'architecture' && (
            <div className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0f131c] border border-zinc-800 space-y-2">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-[#a3e635]" /> Problema Resolvido
                  </span>
                  <p className="text-zinc-300 leading-relaxed">
                    {repo.seniorAssessment.problemSolved}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0f131c] border border-zinc-800 space-y-2">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" /> Padrão Arquitetural
                  </span>
                  <p className="text-zinc-200 font-mono font-semibold">
                    {repo.seniorAssessment.architectureType}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-xl bg-[#0f131c] border border-zinc-800 space-y-3">
                <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Modularização & Separação de Responsabilidades
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-zinc-300">
                  {repo.seniorAssessment.modularizationNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#0f131c] border border-zinc-800 space-y-3">
                <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Boas Práticas de Engenharia Sênior Aplicadas
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-[#a3e635]">
                  {repo.seniorAssessment.bestPracticesApplied.map((prac, i) => (
                    <li key={i}><span className="text-zinc-200">{prac}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: METADATA */}
          {activeTab === 'metadata' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0f131c] border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white text-sm">Metadados e Descrição no GitHub</h4>
                <div>
                  <span className="text-zinc-400 block mb-1">Descrição Original:</span>
                  <div className="p-2.5 rounded bg-zinc-900 text-zinc-400 font-mono">
                    {repo.metadataUpgrade.originalDescription || '(Sem descrição)'}
                  </div>
                </div>

                <div>
                  <span className="text-[#a3e635] font-semibold block mb-1">Descrição Profissional Proposta:</span>
                  <div className="p-2.5 rounded bg-zinc-900 border border-[#a3e635]/40 text-zinc-200 font-mono">
                    {repo.metadataUpgrade.proposedDescription}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block mb-1">Tópicos e Tags Propostos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {repo.metadataUpgrade.proposedTopics.map((topic, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#1f2636] text-[#a3e635] font-mono text-[11px]">
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PULL REQUEST */}
          {activeTab === 'pr' && (
            <div className="space-y-4 text-xs">
              {repo.pullRequest ? (
                <div className="p-5 rounded-xl bg-[#0f131c] border border-purple-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitPullRequest className="w-5 h-5 text-purple-400" />
                      <h4 className="text-sm font-bold text-white">{repo.pullRequest.title}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/40 text-purple-300">
                      {repo.pullRequest.status}
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-zinc-300">
                    <div>Branch alvo: <strong className="text-white">{repo.defaultBranch}</strong></div>
                    <div>Branch de modernização: <strong className="text-purple-300">{repo.pullRequest.branchName}</strong></div>
                    <div>Arquivos preparados: <strong className="text-white">{repo.pullRequest.filesChangedCount} arquivos</strong></div>
                  </div>

                  <p className="text-zinc-400 leading-relaxed">
                    {repo.pullRequest.summary}
                  </p>

                  <div className="pt-3 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={() => onOpenPullRequest(repo.id)}
                      disabled={repo.pullRequest.status === 'OPENED'}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        repo.pullRequest.status === 'OPENED'
                          ? 'bg-purple-900/40 text-purple-300 cursor-default'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                      }`}
                    >
                      <GitPullRequest className="w-4 h-4" />
                      {repo.pullRequest.status === 'OPENED' ? 'Pull Request Aberto com Sucesso' : 'Publicar Pull Request no GitHub'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400">Nenhum Pull Request formulado ainda para este projeto.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141824] border-t border-[#212837] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Nível A: Aplicação direta sem risco | Nível B: Pull Request formal
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1c2331] hover:bg-[#252f42] text-zinc-300 border border-[#2d384e] transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
