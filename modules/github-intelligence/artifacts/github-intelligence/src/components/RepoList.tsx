import React, { useState } from 'react';
import {
  Search,
  Filter,
  ShieldAlert,
  GitPullRequest,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Lock,
  Eye,
  Boxes,
  Workflow,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { RepositoryItem } from '../types';

interface RepoListProps {
  repos: RepositoryItem[];
  onOpenRepoDetails: (repo: RepositoryItem) => void;
  onAnalyzeWithGemini: (repoId: string) => void;
  onApplyLevelA: (repoId: string) => void;
  onOpenPullRequest: (repoId: string) => void;
  onChangeVisibility?: (repoId: string, isPrivate: boolean) => void;
  isAnalyzingId: string | null;
}

export const RepoList: React.FC<RepoListProps> = ({
  repos,
  onOpenRepoDetails,
  onAnalyzeWithGemini,
  onApplyLevelA,
  onOpenPullRequest,
  onChangeVisibility,
  isAnalyzingId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SECRETS' | 'NO_README' | 'ABANDONED' | 'PR_READY'>('ALL');

  const filteredRepos = repos.filter(repo => {
    // Text search
    const matchesQuery =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      repo.technologies.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;

    if (activeFilter === 'SECRETS') return repo.secrets.length > 0;
    if (activeFilter === 'NO_README') return !repo.hasReadme;
    if (activeFilter === 'ABANDONED') return repo.isAbandoned || repo.lastCommitDaysAgo > 60;
    if (activeFilter === 'PR_READY') return repo.pullRequest && (repo.pullRequest.status === 'READY_TO_OPEN' || repo.pullRequest.status === 'OPENED');

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#11141c] p-3 rounded-2xl border border-[#232936]">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome do repositório, tecnologia ou descrição..."
            className="w-full bg-[#161a24] border border-[#262d3c] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#a3e635] transition-all"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === 'ALL'
                ? 'bg-[#262e3d] text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({repos.length})
          </button>
          <button
            onClick={() => setActiveFilter('SECRETS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
              activeFilter === 'SECRETS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Com Segredos ({repos.filter(r => r.secrets.length > 0).length})
          </button>
          <button
            onClick={() => setActiveFilter('NO_README')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
              activeFilter === 'NO_README'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            Sem README ({repos.filter(r => !r.hasReadme).length})
          </button>
          <button
            onClick={() => setActiveFilter('PR_READY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
              activeFilter === 'PR_READY'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
            PRs Prontos ({repos.filter(r => r.pullRequest?.status === 'READY_TO_OPEN' || r.pullRequest?.status === 'OPENED').length})
          </button>
        </div>
      </div>

      {/* Repo Cards Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredRepos.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#11141c] border border-[#232936] text-zinc-400">
            Nenhum repositório encontrado para o filtro selecionado.
          </div>
        ) : (
          filteredRepos.map(repo => {
            const isAnalyzing = isAnalyzingId === repo.id;
            const hasPR = repo.pullRequest && (repo.pullRequest.status === 'READY_TO_OPEN' || repo.pullRequest.status === 'OPENED');
            const hasLevelA = repo.proposedChanges.some(c => c.level === 'LEVEL_A_SAFE' && c.status !== 'APPLIED_LEVEL_A');

            return (
              <div
                key={repo.id}
                className="p-5 rounded-2xl bg-[#12151e] border border-[#212735] hover:border-[#333d52] transition-all space-y-3 group"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-base text-white hover:text-[#a3e635] transition-colors cursor-pointer" onClick={() => onOpenRepoDetails(repo)}>
                      {repo.name}
                    </span>
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300"
                      title="Abrir no GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {repo.private ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Privado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-400">
                        Público
                      </span>
                    )}

                    {repo.secrets.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 animate-pulse">
                        <ShieldAlert className="w-3 h-3" />
                        {repo.secrets.length} Segredo(s) Neutralizado(s)
                      </span>
                    )}

                    {repo.hasDocker && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-950/40 text-sky-400 border border-sky-800/40 flex items-center gap-1">
                        <Boxes className="w-3 h-3" /> Docker
                      </span>
                    )}

                    {repo.hasWorkflows && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/40 text-purple-400 border border-purple-800/40 flex items-center gap-1">
                        <Workflow className="w-3 h-3" /> CI/CD
                      </span>
                    )}

                    {repo.isAbandoned && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/40 text-amber-400 border border-amber-800/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Abandonado ({repo.lastCommitDaysAgo}d)
                      </span>
                    )}
                  </div>

                  {/* Seniority Score Bar */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">Senior Score</div>
                      <div className="text-sm font-bold font-mono text-[#a3e635]">{repo.seniorityScore}/100</div>
                    </div>
                    <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-[#a3e635] rounded-full"
                        style={{ width: `${repo.seniorityScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Description comparison: Original vs Proposed */}
                <div className="text-xs text-zinc-300">
                  <p className="line-clamp-2">
                    {repo.metadataUpgrade?.proposedDescription ? (
                      <span>
                        <strong className="text-[#a3e635] font-semibold">Proposta Sênior:</strong>{' '}
                        {repo.metadataUpgrade.proposedDescription}
                      </span>
                    ) : (
                      repo.description || 'Nenhuma descrição fornecida no repositório original.'
                    )}
                  </p>
                </div>

                {/* Tech pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40">
                    {repo.language}
                  </span>
                  {repo.technologies.slice(0, 5).map((tech, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                    >
                      {tech}
                    </span>
                  ))}
                  {repo.technologies.length > 5 && (
                    <span className="text-[10px] text-zinc-500 font-mono">+{repo.technologies.length - 5}</span>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-2 border-t border-[#1c222e] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">
                      Alterações propostas: <strong>{repo.proposedChanges.length} arquivos</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAnalyzeWithGemini(repo.id)}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#161b24] hover:bg-[#1e2432] text-zinc-300 border border-[#273041] transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-[#a3e635] ${isAnalyzing ? 'animate-spin' : ''}`} />
                      {isAnalyzing ? 'Analisando...' : 'Reavaliar com Gemini'}
                    </button>

                    {hasLevelA && (
                      <button
                        onClick={() => onApplyLevelA(repo.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#a3e635]/15 hover:bg-[#a3e635]/25 text-[#a3e635] border border-[#a3e635]/40 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Auto-Aplicar Nível A
                      </button>
                    )}

                    {repo.pullRequest && (
                      <button
                        onClick={() => onOpenPullRequest(repo.id)}
                        disabled={repo.pullRequest.status === 'OPENED'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          repo.pullRequest.status === 'OPENED'
                            ? 'bg-purple-950/40 text-purple-300 border border-purple-800/40 cursor-default'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow'
                        }`}
                      >
                        <GitPullRequest className="w-3.5 h-3.5" />
                        {repo.pullRequest.status === 'OPENED' ? 'PR #1 Aberto' : 'Abrir Pull Request'}
                      </button>
                    )}

                    {onChangeVisibility && (
                      <button
                        onClick={() => onChangeVisibility(repo.id, !repo.private)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          !repo.private
                            ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                        }`}
                        title={!repo.private ? 'Tornar este repositório privado no GitHub' : 'Tornar este repositório público no GitHub'}
                      >
                        {!repo.private ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{!repo.private ? 'Privar Projeto' : 'Tornar Público'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenRepoDetails(repo)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#212836] hover:bg-[#2b3547] text-white transition-all flex items-center gap-1"
                    >
                      <span>Ver Detalhes & Diff</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
