import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Github,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  FolderArchive,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
  KeyRound,
  ShieldAlert,
  Database,
} from 'lucide-react';
import { Header } from './components/Header';
import { TokenModal } from './components/TokenModal';
import { ZipDropzone } from './components/ZipDropzone';
import { RepositoryConfig } from './components/RepositoryConfig';
import { FileTreeViewer } from './components/FileTreeViewer';
import { FilePreviewModal } from './components/FilePreviewModal';
import { PublishPipelineModal } from './components/PublishPipelineModal';
import { GuideModal } from './components/GuideModal';
import { ApkExtractorSection } from './components/ApkExtractorSection';
import { CleanRoomArchitectModal } from './components/CleanRoomArchitectModal';
import { ReadmeDiffModal } from './components/ReadmeDiffModal';
import { analyzeProjectArchitecture } from './services/architectureService';
import { rebrandReadmeFile } from './services/readmeRebrander';
import { parseZipFile, parseFolderFiles, readDirectoryEntriesRecursively } from './services/zipParser';
import {
  validateToken,
  fetchUserRepos,
  createRepo,
  pushFilesToGitHub,
  simulatePushToGitHub,
} from './services/github';
import {
  GitHubUser,
  GitHubRepo,
  ZipMetadata,
  PushOptions,
  PushStepProgress,
  ParsedZipFile,
  ArchitectureAnalysis,
  ParseProgress,
  ReadmeRebrandResult,
} from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);

  // Zip state
  const [currentZip, setCurrentZip] = useState<ZipMetadata | null>(null);
  const [isLoadingZip, setIsLoadingZip] = useState<boolean>(false);
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(null);
  const [previewFile, setPreviewFile] = useState<ParsedZipFile | null>(null);

  // Push options
  const [options, setOptions] = useState<PushOptions>({
    repoName: '',
    isNewRepo: true,
    isPrivate: false,
    description: '',
    branch: 'main',
    commitMessage: 'feat: upload de arquivos via ZipToGit',
    ignoreNodeModules: true,
    ignoreGitFolders: true,
    ignoreEnvFiles: true,
    ignoreOsFiles: true,
    autoPushOnDrop: false, // Desativado por padrão para permitir revisão e proteção de dados
    autoRefactorReadme: false,
    rebrandProjectName: '',
  });

  // Pipeline state
  const [pushProgress, setPushProgress] = useState<PushStepProgress>({ step: 'idle' });
  const [isPipelineOpen, setIsPipelineOpen] = useState<boolean>(false);

  // Modals
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isArchitectModalOpen, setIsArchitectModalOpen] = useState<boolean>(false);
  const [architectAnalysis, setArchitectAnalysis] = useState<ArchitectureAnalysis | null>(null);
  const [isLoadingArchitecture, setIsLoadingArchitecture] = useState<boolean>(false);
  const [analysisProjectName, setAnalysisProjectName] = useState<string>('');
  const [targetAnalysisZip, setTargetAnalysisZip] = useState<ZipMetadata | null>(null);

  // Documentation & Rebranding State
  const [readmeRebrandResult, setReadmeRebrandResult] = useState<ReadmeRebrandResult | null>(null);
  const [isReadmeModalOpen, setIsReadmeModalOpen] = useState<boolean>(false);
  const [isRebrandingReadme, setIsRebrandingReadme] = useState<boolean>(false);

  async function handleOpenArchitecture(meta: ZipMetadata) {
    setTargetAnalysisZip(meta);
    setAnalysisProjectName(meta.fileName);
    setIsArchitectModalOpen(true);
    setIsLoadingArchitecture(true);
    try {
      const result = await analyzeProjectArchitecture(meta);
      setArchitectAnalysis(result);
    } catch (err: any) {
      alert(`Falha ao desconstruir arquitetura: ${err.message}`);
    } finally {
      setIsLoadingArchitecture(false);
    }
  }

  async function handlePreviewReadme() {
    if (!currentZip) return;
    try {
      setIsRebrandingReadme(true);
      const targetName = options.rebrandProjectName || options.repoName || currentZip.fileName;
      const { result } = await rebrandReadmeFile(
        currentZip.files,
        targetName,
        currentZip.detectedType,
        {
          oldProjectName: currentZip.fileName,
        }
      );
      setReadmeRebrandResult(result);
      setIsReadmeModalOpen(true);
    } catch (err: any) {
      alert(`Falha ao gerar pré-visualização do README: ${err.message}`);
    } finally {
      setIsRebrandingReadme(false);
    }
  }

  function handleApplyReadmeChanges() {
    if (!currentZip || !readmeRebrandResult) return;
    const readmePath = 'README.md';
    const existingIndex = currentZip.files.findIndex(
      (f) => !f.isDirectory && f.path.toLowerCase().replace(/^\/+/, '') === 'readme.md'
    );

    let updatedFiles: ParsedZipFile[];
    const newFile: ParsedZipFile = {
      path: readmePath,
      name: readmePath,
      size: new TextEncoder().encode(readmeRebrandResult.refactoredContent).length,
      isDirectory: false,
      content: readmeRebrandResult.refactoredContent,
      isBinary: false,
      included: true,
      extension: 'md',
    };

    if (existingIndex >= 0) {
      updatedFiles = [...currentZip.files];
      updatedFiles[existingIndex] = {
        ...updatedFiles[existingIndex],
        content: readmeRebrandResult.refactoredContent,
        size: newFile.size,
        included: true,
      };
    } else {
      updatedFiles = [newFile, ...currentZip.files];
    }

    setCurrentZip({
      ...currentZip,
      files: updatedFiles,
    });
    setIsReadmeModalOpen(false);
  }

  // Load saved token from storage on mount
  useEffect(() => {
    const savedToken =
      localStorage.getItem('ziptogit_token') || sessionStorage.getItem('ziptogit_token');
    if (savedToken) {
      validateToken(savedToken)
        .then((userData) => {
          setToken(savedToken);
          setUser(userData);
          loadRepos(savedToken);
        })
        .catch(() => {
          localStorage.removeItem('ziptogit_token');
          sessionStorage.removeItem('ziptogit_token');
        });
    }
  }, []);

  const loadRepos = useCallback(async (authToken: string) => {
    try {
      setIsLoadingRepos(true);
      const repos = await fetchUserRepos(authToken);
      setUserRepos(repos);
    } catch (err) {
      console.warn('Could not load user repositories', err);
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  function handleTokenSuccess(newToken: string, newUser: GitHubUser) {
    setToken(newToken);
    setUser(newUser);
    setIsDemoMode(false);
    loadRepos(newToken);
  }

  function handleDisconnect() {
    setToken(null);
    setUser(null);
    setUserRepos([]);
    localStorage.removeItem('ziptogit_token');
    sessionStorage.removeItem('ziptogit_token');
  }

  function handleEnableDemo() {
    setIsDemoMode(true);
    setToken(null);
    setUser({
      login: 'demo-developer',
      id: 999999,
      avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
      name: 'Desenvolvedor Simulado',
      bio: 'Ambiente de teste sem necessidade de token real',
      public_repos: 12,
      html_url: 'https://github.com',
    });
  }

  // Execute the publish pipeline
  const executePublish = useCallback(
    async (zipMeta: ZipMetadata, customOptions: PushOptions) => {
      let filesToSend = zipMeta.files;

      // Auto-Refactor README if enabled in PushOptions
      if (customOptions.autoRefactorReadme) {
        try {
          const targetName = customOptions.rebrandProjectName || customOptions.repoName || zipMeta.fileName;
          const { updatedFiles } = await rebrandReadmeFile(
            filesToSend,
            targetName,
            zipMeta.detectedType,
            {
              oldProjectName: zipMeta.fileName,
            }
          );
          filesToSend = updatedFiles;
          setCurrentZip((prev) => (prev ? { ...prev, files: updatedFiles } : prev));
        } catch (readmeErr) {
          console.warn('[Rebrand README] Failed to auto-refactor README, proceeding with existing files:', readmeErr);
        }
      }

      const filesToPush = filesToSend.filter((f) => !f.isDirectory && f.included);
      if (filesToPush.length === 0) {
        alert('Nenhum arquivo incluído para envio.');
        return;
      }

      setIsPipelineOpen(true);
      setPushProgress({ step: 'checking_repo', totalBlobs: filesToPush.length, currentBlob: 0 });

      try {
        if (isDemoMode || !token || !user) {
          // Simulation / dry-run
          const repoSlug = customOptions.repoName || 'meu-projeto-zip';
          await simulatePushToGitHub(
            user ? user.login : 'demo-developer',
            repoSlug,
            customOptions.branch || 'main',
            filesToPush,
            customOptions.commitMessage,
            (progress) => setPushProgress(progress)
          );
        } else {
          // Live GitHub API
          let targetRepoName = customOptions.repoName.trim();
          if (customOptions.isNewRepo) {
            setPushProgress({ step: 'creating_repo' });
            try {
              const created = await createRepo(
                token,
                targetRepoName,
                customOptions.isPrivate,
                customOptions.description
              );
              targetRepoName = created.name;
              setOptions((prev) => ({ ...prev, isNewRepo: false, repoName: targetRepoName }));
            } catch (createErr: any) {
              // If already exists and user wants to push into it
              if (createErr.message.includes('já existe')) {
                console.warn('Repository already exists, committing to existing repo.');
                setOptions((prev) => ({ ...prev, isNewRepo: false }));
              } else {
                throw createErr;
              }
            }
          }

          await pushFilesToGitHub(
            token,
            user.login,
            targetRepoName,
            customOptions.branch || 'main',
            filesToPush,
            customOptions.commitMessage,
            (progress) => setPushProgress(progress)
          );
          // Refresh user repos after push
          loadRepos(token);
        }
      } catch (err: any) {
        setPushProgress({
          step: 'error',
          errorMessage: err.message || 'Falha ao processar envio para o GitHub.',
        });
      }
    },
    [isDemoMode, token, user, loadRepos]
  );

  // File selected/dropped (.zip, .apk, etc.)
  async function handleFileSelected(file: File) {
    try {
      setIsLoadingZip(true);
      setParseProgress({
        processed: 0,
        total: 100,
        currentFileName: file.name,
        percent: 0,
        phase: 'Iniciando leitura do arquivo...',
      });

      const meta = await parseZipFile(
        file,
        {
          ignoreNodeModules: options.ignoreNodeModules,
          ignoreGitFolders: options.ignoreGitFolders,
          ignoreEnvFiles: options.ignoreEnvFiles,
          ignoreOsFiles: options.ignoreOsFiles,
        },
        (progress) => setParseProgress(progress)
      );

      setCurrentZip(meta);

      // Sanitize repo name from zip filename
      const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');

      const updatedOptions = {
        ...options,
        repoName: baseName || 'meu-projeto',
      };
      setOptions(updatedOptions);

      // Auto-push is only triggered if explicitly enabled AND no oversized dataset files exist
      if (options.autoPushOnDrop && !meta.hasOversizedFiles) {
        if (token || isDemoMode) {
          setTimeout(() => {
            executePublish(meta, updatedOptions);
          }, 500);
        } else {
          setIsTokenModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(`Erro ao ler o arquivo: ${err.message || 'Falha de processamento'}`);
    } finally {
      setIsLoadingZip(false);
      setParseProgress(null);
    }
  }

  // Folder selected via directory input (supports 700 MB+ folders)
  async function handleFolderSelected(files: File[], folderName: string) {
    try {
      setIsLoadingZip(true);
      setParseProgress({
        processed: 0,
        total: files.length,
        currentFileName: folderName,
        percent: 0,
        phase: 'Processando arquivos da pasta...',
      });

      const meta = await parseFolderFiles(
        files,
        folderName,
        {
          ignoreNodeModules: options.ignoreNodeModules,
          ignoreGitFolders: options.ignoreGitFolders,
          ignoreEnvFiles: options.ignoreEnvFiles,
          ignoreOsFiles: options.ignoreOsFiles,
        },
        (progress) => setParseProgress(progress)
      );

      setCurrentZip(meta);

      const baseName = folderName
        .replace(/\.[^/.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');

      const updatedOptions = {
        ...options,
        repoName: baseName || 'meu-projeto',
      };
      setOptions(updatedOptions);

      // Auto-push is only triggered if explicitly enabled AND no oversized dataset files exist
      if (options.autoPushOnDrop && !meta.hasOversizedFiles) {
        if (token || isDemoMode) {
          setTimeout(() => {
            executePublish(meta, updatedOptions);
          }, 500);
        } else {
          setIsTokenModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error('Folder parsing error:', err);
      alert(`Erro ao processar pasta do projeto: ${err.message || 'Falha ao ler arquivos'}`);
    } finally {
      setIsLoadingZip(false);
      setParseProgress(null);
    }
  }

  // Folder dropped directly via drag-and-drop
  async function handleDirectoryEntryDropped(dirEntry: any) {
    try {
      setIsLoadingZip(true);
      setParseProgress({
        processed: 0,
        total: 100,
        currentFileName: dirEntry.name,
        percent: 5,
        phase: 'Varrendo estrutura de pastas...',
      });

      const files = await readDirectoryEntriesRecursively(
        dirEntry,
        dirEntry.name,
        {
          ignoreNodeModules: options.ignoreNodeModules,
          ignoreGitFolders: options.ignoreGitFolders,
        },
        (count, current) => {
          const estimated = Math.max(count + 25, 80);
          const percent = Math.min(95, Math.round((count / estimated) * 100));
          setParseProgress({
            processed: count,
            total: estimated,
            currentFileName: current,
            percent,
            phase: `Varrendo estrutura de pastas (${count} arquivos encontrados)...`,
          });
        }
      );

      await handleFolderSelected(files, dirEntry.name);
    } catch (err: any) {
      console.error('Directory drop scan error:', err);
      alert(`Erro ao escanear pasta arrastada: ${err.message || 'Falha na leitura de diretório'}`);
      setIsLoadingZip(false);
      setParseProgress(null);
    }
  }

  function handleClearZip() {
    setCurrentZip(null);
    setParseProgress(null);
    setPushProgress({ step: 'idle' });
  }

  function handleToggleFile(filePath: string) {
    if (!currentZip) return;
    setCurrentZip({
      ...currentZip,
      files: currentZip.files.map((f) =>
        f.path === filePath ? { ...f, included: !f.included } : f
      ),
    });
  }

  function handleToggleAll(included: boolean) {
    if (!currentZip) return;
    setCurrentZip({
      ...currentZip,
      files: currentZip.files.map((f) => (!f.isDirectory ? { ...f, included } : f)),
    });
  }

  const canPublish = !!currentZip && (!!token || isDemoMode);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col font-sans selection:bg-emerald-500/30 w-full max-w-full overflow-x-hidden">
      {/* Top Bar Contract (3 zones) */}
      <Header
        user={user}
        isDemoMode={isDemoMode}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        onDisconnect={handleDisconnect}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 overflow-hidden">
        {/* Hero Banner / Instructions */}
        <section className="text-left space-y-3 w-full max-w-full">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Automação Git</span>
            <span aria-hidden="true">·</span>
            <span>Git Data API REST</span>
            <span aria-hidden="true">·</span>
            <span>Sem dependência de terminal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white max-w-3xl leading-tight">
            Anexe o arquivo ZIP e envie espontaneamente para o GitHub
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed break-words">
            Solte qualquer projeto compactado em <code className="text-emerald-400 font-mono">.zip</code>. O ZipToGit extrai os arquivos no navegador, filtra dependências pesadas e publica os commits diretamente no seu repositório GitHub em segundos.
          </p>

          {!user && !isDemoMode && (
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsTokenModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white text-[clamp(0.75rem,2.5vw,0.8rem)] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center"
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span className="truncate">Conectar seu Token do GitHub para Iniciar</span>
              </button>
              <button
                type="button"
                onClick={handleEnableDemo}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white text-[clamp(0.75rem,2.5vw,0.8rem)] font-medium rounded-lg transition-colors border border-[#30363d] flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Testar Primeiro em Modo Simulação</span>
              </button>
            </div>
          )}
        </section>

        {/* Primary Interactive Zone: Dropzone & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dropzone & File Inspection */}
          <div className="lg:col-span-7 space-y-6">
            <ZipDropzone
              currentZip={currentZip}
              isLoadingZip={isLoadingZip}
              parseProgress={parseProgress}
              onFileSelected={handleFileSelected}
              onFolderSelected={handleFolderSelected}
              onDirectoryEntryDropped={handleDirectoryEntryDropped}
              onClearZip={handleClearZip}
              onOpenArchitecture={() => currentZip && handleOpenArchitecture(currentZip)}
            />

            {currentZip?.hasOversizedFiles && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/40 text-left space-y-2">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2">
                      <span>Escudo de Memória Ativado</span>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 rounded font-mono text-amber-300">
                        {currentZip.oversizedFilesCount} arquivo(s) massivo(s)
                      </span>
                    </h4>
                    <p className="text-xs text-amber-300/90 leading-relaxed">
                      Detectado arquivo massivo de dados (ex: API com ~10 milhões de produtos da Shopee consumindo centenas de MB). 
                      Para <strong>proteger a memória RAM do seu navegador contra travamentos (V8)</strong> e <strong>respeitar a cota rígida de 100 MB por arquivo da API do GitHub</strong>, este arquivo foi automaticamente isolado do envio e adicionado ao <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">.gitignore</code>.
                    </p>
                    <div className="text-[11px] text-amber-400/80 pt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                      <span>✓ Código-fonte e dependências preservados</span>
                      <span>✓ Zero risco de erro 422 no GitHub</span>
                      <span>✓ .gitignore atualizado automaticamente</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentZip && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Criar um projeto similar do seu jeito?
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Desconstrua a lógica e gere o prompt mestre para uma IA programar uma versão 100% autoral.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => currentZip && handleOpenArchitecture(currentZip)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-sm text-center"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Desconstruir & Gerar Prompt</span>
                </button>
              </div>
            )}

            {currentZip && (
              <FileTreeViewer
                files={currentZip.files}
                onToggleFile={handleToggleFile}
                onToggleAll={handleToggleAll}
                onPreviewFile={(f) => setPreviewFile(f)}
              />
            )}

            {!currentZip && (
              <div className="p-6 rounded-xl bg-[#161b22] border border-[#30363d] text-left space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Como funciona o fluxo espontâneo</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
                  <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
                    <span className="font-semibold text-slate-200 block">1. Arraste o ZIP</span>
                    <p className="text-[11px] leading-relaxed">
                      Selecione ou solte o arquivo do projeto (.zip).
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
                    <span className="font-semibold text-slate-200 block">2. Filtro Automático</span>
                    <p className="text-[11px] leading-relaxed">
                      Remove node_modules, .env e arquivos de sistema.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
                    <span className="font-semibold text-slate-200 block">3. Push Espontâneo</span>
                    <p className="text-[11px] leading-relaxed">
                      Cria o repo e gera o commit diretamente no GitHub.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Repository Configuration */}
          <div className="lg:col-span-5 space-y-6">
            <RepositoryConfig
              options={options}
              onChange={setOptions}
              userRepos={userRepos}
              isLoadingRepos={isLoadingRepos}
              onRefreshRepos={() => token && loadRepos(token)}
              onTriggerPublish={() => currentZip && executePublish(currentZip, options)}
              isPublishing={pushProgress.step !== 'idle' && pushProgress.step !== 'completed' && pushProgress.step !== 'error'}
              canPublish={canPublish}
              isDemoMode={isDemoMode}
              hasZip={!!currentZip}
              onPreviewReadme={handlePreviewReadme}
              isRebrandingReadme={isRebrandingReadme}
            />
          </div>
        </div>

        {/* APK Reverse Engineering & Package Extractor Section */}
        <div id="apk-section">
          <ApkExtractorSection
            onTransferToGitHub={(apkMetadata) => {
              setCurrentZip(apkMetadata);
              const baseName = apkMetadata.fileName
                .replace(/\.[^/.]+$/, '')
                .toLowerCase()
                .replace(/[^a-z0-9-_]/g, '-');
              setOptions({
                ...options,
                repoName: `${baseName}-extraido`,
                description: `Arquivos e recursos extraídos do pacote ${apkMetadata.fileName} para análise e engenharia reversa`,
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onPreviewFile={(f) => setPreviewFile(f)}
            onOpenArchitecture={(apkMeta) => handleOpenArchitecture(apkMeta)}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#161b22] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ZipToGit · Publicador Automático de Arquivos ZIP para GitHub</p>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Guia de Uso
            </button>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Tokens GitHub
            </a>
            <a
              href="https://docs.github.com/en/rest"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub REST Docs
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSuccess={handleTokenSuccess}
        onEnableDemo={handleEnableDemo}
        initialToken={token || ''}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onOpenToken={() => setIsTokenModalOpen(true)}
      />

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <PublishPipelineModal
        isOpen={isPipelineOpen}
        progress={pushProgress}
        onClose={() => setIsPipelineOpen(false)}
        onRetry={() => currentZip && executePublish(currentZip, options)}
        isDemoMode={isDemoMode}
      />

      <CleanRoomArchitectModal
        isOpen={isArchitectModalOpen}
        onClose={() => setIsArchitectModalOpen(false)}
        projectName={analysisProjectName}
        analysis={architectAnalysis}
        isLoading={isLoadingArchitecture}
        onRunAnalysis={() => targetAnalysisZip && handleOpenArchitecture(targetAnalysisZip)}
      />

      <ReadmeDiffModal
        isOpen={isReadmeModalOpen}
        onClose={() => setIsReadmeModalOpen(false)}
        result={readmeRebrandResult}
        projectName={options.rebrandProjectName || options.repoName || currentZip?.fileName || 'novo-projeto'}
        onConfirmApply={handleApplyReadmeChanges}
      />
    </div>
  );
}
