/**
 * HACKMIND — Phase 1: Evidence Research & Competition Specification
 */

import React, { useState } from 'react';
import { HackathonCompetition } from '../engine/types';
import { Compass, CheckCircle2, ExternalLink, ShieldCheck, Clock, FileCheck, Plus, Sparkles } from 'lucide-react';

interface PhaseResearchProps {
  competition: HackathonCompetition;
  presets: HackathonCompetition[];
  onSelectPreset: (preset: HackathonCompetition) => void;
  onUpdateCompetition: (updated: HackathonCompetition) => void;
  onAdvance: () => void;
  isDark: boolean;
}

export const PhaseResearch: React.FC<PhaseResearchProps> = ({
  competition,
  presets,
  onSelectPreset,
  onUpdateCompetition,
  onAdvance,
  isDark
}) => {
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customName, setCustomName] = useState(competition.name);
  const [customOrganizers, setCustomOrganizers] = useState(competition.organizers);
  const [customTheme, setCustomTheme] = useState(competition.theme);
  const [customChallenge, setCustomChallenge] = useState(competition.officialChallenge);
  const [customHours, setCustomHours] = useState(competition.timelineHours);

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompetition({
      ...competition,
      name: customName,
      organizers: customOrganizers,
      theme: customTheme,
      officialChallenge: customChallenge,
      timelineHours: Number(customHours) || 48,
      confidence: 'Preliminar'
    });
    setIsEditingCustom(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Presets */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              01
            </span>
            <h1 className="font-bold text-base tracking-tight">FASE 1 — Pesquisa de Evidências</h1>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              competition.confidence === 'Alta'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              Grau de Confiança: {competition.confidence}
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1 max-w-2xl">
            Fundamente a estratégia nos organizadores reais, restrições regulamentares e critérios oficiais. Sem invenção de fontes ou dados simulados.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">Benchmarks Oficiais:</span>
          {presets.map((p) => {
            const isSelected = p.id === competition.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-medium border transition-colors ${
                  isSelected
                    ? isDark
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            );
          })}
          <button
            onClick={() => setIsEditingCustom(!isEditingCustom)}
            className={`text-xs px-2.5 py-1.5 rounded-md font-medium border flex items-center gap-1 transition-colors ${
              isEditingCustom
                ? 'bg-blue-600 text-white border-blue-500'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Outro Hackathon</span>
          </button>
        </div>
      </div>

      {/* Custom Edit Form (if toggled) */}
      {isEditingCustom && (
        <form onSubmit={handleSaveCustom} className={`p-4 rounded-xl border space-y-3 ${
          isDark ? 'bg-zinc-900 border-blue-500/40' : 'bg-blue-50/50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs tracking-tight text-blue-400 uppercase font-mono">
              Especificar Hackathon Customizado
            </h3>
            <span className="text-[11px] text-zinc-400">Preencha os dados do edital ou desafio</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-zinc-400 mb-1">Nome da Competição</label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-800'
                }`}
                placeholder="Ex: Hackathon Global da Saúde 2026"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Organizador(es)</label>
              <input
                type="text"
                value={customOrganizers}
                onChange={(e) => setCustomOrganizers(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-800'
                }`}
                placeholder="Ex: Ministério da Saúde & FIOCRUZ"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Prazo de Execução (Horas)</label>
              <input
                type="number"
                value={customHours}
                onChange={(e) => setCustomHours(Number(e.target.value))}
                className={`w-full px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-800'
                }`}
                placeholder="48"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-zinc-400 mb-1">Tema Principal</label>
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-800'
                }`}
                placeholder="Ex: Resiliência Hospitalar e Triagem de Emergência"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-zinc-400 mb-1">Desafio Oficial / Pergunta da Banca</label>
              <input
                type="text"
                value={customChallenge}
                onChange={(e) => setCustomChallenge(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-800'
                }`}
                placeholder="Ex: Como reduzir o tempo de espera no SUS utilizando dados abertos?"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingCustom(false)}
              className="px-3 py-1.5 rounded text-xs border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Salvar e Atualizar Evidências
            </button>
          </div>
        </form>
      )}

      {/* Main Competition Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Core Identity & Challenge */}
        <div className={`lg:col-span-2 p-4 rounded-xl border space-y-4 ${
          isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>Dossiê da Competição</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-1">{competition.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Organizado por: <strong className="text-zinc-200">{competition.organizers}</strong>
            </p>
          </div>

          {/* Theme & Official Challenge Card */}
          <div className={`p-3 rounded-lg border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
              Desafio & Tema Oficial
            </span>
            <p className="text-xs font-semibold text-zinc-200 mt-1">
              {competition.theme}
            </p>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {competition.officialChallenge}
            </p>
          </div>

          {/* Official Judging Criteria Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" /> Critérios Oficiais de Julgamento
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">Ponderação Real</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {competition.officialCriteria.map((c, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-zinc-200">{c.name}</span>
                    {c.weightPercentage && (
                      <span className="font-mono text-emerald-400 text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {c.weightPercentage}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Rules and Hard Constraints */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Regras e Restrições Oficiais
            </span>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {competition.rulesAndConstraints.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Tech & Sources */}
        <div className="space-y-4">
          {/* Sponsors & Encouraged Technologies */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Tecnologias Incentivadas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {competition.encouragedTechnologies.map((t, idx) => (
                <span
                  key={idx}
                  className={`text-[11px] font-mono px-2 py-1 rounded border ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-inherit">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block mb-1.5">
                Patrocinadores Oficiais com Tracks
              </span>
              <div className="flex flex-wrap gap-1">
                {competition.sponsors.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-inherit flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Janela Limite:</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">
                {competition.timelineHours} Horas
              </span>
            </div>
          </div>

          {/* Sources and Verifications */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Fontes Verificadas
            </span>
            <div className="space-y-1.5 text-xs">
              {competition.verifiedSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded bg-zinc-950/40 border border-zinc-800">
                  <span className="truncate text-zinc-300 text-[11px]">{src.label}</span>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 shrink-0 text-[10px] font-mono flex items-center gap-0.5"
                    >
                      Acessar <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action to proceed */}
          <button
            onClick={onAdvance}
            className="w-full py-2.5 px-4 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Avançar: Engenharia Reversa dos Vencedores</span>
            <span className="font-mono text-emerald-200">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
