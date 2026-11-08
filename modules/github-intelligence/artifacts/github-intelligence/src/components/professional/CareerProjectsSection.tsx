import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  FolderPlus,
  Layers,
  Code2,
  Shield,
  Download,
  Terminal,
  ChevronRight,
  TrendingUp,
  Boxes,
  Zap,
} from 'lucide-react';
import { CareerProjectIdea, ImplementationPrompt } from '../../types';
import { api } from '../../services/api';

interface CareerProjectsSectionProps {
  onOpenPromptModal: (prompt: ImplementationPrompt) => void;
}

export const CareerProjectsSection: React.FC<CareerProjectsSectionProps> = ({
  onOpenPromptModal,
}) => {
  const [projects, setProjects] = useState<CareerProjectIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    api.getCareerProjects().then(res => {
      if (res.projects && res.projects.length > 0) {
        setProjects(res.projects);
      }
    });
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await api.generateCareerProjects();
      setProjects(res.projects);
    } catch (err: any) {
      alert(`Erro ao gerar projetos: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrompt = async (proj: CareerProjectIdea) => {
    setGeneratingPromptId(proj.id);
    try {
      const res = await api.generateImplementationPrompt(proj, 'Universal Full-Stack (React + Node)');
      onOpenPromptModal(res.prompt);
    } catch (err: any) {
      alert(`Erro ao formular prompt: ${err.message}`);
    } finally {
      setGeneratingPromptId(null);
    }
  };

  const categories = Array.from(new Set(projects.map(p => p.category)));

  const filteredProjects = projects.filter(p => {
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141824] via-[#171d2b] to-[#12151e] border border-[#262f3f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] font-mono font-bold mb-2">
            <Zap className="w-3.5 h-3.5" />
            CAREER-BASED PROJECT GENERATOR
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Gerador Inteligente de Projetos de Alto Impacto
          </h2>
          <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
            A IA cruza seu currículo, competências comprovadas e repositórios existentes para sugerir ferramentas e produtos que preencham lacunas técnicas e acelerem sua carreira.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <a
              href="/api/reports/download-document/Career_Opportunities.md"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a212e] hover:bg-[#232d3f] text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#a3e635]" />
              Baixar Relatório (.MD)
            </a>
          )}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analisando e Gerando Ideias...' : 'Gerar Novas Ideias de Projetos'}
          </button>
        </div>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-[#a3e635] text-zinc-950 font-bold'
                : 'bg-[#12151e] text-zinc-400 hover:text-white border border-[#212735]'
            }`}
          >
            Todas as Categorias ({projects.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-500 text-white font-bold'
                  : 'bg-[#12151e] text-zinc-400 hover:text-white border border-[#212735]'
              }`}
            >
              {cat} ({projects.filter(p => p.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#11141c] border border-[#212735] space-y-3">
          <Boxes className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum projeto formulado ainda</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Clique em "Gerar Novas Ideias de Projetos" para a IA cruzar seus repositórios e currículo e conceber ferramentas sob medida.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] text-zinc-950 mt-2"
          >
            Gerar Ideias Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map(proj => {
            const isGeneratingThis = generatingPromptId === proj.id;
            return (
              <div
                key={proj.id}
                className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] hover:border-[#333d52] transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Category & Complexity badges */}
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950/40 text-indigo-300 border border-indigo-800/40">
                      {proj.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">
                        Complexidade: <strong className="text-white">{proj.complexity}</strong>
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Potencial: {proj.commercialPotential}
                      </span>
                    </div>
                  </div>

                  {/* Name and Tagline */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#a3e635] transition-colors">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-[#a3e635] font-mono mt-0.5">{proj.tagline}</p>
                  </div>

                  {/* Problem & Audience */}
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    <strong>Problema:</strong> {proj.problemSolved}
                  </p>

                  <div className="text-xs text-zinc-400">
                    <span>Nicho / Público: </span>
                    <strong className="text-zinc-200">{proj.targetAudience} ({proj.niche})</strong>
                  </div>

                  {/* Recommended Stack pills */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Stack Sugerida:</span>
                    <div className="flex flex-wrap gap-1">
                      {proj.recommendedStack.map((tech, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Impact */}
                  <div className="p-3 rounded-xl bg-[#090b0e] border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                    <span className="font-bold text-[#a3e635] block flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Impacto no Portfólio GitHub:
                    </span>
                    <p className="text-zinc-400 leading-relaxed">{proj.portfolioImpactExplanation}</p>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">
                    MVP estimado: {proj.mvpScope?.length || 2} semanas
                  </span>
                  <button
                    onClick={() => handleCreatePrompt(proj)}
                    disabled={isGeneratingThis}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1c222e] hover:bg-[#a3e635] hover:text-zinc-950 text-zinc-200 border border-[#2b3342] transition-all flex items-center gap-1.5 shadow"
                  >
                    <Code2 className={`w-3.5 h-3.5 ${isGeneratingThis ? 'animate-spin' : ''}`} />
                    {isGeneratingThis ? 'Gerando Prompt...' : 'GERAR PROMPT COMPLETO'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
