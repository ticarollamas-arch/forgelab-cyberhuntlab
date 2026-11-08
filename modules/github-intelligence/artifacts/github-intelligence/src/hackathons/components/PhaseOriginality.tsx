/**
 * HACKMIND — Phase 6: Originality & Prior Art Validation
 */

import React, { useState } from 'react';
import { CandidateHypothesis } from '../engine/types';
import { ShieldCheck, Search, Globe, GitBranch, GraduationCap, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';

interface PhaseOriginalityProps {
  hypothesis: CandidateHypothesis;
  onAdvanceToPlan: () => void;
  isDark: boolean;
}

export const PhaseOriginality: React.FC<PhaseOriginalityProps> = ({
  hypothesis,
  onAdvanceToPlan,
  isDark
}) => {
  const [selectedRating, setSelectedRating] = useState<'Confirmada parcialmente' | 'Provável' | 'Incerta' | 'Refutada'>(
    hypothesis.originalityRating || 'Provável'
  );

  const precedents = hypothesis.precedentsFound || [
    {
      name: 'Soluções Tradicionais de Nuvem (SaaS Corporativo)',
      type: 'commercial',
      difference: 'Cobram mensalidades caras por API, dependem de conexão permanente e não operam offline.'
    },
    {
      name: 'Scripts de Pesquisa Acadêmica (Jupyter / Python)',
      type: 'academic',
      difference: 'Focam em simulações teóricas offline sem interface para o operador de linha de frente nem tratamento em tempo real.'
    },
    {
      name: 'Projetos de Hackathon Anteriores (Repositórios GitHub)',
      type: 'hackathon_prior',
      difference: 'A maioria usava chamadas síncronas de API em nuvem; nenhum havia implementado o cálculo via Wasm/Edge client-side.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              06
            </span>
            <h1 className="font-bold text-base tracking-tight">FASE 6 — Validação de Originalidade & Anterioridade</h1>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Auditoria de soluções comerciais, open source, patentes e artigos. Nunca declaramos novidade absoluta sem investigar anterioridade.
          </p>
        </div>

        <button
          onClick={onAdvanceToPlan}
          className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 shrink-0"
        >
          <span>Construir Plano de Execução do MVP</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Target Candidate Card */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Proposta Auditada:</span>
            <h2 className="text-lg font-bold text-zinc-100">{hypothesis.name}</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Classificação de Originalidade:</span>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value as any)}
              className={`text-xs px-2.5 py-1 rounded font-bold border font-mono focus:outline-none ${
                selectedRating === 'Confirmada parcialmente' || selectedRating === 'Provável'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : selectedRating === 'Incerta'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              <option value="Provável">Provável</option>
              <option value="Confirmada parcialmente">Confirmada parcialmente</option>
              <option value="Incerta">Incerta</option>
              <option value="Refutada">Refutada</option>
            </select>
          </div>
        </div>

        {/* Core Differentiator That Still Survives */}
        <div className={`p-3 rounded-lg border text-xs ${
          isDark ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <strong className="text-[10px] font-mono uppercase block text-emerald-400 mb-0.5">
            Elemento Específico que Diferencia Esta Proposta do Que Já Existe:
          </strong>
          <p className="leading-relaxed">
            {hypothesis.coreTechnicalDifferentiator}
          </p>
        </div>
      </div>

      {/* Precedents and Matches Grid */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
          <Search className="w-4 h-4 text-emerald-500" /> Comparação com Soluções Existentes (Estado da Arte)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {precedents.map((prec, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl border space-y-2 ${
                isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {prec.type === 'commercial' && <Globe className="w-4 h-4 text-blue-400 shrink-0" />}
                {prec.type === 'academic' && <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />}
                {(prec.type === 'hackathon_prior' || prec.type === 'open_source') && (
                  <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <h4 className="font-bold text-xs text-zinc-200 truncate">{prec.name}</h4>
              </div>

              <div className="text-[11px] text-zinc-400 space-y-1">
                <span className="block font-mono text-[10px] text-zinc-500 uppercase">
                  O que já existe vs Nosso Diferencial:
                </span>
                <p className="text-zinc-300 leading-relaxed">{prec.difference}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Research Gaps & Honest Verification */}
      <div className={`p-4 rounded-xl border text-xs space-y-2 ${
        isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Lacunas de Pesquisa & Honestidade Metodológica
        </span>
        <p className="text-zinc-300 leading-relaxed">
          Embora a combinação específica de <strong>{hypothesis.requiredTechnologies.slice(0, 2).join(' + ')}</strong> para <strong>{hypothesis.category}</strong> seja altamente defensável em ambiente de hackathon, não alegamos ineditismo mundial absoluto de patentes. O mérito competitivo decorre da <em>viabilidade demonstrada em tempo real</em> e da <em>aplicação prática em uma dor pontual</em>.
        </p>
      </div>
    </div>
  );
};
