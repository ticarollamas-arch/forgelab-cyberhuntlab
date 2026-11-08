/**
 * HACKMIND — Phase 3: Discovery & 20 Distinct Candidate Hypotheses
 */

import React, { useState } from 'react';
import { CandidateHypothesis } from '../engine/types';
import {
  Sparkles,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  Users
} from 'lucide-react';

interface PhaseHypothesesProps {
  hypotheses: CandidateHypothesis[];
  selectedId: string | null;
  onSelectCandidate: (id: string) => void;
  onRunCommitteeOnCandidate: (hypothesis: CandidateHypothesis) => void;
  onAdvanceToCommittee: () => void;
  isGenerating: boolean;
  onRegenerate: () => void;
  providerUsed: string;
  isDark: boolean;
}

export const PhaseHypotheses: React.FC<PhaseHypothesesProps> = ({
  hypotheses,
  selectedId,
  onSelectCandidate,
  onRunCommitteeOnCandidate,
  onAdvanceToCommittee,
  isGenerating,
  onRegenerate,
  providerUsed,
  isDark
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(hypotheses[0]?.id || null);

  // Extract unique categories
  const categories = Array.from(new Set(hypotheses.map(h => h.category)));

  const filtered = hypotheses.filter(h => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.specificProblem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.coreTechnicalDifferentiator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || h.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              03
            </span>
            <h1 className="font-bold text-base tracking-tight">FASE 3 — Descoberta de 20 Candidatas</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              {hypotheses.length} Propostas Únicas
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            20 hipóteses distintas cobrindo diferentes vetores técnicos e 13 campos analíticos rigorosos por candidata.
            <span className="ml-1 text-zinc-500 font-mono">(Motor: {providerUsed})</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 text-emerald-500 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Gerando...' : 'Re-sintetizar'}</span>
          </button>

          <button
            onClick={onAdvanceToCommittee}
            className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Ir para Comitê Adversarial</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center gap-2.5 ${
        isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Filtrar por problema, tecnologia ou diferencial técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-zinc-50 border-zinc-300 text-zinc-800'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-2.5 py-1.5 rounded-md text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-zinc-50 border-zinc-300 text-zinc-800'
            }`}
          >
            <option value="all">Todas as Categorias ({hypotheses.length})</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hypotheses List */}
      <div className="space-y-3">
        {filtered.map((h) => {
          const isExpanded = expandedId === h.id;
          const isSelected = selectedId === h.id;

          return (
            <div
              key={h.id}
              className={`rounded-xl border transition-all ${
                isSelected
                  ? isDark
                    ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40'
                    : 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400'
                  : isDark
                  ? 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              {/* Collapsed Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : h.id)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-300'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    #{h.number}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-zinc-100 truncate">{h.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                        {h.category}
                      </span>
                      {h.originalityRating && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {h.originalityRating}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-2xl">
                      {h.specificProblem}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCandidate(h.id);
                    }}
                    className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    }`}
                  >
                    {isSelected ? '✓ Selecionada' : 'Selecionar'}
                  </button>

                  <div className="text-zinc-500 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Detailed 13 Fields */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-inherit space-y-3.5 text-xs">
                  {/* Grid of core specifications */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border space-y-1.5 ${
                      isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <strong className="text-[10px] font-mono text-zinc-400 uppercase block">
                        2. Problema Específico & 3. Usuário Afetado
                      </strong>
                      <p className="text-zinc-200">{h.specificProblem}</p>
                      <p className="text-zinc-400 text-[11px] pt-1 border-t border-zinc-800/60">
                        <strong>Usuário:</strong> {h.affectedUser}
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg border space-y-1.5 ${
                      isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <strong className="text-[10px] font-mono text-emerald-400 uppercase block">
                        4. Solução Proposta & 5. Limitação das Alternativas
                      </strong>
                      <p className="text-zinc-200">{h.proposedSolution}</p>
                      <p className="text-rose-400/90 text-[11px] pt-1 border-t border-zinc-800/60">
                        <strong>Por que alternativas falham:</strong> {h.whyAlternativesFail}
                      </p>
                    </div>
                  </div>

                  {/* Technical differentiator and stack */}
                  <div className={`p-3 rounded-lg border space-y-2 ${
                    isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <strong className="text-[10px] font-mono text-amber-400 uppercase flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> 6. Diferencial Técnico Central
                      </strong>
                      <span className="text-[10px] font-mono text-zinc-400">7. Tecnologias Necessárias</span>
                    </div>
                    <p className="text-zinc-200 font-medium">{h.coreTechnicalDifferentiator}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {h.requiredTechnologies.map((t, idx) => (
                        <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Evidence, Uncertainty & MVP Scope */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40">
                      <strong className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                        8. Evidência Justificadora
                      </strong>
                      <p className="text-[11px] text-zinc-300 leading-normal">{h.evidenceJustification}</p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40">
                      <strong className="text-[10px] font-mono text-amber-400 uppercase block mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> 9. Principal Incerteza
                      </strong>
                      <p className="text-[11px] text-zinc-300 leading-normal">{h.primaryUncertainty}</p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40">
                      <strong className="text-[10px] font-mono text-emerald-400 uppercase block mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 10. MVP Construível no Prazo
                      </strong>
                      <p className="text-[11px] text-zinc-300 leading-normal">{h.mvpTimeframeScope}</p>
                    </div>
                  </div>

                  {/* Live Demonstration & Falsification Test */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border ${
                      isDark ? 'bg-emerald-950/15 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <strong className="text-[10px] font-mono uppercase block text-emerald-400">
                        11. Demonstração Visual / Funcional Diante dos Jurados
                      </strong>
                      <p className="text-[11px] mt-1">{h.visualOrFunctionalDemo}</p>
                    </div>

                    <div className={`p-3 rounded-lg border ${
                      isDark ? 'bg-rose-950/15 border-rose-900/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <strong className="text-[10px] font-mono uppercase block text-rose-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> 13. Teste Capaz de Invalidar a Hipótese
                      </strong>
                      <p className="text-[11px] mt-1">{h.falsificationEvidence}</p>
                    </div>
                  </div>

                  {/* Risks */}
                  <div className="p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
                    <span className="text-zinc-400">
                      <strong className="text-zinc-300">Risco Técnico:</strong> {h.risks.technical}
                    </span>
                    <span className="text-zinc-400">
                      <strong className="text-zinc-300">Risco Comercial:</strong> {h.risks.commercial}
                    </span>
                    <span className="text-zinc-400">
                      <strong className="text-zinc-300">Risco Ético/Privacidade:</strong> {h.risks.ethicalOrPrivacy}
                    </span>
                  </div>

                  {/* Actions for this candidate */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onRunCommitteeOnCandidate(h)}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Submeter ao Comitê 6X</span>
                    </button>

                    <button
                      onClick={() => onSelectCandidate(h.id)}
                      className="px-3.5 py-1.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                      {isSelected ? '✓ Proposta Ativa' : 'Selecionar Esta Proposta'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
