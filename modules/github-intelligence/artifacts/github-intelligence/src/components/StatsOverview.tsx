import React from 'react';
import {
  FolderGit2,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Clock,
  Github,
  AlertTriangle,
} from 'lucide-react';
import { GitHubConnectionStatus, GlobalSyncProgress, RepositoryItem } from '../types';

interface StatsOverviewProps {
  connection: GitHubConnectionStatus;
  progress: GlobalSyncProgress;
  repos: RepositoryItem[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  connection,
  progress,
  repos,
}) => {
  const isConnected = connection.connected && connection.user;
  const totalRepos = repos.length;
  const analyzedRepos = repos.filter(r => r.syncStatus === 'COMPLETED').length;
  const improvementsDone = repos.reduce(
    (acc, r) => acc + r.proposedChanges.filter(c => c.status === 'APPLIED_LEVEL_A' || c.status === 'APPROVED' || c.status === 'COMMITTED_PR').length,
    0
  );
  const securityIssuesCount = repos.reduce((acc, r) => acc + r.secrets.length, 0);

  const formatLastSync = (dateStr?: string | null) => {
    if (!dateStr) return 'Ainda não sincronizado';
    const date = new Date(dateStr);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const cards = [
    {
      title: 'Status da Conexão',
      value: isConnected ? `@${connection.user?.login}` : 'Desconectado',
      subtext: isConnected ? `${connection.user?.publicRepos || 0} públicos • ${connection.user?.totalPrivateRepos || 0} privados` : 'Nenhuma conta vinculada',
      icon: Github,
      accent: isConnected ? 'text-emerald-400 border-emerald-500/30' : 'text-zinc-500 border-zinc-800',
      badge: isConnected ? 'ATIVO' : 'OFFLINE',
      badgeColor: isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500',
    },
    {
      title: 'Repositórios Reais',
      value: isConnected ? totalRepos : '—',
      subtext: isConnected ? 'Carregados da API oficial' : 'Conecte para carregar',
      icon: FolderGit2,
      accent: 'text-zinc-300 border-zinc-800',
      badge: isConnected ? 'TOTAL' : 'AGUARDANDO',
      badgeColor: 'bg-zinc-800 text-zinc-400',
    },
    {
      title: 'Repositórios Analisados',
      value: isConnected ? analyzedRepos : '—',
      subtext: isConnected && totalRepos > 0 ? `${Math.round((analyzedRepos / totalRepos) * 100)}% da conta auditada` : 'Pronto para análise',
      icon: CheckCircle2,
      accent: analyzedRepos > 0 ? 'text-[#a3e635] border-[#a3e635]/30' : 'text-zinc-400 border-zinc-800',
      badge: analyzedRepos > 0 ? 'CONCLUÍDO' : 'PENDENTE',
      badgeColor: analyzedRepos > 0 ? 'bg-[#a3e635]/15 text-[#a3e635]' : 'bg-zinc-800 text-zinc-500',
    },
    {
      title: 'Melhorias Realizadas',
      value: isConnected ? improvementsDone : '—',
      subtext: improvementsDone > 0 ? 'READMEs, metadados e .env.example' : 'Nenhuma melhoria aplicada ainda',
      icon: Sparkles,
      accent: improvementsDone > 0 ? 'text-indigo-400 border-indigo-500/30' : 'text-zinc-400 border-zinc-800',
      badge: improvementsDone > 0 ? 'PADRÃO SÊNIOR' : 'NENHUMA',
      badgeColor: improvementsDone > 0 ? 'bg-indigo-500/15 text-indigo-300' : 'bg-zinc-800 text-zinc-500',
    },
    {
      title: 'Segurança & Credenciais',
      value: isConnected ? securityIssuesCount : '—',
      subtext: securityIssuesCount > 0 ? 'Chaves detectadas e mascaradas' : 'Nenhum segredo vulnerável detectado',
      icon: ShieldAlert,
      accent: securityIssuesCount > 0 ? 'text-amber-400 border-amber-500/40' : 'text-emerald-400 border-emerald-500/30',
      badge: securityIssuesCount > 0 ? 'ATENÇÃO' : 'SEGURO',
      badgeColor: securityIssuesCount > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400',
    },
    {
      title: 'Última Sincronização',
      value: isConnected && connection.lastSyncAt ? formatLastSync(connection.lastSyncAt) : 'Pendente',
      subtext: progress.isActive ? 'Sincronização em andamento...' : 'Execução sob demanda',
      icon: Clock,
      accent: 'text-zinc-300 border-zinc-800',
      badge: progress.isActive ? 'EM EXECUÇÃO' : 'HISTÓRICO',
      badgeColor: progress.isActive ? 'bg-[#a3e635]/20 text-[#a3e635] animate-pulse' : 'bg-zinc-800 text-zinc-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {cards.map((card, i) => {
        const IconComponent = card.icon;
        return (
          <div
            key={i}
            className={`p-4 rounded-2xl bg-[#11141c] border ${card.accent} flex flex-col justify-between hover:bg-[#141822] transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-400">{card.title}</span>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <div className="my-1">
              <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
                <IconComponent className="w-5 h-5 opacity-70" />
                <span className="truncate">{card.value}</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 truncate">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
