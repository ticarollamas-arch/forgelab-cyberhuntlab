/**
 * HACKMIND — Compact Top Navigation Header
 */

import React from 'react';
import {
  Cpu,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  ShieldAlert,
  Sparkles,
  Award,
  Layers,
  Users,
  Compass,
  FileText
} from 'lucide-react';

interface HeaderProps {
  currentPhase: number;
  onSelectPhase: (phase: number) => void;
  activeProviderName: string;
  isOnline: boolean;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  hypothesesCount: number;
  hasExecutionPlan: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPhase,
  onSelectPhase,
  activeProviderName,
  isOnline,
  onOpenSettings,
  onOpenExport,
  theme,
  onToggleTheme,
  isMobileMenuOpen,
  onToggleMobileMenu,
  hypothesesCount,
  hasExecutionPlan,
}) => {
  const phases = [
    { id: 1, label: 'Pesquisa', short: 'Pesquisa', icon: Compass },
    { id: 2, label: 'Eng. Reversa', short: 'Reversa', icon: Layers },
    { id: 3, label: `20 Ideias (${hypothesesCount})`, short: 'Ideias', icon: Sparkles },
    { id: 4, label: 'Comitê 6X', short: 'Comitê', icon: Users },
    { id: 5, label: 'Ranking', short: 'Ranking', icon: Award },
    { id: 6, label: 'Originalidade', short: 'Novidade', icon: ShieldAlert },
    { id: 7, label: 'Plano MVP', short: 'Plano', icon: FileText },
  ];

  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-40 border-b transition-colors ${
      isDark ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100' : 'bg-white/95 border-zinc-200 text-zinc-900'
    } backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectPhase(1)}
            className="flex items-center gap-2 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1"
            title="HACKMIND — Winning Idea Engine"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black tracking-tighter text-sm shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              HM
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-wider uppercase flex items-center gap-1.5">
                HACKMIND
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hidden sm:inline-block">
                  v2.4
                </span>
              </span>
              <span className="text-[10px] text-zinc-500 -mt-0.5 hidden md:inline">
                Winning Idea Engine
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Phase Stepper Navigation */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1 text-xs">
          {phases.map((p) => {
            const Icon = p.icon;
            const isActive = currentPhase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPhase(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-zinc-500'}`} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Provider Pill */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-mono transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
            }`}
            title="Configurações de IA (Groq, NVIDIA NIM, Ollama, Motor Local)"
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span className="truncate max-w-[110px]">{activeProviderName.split(' ')[0]}</span>
          </button>

          {/* Export Report Button */}
          <button
            onClick={onOpenExport}
            className={`text-xs px-2.5 py-1.5 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200'
            }`}
            title="Exportar dossiê completo em Markdown"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded-md border transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
            }`}
            aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`p-1.5 rounded-md border transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
            }`}
            aria-label="Configurar Provedores"
            title="Configurar Provedores de IA"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={onToggleMobileMenu}
            className={`lg:hidden p-1.5 rounded-md border transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu de fases'}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className={`lg:hidden border-t px-3 py-3 space-y-1 ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <div className="text-[11px] font-mono text-zinc-500 uppercase px-2 mb-1.5">Fases do Motor</div>
          {phases.map((p) => {
            const Icon = p.icon;
            const isActive = currentPhase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPhase(p.id);
                  onToggleMobileMenu();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDark
                    ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-emerald-500" />
                  <span>{p.label}</span>
                </div>
                {p.id === 7 && hasExecutionPlan && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    Pronto
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-zinc-800/50 mt-2 flex items-center justify-between text-xs px-2 text-zinc-400">
            <span>Provedor Ativo:</span>
            <span className="font-mono text-emerald-400">{activeProviderName}</span>
          </div>
        </div>
      )}
    </header>
  );
};
