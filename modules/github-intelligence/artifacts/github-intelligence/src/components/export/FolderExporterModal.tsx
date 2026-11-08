import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FolderUp,
  FolderGit2,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileCode,
  Sparkles,
  Layers,
  ArrowRight,
  Code2,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { GitHubConnectionStatus } from '../../types';

interface FolderExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: GitHubConnectionStatus;
  onSuccessExport?: () => void;
}

interface SelectedFile {
  path: string;
  name: string;
  size: number;
  content: string;
  isBase64?: boolean;
}

export const FolderExporterModal: React.FC<FolderExporterModalProps> = ({
  isOpen,
  onClose,
  connection,
  onSuccessExport,
}) => {
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('Exportação inicial de projeto via GitHub Intelligence AI');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    repoUrl: string;
    repoName: string;
    filesExported: number;
    isPrivate: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setErrorMessage(null);
    const parsedFiles: SelectedFile[] = [];

    // Derive initial repo name from first file's directory if empty
    const firstPath = (fileList[0] as any).webkitRelativePath || fileList[0].name;
    const folderBase = firstPath.includes('/') ? firstPath.split('/')[0] : '';
    if (folderBase && !repoName) {
      setRepoName(folderBase.toLowerCase().replace(/[^a-z0-9._-]/g, '-'));
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const relativePath = (file as any).webkitRelativePath || file.name;

      // Filter out heavy dependencies or vcs directories
      if (
        relativePath.includes('node_modules/') ||
        relativePath.includes('.git/') ||
        relativePath.endsWith('.DS_Store') ||
        relativePath.includes('dist/') ||
        relativePath.includes('.next/')
      ) {
        continue;
      }

      // Read content
      try {
        const text = await file.text();
        parsedFiles.push({
          path: relativePath,
          name: file.name,
          size: file.size,
          content: text,
        });
      } catch (err) {
        // Fallback for binary or large files
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const b64 = await base64Promise;
        parsedFiles.push({
          path: relativePath,
          name: file.name,
          size: file.size,
          content: b64,
          isBase64: true,
        });
      }
    }

    setFiles(parsedFiles);
  };

  const handleUseTemplate = (type: 'REACT_APP' | 'NODE_API' | 'PYTHON_AI') => {
    setErrorMessage(null);
    if (type === 'REACT_APP') {
      setRepoName('meu-projeto-react');
      setDescription('Aplicação moderna React + TypeScript construída com Vite e Tailwind CSS.');
      setFiles([
        {
          path: 'package.json',
          name: 'package.json',
          size: 420,
          content: JSON.stringify(
            {
              name: 'meu-projeto-react',
              version: '1.0.0',
              scripts: { dev: 'vite', build: 'vite build' },
              dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
              devDependencies: { vite: '^8.0.0', typescript: '^5.0.0' },
            },
            null,
            2
          ),
        },
        {
          path: 'src/App.tsx',
          name: 'App.tsx',
          size: 380,
          content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">Projeto Exportado via GitHub Intelligence AI</h1>\n      <p>Estrutura limpa e pronta para produção.</p>\n    </main>\n  );\n}`,
        },
        {
          path: 'README.md',
          name: 'README.md',
          size: 512,
          content: `# Meu Projeto React\n\nProjeto exportado e configurado via **GitHub Intelligence AI**.\n\n## Como Executar\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
        },
        {
          path: '.gitignore',
          name: '.gitignore',
          size: 110,
          content: `node_modules\ndist\n.env\n.DS_Store\n`,
        },
      ]);
    } else if (type === 'NODE_API') {
      setRepoName('api-microsservico-node');
      setDescription('API RESTful em Node.js com Express, TypeScript e arquitetura limpa.');
      setFiles([
        {
          path: 'package.json',
          name: 'package.json',
          size: 390,
          content: JSON.stringify(
            {
              name: 'api-microsservico-node',
              version: '1.0.0',
              scripts: { start: 'tsx src/server.ts' },
              dependencies: { express: '^4.21.0', dotenv: '^16.0.0' },
              devDependencies: { tsx: '^4.19.0', typescript: '^5.0.0', '@types/express': '^4.17.0' },
            },
            null,
            2
          ),
        },
        {
          path: 'src/server.ts',
          name: 'server.ts',
          size: 450,
          content: `import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));\n\napp.listen(3000, () => console.log('API rodando na porta 3000'));`,
        },
        {
          path: 'README.md',
          name: 'README.md',
          size: 350,
          content: `# API Node.js & TypeScript\n\nMicrosserviço estruturado com boas práticas de engenharia.\n`,
        },
      ]);
    } else {
      setRepoName('ai-agent-engine');
      setDescription('Agente autônomo com Python, FastAPI e processamento de linguagem natural.');
      setFiles([
        {
          path: 'main.py',
          name: 'main.py',
          size: 380,
          content: `from fastapi import FastAPI\n\napp = FastAPI(title="AI Agent Engine")\n\n@app.get("/")\ndef read_root():\n    return {"message": "AI Agent Operacional"}\n`,
        },
        {
          path: 'requirements.txt',
          name: 'requirements.txt',
          size: 90,
          content: `fastapi>=0.110.0\nuvicorn>=0.28.0\npydantic>=2.6.0\n`,
        },
        {
          path: 'README.md',
          name: 'README.md',
          size: 300,
          content: `# AI Agent Engine\n\nServiço de inteligência artificial em Python.\n`,
        },
      ]);
    }
  };

  const handleExecuteExport = async () => {
    if (!repoName.trim()) {
      setErrorMessage('Por favor, informe o nome do repositório no GitHub.');
      return;
    }

    if (files.length === 0) {
      setErrorMessage('Nenhum arquivo selecionado para exportação. Selecione uma pasta ou use um modelo.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setExportProgress(20);

    try {
      const timer = setInterval(() => {
        setExportProgress(prev => (prev < 90 ? prev + 15 : prev));
      }, 300);

      const res = await api.exportFolderToGitHub({
        repoName,
        isPrivate,
        description,
        branch,
        commitMessage,
        files: files.map(f => ({
          path: f.path,
          content: f.content,
          isBase64: f.isBase64,
        })),
      });

      clearInterval(timer);
      setExportProgress(100);
      setExportResult(res);

      if (onSuccessExport) {
        onSuccessExport();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao exportar pasta para o GitHub.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setRepoName('');
    setDescription('');
    setExportResult(null);
    setErrorMessage(null);
    setExportProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#11141c] border border-[#273244] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Exportar Pasta / Projeto para o GitHub
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/30 font-bold">
                  AUTÔNOMO
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Envie pastas locais ou modelos completos diretamente para sua conta do GitHub via API oficial.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {exportResult ? (
          /* ============================================================== */
          /* SUCCESS STATE */
          /* ============================================================== */
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-bold text-white">Projeto Exportado com Sucesso!</h4>
              <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                O repositório <strong className="text-emerald-400 font-mono">{exportResult.repoName}</strong> foi
                criado e configurado no GitHub com <strong>{exportResult.filesExported} arquivos</strong> versionados.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0f15] border border-zinc-800 text-xs font-mono space-y-2 max-w-md mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-zinc-500">Visibilidade:</span>
                <span className="font-bold text-white">
                  {exportResult.isPrivate ? 'Privado (Seguro)' : 'Público'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Arquivos Enviados:</span>
                <span className="font-bold text-[#a3e635]">{exportResult.filesExported}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Branch Principal:</span>
                <span className="font-bold text-white">{branch}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={exportResult.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center gap-2 shadow"
              >
                <span>Abrir Repositório no GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all"
              >
                Exportar Outro Projeto
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* FORM & UPLOAD STATE */
          /* ============================================================== */
          <div className="space-y-5 text-xs">
            {/* Step 1: Folder Selection / Dropzone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  1. Selecionar Pasta Local ou Template
                </span>
                {files.length > 0 && (
                  <span className="text-[10px] font-mono text-[#a3e635]">
                    {files.length} arquivo(s) prontos
                  </span>
                )}
              </div>

              {/* Hidden directory and file inputs */}
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderSelect}
                className="hidden"
              />
              <input
                ref={filesInputRef}
                type="file"
                multiple
                onChange={handleFolderSelect}
                className="hidden"
              />

              <div
                onClick={() => folderInputRef.current?.click()}
                className="p-6 rounded-2xl bg-[#0c0f15] border-2 border-dashed border-[#232b3b] hover:border-[#a3e635]/60 hover:bg-[#121622] transition-all cursor-pointer text-center space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 mx-auto">
                  <FolderUp className="w-5 h-5 text-[#a3e635]" />
                </div>
                <div>
                  <span className="font-bold text-white block">
                    {files.length > 0
                      ? `${files.length} arquivos carregados da pasta`
                      : 'Clique para selecionar uma pasta do seu computador'}
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Pastas node_modules e .git são ignoradas automaticamente.
                  </span>
                </div>
              </div>

              {/* Quick Template Starters */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] font-mono text-zinc-500">Ou use um template:</span>
                <button
                  type="button"
                  onClick={() => handleUseTemplate('REACT_APP')}
                  className="px-2.5 py-1 rounded-lg bg-[#141822] hover:bg-[#1e2535] text-zinc-300 border border-zinc-800 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Code2 className="w-3 h-3 text-[#a3e635]" />
                  <span>React + Vite</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUseTemplate('NODE_API')}
                  className="px-2.5 py-1 rounded-lg bg-[#141822] hover:bg-[#1e2535] text-zinc-300 border border-zinc-800 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Layers className="w-3 h-3 text-sky-400" />
                  <span>Node.js API</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUseTemplate('PYTHON_AI')}
                  className="px-2.5 py-1 rounded-lg bg-[#141822] hover:bg-[#1e2535] text-zinc-300 border border-zinc-800 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Python AI</span>
                </button>
              </div>
            </div>

            {/* Step 2: Repository Settings */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <span className="font-mono text-zinc-400 font-bold uppercase tracking-wider text-[11px] block">
                2. Configurações no GitHub
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                    Nome do Repositório *
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={e => setRepoName(e.target.value)}
                    placeholder="ex: meu-novo-projeto"
                    className="w-full px-3 py-2 rounded-xl bg-[#141822] border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-[#a3e635]"
                  />
                </div>

                {/* Visibility Option: Private or Public */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                    Visibilidade do Projeto *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isPrivate
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow'
                          : 'bg-[#141822] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Privado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPrivate(false)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        !isPrivate
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow'
                          : 'bg-[#141822] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Público</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="ex: Microsserviço de autenticação e engenharia de dados"
                  className="w-full px-3 py-2 rounded-xl bg-[#141822] border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Mensagem de Commit
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141822] border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-[#a3e635] font-mono"
                />
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Progress Bar while exporting */}
            {isExporting && (
              <div className="space-y-1.5 p-3 rounded-xl bg-[#0c0f15] border border-[#a3e635]/30">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-300">Enviando arquivos para o GitHub...</span>
                  <span className="text-[#a3e635] font-bold">{exportProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-[#a3e635] transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteExport}
                disabled={isExporting || files.length === 0 || !repoName.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderUp className="w-3.5 h-3.5" />
                )}
                <span>EXPORTAR PARA O GITHUB</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
