import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Shield,
  Eye,
  EyeOff,
  Archive,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronRight,
  Database,
  Star,
  FileText,
  AlertCircle,
  HelpCircle,
  X,
  Lock,
  Unlock,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  CurationAuditResponse,
  RepoCurationItem,
  CurationClassification,
  PortfolioRelevance,
  RepositoryItem,
  ResumeProfile,
} from '../../types';
import { api } from '../../services/api';

interface RepositoryCurationViewProps {
  repos: RepositoryItem[];
  resume: ResumeProfile | null;
  onRefreshRepos?: () => void;
}

export const RepositoryCurationView: React.FC<RepositoryCurationViewProps> = ({
  repos,
  resume,
  onRefreshRepos,
}) => {
  const [audit, setAudit] = useState<CurationAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRelevance, setSelectedRelevance] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [onlyBackups, setOnlyBackups] = useState(false);

  // Modals & Actions
  const [diagnosticRepo, setDiagnosticRepo] = useState<RepoCurationItem | null>(null);
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    type: 'VISIBILITY' | 'ARCHIVE';
    repo: RepoCurationItem;
    targetPrivate?: boolean;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionStatusMessage, setActionStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reEvaluatingId, setReEvaluatingId] = useState<string | null>(null);

  useEffect(() => {
    loadAudit();
  }, [repos.length]);

  const loadAudit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCurationAudit();
      setAudit(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao carregar a curadoria de repositórios.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReEvaluate = async (repoId: string) => {
    setReEvaluatingId(repoId);
    try {
      const res = await api.reEvaluateRepoCuration(repoId);
      if (audit) {
        setAudit({
          ...audit,
          curationList: audit.curationList.map(item => (item.repoId === repoId ? res.item : item)),
        });
      }
      if (diagnosticRepo?.repoId === repoId) {
        setDiagnosticRepo(res.item);
      }
    } catch (err: any) {
      setActionStatusMessage({ type: 'error', text: err.message || 'Falha ao reavaliar o repositório.' });
    } finally {
      setReEvaluatingId(null);
    }
  };

  const handleExecuteVisibilityChange = async () => {
    if (!actionConfirmModal || actionConfirmModal.type !== 'VISIBILITY') return;
    setIsActionLoading(true);
    setActionStatusMessage(null);
    try {
      const targetPrivate = actionConfirmModal.targetPrivate ?? !actionConfirmModal.repo.isPrivate;
      const res = await api.changeRepoVisibility(actionConfirmModal.repo.repoId, targetPrivate);
      
      // Update local state
      if (audit) {
        setAudit({
          ...audit,
          curationList: audit.curationList.map(item =>
            item.repoId === actionConfirmModal.repo.repoId
              ? { ...item, isPrivate: res.isPrivate }
              : item
          ),
        });
      }
      setActionStatusMessage({ type: 'success', text: res.message });
      if (onRefreshRepos) onRefreshRepos();
      setTimeout(() => {
        setActionConfirmModal(null);
        setActionStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setActionStatusMessage({ type: 'error', text: err.message || 'Falha ao alterar visibilidade no GitHub.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExecuteArchive = async () => {
    if (!actionConfirmModal || actionConfirmModal.type !== 'ARCHIVE') return;
    setIsActionLoading(true);
    setActionStatusMessage(null);
    try {
      const res = await api.archiveRepo(actionConfirmModal.repo.repoId);
      
      // Update local state
      if (audit) {
        setAudit({
          ...audit,
          curationList: audit.curationList.map(item =>
            item.repoId === actionConfirmModal.repo.repoId
              ? { ...item, isArchived: res.isArchived, recommendedClassification: 'ARCHIVE' }
              : item
          ),
        });
      }
      setActionStatusMessage({ type: 'success', text: res.message });
      if (onRefreshRepos) onRefreshRepos();
      setTimeout(() => {
        setActionConfirmModal(null);
        setActionStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setActionStatusMessage({ type: 'error', text: err.message || 'Falha ao arquivar repositório no GitHub.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Distinct languages for filtering
  const availableLanguages = Array.from(
    new Set(audit?.curationList.map(i => i.primaryLanguage).filter(Boolean) as string[])
  ).sort();

  // Filtered items
  const filteredItems = (audit?.curationList || []).filter(item => {
    if (selectedCategory !== 'ALL' && item.recommendedClassification !== selectedCategory) return false;
    if (selectedRelevance !== 'ALL' && item.professionalRelevance !== selectedRelevance) return false;
    if (selectedLanguage !== 'ALL' && item.primaryLanguage !== selectedLanguage) return false;
    if (onlyBackups && !item.backupDetection.isBackup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.repoName.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) || false;
      const matchLang = item.primaryLanguage?.toLowerCase().includes(q) || false;
      const matchPurpose = item.apparentPurpose.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchLang && !matchPurpose) return false;
    }
    return true;
  });

  const getClassificationMeta = (cls: CurationClassification) => {
    switch (cls) {
      case 'KEEP_PUBLIC':
        return {
          label: 'Manter Público',
          icon: Eye,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          desc: 'Excelente para o portfólio. Demonstra habilidades técnicas e relevância de mercado.',
        };
      case 'CONSIDER_PRIVATE':
        return {
          label: 'Considerar Privado',
          icon: EyeOff,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
          desc: 'Backup, dump de dados, teste incompleto ou código pessoal sem contexto para recrutadores.',
        };
      case 'ARCHIVE':
        return {
          label: 'Arquivar (Read-Only)',
          icon: Archive,
          color: 'text-zinc-400',
          bg: 'bg-zinc-800 border-zinc-700',
          desc: 'Projeto finalizado ou inativo há anos. Preserva histórico sem poluir o perfil ativo.',
        };
      case 'IMPROVE':
        return {
          label: 'Melhorar Projeto',
          icon: Wrench,
          color: 'text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/30',
          desc: 'Bom potencial profissional, mas necessita de README moderno, documentação ou testes.',
        };
      case 'SECURITY_REVIEW':
        return {
          label: 'Revisão de Segurança',
          icon: AlertTriangle,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/30',
          desc: 'Credenciais expostas ou configurações inseguras detectadas. Requer saneamento urgente.',
        };
      default:
        return {
          label: 'Sob Análise',
          icon: HelpCircle,
          color: 'text-zinc-400',
          bg: 'bg-zinc-800 border-zinc-700',
          desc: 'Análise heurística inconclusiva.',
        };
    }
  };

  const getRelevanceBadge = (rel: PortfolioRelevance) => {
    switch (rel) {
      case 'DESTAQUE':
        return { label: 'Top Destaque', color: 'text-[#a3e635] border-[#a3e635]/40 bg-[#a3e635]/10' };
      case 'ALTA_RELEVANCIA':
        return { label: 'Alta Relevância', color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' };
      case 'MEDIA':
        return { label: 'Média', color: 'text-sky-300 border-sky-500/30 bg-sky-500/10' };
      case 'EXPERIMENTAL':
        return { label: 'Experimental', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' };
      case 'REDUNDANTE':
        return { label: 'Redundante / Backup', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
      case 'REESCREVER':
        return { label: 'Reescrever Docs', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
      default:
        return { label: 'Geral', color: 'text-zinc-400 border-zinc-700 bg-zinc-800' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121722] via-[#0f131a] to-[#0c0e12] border border-[#232b3a] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/10 border border-[#a3e635]/30 text-xs font-mono font-bold text-[#a3e635]">
              <FolderGit2 className="w-3.5 h-3.5" />
              PORTFOLIO INTELLIGENCE & REPOSITORY CURATION
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Curadoria & Governança de Repositórios
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Auditoria individual para identificar quais projetos devem continuar públicos, quais devem ser privatizados,
              quais merecem arquivamento preservando o histórico e quais devem ser melhorados com documentação de alto nível.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            <button
              onClick={loadAudit}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#171d29] hover:bg-[#202838] text-zinc-200 border border-[#2a3447] transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#a3e635]' : ''}`} />
              <span>Reanalisar Portfólio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7 KPI Metric Cards */}
      {actionStatusMessage && !actionConfirmModal && (
        <div role="status" aria-live="polite" className={`rounded-xl border p-3 text-xs ${actionStatusMessage.type === 'success' ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' : 'border-rose-500/40 bg-rose-950/30 text-rose-300'}`}>
          <div className="flex items-center justify-between gap-3">
            <span>{actionStatusMessage.text}</span>
            <button type="button" onClick={() => setActionStatusMessage(null)} className="shrink-0 underline underline-offset-2">Fechar</button>
          </div>
        </div>
      )}

      {audit?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-2xl bg-[#11141c] border border-zinc-800 space-y-1">
            <span className="text-[11px] font-mono text-zinc-400 block">Total Analisado</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
              {audit.summary.totalAnalyzed}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block">repositórios</span>
          </div>

          <button
            type="button"
            aria-pressed={selectedCategory === 'KEEP_PUBLIC'}
            onClick={() => setSelectedCategory('KEEP_PUBLIC')}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'KEEP_PUBLIC'
                ? 'bg-emerald-950/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-[#11141c] border-zinc-800 hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-emerald-400">Manter Público</span>
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
              {audit.summary.keepPublicCount}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono block">projetos de destaque</span>
          </button>

          <button
            type="button"
            aria-pressed={selectedCategory === 'CONSIDER_PRIVATE'}
            onClick={() => setSelectedCategory('CONSIDER_PRIVATE')}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'CONSIDER_PRIVATE'
                ? 'bg-amber-950/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'bg-[#11141c] border-zinc-800 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-amber-400">Privatizar</span>
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums mt-1">
              {audit.summary.considerPrivateCount}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono block">reduz ruído ATS</span>
          </button>

          <button
            type="button"
            aria-pressed={selectedCategory === 'ARCHIVE'}
            onClick={() => setSelectedCategory('ARCHIVE')}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'ARCHIVE'
                ? 'bg-zinc-800/60 border-zinc-500 shadow'
                : 'bg-[#11141c] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-300">Arquivar</span>
              <Archive className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-200 tabular-nums mt-1">
              {audit.summary.archiveCount}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block">read-only legado</span>
          </button>

          <button
            type="button"
            aria-pressed={selectedCategory === 'IMPROVE'}
            onClick={() => setSelectedCategory('IMPROVE')}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'IMPROVE'
                ? 'bg-sky-950/20 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                : 'bg-[#11141c] border-zinc-800 hover:border-sky-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-sky-400">Melhorar</span>
              <Wrench className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 tabular-nums mt-1">
              {audit.summary.improveCount}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono block">precisam de docs</span>
          </button>

          <button
            type="button"
            aria-pressed={selectedCategory === 'SECURITY_REVIEW'}
            onClick={() => setSelectedCategory('SECURITY_REVIEW')}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCategory === 'SECURITY_REVIEW'
                ? 'bg-rose-950/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                : 'bg-[#11141c] border-zinc-800 hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-rose-400">Segurança</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tabular-nums mt-1">
              {audit.summary.securityReviewCount}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono block">risco detectado</span>
          </button>

          <button
            type="button"
            aria-pressed={onlyBackups}
            onClick={() => setOnlyBackups(!onlyBackups)}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              onlyBackups
                ? 'bg-purple-950/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'bg-[#11141c] border-zinc-800 hover:border-purple-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-purple-400">Backups</span>
              <Database className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400 tabular-nums mt-1">
              {audit.summary.backupsDetectedCount}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono block">dumps/zips detectados</span>
          </button>
        </div>
      )}

      {/* Profile Optimization & Pinned Repos Strategic Banner */}
      {audit?.profileOptimizationAdvice && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#131824] via-[#10141f] to-[#0d1017] border border-[#263247] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Estratégia de Fixação no Perfil (Pinned Repositories)</h3>
                <p className="text-xs text-zinc-400">
                  Os 4 a 6 projetos que um recrutador ou tech lead deve ver primeiro ao visitar seu perfil.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#a3e635]">Maximização de Impacto</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-emerald-400 uppercase font-semibold block">
                Recomendados para Fixar (Pin)
              </span>
              <div className="space-y-1.5">
                {audit.profileOptimizationAdvice.recommendedPinnedRepos.map(name => {
                  const repoItem = audit.curationList.find(i => i.repoName === name);
                  return (
                    <div
                      key={name}
                      className="p-2.5 rounded-xl bg-[#161c28] border border-emerald-500/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-[#a3e635]" />
                        <span className="font-bold text-white">{name}</span>
                        {repoItem?.primaryLanguage && (
                          <span className="text-[10px] font-mono text-zinc-400">({repoItem.primaryLanguage})</span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Alta relevância</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-amber-400 uppercase font-semibold block">
                Candidatos a Desafixar ou Ocultar
              </span>
              <div className="space-y-1.5">
                {audit.profileOptimizationAdvice.unpinCandidates.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#141822] text-xs text-zinc-400 font-mono">
                    Nenhum projeto inadequado fixado.
                  </div>
                ) : (
                  audit.profileOptimizationAdvice.unpinCandidates.map(name => (
                    <div
                      key={name}
                      className="p-2.5 rounded-xl bg-[#181c24] border border-amber-500/20 flex items-center justify-between text-xs"
                    >
                      <span className="text-zinc-300 font-mono">{name}</span>
                      <span className="text-[10px] text-amber-400 font-mono">Ruído / Sem docs</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0d1017] border border-zinc-800 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-white">Diretriz Técnica:</strong> {audit.profileOptimizationAdvice.profileReadmeAdvice}
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#11141c] border border-[#212735] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Buscar por repositório, tecnologia ou finalidade"
              placeholder="Buscar por repositório, tecnologia ou finalidade..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#161a24] border border-[#273041] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#a3e635] transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Select filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              aria-label="Filtrar por categoria de curadoria"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161a24] border border-[#273041] text-xs text-zinc-200 focus:outline-none focus:border-[#a3e635]"
            >
              <option value="ALL">Todas as Categorias</option>
              <option value="KEEP_PUBLIC">Manter Público</option>
              <option value="CONSIDER_PRIVATE">Considerar Privado</option>
              <option value="ARCHIVE">Arquivar (Read-Only)</option>
              <option value="IMPROVE">Melhorar Documentação</option>
              <option value="SECURITY_REVIEW">Revisão de Segurança</option>
            </select>

            <select
              aria-label="Filtrar por relevância profissional"
              value={selectedRelevance}
              onChange={e => setSelectedRelevance(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161a24] border border-[#273041] text-xs text-zinc-200 focus:outline-none focus:border-[#a3e635]"
            >
              <option value="ALL">Todas as Relevâncias</option>
              <option value="DESTAQUE">Top Destaque</option>
              <option value="ALTA_RELEVANCIA">Alta Relevância</option>
              <option value="MEDIA">Média Relevância</option>
              <option value="EXPERIMENTAL">Experimental</option>
              <option value="REDUNDANTE">Redundante / Backup</option>
              <option value="REESCREVER">Reescrever Docs</option>
            </select>

            {availableLanguages.length > 0 && (
              <select
                aria-label="Filtrar por linguagem"
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#161a24] border border-[#273041] text-xs text-zinc-200 focus:outline-none focus:border-[#a3e635]"
              >
                <option value="ALL">Todas as Linguagens</option>
                {availableLanguages.map(lang => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Active filters count indicator */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-zinc-800/80">
          <span>
            Exibindo <strong className="text-white">{filteredItems.length}</strong> de{' '}
            <strong className="text-zinc-300">{audit?.curationList.length || 0}</strong> repositórios
          </span>
          {(selectedCategory !== 'ALL' || selectedRelevance !== 'ALL' || selectedLanguage !== 'ALL' || onlyBackups || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedRelevance('ALL');
                setSelectedLanguage('ALL');
                setOnlyBackups(false);
                setSearchQuery('');
              }}
              className="text-[#a3e635] hover:underline"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Curation Cards Grid */}
      {isLoading ? (
        <div className="p-16 text-center rounded-2xl bg-[#11141c] border border-zinc-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#a3e635] animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-white">Analisando finalidade, relevância e segurança dos repositórios...</h3>
          <p className="text-xs text-zinc-400 font-mono">Processamento heurístico de backup, métricas de documentação e dados reais do GitHub.</p>
        </div>
      ) : error ? (
        <div role="alert" className="p-8 rounded-2xl bg-[#11141c] border border-rose-500/30 space-y-3">
          <h3 className="text-sm font-bold text-white">Não foi possível carregar a curadoria</h3>
          <p className="text-xs text-rose-200">{error}</p>
          <button type="button" onClick={loadAudit} className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1a212e] text-white border border-zinc-700 hover:bg-[#252f42]">Tentar novamente</button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-[#11141c] border border-zinc-800 space-y-3">
          <FolderGit2 className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenhum repositório corresponde aos filtros selecionados</h3>
          <p className="text-xs text-zinc-400">Tente ajustar seus termos de pesquisa ou remover os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const meta = getClassificationMeta(item.recommendedClassification);
            const rel = getRelevanceBadge(item.professionalRelevance);
            const Icon = meta.icon;

            return (
              <div
                key={item.repoId}
                className="rounded-2xl bg-[#11141c] border border-[#212735] hover:border-zinc-600 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Bar: Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.bg} ${meta.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.isPrivate ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Privado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> Público
                        </span>
                      )}

                      {item.isArchived && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Arquivado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name and GitHub Link */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white hover:text-[#a3e635] transition-colors truncate">
                        {item.repoName}
                      </h3>
                      {item.htmlUrl?.startsWith('https://github.com/') && (
                        <a
                          href={item.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 hover:text-zinc-300 shrink-0"
                          title="Abrir no GitHub"
                          aria-label={`Abrir ${item.repoName} no GitHub (nova aba)`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                      {item.description || 'Sem descrição cadastrada no GitHub.'}
                    </p>
                  </div>

                  {/* Apparent Purpose & Heuristics */}
                  <div className="p-3 rounded-xl bg-[#0c0f15] border border-zinc-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                        Finalidade Identificada
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${rel.color}`}>
                        {rel.label}
                      </span>
                    </div>
                    <p className="text-zinc-300 font-mono text-[11px] leading-relaxed">
                      {item.apparentPurpose}
                    </p>

                    {item.backupDetection.isBackup && (
                      <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] pt-1 border-t border-zinc-800/60">
                        <Database className="w-3 h-3" />
                        <span>Backup Heurístico: {item.backupDetection.reasons?.[0] || 'Arquivo de backup detectado'}</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Row: Doc Quality, Security, Maintenance */}
                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                    <div className="p-2 rounded-lg bg-[#141822] border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">Doc Score</span>
                      <span
                        className={`font-bold tabular-nums ${
                          item.docQualityScore >= 80
                            ? 'text-emerald-400'
                            : item.docQualityScore >= 50
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.docQualityScore}/100
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#141822] border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">Confiança</span>
                      <span className="text-zinc-200 font-bold">{item.confidenceLevel}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#141822] border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">Linguagem</span>
                      <span className="text-[#a3e635] font-bold truncate block">
                        {item.primaryLanguage || 'Geral'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-[#212735] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDiagnosticRepo(item)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a212e] hover:bg-[#252f42] text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-sky-400" />
                    <span>Diagnóstico</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Action: Toggle visibility (Privatizar ou Tornar Público) */}
                    <button
                      onClick={() =>
                        setActionConfirmModal({
                          type: 'VISIBILITY',
                          repo: item,
                          targetPrivate: !item.isPrivate,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                        !item.isPrivate
                          ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                      }`}
                      title={!item.isPrivate ? 'Tornar este repositório privado no GitHub' : 'Tornar este repositório público no GitHub'}
                    >
                      {!item.isPrivate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{!item.isPrivate ? 'Privar' : 'Tornar Público'}</span>
                    </button>

                    {/* Action: Archive if not archived and recommended */}
                    {!item.isArchived && item.recommendedClassification === 'ARCHIVE' && (
                      <button
                        onClick={() =>
                          setActionConfirmModal({
                            type: 'ARCHIVE',
                            repo: item,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 transition-all flex items-center gap-1"
                        title="Arquivar este repositório no GitHub (read-only)"
                      >
                        <Archive className="w-3 h-3" />
                        <span>Arquivar</span>
                      </button>
                    )}

                    {/* Re-evaluate button */}
                    <button
                      onClick={() => handleReEvaluate(item.repoId)}
                      disabled={reEvaluatingId === item.repoId}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-[#141822] border border-zinc-800 transition-all"
                      title="Reavaliar diagnósticos"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          reEvaluatingId === item.repoId ? 'animate-spin text-[#a3e635]' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exportable Reports Strip */}
      <div className="p-6 rounded-2xl bg-[#11141c] border border-[#212735] space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-[#a3e635]" />
            Relatórios Estruturados de Curadoria & Governança
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Baixe a auditoria consolidada para documentação técnica e auditorias corporativas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <a
            href="/api/reports/download-document/GITHUB_REPOSITORY_CURATION.md"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-[#141822] hover:bg-[#1a212e] border border-zinc-800 hover:border-zinc-700 text-xs flex flex-col justify-between space-y-2 transition-all"
          >
            <span className="font-bold text-white truncate">Curadoria Geral</span>
            <span className="text-[10px] text-zinc-400 font-mono">GITHUB_REPOSITORY_CURATION.md</span>
          </a>

          <a
            href="/api/reports/download-document/GITHUB_VISIBILITY_RECOMMENDATIONS.json"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-[#141822] hover:bg-[#1a212e] border border-zinc-800 hover:border-zinc-700 text-xs flex flex-col justify-between space-y-2 transition-all"
          >
            <span className="font-bold text-white truncate">Recomendações JSON</span>
            <span className="text-[10px] text-zinc-400 font-mono">VISIBILITY_RECOMMENDATIONS.json</span>
          </a>

          <a
            href="/api/reports/download-document/GITHUB_PORTFOLIO_PRIORITY.md"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-[#141822] hover:bg-[#1a212e] border border-zinc-800 hover:border-zinc-700 text-xs flex flex-col justify-between space-y-2 transition-all"
          >
            <span className="font-bold text-white truncate">Prioridade de Portfólio</span>
            <span className="text-[10px] text-zinc-400 font-mono">PORTFOLIO_PRIORITY.md</span>
          </a>

          <a
            href="/api/reports/download-document/GITHUB_BACKUP_DETECTION_REPORT.md"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-[#141822] hover:bg-[#1a212e] border border-zinc-800 hover:border-zinc-700 text-xs flex flex-col justify-between space-y-2 transition-all"
          >
            <span className="font-bold text-white truncate">Detecção de Backups</span>
            <span className="text-[10px] text-zinc-400 font-mono">BACKUP_DETECTION.md</span>
          </a>

          <a
            href="/api/reports/download-document/GITHUB_SECURITY_REVIEW.md"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-[#141822] hover:bg-[#1a212e] border border-zinc-800 hover:border-zinc-700 text-xs flex flex-col justify-between space-y-2 transition-all"
          >
            <span className="font-bold text-white truncate">Revisão de Segurança</span>
            <span className="text-[10px] text-zinc-400 font-mono">SECURITY_REVIEW.md</span>
          </a>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: DIAGNÓSTICO INDIVIDUAL COMPLETO */}
      {/* ============================================================== */}
      {diagnosticRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="curation-diagnostic-title" className="relative w-full max-w-2xl bg-[#11141c] border border-[#293345] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="curation-diagnostic-title" className="text-lg font-bold text-white">{diagnosticRepo.repoName}</h3>
                  {(() => {
                    const dMeta = getClassificationMeta(diagnosticRepo.recommendedClassification);
                    return (
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${dMeta.bg} ${dMeta.color}`}>
                        {dMeta.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Diagnóstico aprofundado, evidências técnicas e avaliação de impacto.
                </p>
              </div>

              <button
                onClick={() => setDiagnosticRepo(null)}
                aria-label="Fechar diagnóstico"
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diagnostic details */}
            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-[#0c0f15] border border-zinc-800 space-y-2">
                <span className="text-[10px] text-[#a3e635] uppercase font-bold block">
                  Finalidade Aparente do Projeto
                </span>
                <p className="text-zinc-200 leading-relaxed font-sans text-sm">
                  {diagnosticRepo.apparentPurpose}
                </p>
              </div>

              {/* Justification & Evidence */}
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                  Justificativa da Classificação
                </span>
                <p className="text-zinc-300 font-sans text-xs bg-[#161a24] p-3 rounded-xl border border-zinc-800 leading-relaxed">
                  {diagnosticRepo.rationale}
                </p>
              </div>

              {/* Evidence Detected */}
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                  Evidências Técnicas Analisadas
                </span>
                <div className="space-y-1">
                  {diagnosticRepo.evidenceFound.map((ev, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-[#141822] border border-zinc-800 text-zinc-300 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#a3e635] shrink-0" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consequences explanation */}
              {diagnosticRepo.recommendedClassification === 'CONSIDER_PRIVATE' && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 space-y-2 font-sans">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Consequências de Tornar este Repositório Privado</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-amber-200/90 leading-relaxed">
                    <li>O projeto deixará de ser visível publicamente no seu perfil para recrutadores e visitantes.</li>
                    <li>Qualquer GitHub Pages hospedado neste repositório será desativado (ou exigirá GitHub Pro).</li>
                    <li>Estrelas (stars) e forks públicos existentes permanecem, mas bifurcações privadas se tornam independentes.</li>
                    <li>Colaboradores mantêm acesso apenas se tiverem permissão explícita adicionada.</li>
                  </ul>
                </div>
              )}

              {diagnosticRepo.recommendedClassification === 'ARCHIVE' && (
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-zinc-300 space-y-2 font-sans">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Archive className="w-4 h-4 text-zinc-400" />
                    <span>Consequências de Arquivar este Repositório</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-300/90 leading-relaxed">
                    <li>O repositório se torna totalmente somente-leitura (Read-Only) para todos, incluindo você.</li>
                    <li>Nenhum novo commit, pull request ou issue poderá ser aberto até que seja desarquivado.</li>
                    <li>O histórico de commits, tags, releases e branches permanece 100% preservado.</li>
                    <li>Sinaliza publicamente aos recrutadores que o projeto foi concluído ou descontinuado formalmente.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                onClick={() => setDiagnosticRepo(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const item = diagnosticRepo;
                    setDiagnosticRepo(null);
                    setActionConfirmModal({
                      type: 'VISIBILITY',
                      repo: item,
                      targetPrivate: !item.isPrivate,
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    !diagnosticRepo.isPrivate
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                  }`}
                >
                  {!diagnosticRepo.isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{!diagnosticRepo.isPrivate ? 'Tornar Privado' : 'Tornar Público'}</span>
                </button>

                {!diagnosticRepo.isArchived && (
                  <button
                    onClick={() => {
                      const item = diagnosticRepo;
                      setDiagnosticRepo(null);
                      setActionConfirmModal({
                        type: 'ARCHIVE',
                        repo: item,
                      });
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-white flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Arquivar Repositório</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRMAÇÃO EXPLÍCITA DE AÇÃO REAL NO GITHUB */}
      {/* ============================================================== */}
      {actionConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="curation-confirm-title" className="relative w-full max-w-lg bg-[#11141c] border border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 id="curation-confirm-title" className="text-base font-bold text-white">
                  {actionConfirmModal.type === 'VISIBILITY'
                    ? (actionConfirmModal.targetPrivate
                        ? `Alterar Visibilidade para Privado`
                        : `Alterar Visibilidade para Público`)
                    : `Arquivar Repositório (Read-Only)`}
                </h3>
                <span className="text-xs font-mono text-zinc-400">
                  Repositório: <strong>{actionConfirmModal.repo.repoName}</strong>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0c0f15] border border-zinc-800 text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>Esta ação será aplicada à conta GitHub conectada por meio da integração existente.</p>
              <p className="text-zinc-400">
                {actionConfirmModal.type === 'VISIBILITY'
                  ? (actionConfirmModal.targetPrivate
                      ? 'O repositório deixará de ser público e ficará visível apenas para você. Você pode torná-lo público novamente a qualquer momento.'
                      : 'O repositório se tornará público e visível no seu portfólio GitHub.')
                  : 'O repositório será marcado como arquivado e ficará em modo somente leitura. O código continuará intacto.'}
              </p>
            </div>

            {actionStatusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                  actionStatusMessage.type === 'success'
                    ? 'bg-emerald-950/30 border border-emerald-500/40 text-emerald-400'
                    : 'bg-rose-950/30 border border-rose-500/40 text-rose-400'
                }`}
              >
                {actionStatusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{actionStatusMessage.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setActionConfirmModal(null)}
                disabled={isActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>

              <button
                onClick={
                  actionConfirmModal.type === 'VISIBILITY'
                    ? handleExecuteVisibilityChange
                    : handleExecuteArchive
                }
                disabled={isActionLoading}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-zinc-950 flex items-center gap-2 shadow cursor-pointer ${
                  actionConfirmModal.type === 'VISIBILITY'
                    ? 'bg-amber-400 hover:bg-amber-300'
                    : 'bg-[#a3e635] hover:bg-[#bef264]'
                }`}
              >
                {isActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar no GitHub</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
