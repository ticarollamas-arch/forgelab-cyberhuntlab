/**
 * HACKMIND — Competitive Scoring & Ranking Engine
 * Pure logic calculations, criteria weighting, penalties and tie-breaking.
 */

import { CompetitiveScores, JudgingWeights, DEFAULT_JUDGING_WEIGHTS } from './types';

export interface ScoreInput {
  challengeAlignment: number; // 0-10
  differentiationOriginality: number; // 0-10
  potentialImpact: number; // 0-10
  executionFeasibility: number; // 0-10
  demoQuality: number; // 0-10
  evidenceValidation: number; // 0-10
  presentationClarity: number; // 0-10
  penalties?: {
    unfeasibleDependencies?: number;
    fictitiousFeatures?: number;
    ignoredRisks?: number;
    undemonstrableDifferentiator?: number;
    duplicateConcept?: number;
  };
  keyUncertainty?: string;
}

export function normalizeWeights(weights: Partial<JudgingWeights> = {}): JudgingWeights {
  const merged: JudgingWeights = {
    challengeAlignment: weights.challengeAlignment ?? DEFAULT_JUDGING_WEIGHTS.challengeAlignment,
    differentiationOriginality: weights.differentiationOriginality ?? DEFAULT_JUDGING_WEIGHTS.differentiationOriginality,
    potentialImpact: weights.potentialImpact ?? DEFAULT_JUDGING_WEIGHTS.potentialImpact,
    executionFeasibility: weights.executionFeasibility ?? DEFAULT_JUDGING_WEIGHTS.executionFeasibility,
    demoQuality: weights.demoQuality ?? DEFAULT_JUDGING_WEIGHTS.demoQuality,
    evidenceValidation: weights.evidenceValidation ?? DEFAULT_JUDGING_WEIGHTS.evidenceValidation,
    presentationClarity: weights.presentationClarity ?? DEFAULT_JUDGING_WEIGHTS.presentationClarity,
  };

  const total =
    merged.challengeAlignment +
    merged.differentiationOriginality +
    merged.potentialImpact +
    merged.executionFeasibility +
    merged.demoQuality +
    merged.evidenceValidation +
    merged.presentationClarity;

  if (total <= 0) {
    return { ...DEFAULT_JUDGING_WEIGHTS };
  }

  // Normalize so sum is exactly 100
  return {
    challengeAlignment: (merged.challengeAlignment / total) * 100,
    differentiationOriginality: (merged.differentiationOriginality / total) * 100,
    potentialImpact: (merged.potentialImpact / total) * 100,
    executionFeasibility: (merged.executionFeasibility / total) * 100,
    demoQuality: (merged.demoQuality / total) * 100,
    evidenceValidation: (merged.evidenceValidation / total) * 100,
    presentationClarity: (merged.presentationClarity / total) * 100,
  };
}

export function calculateCompetitiveScore(
  input: ScoreInput,
  customWeights?: Partial<JudgingWeights>
): CompetitiveScores {
  const w = normalizeWeights(customWeights);

  // Clamp inputs to [0, 10]
  const clamp = (val: number) => Math.max(0, Math.min(10, Number.isFinite(val) ? val : 0));

  const cAlignment = clamp(input.challengeAlignment);
  const cDiff = clamp(input.differentiationOriginality);
  const cImpact = clamp(input.potentialImpact);
  const cFeas = clamp(input.executionFeasibility);
  const cDemo = clamp(input.demoQuality);
  const cEvid = clamp(input.evidenceValidation);
  const cPres = clamp(input.presentationClarity);

  // Weighted sum (0 to 10 scale)
  const rawScore =
    (cAlignment * w.challengeAlignment +
      cDiff * w.differentiationOriginality +
      cImpact * w.potentialImpact +
      cFeas * w.executionFeasibility +
      cDemo * w.demoQuality +
      cEvid * w.evidenceValidation +
      cPres * w.presentationClarity) /
    100;

  // Penalties calculation
  const penalties = input.penalties || {};
  const totalPenalties =
    (penalties.unfeasibleDependencies || 0) +
    (penalties.fictitiousFeatures || 0) +
    (penalties.ignoredRisks || 0) +
    (penalties.undemonstrableDifferentiator || 0) +
    (penalties.duplicateConcept || 0);

  const finalScore = Math.max(0, Math.min(10, Math.round((rawScore - totalPenalties) * 100) / 100));

  // Confidence index: weighted by evidence validation, feasibility and absence of penalties
  const penaltyFactor = Math.max(0.2, 1 - totalPenalties / 6);
  const confidencePercentage = Math.round(
    Math.min(100, ((cEvid * 0.4 + cFeas * 0.3 + cAlignment * 0.3) * 10) * penaltyFactor)
  );

  return {
    challengeAlignment: cAlignment,
    differentiationOriginality: cDiff,
    potentialImpact: cImpact,
    executionFeasibility: cFeas,
    demoQuality: cDemo,
    evidenceValidation: cEvid,
    presentationClarity: cPres,
    penalties,
    totalWeightedScore: finalScore,
    confidencePercentage,
    keyUncertainty: input.keyUncertainty || 'Validação de taxa de resposta com dados em tempo real no MVP.',
  };
}

export interface CandidateWithScore {
  id: string;
  name: string;
  scores: CompetitiveScores;
  category: string;
}

export function rankCandidates(candidates: CandidateWithScore[]): CandidateWithScore[] {
  return [...candidates].sort((a, b) => {
    // 1. Higher total weighted score first
    const scoreDiff = b.scores.totalWeightedScore - a.scores.totalWeightedScore;
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;

    // 2. Tie-break by Execution Feasibility
    const feasDiff = b.scores.executionFeasibility - a.scores.executionFeasibility;
    if (Math.abs(feasDiff) > 0.01) return feasDiff;

    // 3. Tie-break by Differentiation / Originality
    const diffDiff = b.scores.differentiationOriginality - a.scores.differentiationOriginality;
    if (Math.abs(diffDiff) > 0.01) return diffDiff;

    // 4. Tie-break by Evidence Confidence
    return b.scores.confidencePercentage - a.scores.confidencePercentage;
  });
}
