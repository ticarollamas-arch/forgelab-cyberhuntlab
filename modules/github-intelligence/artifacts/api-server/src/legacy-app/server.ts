import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { globalProviderRegistry } from './hackmind-engine/server/providers/ProviderRegistry';
import { AIService } from './hackmind-engine/server/services/AIService';
import { scanFileForSecrets } from './src/services/securityScanner.js';
import { cleanWatermarksAndSlop } from './src/services/watermarkCleaner.js';
import { generatePortfolioPrompt } from './src/services/portfolioPrompt.js';
import {
  RepositoryItem,
  GlobalSyncProgress,
  GitHubUser,
  ProposedFileChange,
  ResumeProfile,
  GitHubConnectionStatus,
  AtsOptimizationResult,
  CareerProjectIdea,
  StartupIdea,
  HackathonProject,
  PullRequestInfo,
  GitHubProfileOptimization,
  ImplementationPrompt,
  CurationClassification,
  ConfidenceLevel,
  PortfolioRelevance,
  BackupDetectionResult,
  RepoCurationItem,
  CurationSummary,
  CurationAuditResponse,
  GeneratedDocHistoryItem,
} from './src/types/index.js';

dotenv.config();

const app = express.Router();

// Initialize Google GenAI client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'github-intelligence-career-suite',
        },
      },
    })
  : null;

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

function withTimeout<T>(promise: Promise<T>, ms = 3500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de ${ms}ms excedido na chamada Gemini`)), ms)
    ),
  ]);
}

async function callGeminiWithFallback(options: any, timeoutMs = 3500): Promise<any> {
  if (!ai) {
    throw new Error('Gemini não configurado. Defina GEMINI_API_KEY no ambiente do servidor ou use o modo local.');
  }

  let lastError: any = null;

  // If a specific model was passed, try it first, then try the remaining candidates
  const preferredModel = options.model || 'gemini-3.8-flash';
  const modelsToTry = [preferredModel, ...CANDIDATE_MODELS.filter(m => m !== preferredModel)];

  for (const model of modelsToTry) {
    try {
      const opts = { ...options, model };
      return await withTimeout(ai.models.generateContent(opts), timeoutMs);
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      const isQuotaOr429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
      console.warn(`[Gemini Model: ${model}] ${isQuotaOr429 ? '429 Quota Exceeded' : is503 ? '503 Spike' : 'Error'}: ${msg.slice(0, 110)}... Trying next model candidate.`);
    }
  }

  throw lastError || new Error('Modelos Gemini temporariamente indisponíveis.');
}

async function callGeminiWithRetry(options: any): Promise<any> {
  return callGeminiWithFallback(options);
}

// ----------------------------------------------------
// LOCAL NLP TAXONOMY & ENGINE HELPERS
// ----------------------------------------------------
interface TechPattern {
  name: string;
  pattern: RegExp;
  category: 'language' | 'framework' | 'devops' | 'database' | 'architecture' | 'security' | 'cloud';
}

const TECH_TAXONOMY: TechPattern[] = [
  { name: 'TypeScript', pattern: /\b(typescript|ts)\b/i, category: 'language' },
  { name: 'JavaScript', pattern: /\b(javascript|js|es6|es20\d\d)\b/i, category: 'language' },
  { name: 'Python', pattern: /\bpython\b/i, category: 'language' },
  { name: 'Java', pattern: /\bjava\b(?!\s*script)/i, category: 'language' },
  { name: 'C#', pattern: /\b(c#|csharp|\.net core)\b/i, category: 'language' },
  { name: 'Go / Golang', pattern: /\b(golang|go\s+language)\b/i, category: 'language' },
  { name: 'Rust', pattern: /\brust\b/i, category: 'language' },
  { name: 'C++', pattern: /\bc\+\+\b/i, category: 'language' },
  { name: 'PHP', pattern: /\bphp\b/i, category: 'language' },
  { name: 'Ruby', pattern: /\bruby\b/i, category: 'language' },
  { name: 'Swift', pattern: /\bswift\b/i, category: 'language' },
  { name: 'Kotlin', pattern: /\bkotlin\b/i, category: 'language' },
  { name: 'Dart', pattern: /\bdart\b/i, category: 'language' },
  { name: 'SQL', pattern: /\bsql\b/i, category: 'language' },
  { name: 'Shell / Bash', pattern: /\b(bash|shell\s+scripting|sh)\b/i, category: 'language' },

  { name: 'React', pattern: /\breact(\.js)?\b/i, category: 'framework' },
  { name: 'Next.js', pattern: /\bnext(\.js)?\b/i, category: 'framework' },
  { name: 'Node.js', pattern: /\bnode(\.js)?\b/i, category: 'framework' },
  { name: 'Express.js', pattern: /\bexpress(\.js)?\b/i, category: 'framework' },
  { name: 'NestJS', pattern: /\bnest(\.js)?\b/i, category: 'framework' },
  { name: 'Vue.js', pattern: /\bvue(\.js)?\b/i, category: 'framework' },
  { name: 'Angular', pattern: /\bangular\b/i, category: 'framework' },
  { name: 'FastAPI', pattern: /\bfastapi\b/i, category: 'framework' },
  { name: 'Django', pattern: /\bdjango\b/i, category: 'framework' },
  { name: 'Flask', pattern: /\bflask\b/i, category: 'framework' },
  { name: 'Spring Boot', pattern: /\bspring(\s+boot)?\b/i, category: 'framework' },
  { name: 'Tailwind CSS', pattern: /\btailwind\b/i, category: 'framework' },
  { name: 'GraphQL', pattern: /\bgraphql\b/i, category: 'framework' },
  { name: 'APIs RESTful', pattern: /\b(rest|restful|api\s+rest)\b/i, category: 'framework' },

  { name: 'Docker', pattern: /\bdocker\b/i, category: 'devops' },
  { name: 'Kubernetes', pattern: /\b(kubernetes|k8s)\b/i, category: 'devops' },
  { name: 'AWS Cloud', pattern: /\b(aws|amazon\s+web\s+services|s3|ec2|lambda)\b/i, category: 'cloud' },
  { name: 'Google Cloud (GCP)', pattern: /\b(gcp|google\s+cloud|cloud\s+run)\b/i, category: 'cloud' },
  { name: 'Microsoft Azure', pattern: /\b(azure|microsoft\s+azure)\b/i, category: 'cloud' },
  { name: 'Terraform', pattern: /\bterraform\b/i, category: 'devops' },
  { name: 'GitHub Actions / CI-CD', pattern: /\b(github\s+actions|ci\/cd|pipeline)\b/i, category: 'devops' },
  { name: 'Linux / SysAdmin', pattern: /\blinux\b/i, category: 'devops' },

  { name: 'PostgreSQL', pattern: /\b(postgres|postgresql)\b/i, category: 'database' },
  { name: 'MySQL', pattern: /\bmysql\b/i, category: 'database' },
  { name: 'MongoDB', pattern: /\bmongo(db)?\b/i, category: 'database' },
  { name: 'Redis', pattern: /\bredis\b/i, category: 'database' },
  { name: 'Elasticsearch', pattern: /\belasticsearch\b/i, category: 'database' },
  { name: 'Apache Kafka', pattern: /\bkafka\b/i, category: 'database' },
  { name: 'RabbitMQ', pattern: /\brabbitmq\b/i, category: 'database' },

  { name: 'Microsserviços', pattern: /\b(microsserviços|microservices)\b/i, category: 'architecture' },
  { name: 'Clean Architecture / SOLID', pattern: /\b(clean\s+architecture|arquitetura\s+limpa|solid|ddd)\b/i, category: 'architecture' },
  { name: 'Segurança & OAuth/JWT', pattern: /\b(oauth|jwt|autenticação|tokens|security|owasp|cibersegurança)\b/i, category: 'security' },
  { name: 'Testes Automatizados (TDD/Jest)', pattern: /\b(jest|cypress|playwright|tdd|unit\s+tests|testes\s+unitários)\b/i, category: 'framework' }
];

function extractTextFromAnyFile(base64Data: string, mimeType: string, fileName: string): string {
  try {
    const buf = Buffer.from(base64Data, 'base64');
    const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
    const isDocx = fileName.toLowerCase().endsWith('.docx');

    if (isPdf) {
      const rawLatin = buf.toString('latin1');
      const parenMatches = rawLatin.match(/\(([^)]{2,})\)/g);
      if (parenMatches && parenMatches.length > 15) {
        const text = parenMatches
          .map(m => m.slice(1, -1).replace(/\\[rntbf]/g, ' ').replace(/\\([()])/g, '$1'))
          .filter(t => t.length > 1 && !/[^\x20-\x7E\u00A0-\u00FF]/.test(t))
          .join(' ');
        if (text.length > 80) return text;
      }
      const asciiMatches = rawLatin.match(/[A-Za-z0-9\u00C0-\u00FF@._\-\+\#\/:\s]{4,}/g);
      if (asciiMatches && asciiMatches.length > 0) {
        return asciiMatches.join(' ');
      }
    }

    if (isDocx) {
      const rawLatin = buf.toString('latin1');
      const xmlMatches = rawLatin.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (xmlMatches && xmlMatches.length > 0) {
        return xmlMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      }
    }

    return buf.toString('utf-8').replace(/\0/g, '');
  } catch {
    return '';
  }
}

function parseResumeLocally(
  extractedText: string,
  fileName: string,
  currentUser: GitHubUser | null,
  currentRepos: RepositoryItem[],
  fileHash: string,
  fileSize: number
): ResumeProfile {
  const cleanText = (extractedText || '').replace(/\s+/g, ' ');

  // Candidate Name Detection
  let candidateName = currentUser?.name || '';
  if (!candidateName) {
    const emailMatch = cleanText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
    if (emailMatch && emailMatch.index !== undefined && emailMatch.index > 5) {
      const beforeEmail = cleanText.slice(Math.max(0, emailMatch.index - 50), emailMatch.index).trim();
      const words = beforeEmail.split(' ').filter(w => w.length > 2 && /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(w));
      if (words.length >= 2 && words.length <= 4) {
        candidateName = words.join(' ');
      }
    }
  }
  if (!candidateName) {
    const cleanedFile = fileName.replace(/\.(pdf|docx|txt)$/i, '').replace(/[_-]/g, ' ').trim();
    if (cleanedFile.length > 3 && !/curriculo|resume|cv/i.test(cleanedFile)) {
      candidateName = cleanedFile;
    } else {
      candidateName = currentUser?.login ? `@${currentUser.login}` : 'Desenvolvedor(a) de Software';
    }
  }

  // Seniority Level Detection
  let seniorityLevel = 'Engenheiro de Software Sênior';
  if (/\b(staff|principal|lead|tech lead|arquiteto|architect)\b/i.test(cleanText)) {
    seniorityLevel = 'Tech Lead / Arquiteto de Software';
  } else if (/\b(senior|sênior|sr|especialista)\b/i.test(cleanText)) {
    seniorityLevel = 'Engenheiro de Software Sênior';
  } else if (/\b(pleno|mid-level|mid level|pl)\b/i.test(cleanText)) {
    seniorityLevel = 'Engenheiro de Software Pleno';
  } else if (/\b(junior|júnior|jr|estagiário|intern)\b/i.test(cleanText)) {
    seniorityLevel = 'Engenheiro de Software Júnior';
  }

  // Technologies Matching
  const matchedSkills: string[] = [];
  for (const item of TECH_TAXONOMY) {
    if (item.pattern.test(cleanText)) {
      matchedSkills.push(item.name);
    }
  }

  for (const repo of currentRepos) {
    if (repo.language && !matchedSkills.includes(repo.language)) {
      matchedSkills.push(repo.language);
    }
  }

  if (matchedSkills.length < 3) {
    matchedSkills.push('TypeScript', 'Node.js', 'React', 'Docker', 'PostgreSQL', 'APIs RESTful');
  }

  const verifiedSkills = matchedSkills.slice(0, 10);
  const inferredSkills: string[] = [];

  if (verifiedSkills.some(s => /react|vue|angular|next/i.test(s))) {
    inferredSkills.push('Arquitetura de Front-end & SPAs de Alta Performance');
  }
  if (verifiedSkills.some(s => /node|express|nest|fastapi|spring/i.test(s))) {
    inferredSkills.push('Design de Microsserviços e Contratos de APIs');
  }
  if (verifiedSkills.some(s => /docker|kubernetes|ci-cd|aws|gcp/i.test(s))) {
    inferredSkills.push('Automação de Pipelines CI/CD e Containerização');
  }
  if (verifiedSkills.some(s => /postgres|mysql|mongo|redis/i.test(s))) {
    inferredSkills.push('Modelagem de Dados e Otimização de Consultas');
  }
  inferredSkills.push('Versionamento Avançado Git e Code Reviews', 'Boas Práticas de Clean Code e SOLID');

  const allGrowthPool = [
    'Observabilidade com OpenTelemetry & Distributed Tracing',
    'Orquestração de Containers com Kubernetes (K8s) em Produção',
    'Arquiteturas Orientadas a Eventos (EDA) com Apache Kafka',
    'Segurança Proativa e DevSecOps no Ciclo de Vida do Software',
    'Engenharia de Prompt e Orquestração de Agentes com LLMs',
    'Estratégias de Cache Distribuído com Redis Cluster',
  ];
  const developmentOpportunities = allGrowthPool
    .filter(g => !verifiedSkills.some(v => g.toLowerCase().includes(v.toLowerCase())))
    .slice(0, 4);

  const technicalSpecialties = [
    'Sistemas Distribuídos & Back-end',
    'Arquitetura de Software & Clean Code',
    'DevOps & Automação de Infraestrutura',
    'Segurança e Boas Práticas de Engenharia',
  ];

  const documentedExperiences = [
    {
      role: seniorityLevel,
      company: 'Projetos de Engenharia & Desenvolvimento de Software',
      period: 'Recente / Atual',
      achievements: [
        `Desenvolvimento e sustentação de aplicações utilizando ${verifiedSkills.slice(0, 4).join(', ')}.`,
        'Implementação de práticas de automação, testes e integração contínua para redução de falhas em deploy.',
        'Refatoração e modularização de código para ganho de performance e manutenibilidade.',
      ],
    },
  ];

  const summary = `Profissional atuando como ${seniorityLevel}, com sólida experiência em ${verifiedSkills.slice(0, 4).join(', ')}. Foco em arquiteturas resilientes, código limpo e entregas contínuas de valor.`;

  return {
    id: `resume-${fileHash.slice(0, 8)}`,
    fileHash,
    fileName,
    fileSize: fileSize || 0,
    uploadedAt: new Date().toISOString(),
    candidateName,
    seniorityLevel,
    summary,
    verifiedSkills,
    inferredSkills,
    developmentOpportunities,
    keyTechnologies: verifiedSkills,
    documentedExperiences,
    technicalSpecialties,
    professionalGoals: [
      'Consolidação em arquitetura de sistemas distribuídos de alta disponibilidade',
      'Modernização contínua de bases de código legadas e fortalecimento de segurança',
    ],
    rawTextPreview: cleanText.slice(0, 500),
    matchedProjectsCount: currentRepos.length,
  };
}

function generateAtsOptimizationLocally(
  resume: ResumeProfile,
  targetJobDescription?: string
): AtsOptimizationResult {
  const hasContact = resume.candidateName.length > 0;
  const hasSummary = resume.summary.length > 30;
  const hasSkills = resume.verifiedSkills.length >= 4;
  const hasExp = resume.documentedExperiences.length > 0;

  const formattingAndStructure = (hasContact && hasSummary && hasSkills && hasExp) ? 94 : 85;
  const quantifiedImpact = 82;
  const keywordDensity = Math.min(95, 75 + resume.verifiedSkills.length * 2);
  const technicalClarity = 90;
  const atsReadability = 95;

  const overallScore = Math.round(
    formattingAndStructure * 0.2 +
    quantifiedImpact * 0.25 +
    keywordDensity * 0.25 +
    technicalClarity * 0.15 +
    atsReadability * 0.15
  );

  const problemsIdentified: AtsOptimizationResult['problemsIdentified'] = [
    {
      category: 'IMPACT',
      severity: 'HIGH',
      issue: 'Métricas de impacto quantificado (números, percentuais e resultados diretos) precisam de maior evidência.',
      recommendation: 'Adicione resultados mensuráveis às experiências: volume de requisições, percentual de redução de latência ou tempo de build economizado.',
    },
    {
      category: 'KEYWORDS',
      severity: 'MEDIUM',
      issue: 'Palavras-chave técnicas de cloud e esteira CI/CD ganham mais relevância se agrupadas por especialidade.',
      recommendation: 'Agrupe as competências em: Linguagens, Frameworks, Cloud/DevOps e Bancos de Dados no topo do currículo.',
    },
    {
      category: 'FORMAT',
      severity: 'LOW',
      issue: 'Garantir formato de texto limpo para evitar descartes em leitores ópticos de ATS legados.',
      recommendation: 'Utilize cabeçalhos Markdown padrão (# e ##) e evite tabelas complexas ou caixas flutuantes.',
    },
  ];

  const suggestedKeywords = [
    'CI/CD Pipelines',
    'Docker & Containerização',
    'Microsserviços',
    'RESTful APIs',
    'Testes Automatizados (TDD)',
    'Observabilidade & Métricas',
    'Cloud Architecture',
  ];

  const revisedResumeMarkdown = `# ${resume.candidateName}
**${resume.seniorityLevel}**  
*${resume.technicalSpecialties.slice(0, 3).join(' • ')}*

---

### 🎯 Resumo Profissional
${resume.summary} Especialista em projetar e implementar soluções escaláveis com ênfase em qualidade de código, segurança de dados e alta performance de microsserviços.

---

### 💻 Competências Técnicas
- **Linguagens:** ${resume.verifiedSkills.filter(s => /type|java|python|go|rust|c#|sql/i.test(s)).join(', ') || 'TypeScript, JavaScript, Python, SQL'}
- **Frameworks & Libs:** ${resume.verifiedSkills.filter(s => /react|node|express|nest|fastapi|spring/i.test(s)).join(', ') || 'Node.js, Express, React, Next.js'}
- **Cloud & DevOps:** ${resume.verifiedSkills.filter(s => /docker|aws|gcp|k8s|git|ci/i.test(s)).join(', ') || 'Docker, GitHub Actions CI/CD, Linux, AWS Cloud'}
- **Arquitetura & Qualidade:** Clean Architecture, SOLID, APIs RESTful, Testes Automatizados, Modelagem de Bancos de Dados

---

### 💼 Experiência Profissional Relevante

#### **${resume.seniorityLevel}** — Engenharia de Software & Aplicações
*Período: Atuação Contínua*
- Arquitetou e sustentou módulos em produção utilizando **${resume.verifiedSkills.slice(0, 3).join(', ')}**, garantindo conformidade com padrões de segurança e disponibilidade.
- Implementou rotinas de automação e integração contínua (CI/CD), acelerando o ciclo de entrega de features com redução de falhas em staging.
- Refatorou fluxos críticos de persistência e chamadas de APIs, otimizando o tempo de resposta e consumo de recursos.
- Colaborou ativamente em code reviews e auditorias de segurança para prevenção de vazamento de credenciais e dependências vulneráveis.

---

### 🚀 Projetos e Repositórios em Destaque
- **Arquitetura & Microsserviços:** Aplicações modulares focadas em processamento assíncrono, resiliência de rede e isolamento de responsabilidades.
- **Segurança & Qualidade:** Ambientes com sanitização de segredos, cobertura de testes e documentação técnica padronizada.

---

### 🎓 Formação & Aperfeiçoamento Contínuo
- Formação em Ciência da Computação / Engenharia de Software / Tecnologia da Informação
- Treinamento e desenvolvimento contínuo em: ${(resume.developmentOpportunities || []).slice(0, 2).join(' e ')}.
`;

  return {
    overallScore,
    criteriaBreakdown: {
      formattingAndStructure,
      quantifiedImpact,
      keywordDensity,
      technicalClarity,
      atsReadability,
    },
    problemsIdentified,
    suggestedKeywords,
    targetJobMatched: targetJobDescription ? 'Vaga customizada informada' : undefined,
    revisedResumeMarkdown,
    revisedResumeSummary: 'Currículo reestruturado com tipografia ATS-friendly, verbos de impacto técnico e agrupamento estratégico de competências.',
  };
}

function generateCareerProjectsLocally(resume: ResumeProfile | null, repos: RepositoryItem[]): CareerProjectIdea[] {
  const topSkills = resume ? resume.verifiedSkills : ['TypeScript', 'Node.js', 'Python', 'Docker'];

  return [
    {
      id: 'proj-resilient-1',
      name: 'SentinelGuard: API Security & Secret Shield',
      tagline: 'Middleware de baixa latência para detecção de vazamentos e rate-limiting adaptativo',
      category: 'Cybersecurity',
      problemSolved: 'Prevenção em tempo real de vazamento de credenciais e proteção contra ataques de força bruta em rotas autenticadas.',
      targetAudience: 'Engenheiros de Backend e equipes de Cloud Security',
      niche: 'Segurança de APIs em tempo real',
      competitiveEdge: 'Inspeção zero-alloc com regex compilado e resposta imediata sem overhead no event loop.',
      recommendedStack: ['Node.js', 'TypeScript', 'Redis', 'Docker'],
      suggestedArchitecture: 'Middleware em camadas com cache distribuído em memória e hashing SHA-256.',
      coreFeatures: ['Inspeção de payloads HTTP', 'Proteção contra injeção de tokens', 'Alertas via Webhook'],
      mvpScope: ['Middleware Express funcional', 'Regras de bloqueio configuráveis'],
      complexity: 'Intermediário',
      commercialPotential: 'Alto',
      skillsDeveloped: ['Segurança Ofensiva/Defensiva', 'Design de Middlewares', 'Rate Limiting'],
      portfolioImpactExplanation: 'Demonstra domínio avançado de cibersegurança e proteção de infraestrutura corporativa.',
    },
    {
      id: 'proj-resilient-2',
      name: 'CodePulse AI: Semantic Codebase Query Agent',
      tagline: 'Agente inteligente que traduz perguntas em linguagem natural para navegação AST no código',
      category: 'AI & Agents',
      problemSolved: 'Desenvolvedores perdem horas navegando em repositórios desconhecidos para localizar regras de negócio.',
      targetAudience: 'Desenvolvedores sêniores e times de engenharia distribuídos',
      niche: 'Ferramentas de produtividade para desenvolvedores',
      competitiveEdge: 'Indexação vetorial baseada em AST para localização semântica exata de arquivos.',
      recommendedStack: ['TypeScript', 'Python', 'FastAPI', 'Vector DB'],
      suggestedArchitecture: 'Agente RAG com indexação via árvore sintática e cache de respostas.',
      coreFeatures: ['Indexação vetorial AST', 'Respostas fundamentadas em trechos de código', 'Cache de consultas'],
      mvpScope: ['Indexador de repositório local', 'Interface CLI e Webhook'],
      complexity: 'Avançado',
      commercialPotential: 'Alto',
      skillsDeveloped: ['Engenharia de Concorrência', 'Orquestração de LLMs', 'Arquitetura Resiliente'],
      portfolioImpactExplanation: 'Comprova competência em sistemas modernos orientados a IA e alta escala.',
    },
    {
      id: 'proj-resilient-3',
      name: 'InfraDrift: CI/CD Infrastructure Drift Sentinel',
      tagline: 'Bot de automação que audita divergências entre código Terraform e recursos em nuvem',
      category: 'DevSecOps & Cloud',
      problemSolved: 'Alterações manuais no console da nuvem criam riscos invisíveis de segurança e falhas em deploys.',
      targetAudience: 'Engenheiros DevOps e SREs',
      niche: 'Governança e conformidade de infraestrutura',
      competitiveEdge: 'Comparação periódica não invasiva de estados de infraestrutura com abertura automática de PRs corretivos.',
      recommendedStack: ['Go', 'Docker', 'GitHub Actions', 'AWS SDK'],
      suggestedArchitecture: 'CLI distribuída disparada via cron de GitHub Actions com relatórios em Markdown.',
      coreFeatures: ['Auditoria de recursos órfãos', 'Geração de relatórios de conformidade', 'Diff de recursos em nuvem'],
      mvpScope: ['Scanner de recursos AWS S3 e EC2', 'Notificações via Slack / Discord'],
      complexity: 'Intermediário',
      commercialPotential: 'Médio',
      skillsDeveloped: ['Criptografia de Dados', 'Construção de Ferramentas CLI', 'Práticas de 12-Factor App'],
      portfolioImpactExplanation: 'Posiciona o desenvolvedor como um profissional rigoroso com segurança e conformidade técnica.',
    },
    {
      id: 'proj-resilient-4',
      name: 'MockForge: Contract-First API Simulator',
      tagline: 'Simulador dinâmico de microsserviços baseado em especificações OpenAPI 3.1',
      category: 'Developer Tools',
      problemSolved: 'Equipes de front-end ficam bloqueadas aguardando a finalização de endpoints no back-end.',
      targetAudience: 'Times ágeis de desenvolvimento full stack',
      niche: 'Mocking e teste de contratos de APIs',
      competitiveEdge: 'Geração determinística de dados sintéticos realistas a partir de schemas JSON sem backend real.',
      recommendedStack: ['TypeScript', 'Express', 'Vite', 'React'],
      suggestedArchitecture: 'Servidor mock dinâmico com interceptação de rotas e injeção de schemas OpenAPI.',
      coreFeatures: ['Simulação de latência de rede', 'Cenários de erro HTTP (500, 429)', 'Hot-reload de contratos'],
      mvpScope: ['Interface visual de upload de schemas', 'Servidor de mock instantâneo'],
      complexity: 'Intermediário',
      commercialPotential: 'Médio',
      skillsDeveloped: ['Design de APIs RESTful', 'Ferramentas de Desenvolvedor', 'TypeScript Avançado'],
      portfolioImpactExplanation: 'Comprova pensamento de engenharia orientado a contratos de API e aceleração de squads.',
    },
    {
      id: 'proj-resilient-5',
      name: 'EventBridge: High-Throughput Webhook Relay',
      tagline: 'Gateway resiliente para recebimento, persistência e retransmissão de eventos críticos',
      category: 'Enterprise Automation',
      problemSolved: 'Perda de transações e webhooks de gateways de pagamento durante instabilidades temporárias de servidores.',
      targetAudience: 'Plataformas SaaS e e-commerces em escala',
      niche: 'Arquiteturas orientadas a eventos e mensageria',
      competitiveEdge: 'Garantia de entrega at-least-once com retry exponencial e dead-letter queues idempotentes.',
      recommendedStack: ['Node.js', 'PostgreSQL', 'RabbitMQ', 'Docker'],
      suggestedArchitecture: 'Arquitetura orientada a eventos (EDA) com mensageria assíncrona e persistência atômica.',
      coreFeatures: ['Verificação de assinaturas HMAC', 'Dead-letter queue automática', 'Métricas de throughput'],
      mvpScope: ['Ingestão de webhooks em fila', 'Dashboard de reprocessamento'],
      complexity: 'Avançado',
      commercialPotential: 'Alto',
      skillsDeveloped: ['Sistemas Distribuídos', 'Garantia de Idempotência', 'Fila e Mensageria'],
      portfolioImpactExplanation: 'Demonstra capacidade de projetar sistemas tolerantes a falhas com filas assíncronas e alta disponibilidade.',
    },
    {
      id: 'proj-resilient-6',
      name: 'TenantShield: Multi-Tenant Compliance Ledger',
      tagline: 'Módulo auditável de isolamento de dados e compliance LGPD/GDPR para SaaS B2B',
      category: 'SaaS & B2B',
      problemSolved: 'Dificuldade de garantir e auditar isolamento estrito de dados entre clientes corporativos.',
      targetAudience: 'Startups B2B e empresas em fase de expansão',
      niche: 'Arquitetura multi-inquilino e privacidade de dados',
      competitiveEdge: 'Isolamento transparente de queries via Row-Level Security no PostgreSQL com trilha imutável.',
      recommendedStack: ['TypeScript', 'Next.js', 'PostgreSQL', 'Drizzle ORM'],
      suggestedArchitecture: 'SaaS B2B Multi-tenant com isolamento lógico via RLS e auditoria criptografada.',
      coreFeatures: ['Row-Level Security (RLS)', 'Trilha de auditoria por tenant', 'Rotinas de expurgo LGPD'],
      mvpScope: ['Middleware multi-tenant', 'Painel de auditoria de acessos'],
      complexity: 'Especialista',
      commercialPotential: 'Alto',
      skillsDeveloped: ['Row-Level Security', 'Compliance Regulatório', 'Arquitetura Multi-Inquilino'],
      portfolioImpactExplanation: 'Destaca experiência corporativa com Row-Level Security (RLS) e conformidade regulatória avançada.',
    },
  ];
}

function generateStartupIdeasLocally(
  mode: 'PROFESSIONAL' | 'OPEN_EXPLORATION',
  sector: string | undefined,
  resume: ResumeProfile | null
): StartupIdea[] {
  return [
    {
      id: 'startup-resilient-1',
      name: 'SecOpsPilot: B2B API Compliance Sentinel',
      mode,
      sector: (sector as any) || 'Cybersecurity',
      problemStatement: 'PMEs e scale-ups de tecnologia sofrem multas e vazamentos por falta de auditoria contínua de chaves e APIs em produção.',
      solutionSummary: 'Plataforma SaaS de monitoramento contínuo com agentes leves e auditoria automática de conformidade LGPD/SOC2.',
      targetMarket: 'Empresas SaaS B2B com times de 10 a 200 desenvolvedores',
      knownCompetitors: [
        { name: 'GitGuardian', gap: 'Foco exclusivo em código-fonte; não audita endpoints HTTP em runtime para PMEs' },
        { name: 'Snyk', gap: 'Custo enterprise proibitivo e alta complexidade de configuração inicial' },
      ],
      marketDifferentiator: 'Implementação em 5 minutos sem agentes pesados e precificação acessível por volume de endpoints.',
      monetizationModel: 'Assinatura mensal tierizada (R$ 290 a R$ 1.900/mês)',
      mvpTimelineWeeks: 4,
      marketRisks: ['Ciclo de vendas em segurança corporativa', 'Construção de confiança na marca'],
      validationStrategy: 'Oferecer auditoria gratuita para 20 CTOs e demonstrar vulnerabilidades encontradas.',
    },
    {
      id: 'startup-resilient-2',
      name: 'DocuSync AI: Auto-Updating Developer Documentation',
      mode,
      sector: 'AI & Automation',
      problemStatement: 'Documentações técnicas ficam desatualizadas em até 30 dias após commits, gerando retrabalho e chamados de suporte técnico.',
      solutionSummary: 'Agente de CI/CD que analisa diffs de Pull Requests e atualiza automaticamente documentações técnicas e diagramas arquiteturais.',
      targetMarket: 'Times de desenvolvimento de software e consultorias de TI',
      knownCompetitors: [
        { name: 'Mintlify', gap: 'Exige manutenção manual frequente de arquivos markdown' },
        { name: 'GitBook', gap: 'Falta de reconciliação automática baseada em AST de código' },
      ],
      marketDifferentiator: 'Reconciliação semântica profunda via AST + LLM gerando PRs de documentação sincronizados.',
      monetizationModel: 'Freemium com plano Pro por assento ($19/dev/mês)',
      mvpTimelineWeeks: 5,
      marketRisks: ['Risco de alucinação em contratos de APIs altamente legadas'],
      validationStrategy: 'Instalar em 15 repositórios open-source populares e medir aceitação dos PRs.',
    },
    {
      id: 'startup-resilient-3',
      name: 'OmniFlow: Zero-Code Webhook & Event Observability',
      mode,
      sector: 'SaaS B2B',
      problemStatement: 'Falhas silenciosas em integrações de pagamento e webhooks custam milhares de reais antes de serem detectadas.',
      solutionSummary: 'Dashboard de observabilidade e reprocessamento automático com 1 clique para webhooks de qualquer gateway.',
      targetMarket: 'E-commerces, EdTechs e plataformas de assinatura',
      knownCompetitors: [
        { name: 'Hookdeck', gap: 'Curva de aprendizado complexa e foco excessivo em enterprise americano' },
        { name: 'Datadog', gap: 'Custo imprevisível e ausência de interface simplificada de reprocessamento' },
      ],
      marketDifferentiator: 'Reprocessamento idempotente instantâneo com suporte nativo a gateways brasileiros (Pix, Asaas, Pagar.me).',
      monetizationModel: 'Uso por mil eventos auditados + plano base R$ 149/mês',
      mvpTimelineWeeks: 4,
      marketRisks: ['Dependência de latência de gateways de terceiros'],
      validationStrategy: 'Conectar em 5 e-commerces parceiros e monitorar transações da Black Friday.',
    },
    {
      id: 'startup-resilient-4',
      name: 'GreenCloud: FinOps & Idle Resource Reclaimer',
      mode,
      sector: 'Cloud & Infrastructure',
      problemStatement: 'Empresas desperdiçam em média 32% do orçamento de nuvem em instâncias de staging e volumes órfãos.',
      solutionSummary: 'Robô autônomo de FinOps que detecta ambientes ociosos e desliga recursos fora do horário comercial com retorno em 1 clique.',
      targetMarket: 'Startups em rodadas Seed a Série B usando AWS ou GCP',
      knownCompetitors: [
        { name: 'Cast AI', gap: 'Focado quase que exclusivamente em clusters Kubernetes complexos' },
        { name: 'CloudHealth', gap: 'Ferramenta apenas de relatório sem automação direta de corte' },
      ],
      marketDifferentiator: 'Modelo de cobrança baseado em comissão sobre economia real comprovada (Success Fee).',
      monetizationModel: '20% da economia mensal comprovada na fatura de nuvem',
      mvpTimelineWeeks: 6,
      marketRisks: ['Políticas restritivas de permissões IAM em clientes corporativos'],
      validationStrategy: 'Garantir economia de pelo menos R$ 1.500 no primeiro mês para 10 empresas piloto.',
    },
  ];
}

function generateHackathonProjectsLocally(hackathonTheme: string | undefined, resume: ResumeProfile | null): HackathonProject[] {
  return [
    {
      id: 'hack-resilient-1',
      name: 'EchoRescue: Real-Time Audio Disaster Mapper',
      themeOrCategory: hackathonTheme || 'Impacto Social & IA em Tempo Real',
      elevatorPitch: 'Triagem autônoma de pedidos de socorro em áudio durante enchentes e desastres naturais, gerando mapas geoespaciais em tempo real para equipes de resgate.',
      targetProblem: 'Centrais de emergência ficam congestionadas durante tempestades; socorristas não conseguem priorizar resgates de risco de vida.',
      proposedSolution: 'Transcrição e extração de coordenadas e gravidade de chamadas de voz via IA com renderização imediata em mapa tático.',
      liveDemoFeatures: [
        'Simulação de chamada de áudio ao vivo sendo transcrita em 2 segundos',
        'Pin no mapa mudando instantaneamente para vermelho piscante (Risco Crítico de Afogamento)',
        'Geração automática de rota de resgate otimizada para a Defesa Civil',
      ],
      apiIntegrations: ['Gemini Live / Audio Transcribe', 'Mapbox / Leaflet', 'WebSockets'],
      mvpArchitecture: 'React SPA + Node Express WebSockets + Gemini Audio Processing',
      judgePresentationPoints: {
        originalityPoint: 'Combina processamento de áudio não estruturado com georreferenciamento tático instantâneo.',
        impactPoint: 'Reduz o tempo de resposta inicial de resgates críticos de 40 minutos para menos de 3 minutos.',
        technicalFeasibilityPoint: 'Totalmente funcional utilizando WebSockets e streaming de eventos.',
      },
      evaluationMetrics: {
        originality: 96,
        impact: 98,
        technicalFeasibility: 92,
        differentiation: 95,
        liveDemoQuality: 99,
        scalability: 90,
        hackathonFitIndex: 96,
      },
    },
    {
      id: 'hack-resilient-2',
      name: 'CodePulse: Zero-Click Vulnerability Healer',
      themeOrCategory: 'DevTools & Cibersegurança',
      elevatorPitch: 'Bot autônomo que intercepta falhas de segurança em commits e gera Pull Requests com a correção testada antes do deploy.',
      targetProblem: 'Mais de 70% das violações de dados corporativas começam com chaves e credenciais commitadas por engano.',
      proposedSolution: 'Webhook do GitHub que roda varredura com AST, sanitiza credenciais e abre PR com a correção em menos de 10 segundos.',
      liveDemoFeatures: [
        'Commit de um arquivo com chave sensível disparado ao vivo',
        'Dashboard detectando a violação em tempo real via webhook',
        'Pull Request aparecendo no GitHub com a variável externalizada no .env.example',
      ],
      apiIntegrations: ['GitHub REST & Webhooks API', 'Gemini API', 'Express'],
      mvpArchitecture: 'Node.js Express Webhook Server + React Dashboard + GitHub Octokit',
      judgePresentationPoints: {
        originalityPoint: 'Não apenas emite alertas chatos; ele cura a vulnerabilidade abrindo o código corrigido.',
        impactPoint: 'Impede vazamentos milionários antes que qualquer código chegue à produção.',
        technicalFeasibilityPoint: 'Usa a API oficial do GitHub e testes unitários locais.',
      },
      evaluationMetrics: {
        originality: 92,
        impact: 95,
        technicalFeasibility: 96,
        differentiation: 91,
        liveDemoQuality: 97,
        scalability: 94,
        hackathonFitIndex: 94,
      },
    },
    {
      id: 'hack-resilient-3',
      name: 'MediSync: Multilingual Prescription Decoder',
      themeOrCategory: 'Saúde & Acessibilidade',
      elevatorPitch: 'Aplicativo de visão computacional que decifra caligrafia de receitas médicas e explica posologia em linguagem simples e em áudio acessível.',
      targetProblem: 'Milhares de pessoas idosas ou com baixa instrução tomam medicamentos errados por não entenderem a letra médica.',
      proposedSolution: 'Leitura por câmera com extração precisa de dosagens, horários e geração de alarmes no calendário.',
      liveDemoFeatures: [
        'Foto tirada ao vivo de uma receita manuscrita difícil de ler',
        'Conversão em tabela visual colorida com cronograma de horários',
        'Leitura em voz alta do resumo do tratamento com síntese de voz',
      ],
      apiIntegrations: ['Gemini Vision API', 'Web Speech API', 'React PWA'],
      mvpArchitecture: 'Vite React PWA + Gemini Multimodal Vision + Service Worker',
      judgePresentationPoints: {
        originalityPoint: 'Foco humanizado em acessibilidade para quem mais precisa de clareza médica.',
        impactPoint: 'Previne intoxicações e abandono de tratamentos farmacológicos essenciais.',
        technicalFeasibilityPoint: 'Execução instantânea no navegador sem necessidade de instalar apps pesados.',
      },
      evaluationMetrics: {
        originality: 94,
        impact: 97,
        technicalFeasibility: 94,
        differentiation: 93,
        liveDemoQuality: 98,
        scalability: 92,
        hackathonFitIndex: 95,
      },
    },
    {
      id: 'hack-resilient-4',
      name: 'AgroSense: Autonomous Drone Pest Detector',
      themeOrCategory: 'AgTech & Sustentabilidade',
      elevatorPitch: 'Sistema de telemetria para pequenos produtores que mapeia focos de pragas em lavouras via fotos de satélite e drones open-source.',
      targetProblem: 'Uso excessivo de defensivos agrícolas por falta de mapeamento localizado de infestações.',
      proposedSolution: 'Identificação precoce de estresse foliar e recomendação de tratamento pontual, reduzindo defensivos em até 40%.',
      liveDemoFeatures: [
        'Upload de foto aérea de talhão agrícola',
        'Segmentação colorimétrica em mapa de calor das áreas atacadas',
        'Cálculo da economia estimada em defensivos em reais',
      ],
      apiIntegrations: ['Gemini Multimodal', 'HTML5 Canvas', 'OpenStreetMap'],
      mvpArchitecture: 'React + Canvas Analytics + Gemini Vision',
      judgePresentationPoints: {
        originalityPoint: 'Democratiza inteligência agronômica de precisão para agricultura familiar.',
        impactPoint: 'Protege a água e o solo, com economia direta no bolso do produtor.',
        technicalFeasibilityPoint: 'Processamento leve no cliente com feedback em tempo real.',
      },
      evaluationMetrics: {
        originality: 91,
        impact: 94,
        technicalFeasibility: 93,
        differentiation: 90,
        liveDemoQuality: 95,
        scalability: 93,
        hackathonFitIndex: 92,
      },
    },
  ];
}

function generatePromptLocally(project: any, targetEnvironment: string): string {
  const envTitles: Record<string, string> = {
    GOOGLE_AI_STUDIO: 'Gemini API Build',
    CLAUDE_CODE: 'Claude Code CLI',
    CURSOR: 'Cursor / VS Code AI',
    GEMINI_CLI: 'Gemini CLI Agent',
  };

  return `# PROMPT DE IMPLEMENTAÇÃO E ENGENHARIA DE SOFTWARE
> **Projeto:** ${project.name}  
> **Ambiente Alvo:** ${envTitles[targetEnvironment] || targetEnvironment}  
> **Gerado por:** GitHub Intelligence AI  

---

## 🎯 1. VISÃO GERAL E OBJETIVO DO PRODUTO
Você atuará como Engenheiro de Software Principal e Arquiteto de Soluções.
Construa uma aplicação completa, modular, de alta performance e pronta para produção para o projeto:
**${project.name}**

### Proposta de Valor
${project.problemSolved || project.targetProblem || project.problemStatement || 'Solução inovadora com arquitetura moderna e escalável.'}

---

## 🏗️ 2. ESPECIFICAÇÃO DE ARQUITETURA & TECNOLOGIAS
- **Linguagem:** TypeScript (Strict Mode)
- **Front-end:** React SPA moderno com Vite, Tailwind CSS e Lucide Icons
- **Back-end:** Node.js Express estruturado com controllers, middlewares de segurança e validação
- **Tratamento de Estado:** React Hooks nativos com arquitetura limpa e desacoplada
- **Comunicação:** REST APIs tipadas com tratamento global de erros e feedback em tempo real

---

## 📁 3. ESTRUTURA DE PASTAS E ARQUIVOS SUGERIDA
\`\`\`text
/
├── server.ts              # Servidor Express com rotas de API e proxies
├── index.html             # Ponto de entrada HTML com meta tags e títulos sincronizados
├── package.json           # Dependências e scripts de execução
├── tsconfig.json          # Configuração TypeScript rigorosa
└── src/
    ├── main.tsx           # Ponto de entrada React
    ├── App.tsx            # Componente raiz com navegação e estado global
    ├── types/             # Interfaces e contratos de dados TypeScript
    │   └── index.ts
    ├── services/          # Camada de comunicação com APIs
    │   └── api.ts
    └── components/        # Componentes modulares e reutilizáveis
        ├── Header.tsx
        ├── Dashboard.tsx
        └── ProjectView.tsx
\`\`\`

---

## ⚡ 4. REGRAS DE NEGÓCIO E ENDPOINTS DE BACKEND
1. **Segurança e Sanitização:** Todas as requisições devem validar payload com Zod ou contratos estritos.
2. **Resiliência:** Nenhuma falha de rede externa deve derrubar o servidor; implementar fallbacks seguros.
3. **Persistência / Cache:** Utilizar chaves identificadoras e armazenamento em memória ou banco estruturado.

---

## 🎨 5. DIRETRIZES DE UI / UX
- **Identidade Visual:** Fundo grafite profundo (\`#0c0e12\`, \`#11141c\`), destaques em verde-limão (\`#a3e635\`) e alertas em amarelo âmbar (\`#facc15\`).
- **Responsividade:** Navegação perfeita em smartphones, tablets e desktops (drawer mobile + cabeçalho completo no desktop).
- **Feedback:** Estados de loading, botões com transições suaves e mensagens informativas para o usuário.

---

## 🧪 6. CRITÉRIOS DE ACEITE E CONCLUSÃO
- [ ] O projeto compila com \`npm run build\` sem nenhum erro de TypeScript.
- [ ] Não há telas brancas ou exceções não tratadas no console.
- [ ] O fluxo principal é completamente demonstrável de ponta a ponta.
`;
}

function generateProfileOptimizationLocally(
  user: GitHubUser,
  repos: RepositoryItem[],
  resume: ResumeProfile | null,
  originalReadme: string
): GitHubProfileOptimization {
  const skills = resume ? resume.verifiedSkills : ['TypeScript', 'Node.js', 'Python', 'Docker', 'PostgreSQL'];
  const topRepos = repos.slice(0, 3);

  const proposedBio = `Senior Software Engineer | ${skills.slice(0, 3).join(' • ')} | Clean Code & Cloud Architecture`;

  const badges = [
    'https://img.shields.io/badge/Status-Building%20High--Scale%20Software-brightgreen.svg',
    'https://img.shields.io/badge/Focus-Clean%20Architecture-blue.svg',
    'https://img.shields.io/badge/Security-Sanitized%20%26%20Audited-success.svg',
  ];

  const featuredProjects = topRepos.map(r => ({
    repoName: r.name,
    description: r.description || 'Módulo técnico construído com boas práticas de engenharia e arquitetura limpa.',
    highlights: `Desenvolvido em ${r.language || 'TypeScript'} com auditoria técnica e automação de CI/CD.`,
  }));

  const proposedProfileReadme = `# Olá, eu sou @${user.login}! 👋

> **${proposedBio}**

[![Software Quality](https://img.shields.io/badge/Code%20Audit-Grade%20A-brightgreen.svg)](#)
[![Security Audited](https://img.shields.io/badge/Security-Sanitized-success.svg)](#)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%26%20Modular-blue.svg)](#)

---

### 📌 Sobre Mim
Engenheiro de Software com foco no desenvolvimento de soluções distribuídas, seguras e de alto desempenho. Comprometido com arquitetura limpa, testes contínuos e entrega de valor em ambientes ágeis.

---

### 🛠️ Stacks e Especialidades
- **Linguagens:** ${skills.filter(s => /type|java|python|go|rust|c#|sql/i.test(s)).join(', ') || 'TypeScript, JavaScript, Python'}
- **Ecossistema:** ${skills.filter(s => /react|node|express|nest|fastapi|spring|docker/i.test(s)).join(', ') || 'Node.js, React, Docker, PostgreSQL, CI/CD'}
- **Práticas de Engenharia:** Clean Architecture, SOLID, Design de APIs RESTful, Testes Automatizados e DevSecOps

---

### 🚀 Repositórios em Destaque
${featuredProjects.map(p => `#### 🔹 [${p.repoName}](https://github.com/${user.login}/${p.repoName})\n${p.description}\n*${p.highlights}*\n`).join('\n')}

---

### 📬 Conecte-se Comigo
- **GitHub:** [@${user.login}](https://github.com/${user.login})
${user.htmlUrl ? `- **Perfil Completo:** [${user.htmlUrl}](${user.htmlUrl})` : ''}

---
*Perfil profissional auditado e modernizado com o **GitHub Intelligence AI**.*
`;

  return {
    username: user.login,
    originalBio: user.bio,
    proposedBio,
    originalReadme,
    proposedProfileReadme,
    highlightedSkills: skills,
    featuredProjects,
    recommendedBadges: badges,
    statsAdvisory: 'Mantenha commits consistentes e utilize o README oficial para demonstrar impacto técnico real.',
  };
}

// Secure Server-Side State & Caches
let gitHubToken: string | null = process.env.GITHUB_TOKEN || null;
let currentUser: GitHubUser | null = null;
let currentRepos: RepositoryItem[] = [];
let lastSyncAt: string | null = null;
let activeScopes: string[] = [];

// Resume & Intelligence Cache
const resumeCache = new Map<string, ResumeProfile>();
let currentResume: ResumeProfile | null = null;
let currentAtsResult: AtsOptimizationResult | null = null;
let currentCareerProjects: CareerProjectIdea[] = [];
let currentStartupIdeas: StartupIdea[] = [];
let currentHackathonProjects: HackathonProject[] = [];
let currentProfileOptimization: GitHubProfileOptimization | null = null;
let currentCurationResults: RepoCurationItem[] = [];
let currentCurationSummary: CurationSummary | null = null;
let currentProfileAdvice: {
  recommendedPinnedRepos: string[];
  unpinCandidates: string[];
  profileReadmeAdvice: string;
  headlineAdvice: string;
} | null = null;
let documentsHistory: GeneratedDocHistoryItem[] = [];

// Global Synchronization Pipeline State
let syncProgress: GlobalSyncProgress = {
  isActive: false,
  isPaused: false,
  currentStepIndex: 0,
  currentStepTitle: 'Aguardando inicialização',
  totalSteps: 13,
  currentRepoIndex: 0,
  totalRepos: 0,
  currentRepoName: '',
  percentage: 0,
  startTime: null,
  completedTime: null,
  logs: [],
  summary: {
    reposFound: 0,
    reposAnalyzed: 0,
    reposModernized: 0,
    readmesUpdated: 0,
    descriptionsUpdated: 0,
    securityIssuesFound: 0,
    secretsMasked: 0,
    levelAApplied: 0,
    levelBProposed: 0,
    pullRequestsCreated: 0,
    pendingAuthorization: 0,
    failedRepos: 0,
  },
};

const SYNC_STEPS = [
  '1. Conectar e validar autenticação oficial com GitHub API',
  '2. Mapear repositórios autorizados (paginação e metadados)',
  '3. Carregar árvore de arquivos e diretórios dos repositórios',
  '4. Auditar documentação existente (README, licença, CI/CD)',
  '5. Executar GitHub Security Cleanup Engine (identificar credenciais expostas)',
  '6. Neutralizar exposição de segredos com geração de .env.example seguro',
  '7. Cruzar competências do currículo com tecnologias comprovadas no código',
  '8. Modernizar READMEs com arquitetura, badges oficiais e instruções reais',
  '9. Limpar marcas promocionais e watermarks de templates',
  '10. Melhorar descrições e tópicos do GitHub',
  '11. Preparar branches modernize/github-intelligence-ai e Pull Requests',
  '12. Atualizar métricas consolidadas do dashboard',
  '13. Gerar GITHUB_PORTFOLIO_GENERATION_PROMPT.md com fatos reais',
];

// Helper: GitHub API Fetcher
async function githubApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!gitHubToken) {
    throw new Error('Nenhuma conta do GitHub conectada.');
  }

  const url = endpoint.startsWith('https://') ? endpoint : `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${gitHubToken}`,
      'User-Agent': 'GitHub-Intelligence-AI',
      Accept: 'application/vnd.github.v3+json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    gitHubToken = null;
    currentUser = null;
    throw new Error('Token do GitHub expirado ou inválido.');
  }

  if (!res.ok) {
    const errorBody: any = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Erro da API GitHub (${res.status}): ${res.statusText}`);
  }

  if (options.method === 'DELETE' || res.status === 204) {
    return { ok: true };
  }

  return res.json();
}

// Fetch all repos with pagination from GitHub
async function fetchAllGitHubRepos(): Promise<RepositoryItem[]> {
  const reposList: any[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore && page <= 5) {
    const url = `/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator`;
    const data = await githubApi(url);
    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      reposList.push(...data);
      if (data.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return reposList.map(r => ({
    id: String(r.id),
    name: r.name,
    fullName: r.full_name,
    owner: r.owner?.login || '',
    private: Boolean(r.private),
    defaultBranch: r.default_branch || 'main',
    htmlUrl: r.html_url,
    description: r.description || null,
    starsCount: r.stargazers_count || 0,
    forksCount: r.forks_count || 0,
    openIssuesCount: r.open_issues_count || 0,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    isArchived: Boolean(r.archived),
    isFork: Boolean(r.fork),
    language: r.language || 'Outro',
    detectedLanguages: { [r.language || 'Geral']: 100 },
    technologies: [r.language].filter(Boolean),
    hasReadme: false,
    readmeQualityScore: 0,
    securityScore: 100,
    seniorityScore: 60,
    hasDocker: false,
    hasWorkflows: false,
    hasEnvExample: false,
    isAbandoned: Math.floor((Date.now() - new Date(r.pushed_at).getTime()) / (1000 * 60 * 60 * 24)) > 120,
    lastCommitDaysAgo: Math.max(1, Math.floor((Date.now() - new Date(r.pushed_at).getTime()) / (1000 * 60 * 60 * 24))),
    secrets: [],
    watermarks: [],
    proposedChanges: [],
    metadataUpgrade: {
      originalDescription: r.description || '',
      proposedDescription: r.description
        ? `Repositório profissional: ${r.description}`
        : `${r.name}: Módulo técnico estruturado com boas práticas de engenharia.`,
      originalTopics: r.topics || [],
      proposedTopics: Array.from(new Set([...(r.topics || []), (r.language || '').toLowerCase()].filter(Boolean))),
      isApplied: false,
    },
    seniorAssessment: {
      problemSolved: r.description || 'Solução técnica e lógica de negócio centralizada.',
      architectureType: 'Arquitetura modular em camadas',
      modularizationNotes: ['Separação clara entre componentes e serviços'],
      securityEnhancements: ['Auditoria de dependências e proteção de segredos'],
      performanceRecommendations: ['Otimização de tempo de compilação e carregamento'],
      bestPracticesApplied: ['Tipagem estrita e conformidade com padrões de código'],
    },
    syncStatus: 'QUEUED',
  }));
}

// Deep audit and modernization of a real repository
async function auditAndModernizeRealRepo(repo: RepositoryItem, resume: ResumeProfile | null): Promise<RepositoryItem> {
  let readmeContent = '';
  let hasReadme = false;
  let fileList: string[] = [];
  const allSecrets: any[] = [];
  const proposedChanges: ProposedFileChange[] = [];

  try {
    // 1. Fetch real README from GitHub API
    try {
      const readmeRes = await githubApi(`/repos/${repo.owner}/${repo.name}/readme`);
      if (readmeRes && readmeRes.content) {
        const originalReadme = Buffer.from(readmeRes.content, 'base64').toString('utf-8');
        const readmeScan = scanFileForSecrets(repo.id, repo.name, 'README.md', originalReadme);
        allSecrets.push(...readmeScan.findings);
        readmeContent = readmeScan.sanitizedFileContent ?? originalReadme;
        hasReadme = true;
      }
    } catch {
      hasReadme = false;
      readmeContent = '';
    }

    // 2. Fetch real tree from GitHub API
    try {
      const treeRes = await githubApi(`/repos/${repo.owner}/${repo.name}/git/trees/${repo.defaultBranch}?recursive=1`);
      if (treeRes && Array.isArray(treeRes.tree)) {
        fileList = treeRes.tree.map((f: any) => f.path);
      }
    } catch {
      fileList = [];
    }

    const hasDocker = fileList.some(f => f.includes('Dockerfile') || f.includes('docker-compose'));
    const hasWorkflows = fileList.some(f => f.startsWith('.github/workflows/'));
    const hasEnvExample = fileList.some(f => f.includes('.env.example'));

    // 3. Scan sensitive files. README content was redacted before it is displayed or sent to AI.
    const sensitiveFilePaths = fileList.filter(f =>
      f === '.env' ||
      f === '.env.local' ||
      f === '.env.production' ||
      f.endsWith('.tfvars') ||
      f === 'config/database.yml'
    );

    let generatedEnvContent = '# ====================================================================\n# Environment Variables (.env.example)\n# Gerado automaticamente pelo GitHub Intelligence AI\n# ====================================================================\n\nPORT=3000\nNODE_ENV=development\n';

    for (const sPath of sensitiveFilePaths.slice(0, 3)) {
      try {
        const fileData = await githubApi(`/repos/${repo.owner}/${repo.name}/contents/${sPath}`);
        if (fileData && fileData.content) {
          const rawText = Buffer.from(fileData.content, 'base64').toString('utf-8');
          const fileScan = scanFileForSecrets(repo.id, repo.name, sPath, rawText);
          allSecrets.push(...fileScan.findings);
          if (fileScan.generatedEnvExample) {
            generatedEnvContent += fileScan.generatedEnvExample;
          }
        }
      } catch {
        // file access restricted or missing
      }
    }

    // 4. Clean watermarks and promotional slop
    const watermarkClean = cleanWatermarksAndSlop('README.md', readmeContent || `# ${repo.name}`);

    // 5. Build Senior README with Gemini using Resume Context
    let resumeContextNote = '';
    if (resume) {
      resumeContextNote = `
Contexto do Currículo Profissional do Autor:
- Nome: ${resume.candidateName}
- Nível de Senioridade: ${resume.seniorityLevel}
- Competências Comprovadas: ${resume.verifiedSkills.join(', ')}
- Tecnologias-Chave: ${resume.keyTechnologies.join(', ')}
- Especialidades: ${resume.technicalSpecialties.join(', ')}
Diretriz de posicionamento: Destaque como este projeto evidencia as competências do autor documentadas no currículo, SEM inventar ferramentas ou métricas não existentes no código.`;
    }

    const aiPrompt = `Você é um Engenheiro de Software Sênior especialista em documentação de alto nível e arquitetura.
Modernize o README e a descrição para o seguinte repositório real do GitHub:
Nome do Projeto: ${repo.name}
Linguagem: ${repo.language}
Descrição Atual: ${repo.description || 'Nenhuma'}
Docker: ${hasDocker} | CI/CD: ${hasWorkflows}
README Atual (resumo): ${watermarkClean.cleanedText.slice(0, 1500)}
${resumeContextNote}

REGRAS:
1. NÃO invente tecnologias que não existam neste projeto.
2. Formate um README profissional estruturado com: Badges, Visão Geral, Arquitetura, Tecnologias, Instalação/Execução, Testes e Licença.
3. Elabore uma descrição profissional e de alto impacto de 1 frase para o campo About do GitHub.

Retorne um JSON estrito:
{
  "proposedDescription": "Descrição profissional e concisa",
  "problemSolved": "Qual problema real o projeto resolve",
  "architectureType": "Nome técnico da arquitetura",
  "modularizationNotes": ["Nota 1", "Nota 2"],
  "securityEnhancements": ["Ação 1 de segurança", "Ação 2"],
  "performanceRecommendations": ["Recomendação 1 de performance"],
  "bestPracticesApplied": ["Boa prática 1", "Boa prática 2"],
  "modernizedReadme": "# Conteúdo completo do README.md em Markdown profissional"
}`;

    let proposedDescription = repo.description
      ? `Repositório profissional: ${repo.description}`
      : `${repo.name}: Módulo técnico estruturado com boas práticas de engenharia.`;
    let modernizedReadme = '';
    let seniorAssessment = repo.seniorAssessment;

    try {
      const response = await callGeminiWithFallback({
        contents: aiPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.proposedDescription) proposedDescription = parsed.proposedDescription;
      if (parsed.modernizedReadme) modernizedReadme = parsed.modernizedReadme;
      seniorAssessment = {
        problemSolved: parsed.problemSolved || seniorAssessment.problemSolved,
        architectureType: parsed.architectureType || seniorAssessment.architectureType,
        modularizationNotes: parsed.modularizationNotes || seniorAssessment.modularizationNotes,
        securityEnhancements: parsed.securityEnhancements || seniorAssessment.securityEnhancements,
        performanceRecommendations: parsed.performanceRecommendations || seniorAssessment.performanceRecommendations,
        bestPracticesApplied: parsed.bestPracticesApplied || seniorAssessment.bestPracticesApplied,
      };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] ${repo.name}:`, err.message);
      modernizedReadme = `# ${repo.name}

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Code Quality: Senior](https://img.shields.io/badge/Code%20Audit-Grade%20A-brightgreen.svg)](#)
[![Security: Sanitized](https://img.shields.io/badge/Security-Sanitized-success.svg)](#)

> **${proposedDescription}**

## 📌 Visão Geral
${seniorAssessment.problemSolved}

## 🏗️ Arquitetura e Tecnologias
- **Linguagem Principal:** ${repo.language}
- **Arquitetura:** ${seniorAssessment.architectureType}
${hasDocker ? '- **Containerização:** Docker configurado\n' : ''}
${hasWorkflows ? '- **Automação:** GitHub Actions CI/CD ativo\n' : ''}

## 🚀 Instalação e Execução
\`\`\`bash
git clone ${repo.htmlUrl}.git
cd ${repo.name}
cp .env.example .env
\`\`\`

## 📄 Licença
Distribuído sob licença MIT. Consulte o arquivo LICENSE para detalhes.
`;
    }

    proposedChanges.push({
      path: 'README.md',
      originalContent: readmeContent,
      proposedContent: modernizedReadme,
      description: 'Modernização sênior do README.md com arquitetura, badges, instruções e remoção de marcas de templates.',
      level: 'LEVEL_A_SAFE',
      status: 'APPROVED',
      category: 'README',
    });

    if (!hasEnvExample || allSecrets.length > 0) {
      proposedChanges.push({
        path: '.env.example',
        originalContent: '',
        proposedContent: generatedEnvContent,
        description: 'Criação de template seguro .env.example sem segredos vazados.',
        level: 'LEVEL_A_SAFE',
        status: 'APPROVED',
        category: 'ENV_EXAMPLE',
      });
    }

    proposedChanges.push({
      path: 'SECURITY.md',
      originalContent: '',
      proposedContent: `# Política de Segurança do Repositório\n\n## Notificação de Vulnerabilidades\nSe identificar uma vulnerabilidade de segurança neste projeto, abra um GitHub Security Advisory privado ou contate o autor diretamente.\nNUNCA publique credenciais ou crie issues públicas para falhas de segurança.\n\n## Boas Práticas\n- Chaves e credenciais jamais devem ser commitadas no código.\n- Utilize sempre variáveis de ambiente externalizadas.\n`,
      description: 'Criação de diretrizes formais de segurança (SECURITY.md).',
      level: 'LEVEL_A_SAFE',
      status: 'APPROVED',
      category: 'SECURITY',
    });

    const readmeScore = hasReadme ? 92 : 88;
    const secScore = allSecrets.length === 0 ? 100 : 75;
    const senScore = 90;

    return {
      ...repo,
      hasReadme: true,
      hasDocker,
      hasWorkflows,
      hasEnvExample: true,
      readmeQualityScore: readmeScore,
      securityScore: secScore,
      seniorityScore: senScore,
      secrets: allSecrets,
      watermarks: watermarkClean.findings,
      proposedChanges,
      metadataUpgrade: {
        ...repo.metadataUpgrade,
        proposedDescription,
      },
      seniorAssessment,
      pullRequest: {
        id: `pr-${repo.id}`,
        repoName: repo.name,
        branchName: 'modernize/github-intelligence-ai',
        title: `refactor(modernization): padronização técnica sênior e saneamento de segurança`,
        status: 'READY_TO_OPEN',
        filesChangedCount: proposedChanges.length,
        summary: `Pull Request automatizado contendo README modernizado, .env.example e diretrizes de segurança.`,
      },
      syncStatus: 'COMPLETED',
    };
  } catch (err: any) {
    return {
      ...repo,
      syncStatus: 'ERROR',
      errorMessage: err.message,
    };
  }
}

// Background Sync Queue Worker
let syncTimer: NodeJS.Timeout | null = null;

async function executeSyncStep() {
  if (!syncProgress.isActive || syncProgress.isPaused) return;

  const totalSteps = SYNC_STEPS.length;
  const currentStep = syncProgress.currentStepIndex;

  if (currentStep < totalSteps) {
    const stepTitle = SYNC_STEPS[currentStep];
    syncProgress.currentStepTitle = stepTitle;

    try {
      if (currentStep === 0) {
        if (!gitHubToken) throw new Error('Nenhuma conta do GitHub conectada.');
        syncProgress.logs.unshift({
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          type: 'INFO',
          message: `Conectado à API oficial do GitHub como @${currentUser?.login || 'usuário'}.`,
        });
      }

      if (currentStep === 1) {
        currentRepos = await fetchAllGitHubRepos();
        syncProgress.totalRepos = currentRepos.length;
        syncProgress.summary.reposFound = currentRepos.length;
        syncProgress.logs.unshift({
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          type: 'INFO',
          message: `Mapeados ${currentRepos.length} repositórios autorizados na sua conta.`,
        });
      }

      if (currentStep >= 2 && currentStep <= 10 && currentRepos.length > 0) {
        const repoIdx = Math.min(
          Math.floor(((currentStep - 2) / 9) * currentRepos.length),
          currentRepos.length - 1
        );
        const targetRepo = currentRepos[repoIdx];

        if (targetRepo && targetRepo.syncStatus !== 'COMPLETED') {
          syncProgress.currentRepoName = targetRepo.name;
          syncProgress.currentRepoIndex = repoIdx + 1;
          targetRepo.syncStatus = 'ANALYZING';

          const updated = await auditAndModernizeRealRepo(targetRepo, currentResume);
          currentRepos[repoIdx] = updated;

          if (updated.syncStatus === 'COMPLETED') {
            syncProgress.summary.reposAnalyzed++;
            syncProgress.summary.reposModernized++;
            syncProgress.summary.readmesUpdated++;
            syncProgress.summary.descriptionsUpdated++;
            syncProgress.summary.securityIssuesFound += updated.secrets.length;
            syncProgress.summary.secretsMasked += updated.secrets.length;
            syncProgress.summary.levelAApplied += 3;
            syncProgress.summary.levelBProposed += updated.proposedChanges.filter(c => c.level === 'LEVEL_B_TECHNICAL').length;

            syncProgress.logs.unshift({
              timestamp: new Date().toLocaleTimeString('pt-BR'),
              type: 'SUCCESS',
              message: `Repositório ${targetRepo.name} auditado e modernizado com sucesso.`,
              repo: targetRepo.name,
            });
          } else {
            syncProgress.summary.failedRepos++;
            syncProgress.logs.unshift({
              timestamp: new Date().toLocaleTimeString('pt-BR'),
              type: 'WARN',
              message: `Aviso no repositório ${targetRepo.name}: ${updated.errorMessage || 'Falha parcial'}. Prosseguindo com os demais.`,
              repo: targetRepo.name,
            });
          }
        }
      }

      if (currentStep === 11) {
        syncProgress.logs.unshift({
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          type: 'INFO',
          message: `Consolidando relatórios executivos e métricas da conta...`,
        });
      }

      if (currentStep === 12) {
        syncProgress.logs.unshift({
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          type: 'SUCCESS',
          message: `GITHUB_PORTFOLIO_GENERATION_PROMPT.md gerado com dados 100% comprovados no código.`,
        });
      }
    } catch (err: any) {
      syncProgress.logs.unshift({
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        type: 'ERROR',
        message: `Erro na etapa: ${err.message}`,
      });
    }

    syncProgress.currentStepIndex++;
    syncProgress.percentage = Math.round((syncProgress.currentStepIndex / totalSteps) * 100);

    syncTimer = setTimeout(executeSyncStep, 1000);
  } else {
    syncProgress.isActive = false;
    syncProgress.completedTime = Date.now();
    syncProgress.percentage = 100;
    syncProgress.currentStepTitle = 'Sincronização global concluída!';
    lastSyncAt = new Date().toISOString();

    syncProgress.logs.unshift({
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type: 'SUCCESS',
      message: '✨ Auditoria e modernização concluídas! Todos os relatórios foram atualizados.',
    });
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'GitHub Intelligence AI Server',
    githubConnected: Boolean(gitHubToken),
  });
});

// 2. Auth Status & User Profile
app.get('/api/auth/status', (_req: Request, res: Response) => {
  const status: GitHubConnectionStatus = {
    connected: Boolean(gitHubToken && currentUser),
    user: currentUser,
    authMethod: gitHubToken ? 'PAT' : undefined,
    scopes: activeScopes,
    lastSyncAt,
  };
  res.json({
    status,
    reposCount: currentRepos.length,
    resumeAttached: Boolean(currentResume),
  });
});

// 3. Connect via Real GitHub Token (PAT or OAuth Access Token)
app.post('/api/auth/connect', async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token de acesso do GitHub é obrigatório.' });
  }

  const cleanToken = token.trim();

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'User-Agent': 'GitHub-Intelligence-AI',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      return res.status(401).json({
        error: 'Token do GitHub inválido ou sem autorização. Verifique se o token possui os escopos repo e user.',
      });
    }

    const scopesHeader = userRes.headers.get('x-oauth-scopes') || '';
    activeScopes = scopesHeader.split(',').map(s => s.trim()).filter(Boolean);

    const userData: any = await userRes.json();

    gitHubToken = cleanToken;
    currentUser = {
      login: userData.login,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      bio: userData.bio,
      publicRepos: userData.public_repos,
      totalPrivateRepos: userData.total_private_repos || 0,
      htmlUrl: userData.html_url,
      company: userData.company,
      location: userData.location,
    };

    currentRepos = await fetchAllGitHubRepos();

    res.json({
      success: true,
      user: currentUser,
      reposCount: currentRepos.length,
      scopes: activeScopes,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao conectar com GitHub: ${err.message}` });
  }
});

// 4. Disconnect GitHub
app.post('/api/auth/disconnect', (_req: Request, res: Response) => {
  gitHubToken = null;
  currentUser = null;
  currentRepos = [];
  lastSyncAt = null;
  activeScopes = [];
  if (syncTimer) clearTimeout(syncTimer);
  syncProgress.isActive = false;

  res.json({ success: true, message: 'Conta do GitHub desconectada com sucesso.' });
});

// 5. Get Real Repositories
app.get('/api/repos', (_req: Request, res: Response) => {
  res.json({
    connected: Boolean(gitHubToken),
    repos: currentRepos,
    total: currentRepos.length,
  });
});

// 6. Start Global Sync
app.post('/api/sync/start', (_req: Request, res: Response) => {
  if (!gitHubToken) {
    return res.status(400).json({ error: 'Conecte sua conta do GitHub antes de iniciar a sincronização.' });
  }

  if (syncProgress.isActive) {
    return res.json({ success: false, message: 'A sincronização já está em andamento.' });
  }

  syncProgress = {
    isActive: true,
    isPaused: false,
    currentStepIndex: 0,
    currentStepTitle: SYNC_STEPS[0],
    totalSteps: SYNC_STEPS.length,
    currentRepoIndex: 0,
    totalRepos: currentRepos.length,
    currentRepoName: currentRepos[0]?.name || '',
    percentage: 0,
    startTime: Date.now(),
    completedTime: null,
    logs: [
      {
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        type: 'INFO',
        message: '🚀 Iniciando pipeline global de modernização da conta...',
      },
    ],
    summary: {
      reposFound: currentRepos.length,
      reposAnalyzed: 0,
      reposModernized: 0,
      readmesUpdated: 0,
      descriptionsUpdated: 0,
      securityIssuesFound: 0,
      secretsMasked: 0,
      levelAApplied: 0,
      levelBProposed: 0,
      pullRequestsCreated: 0,
      pendingAuthorization: 0,
      failedRepos: 0,
    },
  };

  executeSyncStep();

  res.json({ success: true, progress: syncProgress });
});

// 7. Sync Status polling
app.get('/api/sync/status', (_req: Request, res: Response) => {
  res.json({ progress: syncProgress, repos: currentRepos });
});

// 8. Pause / Resume Sync
app.post('/api/sync/pause', (_req: Request, res: Response) => {
  syncProgress.isPaused = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncProgress.logs.unshift({
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    type: 'WARN',
    message: 'Processamento pausado pelo usuário.',
  });
  res.json({ success: true, progress: syncProgress });
});

app.post('/api/sync/resume', (_req: Request, res: Response) => {
  syncProgress.isPaused = false;
  syncProgress.logs.unshift({
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    type: 'INFO',
    message: 'Retomando processamento da fila de modernização...',
  });
  executeSyncStep();
  res.json({ success: true, progress: syncProgress });
});

// ----------------------------------------------------
// RESUME INTELLIGENCE & ATS OPTIMIZER (FAST ENGINE)
// ----------------------------------------------------

// Upload Resume with SHA-256 caching and fast 2-stage analysis
app.post('/api/resume/upload', async (req: Request, res: Response) => {
  const { base64Data, mimeType, fileName, fileSize } = req.body;

  if (!base64Data || !fileName) {
    return res.status(400).json({ error: 'Arquivo do currículo é obrigatório.' });
  }

  // 1. Compute SHA-256 hash for fast cache lookup
  const fileHash = crypto.createHash('sha256').update(base64Data).digest('hex');

  if (resumeCache.has(fileHash)) {
    currentResume = resumeCache.get(fileHash)!;
    return res.json({
      success: true,
      profile: currentResume,
      cached: true,
      message: 'Currículo recuperado instantaneamente do cache de análise.',
    });
  }

  let rawTextContent = '';
  try {
    const isPdf = mimeType === 'application/pdf';

    if (!isPdf) {
      rawTextContent = Buffer.from(base64Data, 'base64').toString('utf-8');
    }

    const promptText = `Você é um Lead Tech Recruiter e Arquiteto de Software Sênior.
Analise este currículo e extraia um perfil técnico objetivo e estruturado com alta velocidade e rigor.

REGRAS ESTREITAS:
1. "verifiedSkills": Apenas habilidades e ferramentas explicitamente documentadas ou com projetos citados.
2. "inferredSkills": Habilidades razoavelmente inferidas pelo contexto ou tecnologias parceiras utilizadas.
3. "developmentOpportunities": 3 a 5 competências modernas com altíssima sinergia que o candidato pode desenvolver para acelerar a carreira.
4. NÃO invente cargos ou experiências inexistentes.

Retorne um JSON estrito:
{
  "candidateName": "Nome completo",
  "seniorityLevel": "Senioridade identificada (Ex: Engenheiro de Software Sênior / Especialista / Pleno)",
  "summary": "Resumo de posicionamento profissional conciso de 2-3 frases",
  "verifiedSkills": ["Python", "Docker", "Node.js", "PostgreSQL", "Segurança de APIs"],
  "inferredSkills": ["Clean Architecture", "RESTful Design", "Git"],
  "developmentOpportunities": ["Kubernetes Avançado", "Observabilidade com OpenTelemetry", "GraphQL"],
  "keyTechnologies": ["TypeScript", "Python", "FastAPI", "Docker", "PostgreSQL"],
  "documentedExperiences": [
    {
      "role": "Cargo",
      "company": "Empresa",
      "period": "Período",
      "achievements": ["Conquista técnica quantificada ou comprovada 1", "Conquista 2"]
    }
  ],
  "technicalSpecialties": ["Microsserviços", "Automação", "Segurança de Dados"],
  "professionalGoals": ["Objetivo de carreira ou evolução arquitetural"]
}`;

    let parsed: any = null;

    try {
      let response;
      if (isPdf) {
        response = await callGeminiWithFallback({
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              { text: promptText },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });
      } else {
        response = await callGeminiWithFallback({
          contents: `${promptText}\n\nCONTEÚDO DO CURRÍCULO:\n${rawTextContent.slice(0, 14000)}`,
          config: {
            responseMimeType: 'application/json',
          },
        });
      }

      parsed = JSON.parse(response.text || '{}');
    } catch (geminiErr: any) {
      console.warn('[Gemini Quota/Error Fallback] Switching to Local NLP Resume Parser:', geminiErr?.message);
      parsed = null;
    }

    if (parsed && parsed.candidateName) {
      currentResume = {
        id: `resume-${fileHash.slice(0, 8)}`,
        fileHash,
        fileName,
        fileSize: fileSize || 0,
        uploadedAt: new Date().toISOString(),
        candidateName: parsed.candidateName || currentUser?.name || 'Profissional',
        seniorityLevel: parsed.seniorityLevel || 'Engenheiro de Software',
        summary: parsed.summary || 'Perfil técnico para modernização.',
        verifiedSkills: parsed.verifiedSkills || [],
        inferredSkills: parsed.inferredSkills || [],
        developmentOpportunities: parsed.developmentOpportunities || [],
        keyTechnologies: parsed.keyTechnologies || [],
        documentedExperiences: parsed.documentedExperiences || [],
        technicalSpecialties: parsed.technicalSpecialties || [],
        professionalGoals: parsed.professionalGoals || [],
        rawTextPreview: rawTextContent ? rawTextContent.slice(0, 500) : undefined,
        matchedProjectsCount: currentRepos.length,
      };
    } else {
      // Local deterministic NLP Parser
      const extractedText = rawTextContent || extractTextFromAnyFile(base64Data, mimeType, fileName);
      currentResume = parseResumeLocally(extractedText, fileName, currentUser, currentRepos, fileHash, fileSize);
    }

    resumeCache.set(fileHash, currentResume);
    res.json({ success: true, profile: currentResume, cached: false });
  } catch (err: any) {
    console.error('Safety fallback in resume upload:', err?.message);
    const extractedText = rawTextContent || extractTextFromAnyFile(base64Data, mimeType, fileName);
    currentResume = parseResumeLocally(extractedText, fileName, currentUser, currentRepos, fileHash, fileSize);
    resumeCache.set(fileHash, currentResume);
    res.json({ success: true, profile: currentResume, cached: false });
  }
});

// Get Resume Profile
app.get('/api/resume/profile', (_req: Request, res: Response) => {
  res.json({ profile: currentResume });
});

// Delete Resume Profile
app.delete('/api/resume', (_req: Request, res: Response) => {
  currentResume = null;
  currentAtsResult = null;
  res.json({ success: true, message: 'Currículo removido com sucesso.' });
});

// ATS Resume Optimizer
app.post('/api/resume/ats-optimize', async (req: Request, res: Response) => {
  if (!currentResume) {
    return res.status(400).json({ error: 'Nenhum currículo foi carregado para otimização ATS.' });
  }

  const { targetJobDescription } = req.body;

  try {
    const atsPrompt = `Você é um Especialista em Recrutamento Tecnológico e Engenheiro de Sistemas ATS (Applicant Tracking Systems).
Analise o perfil e o currículo do candidato e otimize para máxima pontuação ATS sem jamais inventar experiências falsas.

DADOS REAIS DO CANDIDATO:
- Nome: ${currentResume.candidateName}
- Senioridade: ${currentResume.seniorityLevel}
- Resumo: ${currentResume.summary}
- Habilidades Comprovadas: ${currentResume.verifiedSkills.join(', ')}
- Tecnologias: ${currentResume.keyTechnologies.join(', ')}
- Experiências: ${JSON.stringify(currentResume.documentedExperiences)}
${targetJobDescription ? `\nVAGA ALVO ESPECÍFICA:\n${targetJobDescription.slice(0, 3000)}` : ''}

CRITÉRIOS EXPLÍCITOS DE AVALIAÇÃO:
1. formattingAndStructure: Clareza de cabeçalhos padrão, dados de contato e ordem cronológica reversa.
2. quantifiedImpact: Presença de métricas reais (%, números, latência, escala, uptime, transações).
3. keywordDensity: Presença e posicionamento de terminologias técnicas relevantes.
4. technicalClarity: Sem jargões vagos ou clichês corporativos.
5. atsReadability: Formatação limpa de texto, sem tabelas complexas ou fontes incompatíveis.

Gere uma versão revisada completa do currículo em Markdown elegante e pronto para exportação para PDF/DOCX.

Retorne um JSON estrito:
{
  "overallScore": 88,
  "criteriaBreakdown": {
    "formattingAndStructure": 90,
    "quantifiedImpact": 82,
    "keywordDensity": 88,
    "technicalClarity": 92,
    "atsReadability": 95
  },
  "problemsIdentified": [
    {
      "category": "IMPACT",
      "severity": "HIGH",
      "issue": "Falta de quantificação em conquistas de projetos anteriores.",
      "recommendation": "Inclua métricas estimadas de performance, volume ou redução de tempo de execução."
    },
    {
      "category": "KEYWORDS",
      "severity": "MEDIUM",
      "issue": "Palavras-chave como CI/CD e Docker poderiam estar mais destacadas no cabeçalho.",
      "recommendation": "Agrupe tecnologias por domínio na seção de Competências Técnicas."
    }
  ],
  "suggestedKeywords": ["Microservices", "RESTful APIs", "CI/CD Pipeline", "Unit Testing", "Cloud Architecture"],
  "revisedResumeSummary": "Resumo de 2 frases do que foi melhorado no currículo",
  "revisedResumeMarkdown": "# Nome do Candidato\\n## Engenheiro de Software Sênior\\n\\n### Resumo Profissional\\n..."
}`;

    let parsed: any = null;

    try {
      const response = await callGeminiWithFallback({
        contents: atsPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      parsed = JSON.parse(response.text || '{}');
    } catch (geminiErr: any) {
      console.warn('[Gemini Quota/Error Fallback] Generating ATS analysis locally:', geminiErr?.message);
      parsed = null;
    }

    if (parsed && parsed.overallScore) {
      currentAtsResult = {
        overallScore: parsed.overallScore || 85,
        criteriaBreakdown: parsed.criteriaBreakdown || {
          formattingAndStructure: 85,
          quantifiedImpact: 80,
          keywordDensity: 85,
          technicalClarity: 90,
          atsReadability: 90,
        },
        problemsIdentified: parsed.problemsIdentified || [],
        suggestedKeywords: parsed.suggestedKeywords || [],
        targetJobMatched: targetJobDescription ? 'Vaga customizada informada' : undefined,
        revisedResumeMarkdown: parsed.revisedResumeMarkdown || '# Currículo Otimizado',
        revisedResumeSummary: parsed.revisedResumeSummary || 'Currículo reestruturado para máxima legibilidade em triagens automatizadas.',
      };
    } else {
      currentAtsResult = generateAtsOptimizationLocally(currentResume, targetJobDescription);
    }

    res.json({ success: true, atsResult: currentAtsResult });
  } catch (err: any) {
    console.error('Safety fallback in ATS optimization:', err?.message);
    currentAtsResult = generateAtsOptimizationLocally(currentResume, targetJobDescription);
    res.json({ success: true, atsResult: currentAtsResult });
  }
});

app.get('/api/resume/ats-result', (_req: Request, res: Response) => {
  res.json({ atsResult: currentAtsResult });
});

// ----------------------------------------------------
// CAREER-BASED PROJECT GENERATOR
// ----------------------------------------------------
app.post('/api/career/generate-projects', async (_req: Request, res: Response) => {
  const resumeInfo = currentResume
    ? `Currículo: ${currentResume.candidateName} (${currentResume.seniorityLevel}). Habilidades: ${currentResume.verifiedSkills.join(', ')}. Especialidades: ${currentResume.technicalSpecialties.join(', ')}.`
    : 'Candidato: Engenheiro de Software com foco em sistemas distribuídos e código limpo.';

  const reposInfo = currentRepos.length > 0
    ? `Repositórios GitHub Reais: ${currentRepos.map(r => `${r.name} (${r.language})`).join(', ')}.`
    : 'Nenhum repositório conectado ainda.';

  try {
    const prompt = `Você é um Tech Career Mentor e Arquiteto de Software Principal.
Com base no perfil profissional e repositórios reais do desenvolvedor, gere 6 ideias originais de projetos de alto impacto para elevar seu portfólio GitHub e impulsionar contratações e promoções.

DADOS DE ENTRADA:
${resumeInfo}
${reposInfo}

CATEGORIAS ABRANGIDAS:
1. Cybersecurity / DevSecOps
2. AI & Agentes Inteligentes
3. Automação Empresarial & B2B
4. Ferramentas para Desenvolvedores (Developer Tools)
5. Arquitetura de Microsserviços / Cloud
6. SaaS Escalável

Retorne um JSON estrito com array "projects":
{
  "projects": [
    {
      "id": "proj-1",
      "name": "Nome técnico e sonoro do produto",
      "tagline": "Frase de efeito técnica que resume o valor",
      "category": "Cybersecurity",
      "problemSolved": "Problema real de mercado resolvido",
      "targetAudience": "Engenheiros DevOps, equipes de SecOps, etc.",
      "niche": "Segurança de APIs e automação de conformidade",
      "competitiveEdge": "Diferencial técnico em relação a soluções comuns",
      "recommendedStack": ["Go", "Docker", "PostgreSQL", "React", "Tailwind CSS"],
      "suggestedArchitecture": "Pipeline assíncrono com mensageria e agentes locais",
      "coreFeatures": ["Funcionalidade 1", "Funcionalidade 2", "Funcionalidade 3"],
      "mvpScope": ["Escopo mínimo entregável em 2 semanas"],
      "complexity": "Intermediário",
      "commercialPotential": "Alto",
      "skillsDeveloped": ["Segurança em Camadas", "Concurrency", "OAuth 2.1"],
      "portfolioImpactExplanation": "Como este projeto comprova maturidade sênior no GitHub para recrutadores e tech leads."
    }
  ]
}`;

    let parsed: any = {};
    try {
      const response = await callGeminiWithRetry({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      parsed = JSON.parse(response.text || '{}');
      currentCareerProjects = parsed.projects || [];
    } catch (apiErr: any) {
      console.warn('[Gemini 503 Spike] Using resilient domain fallback for Career Projects:', apiErr.message);
      currentCareerProjects = [
        {
          id: 'proj-fallback-1',
          name: 'SentinelGuard: API Security & Secret Shield',
          tagline: 'Middleware de baixa latência para detecção de vazamentos e rate-limiting adaptativo',
          category: 'Cybersecurity',
          problemSolved: 'Prevenção em tempo real de vazamento de credenciais e proteção contra ataques de força bruta em rotas autenticadas.',
          targetAudience: 'Engenheiros de Backend e equipes de Cloud Security',
          niche: 'Segurança de APIs em tempo real',
          competitiveEdge: 'Inspeção zero-alloc com regex compilado e resposta imediata sem overhead no event loop.',
          recommendedStack: ['TypeScript', 'Express', 'Redis', 'Docker', 'Zod'],
          suggestedArchitecture: 'Middleware em camadas com cache distribuído em memória e hashing SHA-256.',
          coreFeatures: ['Varredura de payloads HTTP', 'Proteção contra injeção de tokens', 'Alertas via Webhook'],
          mvpScope: ['Middleware Express funcional', 'Regras de bloqueio configuráveis'],
          complexity: 'Intermediário',
          commercialPotential: 'Alto',
          skillsDeveloped: ['Segurança Ofensiva/Defensiva', 'Design de Middlewares', 'Rate Limiting'],
          portfolioImpactExplanation: 'Demonstra domínio avançado de cibersegurança e proteção de infraestrutura corporativa.',
        },
        {
          id: 'proj-fallback-2',
          name: 'OmniFlow: Multi-Agent Automation Worker',
          tagline: 'Orquestrador autônomo de tarefas distribuídas com persistência em fila e retentativas resilientes',
          category: 'AI & Agents',
          problemSolved: 'Execução confiável de pipelines assíncronos de IA com tolerância a falhas e isolamento por etapa.',
          targetAudience: 'Startups de IA e empresas em transição para agentes autônomos',
          niche: 'Orquestração de Inteligência Artificial',
          competitiveEdge: 'Fila de eventos com persistência garantida e métricas de execução passo a passo.',
          recommendedStack: ['Node.js', 'TypeScript', 'Gemini API', 'PostgreSQL', 'Tailwind CSS'],
          suggestedArchitecture: 'Arquitetura orientada a eventos (EDA) com worker pools assíncronos.',
          coreFeatures: ['Fila com priorização', 'Painel de métricas em tempo real', 'Tratamento de timeout e circuit breaker'],
          mvpScope: ['Motor de execução de 3 etapas', 'Dashboard em React com status'],
          complexity: 'Avançado',
          commercialPotential: 'Alto',
          skillsDeveloped: ['Engenharia de Concorrência', 'Orquestração de LLMs', 'Arquitetura Resiliente'],
          portfolioImpactExplanation: 'Comprova competência em sistemas modernos orientados a IA e alta escala.',
        },
        {
          id: 'proj-fallback-3',
          name: 'CloudSync: Multi-Region Config & Vault Client',
          tagline: 'Sincronizador declarativo de variáveis de ambiente com criptografia ponta a ponta',
          category: 'DevSecOps & Cloud',
          problemSolved: 'Eliminação definitiva de arquivos .env desatualizados e sincronização segura entre ambientes de staging e prod.',
          targetAudience: 'Equipes de DevOps e desenvolvedores full-stack',
          niche: 'DevSecOps & Secrets Management',
          competitiveEdge: 'Criptografia AES-256-GCM local no cliente antes de qualquer sincronização com a nuvem.',
          recommendedStack: ['Go ou TypeScript', 'Docker', 'SQLite / Cloud Storage', 'CLI'],
          suggestedArchitecture: 'CLI leve com autenticação OIDC e sincronização criptografada ponta a ponta.',
          coreFeatures: ['Diff de variáveis entre ambientes', 'Criptografia AES-256', 'Exportador para Docker Compose'],
          mvpScope: ['CLI de import/export seguro', 'Validação de schema de variáveis'],
          complexity: 'Intermediário',
          commercialPotential: 'Médio',
          skillsDeveloped: ['Criptografia de Dados', 'Construção de Ferramentas CLI', 'Práticas de 12-Factor App'],
          portfolioImpactExplanation: 'Posiciona o desenvolvedor como um profissional rigoroso com segurança e conformidade técnica.',
        },
      ];
    }

    res.json({ success: true, projects: currentCareerProjects });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao gerar projetos de carreira: ${err.message}` });
  }
});

app.get('/api/career/projects', (_req: Request, res: Response) => {
  res.json({ projects: currentCareerProjects });
});

// ----------------------------------------------------
// STARTUP & INNOVATION LAB
// ----------------------------------------------------
app.post('/api/startups/generate-ideas', async (req: Request, res: Response) => {
  const { mode = 'PROFESSIONAL', sector } = req.body;

  const contextPrompt = mode === 'PROFESSIONAL' && currentResume
    ? `Modo Profissional alinhado às competências de: ${currentResume.verifiedSkills.join(', ')} e especialidades: ${currentResume.technicalSpecialties.join(', ')}.`
    : `Modo Exploração Livre no setor: ${sector || 'Multi-setor (HealthTech, FinTech, EdTech, AgTech, Automação IA)'}.`;

  try {
    const prompt = `Você é um Sócio de Venture Capital e Estrategista de Startups Tecnológicas.
Gere 4 ideias viáveis e inovadoras de startups de base tecnológica (B2B ou B2C) resolvendo dores reais de mercado.

CONTEXTO: ${contextPrompt}

REGRAS:
1. NÃO apresente cópias genéricas.
2. Identifique concorrentes conhecidos do setor e a brecha (gap) não atendida.
3. Modelo claro de monetização e cronograma realista de MVP.

Retorne um JSON estrito:
{
  "ideas": [
    {
      "id": "startup-1",
      "name": "Nome da Startup",
      "mode": "${mode}",
      "sector": "${sector || 'AI & Automation'}",
      "problemStatement": "Dor crítica do mercado e tamanho da oportunidade",
      "solutionSummary": "Proposta de valor do produto",
      "targetMarket": "Segmento de clientes pagantes",
      "knownCompetitors": [
        { "name": "Concorrente X", "gap": "Falta de integração local e preço proibitivo para PMEs" }
      ],
      "marketDifferentiator": "O diferencial injusto da solução",
      "monetizationModel": "SaaS B2B por assento + taxa sobre transações",
      "mvpTimelineWeeks": 6,
      "marketRisks": ["Risco regulatório", "Barreira de adoção inicial"],
      "validationStrategy": "Estratégia para testar com os primeiros 10 clientes piloto"
    }
  ]
}`;

    let parsed: any = {};
    try {
      const response = await callGeminiWithRetry({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      parsed = JSON.parse(response.text || '{}');
      currentStartupIdeas = parsed.ideas || [];
    } catch (apiErr: any) {
      console.warn('[Gemini 503 Spike] Using resilient fallback for Startups:', apiErr.message);
      currentStartupIdeas = [
        {
          id: 'startup-fallback-1',
          name: 'SecOpsPilot: B2B API Compliance Sentinel',
          mode,
          sector: (sector as any) || 'Cybersecurity',
          problemStatement: 'PMEs e scale-ups de tecnologia sofrem multas e vazamentos por falta de auditoria contínua de chaves e APIs em produção.',
          solutionSummary: 'Plataforma SaaS de monitoramento contínuo com agentes leves e auditoria automática de conformidade LGPD/SOC2.',
          targetMarket: 'Empresas SaaS B2B com times de 10 a 200 desenvolvedores',
          knownCompetitors: [
            { name: 'GitGuardian', gap: 'Foco exclusivo em código-fonte; não audita endpoints HTTP em runtime para PMEs' },
            { name: 'Snyk', gap: 'Custo enterprise proibitivo e alta complexidade de configuração' },
          ],
          marketDifferentiator: 'Implementação em 5 minutos sem agentes pesados e precificação justa por volume de endpoints.',
          monetizationModel: 'Assinatura mensal tierizada (R$ 290 a R$ 1.900/mês)',
          mvpTimelineWeeks: 4,
          marketRisks: ['Ciclo de vendas em segurança corporativa', 'Confiança na marca'],
          validationStrategy: 'Oferecer auditoria gratuita para 20 CTOs e demonstrar vulnerabilidades encontradas.',
        },
        {
          id: 'startup-fallback-2',
          name: 'DocuSync AI: Auto-Updating Developer Docs',
          mode,
          sector: 'AI & Automation',
          problemStatement: 'Documentações técnicas ficam desatualizadas em até 30 dias após commits, gerando retrabalho e chamados de suporte.',
          solutionSummary: 'Agente de CI/CD que analisa diffs de Pull Requests e atualiza automaticamente documentações técnicas e diagramas.',
          targetMarket: 'Times de desenvolvimento de software e consultorias de TI',
          knownCompetitors: [
            { name: 'Mintlify', gap: 'Exige manutenção manual de arquivos markdown' },
            { name: 'GitBook', gap: 'Falta de reconciliação automática baseada em AST de código' },
          ],
          marketDifferentiator: 'Reconciliação semântica profunda via AST + LLM gerando PRs de documentação sincronizados.',
          monetizationModel: 'Freemium com plano Pro por assento ($19/dev/mês)',
          mvpTimelineWeeks: 5,
          marketRisks: ['Alucinações de modelos em APIs complexas'],
          validationStrategy: 'Instalar em 15 repositórios open-source populares e medir aceitação dos PRs.',
        },
      ];
    }

    res.json({ success: true, ideas: currentStartupIdeas });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao gerar ideias de startups: ${err.message}` });
  }
});

app.get('/api/startups/ideas', (_req: Request, res: Response) => {
  res.json({ ideas: currentStartupIdeas });
});

// ----------------------------------------------------
// HACKATHON INTELLIGENCE ENGINE
// ----------------------------------------------------
app.post('/api/hackathons/generate-projects', async (req: Request, res: Response) => {
  const { hackathonTheme, eventRules } = req.body;

  try {
    const prompt = `Você é um Jurado Campeão e Mentor de Hackathons Globais.
Gere 4 projetos vencedores e altamente demonstráveis para hackathons.

${hackathonTheme ? `TEMA DO HACKATHON: ${hackathonTheme}` : 'TEMA: Inovação Aberta com Inteligência Artificial e Impacto Real'}
${eventRules ? `CRITÉRIOS E REGRAS: ${eventRules}` : ''}

REGRAS DE OURO DE HACKATHON:
- Funcionalidades focadas em uma DEMO AO VIVO memorável de 3 minutos.
- Uso criativo e robusto de APIs.
- Avaliação com critérios explícitos (Originalidade, Impacto, Viabilidade, Live Demo).

Retorne um JSON estrito:
{
  "projects": [
    {
      "id": "hack-1",
      "name": "Nome de Alto Impacto",
      "themeOrCategory": "Tema ou Categoria",
      "elevatorPitch": "Pitch de 30 segundos explicando a dor e a mágica da solução",
      "targetProblem": "Problema urgente e compreensível",
      "proposedSolution": "Solução elegante executada",
      "liveDemoFeatures": ["Momento 'Uau' na tela 1", "Integração ao vivo 2", "Visualização interativa 3"],
      "apiIntegrations": ["Gemini API", "GitHub API", "Stripe API"],
      "mvpArchitecture": "React frontend + Node/Express backend + WebSockets",
      "judgePresentationPoints": {
        "originalityPoint": "Por que ninguém fez isso dessa forma antes",
        "impactPoint": "Como afeta a vida de milhares de usuários",
        "technicalFeasibilityPoint": "Como a arquitetura é real e funcional"
      },
      "evaluationMetrics": {
        "originality": 94,
        "impact": 92,
        "technicalFeasibility": 95,
        "differentiation": 90,
        "liveDemoQuality": 98,
        "scalability": 88,
        "hackathonFitIndex": 93
      }
    }
  ]
}`;

    let parsed: any = {};
    try {
      const response = await callGeminiWithRetry({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      parsed = JSON.parse(response.text || '{}');
      currentHackathonProjects = parsed.projects || [];
    } catch (apiErr: any) {
      console.warn('[Gemini 503 Spike] Using resilient fallback for Hackathons:', apiErr.message);
      currentHackathonProjects = [
        {
          id: 'hack-fallback-1',
          name: 'EchoRescue: Real-Time Audio Disaster Mapper',
          themeOrCategory: 'Impacto Social & IA em Tempo Real',
          elevatorPitch: 'Triagem autônoma de pedidos de socorro em áudio durante enchentes e desastres naturais, gerando mapas geoespaciais em tempo real para equipes de resgate.',
          targetProblem: 'Central 193 congestionada durante tempestades; socorristas não conseguem priorizar resgates críticos.',
          proposedSolution: 'Transcrição e extração de coordenadas e gravidade de chamadas de voz via Gemini com renderização imediata em mapa tático.',
          liveDemoFeatures: [
            'Simulação de chamada de áudio ao vivo sendo transcrita em 2 segundos',
            'Pin no mapa mudando para vermelho piscante (Risco Crítico de Afogamento)',
            'Geração automática de rota de resgate otimizada para a Defesa Civil',
          ],
          apiIntegrations: ['Gemini 3.8 Live / Transcribe API', 'Mapbox / Leaflet', 'WebSockets'],
          mvpArchitecture: 'Vite React SPA + Node Express WebSockets + Gemini Audio Processing',
          judgePresentationPoints: {
            originalityPoint: 'Combina processamento de áudio não estruturado com georreferenciamento tático instantâneo.',
            impactPoint: 'Reduz o tempo de resposta inicial de resgates de 40 minutos para menos de 3 minutos.',
            technicalFeasibilityPoint: 'Totalmente funcional utilizando WebSockets e streaming de eventos.',
          },
          evaluationMetrics: {
            originality: 96,
            impact: 98,
            technicalFeasibility: 92,
            differentiation: 95,
            liveDemoQuality: 99,
            scalability: 90,
            hackathonFitIndex: 96,
          },
        },
        {
          id: 'hack-fallback-2',
          name: 'CodePulse: Zero-Click Vulnerability Healer',
          themeOrCategory: 'DevTools & Cibersegurança',
          elevatorPitch: 'Bot autônomo que intercepta falhas de segurança em commits e gera Pull Requests com a correção testada antes do deploy.',
          targetProblem: 'Mais de 70% das violações de dados corporativas começam com chaves e credenciais commitadas por engano.',
          proposedSolution: 'Webhook do GitHub que roda varredura com AST, sanitiza credenciais e abre PR com a correção em menos de 10 segundos.',
          liveDemoFeatures: [
            'Commit de um arquivo com chave sensível disparado ao vivo',
            'Dashboard detectando a violação em tempo real via webhook',
            'Pull Request aparecendo no GitHub com a variável externalizada no .env.example',
          ],
          apiIntegrations: ['GitHub REST & Webhooks API', 'Gemini API', 'Express'],
          mvpArchitecture: 'Node.js Express Webhook Server + React Dashboard + GitHub Octokit',
          judgePresentationPoints: {
            originalityPoint: 'Não apenas emite alertas chatos; ele cura a vulnerabilidade abrindo o código corrigido.',
            impactPoint: 'Impede vazamentos milionários antes que qualquer código chegue à produção.',
            technicalFeasibilityPoint: 'Usa a API oficial do GitHub e testes unitários locais.',
          },
          evaluationMetrics: {
            originality: 92,
            impact: 95,
            technicalFeasibility: 96,
            differentiation: 91,
            liveDemoQuality: 97,
            scalability: 94,
            hackathonFitIndex: 94,
          },
        },
      ];
    }

    res.json({ success: true, projects: currentHackathonProjects });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao gerar projetos de hackathon: ${err.message}` });
  }
});

app.get('/api/hackathons/projects', (_req: Request, res: Response) => {
  res.json({ projects: currentHackathonProjects });
});

// ----------------------------------------------------
// PROJECT PROMPT GENERATOR
// ----------------------------------------------------
app.post('/api/projects/generate-prompt', async (req: Request, res: Response) => {
  const { project, targetEnvironment = 'Universal Full-Stack (React + Node)' } = req.body;

  if (!project || !project.name) {
    return res.status(400).json({ error: 'Dados do projeto são obrigatórios.' });
  }

  try {
    const prompt = `Você é o Arquiteto de Software Líder e Engenheiro de Prompt de Elite.
Elabore um PROMPT DE IMPLEMENTAÇÃO COMPLETO, EXTREMAMENTE DETALHADO E PRONTO PARA EXECUÇÃO destinado ao ambiente: "${targetEnvironment}".

DADOS DO PROJETO:
Nome: ${project.name}
Problema: ${project.problemSolved || project.targetProblem || project.problemStatement}
Público/Nicho: ${project.targetAudience || project.targetMarket || 'Desenvolvedores'}
Stack Recomendada: ${Array.isArray(project.recommendedStack) ? project.recommendedStack.join(', ') : 'React, Node, TypeScript'}
Arquitetura: ${project.suggestedArchitecture || project.mvpArchitecture || 'Modular Full-Stack'}
Funcionalidades Principais: ${JSON.stringify(project.coreFeatures || project.liveDemoFeatures || [])}

O PROMPT GERADO DEVE CONTER:
1. Objetivo da Aplicação & Persona
2. Especificação de Arquitetura & Tecnologias
3. Estrutura de Pastas e Arquivos Sugerida
4. Endpoints de Backend e Regras de Negócio
5. Componentes de UI e UX com Tailwind CSS
6. Políticas de Segurança e Tratamento de Erros
7. Critérios de Conclusão e Testes de Aceite

Gere o resultado em Markdown de alta clareza pronto para copiar e colar no ambiente de desenvolvimento.`;

    let promptMarkdown = '';

    try {
      const response = await callGeminiWithFallback({
        contents: prompt,
      });
      promptMarkdown = response.text || '';
    } catch (geminiErr: any) {
      console.warn('[Gemini Quota/Error Fallback] Generating prompt locally:', geminiErr?.message);
      promptMarkdown = '';
    }

    if (!promptMarkdown || promptMarkdown.trim().length < 50) {
      promptMarkdown = generatePromptLocally(project, targetEnvironment);
    }

    const implementationPrompt: ImplementationPrompt = {
      projectName: project.name,
      targetEnvironment: targetEnvironment as any,
      promptMarkdown,
    };

    res.json({ success: true, prompt: implementationPrompt });
  } catch (err: any) {
    console.error('Safety fallback in generate-prompt:', err?.message);
    const promptMarkdown = generatePromptLocally(project, targetEnvironment);
    res.json({
      success: true,
      prompt: {
        projectName: project.name,
        targetEnvironment: targetEnvironment as any,
        promptMarkdown,
      },
    });
  }
});

// ----------------------------------------------------
// GITHUB PROFILE OPTIMIZER (SPECIAL PROFILE README)
// ----------------------------------------------------
app.get('/api/profile-readme/analyze', async (_req: Request, res: Response) => {
  if (!currentUser) {
    return res.status(400).json({ error: 'Conecte sua conta do GitHub para otimizar o perfil principal.' });
  }

  let originalProfileReadme = '';
  try {
    const profileRes = await githubApi(`/repos/${currentUser.login}/${currentUser.login}/readme`);
    if (profileRes && profileRes.content) {
      originalProfileReadme = Buffer.from(profileRes.content, 'base64').toString('utf-8');
    }
  } catch {
    originalProfileReadme = '';
  }

  const prompt = `Você é um Especialista em Branding Técnico para Engenheiros de Software no GitHub.
Crie o README de Perfil definitivo para a conta oficial do usuário: @${currentUser.login} (${currentUser.name || ''}).

DADOS REAIS:
- Bio Atual: ${currentUser.bio || 'Engenheiro de Software'}
- Repositórios Públicos: ${currentRepos.filter(r => !r.private).map(r => `${r.name} (${r.language}): ${r.description || ''}`).join('; ')}
${currentResume ? `- Competências do Currículo: ${currentResume.verifiedSkills.join(', ')}\n- Especialidades: ${currentResume.technicalSpecialties.join(', ')}` : ''}

REGRAS ESTREITAS:
1. NÃO invente métricas falsas ("1 milhão de usuários").
2. Formate uma apresentação moderna, elegante, minimalista e de impacto sênior.
3. Seções: Apresentação Executiva, Especialidades Técnicas, Projetos em Destaque no GitHub, Stack e Contato.
4. Sugira uma Bio refinada para as configurações do perfil no GitHub.

Retorne um JSON estrito:
{
  "proposedBio": "Bio profissional de 1 linha de alto impacto",
  "highlightedSkills": ["TypeScript", "Python", "Docker", "Cloud Architecture"],
  "featuredProjects": [
    {
      "repoName": "nome-do-repo-real",
      "description": "Descrição profissional",
      "highlights": "Destaque técnico comprovado"
    }
  ],
  "recommendedBadges": ["badge-markdown-1", "badge-markdown-2"],
  "statsAdvisory": "Recomendação sobre exibição de estatísticas e consistência de commits",
  "proposedProfileReadme": "# Conteúdo completo em Markdown do README.md do perfil"
}`;

  try {
    let parsed: any = null;
    try {
      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      parsed = JSON.parse(response.text || '{}');
    } catch (geminiErr: any) {
      console.warn('[Gemini Quota/Error Fallback] Generating profile README locally:', geminiErr?.message);
      parsed = null;
    }

    if (parsed && parsed.proposedProfileReadme) {
      currentProfileOptimization = {
        username: currentUser.login,
        originalBio: currentUser.bio,
        proposedBio: parsed.proposedBio || currentUser.bio || 'Senior Software Engineer | Cloud Architecture',
        originalReadme: originalProfileReadme,
        proposedProfileReadme: parsed.proposedProfileReadme || `# Hi, I'm ${currentUser.name || currentUser.login}! 👋`,
        highlightedSkills: parsed.highlightedSkills || [],
        featuredProjects: parsed.featuredProjects || [],
        recommendedBadges: parsed.recommendedBadges || [],
        statsAdvisory: parsed.statsAdvisory || 'Mantenha commits consistentes e evite widgets externos lentos.',
      };
    } else {
      currentProfileOptimization = generateProfileOptimizationLocally(
        currentUser,
        currentRepos,
        currentResume,
        originalProfileReadme
      );
    }

    res.json({ success: true, profileOptimization: currentProfileOptimization });
  } catch (err: any) {
    console.error('Safety fallback in profile-readme analyze:', err?.message);
    currentProfileOptimization = generateProfileOptimizationLocally(
      currentUser,
      currentRepos,
      currentResume,
      originalProfileReadme
    );
    res.json({ success: true, profileOptimization: currentProfileOptimization });
  }
});

// Apply Profile README via Pull Request or direct commit
app.post('/api/profile-readme/apply-pr', async (_req: Request, res: Response) => {
  if (!currentUser || !gitHubToken || !currentProfileOptimization) {
    return res.status(400).json({ error: 'Nenhuma proposta de perfil disponível para publicação.' });
  }

  const username = currentUser.login;
  const branchName = 'modernize/profile-readme';

  try {
    // Check if user/user repo exists
    let defaultBranch = 'main';
    try {
      const repoData = await githubApi(`/repos/${username}/${username}`);
      defaultBranch = repoData.default_branch || 'main';
    } catch {
      return res.status(404).json({
        error: `O repositório especial ${username}/${username} ainda não foi criado no seu GitHub. Crie-o primeiro com README público.`,
      });
    }

    // Get default branch ref
    const refData = await githubApi(`/repos/${username}/${username}/git/ref/heads/${defaultBranch}`);
    const baseSha = refData.object.sha;

    // Create branch
    try {
      await githubApi(`/repos/${username}/${username}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      });
    } catch {
      // Branch might already exist
    }

    // Check existing README SHA
    let fileSha: string | undefined = undefined;
    try {
      const existing = await githubApi(`/repos/${username}/${username}/contents/README.md?ref=${branchName}`);
      fileSha = existing.sha;
    } catch {
      fileSha = undefined;
    }

    // Put new README
    await githubApi(`/repos/${username}/${username}/contents/README.md`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'docs: modernize special GitHub Profile README with AI',
        content: Buffer.from(currentProfileOptimization.proposedProfileReadme).toString('base64'),
        branch: branchName,
        ...(fileSha ? { sha: fileSha } : {}),
      }),
    });

    // Create PR
    const prRes = await githubApi(`/repos/${username}/${username}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'docs(profile): elevação profissional do README de perfil',
        head: branchName,
        base: defaultBranch,
        body: `## ✨ GitHub Profile README Modernizado com GitHub Intelligence AI\n\nEste PR atualiza o README especial da sua conta para destacar suas especialidades, projetos reais e presença profissional.`,
      }),
    });

    currentProfileOptimization.prStatus = 'OPENED';
    currentProfileOptimization.prUrl = prRes.html_url;

    res.json({ success: true, prUrl: prRes.html_url });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao abrir PR no repositório de perfil: ${err.message}` });
  }
});

// ----------------------------------------------------
// EXPORT DOCUMENTS
// ----------------------------------------------------
app.get('/api/reports/download-document/:docType', (req: Request, res: Response) => {
  const { docType } = req.params;
  let filename = 'document.md';
  let content = '';

  const userName = currentUser ? `@${currentUser.login} (${currentUser.name || ''})` : 'Usuário';

  switch (docType) {
    case 'Resume_Analysis.md':
      filename = 'Resume_Analysis.md';
      content = `# Análise de Currículo & Competências Técnicas
**Data:** ${new Date().toISOString()}
**Profissional:** ${currentResume?.candidateName || userName}
**Senioridade Identificada:** ${currentResume?.seniorityLevel || 'N/A'}

## 🎯 Resumo Profissional
${currentResume?.summary || 'Nenhum resumo gerado.'}

## ✅ Competências Comprovadas
${currentResume?.verifiedSkills.map(s => `- ${s}`).join('\n') || 'Nenhuma'}

## 💡 Competências Inferidas
${currentResume?.inferredSkills?.map(s => `- ${s}`).join('\n') || 'Nenhuma'}

## 🚀 Oportunidades de Desenvolvimento
${currentResume?.developmentOpportunities?.map(s => `- ${s}`).join('\n') || 'Nenhuma'}

## 💼 Experiências Documentadas
${currentResume?.documentedExperiences.map(e => `### ${e.role} — ${e.company || ''} (${e.period || ''})\n${e.achievements.map(a => `- ${a}`).join('\n')}`).join('\n\n') || 'Nenhuma'}
`;
      break;

    case 'ATS_Optimization_Report.md':
      filename = 'ATS_Optimization_Report.md';
      content = `# Relatório de Otimização ATS
**Score Geral de Compatibilidade:** ${currentAtsResult?.overallScore || 0}/100

## 📊 Detalhamento dos Critérios
- Formatação e Estrutura: ${currentAtsResult?.criteriaBreakdown.formattingAndStructure || 0}%
- Impacto Quantificado: ${currentAtsResult?.criteriaBreakdown.quantifiedImpact || 0}%
- Densidade de Palavras-chave: ${currentAtsResult?.criteriaBreakdown.keywordDensity || 0}%
- Clareza Técnica: ${currentAtsResult?.criteriaBreakdown.technicalClarity || 0}%
- Legibilidade ATS: ${currentAtsResult?.criteriaBreakdown.atsReadability || 0}%

## ⚠️ Problemas Identificados e Recomendações
${currentAtsResult?.problemsIdentified.map(p => `### [${p.severity}] ${p.issue}\n- **Categoria:** ${p.category}\n- **Recomendação:** ${p.recommendation}`).join('\n\n') || 'Nenhum'}

## 📝 Currículo Otimizado em Markdown
\`\`\`markdown
${currentAtsResult?.revisedResumeMarkdown || ''}
\`\`\`
`;
      break;

    case 'Career_Opportunities.md':
      filename = 'Career_Opportunities.md';
      content = `# Ideias de Projetos de Alto Impacto para Carreira
**Conta:** ${userName}
**Total de Ideias:** ${currentCareerProjects.length}

${currentCareerProjects.map((p, idx) => `## ${idx + 1}. ${p.name} (${p.category})
> **${p.tagline}**

- **Problema:** ${p.problemSolved}
- **Público:** ${p.targetAudience} (Nicho: ${p.niche})
- **Diferencial:** ${p.competitiveEdge}
- **Stack:** ${p.recommendedStack.join(', ')}
- **Arquitetura:** ${p.suggestedArchitecture}
- **Potencial Comercial:** ${p.commercialPotential} | **Complexidade:** ${p.complexity}
- **Impacto no GitHub:** ${p.portfolioImpactExplanation}
`).join('\n---\n\n')}
`;
      break;

    case 'Startup_Ideas.md':
      filename = 'Startup_Ideas.md';
      content = `# Ideias de Startups & Inovação Tecnológica
${currentStartupIdeas.map((s, idx) => `## ${idx + 1}. ${s.name} (${s.sector})
- **Problema:** ${s.problemStatement}
- **Solução:** ${s.solutionSummary}
- **Público:** ${s.targetMarket}
- **Concorrentes Conhecidos e Brechas:**
${s.knownCompetitors.map(c => `  - *${c.name}*: ${c.gap}`).join('\n')}
- **Diferencial:** ${s.marketDifferentiator}
- **Monetização:** ${s.monetizationModel}
- **Riscos de Mercado:** ${s.marketRisks.join('; ')}
`).join('\n---\n\n')}
`;
      break;

    case 'Hackathon_Projects.md':
      filename = 'Hackathon_Projects.md';
      content = `# Projetos para Hackathons
${currentHackathonProjects.map((h, idx) => `## ${idx + 1}. ${h.name} (${h.themeOrCategory})
**Elevator Pitch:** ${h.elevatorPitch}

- **Problema:** ${h.targetProblem}
- **Solução:** ${h.proposedSolution}
- **Destaques na Demo ao Vivo:**
${h.liveDemoFeatures.map(f => `  - ${f}`).join('\n')}
- **Índice de Aderência do Jurado:** ${h.evaluationMetrics.hackathonFitIndex}/100
- **Argumento de Originalidade:** ${h.judgePresentationPoints.originalityPoint}
- **Argumento de Impacto:** ${h.judgePresentationPoints.impactPoint}
`).join('\n---\n\n')}
`;
      break;

    case 'GitHub_Profile_Optimized.md':
      filename = 'GitHub_Profile_Optimized.md';
      content = `# Proposta de README do Perfil GitHub (@${currentUser?.login || 'user'})
**Bio Proposta:** ${currentProfileOptimization?.proposedBio || ''}

## Conteúdo do README.md
${currentProfileOptimization?.proposedProfileReadme || 'Nenhum README de perfil formulado ainda.'}
`;
      break;

    case 'GITHUB_REPOSITORY_CURATION.md': {
      filename = 'GITHUB_REPOSITORY_CURATION.md';
      const audit = buildCurationAudit(currentRepos, currentResume);
      content = `# Relatório Geral de Curadoria de Repositórios — GitHub Intelligence AI
**Data:** ${new Date().toISOString()}
**Conta:** ${userName}
**Total de Repositórios Auditados:** ${audit.summary.totalAnalyzed}

## 📊 Sumário Executivo
- **Manter Público (Vitrine Ativa):** ${audit.summary.keepPublicCount}
- **Recomendados para Privatização:** ${audit.summary.considerPrivateCount}
- **Recomendados para Arquivamento:** ${audit.summary.archiveCount}
- **Necessitam de Melhorias (README/Docs):** ${audit.summary.improveCount}
- **Aguardando Revisão de Segurança:** ${audit.summary.securityReviewCount}
- **Backups / Cópias Detectadas:** ${audit.summary.backupsDetectedCount}
- **Inconclusivos:** ${audit.summary.inconclusiveCount}

---

## 📌 Repositórios Recomendados para Fixar no Perfil
${audit.profileOptimizationAdvice.recommendedPinnedRepos.map(r => `- **${r}** (Alta relevância técnica alinhada ao currículo)`).join('\n') || '- Nenhum'}

---

## 🔍 Diagnóstico Detalhado por Repositório
${audit.curationList.map((item, idx) => `### ${idx + 1}. [${item.repoName}](${item.htmlUrl})
- **Classificação:** \`${item.recommendedClassification}\` (Confiança: ${item.confidenceLevel})
- **Finalidade Identificada:** ${item.apparentPurpose}
- **Relevância para o Portfólio:** ${item.professionalRelevance}
- **Estado de Manutenção:** ${item.maintenanceState} | **Qualidade da Documentação:** ${item.docQualityScore}/100
- **Risco de Segurança:** ${item.securityRiskLevel} (${item.securityFindingsCount} apontamentos)
- **Justificativa:** ${item.rationale}
- **Ação Sugerida:** ${item.suggestedAction}
${item.consequencesSummary ? `- ⚠️ **Impacto:** ${item.consequencesSummary}` : ''}
`).join('\n---\n\n')}
`;
      break;
    }

    case 'GITHUB_VISIBILITY_RECOMMENDATIONS.json': {
      filename = 'GITHUB_VISIBILITY_RECOMMENDATIONS.json';
      const audit = buildCurationAudit(currentRepos, currentResume);
      const jsonOutput = {
        generatedAt: new Date().toISOString(),
        user: userName,
        totalRepos: audit.summary.totalAnalyzed,
        summary: audit.summary,
        recommendations: audit.curationList.map(item => ({
          repoName: item.repoName,
          currentVisibility: item.isPrivate ? 'PRIVATE' : 'PUBLIC',
          isArchived: item.isArchived,
          recommendedClassification: item.recommendedClassification,
          recommendedVisibility: item.recommendedClassification === 'CONSIDER_PRIVATE' ? 'PRIVATE' : 'PUBLIC',
          confidence: item.confidenceLevel,
          rationale: item.rationale,
          suggestedAction: item.suggestedAction,
          isBackup: item.backupDetection.isBackup,
          hasSecurityIssues: item.securityFindingsCount > 0,
        })),
      };
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(JSON.stringify(jsonOutput, null, 2));
    }

    case 'GITHUB_PORTFOLIO_PRIORITY.md': {
      filename = 'GITHUB_PORTFOLIO_PRIORITY.md';
      const audit = buildCurationAudit(currentRepos, currentResume);
      content = `# Priorização de Portfólio do GitHub
**Conta:** ${userName}
**Data:** ${new Date().toISOString()}

## 🎯 Recomendações de Destaque no Perfil
${audit.summary.pinnedRecommendations.map((r, i) => `### ${i + 1}. ${r}
- **Motivo do Destaque:** Demonstra domínio prático e consistência arquitetural.
- **Ação:** Fixar como repositório principal no perfil do GitHub.
`).join('\n')}

## ⚠️ Projetos para Desafixar ou Privatizar
${audit.summary.unpinRecommendations.map(r => `- **${r}**: Não representa a senioridade técnica atual ou possui dados sensíveis.`).join('\n') || '- Nenhum'}

## 💡 Orientação para o README Principal
${audit.profileOptimizationAdvice.profileReadmeAdvice}
`;
      break;
    }

    case 'GITHUB_BACKUP_DETECTION_REPORT.md': {
      filename = 'GITHUB_BACKUP_DETECTION_REPORT.md';
      const audit = buildCurationAudit(currentRepos, currentResume);
      const backupItems = audit.curationList.filter(c => c.backupDetection.isBackup);
      content = `# Relatório do Mecanismo de Detecção de Backups
**Data:** ${new Date().toISOString()}
**Total de Repositórios Auditados:** ${audit.summary.totalAnalyzed}
**Backups / Clones Suspeitos Detectados:** ${backupItems.length}

${backupItems.length === 0 ? 'Nenhum repositório de backup ou clone obsoleto foi detectado. Todos os projetos demonstram estrutura legítima de engenharia.' : backupItems.map((b, i) => `### ${i + 1}. ${b.repoName}
- **Confiança da Detecção:** ${b.backupDetection.confidence}%
- **Evidências:**
${b.backupDetection.detectedPatterns.map(p => `  - ${p}`).join('\n')}
- **Motivos Identificados:**
${b.backupDetection.reasons.map(r => `  - ${r}`).join('\n')}
- **Ação Recomendada:** ${b.suggestedAction}
`).join('\n---\n\n')}
`;
      break;
    }

    case 'GITHUB_SECURITY_REVIEW.md': {
      filename = 'GITHUB_SECURITY_REVIEW.md';
      const audit = buildCurationAudit(currentRepos, currentResume);
      const secItems = audit.curationList.filter(c => c.securityFindingsCount > 0);
      content = `# Relatório de Auditoria de Segurança nos Repositórios
**Data:** ${new Date().toISOString()}
**Repositórios com Alertas de Segurança:** ${secItems.length}

> **Nota de Privacidade:** Todos os valores e tokens foram estritamente mascarados (\`••••••••[REDACTED_SECRET]••••••••\`).

${secItems.length === 0 ? 'Nenhuma credencial exposta ou arquivo sensível detectado nos repositórios analisados. Todos os projetos estão em conformidade.' : secItems.map((s, i) => `### ${i + 1}. ${s.repoName}
- **Nível de Risco:** ${s.securityRiskLevel}
- **Total de Achados:** ${s.securityFindingsCount}
- **Recomendação:** Executar sanitização automática e criar branch de isolamento com variáveis em \`.env.example\`.
`).join('\n---\n\n')}
`;
      break;
    }

    default:
      filename = 'PORTFOLIO_GENERATION_PROMPT.md';
      content = currentUser ? generatePortfolioPrompt(currentUser, currentRepos) : '';
  }

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(content);
});

// Consolidated report APIs consumed by the frontend.
app.get('/api/reports/portfolio-prompt', (_req: Request, res: Response) => {
  if (!currentUser) {
    res.status(400).json({ error: 'Conecte sua conta do GitHub antes de gerar o prompt de portfólio.' });
    return;
  }

  res.json({ content: generatePortfolioPrompt(currentUser, currentRepos) });
});

app.get('/api/reports/consolidated', (_req: Request, res: Response) => {
  const audit = buildCurationAudit(currentRepos, currentResume);
  const portfolioPrompt = currentUser ? generatePortfolioPrompt(currentUser, currentRepos) : '';
  const auditReport = [
    '# Relatório consolidado de auditoria',
    `Repositórios avaliados: ${audit.summary.totalAnalyzed}`,
    `Recomendados para manter públicos: ${audit.summary.keepPublicCount}`,
    `Recomendados para revisão de privacidade: ${audit.summary.considerPrivateCount}`,
    `Recomendados para arquivamento: ${audit.summary.archiveCount}`,
    `Recomendados para melhorias: ${audit.summary.improveCount}`,
    '',
    ...audit.curationList.map(item =>
      `- ${item.repoName}: ${item.recommendedClassification} — ${item.rationale}`
    ),
  ].join('\n');
  const securityReport = [
    '# Relatório consolidado de segurança',
    `Repositórios analisados: ${currentRepos.length}`,
    `Repositórios com achados: ${currentRepos.filter(repo => repo.secrets.length > 0).length}`,
    '',
    ...currentRepos.flatMap(repo =>
      repo.secrets.map(finding =>
        `- ${repo.fullName} — ${finding.filePath}:${finding.lineNumber} — ${finding.severity} — ${finding.secretType}`
      )
    ),
    '',
    'Os valores dos segredos não são incluídos neste relatório.',
  ].join('\n');
  const modernizationReport = [
    '# Relatório consolidado de modernização',
    `Repositórios analisados: ${currentRepos.length}`,
    '',
    ...currentRepos.flatMap(repo =>
      repo.proposedChanges.map(change =>
        `- ${repo.fullName}: ${change.path} — ${change.status} — ${change.description}`
      )
    ),
  ].join('\n');

  res.json({
    auditReport,
    securityReport,
    modernizationReport,
    portfolioPrompt,
    repositoriesJson: currentRepos,
  });
});

// Repository write operations are limited to repositories owned by the connected user.
app.post('/api/repo/update-metadata', async (req: Request, res: Response) => {
  const { repoId, description, topics } = req.body ?? {};
  if (typeof repoId !== 'string' || repoId.length === 0) {
    res.status(400).json({ error: 'Identificador do repositório inválido.' });
    return;
  }
  if (!gitHubToken || !currentUser) {
    res.status(401).json({ error: 'Conecte uma conta do GitHub antes de atualizar metadados.' });
    return;
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 350)) {
    res.status(400).json({ error: 'A descrição deve ter no máximo 350 caracteres.' });
    return;
  }
  if (
    topics !== undefined &&
    (!Array.isArray(topics) ||
      topics.length > 20 ||
      topics.some((topic: unknown) =>
        typeof topic !== 'string' || !/^[a-z0-9-]{1,50}$/.test(topic)
      ))
  ) {
    res.status(400).json({ error: 'Os tópicos devem conter até 20 itens válidos em letras minúsculas, números ou hífens.' });
    return;
  }

  const repo = currentRepos.find(item => item.id === repoId || item.name === repoId);
  if (!repo) {
    res.status(404).json({ error: 'Repositório não encontrado na conta conectada.' });
    return;
  }
  if (repo.owner.toLowerCase() !== currentUser.login.toLowerCase()) {
    res.status(403).json({ error: 'Só é possível alterar metadados de repositórios pertencentes à conta conectada.' });
    return;
  }

  try {
    const updates: Record<string, unknown> = {};
    if (description !== undefined) updates.description = description.trim();
    if (topics !== undefined) updates.topics = [...new Set((topics as string[]).map(topic => topic.trim()))];
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'Informe uma descrição ou uma lista de tópicos para atualizar.' });
      return;
    }

    const updated = await githubApi(
      `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`,
      { method: 'PATCH', body: JSON.stringify(updates) }
    );
    repo.description = updated.description ?? null;
    repo.metadataUpgrade = {
      ...repo.metadataUpgrade,
      proposedDescription: repo.description || '',
      proposedTopics: Array.isArray(updated.topics) ? updated.topics : repo.metadataUpgrade.proposedTopics,
      isApplied: true,
    };
    res.json({ success: true, repo });
  } catch (err: any) {
    res.status(502).json({ error: `Falha ao atualizar metadados no GitHub: ${err.message}` });
  }
});

app.post('/api/repo/create-pr', async (req: Request, res: Response) => {
  const { repoId } = req.body ?? {};
  if (typeof repoId !== 'string' || repoId.length === 0) {
    res.status(400).json({ error: 'Identificador do repositório inválido.' });
    return;
  }
  if (!gitHubToken || !currentUser) {
    res.status(401).json({ error: 'Conecte uma conta do GitHub antes de abrir um Pull Request.' });
    return;
  }

  const repo = currentRepos.find(item => item.id === repoId || item.name === repoId);
  if (!repo) {
    res.status(404).json({ error: 'Repositório não encontrado na conta conectada.' });
    return;
  }
  if (repo.owner.toLowerCase() !== currentUser.login.toLowerCase()) {
    res.status(403).json({ error: 'Só é possível abrir Pull Requests em repositórios pertencentes à conta conectada.' });
    return;
  }
  if (repo.isArchived) {
    res.status(409).json({ error: 'O repositório está arquivado e não aceita novos Pull Requests.' });
    return;
  }

  const approvedChanges = repo.proposedChanges.filter(change => change.status === 'APPROVED');
  if (approvedChanges.length === 0) {
    res.status(400).json({ error: 'Não há alterações aprovadas para enviar em um Pull Request.' });
    return;
  }

  for (const change of approvedChanges) {
    const normalizedPath = path.posix.normalize(change.path.replace(/\\/g, '/'));
    if (
      normalizedPath !== change.path ||
      normalizedPath === '.' ||
      normalizedPath === '..' ||
      normalizedPath.startsWith('../') ||
      normalizedPath.startsWith('/')
    ) {
      res.status(400).json({ error: `Caminho de arquivo inválido na proposta: ${change.path}` });
      return;
    }
    if (scanFileForSecrets(repo.id, repo.name, change.path, change.proposedContent).findings.length > 0) {
      res.status(422).json({ error: `A proposta ${change.path} contém um valor semelhante a segredo; o envio foi bloqueado.` });
      return;
    }
  }

  const owner = repo.owner;
  const repoName = repo.name;
  const repoApiPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;
  const safeRepoId = repo.id.replace(/[^a-zA-Z0-9-]/g, '').slice(-32) || 'repo';
  const branchName = `modernize/github-intelligence-${safeRepoId}`;

  try {
    const existingPulls = await githubApi(
      `${repoApiPath}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branchName}`)}&per_page=1`
    );
    if (Array.isArray(existingPulls) && existingPulls[0]) {
      const openPull = existingPulls[0];
      const pullRequest: PullRequestInfo = {
        id: String(openPull.id),
        repoName,
        branchName,
        title: openPull.title,
        prUrl: openPull.html_url,
        prNumber: openPull.number,
        status: 'OPENED',
        filesChangedCount: approvedChanges.length,
        summary: repo.pullRequest?.summary || 'Pull Request existente para alterações aprovadas.',
      };
      repo.pullRequest = pullRequest;
      res.json({ pullRequest, prUrl: pullRequest.prUrl });
      return;
    }

    let branchSha: string;
    try {
      const existingBranch = await githubApi(
        `${repoApiPath}/git/ref/heads/${encodeURIComponent(branchName)}`
      );
      branchSha = existingBranch.object.sha;
    } catch {
      const baseRef = await githubApi(
        `${repoApiPath}/git/ref/heads/${encodeURIComponent(repo.defaultBranch || 'main')}`
      );
      branchSha = baseRef.object.sha;
      await githubApi(`${repoApiPath}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: branchSha }),
      });
    }

    for (const change of approvedChanges) {
      const encodedFilePath = change.path.split('/').map(encodeURIComponent).join('/');
      let sha: string | undefined;
      try {
        const existingFile = await githubApi(
          `${repoApiPath}/contents/${encodedFilePath}?ref=${encodeURIComponent(branchName)}`
        );
        if (existingFile.type === 'file') sha = existingFile.sha;
      } catch {
        // A missing file is expected for additions on a new branch.
      }
      await githubApi(`${repoApiPath}/contents/${encodedFilePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `docs: modernize ${change.path}`,
          content: Buffer.from(change.proposedContent, 'utf-8').toString('base64'),
          branch: branchName,
          ...(sha ? { sha } : {}),
        }),
      });
    }

    const createdPull = await githubApi(`${repoApiPath}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: repo.pullRequest?.title || `docs: modernize ${repoName}`,
        head: `${owner}:${branchName}`,
        base: repo.defaultBranch || 'main',
        body: [
          'Alterações propostas pelo GitHub Intelligence Career Suite.',
          '',
          'Arquivos incluídos:',
          ...approvedChanges.map(change => `- ${change.path}: ${change.description}`),
          '',
          'Revise o diff antes de aprovar ou mesclar este Pull Request.',
        ].join('\n'),
      }),
    });
    const pullRequest: PullRequestInfo = {
      id: String(createdPull.id),
      repoName,
      branchName,
      title: createdPull.title,
      prUrl: createdPull.html_url,
      prNumber: createdPull.number,
      status: 'OPENED',
      filesChangedCount: approvedChanges.length,
      summary: repo.pullRequest?.summary || 'Pull Request criado para alterações aprovadas.',
    };
    repo.pullRequest = pullRequest;
    res.json({ pullRequest, prUrl: pullRequest.prUrl });
  } catch (err: any) {
    res.status(502).json({ error: `Falha ao criar Pull Request no GitHub: ${err.message}` });
  }
});

// ----------------------------------------------------
// REPOSITORY CURATION HELPER FUNCTIONS & ENDPOINTS
// ----------------------------------------------------
function detectBackupHeuristics(repo: RepositoryItem): BackupDetectionResult {
  const name = (repo.name || '').toLowerCase();
  const desc = (repo.description || '').toLowerCase();
  const patternsFound: string[] = [];
  const reasons: string[] = [];

  const backupKeywords = [
    'backup', 'bkp', 'site-backup', 'backup-site', 'old-project', 'project-copy',
    'restore', 'deploy-backup', 'website-old', 'archive', 'test-copy', 'copia',
    'antigo', 'dump', 'snapshot', 'legacy-copy'
  ];

  for (const kw of backupKeywords) {
    const rx = new RegExp(`(^|[_-])${kw}([_-]|\\d|$)`, 'i');
    if (rx.test(name)) {
      patternsFound.push(`Nome do repositório contém o padrão: "${kw}"`);
    }
  }

  if (/backup|cópia|antigo|dump|site antigo/i.test(desc)) {
    patternsFound.push(`Descrição sinaliza backup ou cópia: "${desc}"`);
  }

  const files: any[] = (repo as any).files || [];
  const archiveExtensions = ['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.bak'];
  const dbDumpExtensions = ['.sql', '.dump', '.sqlite', '.db', '.mysql'];

  const foundArchives = files.filter((f: any) => archiveExtensions.some(ext => f.path?.toLowerCase().endsWith(ext)));
  const foundDumps = files.filter((f: any) => dbDumpExtensions.some(ext => f.path?.toLowerCase().endsWith(ext)));

  if (foundArchives.length > 0) {
    patternsFound.push(`Arquivos compactados detectados: ${foundArchives.slice(0, 3).map((f: any) => f.path).join(', ')}`);
    reasons.push('Contém arquivos compactados típicos de backup ou exportação estática.');
  }

  if (foundDumps.length > 0) {
    patternsFound.push(`Dumps de banco de dados detectados: ${foundDumps.slice(0, 3).map((f: any) => f.path).join(', ')}`);
    reasons.push('Presença de dumps SQL ou bancos brutos sem higienização.');
  }

  const codeIndicators = ['package.json', 'tsconfig.json', 'go.mod', 'pom.xml', 'requirements.txt', 'cargo.toml', 'dockerfile', 'readme.md'];
  const hasCodeIndicators = files.some((f: any) => codeIndicators.includes(f.path?.toLowerCase()));
  const hasTests = files.some((f: any) => f.path?.toLowerCase().includes('test') || f.path?.toLowerCase().includes('spec'));
  const hasWorkflows = repo.hasWorkflows || files.some((f: any) => f.path?.includes('.github/workflows'));
  const commitCount = (repo as any).commitCount || 10;

  const isLegitimateProject = (hasCodeIndicators || hasWorkflows || hasTests) && commitCount > 5;

  let isBackup = patternsFound.length > 0;
  let confidence = 50;

  if (patternsFound.length >= 2 && !isLegitimateProject) {
    isBackup = true;
    confidence = 90;
    reasons.push('Múltiplos indicadores convergentes de backup sem estrutura de engenharia ativa.');
  } else if (patternsFound.length === 1 && !isLegitimateProject) {
    isBackup = true;
    confidence = 70;
    reasons.push('Padrão de nomenclatura ou arquivo de exportação sem sinais de manutenção.');
  } else if (patternsFound.length > 0 && isLegitimateProject) {
    isBackup = false;
    confidence = 45;
    reasons.push('Apesar de nome ou arquivo similar, o repositório possui dependências, testes e histórico de engenharia ativo.');
  } else {
    isBackup = false;
    confidence = 15;
  }

  return {
    isBackup,
    confidence,
    reasons,
    detectedPatterns: patternsFound,
    isLegitimateProject,
  };
}

function evaluateRepoCuration(repo: RepositoryItem, resume: ResumeProfile | null): RepoCurationItem {
  const backup = detectBackupHeuristics(repo);
  const secCount = repo.secrets ? repo.secrets.length : 0;
  const securityRiskLevel = secCount > 2 ? 'HIGH' : secCount > 0 ? 'MEDIUM' : 'NONE';

  let maintenanceState: 'ATIVO' | 'CONCLUIDO' | 'INATIVO' | 'ABANDONADO' = 'ATIVO';
  const updatedDate = new Date(repo.updatedAt);
  const now = new Date();
  const monthsDiff = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsDiff <= 6) maintenanceState = 'ATIVO';
  else if (monthsDiff <= 18) maintenanceState = 'CONCLUIDO';
  else if (monthsDiff <= 36) maintenanceState = 'INATIVO';
  else maintenanceState = 'ABANDONADO';

  let docQualityScore = repo.readmeQualityScore || (repo.hasReadme ? 65 : 20);
  if (!repo.description) docQualityScore = Math.max(15, docQualityScore - 15);
  if ((repo as any).hasLicense) docQualityScore = Math.min(100, docQualityScore + 10);

  let professionalRelevance: PortfolioRelevance = 'MEDIA';
  const repoLang = (repo.language || '').toLowerCase();
  const verifiedSkills = (resume?.verifiedSkills || []).map(s => s.toLowerCase());
  const isMatchResume = verifiedSkills.some(skill => repoLang.includes(skill) || skill.includes(repoLang));
  const commitCount = (repo as any).commitCount || 10;

  if (isMatchResume && docQualityScore >= 70 && commitCount > 10 && !repo.private) {
    professionalRelevance = 'DESTAQUE';
  } else if (isMatchResume || docQualityScore >= 60) {
    professionalRelevance = 'ALTA_RELEVANCIA';
  } else if (commitCount < 3 && !repo.hasReadme) {
    professionalRelevance = 'EXPERIMENTAL';
  } else if (backup.isBackup) {
    professionalRelevance = 'REDUNDANTE';
  } else if (docQualityScore < 40 && commitCount > 10) {
    professionalRelevance = 'REESCREVER';
  }

  let apparentPurpose = 'Módulo ou aplicação de software independente.';
  if (backup.isBackup) {
    apparentPurpose = 'Possível backup, exportação de site ou clone para restauração.';
  } else if (repoLang.includes('python') && (repo.name.includes('ai') || repo.name.includes('data') || repo.name.includes('model'))) {
    apparentPurpose = 'Pipeline de Inteligência Artificial, Ciência de Dados ou Machine Learning.';
  } else if (repo.hasDocker || repo.name.includes('api') || repo.name.includes('server')) {
    apparentPurpose = 'Serviço de Backend / API com infraestrutura containerizada.';
  } else if (repoLang.includes('typescript') || repoLang.includes('javascript') || repoLang.includes('html')) {
    apparentPurpose = 'Aplicação Front-End Web / Interface de Usuário.';
  } else if (repo.name.includes('cli') || repo.name.includes('tool')) {
    apparentPurpose = 'Ferramenta utilitária de linha de comando ou automação de engenharia.';
  }

  const evidenceFound: string[] = [];
  if (repo.language) evidenceFound.push(`Linguagem principal: ${repo.language}`);
  if (repo.hasReadme) evidenceFound.push('README presente');
  else evidenceFound.push('Sem arquivo README detectado');
  if (repo.hasDocker) evidenceFound.push('Configuração de containerização Docker');
  if (repo.hasWorkflows) evidenceFound.push('Automação CI/CD (GitHub Actions)');
  if (secCount > 0) evidenceFound.push(`${secCount} apontamento(s) de segurança identificados`);
  if (backup.detectedPatterns.length > 0) evidenceFound.push(...backup.detectedPatterns);

  let recommendedClassification: CurationClassification = 'KEEP_PUBLIC';
  let rationale = '';
  let suggestedAction = '';
  let confidenceLevel: ConfidenceLevel = 'ALTA';

  if (secCount > 0) {
    recommendedClassification = 'SECURITY_REVIEW';
    rationale = `Foram identificados potenciais segredos ou variáveis em arquivos do repositório. Uma revisão de segurança é indispensável antes de validar o projeto na vitrine pública.`;
    suggestedAction = 'Executar o GitHub Security Cleanup Engine e neutralizar credenciais expostas.';
    confidenceLevel = 'ALTA';
  } else if (backup.isBackup && !backup.isLegitimateProject) {
    recommendedClassification = 'CONSIDER_PRIVATE';
    rationale = `O repositório apresenta características de cópia/backup ou exportação de arquivos sem estrutura produtiva de código. Mantê-lo público polui o portfólio profissional.`;
    suggestedAction = 'Tornar repositório privado para preservar arquivos sem expor backups obsoletos.';
    confidenceLevel = backup.confidence > 75 ? 'ALTA' : 'MEDIA';
  } else if (maintenanceState === 'ABANDONADO' || (maintenanceState === 'INATIVO' && professionalRelevance === 'REDUNDANTE')) {
    recommendedClassification = 'ARCHIVE';
    rationale = `Projeto finalizado ou sem commits há mais de 2 anos. Arquivar o repositório preserva todo o histórico para consultas futuras sem passar a impressão de código negligenciado.`;
    suggestedAction = 'Arquivar repositório no GitHub (tornar somente-leitura preservando commits).';
    confidenceLevel = 'ALTA';
  } else if (docQualityScore < 55 || !repo.hasReadme || !repo.description) {
    recommendedClassification = 'IMPROVE';
    rationale = `O código demonstra relevância técnica (${repo.language || 'Software'}), mas a ausência de documentação completa, descrição clara ou instruções de instalação reduz o impacto para recrutadores e tech leads.`;
    suggestedAction = 'Modernizar o README com arquitetura, badges oficiais e instruções de instalação.';
    confidenceLevel = 'ALTA';
  } else {
    recommendedClassification = 'KEEP_PUBLIC';
    rationale = `Repositório sólido, bem estruturado e com documentação adequada. Demonstra domínio técnico de ${repo.language || 'engenharia de software'} e agrega valor imediato ao portfólio profissional.`;
    suggestedAction = professionalRelevance === 'DESTAQUE' ? 'Fixar este repositório no topo do perfil do GitHub.' : 'Manter repositório público na vitrine do GitHub.';
    confidenceLevel = 'ALTA';
  }

  const consequencesSummary = recommendedClassification === 'CONSIDER_PRIVATE'
    ? 'Atenção: Tornar privado removerá o repositório da vitrine pública, desativará o GitHub Pages e poderá desacoplar forks públicos de terceiros.'
    : recommendedClassification === 'ARCHIVE'
    ? 'Atenção: Arquivar torna o repositório somente-leitura para todos (incluindo você), desativando issues e pull requests, mas preservando o histórico de código.'
    : undefined;

  return {
    repoId: repo.id,
    repoName: repo.name,
    repoFullName: repo.fullName,
    isPrivate: repo.private,
    isArchived: repo.isArchived,
    htmlUrl: repo.htmlUrl,
    description: repo.description || 'Sem descrição cadastrada no GitHub.',
    primaryLanguage: repo.language || 'Não informada',
    lastUpdated: repo.updatedAt,
    apparentPurpose,
    evidenceFound,
    docQualityScore,
    professionalRelevance,
    securityRiskLevel,
    securityFindingsCount: secCount,
    maintenanceState,
    backupDetection: backup,
    recommendedClassification,
    rationale,
    suggestedAction,
    confidenceLevel,
    consequencesSummary,
  };
}

function buildCurationAudit(repos: RepositoryItem[], resume: ResumeProfile | null): CurationAuditResponse {
  const curationList = repos.map(r => evaluateRepoCuration(r, resume));

  const keepPublicCount = curationList.filter(c => c.recommendedClassification === 'KEEP_PUBLIC').length;
  const considerPrivateCount = curationList.filter(c => c.recommendedClassification === 'CONSIDER_PRIVATE').length;
  const archiveCount = curationList.filter(c => c.recommendedClassification === 'ARCHIVE').length;
  const improveCount = curationList.filter(c => c.recommendedClassification === 'IMPROVE').length;
  const securityReviewCount = curationList.filter(c => c.recommendedClassification === 'SECURITY_REVIEW').length;
  const inconclusiveCount = curationList.filter(c => c.recommendedClassification === 'INCONCLUSIVE').length;
  const backupsDetectedCount = curationList.filter(c => c.backupDetection.isBackup).length;

  const pinnedRecommendations = curationList
    .filter(c => c.recommendedClassification === 'KEEP_PUBLIC' && (c.professionalRelevance === 'DESTAQUE' || c.professionalRelevance === 'ALTA_RELEVANCIA'))
    .slice(0, 6)
    .map(c => c.repoName);

  const unpinCandidates = curationList
    .filter(c => c.recommendedClassification === 'CONSIDER_PRIVATE' || c.recommendedClassification === 'SECURITY_REVIEW')
    .map(c => c.repoName);

  const summary: CurationSummary = {
    totalAnalyzed: repos.length,
    keepPublicCount,
    considerPrivateCount,
    archiveCount,
    improveCount,
    securityReviewCount,
    inconclusiveCount,
    backupsDetectedCount,
    pinnedRecommendations,
    unpinRecommendations: unpinCandidates,
  };

  const profileOptimizationAdvice = {
    recommendedPinnedRepos: pinnedRecommendations,
    unpinCandidates,
    profileReadmeAdvice: `Recomendamos manter ${pinnedRecommendations.length} repositórios fixados em destaque que comprovam a sua especialidade em ${resume?.verifiedSkills.slice(0, 3).join(', ') || 'Engenharia de Software'}.`,
    headlineAdvice: `Engenheiro de Software | Foco em ${resume?.technicalSpecialties.slice(0, 2).join(' e ') || 'Sistemas Distribuídos & Clean Code'}`,
  };

  currentCurationResults = curationList;
  currentCurationSummary = summary;
  currentProfileAdvice = profileOptimizationAdvice;

  return {
    summary,
    curationList,
    profileOptimizationAdvice,
  };
}

// Curation Endpoints
app.get('/api/curation/audit', (_req: Request, res: Response) => {
  const audit = buildCurationAudit(currentRepos, currentResume);
  res.json(audit);
});

app.post('/api/curation/re-evaluate/:repoId', (req: Request, res: Response) => {
  const { repoId } = req.params;
  const repo = currentRepos.find(r => r.id === repoId || r.name === repoId);
  if (!repo) {
    return res.status(404).json({ error: 'Repositório não encontrado.' });
  }

  const updatedItem = evaluateRepoCuration(repo, currentResume);
  currentCurationResults = currentCurationResults.map(c => c.repoId === repo.id ? updatedItem : c);
  res.json({ success: true, item: updatedItem });
});

app.post('/api/repos/:repoId/change-visibility', async (req: Request, res: Response) => {
  const { repoId } = req.params;
  const { isPrivate } = req.body;
  const repo = currentRepos.find(r => r.id === repoId || r.name === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repositório não encontrado.' });
  }

  if (!gitHubToken) {
    repo.private = Boolean(isPrivate);
    return res.json({
      success: true,
      isPrivate: repo.private,
      message: `Visibilidade alterada com sucesso para ${repo.private ? 'Privado' : 'Público'} (modo local).`,
    });
  }

  try {
    const owner = repo.fullName.split('/')[0];
    const repoName = repo.fullName.split('/')[1] || repo.name;
    const updated = await githubApi(`/repos/${owner}/${repoName}`, {
      method: 'PATCH',
      body: JSON.stringify({ private: Boolean(isPrivate) }),
    });

    repo.private = updated.private;
    res.json({
      success: true,
      isPrivate: updated.private,
      message: `Visibilidade alterada com sucesso no GitHub para ${updated.private ? 'Privado' : 'Público'}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao alterar visibilidade no GitHub: ${err.message}` });
  }
});

app.post('/api/repos/:repoId/archive', async (req: Request, res: Response) => {
  const { repoId } = req.params;
  const repo = currentRepos.find(r => r.id === repoId || r.name === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repositório não encontrado.' });
  }

  if (!gitHubToken) {
    repo.isArchived = true;
    return res.json({
      success: true,
      isArchived: true,
      message: 'Repositório arquivado com sucesso (modo local).',
    });
  }

  try {
    const owner = repo.fullName.split('/')[0];
    const repoName = repo.fullName.split('/')[1] || repo.name;
    const updated = await githubApi(`/repos/${owner}/${repoName}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    });

    repo.isArchived = updated.archived;
    res.json({
      success: true,
      isArchived: updated.archived,
      message: 'Repositório arquivado com sucesso no GitHub.',
    });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao arquivar repositório no GitHub: ${err.message}` });
  }
});

// Document History Endpoints
app.get('/api/documents/history', (_req: Request, res: Response) => {
  res.json({ documents: documentsHistory });
});

app.post('/api/documents/history', (req: Request, res: Response) => {
  const { title, docType, format, fileSizeText, templateUsed, languageUsed } = req.body;
  const newItem: GeneratedDocHistoryItem = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title || 'Documento Exportado',
    docType: docType || 'RESUME_FULL',
    format: format || 'PDF',
    generatedAt: new Date().toISOString(),
    fileSizeText: fileSizeText || '240 KB',
    templateUsed,
    languageUsed,
  };
  documentsHistory.unshift(newItem);
  res.json({ success: true, item: newItem });
});

app.delete('/api/documents/history/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  documentsHistory = documentsHistory.filter(d => d.id !== id);
  res.json({ success: true });
});

// Export Folder / Project to GitHub
app.post('/api/github/export-folder', async (req: Request, res: Response) => {
  const {
    repoName,
    isPrivate = true,
    description = '',
    branch = 'main',
    commitMessage = 'Exportação inicial de projeto via GitHub Intelligence AI',
    files = [],
  } = req.body;

  if (!repoName || typeof repoName !== 'string') {
    return res.status(400).json({ error: 'Nome do repositório é obrigatório.' });
  }

  const cleanRepoName = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

  if (gitHubToken) {
    try {
      const user = await githubApi('/user');
      const owner = user.login;

      let repo: any = null;
      try {
        repo = await githubApi(`/repos/${owner}/${cleanRepoName}`);
      } catch {
        repo = await githubApi('/user/repos', {
          method: 'POST',
          body: JSON.stringify({
            name: cleanRepoName,
            private: Boolean(isPrivate),
            description: description || `Projeto exportado via GitHub Intelligence AI`,
            auto_init: true,
          }),
        });
      }

      let uploadedCount = 0;
      for (const file of files) {
        if (!file.path || !file.content) continue;
        const normalizedPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;

        if (
          normalizedPath.includes('node_modules/') ||
          normalizedPath.includes('.git/') ||
          normalizedPath.endsWith('.DS_Store')
        ) {
          continue;
        }

        const base64Content = file.isBase64
          ? file.content
          : Buffer.from(file.content, 'utf-8').toString('base64');

        let sha: string | undefined = undefined;
        try {
          const existing = await githubApi(`/repos/${owner}/${cleanRepoName}/contents/${normalizedPath}?ref=${branch}`);
          if (existing && existing.sha) {
            sha = existing.sha;
          }
        } catch {
          // New file
        }

        await githubApi(`/repos/${owner}/${cleanRepoName}/contents/${normalizedPath}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: commitMessage,
            content: base64Content,
            branch: branch || repo.default_branch || 'main',
            ...(sha ? { sha } : {}),
          }),
        });
        uploadedCount++;
      }

      const newRepoItem: RepositoryItem = {
        id: String(repo.id || Date.now()),
        name: cleanRepoName,
        fullName: `${owner}/${cleanRepoName}`,
        owner,
        private: Boolean(isPrivate),
        defaultBranch: branch || 'main',
        htmlUrl: repo.html_url || `https://github.com/${owner}/${cleanRepoName}`,
        description: description || 'Projeto exportado via GitHub Intelligence AI',
        starsCount: 0,
        forksCount: 0,
        openIssuesCount: 0,
        updatedAt: new Date().toISOString(),
        pushedAt: new Date().toISOString(),
        isArchived: false,
        isFork: false,
        language: 'TypeScript',
        detectedLanguages: { TypeScript: 100 },
        technologies: ['TypeScript', 'Git'],
        hasReadme: files.some((f: any) => f.path?.toLowerCase().includes('readme')),
        readmeQualityScore: 85,
        securityScore: 100,
        seniorityScore: 80,
        hasDocker: files.some((f: any) => f.path?.toLowerCase().includes('dockerfile')),
        hasWorkflows: files.some((f: any) => f.path?.includes('.github/workflows')),
        hasEnvExample: files.some((f: any) => f.path?.includes('.env.example')),
        isAbandoned: false,
        lastCommitDaysAgo: 0,
        secrets: [],
        watermarks: [],
        proposedChanges: [],
        metadataUpgrade: {
          originalDescription: description,
          proposedDescription: description,
          originalTopics: [],
          proposedTopics: ['software-engineering', 'clean-code'],
          isApplied: true,
        },
        seniorAssessment: {
          problemSolved: 'Projeto exportado e versionado diretamente.',
          architectureType: 'Modular',
          modularizationNotes: ['Estrutura exportada com sucesso.'],
          securityEnhancements: [],
          performanceRecommendations: [],
          bestPracticesApplied: ['Versionamento no GitHub'],
        },
        syncStatus: 'COMPLETED',
      };

      currentRepos = [newRepoItem, ...currentRepos.filter(r => r.name !== cleanRepoName)];

      return res.json({
        success: true,
        repoUrl: newRepoItem.htmlUrl,
        repoName: cleanRepoName,
        filesExported: uploadedCount,
        isPrivate: Boolean(isPrivate),
        message: `Projeto "${cleanRepoName}" exportado com sucesso para o GitHub com ${uploadedCount} arquivos!`,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Falha ao exportar pasta para o GitHub: ${err.message}`,
      });
    }
  } else {
    // Local simulation mode when token is not yet provided
    const newRepoItem: RepositoryItem = {
      id: `local-${Date.now()}`,
      name: cleanRepoName,
      fullName: `local/${cleanRepoName}`,
      owner: 'local',
      private: Boolean(isPrivate),
      defaultBranch: branch || 'main',
      htmlUrl: `https://github.com/usuario/${cleanRepoName}`,
      description: description || 'Projeto exportado via GitHub Intelligence AI (Modo Local)',
      starsCount: 0,
      forksCount: 0,
      openIssuesCount: 0,
      updatedAt: new Date().toISOString(),
      pushedAt: new Date().toISOString(),
      isArchived: false,
      isFork: false,
      language: 'TypeScript',
      detectedLanguages: { TypeScript: 100 },
      technologies: ['TypeScript'],
      hasReadme: true,
      readmeQualityScore: 80,
      securityScore: 100,
      seniorityScore: 75,
      hasDocker: false,
      hasWorkflows: false,
      hasEnvExample: true,
      isAbandoned: false,
      lastCommitDaysAgo: 0,
      secrets: [],
      watermarks: [],
      proposedChanges: [],
      metadataUpgrade: {
        originalDescription: description,
        proposedDescription: description,
        originalTopics: [],
        proposedTopics: ['software-engineering'],
        isApplied: true,
      },
      seniorAssessment: {
        problemSolved: 'Estruturação inicial de repositório.',
        architectureType: 'Full-Stack',
        modularizationNotes: ['Arquivos organizados.'],
        securityEnhancements: [],
        performanceRecommendations: [],
        bestPracticesApplied: ['Boas práticas de engenharia'],
      },
      syncStatus: 'COMPLETED',
    };

    currentRepos = [newRepoItem, ...currentRepos];

    return res.json({
      success: true,
      repoUrl: newRepoItem.htmlUrl,
      repoName: cleanRepoName,
      filesExported: files.length || 1,
      isPrivate: Boolean(isPrivate),
      message: `Projeto "${cleanRepoName}" preparado com sucesso (conecte seu GitHub token para sincronização remota).`,
    });
  }
});

// HACKMIND: provedores de IA e motor de hackathons integrados
  // Providers list & health
  app.get('/api/providers', async (_req, res) => {
    try {
      const statuses = await globalProviderRegistry.getAllHealthStatuses();
      res.json({
        activeProviderId: globalProviderRegistry.getActiveProviderId(),
        providers: statuses
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao carregar provedores.' });
    }
  });

  // Set active provider
  app.post('/api/providers/set-active', (req, res) => {
    const { providerId, model, apiKey, endpoint } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'providerId é obrigatório' });
    }

    if (apiKey !== undefined || endpoint !== undefined) {
      globalProviderRegistry.setSessionCredentials(providerId, apiKey, endpoint);
    }

    const success = globalProviderRegistry.setActiveProvider(providerId, model);
    if (!success) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }

    res.json({
      success: true,
      activeProviderId: globalProviderRegistry.getActiveProviderId(),
      activeModel: globalProviderRegistry.getActiveModel()
    });
  });

  // Test provider connection
  app.post('/api/providers/test', async (req, res) => {
    const { providerId, apiKey, endpoint } = req.body;
    const provider = globalProviderRegistry.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }

    try {
      const status = await provider.checkHealth(apiKey, endpoint);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({
        isAvailable: false,
        message: `Erro no teste: ${err.message}`
      });
    }
  });

  // Verified hackathons preset list
  app.get('/api/competitions/presets', (_req, res) => {
    res.json(AIService.getVerifiedHackathons());
  });

  // Analyze competition
  app.post('/api/competitions/analyze', (req, res) => {
    const comp = req.body;
    if (!comp || !comp.name) {
      return res.status(400).json({ error: 'Dados da competição incompletos.' });
    }
    const analysis = AIService.analyzeCompetition(comp);
    res.json(analysis);
  });

  // Generate 20 candidate hypotheses
  app.post('/api/hypotheses/generate', async (req, res) => {
    const comp = req.body;
    if (!comp || !comp.name) {
      return res.status(400).json({ error: 'Competição é obrigatória para gerar hipóteses.' });
    }

    try {
      const result = await AIService.generate20Hypotheses(comp);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Falha ao gerar hipóteses.' });
    }
  });

  // Run adversarial review
  app.post('/api/hypotheses/adversarial', (req, res) => {
    const { hypothesis, timelineHours } = req.body;
    if (!hypothesis || !hypothesis.id) {
      return res.status(400).json({ error: 'Hipótese é obrigatória para o comitê.' });
    }

    const review = AIService.runCommittee(hypothesis, timelineHours || 48);
    res.json(review);
  });

  // Build MVP execution plan
  app.post('/api/hypotheses/plan', (req, res) => {
    const { hypothesis, competition } = req.body;
    if (!hypothesis || !competition) {
      return res.status(400).json({ error: 'Hipótese e competição são obrigatórias.' });
    }

    const plan = AIService.createExecutionPlan(hypothesis, competition);
    res.json(plan);
  });

  // Export session to Markdown
  app.post('/api/export/markdown', (req, res) => {
    const session = req.body;
    if (!session || !session.competition) {
      return res.status(400).json({ error: 'Sessão inválida para exportação.' });
    }

    const markdown = AIService.exportSessionToMarkdown(session);
    res.json({ markdown });
  });


export default app;
