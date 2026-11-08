import React, { useState, useEffect } from 'react';
import HackathonsApp from './hackathons/App';
import {
  Sparkles,
  RefreshCw,
  Shield,
  Lock,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileText,
  ExternalLink,
  Layers,
  ChevronRight,
  Terminal,
  Github,
  Key,
  Briefcase,
  FolderGit2,
  Settings,
  HelpCircle,
  Clock,
  Rocket,
  Lightbulb,
  Download,
  Zap,
  FolderUp,
} from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { SecurityCleanupCenter } from './components/SecurityCleanupCenter';
import { RepoList } from './components/RepoList';
import { GlobalSyncModal } from './components/GlobalSyncModal';
import { RepoDetailModal } from './components/RepoDetailModal';
import { ReportsExportModal } from './components/ReportsExportModal';
import { PortfolioPromptModal } from './components/PortfolioPromptModal';
import { AuthModal } from './components/AuthModal';
import { ProfessionalIntelligenceView } from './components/professional/ProfessionalIntelligenceView';
import { PromptModal } from './components/professional/PromptModal';
import { RepositoryCurationView } from './components/curation/RepositoryCurationView';
import { FolderExporterModal } from './components/export/FolderExporterModal';
import { api } from './services/api';
import {
  RepositoryItem,
  GlobalSyncProgress,
  GitHubUser,
  GitHubConnectionStatus,
  ResumeProfile,
  ImplementationPrompt,
} from './types';

export default function App() {
  const [connection, setConnection] = useState<GitHubConnectionStatus>({
    connected: false,
    user: null,
    scopes: [],
    lastSyncAt: null,
  });

  const [repos, setRepos] = useState<RepositoryItem[]>([]);
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  const [progress, setProgress] = useState<GlobalSyncProgress>({
    isActive: false,
    isPaused: false,
    currentStepIndex: 0,
    currentStepTitle: 'Aguardando inicialização',
    totalSteps: 13,
    currentRepoIndex: 0,
    totalRepos: 0,
    currentRepoName: '',
    percentage: 0,
    startTime: null,
    completedTime: null,
    logs: [],
    summary: {
      reposFound: 0,
      reposAnalyzed: 0,
      reposModernized: 0,
      readmesUpdated: 0,
      descriptionsUpdated: 0,
      securityIssuesFound: 0,
      secretsMasked: 0,
      levelAApplied: 0,
      levelBProposed: 0,
      pullRequestsCreated: 0,
      pendingAuthorization: 0,
      failedRepos: 0,
    },
  });

  const [activeTab, setActiveTab] = useState<NavTab>('intelligence');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isPortfolioPromptModalOpen, setIsPortfolioPromptModalOpen] = useState(false);
  const [selectedRepoForDetail, setSelectedRepoForDetail] = useState<RepositoryItem | null>(null);
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);
  const [currentPromptModal, setCurrentPromptModal] = useState<ImplementationPrompt | null>(null);
  const [authError, setAuthError] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isFolderExporterOpen, setIsFolderExporterOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadStatus();
    loadResume();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await api.getConnectionStatus();
      setConnection(res.status);
      if (res.status.connected) {
        const repoRes = await api.getRepos();
        setRepos(repoRes.repos);
      }
    } catch (err) {
      console.error(err);
      setAppError(err instanceof Error ? err.message : 'Falha ao carregar a conexão e os repositórios.');
    }
  };

  const loadResume = async () => {
    try {
      const res = await api.getResumeProfile();
      setResume(res.profile);
    } catch (err) {
      console.error(err);
      setAppError(err instanceof Error ? err.message : 'Falha ao carregar o perfil de currículo.');
    }
  };

  // Polling when sync is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (progress.isActive) {
      interval = setInterval(() => {
        api.getSyncStatus()
          .then(res => {
            setProgress(res.progress);
            if (res.repos && res.repos.length > 0) {
              setRepos(res.repos);
            }
            if (!res.progress.isActive) {
              loadStatus();
            }
          })
          .catch(err => {
            console.error(err);
            setAppError(err instanceof Error ? err.message : 'Falha ao consultar o andamento da sincronização.');
          });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [progress.isActive]);

  const handleStartSync = async () => {
    if (!connection.connected) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const res = await api.startGlobalSync();
      setProgress(res.progress);
      setIsSyncModalOpen(true);
      setAppError(null);
    } catch (err: any) {
      setAppError(err.message || 'Falha ao iniciar a sincronização.');
    }
  };

  const handlePauseSync = async () => {
    try {
      const res = await api.pauseSync();
      setProgress(res.progress);
    } catch (err: any) {
      setAppError(err.message || 'Falha ao pausar a sincronização.');
    }
  };

  const handleResumeSync = async () => {
    try {
      const res = await api.resumeSync();
      setProgress(res.progress);
    } catch (err: any) {
      setAppError(err.message || 'Falha ao retomar a sincronização.');
    }
  };

  const handleConnectToken = async (token: string) => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const res = await api.connectGitHub(token);
      setConnection({
        connected: true,
        user: res.user,
        scopes: res.scopes,
        lastSyncAt: null,
      });
      const reposRes = await api.getRepos();
      setRepos(reposRes.repos);
      setIsAuthModalOpen(false);
      setAppError(null);
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao autenticar.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectGitHub();
      setConnection({
        connected: false,
        user: null,
        scopes: [],
        lastSyncAt: null,
      });
      setRepos([]);
    } catch (err) {
      console.error(err);
      setAppError(err instanceof Error ? err.message : 'Falha ao desconectar a conta GitHub.');
    }
  };

  const handleUploadResume = async (file: File) => {
    setIsUploadingResume(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await api.uploadResume(base64Data, file.type, file.name, file.size);
      if (res && res.profile) {
        setResume(res.profile);
      }
      setAppError(null);
    } catch (err: any) {
      setAppError(err?.message || 'Falha ao enviar o currículo.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleDeleteResume = async () => {
    try {
      await api.deleteResume();
      setResume(null);
      setAppError(null);
    } catch (err) {
      console.error(err);
      setAppError(err instanceof Error ? err.message : 'Falha ao excluir o currículo.');
    }
  };

  const handleOpenPullRequest = async (repoId: string) => {
    try {
      const res = await api.openPullRequest(repoId);
      setRepos(prev =>
        prev.map(r => {
          if (r.id === repoId) {
            return {
              ...r,
              pullRequest: res.pullRequest,
              proposedChanges: r.proposedChanges.map(c => ({
                ...c,
                status: 'COMMITTED_PR',
              })),
            };
          }
          return r;
        })
      );
      if (selectedRepoForDetail?.id === repoId) {
        setSelectedRepoForDetail(prev =>
          prev
            ? {
                ...prev,
                pullRequest: res.pullRequest,
              }
            : null
        );
      }
    } catch (err: any) {
      setAppError(`Erro ao abrir Pull Request: ${err.message}`);
    }
  };

  const handleChangeRepoVisibility = async (repoId: string, isPrivate: boolean) => {
    try {
      const res = await api.changeRepoVisibility(repoId, isPrivate);
      setRepos(prev =>
        prev.map(r => (r.id === repoId ? { ...r, private: res.isPrivate } : r))
      );
      if (selectedRepoForDetail?.id === repoId) {
        setSelectedRepoForDetail(prev =>
          prev ? { ...prev, private: res.isPrivate } : null
        );
      }
    } catch (err: any) {
      setAppError(`Erro ao alterar visibilidade: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 flex flex-col selection:bg-[#a3e635] selection:text-zinc-950 font-sans">
      {/* SaaS Responsive Header */}
      <Navbar
        connection={connection}
        progress={progress}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenConnectModal={() => setIsAuthModalOpen(true)}
        onDisconnect={handleDisconnect}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onStartSync={handleStartSync}
        onOpenFolderExporter={() => setIsFolderExporterOpen(true)}
        reposCount={repos.length}
      />

      {appError && (
        <div role="alert" className="mx-auto mt-3 w-[calc(100%-2rem)] max-w-7xl rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">
          <div className="flex items-center justify-between gap-3">
            <span>{appError}</span>
            <button type="button" onClick={() => setAppError(null)} className="shrink-0 font-bold underline underline-offset-2">Fechar</button>
          </div>
        </div>
      )}

      {/* Sync Active Banner */}
      {progress.isActive && (
        <div className="bg-[#121822] border-b border-[#a3e635]/30 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-[#a3e635] animate-spin shrink-0" />
              <span className="text-zinc-300">
                <strong className="text-white">Processando:</strong> {progress.currentStepTitle}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[#a3e635] font-bold">{progress.percentage}%</span>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="px-2.5 py-1 rounded bg-[#1e2534] hover:bg-[#283247] text-zinc-200 border border-zinc-700 transition-all font-mono text-[11px]"
              >
                Abrir Painel da Fila
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'hackathons' ? <HackathonsApp /> : <>
        {/* ============================================================== */}
        {/* TAB 1: DASHBOARD SIMPLIFICADO */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* SaaS Hero Area */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121622] via-[#10131b] to-[#0c0e12] border border-[#212735] p-6 sm:p-10 shadow-2xl">
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 text-xs font-mono font-bold text-[#a3e635]">
                    <Sparkles className="w-3.5 h-3.5" />
                    AUTONOMOUS GITHUB REPOSITORY ENGINE
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                    Seu GitHub, mais seguro e profissional.
                  </h1>

                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
                    Conecte sua conta GitHub e, se desejar, envie seu currículo apenas como contexto privado para orientar melhorias baseadas em evidências nos seus projetos.
                  </p>
                </div>

                {/* Primary CTA Button */}
                <div className="shrink-0 w-full sm:w-auto flex flex-col gap-2">
                  <button
                    onClick={handleStartSync}
                    disabled={progress.isActive && !progress.isPaused}
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl font-black text-sm sm:text-base bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 shadow-[0_0_25px_rgba(163,230,53,0.3)] hover:shadow-[0_0_35px_rgba(163,230,53,0.5)] transition-all transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <RefreshCw className={`w-5 h-5 ${progress.isActive ? 'animate-spin' : ''}`} />
                    <span>SINCRONIZAR E MODERNIZAR MEU GITHUB</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-1">
                    <span>13 Etapas em Fila</span>
                    <span className="text-[#a3e635]">Branches + PRs Seguros</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State Banner if Not Connected */}
            {!connection.connected && (
              <div className="p-6 rounded-2xl bg-[#141822] border border-[#2b3547] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Nenhuma conta GitHub conectada no momento</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Conecte sua conta com um Personal Access Token para carregar seus repositórios reais e iniciar a auditoria.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all shadow shrink-0"
                >
                  Conectar Conta Agora
                </button>
              </div>
            )}

            {/* Core 6 Metrics Overview */}
            <StatsOverview
              connection={connection}
              progress={progress}
              repos={repos}
            />

            {/* Professional Intelligence Feature Spotlight Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141824] via-[#182030] to-[#11141c] border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Professional Intelligence</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 font-semibold">
                      NOVO
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 max-w-2xl">
                    Contexto de competências, análise dos repositórios e sugestões verificáveis para fortalecer seu perfil e seus READMEs.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('intelligence')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 shadow shrink-0"
              >
                <span>Acessar Professional Intelligence</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Access Grid: Repository Curation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#11141c] border border-emerald-500/30 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Curadoria de Repositórios</h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 font-semibold">
                      NOVO
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Governança inteligente: classifique projetos em público, privado, arquivado e identifique backups.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('curation')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Curadoria</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>


            </div>

            {/* Repositories Preview (if connected) */}
            {connection.connected && repos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-[#a3e635]" />
                      Repositórios Autorizados ({repos.length})
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Projetos carregados diretamente da sua conta oficial no GitHub.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('repos')}
                    className="text-xs text-[#a3e635] hover:underline flex items-center gap-1 font-semibold"
                  >
                    Ver Catálogo Completo <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <RepoList
                  repos={repos.slice(0, 4)}
                  onOpenRepoDetails={repo => setSelectedRepoForDetail(repo)}
                  onAnalyzeWithGemini={() => handleStartSync()}
                  onApplyLevelA={() => {}}
                  onOpenPullRequest={handleOpenPullRequest}
                  onChangeVisibility={handleChangeRepoVisibility}
                  isAnalyzingId={isAnalyzingId}
                />
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PROFESSIONAL INTELLIGENCE */}
        {/* ============================================================== */}
        {activeTab === 'intelligence' && (
          <ProfessionalIntelligenceView
            resume={resume}
            currentUser={connection.user}
            onUploadResume={handleUploadResume}
            onDeleteResume={handleDeleteResume}
            isUploadingResume={isUploadingResume}
            onOpenPromptModal={prompt => setCurrentPromptModal(prompt)}
          />
        )}

        {/* ============================================================== */}
        {/* TAB: REPOSITORY CURATION & PORTFOLIO INTELLIGENCE */}
        {/* ============================================================== */}
        {activeTab === 'curation' && (
          <RepositoryCurationView
            repos={repos}
            resume={resume}
            onRefreshRepos={loadStatus}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 3: REPOSITÓRIOS */}
        {/* ============================================================== */}
        {activeTab === 'repos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212735] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-[#a3e635]" />
                  Repositórios Reais ({repos.length})
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Visão transparente de todos os projetos autorizados. Clique para inspecionar diagnósticos e propostas de PR.
                </p>
              </div>

              {connection.connected && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFolderExporterOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#182030] hover:bg-[#202b40] text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all flex items-center gap-2 shadow"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-[#a3e635]" />
                    Exportar Pasta
                  </button>
                  <button
                    onClick={handleStartSync}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center gap-2 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sincronizar Todos
                  </button>
                </div>
              )}
            </div>

            {!connection.connected ? (
              <div className="p-12 text-center rounded-2xl bg-[#11141c] border border-[#212735] space-y-3">
                <Github className="w-12 h-12 text-zinc-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum repositório para exibir</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Conecte sua conta oficial do GitHub para listar seus repositórios públicos e privados.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] text-zinc-950"
                  >
                    Conectar GitHub
                  </button>
                  <button
                    onClick={() => setIsFolderExporterOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#182030] hover:bg-[#202b40] text-zinc-200 border border-zinc-700 flex items-center gap-2"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-[#a3e635]" />
                    Exportar Pasta / Criar Repositório
                  </button>
                </div>
              </div>
            ) : (
              <RepoList
                repos={repos}
                onOpenRepoDetails={repo => setSelectedRepoForDetail(repo)}
                onAnalyzeWithGemini={() => handleStartSync()}
                onApplyLevelA={() => {}}
                onOpenPullRequest={handleOpenPullRequest}
                onChangeVisibility={handleChangeRepoVisibility}
                isAnalyzingId={isAnalyzingId}
              />
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ANÁLISES & SEGURANÇA */}
        {/* ============================================================== */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="border-b border-[#212735] pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                Auditoria de Segurança & Saneamento de Segredos
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Identificação de credenciais sensíveis e geração de templates <code>.env.example</code> seguros.
              </p>
            </div>

            <SecurityCleanupCenter
              repos={repos}
              onOpenRepoDetails={repo => setSelectedRepoForDetail(repo)}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: RELATÓRIOS & EXPORTAÇÕES */}
        {/* ============================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="border-b border-[#212735] pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Centro de Relatórios & Exportações
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Acesse relatórios técnicos de repositórios, segurança e inovação gerados pelo motor de análise.
              </p>
            </div>

            {/* Document Download Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Doc 3: Career Projects */}
              <div className="p-4 rounded-2xl bg-[#11141c] border border-zinc-800 space-y-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Projetos de Carreira</span>
                  <h4 className="text-sm font-bold text-white">Career_Opportunities.md</h4>
                  <p className="text-xs text-zinc-400 mt-1">Ideias de produtos para enriquecer o GitHub e fortalecer a carreira.</p>
                </div>
                <a
                  href="/api/reports/download-document/Career_Opportunities.md"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#1a212e] hover:bg-[#252f42] text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" /> Baixar .MD
                </a>
              </div>

              {/* Doc 4: Startup Ideas */}
              <div className="p-4 rounded-2xl bg-[#11141c] border border-zinc-800 space-y-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Startups & Inovação</span>
                  <h4 className="text-sm font-bold text-white">Startup_Ideas.md</h4>
                  <p className="text-xs text-zinc-400 mt-1">Análise de dores reais, concorrentes e diferenciais injustos.</p>
                </div>
                <a
                  href="/api/reports/download-document/Startup_Ideas.md"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#1a212e] hover:bg-[#252f42] text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" /> Baixar .MD
                </a>
              </div>

              {/* Doc 5: Hackathon Projects */}
              <div className="p-4 rounded-2xl bg-[#11141c] border border-zinc-800 space-y-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Hackathons</span>
                  <h4 className="text-sm font-bold text-white">Hackathon_Projects.md</h4>
                  <p className="text-xs text-zinc-400 mt-1">Planos de live demo e argumentos de defesa para jurados.</p>
                </div>
                <a
                  href="/api/reports/download-document/Hackathon_Projects.md"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#1a212e] hover:bg-[#252f42] text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" /> Baixar .MD
                </a>
              </div>

              {/* Doc 6: GitHub Profile README */}
              <div className="p-4 rounded-2xl bg-[#11141c] border border-zinc-800 space-y-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Perfil GitHub</span>
                  <h4 className="text-sm font-bold text-white">GitHub_Profile_Optimized.md</h4>
                  <p className="text-xs text-zinc-400 mt-1">README especial do perfil (username/username) e bio sugerida.</p>
                </div>
                <a
                  href="/api/reports/download-document/GitHub_Profile_Optimized.md"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#1a212e] hover:bg-[#252f42] text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" /> Baixar .MD
                </a>
              </div>
            </div>

            {/* Consolidated Reports & Portfolio Action Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-6 rounded-2xl bg-[#11141c] border border-[#a3e635]/30 space-y-3">
                <h3 className="text-sm font-bold text-white">GITHUB_PORTFOLIO_GENERATION_PROMPT.md</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Prompt completo para criar seu site pessoal baseado nos projetos auditados.
                </p>
                <button
                  onClick={() => setIsPortfolioPromptModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all shadow"
                >
                  Abrir Prompt de Portfólio
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-[#11141c] border border-cyan-500/30 space-y-3">
                <h3 className="text-sm font-bold text-white">Relatórios Executivos da Conta</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Consolidado de auditoria, saneamento de segurança e JSON estruturado.
                </p>
                <button
                  onClick={() => setIsReportsModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-all shadow"
                >
                  Visualizar Todos os Relatórios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: CONFIGURAÇÕES */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-[#212735] pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-400" />
                Configurações da Plataforma
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Gerencie conexões de API, tokens e parâmetros do motor de modernização.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#11141c] border border-[#212735] space-y-4">
              <h3 className="text-sm font-bold text-white">Conexão do GitHub</h3>

              {connection.connected && connection.user ? (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={connection.user.avatarUrl}
                      alt={connection.user.login}
                      className="w-10 h-10 rounded-xl border border-zinc-700"
                    />
                    <div>
                      <span className="font-bold text-white text-sm block">@{connection.user.login}</span>
                      <span className="text-zinc-400">{connection.user.name || connection.user.bio}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0c0f15] border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
                    <div>Escopos Autorizados: <strong className="text-[#a3e635]">{connection.scopes?.join(', ') || 'repo, user'}</strong></div>
                    <div>Repositórios Carregados: <strong className="text-white">{repos.length}</strong></div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/20 border border-rose-900/30 transition-all"
                  >
                    Desconectar Conta do GitHub
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400">
                    Nenhuma conta conectada. Vincule seu GitHub para auditar projetos reais.
                  </p>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] text-zinc-950"
                  >
                    Conectar com Personal Access Token
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-[#11141c] border border-[#212735] space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Arquitetura SaaS Modular & Expansão
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Endpoints desacoplados para billing, webhooks de CI/CD e multi-tenancy prontos para evolução contínua sem quebras de compatibilidade.
              </p>
            </div>
          </div>
        )}
      </>}</main>

      {/* Footer */}
      <footer className="border-t border-[#1c222e] bg-[#090b0f] py-6 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">GitHub Intelligence AI</span>
            <span>—</span>
            <span>Professional Intelligence, Career & Innovation Engine</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <button onClick={() => setActiveTab('curation')} className="hover:text-zinc-200">
              Curadoria
            </button>
            <button onClick={() => setActiveTab('intelligence')} className="hover:text-zinc-200">
              Professional Intelligence
            </button>
            <button onClick={() => setActiveTab('reports')} className="hover:text-zinc-200">
              Relatórios
            </button>
            <button onClick={() => setActiveTab('settings')} className="hover:text-zinc-200">
              Configurações
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GlobalSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        progress={progress}
        onStartSync={handleStartSync}
        onPauseSync={handlePauseSync}
        onResumeSync={handleResumeSync}
      />

      <RepoDetailModal
        repo={selectedRepoForDetail}
        onClose={() => setSelectedRepoForDetail(null)}
        onApplyLevelA={() => {}}
        onOpenPullRequest={handleOpenPullRequest}
        onAnalyzeWithGemini={() => handleStartSync()}
        onChangeVisibility={handleChangeRepoVisibility}
        isAnalyzing={isAnalyzingId === selectedRepoForDetail?.id}
      />

      <ReportsExportModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        repos={repos}
      />

      <PortfolioPromptModal
        isOpen={isPortfolioPromptModalOpen}
        onClose={() => setIsPortfolioPromptModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        connection={connection}
        onConnectToken={handleConnectToken}
        isLoading={isAuthLoading}
        errorMessage={authError}
      />

      <FolderExporterModal
        isOpen={isFolderExporterOpen}
        onClose={() => setIsFolderExporterOpen(false)}
        connection={connection}
        onSuccessExport={loadStatus}
      />

      <PromptModal
        prompt={currentPromptModal}
        onClose={() => setCurrentPromptModal(null)}
      />
    </div>
  );
}
