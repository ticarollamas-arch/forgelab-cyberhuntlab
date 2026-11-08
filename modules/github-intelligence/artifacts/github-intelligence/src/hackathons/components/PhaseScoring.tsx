/**
 * HACKMIND — Phase 5: Competitive Scoring & Weighted Ranking
 */

import React, { useState } from 'react';
import { CandidateHypothesis, JudgingWeights, CompetitiveScores, DEFAULT_JUDGING_WEIGHTS } from '../engine/types';
import { Award, Sliders, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface PhaseScoringProps {
  hypotheses: CandidateHypothesis[];
  scores: Record<string, CompetitiveScores>;
  weights: JudgingWeights;
  onUpdateWeights: (newWeights: JudgingWeights) => void;
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  onAdvanceToOriginality: () => void;
  isDark: boolean;
}

export const PhaseScoring: React.FC<PhaseScoringProps> = ({
  hypotheses,
  scores,
  weights,
  onUpdateWeights,
  selectedCandidateId,
  onSelectCandidate,
  onAdvanceToOriginality,
  isDark
}) => {
  const [showWeightSliders, setShowWeightSliders] = useState(false);

  // Sort candidates by totalWeightedScore
  const ranked = [...hypotheses].sort((a, b) => {
    const scoreA = scores[a.id]?.totalWeightedScore || 0;
    const scoreB = scores[b.id]?.totalWeightedScore || 0;
    return scoreB - scoreA;
  });

  const handleWeightChange = (key: keyof JudgingWeights, value: number) => {
    onUpdateWeights({
      ...weights,
      [key]: value
    });
  };

  const handleResetWeights = () => {
    onUpdateWeights({ ...DEFAULT_JUDGING_WEIGHTS });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              05
            </span>
            <h1 className="font-bold text-base tracking-tight">FASE 5 — Pontuação Competitiva & Ranking</h1>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Cálculo estrito ponderado por critérios reais, penalizando dependências inviáveis, riscos ignorados e promessas indemonstráveis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowWeightSliders(!showWeightSliders)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              showWeightSliders
                ? 'bg-blue-600 text-white border-blue-500'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajustar Pesos Oficiais</span>
          </button>

          <button
            onClick={onAdvanceToOriginality}
            className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
          >
            <span>Validar Originalidade</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weight Customization Drawer (if active) */}
      {showWeightSliders && (
        <div className={`p-4 rounded-xl border space-y-3 ${
          isDark ? 'bg-zinc-900 border-blue-500/30' : 'bg-blue-50/50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs uppercase font-mono text-blue-400">
                Ponderação dos Critérios de Julgamento
              </h3>
              <p className="text-[11px] text-zinc-400">
                Adapte os pesos caso o edital oficial tenha distribuição específica. Os pesos são normalizados para 100%.
              </p>
            </div>
            <button
              onClick={handleResetWeights}
              className="text-[11px] text-blue-400 hover:underline font-mono"
            >
              Restaurar Padrão HACKMIND (20/20/15/15/15/10/5)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Alinhamento ao Desafio</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round(weights.challengeAlignment)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.challengeAlignment}
                onChange={(e) => handleWeightChange('challengeAlignment', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Diferenciação & Originalidade</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round(weights.differentiationOriginality)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.differentiationOriginality}
                onChange={(e) => handleWeightChange('differentiationOriginality', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Impacto Potencial</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round(weights.potentialImpact)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.potentialImpact}
                onChange={(e) => handleWeightChange('potentialImpact', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Viabilidade de Execução</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round(weights.executionFeasibility)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.executionFeasibility}
                onChange={(e) => handleWeightChange('executionFeasibility', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Qualidade da Demonstração</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round(weights.demoQuality)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.demoQuality}
                onChange={(e) => handleWeightChange('demoQuality', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Evidências e Validação</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round(weights.evidenceValidation)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.evidenceValidation}
                onChange={(e) => handleWeightChange('evidenceValidation', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Clareza da Apresentação</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round(weights.presentationClarity)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.presentationClarity}
                onChange={(e) => handleWeightChange('presentationClarity', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer on scoring */}
      <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
        isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
      }`}>
        <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          A pontuação ponderada reflete solidez técnica, alinhamento ao edital e demonstrabilidade, e <strong>não</strong> representa probabilidade estatística de vitória.
        </span>
      </div>

      {/* Ranked Table */}
      <div className={`rounded-xl border overflow-hidden ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b font-mono text-[10px] uppercase tracking-wider ${
                isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
              }`}>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Proposta</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3 text-center">Alinh. (20%)</th>
                <th className="py-2.5 px-3 text-center">Orig. (20%)</th>
                <th className="py-2.5 px-3 text-center">Viab. (15%)</th>
                <th className="py-2.5 px-3 text-center">Demo (15%)</th>
                <th className="py-2.5 px-3 text-center">Confiança</th>
                <th className="py-2.5 px-3 text-right">Nota Ponderada</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {ranked.map((h, index) => {
                const s = scores[h.id] || {
                  totalWeightedScore: 8.0,
                  challengeAlignment: 8.0,
                  differentiationOriginality: 8.0,
                  executionFeasibility: 8.0,
                  demoQuality: 8.0,
                  confidencePercentage: 85,
                  keyUncertainty: h.primaryUncertainty
                };

                const isSelected = selectedCandidateId === h.id;
                const isTop3 = index < 3;

                return (
                  <tr
                    key={h.id}
                    className={`transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-emerald-950/25 font-medium'
                          : 'bg-emerald-50 font-medium'
                        : isDark
                        ? 'hover:bg-zinc-800/40'
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                        index === 0
                          ? 'bg-amber-500 text-zinc-950'
                          : index === 1
                          ? 'bg-zinc-300 text-zinc-950'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                        <span>{h.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                            Selecionada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                        {h.specificProblem}
                      </p>
                    </td>

                    <td className="py-3 px-3 text-zinc-400 text-[11px]">
                      {h.category}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {s.challengeAlignment.toFixed(1)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {s.differentiationOriginality.toFixed(1)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {s.executionFeasibility.toFixed(1)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {s.demoQuality.toFixed(1)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-emerald-400 border border-zinc-700">
                        {s.confidencePercentage}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span className={`text-sm font-extrabold ${
                        isTop3 ? 'text-emerald-400' : 'text-zinc-300'
                      }`}>
                        {s.totalWeightedScore.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectCandidate(h.id)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                        }`}
                      >
                        {isSelected ? 'Ativa' : 'Escolher'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
