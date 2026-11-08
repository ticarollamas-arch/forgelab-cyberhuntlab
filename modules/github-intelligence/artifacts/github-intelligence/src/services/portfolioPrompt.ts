import { RepositoryItem, GitHubUser } from '../types';

export function generatePortfolioPrompt(user: GitHubUser, repos: RepositoryItem[]): string {
  const activeRepos = repos.filter(r => !r.isArchived);
  
  // Categorize projects based on technologies & architecture
  const categories: { [key: string]: RepositoryItem[] } = {
    'Full-Stack & Web Apps': [],
    'APIs, Backend & Microservices': [],
    'DevOps, Cloud & Infrastructure': [],
    'AI, Data & Automation': [],
    'Libraries & Frontend Components': [],
  };

  for (const repo of activeRepos) {
    const techs = repo.technologies.map(t => t.toLowerCase());
    if (techs.some(t => t.includes('docker') || t.includes('kubernetes') || t.includes('terraform') || t.includes('actions'))) {
      categories['DevOps, Cloud & Infrastructure'].push(repo);
    } else if (techs.some(t => t.includes('ai') || t.includes('gemini') || t.includes('python') || t.includes('torch') || t.includes('ml'))) {
      categories['AI, Data & Automation'].push(repo);
    } else if (techs.some(t => t.includes('express') || t.includes('fastapi') || t.includes('nest') || t.includes('go') || t.includes('postgres'))) {
      categories['APIs, Backend & Microservices'].push(repo);
    } else if (techs.some(t => t.includes('ui') || t.includes('tailwind') || t.includes('component') || t.includes('library'))) {
      categories['Libraries & Frontend Components'].push(repo);
    } else {
      categories['Full-Stack & Web Apps'].push(repo);
    }
  }

  // Format verified project list
  const projectFactBlocks = activeRepos.map((repo, idx) => {
    const description = repo.metadataUpgrade?.proposedDescription || repo.description || 'Projeto técnico especializado auditado.';
    const techList = repo.technologies.length > 0 ? repo.technologies.join(', ') : repo.language;
    const arch = repo.seniorAssessment?.architectureType || 'Arquitetura modular orientada a serviços';
    const problem = repo.seniorAssessment?.problemSolved || 'Automação e eficiência técnica';
    const practices = repo.seniorAssessment?.bestPracticesApplied?.join('; ') || 'Separação de responsabilidades e tipagem estrita';

    return `### ${idx + 1}. ${repo.name} (${repo.private ? 'Repositório Privado / NDA' : 'Repositório Público'})
- **Link Oficial:** ${repo.htmlUrl}
- **Linguagem Primária:** ${repo.language || 'Multi-linguagem'}
- **Stack & Tecnologias Verificadas:** ${techList}
- **Descrição Profissional:** ${description}
- **Problema Real que Resolve:** ${problem}
- **Padrão Arquitetural:** ${arch}
- **Destaques Técnicos Auditados:** ${practices}
- **Infraestrutura / CI/CD:** ${repo.hasDocker ? 'Docker configurado' : 'Sem container'} | ${repo.hasWorkflows ? 'GitHub Actions CI/CD ativo' : 'Sem CI automática'}
- **Status:** ${repo.isArchived ? 'Arquivado' : 'Ativo e Modernizado'} (Score Técnico: ${repo.seniorityScore}/100)`;
  }).join('\n\n');

  const allTechs = Array.from(new Set(activeRepos.flatMap(r => r.technologies))).join(', ');

  return `# GITHUB PORTFOLIO GENERATION PROMPT
*Gerado automaticamente pelo GitHub Intelligence AI após auditoria, saneamento e modernização de todos os repositórios autorizados.*

---

## 🎯 INSTRUÇÃO PARA A IA DE DESIGN & DESENVOLVIMENTO WEB

Você é um Lead Frontend Architect e Senior Product Designer. Sua missão é criar uma **Single-Page Application (SPA) de Portfólio Técnico de Alto Nível** em React + Tailwind CSS (ou HTML5/CSS3 moderno) para o engenheiro **${user.name || user.login}** (@${user.login}).

### ⚠️ DIRETRIZES FUNDAMENTAIS DE VERACIDADE
- Utilize **EXCLUSIVAMENTE** os projetos, linguagens, arquiteturas e tecnologias listados abaixo.
- **NUNCA invente métricas fictícias** (como "100.000 usuários ativos" ou "5 estrelas na Forbes"), clientes inexistentes ou bibliotecas que não estejam listadas.
- Baseie todo o storytelling técnico na qualidade da engenharia, clareza das soluções e resolução de problemas reais.

---

## 👤 PERFIL DO ENGENHEIRO
- **Nome:** ${user.name || user.login}
- **GitHub:** https://github.com/${user.login}
- **Biografia Técnica:** ${user.bio || 'Engenheiro de Software com foco em código limpo, arquitetura escalável e segurança.'}
- **Total de Repositórios Auditados:** ${repos.length} (${repos.filter(r => !r.private).length} públicos, ${repos.filter(r => r.private).length} privados)
- **Tecnologias Comprovadas no Código:** ${allTechs || 'TypeScript, Node.js, React, Docker, Python'}

---

## 📂 CATÁLOGO DE PROJETOS COMPROVADOS NO REPOSITÓRIO

${projectFactBlocks}

---

## 🎨 ESPECIFICAÇÕES DE DESIGN & EXPERIÊNCIA DO USUÁRIO

1. **Identidade Visual:**
   - Paleta de cores: Grafite escuro (#0f1115 / #16191f), acentos em Verde-Limão Neon (#a3e635 / #84cc16) para botões e status ativos, e detalhes em Amarelo/Âmbar (#facc15) para métricas de destaque.
   - Tipografia: Sans-serif moderna (Inter / Geist Sans) combinada com fonte Mono para blocos de código e tags (JetBrains Mono).
   - Estilo: Dark mode elegante, cards com bordas sutis e efeito glassmorphism sutil.

2. **Seções Obrigatórias do Portfólio:**
   - **Hero Section:** Apresentação objetiva com nome, especialidade técnica, badges das stacks dominadas, link direto para o GitHub (@${user.login}) e botão de contato.
   - **Métricas Reais de Engenharia:** Indicador de repositórios modernizados, tecnologias ativas, conformidade com segurança (.env saneado) e boas práticas de CI/CD.
   - **Filtro Dinâmico de Projetos:** Permitir que recrutadores e visitantes filtrem por categoria (Full-Stack, Backend/APIs, Cloud/DevOps, AI/Data) e por tecnologia (React, Node, Python, Docker).
   - **Cards de Projetos Detalhados:**
     - Título e badge de status (Público / Privado / Open Source).
     - Descrição técnica concisa do problema resolvido.
     - Pills com as tecnologias reais utilizadas.
     - Padrão arquitetural identificado.
     - Botão "Ver no GitHub" ou "Ver Arquitetura".
   - **Seção de Arquitetura & Segurança:** Destaque para a cultura de engenharia sênior: repositórios auditados, segredos protegidos, documentação padronizada e testes automatizados.
   - **Footer:** Links para GitHub (@${user.login}), termos de licença dos projetos e copyright profissional.

3. **Código de Saída Solicitado:**
   - Gere o código completo em um único arquivo HTML/React funcional, pronto para publicação no GitHub Pages ou Vercel.
   - Inclua suporte a dispositivos móveis (100% responsivo).
   - Não use placeholders vazios; preencha os dados com as informações reais consolidadas acima.
`;
}
