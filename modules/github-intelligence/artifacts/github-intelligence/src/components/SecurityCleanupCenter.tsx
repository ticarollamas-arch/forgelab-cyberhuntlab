import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  ExternalLink,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Info,
  Layers,
} from 'lucide-react';
import { RepositoryItem, SecretFinding } from '../types';

interface SecurityCleanupCenterProps {
  repos: RepositoryItem[];
  onOpenRepoDetails: (repo: RepositoryItem) => void;
}

export const SecurityCleanupCenter: React.FC<SecurityCleanupCenterProps> = ({
  repos,
  onOpenRepoDetails,
}) => {
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Aggregate all secrets across all repos
  const allSecrets: SecretFinding[] = repos.flatMap(r => r.secrets);

  const filteredSecrets = allSecrets.filter(s => {
    if (selectedProviderFilter === 'ALL') return true;
    return s.provider === selectedProviderFilter;
  });

  const providers = Array.from(new Set(allSecrets.map(s => s.provider)));

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#171b25] via-[#1a1f2c] to-[#141822] border border-amber-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                GitHub Security Cleanup Engine
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                  ESTRITAMENTE CONFIDENCIAL
                </span>
              </h2>
              <p className="text-xs text-zinc-300 max-w-2xl mt-1">
                Auditoria de credenciais, chaves de API, senhas e tokens expostos. Os valores originais são
                <strong> 100% mascarados</strong> e nunca publicados em relatórios ou Pull Requests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-700 text-right">
              <span className="text-[10px] uppercase text-zinc-400 block font-mono">Segredos Neutralizados</span>
              <span className="text-xl font-bold font-mono text-amber-400">{allSecrets.length}</span>
            </div>
          </div>
        </div>

        {/* Security Rule Warning Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Aviso Crítico de Rotação de Segredos:</strong> Apagar uma chave do código ou do README não a torna segura caso ela já tenha sido comitada no histórico Git.
            Siga o procedimento de revogação imediata no provedor emissor. A reescrita do histórico Git (Nível C) exige autorização expressa e backup prévio.
          </div>
        </div>
      </div>

      {/* Provider filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-zinc-400 font-mono">Filtrar por Provedor:</span>
        <button
          onClick={() => setSelectedProviderFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedProviderFilter === 'ALL'
              ? 'bg-[#a3e635] text-zinc-950 font-bold'
              : 'bg-[#141822] text-zinc-400 hover:text-white border border-[#232936]'
          }`}
        >
          Todos ({allSecrets.length})
        </button>
        {providers.map(p => (
          <button
            key={p}
            onClick={() => setSelectedProviderFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              selectedProviderFilter === p
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'bg-[#141822] text-zinc-400 hover:text-white border border-[#232936]'
            }`}
          >
            {p} ({allSecrets.filter(s => s.provider === p).length})
          </button>
        ))}
      </div>

      {/* Secrets List */}
      {filteredSecrets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#11141c] border border-[#232936] space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum segredo vulnerável detectado!</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Todos os repositórios avaliados estão em conformidade com as diretrizes de saneamento de variáveis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSecrets.map(secret => {
            const repo = repos.find(r => r.name === secret.repoName);

            return (
              <div
                key={secret.id}
                className="p-5 rounded-2xl bg-[#12151e] border border-zinc-800 hover:border-amber-500/40 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono ${
                        secret.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {secret.severity}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {secret.secretType}
                        <span className="text-xs font-mono font-normal text-zinc-400">
                          em <strong className="text-zinc-200">{secret.repoName}</strong>
                        </span>
                      </h4>
                      <span className="text-xs font-mono text-zinc-400">
                        Arquivo: <code className="text-amber-300">{secret.filePath}</code> (linha {secret.lineNumber})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {repo && (
                      <button
                        onClick={() => onOpenRepoDetails(repo)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1c222e] hover:bg-[#252e3e] text-zinc-200 border border-zinc-700 transition-all"
                      >
                        Ver Repositório & Diff
                      </button>
                    )}
                    <a
                      href={secret.rotationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all flex items-center gap-1.5 shadow"
                    >
                      <span>Painel de Revogação</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Masked value and replacement */}
                  <div className="p-3.5 rounded-xl bg-[#0a0c10] border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="font-mono text-[11px]">Valor Mascarado no Código:</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Seguro contra vazamentos
                      </span>
                    </div>
                    <code className="block p-2 rounded bg-zinc-900 text-rose-300 font-mono text-xs break-all">
                      {secret.maskedValue}
                    </code>

                    <div className="pt-2 text-zinc-400">
                      <span className="font-mono text-[11px]">Substituição Proposta no .env.example:</span>
                      <div className="flex items-center justify-between mt-1 p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono">
                        <span>{secret.envVarProposed}="your_{secret.envVarProposed.toLowerCase()}_here"</span>
                        <button
                          onClick={() => handleCopy(`${secret.envVarProposed}="your_${secret.envVarProposed.toLowerCase()}_here"`, secret.id)}
                          className="text-zinc-400 hover:text-white"
                          title="Copiar linha"
                        >
                          {copiedId === secret.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Step-by-step Revocation Instructions */}
                  <div className="p-3.5 rounded-xl bg-[#0a0c10] border border-zinc-800 space-y-2">
                    <span className="font-mono text-[11px] text-amber-400 font-semibold block">
                      Procedimento Recomendado de Revogação e Rotação:
                    </span>
                    <p className="text-zinc-300 leading-relaxed text-xs">
                      {secret.revocationGuide}
                    </p>
                    <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                      💡 <em>O GitHub Intelligence AI preparou automaticamente o arquivo <code>.env.example</code> e a substituição por <code>process.env.{secret.envVarProposed}</code>.</em>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
