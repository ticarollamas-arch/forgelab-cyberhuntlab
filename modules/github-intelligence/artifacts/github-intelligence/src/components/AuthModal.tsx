import React, { useState } from 'react';
import {
  Github,
  Key,
  ShieldCheck,
  X,
  ExternalLink,
  AlertCircle,
  Lock,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { GitHubConnectionStatus } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: GitHubConnectionStatus;
  onConnectToken: (token: string) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  connection,
  onConnectToken,
  isLoading,
  errorMessage,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [activeMethod, setActiveMethod] = useState<'PAT' | 'OAUTH'>('PAT');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    onConnectToken(tokenInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#10131a] border border-[#2b3342] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141822] border-b border-[#232a38]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Conectar Conta do GitHub
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  API OFICIAL
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {connection.connected && connection.user
                  ? `Conectado como @${connection.user.login}`
                  : 'Integração oficial direta via GitHub REST API'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Method selector */}
          <div className="flex items-center bg-[#0c0e14] p-1 rounded-xl border border-zinc-800 text-xs font-medium">
            <button
              onClick={() => setActiveMethod('PAT')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeMethod === 'PAT'
                  ? 'bg-[#1e2534] text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Personal Access Token (Recomendado)
            </button>
            <button
              onClick={() => setActiveMethod('OAUTH')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeMethod === 'OAUTH'
                  ? 'bg-[#1e2534] text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Instruções OAuth App
            </button>
          </div>

          {activeMethod === 'PAT' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#a3e635]" /> Token de Acesso Pessoal (PAT)
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,workflow,user&description=GitHub-Intelligence-AI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#a3e635] hover:underline flex items-center gap-1 text-[11px] font-semibold"
                  >
                    Gerar Token no GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-[#141822] border border-[#232936] text-xs text-zinc-300 space-y-1.5">
                  <span className="font-semibold text-white block">Escopos Necessários:</span>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400 font-mono text-[11px]">
                    <li><strong className="text-zinc-200">repo</strong>: Ler árvore de arquivos, auditar documentação e criar branches/PRs</li>
                    <li><strong className="text-zinc-200">user</strong>: Identificar nome e perfil do autor</li>
                    <li><strong className="text-zinc-200">workflow</strong> (opcional): Validar arquivos de CI/CD</li>
                  </ul>
                </div>

                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="Cole seu token (ghp_... ou github_pat_...)"
                  className="w-full bg-[#161a24] border border-[#262d3c] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !tokenInput.trim()}
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all disabled:opacity-50 shadow-lg shadow-[#a3e635]/15 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Conectando com a API oficial do GitHub...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conectar e Carregar Meus Repositórios</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3.5 rounded-xl bg-[#141822] border border-[#232936] space-y-2">
                <span className="font-bold text-white block">Configuração de OAuth App no GitHub:</span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Para ativar o login via OAuth em ambientes de produção com domínio registrado:
                </p>
                <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] text-zinc-300">
                  <li>Acesse GitHub Settings &gt; Developer Settings &gt; OAuth Apps.</li>
                  <li>Registre uma nova aplicação informando a URL desta aplicação.</li>
                  <li>Defina o Callback URL como <code className="text-[#a3e635]">/api/auth/github/callback</code>.</li>
                  <li>Configure <code className="text-zinc-200">GITHUB_CLIENT_ID</code> e <code className="text-zinc-200">GITHUB_CLIENT_SECRET</code> nas variáveis de ambiente.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Privacy reassurance */}
          <div className="p-3 rounded-xl bg-[#090b0e] border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#a3e635] shrink-0 mt-0.5" />
            <div>
              <strong>Segurança de Dados:</strong> O token é transmitido diretamente ao servidor da aplicação via HTTPS e mantido exclusivamente em memória para chamadas à API oficial do GitHub. Ele nunca é gravado em logs ou exposto em clientes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
