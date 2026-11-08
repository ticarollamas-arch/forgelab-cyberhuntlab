import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  FolderGit2,
  FileText,
  Lock,
  Settings,
  User as UserIcon,
  Menu,
  X,
  LogOut,
  Github,
  CheckCircle2,
  ChevronDown,
  Briefcase,
  Code2,
  FolderUp,
  Shield,
  Zap,
} from 'lucide-react';
import { GitHubConnectionStatus, GlobalSyncProgress } from '../types';

export type NavTab =
  | 'dashboard'
  | 'intelligence'
  | 'curation'
  | 'repos'
  | 'analysis'
  | 'reports'
  | 'settings'
  | 'hackathons';

interface NavbarProps {
  connection: GitHubConnectionStatus;
  progress: GlobalSyncProgress;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenConnectModal: () => void;
  onDisconnect: () => void;
  onOpenSyncModal: () => void;
  onStartSync: () => void;
  onOpenFolderExporter: () => void;
  reposCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  connection,
  progress,
  activeTab,
  setActiveTab,
  onOpenConnectModal,
  onDisconnect,
  onOpenSyncModal,
  onStartSync,
  onOpenFolderExporter,
  reposCount,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen && !userDropdownOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen, userDropdownOpen]);

  // Full module directory for the Hamburger Drawer
  const menuCategories = [
    {
      title: 'Visão Geral & Governança',
      items: [
        { id: 'dashboard' as NavTab, label: 'Dashboard Geral', icon: Sparkles, desc: 'Indicadores e status' },
      ],
    },
    {
      title: 'Etapa 1 — Currículo primeiro',
      items: [
        { id: 'intelligence' as NavTab, label: 'Currículo & Perfil Profissional', icon: Zap, desc: 'Anexe o currículo e defina o alvo profissional' },
        { id: 'curation' as NavTab, label: 'Etapa 2 — Curadoria dos Repositórios', icon: FolderGit2, desc: 'Avalie relevância, privacidade e melhorias' },
        { id: 'hackathons' as NavTab, label: 'Hackathons & Ideias', icon: Sparkles, desc: 'Pesquisa, hipóteses e plano MVP' },
        { id: 'repos' as NavTab, label: `Repositórios Autorizados (${reposCount})`, icon: FolderGit2, desc: 'Catálogo oficial de código' },
        { id: 'analysis' as NavTab, label: 'Auditoria de Segurança', icon: Shield, desc: 'Saneamento de credenciais' },
        { id: 'reports' as NavTab, label: 'Centro de Relatórios', icon: FileText, desc: 'Exportações consolidadas' },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { id: 'settings' as NavTab, label: 'Configurações da Conta', icon: Settings, desc: 'Tokens e preferências' },
      ],
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0c0e12]/95 backdrop-blur-md border-b border-[#212735]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Hamburger Button + Brand Logo */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Prominent Hamburger Menu Button for Desktop & Mobile */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="platform-navigation-drawer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white bg-[#141822] hover:bg-[#1b2230] border border-[#273041] transition-all cursor-pointer shadow-sm group"
                aria-label="Abrir menu de navegação"
                title="Abrir Menu Completo da Plataforma"
              >
                <Menu className="w-4 h-4 text-[#a3e635] group-hover:scale-110 transition-transform" />
                <span className="font-mono text-zinc-300">Menu</span>
              </button>

              {/* Brand Wordmark */}
              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                className="flex items-center gap-2.5 cursor-pointer group select-none text-left"
                aria-label="GitHub Intelligence — abrir dashboard"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1b222f] to-[#11141b] border border-[#a3e635]/40 flex items-center justify-center shadow-[0_0_12px_rgba(163,230,53,0.15)] group-hover:border-[#a3e635] transition-all">
                  <Sparkles className="w-4 h-4 text-[#a3e635]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base text-white tracking-tight whitespace-nowrap">
                    GitHub Intelligence
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/30 rounded">
                    AI
                  </span>
                </div>
              </button>
            </div>

            {/* Center: Clean, Minimalist Quick Shortcuts (Only 3 essential items) */}
            <nav className="hidden md:flex items-center gap-1 bg-[#121620] p-1 rounded-xl border border-[#212735]">
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#222a38] text-white shadow font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavClick('curation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  activeTab === 'curation'
                    ? 'bg-[#222a38] text-white shadow font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Curadoria
              </button>
            </nav>

            {/* Right: Quick Folder Exporter + GitHub Status + Profile */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Quick Action: Exportar Pasta para o GitHub */}
              <button
                onClick={onOpenFolderExporter}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#141b26] hover:bg-[#1a2332] text-[#a3e635] border border-[#a3e635]/40 hover:border-[#a3e635] transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(163,230,53,0.1)] cursor-pointer"
                title="Exportar Pasta Local para o GitHub"
              >
                <FolderUp className="w-3.5 h-3.5 text-[#a3e635]" />
                <span className="hidden sm:inline">Exportar Pasta</span>
              </button>

              {/* Discrete Connection status badge */}
              <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
                {connection.connected && connection.user ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    @{connection.user.login}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    Desconectado
                  </span>
                )}
              </div>

              {/* User profile button / Dropdown */}
              {connection.connected && connection.user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-label={`Menu da conta @${connection.user.login}`}
                    className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-xl bg-[#141822] hover:bg-[#1d2332] border border-[#232a39] transition-all"
                  >
                    <img
                      src={connection.user.avatarUrl}
                      alt={connection.user.login}
                      className="w-7 h-7 rounded-lg border border-zinc-700 object-cover"
                    />
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#121620] border border-[#273041] rounded-xl shadow-2xl py-2 z-50 text-xs font-mono">
                      <div className="px-4 py-2 border-b border-zinc-800">
                        <p className="font-bold text-white">@{connection.user.login}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{connection.user.name || connection.user.bio}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleNavClick('repos');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#1b2230] text-zinc-300 flex items-center gap-2"
                      >
                        <FolderGit2 className="w-3.5 h-3.5 text-[#a3e635]" />
                        Ver Meus Repositórios ({reposCount})
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenFolderExporter();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#1b2230] text-zinc-300 flex items-center gap-2"
                      >
                        <FolderUp className="w-3.5 h-3.5 text-[#a3e635]" />
                        Exportar Pasta para o GitHub
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleNavClick('settings');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#1b2230] text-zinc-300 flex items-center gap-2"
                      >
                        <Settings className="w-3.5 h-3.5 text-zinc-400" />
                        Configurações da Conta
                      </button>
                      <div className="border-t border-zinc-800 my-1" />
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onDisconnect();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-950/30 text-rose-400 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Desconectar GitHub
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenConnectModal}
                  className="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#181d28] hover:bg-[#222938] text-white border border-[#2b3547] transition-all flex items-center gap-2 shadow"
                >
                  <Github className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Conectar GitHub</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* FULL HAMBURGER SLIDE-OUT DRAWER (FOR DESKTOP & MOBILE) */}
      {/* ============================================================== */}
      {menuOpen && (
          <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu de navegação"
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer container */}
          <div id="platform-navigation-drawer" role="dialog" aria-modal="true" aria-label="Menu da plataforma" className="relative w-full max-w-sm bg-[#10131a] border-r border-[#242c3d] h-full p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-[#212735] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Menu da Plataforma</span>
                    <span className="text-[10px] text-zinc-400 font-mono">GitHub Intelligence AI</span>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Action Button: Exportar Pasta */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#141b26] to-[#12151e] border border-[#a3e635]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FolderUp className="w-4 h-4 text-[#a3e635]" />
                    Exportar Pasta para o GitHub
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#a3e635]/20 text-[#a3e635] font-bold">
                    NOVO
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Envie qualquer projeto ou pasta local diretamente para um repositório no GitHub (público ou privado).
                </p>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenFolderExporter();
                  }}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <FolderUp className="w-3.5 h-3.5" />
                  <span>Iniciar Exportação de Pasta</span>
                </button>
              </div>

              {/* Categorized Navigation List */}
              <div className="space-y-4">
                {menuCategories.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block px-2">
                      {cat.title}
                    </span>
                    <div className="space-y-1">
                      {cat.items.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between group ${
                              isActive
                                ? 'bg-[#1b2333] text-white border border-[#a3e635]/30 shadow'
                                : 'text-zinc-300 hover:bg-[#141822] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  isActive
                                    ? 'bg-[#a3e635]/15 text-[#a3e635]'
                                    : 'bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className={`font-semibold block ${isActive ? 'text-[#a3e635]' : 'text-zinc-200'}`}>
                                  {item.label}
                                </span>
                                <span className="text-[10px] text-zinc-500 block">{item.desc}</span>
                              </div>
                            </div>

                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer footer: Account connection */}
            <div className="pt-4 border-t border-[#212735] space-y-3">
              {connection.connected && connection.user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={connection.user.avatarUrl}
                      alt={connection.user.login}
                      className="w-8 h-8 rounded-lg border border-zinc-700"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">@{connection.user.login}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Conexão Ativa</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDisconnect();
                    }}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30"
                    title="Desconectar"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenConnectModal();
                  }}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-[#a3e635] text-zinc-950 flex items-center justify-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  <span>Conectar GitHub</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
