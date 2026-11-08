import React, { useState, useEffect } from 'react';
import {
  Code2,
  Copy,
  CheckCircle2,
  Download,
  X,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';

interface PortfolioPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioPromptModal: React.FC<PortfolioPromptModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getPortfolioPrompt()
        .then(res => setContent(res.content))
        .catch(err => setContent(`Erro ao carregar prompt: ${err.message}`))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'GITHUB_PORTFOLIO_GENERATION_PROMPT.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#10131a] border border-[#2b3342] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141822] border-b border-[#232a38]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                GITHUB_PORTFOLIO_GENERATION_PROMPT.md
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-lime-400/20 text-lime-300">
                  FASE 2 AUTÔNOMA
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Prompt estruturado com fatos auditados reais para criação do seu portfólio web de projetos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c222e] hover:bg-[#252d3d] text-zinc-200 border border-[#2b3342] transition-all flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#a3e635]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Markdown'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar .MD
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0c10]">
          {loading ? (
            <div className="p-12 text-center text-zinc-400">Gerando prompt com dados reais auditados...</div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141822] border border-[#232936] text-xs text-zinc-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#a3e635] shrink-0 mt-0.5" />
                <div>
                  <strong>Como utilizar este documento:</strong> Copie o prompt abaixo e cole no seu modelo de IA de preferência (ou use para construir sua landing page).
                  Ele utiliza exclusivamente as arquiteturas, tecnologias e repositórios verificados no seu GitHub durante esta auditoria, sem inventar dados falsos.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0e1117] border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
                {content}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141822] border-t border-[#232a38] flex items-center justify-between text-xs text-zinc-400">
          <span>Arquivo pronto para exportação e uso imediato.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1c222e] hover:bg-[#252d3d] text-zinc-300 border border-[#2b3342] transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
