/**
 * HACKMIND — Phase 4: Adversarial Committee Review (6 Independent Perspectives)
 */

import React, { useState } from 'react';
import { CandidateHypothesis, AdversarialEvaluation, AgentPerspective } from '../engine/types';
import {
  Users,
  Search,
  Wrench,
  Award,
  Swords,
  HeartHandshake,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight
} from 'lucide-react';

interface PhaseAdversarialProps {
  hypotheses: CandidateHypothesis[];
  selectedHypothesis: CandidateHypothesis;
  reviews: Record<string, AdversarialEvaluation>;
  onRunReview: (hypothesis: CandidateHypothesis) => void;
  onAdvanceToRanking: () => void;
  onSelectCandidate: (id: string) => void;
  isDark: boolean;
}

export const PhaseAdversarial: React.FC<PhaseAdversarialProps> = ({
  hypotheses,
  selectedHypothesis,
  reviews,
  onRunReview,
  onAdvanceToRanking,
  onSelectCandidate,
  isDark
}) => {
  const currentReview = reviews[selectedHypothesis.id];
  const [activeAgentTab, setActiveAgentTab] = useState<string>('all');

  const agentIcons: Record<string, React.ElementType> = {
    'Pesquisador': Search,
    'Engenheiro': Wrench,
    'Jurado': Award,
    'Concorrente': Swords,
    'Usuário': HeartHandshake,
    'Auditor': ShieldAlert,
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
              04
            </span>
            <h1 className="font-bold text-base tracking-tight">FASE 4 — Comitê Adversarial (6 Agentes)</h1>
            {currentReview && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                currentReview.committeeVerdict === 'Consenso Favorável'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {currentReview.committeeVerdict} ({currentReview.committeeScore}/10)
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Cada agente tem mandato para questionar, apontar falhas, exigir evidências ou rejeitar a hipótese.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onRunReview(selectedHypothesis)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Re-executar Comitê</span>
          </button>

          <button
            onClick={onAdvanceToRanking}
            className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
          >
            <span>Ver Ranking Ponderado</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Candidate Selector Bar */}
      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 overflow-x-auto ${
        isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500 font-mono shrink-0">Avaliar Proposta:</span>
          <select
            value={selectedHypothesis.id}
            onChange={(e) => onSelectCandidate(e.target.value)}
            className={`px-2.5 py-1.5 rounded border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-zinc-50 border-zinc-300 text-zinc-800'
            }`}
          >
            {hypotheses.map((h) => (
              <option key={h.id} value={h.id}>
                #{h.number} - {h.name}
              </option>
            ))}
          </select>
        </div>

        {currentReview && (
          <div className="flex items-center gap-2 text-xs shrink-0 font-mono">
            <span className="text-zinc-400">Nota do Comitê:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              {currentReview.committeeScore} / 10
            </span>
          </div>
        )}
      </div>

      {/* If review has not been run for this hypothesis */}
      {!currentReview ? (
        <div className={`p-8 rounded-xl border text-center space-y-3 ${
          isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <Users className="w-8 h-8 text-zinc-500 mx-auto" />
          <div>
            <h3 className="font-bold text-sm text-zinc-200">Comitê Adversarial Não Executado</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Submeta esta proposta para auditoria simultânea dos 6 agentes (Pesquisador, Engenheiro, Jurado, Concorrente, Usuário e Auditor).
            </p>
          </div>
          <button
            onClick={() => onRunReview(selectedHypothesis)}
            className="px-4 py-2 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all inline-flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Auditar #{selectedHypothesis.number} {selectedHypothesis.name}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Objection Callout Card */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isDark ? 'bg-amber-950/20 border-amber-900/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-mono font-bold uppercase text-[10px] tracking-wider text-amber-400">
                Principal Objeção Adversarial a ser Blindada no Pitch:
              </span>
              <p className="leading-relaxed font-medium">"{currentReview.topObjection}"</p>
            </div>
          </div>

          {/* 6 Perspectives Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {currentReview.agentReviews.map((agent: AgentPerspective, idx: number) => {
              const Icon = agentIcons[agent.agentName] || Users;
              const isApproved = agent.verdict === 'Aprovado';
              const isConditional = agent.verdict === 'Aprovado com Ressalvas';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-colors ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Agent Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-zinc-100 uppercase tracking-wider">
                            {agent.agentName}
                          </h4>
                          <span className="text-[10px] text-zinc-500 block leading-tight">{agent.role}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {agent.score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">/10</span>
                      </div>
                    </div>

                    {/* Verdict Pill */}
                    <div className="pt-1">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 border ${
                        isApproved
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isConditional
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}>
                        {isApproved && <CheckCircle2 className="w-3 h-3" />}
                        {isConditional && <AlertTriangle className="w-3 h-3" />}
                        {!isApproved && !isConditional && <XCircle className="w-3 h-3" />}
                        {agent.verdict}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-zinc-300 leading-relaxed pt-1">
                      {agent.summary}
                    </p>
                  </div>

                  {/* Objections & Required Fixes */}
                  <div className="space-y-2 pt-2 border-t border-inherit text-[11px]">
                    <div>
                      <strong className="text-rose-400 font-mono text-[10px] uppercase block mb-0.5">
                        Objeções:
                      </strong>
                      <ul className="space-y-1 text-zinc-400">
                        {agent.objections.map((obj, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-500 shrink-0">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <strong className="text-emerald-400 font-mono text-[10px] uppercase block mb-0.5">
                        Ação Corretiva Exigida:
                      </strong>
                      <ul className="space-y-1 text-zinc-400">
                        {agent.requestedEvidenceOrFixes.map((fix, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 shrink-0">→</span>
                            <span>{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
