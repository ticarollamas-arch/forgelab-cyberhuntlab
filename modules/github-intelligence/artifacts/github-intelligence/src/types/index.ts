export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type OperationLevel = 'LEVEL_A_SAFE' | 'LEVEL_B_TECHNICAL' | 'LEVEL_C_CRITICAL';

export interface SecretFinding {
  id: string;
  repoId: string;
  repoName: string;
  filePath: string;
  lineNumber: number;
  provider: 'OPENAI' | 'GITHUB_TOKEN' | 'AWS' | 'GOOGLE' | 'STRIPE' | 'SLACK' | 'DATABASE_URL' | 'PRIVATE_KEY' | 'GENERIC_SECRET';
  secretType: string;
  maskedValue: string; // e.g. "sk-proj-****...3A9f"
  envVarProposed: string; // e.g. "OPENAI_API_KEY"
  safePlaceholder: string; // e.g. "your_openai_api_key_here"
  severity: SecuritySeverity;
  status: 'DETECTED' | 'SANITIZED_LEVEL_A' | 'REVOCATION_ADVISED' | 'ROTATED';
  revocationGuide: string;
  rotationUrl: string;
}

export interface WatermarkSlopFinding {
  id: string;
  filePath: string;
  patternDetected: string;
  description: string;
  canSafelyRemove: boolean;
  isMandatoryAttribution: boolean;
}

export interface RepoMetadataUpgrade {
  originalDescription: string;
  proposedDescription: string;
  originalTopics: string[];
  proposedTopics: string[];
  originalHomepage?: string;
  proposedHomepage?: string;
  isApplied: boolean;
}

export interface ProposedFileChange {
  path: string;
  originalContent: string;
  proposedContent: string;
  description: string;
  level: OperationLevel;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED_LEVEL_A' | 'COMMITTED_PR';
  category: 'README' | 'SECURITY' | 'ENV_EXAMPLE' | 'ARCHITECTURE' | 'CONTRIBUTING' | 'CONFIG' | 'CODE';
}

export interface PullRequestInfo {
  id: string;
  repoName: string;
  branchName: string;
  title: string;
  prUrl?: string;
  prNumber?: number;
  status: 'DRAFT_PROPOSAL' | 'READY_TO_OPEN' | 'OPENED' | 'MERGED';
  filesChangedCount: number;
  summary: string;
}

export interface RepositoryItem {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description: string | null;
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  updatedAt: string;
  pushedAt: string;
  isArchived: boolean;
  isFork: boolean;
  language: string;
  detectedLanguages: { [key: string]: number };
  technologies: string[];
  hasReadme: boolean;
  readmeQualityScore: number; // 0 - 100
  securityScore: number; // 0 - 100
  seniorityScore: number; // 0 - 100
  hasDocker: boolean;
  hasWorkflows: boolean;
  hasEnvExample: boolean;
  isAbandoned: boolean;
  lastCommitDaysAgo: number;
  
  // Audit findings
  secrets: SecretFinding[];
  watermarks: WatermarkSlopFinding[];
  proposedChanges: ProposedFileChange[];
  metadataUpgrade: RepoMetadataUpgrade;
  pullRequest?: PullRequestInfo;
  
  // Senior Architecture and Code Assessment
  seniorAssessment: {
    problemSolved: string;
    architectureType: string;
    modularizationNotes: string[];
    securityEnhancements: string[];
    performanceRecommendations: string[];
    bestPracticesApplied: string[];
  };

  syncStatus: 'QUEUED' | 'ANALYZING' | 'MODERNIZING' | 'COMPLETED' | 'ERROR';
  errorMessage?: string;
}

export interface GlobalSyncProgress {
  isActive: boolean;
  isPaused: boolean;
  currentStepIndex: number;
  currentStepTitle: string;
  totalSteps: number;
  currentRepoIndex: number;
  totalRepos: number;
  currentRepoName: string;
  percentage: number;
  startTime: number | null;
  completedTime: number | null;
  logs: { timestamp: string; type: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR'; message: string; repo?: string }[];
  summary: {
    reposFound: number;
    reposAnalyzed: number;
    reposModernized: number;
    readmesUpdated: number;
    descriptionsUpdated: number;
    securityIssuesFound: number;
    secretsMasked: number;
    levelAApplied: number;
    levelBProposed: number;
    pullRequestsCreated: number;
    pendingAuthorization: number;
    failedRepos: number;
  };
}

export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  publicRepos: number;
  totalPrivateRepos?: number;
  htmlUrl?: string;
  company?: string;
  location?: string;
}

export interface GitHubConnectionStatus {
  connected: boolean;
  user: GitHubUser | null;
  authMethod?: 'PAT' | 'OAUTH';
  scopes?: string[];
  lastSyncAt?: string | null;
}

export interface ResumeProfile {
  id?: string;
  fileHash?: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  candidateName: string;
  seniorityLevel: string;
  summary: string;
  verifiedSkills: string[]; // Comprovadas
  inferredSkills?: string[]; // Inferidas
  developmentOpportunities?: string[]; // Lacunas / Oportunidades
  keyTechnologies: string[];
  documentedExperiences: {
    role: string;
    company?: string;
    period?: string;
    achievements: string[];
  }[];
  technicalSpecialties: string[];
  professionalGoals: string[];
  rawTextPreview?: string;
  matchedProjectsCount?: number;
}

export interface AtsOptimizationResult {
  overallScore: number; // 0 - 100
  criteriaBreakdown: {
    formattingAndStructure: number; // 0 - 100
    quantifiedImpact: number; // 0 - 100
    keywordDensity: number; // 0 - 100
    technicalClarity: number; // 0 - 100
    atsReadability: number; // 0 - 100
  };
  problemsIdentified: {
    category: 'FORMAT' | 'CONTENT' | 'KEYWORDS' | 'IMPACT' | 'REDUNDANCY';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    issue: string;
    recommendation: string;
  }[];
  suggestedKeywords: string[];
  targetJobMatched?: string;
  revisedResumeMarkdown: string;
  revisedResumeSummary: string;
}

export interface CareerProjectIdea {
  id: string;
  name: string;
  tagline: string;
  category:
    | 'Cybersecurity'
    | 'AI & Agents'
    | 'Enterprise Automation'
    | 'Data & Analytics'
    | 'DevSecOps & Cloud'
    | 'API Security'
    | 'SaaS & B2B'
    | 'Developer Tools';
  problemSolved: string;
  targetAudience: string;
  niche: string;
  competitiveEdge: string;
  recommendedStack: string[];
  suggestedArchitecture: string;
  coreFeatures: string[];
  mvpScope: string[];
  complexity: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Especialista';
  commercialPotential: 'Alto' | 'Médio' | 'Inovação/P&D';
  skillsDeveloped: string[];
  portfolioImpactExplanation: string;
  isFavorite?: boolean;
}

export interface StartupIdea {
  id: string;
  name: string;
  mode: 'PROFESSIONAL' | 'OPEN_EXPLORATION';
  sector: 'HealthTech' | 'EdTech' | 'FinTech' | 'Cybersecurity' | 'AI & Automation' | 'AgTech' | 'Logistics' | 'SaaS B2B';
  problemStatement: string;
  solutionSummary: string;
  targetMarket: string;
  knownCompetitors: { name: string; gap: string }[];
  marketDifferentiator: string;
  monetizationModel: string;
  mvpTimelineWeeks: number;
  marketRisks: string[];
  validationStrategy: string;
  isFavorite?: boolean;
}

export interface HackathonProject {
  id: string;
  name: string;
  themeOrCategory: string;
  elevatorPitch: string;
  targetProblem: string;
  proposedSolution: string;
  liveDemoFeatures: string[];
  apiIntegrations: string[];
  mvpArchitecture: string;
  judgePresentationPoints: {
    originalityPoint: string;
    impactPoint: string;
    technicalFeasibilityPoint: string;
  };
  evaluationMetrics: {
    originality: number; // 0 - 100
    impact: number; // 0 - 100
    technicalFeasibility: number; // 0 - 100
    differentiation: number; // 0 - 100
    liveDemoQuality: number; // 0 - 100
    scalability: number; // 0 - 100
    hackathonFitIndex: number; // 0 - 100
  };
  isFavorite?: boolean;
}

export interface GitHubProfileOptimization {
  username: string;
  originalBio?: string;
  proposedBio: string;
  originalReadme?: string;
  proposedProfileReadme: string;
  highlightedSkills: string[];
  featuredProjects: {
    repoName: string;
    description: string;
    highlights: string;
  }[];
  recommendedBadges: string[];
  statsAdvisory: string;
  prStatus?: 'PENDING' | 'OPENED';
  prUrl?: string;
}

export interface ImplementationPrompt {
  projectName: string;
  targetEnvironment: 'Universal Full-Stack (React + Node)' | 'Gemini API' | 'Claude Code / Cursor' | 'Universal Full-Stack';
  promptMarkdown: string;
}

// ----------------------------------------------------
// REPOSITORY CURATION & PORTFOLIO INTELLIGENCE
// ----------------------------------------------------
export type CurationClassification =
  | 'KEEP_PUBLIC'
  | 'CONSIDER_PRIVATE'
  | 'ARCHIVE'
  | 'IMPROVE'
  | 'SECURITY_REVIEW'
  | 'INCONCLUSIVE';

export type ConfidenceLevel = 'ALTA' | 'MEDIA' | 'BAIXA' | 'INCONCLUSIVO';

export type PortfolioRelevance =
  | 'DESTAQUE'
  | 'ALTA_RELEVANCIA'
  | 'MEDIA'
  | 'EXPERIMENTAL'
  | 'REDUNDANTE'
  | 'REESCREVER';

export interface BackupDetectionResult {
  isBackup: boolean;
  confidence: number;
  reasons: string[];
  detectedPatterns: string[];
  isLegitimateProject: boolean;
}

export interface RepoCurationItem {
  repoId: string;
  repoName: string;
  repoFullName: string;
  isPrivate: boolean;
  isArchived: boolean;
  htmlUrl: string;
  description: string;
  primaryLanguage: string;
  lastUpdated: string;
  apparentPurpose: string;
  evidenceFound: string[];
  docQualityScore: number; // 0 - 100
  professionalRelevance: PortfolioRelevance;
  securityRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  securityFindingsCount: number;
  maintenanceState: 'ATIVO' | 'CONCLUIDO' | 'INATIVO' | 'ABANDONADO';
  backupDetection: BackupDetectionResult;
  recommendedClassification: CurationClassification;
  rationale: string;
  suggestedAction: string;
  confidenceLevel: ConfidenceLevel;
  actionStatus?: 'PENDING' | 'EXECUTED';
  consequencesSummary?: string;
}

export interface CurationSummary {
  totalAnalyzed: number;
  keepPublicCount: number;
  considerPrivateCount: number;
  archiveCount: number;
  improveCount: number;
  securityReviewCount: number;
  inconclusiveCount: number;
  backupsDetectedCount: number;
  pinnedRecommendations: string[];
  unpinRecommendations: string[];
}

export interface CurationAuditResponse {
  summary: CurationSummary;
  curationList: RepoCurationItem[];
  profileOptimizationAdvice: {
    recommendedPinnedRepos: string[];
    unpinCandidates: string[];
    profileReadmeAdvice: string;
    headlineAdvice: string;
  };
}

// ----------------------------------------------------
// Tipos históricos de exportação (sem interface pública ativa)
// ----------------------------------------------------
export type DocumentType =
  | 'RESUME_FULL'
  | 'PORTFOLIO_SHOWCASE'
  | 'CURATION_REPORT'
  | 'SECURITY_AUDIT'
  | 'ATS_COMPARISON'
  | 'STARTUP_HACKATHON';

export type ResumeTemplateId = 'PROFESSIONAL' | 'MINIMALIST' | 'TECHNICAL' | 'EXECUTIVE';
export type ThemeColorId = 'LIME' | 'NAVY' | 'SLATE' | 'MONO';
export type FontFamilyId = 'HELVETICA' | 'TIMES' | 'COURIER';
export type SpacingId = 'COMPACT' | 'BALANCED' | 'GENEROUS';
export type DocLanguage = 'PT_BR' | 'EN';

export interface PdfCustomizationOptions {
  template: ResumeTemplateId;
  themeColor: ThemeColorId;
  fontFamily: FontFamilyId;
  spacing: SpacingId;
  language: DocLanguage;
  isAtsStrict: boolean;
  includeSections: {
    summary: boolean;
    skills: boolean;
    experience: boolean;
    projects: boolean;
    education: boolean;
    goals: boolean;
  };
  customTargetJob?: string;
  editableTitle?: string;
  editableSummary?: string;
  editableNotes?: string;
}

export interface GeneratedDocHistoryItem {
  id: string;
  title: string;
  docType: DocumentType;
  format: 'PDF' | 'DOCX' | 'MD';
  generatedAt: string;
  fileSizeText: string;
  templateUsed?: string;
  languageUsed?: string;
}


