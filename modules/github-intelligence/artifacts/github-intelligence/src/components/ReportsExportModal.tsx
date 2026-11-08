import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  X,
  Shield,
  Sparkles,
  Database,
  Code2,
} from 'lucide-react';
import { api } from '../services/api';
import { RepositoryItem } from '../types';

interface ReportsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  repos: RepositoryItem[];
}

export const ReportsExportModal: React.FC<ReportsExportModalProps> = ({
  isOpen,
  onClose,
  repos,
}) => {
  const [activeReport, setActiveReport] = useState<'AUDIT' | 'SECURITY' | 'MODERNIZATION' | 'JSON' | 'PROMPT'>('AUDIT');
  const [reportsData, setReportsData] = useState<{
    auditReport: string;
    securityReport: string;
    modernizationReport: string;
    portfolioPrompt: string;
    repositoriesJson: RepositoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getConsolidatedReports()
        .then(data => setReportsData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getCurrentText = () => {
    if (!reportsData) return '';
    if (activeReport === 'AUDIT') return reportsData.auditReport;
    if (activeReport === 'SECURITY') return reportsData.securityReport;
    if (activeReport === 'MODERNIZATION') return reportsData.modernizationReport;
    if (activeReport === 'PROMPT') return reportsData.portfolioPrompt;
    if (activeReport === 'JSON') return JSON.stringify(reportsData.repositoriesJson, null, 2);
    return '';
  };

  const getFileName = () => {
    if (activeReport === 'AUDIT') return 'GITHUB_AUDIT_REPORT.md';
    if (activeReport === 'SECURITY') return 'GITHUB_SECURITY_REPORT.md';
    if (activeReport === 'MODERNIZATION') return 'GITHUB_MODERNIZATION_REPORT.md';
    if (activeReport === 'PROMPT') return 'GITHUB_PORTFOLIO_GENERATION_PROMPT.md';
    if (activeReport === 'JSON') return 'GITHUB_REPOSITORIES.json';
    return 'report.txt';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getCurrentText();
    const mime = activeReport === 'JSON' ? 'application/json' : 'text/markdown';
    const blob = new Blob([text], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', getFileName());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#10131b] border border-[#262f3f] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141824] border-b border-[#212837] no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Centro de Relatórios Consolidados
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300">
                  EXPORTAÇÃO SÊNIOR
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Relatórios completos de auditoria, segurança, modernização, JSON estruturado e PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c2331] hover:bg-[#252f42] text-zinc-200 border border-[#2d384e] transition-all flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#a3e635]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={handlePrintPdf}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c2331] hover:bg-[#252f42] text-zinc-200 border border-[#2d384e] transition-all flex items-center gap-1.5"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-300" />
              Imprimir / Salvar PDF
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar {activeReport === 'JSON' ? '.JSON' : '.MD'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-6 bg-[#121620] border-b border-[#212837] overflow-x-auto no-print">
          <button
            onClick={() => setActiveReport('AUDIT')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeReport === 'AUDIT'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            GITHUB_AUDIT_REPORT.md
          </button>
          <button
            onClick={() => setActiveReport('SECURITY')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeReport === 'SECURITY'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            GITHUB_SECURITY_REPORT.md
          </button>
          <button
            onClick={() => setActiveReport('MODERNIZATION')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeReport === 'MODERNIZATION'
                ? 'border-[#a3e635] text-[#a3e635]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            GITHUB_MODERNIZATION_REPORT.md
          </button>
          <button
            onClick={() => setActiveReport('JSON')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeReport === 'JSON'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-4 h-4" />
            GITHUB_REPOSITORIES.json
          </button>
          <button
            onClick={() => setActiveReport('PROMPT')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeReport === 'PROMPT'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            PORTFOLIO_PROMPT.md
          </button>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0c10] print-card">
          {loading ? (
            <div className="p-12 text-center text-zinc-400">Consolidando relatórios da conta...</div>
          ) : (
            <div className="p-4 rounded-xl bg-[#0e1117] border border-zinc-800 font-mono text-xs text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
              {getCurrentText()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141824] border-t border-[#212837] flex items-center justify-between text-xs text-zinc-400 no-print">
          <span>Relatórios prontos para compliance, auditoria técnica e apresentação profissional.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1c2331] hover:bg-[#252f42] text-zinc-300 border border-[#2d384e] transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
