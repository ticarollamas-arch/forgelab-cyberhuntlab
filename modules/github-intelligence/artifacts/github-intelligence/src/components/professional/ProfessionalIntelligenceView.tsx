import React, { useState } from 'react';
import {
  FileText,
  Lightbulb,
  Rocket,
  Github,
} from 'lucide-react';
import { ResumeProfile, GitHubUser, ImplementationPrompt } from '../../types';
import { ResumeProfileCard } from '../ResumeProfileCard';
import { CareerProjectsSection } from './CareerProjectsSection';
import { StartupHackathonSection } from './StartupHackathonSection';
import { GitHubProfileSection } from './GitHubProfileSection';

export type ProfessionalSubSection = 'PROFILE_CONTEXT' | 'CAREER_PROJECTS' | 'STARTUP_HACKATHON' | 'GITHUB_PROFILE';

interface ProfessionalIntelligenceViewProps {
  resume: ResumeProfile | null;
  currentUser: GitHubUser | null;
  onUploadResume: (file: File) => Promise<void>;
  onDeleteResume: () => Promise<void>;
  isUploadingResume: boolean;
  onOpenPromptModal: (prompt: ImplementationPrompt) => void;
}

export const ProfessionalIntelligenceView: React.FC<ProfessionalIntelligenceViewProps> = ({
  resume,
  currentUser,
  onUploadResume,
  onDeleteResume,
  isUploadingResume,
  onOpenPromptModal,
}) => {
  const [activeSection, setActiveSection] = useState<ProfessionalSubSection>('PROFILE_CONTEXT');

  const navButtons = [
    {
      id: 'PROFILE_CONTEXT',
      label: '1. Competências & GitHub',
      icon: FileText,
      description: 'Currículo apenas como contexto para os repositórios',
    },
    {
      id: 'CAREER_PROJECTS',
      label: '2. Ideias de Ferramentas',
      icon: Lightbulb,
      description: 'Projetos baseados na sua carreira',
    },
    {
      id: 'STARTUP_HACKATHON',
      label: '3. Startups e Hackathons',
      icon: Rocket,
      description: 'Laboratório de inovação e competições',
    },
    {
      id: 'GITHUB_PROFILE',
      label: '4. Meu Perfil GitHub',
      icon: Github,
      description: 'README especial do perfil (username/username)',
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Navigation Sub-bar */}
      <div role="tablist" aria-label="Seções de inteligência profissional" className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-[#10131a] p-1.5 rounded-2xl border border-[#212735]">
        {navButtons.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              id={`professional-tab-${item.id}`}
              aria-controls={`professional-panel-${item.id}`}
              onClick={() => setActiveSection(item.id)}
              className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-[#1a2130] border border-[#a3e635]/40 text-white shadow-md'
                  : 'hover:bg-[#151922] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#a3e635]' : 'text-zinc-500'}`} />
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                  {item.label}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 line-clamp-1">
                {item.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-view */}
      {activeSection === 'PROFILE_CONTEXT' && (
        <div role="tabpanel" id="professional-panel-PROFILE_CONTEXT" aria-labelledby="professional-tab-PROFILE_CONTEXT" className="space-y-3">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-zinc-300">
            <strong className="text-white">Uso do currículo:</strong> apenas como contexto privado para comparar competências declaradas com evidências reais dos seus repositórios. Não há criação ou otimização de currículo nesta área.
          </div>
          <ResumeProfileCard resume={resume} onUpload={onUploadResume} onDelete={onDeleteResume} isUploading={isUploadingResume} />
        </div>
      )}

      {activeSection === 'CAREER_PROJECTS' && (
        <div role="tabpanel" id="professional-panel-CAREER_PROJECTS" aria-labelledby="professional-tab-CAREER_PROJECTS"><CareerProjectsSection onOpenPromptModal={onOpenPromptModal} /></div>
      )}

      {activeSection === 'STARTUP_HACKATHON' && (
        <div role="tabpanel" id="professional-panel-STARTUP_HACKATHON" aria-labelledby="professional-tab-STARTUP_HACKATHON"><StartupHackathonSection onOpenPromptModal={onOpenPromptModal} /></div>
      )}

      {activeSection === 'GITHUB_PROFILE' && (
        <div role="tabpanel" id="professional-panel-GITHUB_PROFILE" aria-labelledby="professional-tab-GITHUB_PROFILE"><GitHubProfileSection currentUser={currentUser} /></div>
      )}
    </div>
  );
};
