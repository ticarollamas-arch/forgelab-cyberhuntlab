import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
  Award,
  Target,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { ResumeProfile } from '../types';

interface ResumeProfileCardProps {
  resume: ResumeProfile | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  isUploading: boolean;
}

export const ResumeProfileCard: React.FC<ResumeProfileCardProps> = ({
  resume,
  onUpload,
  onDelete,
  isUploading,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setErrorMsg('');
    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMsg('Por favor, selecione um arquivo no formato PDF, DOCX, TXT ou Markdown.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('O arquivo deve ter no máximo 15MB.');
      return;
    }

    try {
      await onUpload(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar arquivo.');
    }
  };

  return (
    <div className="rounded-2xl bg-[#11141c] border border-[#212735] p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c222e] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635] shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Contexto de competências para o GitHub
              {resume && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/30 font-semibold">
                  CONTEXTO ATIVO
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              O arquivo é usado somente como referência privada para orientar a análise e a documentação dos seus repositórios.
            </p>
          </div>
        </div>

        {resume && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#161a24] hover:bg-[#1e2432] text-zinc-300 border border-[#283244] transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#a3e635] ${isUploading ? 'animate-spin' : ''}`} />
              Substituir
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
      />

      {/* State 1: No Resume Uploaded Yet */}
      {!resume ? (
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[#a3e635] bg-[#a3e635]/5'
              : 'border-[#262f3f] hover:border-[#3b475e] bg-[#0c0f15]'
          }`}
        >
          {isUploading ? (
            <div className="space-y-3">
              <RefreshCw className="w-10 h-10 text-[#a3e635] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-white">Analisando competências do arquivo...</p>
              <p className="text-xs text-zinc-400">Extraindo competências comprovadas e especialidades técnicas.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#161a24] border border-[#273041] flex items-center justify-center mx-auto text-zinc-400">
                <UploadCloud className="w-6 h-6 text-[#a3e635]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Anexe seu currículo como referência (PDF, DOCX, TXT ou Markdown)
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  A IA compara competências declaradas com código e projetos verificáveis para sugerir melhorias no GitHub. O currículo não é reescrito nem publicado.
                </p>
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300">
                Formatos aceitos: PDF, DOCX, TXT (Máx. 15MB)
              </span>
            </div>
          )}
        </div>
      ) : (
        /* State 2: Resume Profile Parsed */
        <div className="space-y-5">
          {/* File summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#0d1017] border border-zinc-800 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <FileText className="w-4 h-4 text-[#a3e635]" />
              <strong className="text-white">{resume.fileName}</strong>
              <span className="text-zinc-500 font-mono">
                ({(resume.fileSize / 1024).toFixed(1)} KB)
              </span>
            </div>
            <span className="text-zinc-400 text-[11px]">
              Analisado em: {new Date(resume.uploadedAt).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Profile Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Candidate & Seniority */}
            <div className="p-4 rounded-xl bg-[#0e1118] border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Profissional & Nível</span>
              <h4 className="text-sm font-bold text-white">{resume.candidateName}</h4>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#a3e635]/15 text-[#a3e635]">
                {resume.seniorityLevel}
              </span>
            </div>

            {/* Specialties */}
            <div className="p-4 rounded-xl bg-[#0e1118] border border-zinc-800 space-y-1 md:col-span-2">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Especialidades Técnicas</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {resume.technicalSpecialties.map((spec, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/40 text-indigo-300 border border-indigo-800/40"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Professional Summary */}
          {resume.summary && (
            <div className="p-4 rounded-xl bg-[#0e1118] border border-zinc-800 text-xs space-y-1.5">
              <span className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#a3e635]" /> Resumo de Posicionamento Técnico
              </span>
              <p className="text-zinc-300 leading-relaxed">{resume.summary}</p>
            </div>
          )}

          {/* Verified Skills & Technologies */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Competências Comprovadas no Documento ({resume.verifiedSkills.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {resume.verifiedSkills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-[#161a24] text-zinc-200 border border-zinc-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-[#0a0c10] border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2">
            <Shield className="w-4 h-4 text-[#a3e635] shrink-0 mt-0.5" />
            <span>
              Uso restrito: O currículo é mantido estritamente para parametrizar o alinhamento técnico dos seus projetos. Ele <strong>nunca é comitado ou publicado</strong> no seu GitHub.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
