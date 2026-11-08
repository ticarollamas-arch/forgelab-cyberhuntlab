import {
  RepositoryItem,
  GlobalSyncProgress,
  GitHubUser,
  ResumeProfile,
  GitHubConnectionStatus,
  AtsOptimizationResult,
  CareerProjectIdea,
  StartupIdea,
  HackathonProject,
  GitHubProfileOptimization,
  ImplementationPrompt,
  CurationAuditResponse,
  RepoCurationItem,
  GeneratedDocHistoryItem,
} from '../types';
import {
  AdversarialEvaluation,
  CandidateHypothesis,
  HackathonCompetition,
  HackathonProjectSession,
} from '../hackathons/engine/types';

export const api = {
  async getAiProviders(): Promise<any> {
    const res = await fetch('/api/providers');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar os provedores de IA.');
    return data;
  },

  async testAiProvider(payload: {
    providerId: string;
    apiKey?: string;
    endpoint?: string;
  }): Promise<any> {
    const res = await fetch('/api/providers/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao testar o provedor.');
    return data;
  },

  async activateAiProvider(payload: {
    providerId: string;
    model?: string;
    apiKey?: string;
    endpoint?: string;
  }): Promise<any> {
    const res = await fetch('/api/providers/set-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao ativar o provedor.');
    return data;
  },

  async generateHackathonMarkdown(session: HackathonProjectSession): Promise<string> {
    const res = await fetch('/api/export/markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao gerar o relatório Markdown.');
    return data.markdown || '';
  },

  async getHackathonPresets(): Promise<HackathonCompetition[]> {
    const res = await fetch('/api/competitions/presets');
    if (!res.ok) throw new Error('Falha ao carregar as competições.');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getHackathonHealth(): Promise<{ activeProvider?: string }> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Serviço de hackathons indisponível.');
    return res.json();
  },

  async generateHackathonHypotheses(
    competition: HackathonCompetition
  ): Promise<{ hypotheses: CandidateHypothesis[]; providerUsed?: string }> {
    const res = await fetch('/api/hypotheses/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(competition),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao gerar hipóteses.');
    return data;
  },

  async reviewHackathonHypothesis(
    hypothesis: CandidateHypothesis,
    timelineHours: number
  ): Promise<AdversarialEvaluation> {
    const res = await fetch('/api/hypotheses/adversarial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesis, timelineHours }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao revisar hipótese.');
    return data;
  },

  async getConnectionStatus(): Promise<{
    status: GitHubConnectionStatus;
    reposCount: number;
    resumeAttached: boolean;
  }> {
    const res = await fetch('/api/auth/status');
    if (!res.ok) throw new Error('Falha ao verificar status da conexão.');
    return res.json();
  },

  async connectGitHub(token: string): Promise<{
    success: boolean;
    user: GitHubUser;
    reposCount: number;
    scopes: string[];
  }> {
    const res = await fetch('/api/auth/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao autenticar com a API do GitHub.');
    }
    return data;
  },

  async disconnectGitHub(): Promise<{ success: boolean }> {
    const res = await fetch('/api/auth/disconnect', { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao desconectar conta do GitHub.');
    return res.json();
  },

  async getRepos(): Promise<{ connected: boolean; repos: RepositoryItem[]; total: number }> {
    const res = await fetch('/api/repos');
    if (!res.ok) throw new Error('Falha ao consultar repositórios.');
    return res.json();
  },

  async startGlobalSync(): Promise<{ success: boolean; progress: GlobalSyncProgress }> {
    const res = await fetch('/api/sync/start', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao iniciar sincronização global.');
    }
    return data;
  },

  async getSyncStatus(): Promise<{ progress: GlobalSyncProgress; repos: RepositoryItem[] }> {
    const res = await fetch('/api/sync/status');
    if (!res.ok) throw new Error('Falha ao consultar status da sincronização.');
    return res.json();
  },

  async pauseSync(): Promise<{ progress: GlobalSyncProgress }> {
    const res = await fetch('/api/sync/pause', { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao pausar sincronização.');
    return res.json();
  },

  async resumeSync(): Promise<{ progress: GlobalSyncProgress }> {
    const res = await fetch('/api/sync/resume', { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao retomar sincronização.');
    return res.json();
  },

  // Resume Engine
  async uploadResume(
    base64Data: string,
    mimeType: string,
    fileName: string,
    fileSize: number
  ): Promise<{ success: boolean; profile: ResumeProfile; cached?: boolean }> {
    const res = await fetch('/api/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType, fileName, fileSize }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao processar currículo.');
    }
    return data;
  },

  async getResumeProfile(): Promise<{ profile: ResumeProfile | null }> {
    const res = await fetch('/api/resume/profile');
    if (!res.ok) throw new Error('Falha ao consultar perfil do currículo.');
    return res.json();
  },

  async deleteResume(): Promise<{ success: boolean }> {
    const res = await fetch('/api/resume', { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir currículo.');
    return res.json();
  },

  // ATS Resume Optimizer
  async optimizeAts(targetJobDescription?: string): Promise<{ success: boolean; atsResult: AtsOptimizationResult }> {
    const res = await fetch('/api/resume/ats-optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetJobDescription }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao otimizar currículo para ATS.');
    }
    return data;
  },

  async getAtsResult(): Promise<{ atsResult: AtsOptimizationResult | null }> {
    const res = await fetch('/api/resume/ats-result');
    if (!res.ok) return { atsResult: null };
    return res.json();
  },

  // Career-Based Project Generator
  async generateCareerProjects(): Promise<{ success: boolean; projects: CareerProjectIdea[] }> {
    const res = await fetch('/api/career/generate-projects', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao gerar projetos de carreira.');
    }
    return data;
  },

  async getCareerProjects(): Promise<{ projects: CareerProjectIdea[] }> {
    const res = await fetch('/api/career/projects');
    if (!res.ok) return { projects: [] };
    return res.json();
  },

  // Startup & Innovation Lab
  async generateStartupIdeas(
    mode: 'PROFESSIONAL' | 'OPEN_EXPLORATION' = 'PROFESSIONAL',
    sector?: string
  ): Promise<{ success: boolean; ideas: StartupIdea[] }> {
    const res = await fetch('/api/startups/generate-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, sector }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao gerar ideias de startups.');
    }
    return data;
  },

  async getStartupIdeas(): Promise<{ ideas: StartupIdea[] }> {
    const res = await fetch('/api/startups/ideas');
    if (!res.ok) return { ideas: [] };
    return res.json();
  },

  // Hackathon Intelligence
  async generateHackathonProjects(
    hackathonTheme?: string,
    eventRules?: string
  ): Promise<{ success: boolean; projects: HackathonProject[] }> {
    const res = await fetch('/api/hackathons/generate-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hackathonTheme, eventRules }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao gerar projetos para hackathons.');
    }
    return data;
  },

  async getHackathonProjects(): Promise<{ projects: HackathonProject[] }> {
    const res = await fetch('/api/hackathons/projects');
    if (!res.ok) return { projects: [] };
    return res.json();
  },

  // Project Prompt Generator
  async generateImplementationPrompt(
    project: any,
    targetEnvironment: string = 'Universal Full-Stack (React + Node)'
  ): Promise<{ success: boolean; prompt: ImplementationPrompt }> {
    const res = await fetch('/api/projects/generate-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, targetEnvironment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao formular prompt.');
    }
    return data;
  },

  // GitHub Special Profile README
  async analyzeProfileReadme(): Promise<{ success: boolean; profileOptimization: GitHubProfileOptimization }> {
    const res = await fetch('/api/profile-readme/analyze');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao analisar perfil do GitHub.');
    }
    return data;
  },

  async applyProfileReadmePR(): Promise<{ success: boolean; prUrl: string }> {
    const res = await fetch('/api/profile-readme/apply-pr', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao abrir Pull Request para o perfil.');
    }
    return data;
  },

  // Pull Requests and Metadata
  async openPullRequest(repoId: string): Promise<{ pullRequest: any; prUrl: string }> {
    const res = await fetch('/api/repo/create-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao criar Pull Request no GitHub.');
    }
    return data;
  },

  async updateRepoMetadata(
    repoId: string,
    description?: string,
    topics?: string[]
  ): Promise<{ success: boolean; repo: RepositoryItem }> {
    const res = await fetch('/api/repo/update-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId, description, topics }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao atualizar metadados no GitHub.');
    }
    return data;
  },

  async getPortfolioPrompt(): Promise<{ content: string }> {
    const res = await fetch('/api/reports/portfolio-prompt');
    if (!res.ok) throw new Error('Falha ao obter prompt de portfólio.');
    return res.json();
  },

  async getConsolidatedReports(): Promise<{
    auditReport: string;
    securityReport: string;
    modernizationReport: string;
    portfolioPrompt: string;
    repositoriesJson: RepositoryItem[];
  }> {
    const res = await fetch('/api/reports/consolidated');
    if (!res.ok) throw new Error('Falha ao obter relatórios consolidados.');
    return res.json();
  },

  // Repository Curation & Portfolio Intelligence
  async getCurationAudit(): Promise<CurationAuditResponse> {
    const res = await fetch('/api/curation/audit');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao processar curadoria de repositórios.');
    }
    return res.json();
  },

  async reEvaluateRepoCuration(repoId: string): Promise<{ success: boolean; item: RepoCurationItem }> {
    const res = await fetch(`/api/curation/re-evaluate/${repoId}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao reavaliar repositório.');
    }
    return data;
  },

  async changeRepoVisibility(
    repoId: string,
    isPrivate: boolean
  ): Promise<{ success: boolean; isPrivate: boolean; message: string }> {
    const res = await fetch(`/api/repos/${repoId}/change-visibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrivate }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao alterar visibilidade no GitHub.');
    }
    return data;
  },

  async archiveRepo(repoId: string): Promise<{ success: boolean; isArchived: boolean; message: string }> {
    const res = await fetch(`/api/repos/${repoId}/archive`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao arquivar repositório no GitHub.');
    }
    return data;
  },

  // Document Management History
  async getDocumentsHistory(): Promise<{ documents: GeneratedDocHistoryItem[] }> {
    const res = await fetch('/api/documents/history');
    if (!res.ok) throw new Error('Falha ao carregar histórico de documentos.');
    return res.json();
  },

  async saveDocumentHistory(item: Omit<GeneratedDocHistoryItem, 'id' | 'generatedAt'>): Promise<{ success: boolean; item: GeneratedDocHistoryItem }> {
    const res = await fetch('/api/documents/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar no histórico.');
    return data;
  },

  async deleteDocumentHistory(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/documents/history/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao remover documento do histórico.');
    return res.json();
  },

  // Export folder/project to GitHub
  async exportFolderToGitHub(payload: {
    repoName: string;
    isPrivate?: boolean;
    description?: string;
    branch?: string;
    commitMessage?: string;
    files: Array<{ path: string; content: string; isBase64?: boolean }>;
  }): Promise<{
    success: boolean;
    repoUrl: string;
    repoName: string;
    filesExported: number;
    isPrivate: boolean;
    message: string;
  }> {
    const res = await fetch('/api/github/export-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao exportar pasta para o GitHub.');
    }
    return data;
  },
};
