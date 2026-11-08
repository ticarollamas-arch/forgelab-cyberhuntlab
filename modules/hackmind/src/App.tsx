/**
 * HACKMIND — WINNING IDEA ENGINE
 * Main Application Orchestrator
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PhaseResearch } from './components/PhaseResearch';
import { PhaseReverseEngineering } from './components/PhaseReverseEngineering';
import { PhaseHypotheses } from './components/PhaseHypotheses';
import { PhaseAdversarial } from './components/PhaseAdversarial';
import { PhaseScoring } from './components/PhaseScoring';
import { PhaseOriginality } from './components/PhaseOriginality';
import { PhaseExecutionPlan } from './components/PhaseExecutionPlan';
import { ProviderModal } from './components/ProviderModal';
import { ExportModal } from './components/ExportModal';

import {
  HackathonCompetition,
  CandidateHypothesis,
  AdversarialEvaluation,
  ExecutionPlan,
  CompetitiveScores,
  JudgingWeights,
  DEFAULT_JUDGING_WEIGHTS,
  HackathonProjectSession,
} from './engine/types';
import { VERIFIED_HACKATHONS } from './engine/knowledgeBase';
import { generateHypothesesForCompetition } from './engine/hypothesisGenerator';
import { runAdversarialReview } from './engine/adversarialCommittee';
import { buildExecutionPlan } from './engine/executionPlanner';
import { calculateCompetitiveScore } from './engine/scoring';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('hackmind_theme') as 'dark' | 'light') || 'dark';
  });

  // Navigation phase (1 to 7)
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active competition data
  const [presets, setPresets] = useState<HackathonCompetition[]>(VERIFIED_HACKATHONS);
  const [competition, setCompetition] = useState<HackathonCompetition>(VERIFIED_HACKATHONS[0]);

  // Hypotheses (20 candidate ideas)
  const [hypotheses, setHypotheses] = useState<CandidateHypothesis[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Evaluations and Plans
  const [adversarialReviews, setAdversarialReviews] = useState<Record<string, AdversarialEvaluation>>({});
  const [scores, setScores] = useState<Record<string, CompetitiveScores>>({});
  const [executionPlans, setExecutionPlans] = useState<Record<string, ExecutionPlan>>({});
  const [weights, setWeights] = useState<JudgingWeights>(DEFAULT_JUDGING_WEIGHTS);

  // Provider & Modals
  const [activeProviderName, setActiveProviderName] = useState<string>('Motor Determinístico');
  const [isProviderOnline, setIsProviderOnline] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Toggle Theme
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('hackmind_theme', next);
  };

  // Initialize on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Fetch presets from backend
      const resPresets = await fetch(`${import.meta.env.BASE_URL}api/competitions/presets`);
      if (resPresets.ok) {
        const data = await resPresets.json();
        if (Array.isArray(data) && data.length > 0) {
          setPresets(data);
          initializeForCompetition(data[0]);
        } else {
          initializeForCompetition(VERIFIED_HACKATHONS[0]);
        }
      } else {
        initializeForCompetition(VERIFIED_HACKATHONS[0]);
      }

      // Check active provider
      const resHealth = await fetch(`${import.meta.env.BASE_URL}api/health`);
      if (resHealth.ok) {
        const health = await resHealth.json();
        setActiveProviderName(health.activeProvider || 'HACKMIND Engine');
        setIsProviderOnline(true);
      }
    } catch {
      // Offline fallback
      initializeForCompetition(VERIFIED_HACKATHONS[0]);
    }
  };

  const initializeForCompetition = (comp: HackathonCompetition) => {
    setCompetition(comp);
    setIsGenerating(true);

    try {
      // Generate 20 distinct candidate hypotheses
      const generated = generateHypothesesForCompetition(comp);
      setHypotheses(generated);

      const firstId = generated[0]?.id || null;
      setSelectedCandidateId(firstId);

      // Pre-calculate reviews and scores
      const reviewsMap: Record<string, AdversarialEvaluation> = {};
      const scoresMap: Record<string, CompetitiveScores> = {};
      const plansMap: Record<string, ExecutionPlan> = {};

      generated.forEach((h) => {
        const rev = runAdversarialReview(h, comp.timelineHours);
        reviewsMap[h.id] = rev;

        scoresMap[h.id] = calculateCompetitiveScore(
          {
            challengeAlignment: Math.min(10, rev.committeeScore + 0.3),
            differentiationOriginality: h.originalityRating === 'Provável' ? 8.6 : 8.0,
            potentialImpact: 8.5,
            executionFeasibility: 8.7,
            demoQuality: 8.8,
            evidenceValidation: 8.2,
            presentationClarity: 8.4,
            keyUncertainty: h.primaryUncertainty
          },
          weights
        );
      });

      // Build execution plan for candidate #1
      if (generated[0]) {
        plansMap[generated[0].id] = buildExecutionPlan(generated[0], comp);
      }

      setAdversarialReviews(reviewsMap);
      setScores(scoresMap);
      setExecutionPlans(plansMap);
    } finally {
      setIsGenerating(false);
    }
  };

  // Switch Preset
  const handleSelectPreset = (preset: HackathonCompetition) => {
    initializeForCompetition(preset);
  };

  // Update Custom Competition
  const handleUpdateCompetition = (updated: HackathonCompetition) => {
    initializeForCompetition(updated);
  };

  // Re-generate hypotheses via API or Engine
  const handleRegenerateHypotheses = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/hypotheses/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(competition)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hypotheses && data.hypotheses.length > 0) {
          setHypotheses(data.hypotheses);
          setActiveProviderName(data.providerUsed || activeProviderName);
        }
      }
    } catch {
      // Fallback local synthesis
      const fallback = generateHypothesesForCompetition(competition);
      setHypotheses(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  // Run adversarial review on specific candidate
  const handleRunCommitteeOnCandidate = async (hypothesis: CandidateHypothesis) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/hypotheses/adversarial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hypothesis, timelineHours: competition.timelineHours })
      });

      let rev: AdversarialEvaluation;
      if (res.ok) {
        rev = await res.json();
      } else {
        rev = runAdversarialReview(hypothesis, competition.timelineHours);
      }

      setAdversarialReviews(prev => ({ ...prev, [hypothesis.id]: rev }));
      setSelectedCandidateId(hypothesis.id);
      setCurrentPhase(4);
    } catch {
      const rev = runAdversarialReview(hypothesis, competition.timelineHours);
      setAdversarialReviews(prev => ({ ...prev, [hypothesis.id]: rev }));
      setSelectedCandidateId(hypothesis.id);
      setCurrentPhase(4);
    }
  };

  // Build Execution Plan for a candidate
  const handleEnsureExecutionPlan = (hypothesis: CandidateHypothesis) => {
    if (!executionPlans[hypothesis.id]) {
      const plan = buildExecutionPlan(hypothesis, competition);
      setExecutionPlans(prev => ({ ...prev, [hypothesis.id]: plan }));
    }
  };

  // Update judging weights & recalculate scores
  const handleUpdateWeights = (newWeights: JudgingWeights) => {
    setWeights(newWeights);
    const updatedScores: Record<string, CompetitiveScores> = {};

    hypotheses.forEach((h) => {
      const rev = adversarialReviews[h.id];
      const commScore = rev ? rev.committeeScore : 8.0;

      updatedScores[h.id] = calculateCompetitiveScore(
        {
          challengeAlignment: Math.min(10, commScore + 0.3),
          differentiationOriginality: 8.5,
          potentialImpact: 8.4,
          executionFeasibility: 8.7,
          demoQuality: 8.8,
          evidenceValidation: 8.2,
          presentationClarity: 8.4,
          keyUncertainty: h.primaryUncertainty
        },
        newWeights
      );
    });

    setScores(updatedScores);
  };

  const handleProviderChanged = (providerId: string) => {
    const names: Record<string, string> = {
      groq: 'Groq (LPU)',
      nvidia: 'NVIDIA NIM',
      ollama: 'Ollama Local',
      custom: 'Custom Endpoint',
      engine: 'Motor Determinístico'
    };
    setActiveProviderName(names[providerId] || providerId);
    setIsProviderOnline(true);
  };

  // Current selected hypothesis object
  const activeHypothesis = hypotheses.find(h => h.id === selectedCandidateId) || hypotheses[0];

  // Active execution plan
  const activePlan = activeHypothesis ? (executionPlans[activeHypothesis.id] || buildExecutionPlan(activeHypothesis, competition)) : null;

  // Session for Export
  const currentSession: HackathonProjectSession = {
    id: `session-${competition.id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    competition,
    weights,
    hypotheses,
    adversarialReviews,
    scores,
    executionPlans,
    selectedCandidateId: activeHypothesis?.id || null,
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      {/* Top Navigation */}
      <Header
        currentPhase={currentPhase}
        onSelectPhase={(phase) => {
          if (phase === 7 && activeHypothesis) {
            handleEnsureExecutionPlan(activeHypothesis);
          }
          setCurrentPhase(phase);
        }}
        activeProviderName={activeProviderName}
        isOnline={isProviderOnline}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        hypothesesCount={hypotheses.length}
        hasExecutionPlan={!!activePlan}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {/* Phase 1: Research */}
        {currentPhase === 1 && (
          <PhaseResearch
            competition={competition}
            presets={presets}
            onSelectPreset={handleSelectPreset}
            onUpdateCompetition={handleUpdateCompetition}
            onAdvance={() => setCurrentPhase(2)}
            isDark={isDark}
          />
        )}

        {/* Phase 2: Reverse Engineering */}
        {currentPhase === 2 && (
          <PhaseReverseEngineering
            competition={competition}
            onAdvanceToDiscovery={() => setCurrentPhase(3)}
            isDark={isDark}
          />
        )}

        {/* Phase 3: 20 Candidate Hypotheses */}
        {currentPhase === 3 && (
          <PhaseHypotheses
            hypotheses={hypotheses}
            selectedId={selectedCandidateId}
            onSelectCandidate={(id) => {
              setSelectedCandidateId(id);
              const found = hypotheses.find(h => h.id === id);
              if (found) handleEnsureExecutionPlan(found);
            }}
            onRunCommitteeOnCandidate={handleRunCommitteeOnCandidate}
            onAdvanceToCommittee={() => setCurrentPhase(4)}
            isGenerating={isGenerating}
            onRegenerate={handleRegenerateHypotheses}
            providerUsed={activeProviderName}
            isDark={isDark}
          />
        )}

        {/* Phase 4: Adversarial Committee */}
        {currentPhase === 4 && activeHypothesis && (
          <PhaseAdversarial
            hypotheses={hypotheses}
            selectedHypothesis={activeHypothesis}
            reviews={adversarialReviews}
            onRunReview={handleRunCommitteeOnCandidate}
            onAdvanceToRanking={() => setCurrentPhase(5)}
            onSelectCandidate={(id) => setSelectedCandidateId(id)}
            isDark={isDark}
          />
        )}

        {/* Phase 5: Competitive Scoring & Weighted Ranking */}
        {currentPhase === 5 && (
          <PhaseScoring
            hypotheses={hypotheses}
            scores={scores}
            weights={weights}
            onUpdateWeights={handleUpdateWeights}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={(id) => {
              setSelectedCandidateId(id);
              const found = hypotheses.find(h => h.id === id);
              if (found) handleEnsureExecutionPlan(found);
            }}
            onAdvanceToOriginality={() => setCurrentPhase(6)}
            isDark={isDark}
          />
        )}

        {/* Phase 6: Originality Validation */}
        {currentPhase === 6 && activeHypothesis && (
          <PhaseOriginality
            hypothesis={activeHypothesis}
            onAdvanceToPlan={() => {
              handleEnsureExecutionPlan(activeHypothesis);
              setCurrentPhase(7);
            }}
            isDark={isDark}
          />
        )}

        {/* Phase 7: MVP Execution Plan */}
        {currentPhase === 7 && activePlan && (
          <PhaseExecutionPlan
            plan={activePlan}
            competition={competition}
            onOpenExport={() => setIsExportOpen(true)}
            isDark={isDark}
          />
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-3 px-4 text-center text-xs ${
        isDark ? 'border-zinc-800 text-zinc-500 bg-zinc-950' : 'border-zinc-200 text-zinc-500 bg-white'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            HACKMIND — Inteligência Competitiva para Hackathons • Raciocínio Baseado em Evidências
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Provedor: <strong className="text-emerald-500">{activeProviderName}</strong></span>
            <span>•</span>
            <span>20 Candidatas Carregadas</span>
          </div>
        </div>
      </footer>

      {/* Provider Settings Modal */}
      <ProviderModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDark={isDark}
        onProviderChanged={handleProviderChanged}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        session={currentSession}
        isDark={isDark}
      />
    </div>
  );
}
