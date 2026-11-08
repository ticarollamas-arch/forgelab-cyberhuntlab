import { useState, useEffect } from 'react';
import { X, Copy, Check, FileText, ShieldAlert } from 'lucide-react';
import { ParsedZipFile } from '../types';

interface FilePreviewModalProps {
  file: ParsedZipFile | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [loadedText, setLoadedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setLoadedText(null);
      return;
    }

    if (typeof file.content === 'string') {
      setLoadedText(file.content);
      return;
    }

    if (!file.isBinary && (file.loadContent || file.fileRef)) {
      setIsLoading(true);
      (async () => {
        try {
          if (file.loadContent) {
            const res = await file.loadContent();
            if (typeof res === 'string') setLoadedText(res);
          } else if (file.fileRef) {
            // Memory Shield: Never read entire 700 MB into memory!
            if (file.size > 2 * 1024 * 1024 || file.isOversized) {
              const slice = file.fileRef.slice(0, 32768);
              const txt = await slice.text();
              setLoadedText(
                txt +
                  `\n\n// ... [Amostra inicial de 32 KB. Demais dados omitidos para proteger a memória do navegador]`
              );
            } else {
              const txt = await file.fileRef.text();
              setLoadedText(txt);
            }
          }
        } catch (e) {
          console.error('Failed to load file content', e);
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      setLoadedText(null);
    }
  }, [file]);

  if (!file) return null;

  const isText = loadedText !== null || typeof file.content === 'string';
  const textContent = loadedText ?? (typeof file.content === 'string' ? file.content : '');
  // Cap displayed lines to avoid freezing React DOM with 10M rows
  const rawLines = textContent.split('\n');
  const isTruncated = rawLines.length > 500;
  const lines = rawLines.slice(0, 500);

  function handleCopy() {
    if (isText && textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-3xl w-full flex flex-col max-h-[85vh] shadow-2xl overflow-hidden text-left">
        {/* Top bar */}
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between gap-4 bg-[#0d1117]">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#58a6ff] shrink-0" />
            <span className="font-mono text-sm text-slate-200 truncate">{file.path}</span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {formatBytes(file.size)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isText && (
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Memory Shield Notice */}
        {file.isOversized && (
          <div className="px-4 py-2 bg-amber-950/30 border-b border-amber-800/40 flex items-center gap-2 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Amostra Segura:</strong> Arquivo massivo de {formatBytes(file.size)} (~10 milhões de produtos). Para evitar travamento da aba no navegador, o conteúdo foi amostrado com segurança.
            </span>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-auto p-4 bg-[#0d1117] font-mono text-xs text-slate-300">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              <span>Carregando amostra segura do arquivo...</span>
            </div>
          ) : isText ? (
            <div className="space-y-4">
              <div className="table w-full">
                {lines.map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-[#161b22]/70">
                    <span className="table-cell select-none text-right pr-4 text-slate-600 font-mono w-10 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="table-cell whitespace-pre-wrap break-all text-slate-300">
                      {line || ' '}
                    </span>
                  </div>
                ))}
              </div>
              {isTruncated && (
                <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg text-slate-400 text-center text-[11px]">
                  Visualizando as primeiras 500 linhas. O restante foi preservado intacto.
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <p>Arquivo binário ({file.extension.toUpperCase()}) — {formatBytes(file.size)}</p>
              <p className="text-slate-500 text-[11px] mt-1">
                Arquivos binários são codificados em Base64 e enviados como Git Blobs nativos para o GitHub.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
