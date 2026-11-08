import React, { useState, useEffect } from 'react';
import {
  Github,
  Sparkles,
  CheckCircle2,
  Copy,
  Download,
  GitPullRequest,
  ExternalLink,
  Code2,
  Layers,
  User,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { GitHubProfileOptimization, GitHubUser } from '../../types';
import { api } from '../../services/api';

interface GitHubProfileSectionProps {
  currentUser: GitHubUser | null;
}

export const GitHubProfileSection: React.FC<GitHubProfileSectionProps> = ({
  currentUser,
}) => {
  const [profileData, setProfileData] = useState<GitHubProfileOptimization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningPr, setIsOpeningPr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAnalyze = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.analyzeProfileReadme();
      setProfileData(res.profileOptimization);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao analisar perfil especial.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPr = async () => {
    setIsOpeningPr(true);
    setErrorMessage('');
    try {
      const res = await api.applyProfileReadmePR();
      setPrUrl(res.prUrl);
      if (profileData) {
        setProfileData({ ...profileData, prStatus: 'OPENED', prUrl: res.prUrl });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao abrir Pull Request no perfil.');
    } finally {
      setIsOpeningPr(false);
    }
  };

  const handleCopy = () => {
    if (!profileData) return;
    navigator.clipboard.writeText(profileData.proposedProfileReadme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141822] via-[#161d2a] to-[#12151e] border border-[#262f3f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#a3e635]/15 text-[#a3e635] text-[11px] font-mono font-bold mb-2">
            <Github className="w-3.5 h-3.5" />
            SPECIAL REPOSITORY PROFILE OPTIMIZER
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Otimizador da Página Principal do Perfil GitHub
          </h2>
          <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
            Modernize o README especial da sua conta (<code>github.com/{currentUser?.login || 'usuario'}/{currentUser?.login || 'usuario'}</code>), destacando suas competências reais e projetos em evidência.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profileData && (
            <a
              href="/api/reports/download-document/GitHub_Profile_Optimized.md"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a212e] hover:bg-[#232d3f] text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#a3e635]" />
              Baixar Perfil (.MD)
            </a>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !currentUser}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center gap-2 shadow disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analisando e Formatando Perfil...' : 'Otimizar Perfil GitHub'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {prUrl && (
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 text-xs text-purple-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>Pull Request criado no repositório de perfil: <strong>{currentUser?.login}/{currentUser?.login}</strong></span>
          </div>
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1 shadow"
          >
            Ver no GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Main Content */}
      {!profileData ? (
        <div className="p-12 text-center rounded-2xl bg-[#11141c] border border-[#212735] text-zinc-400 space-y-3">
          <Github className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">README do Perfil ainda não formulado</h3>
          <p className="text-xs max-w-md mx-auto">
            Clique em "Otimizar Perfil GitHub" para a IA inspecionar seu perfil, selecionar projetos em destaque e formatar o README especial com badges e layout sênior.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bio Recommendation Bar */}
          <div className="p-4 rounded-2xl bg-[#11141c] border border-[#212735] space-y-2 text-xs">
            <span className="text-[10px] font-mono text-[#a3e635] uppercase font-bold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Sugestão de Bio Profissional para Configurações do GitHub:
            </span>
            <div className="p-2.5 rounded-xl bg-[#090b0e] border border-zinc-800 text-zinc-200 font-mono text-xs flex items-center justify-between">
              <span>{profileData.proposedBio}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profileData.proposedBio);
                  alert('Bio copiada!');
                }}
                className="text-zinc-400 hover:text-white"
                title="Copiar Bio"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Side by Side: Original vs Proposed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
            {/* Left: Original Profile README */}
            <div className="border border-zinc-800 rounded-2xl bg-[#0c0f16] overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 bg-[#141822] border-b border-zinc-800 flex items-center justify-between text-zinc-400">
                <span>README Original ({profileData.username}/{profileData.username})</span>
                <span className="text-[10px]">Atual no GitHub</span>
              </div>
              <pre className="p-4 text-zinc-400 overflow-x-auto whitespace-pre-wrap flex-1 max-h-[450px]">
                {profileData.originalReadme || '// O repositório especial ainda não possui README ou está vazio.'}
              </pre>
            </div>

            {/* Right: Proposed Profile README */}
            <div className="border border-[#a3e635]/30 rounded-2xl bg-[#0c0f16] overflow-hidden flex flex-col shadow-xl">
              <div className="px-4 py-2.5 bg-[#141d24] border-b border-[#a3e635]/20 flex items-center justify-between text-[#a3e635]">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> README de Perfil Otimizado
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
                    title="Copiar Markdown"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#a3e635]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <pre className="p-4 text-zinc-200 overflow-x-auto whitespace-pre-wrap flex-1 max-h-[450px] select-text leading-relaxed">
                {profileData.proposedProfileReadme}
              </pre>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 rounded-2xl bg-[#11141c] border border-[#212735] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-zinc-400">
              O Pull Request será aberto na branch <code>modernize/profile-readme</code> do repositório <strong>{currentUser?.login}/{currentUser?.login}</strong>.
            </span>

            <button
              onClick={handleApplyPr}
              disabled={isOpeningPr}
              className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-2 shadow"
            >
              <GitPullRequest className="w-4 h-4" />
              {isOpeningPr ? 'Abrindo PR no Repositório de Perfil...' : 'Criar Branch e Abrir Pull Request no Perfil'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
