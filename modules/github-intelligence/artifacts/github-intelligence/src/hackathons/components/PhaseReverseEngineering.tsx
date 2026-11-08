/**
 * HACKMIND — Phase 2: Reverse Engineering of Past Winners
 */

import React from 'react';
import { HackathonCompetition } from '../engine/types';
import { REVERSE_ENGINEERING_LESSONS } from '../engine/knowledgeBase';
import { Layers, Award, CheckCircle2, AlertTriangle, ArrowRight, BookOpen, Lightbulb } from 'lucide-react';

interface PhaseReverseEngineeringProps {
  competition: HackathonCompetition;
  onAdvanceToDiscovery: () => void;
  isDark: boolean;
}

export const PhaseReverseEngineering: React.FC<PhaseReverseEngineeringProps> = ({
  competition,
  onAdvanceToDiscovery,
  isDark
}) => {
  const winners = competition.pastWinners || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              02
            </span>
            <h1 className="font-bold text-base tracking-tight">FASE 2 — Engenharia Reversa do Sucesso</h1>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Por que os projetos vencedores ganharam? Analisamos o mecanismo real sem presumir falsa causalidade ou bajular tecnologias superficiais.
          </p>
        </div>

        <button
          onClick={onAdvanceToDiscovery}
          className="px-3.5 py-2 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 shrink-0"
        >
          <span>Gerar 20 Candidatas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Verified Winners Case Studies */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" /> Casos Documentados de Vencedores ({winners.length})
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">Fatos Verificados vs Interpretação</span>
        </div>

        {winners.length === 0 ? (
          <div className={`p-6 rounded-xl border text-center text-xs text-zinc-400 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            Nenhum projeto vencedor específico cadastrado para esta edição. As lições globais abaixo foram extraídas de competições correlatas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {winners.map((pw) => (
              <div
                key={pw.id}
                className={`p-4 rounded-xl border space-y-3 transition-colors ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">{pw.name}</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {pw.competition} • Ano {pw.year} • Confiança: {pw.confidence}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold shrink-0">
                    VENCEDOR
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-zinc-300">
                    <strong className="text-zinc-400 text-[11px] block">Problema Enfrentado:</strong>
                    {pw.problem}
                  </p>
                  <p className="text-zinc-300 pt-1">
                    <strong className="text-zinc-400 text-[11px] block">Mecanismo Central:</strong>
                    {pw.mechanism}
                  </p>
                </div>

                {/* Tech Stack */}
                <div>
                  <strong className="text-zinc-400 text-[10px] font-mono uppercase block mb-1">
                    Pilha Tecnológica Utilizada:
                  </strong>
                  <div className="flex flex-wrap gap-1">
                    {pw.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-emerald-400' : 'bg-zinc-100 border-zinc-200 text-emerald-700'
                        }`}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Demonstrated Differentiator */}
                <div className={`p-2.5 rounded-lg border text-xs ${
                  isDark ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <strong className="text-[10px] uppercase font-mono block text-emerald-400">
                    Diferencial Demonstrado ao Vivo:
                  </strong>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{pw.demonstratedDifferentiator}</p>
                </div>

                {/* Verified Facts vs Interpretations */}
                <div className="pt-2 border-t border-inherit grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="font-mono text-[10px] text-zinc-500 uppercase flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Fatos Verificados
                    </span>
                    <ul className="space-y-0.5 text-zinc-400">
                      {pw.verifiedFacts.map((fact, idx) => (
                        <li key={idx}>• {fact}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] text-zinc-500 uppercase flex items-center gap-1 mb-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" /> Interpretação Técnica
                    </span>
                    <ul className="space-y-0.5 text-zinc-400">
                      {pw.interpretationNotes.map((note, idx) => (
                        <li key={idx}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Reverse Engineering Heuristics */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-emerald-500" /> Padrões Universais de Decisão de Jurados Técnicos
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {REVERSE_ENGINEERING_LESSONS.map((lesson, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border space-y-2 ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <h4 className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center justify-center">
                  {idx + 1}
                </span>
                {lesson.principle}
              </h4>

              <div className="space-y-1.5 text-[11px]">
                <div className="text-emerald-400 flex items-start gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span><strong>O que os vencedores fazem:</strong> {lesson.whatWinnersDo}</span>
                </div>
                <div className="text-rose-400 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span><strong>Armadilha comum de perdedores:</strong> {lesson.whatLosersDo}</span>
                </div>
                <p className="text-zinc-400 italic pt-1 border-t border-zinc-800/60">
                  {lesson.judgeImpact}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
