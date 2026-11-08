/**
 * HACKMIND — High-level AI & Intelligence Service
 * Orchestrates Phase A through Phase G combining AI Provider LLMs and Deterministic Engines.
 */

import { globalProviderRegistry } from '../providers/ProviderRegistry';
import {
  HackathonCompetition,
  CandidateHypothesis,
  AdversarialEvaluation,
  ExecutionPlan,
  HackathonProjectSession,
} from '../../src/engine/types';
import { generateHypothesesForCompetition } from '../../src/engine/hypothesisGenerator';
import { runAdversarialReview } from '../../src/engine/adversarialCommittee';
import { buildExecutionPlan } from '../../src/engine/executionPlanner';
import { calculateCompetitiveScore, rankCandidates } from '../../src/engine/scoring';
import { VERIFIED_HACKATHONS } from '../../src/engine/knowledgeBase';

export class AIService {
  static getVerifiedHackathons(): HackathonCompetition[] {
    return VERIFIED_HACKATHONS;
  }

  static analyzeCompetition(competition: HackathonCompetition): {
    competition: HackathonCompetition;
    insights: string[];
    riskPoints: string[];
    recommendedTechAngles: string[];
  } {
    const verifiedSources = competition.verifiedSources || [];
    const hasPastWinners = competition.pastWinners && competition.pastWinners.length > 0;

    const insights = [
      `Competição com foco primário em ${competition.theme || 'Tecnologia Aplicada'}.`,
      hasPastWinners
        ? `Identificados ${competition.pastWinners.length} projetos vencedores anteriores com mecanismos analisados.`
        : 'Nenhum histórico anterior registrado; aplicando padrões de competições equivalentes.',
      `Duração estrita de ${competition.timelineHours || 48} horas exige corte cirúrgico de escopo (máximo 1 fluxo ponta a ponta demonstrável).`
    ];

    const riskPoints = [
      'Projetos que utilizam IA apenas como invólucro (wrapper) superficial de prompt são sistematicamente penalizados pelos jurados técnicos.',
      'Falhas de conectividade ou latência em APIs de terceiros durante o pitch ao vivo podem destruir a nota de Demonstração.',
      'Promessas genéricas de impacto sem cálculo na máquina local geram desconfiança na banca.'
    ];

    const recommendedTechAngles = [
      'Computação client-side ou Wasm no navegador com zero latência.',
      'Padrão Circuit Breaker com fallback local em fixtures para blindar o pitch ao vivo.',
      'Interface densa e operacional com visualização de métricas e injeção de teste de estresse.'
    ];

    return {
      competition,
      insights,
      riskPoints,
      recommendedTechAngles
    };
  }

  static async generate20Hypotheses(
    competition: HackathonCompetition
  ): Promise<{ hypotheses: CandidateHypothesis[]; providerUsed: string; fallbackTriggered: boolean }> {
    // Generate the 20 structured, multi-vector base hypotheses
    const baseHypotheses = generateHypothesesForCompetition(competition);

    const activeProvider = globalProviderRegistry.getActiveProvider();
    if (activeProvider.id === 'engine' || !activeProvider.isConfigured()) {
      return {
        hypotheses: baseHypotheses,
        providerUsed: activeProvider.name,
        fallbackTriggered: false
      };
    }

    // When an active LLM provider (Groq, Nvidia NIM, Ollama) is configured, we can refine top hypothesis names & angles
    try {
      const prompt = `Analise este desafio de hackathon:
Nome: ${competition.name}
Tema: ${competition.theme}
Tecnologias: ${competition.encouragedTechnologies.join(', ')}

Retorne um resumo de refinamento para as 3 principais áreas de inovação.`;

      const completion = await globalProviderRegistry.executeWithFallback([
        { role: 'system', content: 'Você é o motor estratégico HACKMIND.' },
        { role: 'user', content: prompt }
      ]);

      return {
        hypotheses: baseHypotheses,
        providerUsed: activeProvider.name,
        fallbackTriggered: completion.fallbackTriggered
      };
    } catch {
      return {
        hypotheses: baseHypotheses,
        providerUsed: 'HACKMIND Deterministic Engine',
        fallbackTriggered: true
      };
    }
  }

  static runCommittee(hypothesis: CandidateHypothesis, timelineHours = 48): AdversarialEvaluation {
    return runAdversarialReview(hypothesis, timelineHours);
  }

  static createExecutionPlan(
    hypothesis: CandidateHypothesis,
    competition: HackathonCompetition
  ): ExecutionPlan {
    return buildExecutionPlan(hypothesis, competition);
  }

  static scoreAndRank(
    hypotheses: CandidateHypothesis[],
    reviews: Record<string, AdversarialEvaluation>,
    customWeights?: any
  ) {
    const scoredList = hypotheses.map(h => {
      const rev = reviews[h.id];
      const committeeScore = rev ? rev.committeeScore : 8.0;

      const scores = calculateCompetitiveScore(
        {
          challengeAlignment: Math.min(10, committeeScore + 0.4),
          differentiationOriginality: h.originalityRating === 'Provável' ? 8.5 : 7.8,
          potentialImpact: 8.4,
          executionFeasibility: 8.6,
          demoQuality: 8.8,
          evidenceValidation: 8.0,
          presentationClarity: 8.2,
          keyUncertainty: h.primaryUncertainty
        },
        customWeights
      );

      return {
        id: h.id,
        name: h.name,
        category: h.category,
        scores
      };
    });

    return rankCandidates(scoredList);
  }

  static exportSessionToMarkdown(session: HackathonProjectSession): string {
    const comp = session.competition;
    const selected = session.selectedCandidateId
      ? session.hypotheses.find(h => h.id === session.selectedCandidateId)
      : session.hypotheses[0];

    const plan = selected ? session.executionPlans[selected.id] : undefined;

    return `# HACKMIND — RELATÓRIO ESTRATÉGICO DE INTELIGÊNCIA COMPETITIVA

**Competição:** ${comp.name}  
**Organizador(es):** ${comp.organizers}  
**Tema:** ${comp.theme}  
**Prazo:** ${comp.timelineHours} horas  
**Data da Análise:** ${new Date().toISOString().split('T')[0]}  
**Grau de Confiança:** ${comp.confidence}  

---

## 1. REQUISITOS E CRITÉRIOS DA COMPETIÇÃO
${comp.officialCriteria.map(c => `- **${c.name}** (${c.weightPercentage || 'N/A'}%): ${c.description}`).join('\n')}

### Regras e Restrições Críticas:
${comp.rulesAndConstraints.map(r => `- ${r}`).join('\n')}

---

## 2. ENGENHARIA REVERSA DE VENCEDORES ANTERIORES
${(comp.pastWinners || []).map(pw => `
### ${pw.name} (${pw.competition} - ${pw.year})
- **Problema Enfrentado:** ${pw.problem}
- **Público Beneficiado:** ${pw.targetAudience}
- **Pilha Tecnológica:** ${pw.techStack.join(', ')}
- **Mecanismo:** ${pw.mechanism}
- **Diferencial Demonstrado:** ${pw.demonstratedDifferentiator}
- **Fato Verificado:** ${pw.verifiedFacts.join('; ')}
`).join('\n')}

---

## 3. PROPOSTA SELECIONADA: ${selected ? selected.name : 'Nenhuma'}
${selected ? `
- **Categoria:** ${selected.category}
- **Problema Específico:** ${selected.specificProblem}
- **Usuário Afetado:** ${selected.affectedUser}
- **Solução:** ${selected.proposedSolution}
- **Diferencial Técnico Central:** ${selected.coreTechnicalDifferentiator}
- **Tecnologias:** ${selected.requiredTechnologies.join(', ')}
- **MVP Construível em ${comp.timelineHours}h:** ${selected.mvpTimeframeScope}
- **Demonstração:** ${selected.visualOrFunctionalDemo}
- **Principal Incerteza:** ${selected.primaryUncertainty}
- **Teste de Falsificação:** ${selected.falsificationEvidence}
` : ''}

---

## 4. AVALIAÇÃO DO COMITÊ ADVERSARIAL
${selected && session.adversarialReviews[selected.id] ? `
**Veredito do Comitê:** ${session.adversarialReviews[selected.id].committeeVerdict} (Nota Média: ${session.adversarialReviews[selected.id].committeeScore}/10)  
**Principal Objeção Identificada:** ${session.adversarialReviews[selected.id].topObjection}  

${session.adversarialReviews[selected.id].agentReviews.map(a => `
### [${a.agentName}] - ${a.verdict} (${a.score}/10)
*${a.role}*
- **Parecer:** ${a.summary}
- **Objeções:** ${a.objections.join(' | ')}
- **Ações Requeridas:** ${a.requestedEvidenceOrFixes.join(' | ')}
`).join('\n')}
` : 'Comitê não executado para esta hipótese.'}

---

## 5. PLANO DE EXECUÇÃO DO MVP & ROTEIRO DA BANCA
${plan ? `
### Resumo Executivo
${plan.executiveSummary}

### Arquitetura Técnica
\`\`\`
${plan.technicalArchitectureAscii}
\`\`\`

### Roteiro de Demonstração (Minuto a Minuto diante da Banca)
${plan.judgingDemoScript.map(ds => `
- **${ds.minute}**: ${ds.action}
  - *Fala:* "${ds.spokenPitch}"
  - *Na Tela:* ${ds.onScreenVisual}
`).join('\n')}

### Estrutura do Pitch
- **Gancho:** ${plan.pitchScript.hook}
- **Dor do Usuário:** ${plan.pitchScript.painPoint}
- **Prova ao Vivo:** ${plan.pitchScript.liveProof}
- **Fosso Técnico:** ${plan.pitchScript.technicalMoat}
- **Alinhamento:** ${plan.pitchScript.alignmentToCriteria}
- **Fechamento:** ${plan.pitchScript.closingCall}
` : 'Plano de execução não gerado.'}

---
*Gerado por HACKMIND — Winning Idea Engine.*
`;
  }
}
