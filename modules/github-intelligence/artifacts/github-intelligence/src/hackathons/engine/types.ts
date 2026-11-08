/**
 * HACKMIND — Core Types & Schemas
 */

export interface JudgingWeights {
  challengeAlignment: number; // default 20%
  differentiationOriginality: number; // default 20%
  potentialImpact: number; // default 15%
  executionFeasibility: number; // default 15%
  demoQuality: number; // default 15%
  evidenceValidation: number; // default 10%
  presentationClarity: number; // default 5%
}

export const DEFAULT_JUDGING_WEIGHTS: JudgingWeights = {
  challengeAlignment: 20,
  differentiationOriginality: 20,
  potentialImpact: 15,
  executionFeasibility: 15,
  demoQuality: 15,
  evidenceValidation: 10,
  presentationClarity: 5,
};

export type ConfidenceGrade = 'Alta' | 'Média' | 'Preliminar' | 'Incerta';

export interface PastWinnerProject {
  id: string;
  name: string;
  competition: string;
  year: number;
  problem: string;
  targetAudience: string;
  techStack: string[];
  mechanism: string;
  demonstratedDifferentiator: string;
  recognizedCriteria: string[];
  sources: string[];
  confidence: ConfidenceGrade;
  verifiedFacts: string[];
  interpretationNotes: string[];
}

export interface HackathonCompetition {
  id: string;
  name: string;
  organizers: string;
  sponsors: string[];
  theme: string;
  officialChallenge: string;
  rulesAndConstraints: string[];
  encouragedTechnologies: string[];
  officialCriteria: { name: string; weightPercentage?: number; description: string }[];
  timelineHours: number; // e.g. 24, 36, 48
  submissionRequirements: string[];
  pastWinners: PastWinnerProject[];
  verifiedSources: { label: string; url?: string; accessDate?: string; confidence: ConfidenceGrade }[];
  confidence: ConfidenceGrade;
}

export interface CandidateHypothesis {
  id: string;
  number: number;
  name: string;
  category: string;
  specificProblem: string;
  affectedUser: string;
  proposedSolution: string;
  whyAlternativesFail: string;
  coreTechnicalDifferentiator: string;
  requiredTechnologies: string[];
  evidenceJustification: string;
  primaryUncertainty: string;
  mvpTimeframeScope: string; // What can be built in the 24h-48h hackathon
  visualOrFunctionalDemo: string;
  risks: {
    technical: string;
    commercial: string;
    ethicalOrPrivacy: string;
  };
  falsificationEvidence: string; // What evidence would invalidate this proposal
  originalityRating?: 'Confirmada parcialmente' | 'Provável' | 'Incerta' | 'Refutada';
  originalityNotes?: string;
  precedentsFound?: { name: string; type: 'commercial' | 'open_source' | 'academic' | 'hackathon_prior'; difference: string }[];
}

export interface AgentPerspective {
  agentName: 'Pesquisador' | 'Engenheiro' | 'Jurado' | 'Concorrente' | 'Usuário' | 'Auditor';
  role: string;
  verdict: 'Aprovado' | 'Aprovado com Ressalvas' | 'Rejeitado';
  summary: string;
  objections: string[];
  requestedEvidenceOrFixes: string[];
  score: number; // 0 to 10
}

export interface AdversarialEvaluation {
  hypothesisId: string;
  committeeScore: number; // Average
  committeeVerdict: 'Consenso Favorável' | 'Viável com Ajustes' | 'Alto Risco / Rejeitado';
  agentReviews: AgentPerspective[];
  topObjection: string;
  decisiveDifferentiatorConfirmed: boolean;
}

export interface CompetitiveScores {
  challengeAlignment: number; // 0-10
  differentiationOriginality: number; // 0-10
  potentialImpact: number; // 0-10
  executionFeasibility: number; // 0-10
  demoQuality: number; // 0-10
  evidenceValidation: number; // 0-10
  presentationClarity: number; // 0-10
  penalties: {
    unfeasibleDependencies?: number;
    fictitiousFeatures?: number;
    ignoredRisks?: number;
    undemonstrableDifferentiator?: number;
    duplicateConcept?: number;
  };
  totalWeightedScore: number; // 0 - 10
  confidencePercentage: number;
  keyUncertainty: string;
}

export interface ExecutionMilestone {
  hours: string; // e.g. "00h - 08h"
  title: string;
  deliverables: string[];
  fallbackIfBlocked: string;
}

export interface DemoStep {
  minute: string; // e.g. "0:00 - 0:45"
  action: string;
  spokenPitch: string;
  onScreenVisual: string;
}

export interface ExecutionPlan {
  hypothesisId: string;
  hypothesisName: string;
  executiveSummary: string;
  problemAndTargetUser: string;
  valueHypothesis: string;
  technicalArchitectureAscii: string;
  architectureComponents: { layer: string; technology: string; role: string; fallback: string }[];
  primaryUserFlow: string[];
  essentialComponents: string[];
  optionalComponentsScopeCut: string[];
  implementationRoadmap: ExecutionMilestone[];
  verifiableDataSources: { name: string; urlOrEndpoint: string; purpose: string; isRealTime: boolean; mockFallback: string }[];
  testingStrategy: string[];
  measurableSuccessMetrics: string[];
  fallbackContingencyPlan: string;
  judgingDemoScript: DemoStep[];
  pitchScript: {
    hook: string;
    painPoint: string;
    liveProof: string;
    technicalMoat: string;
    alignmentToCriteria: string;
    closingCall: string;
  };
  knownLimitationsAndNextSteps: string[];
}

export interface HackathonProjectSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  competition: HackathonCompetition;
  weights: JudgingWeights;
  hypotheses: CandidateHypothesis[];
  adversarialReviews: Record<string, AdversarialEvaluation>;
  scores: Record<string, CompetitiveScores>;
  executionPlans: Record<string, ExecutionPlan>;
  selectedCandidateId: string | null;
}

export interface AIProviderConfig {
  id: 'groq' | 'nvidia' | 'ollama' | 'custom' | 'engine';
  name: string;
  enabled: boolean;
  isConfigured: boolean;
  requiresKey: boolean;
  endpointUrl: string;
  activeModel: string;
  availableModels: string[];
  rateLimitStatus?: string;
  latencyMs?: number;
  lastHealthCheck?: string;
}
