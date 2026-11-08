import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Trophy,
  Sparkles,
  Download,
  Code2,
  ExternalLink,
  Target,
  ShieldAlert,
  Zap,
  Layers,
  Award,
} from 'lucide-react';
import { StartupIdea, HackathonProject, ImplementationPrompt } from '../../types';
import { api } from '../../services/api';

interface StartupHackathonSectionProps {
  onOpenPromptModal: (prompt: ImplementationPrompt) => void;
}

export const StartupHackathonSection: React.FC<StartupHackathonSectionProps> = ({
  onOpenPromptModal,
}) => {
  const [subTab, setSubTab] = useState<'STARTUPS' | 'HACKATHONS'>('STARTUPS');

  // Startups state
  const [startupIdeas, setStartupIdeas] = useState<StartupIdea[]>([]);
  const [startupMode, setStartupMode] = useState<'PROFESSIONAL' | 'OPEN_EXPLORATION'>('PROFESSIONAL');
  const [startupSector, setStartupSector] = useState<string>('AI & Automation');
  const [isLoadingStartups, setIsLoadingStartups] = useState(false);

  // Hackathons state
  const [hackathonProjects, setHackathonProjects] = useState<HackathonProject[]>([]);
  const [hackathonTheme, setHackathonTheme] = useState('');
  const [isLoadingHackathons, setIsLoadingHackathons] = useState(false);

  const [promptLoadingId, setPromptLoadingId] = useState<string | null>(null);

  useEffect(() => {
    api.getStartupIdeas().then(res => {
      if (res.ideas) setStartupIdeas(res.ideas);
    });
    api.getHackathonProjects().then(res => {
      if (res.projects) setHackathonProjects(res.projects);
    });
  }, []);

  const handleGenerateStartups = async () => {
    setIsLoadingStartups(true);
    try {
      const res = await api.generateStartupIdeas(startupMode, startupSector);
      setStartupIdeas(res.ideas);
    } catch (err: any) {
      alert(`Erro ao gerar startups: ${err.message}`);
    } finally {
      setIsLoadingStartups(false);
    }
  };

  const handleGenerateHackathons = async () => {
    setIsLoadingHackathons(true);
    try {
      const res = await api.generateHackathonProjects(hackathonTheme.trim() || undefined);
      setHackathonProjects(res.projects);
    } catch (err: any) {
      alert(`Erro ao gerar projetos de hackathon: ${err.message}`);
    } finally {
      setIsLoadingHackathons(false);
    }
  };

  const handleCreatePrompt = async (item: any) => {
    setPromptLoadingId(item.id);
    try {
      const res = await api.generateImplementationPrompt(item, 'Universal Full-Stack (React + Node)');
      onOpenPromptModal(res.prompt);
    } catch (err: any) {
      alert(`Erro ao formular prompt: ${err.message}`);
    } finally {
      setPromptLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Selector */}
      <div className="flex items-center justify-between border-b border-[#212735] pb-4">
        <div className="flex items-center gap-2 bg-[#121620] p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setSubTab('STARTUPS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'STARTUPS'
                ? 'bg-purple-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Rocket className="w-4 h-4" />
            Startup & Innovation Lab
          </button>
          <button
            onClick={() => setSubTab('HACKATHONS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'HACKATHONS'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Hackathon Intelligence Engine
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'STARTUPS' && startupIdeas.length > 0 && (
            <a
              href="/api/reports/download-document/Startup_Ideas.md"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a212e] hover:bg-[#232d3f] text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#a3e635]" />
              Baixar Startup Ideas (.MD)
            </a>
          )}
          {subTab === 'HACKATHONS' && hackathonProjects.length > 0 && (
            <a
              href="/api/reports/download-document/Hackathon_Projects.md"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a212e] hover:bg-[#232d3f] text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#a3e635]" />
              Baixar Hackathon Projects (.MD)
            </a>
          )}
        </div>
      </div>

      {/* VIEW A: STARTUPS */}
      {subTab === 'STARTUPS' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-[#11141c] border border-[#212735] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">Modo de Exploração:</span>
              <button
                onClick={() => setStartupMode('PROFESSIONAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  startupMode === 'PROFESSIONAL'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-[#161a24] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Modo Profissional (Currículo & Stacks)
              </button>
              <button
                onClick={() => setStartupMode('OPEN_EXPLORATION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  startupMode === 'OPEN_EXPLORATION'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-[#161a24] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Modo Exploração Livre (Qualquer Setor)
              </button>

              {startupMode === 'OPEN_EXPLORATION' && (
                <select
                  value={startupSector}
                  onChange={e => setStartupSector(e.target.value)}
                  className="bg-[#161a24] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                >
                  <option value="HealthTech">HealthTech</option>
                  <option value="FinTech">FinTech</option>
                  <option value="EdTech">EdTech</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="AI & Automation">AI & Automation</option>
                  <option value="AgTech">AgTech</option>
                  <option value="Logistics">Logistics</option>
                  <option value="SaaS B2B">SaaS B2B</option>
                </select>
              )}
            </div>

            <button
              onClick={handleGenerateStartups}
              disabled={isLoadingStartups}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center justify-center gap-2 shadow"
            >
              <Rocket className={`w-3.5 h-3.5 ${isLoadingStartups ? 'animate-spin' : ''}`} />
              {isLoadingStartups ? 'Explorando Oportunidades...' : 'Gerar Ideias de Startups'}
            </button>
          </div>

          {/* Startups List */}
          {startupIdeas.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#11141c] border border-[#212735] text-zinc-400 space-y-2">
              <Rocket className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Nenhuma startup formulada ainda</p>
              <p className="text-xs">Clique acima para gerar ideias de startups com gaps de concorrência e modelo de receita.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {startupIdeas.map(st => (
                <div
                  key={st.id}
                  className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] hover:border-purple-500/40 transition-all space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/40 text-purple-300 border border-purple-800/40">
                        {st.sector}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        MVP: <strong className="text-white">{st.mvpTimelineWeeks} semanas</strong>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{st.name}</h3>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        <strong>Problema:</strong> {st.problemStatement}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#090b0e] border border-zinc-800/80 text-xs space-y-1.5">
                      <div className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Diferencial Competitivo Injusto:
                      </div>
                      <p className="text-zinc-300">{st.marketDifferentiator}</p>

                      <div className="pt-2 text-zinc-400 border-t border-zinc-800/60 text-[11px]">
                        <strong>Monetização:</strong> {st.monetizationModel}
                      </div>
                    </div>

                    {/* Competitors and gaps */}
                    {st.knownCompetitors && st.knownCompetitors.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-mono uppercase text-zinc-500">Concorrência Conhecida & Brechas:</span>
                        {st.knownCompetitors.map((c, i) => (
                          <div key={i} className="text-[11px] text-zinc-400">
                            • <strong className="text-zinc-200">{c.name}:</strong> {c.gap}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={() => handleCreatePrompt(st)}
                      disabled={promptLoadingId === st.id}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-1.5 shadow"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      {promptLoadingId === st.id ? 'Gerando...' : 'GERAR PROMPT DE MVP'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW B: HACKATHONS */}
      {subTab === 'HACKATHONS' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-[#11141c] border border-[#212735] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={hackathonTheme}
                onChange={e => setHackathonTheme(e.target.value)}
                placeholder="Tema do Hackathon ou critérios específicos (Ex: Hackathon de IA Generativa e Sustentabilidade)..."
                className="w-full bg-[#161a24] border border-[#262d3c] rounded-xl px-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              onClick={handleGenerateHackathons}
              disabled={isLoadingHackathons}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow shrink-0"
            >
              <Trophy className={`w-3.5 h-3.5 ${isLoadingHackathons ? 'animate-spin' : ''}`} />
              {isLoadingHackathons ? 'Planejando Soluções Vencedoras...' : 'Gerar Projetos para Hackathon'}
            </button>
          </div>

          {/* Hackathons List */}
          {hackathonProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#11141c] border border-[#212735] text-zinc-400 space-y-2">
              <Trophy className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Nenhum projeto de hackathon formulado ainda</p>
              <p className="text-xs">Insira um tema acima e gere protótipos de alta aderência aos critérios dos jurados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hackathonProjects.map(hk => (
                <div
                  key={hk.id}
                  className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] hover:border-amber-500/40 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {hk.themeOrCategory}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-mono text-zinc-400">Aderência:</span>
                        <strong className="text-amber-400 font-mono text-sm">
                          {hk.evaluationMetrics.hackathonFitIndex}/100
                        </strong>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{hk.name}</h3>
                      <p className="text-xs text-amber-300/90 font-mono mt-1">
                        "{hk.elevatorPitch}"
                      </p>
                    </div>

                    {/* Live Demo Highlights */}
                    <div className="p-3 rounded-xl bg-[#090b0e] border border-zinc-800 text-xs space-y-1.5">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Destaques na Demo ao Vivo (3 minutos):
                      </span>
                      <ul className="space-y-1 list-disc list-inside text-zinc-300 text-[11px]">
                        {hk.liveDemoFeatures.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Judge points */}
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-mono uppercase text-zinc-500">Argumentos para os Jurados:</span>
                      <p className="text-[11px] text-zinc-400">
                        • <strong>Originalidade:</strong> {hk.judgePresentationPoints.originalityPoint}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        • <strong>Impacto:</strong> {hk.judgePresentationPoints.impactPoint}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={() => handleCreatePrompt(hk)}
                      disabled={promptLoadingId === hk.id}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all flex items-center gap-1.5 shadow"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      {promptLoadingId === hk.id ? 'Gerando...' : 'GERAR PROMPT DE HACKATHON'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
