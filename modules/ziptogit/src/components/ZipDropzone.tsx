import React, { useRef, useState } from 'react';
import { UploadCloud, Sparkles, FolderArchive, RefreshCw, FolderUp, FileCode } from 'lucide-react';
import { ZipMetadata, ParseProgress } from '../types';
import { createSampleZip } from '../services/zipParser';

interface ZipDropzoneProps {
  currentZip: ZipMetadata | null;
  isLoadingZip: boolean;
  parseProgress?: ParseProgress | null;
  onFileSelected: (file: File) => void;
  onFolderSelected?: (files: File[], folderName: string) => void;
  onDirectoryEntryDropped?: (entry: any) => void;
  onClearZip: () => void;
  onOpenArchitecture?: () => void;
}

export function ZipDropzone({
  currentZip,
  isLoadingZip,
  parseProgress,
  onFileSelected,
  onFolderSelected,
  onDirectoryEntryDropped,
  onClearZip,
  onOpenArchitecture,
}: ZipDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1. Check if dropped item is a directory (folder)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
      if (entry && entry.isDirectory) {
        if (onDirectoryEntryDropped) {
          onDirectoryEntryDropped(entry);
          return;
        }
      }
    }

    // 2. Otherwise treat as regular file (.zip, .apk, etc.)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  }

  function handleFolderInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const firstPath = filesArray[0]?.webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'pasta-do-projeto';
      if (onFolderSelected) {
        onFolderSelected(filesArray, folderName);
      }
    }
  }

  async function handleLoadSample() {
    try {
      const sample = await createSampleZip();
      onFileSelected(sample);
    } catch (err) {
      console.error('Failed to create sample zip', err);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div className="w-full max-w-full">
      {/* File input (.zip, .apk, .tar.gz, etc.) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".apk,.xapk,.zip,.tar,.gz,.tar.gz,.tgz,.rar,.7z,.exe,.dll,.so,.bin,application/zip,application/x-zip-compressed,application/vnd.android.package-archive"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Dedicated Folder input (accepts entire directories) */}
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        onChange={handleFolderInputChange}
        className="hidden"
      />

      {!currentZip ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-5 sm:p-7 text-center transition-all flex flex-col items-center justify-center gap-3 w-full max-w-full ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-500/10 scale-[1.005]'
              : 'border-[#30363d] hover:border-slate-500 bg-[#161b22]/70 hover:bg-[#161b22]'
          }`}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#21262d] border border-[#30363d] flex items-center justify-center text-slate-300">
            {isLoadingZip ? (
              <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
            )}
          </div>

          <div className="max-w-full px-2">
            <h3 className="text-sm sm:text-base font-semibold text-white break-words">
              {isLoadingZip ? (
                parseProgress?.phase || 'Processando e indexando arquivos...'
              ) : (
                'Arraste e solte seu arquivo ZIP ou PASTA do projeto'
              )}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 break-words">
              Suporta pastas grandes (700 MB+), <code className="text-slate-300">.zip</code>, <code className="text-slate-300">.apk</code>, <code className="text-slate-300">.tar.gz</code>, <code className="text-slate-300">.rar</code> ou executáveis
            </p>
          </div>

          {/* Real-time Progress Bar for 700MB+ archives and folders */}
          {isLoadingZip && parseProgress && (
            <div className="w-full max-w-md px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1.5 text-left">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span className="truncate pr-2">
                  {parseProgress.processed} / {parseProgress.total} arquivos
                </span>
                <span className="text-emerald-400 font-semibold">{parseProgress.percent}%</span>
              </div>
              <div className="w-full bg-[#21262d] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(5, parseProgress.percent)}%` }}
                />
              </div>
              {parseProgress.currentFileName && (
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {parseProgress.currentFileName}
                </p>
              )}
            </div>
          )}

          {/* Interactive selection buttons (stacked on mobile) */}
          {!isLoadingZip && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" />
                <span>Selecionar Arquivo (.zip / .apk)</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Selecione uma pasta inteira no seu computador"
              >
                <FolderUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Selecionar Pasta Inteira</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Exemplo</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 sm:p-5 flex flex-col gap-4 w-full max-w-full">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FolderArchive className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-full">
                  {currentZip.fileName}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded truncate max-w-full">
                  {currentZip.detectedType}
                </span>
                {currentZip.isNestedArchive && (
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span>ZIPs Aninhados</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-400 mt-1 font-mono tabular-nums">
                <span>{currentZip.totalFiles} arquivos</span>
                <span>·</span>
                <span>{formatBytes(currentZip.compressedSize)} compactado</span>
                <span>·</span>
                <span>{formatBytes(currentZip.totalSize)} total</span>
              </div>
            </div>
          </div>

          {/* Action buttons with flex-wrap and responsive sizing */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-[#30363d]/60 w-full">
            {onOpenArchitecture && (
              <button
                type="button"
                onClick={onOpenArchitecture}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-purple-200 bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/50 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs min-h-[36px] text-center"
                title="Desconstruir arquitetura e gerar prompt para criar do zero"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span>Desconstruir & Prompt</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-3 py-2 text-xs text-slate-300 hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors cursor-pointer min-h-[36px] text-center"
            >
              Trocar Arquivo
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="w-full sm:w-auto px-3 py-2 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 rounded-md transition-colors cursor-pointer min-h-[36px] text-center"
            >
              Trocar por Pasta
            </button>
            <button
              type="button"
              onClick={onClearZip}
              className="w-full sm:w-auto px-3 py-2 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md transition-colors cursor-pointer min-h-[36px] text-center"
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
