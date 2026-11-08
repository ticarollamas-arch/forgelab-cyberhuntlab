import React, { useState } from 'react';
import {
  Code2,
  Copy,
  CheckCircle2,
  Download,
  X,
  Sparkles,
  Layers,
  Terminal,
} from 'lucide-react';
import { ImplementationPrompt } from '../../types';

interface PromptModalProps {
  prompt: ImplementationPrompt | null;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ prompt, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!prompt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.promptMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `PROMPT_${prompt.projectName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.md`;
    const blob = new Blob([prompt.promptMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#10131a] border border-[#2b3342] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141822] border-b border-[#232a38]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{prompt.projectName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {prompt.targetEnvironment}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Prompt de engenharia detalhado pronto para implementação assistida por IA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c222e] hover:bg-[#252d3d] text-zinc-200 border border-[#2b3342] transition-all flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#a3e635]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Prompt'}
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

        {/* Prompt content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0c10]">
          <div className="p-4 rounded-xl bg-[#0e1117] border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
            {prompt.promptMarkdown}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141822] border-t border-[#232a38] flex items-center justify-between text-xs text-zinc-400">
          <span>Pronto para uso em Gemini API, Claude Code ou Cursor.</span>
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
