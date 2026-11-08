/**
 * HACKMIND — Phase 7: Complete MVP Execution Blueprint & Judging Demo Script
 */

import React, { useState } from 'react';
import { ExecutionPlan, HackathonCompetition } from '../engine/types';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  Terminal,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface PhaseExecutionPlanProps {
  plan: ExecutionPlan;
  competition: HackathonCompetition;
  onOpenExport: () => void;
  isDark: boolean;
}

export const PhaseExecutionPlan: React.FC<PhaseExecutionPlanProps> = ({
  plan,
  competition,
  onOpenExport,
  isDark
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'roadmap' | 'demo' | 'pitch'>('architecture');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
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
              07
            </span>
            <h1 className="font-bold text-base tracking-tight">FASE 7 — Plano de Execução do MVP & Pitch</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Pronto para Construção ({competition.timelineHours}h)
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Plano cirúrgico: prioriza um MVP verificável com injeção de teste ao vivo em vez de arquiteturas grandiosas que não terminam a tempo.
          </p>
        </div>

        <button
          onClick={onOpenExport}
          className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Exportar Dossiê Completo (.md)</span>
        </button>
      </div>

      {/* Candidate Executive Summary Card */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-inherit pb-3">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Candidata Selecionada:</span>
            <h2 className="text-lg font-bold text-zinc-100">{plan.hypothesisName}</h2>
          </div>
          <div className="text-xs font-mono text-emerald-400">
            Hackathon: <strong>{competition.name}</strong> ({competition.timelineHours}h)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <strong className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
              Resumo Executivo:
            </strong>
            <p className="text-zinc-300 leading-relaxed">{plan.executiveSummary}</p>
          </div>

          <div>
            <strong className="text-[10px] font-mono text-emerald-400 uppercase block mb-1">
              Hipótese de Valor & Custo da Inação:
            </strong>
            <p className="text-zinc-300 leading-relaxed">{plan.valueHypothesis}</p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 border-b border-zinc-800/80 text-xs">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'architecture'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          1. Arquitetura & Componentes
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'roadmap'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          2. Cronograma de Horas ({competition.timelineHours}h)
        </button>

        <button
          onClick={() => setActiveTab('demo')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'demo'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          3. Roteiro da Demonstração (Banca)
        </button>

        <button
          onClick={() => setActiveTab('pitch')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'pitch'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          4. Roteiro do Pitch de 3 Minutos
        </button>
      </div>

      {/* Tab 1: Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-4">
          {/* ASCII Diagram */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Diagrama da Arquitetura Técnica
              </span>
              <button
                onClick={() => handleCopyText(plan.technicalArchitectureAscii, 'ascii')}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono flex items-center gap-1"
              >
                {copiedSection === 'ascii' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'ascii' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto p-2 bg-black/40 rounded leading-snug">
              {plan.technicalArchitectureAscii}
            </pre>
          </div>

          {/* Architecture Layers Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {plan.architectureComponents.map((comp, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border space-y-1.5 ${
                  isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-zinc-100">{comp.layer}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                    {comp.technology}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px]">{comp.role}</p>
                <p className="text-amber-400/90 text-[10px] font-mono pt-1 border-t border-zinc-800/60">
                  <strong>Plano B (Fallback):</strong> {comp.fallback}
                </p>
              </div>
            ))}
          </div>

          {/* Essential vs Scope Cuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-1.5">
              <strong className="text-[10px] font-mono text-emerald-400 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Componentes Essenciais (MVP Obrigatório)
              </strong>
              <ul className="space-y-1 text-zinc-300 text-[11px]">
                {plan.essentialComponents.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/10 space-y-1.5">
              <strong className="text-[10px] font-mono text-rose-400 uppercase flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Corte Cirúrgico de Escopo (NÃO Construir no Hackathon)
              </strong>
              <ul className="space-y-1 text-zinc-300 text-[11px]">
                {plan.optionalComponentsScopeCut.map((c, i) => (
                  <li key={i}>✕ {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {plan.implementationRoadmap.map((stage, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border space-y-2.5 ${
                  isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                      M{idx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-zinc-100">{stage.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold border border-zinc-700">
                    {stage.hours}
                  </span>
                </div>

                <div>
                  <strong className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                    Entregáveis Verificáveis:
                  </strong>
                  <ul className="space-y-1 text-zinc-300 text-[11px]">
                    {stage.deliverables.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80 text-[10px] font-mono text-zinc-400">
                  <strong className="text-amber-400 uppercase">Se travar:</strong> {stage.fallbackIfBlocked}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Demo Script */}
      {activeTab === 'demo' && (
        <div className="space-y-3">
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            isDark ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <span className="flex items-center gap-2 font-medium">
              <Play className="w-4 h-4 text-emerald-400 shrink-0" />
              Roteiro cronometrado minuto a minuto diante dos jurados técnicos.
            </span>
            <button
              onClick={() => handleCopyText(JSON.stringify(plan.judgingDemoScript, null, 2), 'demo')}
              className="text-[11px] font-mono font-bold flex items-center gap-1 text-emerald-400 hover:underline"
            >
              {copiedSection === 'demo' ? 'Copiado!' : 'Copiar Roteiro'}
            </button>
          </div>

          <div className="space-y-2.5">
            {plan.judgingDemoScript.map((step, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="w-24 shrink-0 font-mono font-bold text-emerald-400 text-xs">
                  {step.minute}
                </div>

                <div className="flex-1 space-y-1">
                  <strong className="text-zinc-200 block text-xs">{step.action}</strong>
                  <p className="text-zinc-400 italic text-[11px]">
                    "{step.spokenPitch}"
                  </p>
                </div>

                <div className="text-[10px] font-mono px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 shrink-0 max-w-xs">
                  <strong className="text-emerald-500 uppercase block">O que está na tela:</strong>
                  <span>{step.onScreenVisual}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Pitch */}
      {activeTab === 'pitch' && (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase font-mono text-zinc-400">
                Estrutura de Pitch Conforme os Critérios Oficiais
              </h3>
              <button
                onClick={() => handleCopyText(
                  `1. GANCHO:\n${plan.pitchScript.hook}\n\n2. DOR:\n${plan.pitchScript.painPoint}\n\n3. PROVA AO VIVO:\n${plan.pitchScript.liveProof}\n\n4. FOSSO TÉCNICO:\n${plan.pitchScript.technicalMoat}\n\n5. ALINHAMENTO:\n${plan.pitchScript.alignmentToCriteria}\n\n6. FECHAMENTO:\n${plan.pitchScript.closingCall}`,
                  'pitch'
                )}
                className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
              >
                {copiedSection === 'pitch' ? 'Copiado!' : 'Copiar Texto Completo'}
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <strong className="text-[10px] font-mono text-emerald-400 uppercase block mb-0.5">
                  1. Gancho Inicial (0-15s)
                </strong>
                <p className="text-zinc-200 font-medium">{plan.pitchScript.hook}</p>
              </div>

              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <strong className="text-[10px] font-mono text-rose-400 uppercase block mb-0.5">
                  2. A Dor Específica & Quem Paga o Pato (15-45s)
                </strong>
                <p className="text-zinc-200">{plan.pitchScript.painPoint}</p>
              </div>

              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <strong className="text-[10px] font-mono text-amber-400 uppercase block mb-0.5">
                  3. Prova Funcional ao Vivo (45-120s)
                </strong>
                <p className="text-zinc-200">{plan.pitchScript.liveProof}</p>
              </div>

              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <strong className="text-[10px] font-mono text-blue-400 uppercase block mb-0.5">
                  4. Fosso Técnico & Por Que um Wrapper Não Copia (120-150s)
                </strong>
                <p className="text-zinc-200">{plan.pitchScript.technicalMoat}</p>
              </div>

              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <strong className="text-[10px] font-mono text-purple-400 uppercase block mb-0.5">
                  5. Alinhamento com o Regulamento & Dados Abertos (150-165s)
                </strong>
                <p className="text-zinc-200">{plan.pitchScript.alignmentToCriteria}</p>
              </div>

              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <strong className="text-[10px] font-mono text-emerald-400 uppercase block mb-0.5">
                  6. Chamada de Fechamento (165-180s)
                </strong>
                <p className="text-zinc-200 font-semibold">{plan.pitchScript.closingCall}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
