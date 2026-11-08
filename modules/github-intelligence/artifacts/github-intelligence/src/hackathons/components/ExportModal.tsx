/**
 * HACKMIND — Export Modal (Markdown, JSON, Clipboard)
 */

import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Code2 } from 'lucide-react';
import { HackathonProjectSession } from '../engine/types';
import { api } from '../../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: HackathonProjectSession;
  isDark: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  session,
  isDark
}) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markdownText, setMarkdownText] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      loadMarkdown();
    }
  }, [isOpen, session]);

  const loadMarkdown = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const markdown = await api.generateHackathonMarkdown(session);
      setMarkdownText(markdown);
    } catch (err) {
      setMarkdownText('');
      setLoadError(err instanceof Error ? err.message : 'Falha ao carregar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const contentToExport = format === 'markdown' ? markdownText : JSON.stringify(session, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contentToExport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLoadError('Não foi possível copiar para a área de transferência.');
    }
  };

  const handleDownload = () => {
    const filename = `HACKMIND_${session.competition.name.replace(/[^a-zA-Z0-9]/g, '_')}.${format === 'markdown' ? 'md' : 'json'}`;
    const blob = new Blob([contentToExport], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadMessage(`Arquivo ${filename} baixado.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <h2 className="font-bold text-sm tracking-tight">Exportar Relatório Estratégico HACKMIND</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-zinc-700 p-0.5 text-xs font-mono">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-2 py-0.5 rounded ${format === 'markdown' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400'}`}
              >
                Markdown (.md)
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2 py-0.5 rounded ${format === 'json' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400'}`}
              >
                JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-400">Gerando relatório formatado...</div>
          ) : loadError && format === 'markdown' ? (
            <div role="alert" className="p-6 text-center text-xs text-rose-300">
              <p>{loadError}</p>
              <button type="button" onClick={loadMarkdown} className="mt-3 rounded-lg border border-zinc-700 px-3 py-2 text-zinc-100">Tentar novamente</button>
            </div>
          ) : (
            <pre className="text-[11px] font-mono leading-relaxed p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[50vh]">
              {contentToExport}
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-inherit flex items-center justify-between text-xs">
          <span className="text-zinc-500 text-[11px]">
            Compatível com GitHub README, Notion, Obsidian e editores Markdown.
          </span>

          <div className="flex items-center gap-2">
            {downloadMessage && <span role="status" className="text-emerald-400">{downloadMessage}</span>}
            <button
              onClick={handleCopy}
              disabled={loading || (!!loadError && format === 'markdown')}
              className={`px-3 py-1.5 rounded-md font-medium border flex items-center gap-1.5 transition-colors ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || (!!loadError && format === 'markdown')}
              className="px-3.5 py-1.5 rounded-md font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
