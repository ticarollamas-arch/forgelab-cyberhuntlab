/**
 * HACKMIND — Execution Planner Engine
 * Transforms selected hypotheses into battle-tested MVP blueprints, 48h roadmaps, and pitch scripts.
 */

import { CandidateHypothesis, ExecutionPlan, HackathonCompetition } from './types';

export function buildExecutionPlan(
  hypothesis: CandidateHypothesis,
  competition: HackathonCompetition
): ExecutionPlan {
  const hours = competition.timelineHours || 48;
  const is24h = hours <= 24;

  const m1Hours = is24h ? '00h - 06h' : '00h - 12h';
  const m2Hours = is24h ? '06h - 14h' : '12h - 26h';
  const m3Hours = is24h ? '14h - 20h' : '26h - 38h';
  const m4Hours = is24h ? '20h - 24h' : '38h - 48h';

  const asciiArch = `
+-----------------------------------------------------------------------------------+
|                            CAMADA DE ENTRADA / DADOS                              |
|   Datasets Públicos Verificados  <--->  Sensores Locais / Web APIs de Satélite    |
|   (NASA GIBS / Sentinel / OSM)           (Web Audio / WebRTC / Web Crypto)        |
+-----------------------------------------------------------------------------------+
                                        | (Payload JSON / Raster Tiles)
                                        v
+-----------------------------------------------------------------------------------+
|                        MOTOR DETERMINÍSTICO NO NAVEGADOR                          |
|   [ Wasm / Web Workers ]  -->  [ Algoritmo de Otimização / Filtro de Anomalias ]  |
|   Processamento Local           Zero Latência de Nuvem                            |
+-----------------------------------------------------------------------------------+
                                        | (Fluxo de Resultados Sanitizados)
                                        v
+-----------------------------------------------------------------------------------+
|                             INTERFACE OPERACIONAL DENSE                           |
|   Dashboard Reativo (React 19 + Tailwind)  <--->  Alertas Acionáveis em 1 Clique   |
|   Inspeção Comparativa Visual              Modo Offline PWA com Cache Local       |
+-----------------------------------------------------------------------------------+
`;

  return {
    hypothesisId: hypothesis.id,
    hypothesisName: hypothesis.name,
    executiveSummary: `${hypothesis.name} é um sistema operacional concebido especificamente para os critérios de ${competition.name}. Ele resolve o problema de ${hypothesis.specificProblem.slice(0, 160)}... através de um mecanismo autônomo baseado em ${hypothesis.coreTechnicalDifferentiator.slice(0, 140)}.`,
    problemAndTargetUser: `Público: ${hypothesis.affectedUser}\nProblema Crítico: ${hypothesis.specificProblem}\nCusto da inação: Ineficiência de recursos, decisões cegas e dependência de serviços externos vulneráveis a quedas de conectividade.`,
    valueHypothesis: `Se fornecermos aos operadores um mecanismo direto de ${hypothesis.category.toLowerCase()} rodando localmente sem fricção, reduziremos o tempo de resposta de horas para segundos, com custo de infraestrutura próximo de zero.`,
    technicalArchitectureAscii: asciiArch.trim(),
    architectureComponents: [
      {
        layer: 'Ingestão de Dados',
        technology: hypothesis.requiredTechnologies[0] || 'Web APIs REST & WebSockets',
        role: 'Consumo de fontes públicas oficiais com sanitização e normalização de esquema.',
        fallback: 'Fixtures estáticas JSON embutidas localmente caso o Wi-Fi do hackathon oscile.'
      },
      {
        layer: 'Motor de Raciocínio & Cálculo',
        technology: hypothesis.requiredTechnologies[1] || 'WebAssembly / Web Workers',
        role: 'Execução de cálculos combinatórios ou transformadas matemáticas sem travar a thread principal da UI.',
        fallback: 'Versão síncrona degradada com amostragem reduzida para navegadores legados.'
      },
      {
        layer: 'Camada de Apresentação',
        technology: 'React 19 + Tailwind CSS + Lucide Icons',
        role: 'Exibição densa de métricas, controles acessíveis e visualização de impacto direto.',
        fallback: 'Renderização padrão SVG sem animações complexas.'
      },
      {
        layer: 'Armazenamento & Offline',
        technology: 'IndexedDB + Service Workers',
        role: 'Persistência segura das sessões e dados históricos sem banco de dados remoto.',
        fallback: 'LocalStorage em memória RAM para a sessão da demonstração.'
      }
    ],
    primaryUserFlow: [
      '1. O usuário abre o sistema e seleciona o cenário de dados ou ativa a leitura ao vivo.',
      '2. O motor analisa os parâmetros e destaca imediatamente os nós de anomalia ou gargalo.',
      '3. O usuário clica em "Otimizar / Executar Ação" e visualiza o resultado com métricas de impacto calculadas.',
      '4. O sistema gera um comprovante verificável ou relatório exportável pronto para auditoria.'
    ],
    essentialComponents: [
      'Módulo de ingestão com parser resiliente e tratamento de exceções',
      'Motor de cálculo central demonstrando o diferencial técnico',
      'Interface limpa de visualização com controles de injeção de evento ao vivo',
      'Fixtures locais para garantia de funcionamento em qualquer conexão Wi-Fi'
    ],
    optionalComponentsScopeCut: [
      'Sistema de autenticação por email/senha (não agrega nota no hackathon)',
      'Painel de faturamento ou billing multi-tenant',
      'Configurações cosméticas de temas secundários',
      'Suporte a bancos de dados externos pesados'
    ],
    implementationRoadmap: [
      {
        hours: m1Hours,
        title: 'Fundação & Ingestão de Dados Reais',
        deliverables: [
          'Setup do projeto com tipagem estrita e lint limpo',
          'Conexão com a fonte de dados oficial ou ingestão do dataset do desafio',
          'Criação das fixtures de backup locais (JSON mock autêntico)'
        ],
        fallbackIfBlocked: 'Utilizar imediatamente o dataset estático baixado sem insistir em requisições de rede com falha.'
      },
      {
        hours: m2Hours,
        title: 'Núcleo do Mecanismo Técnico & Cálculos',
        deliverables: [
          'Implementação do algoritmo/mecanismo chave diferencial',
          'Testes unitários rápidos cobrindo casos de borda e anomalias',
          'Benchmark de latência e consumo de recursos'
        ],
        fallbackIfBlocked: 'Simplificar heurística complexa para regra determinística com saída idêntica para os casos de teste.'
      },
      {
        hours: m3Hours,
        title: 'Interface Operacional & Roteiro de Demonstração',
        deliverables: [
          'Construção do painel operacional responsivo sem rolagem horizontal',
          'Implementação do botão de "Injetar Teste de Estresse" para os jurados',
          'Feedback visual de sucesso, estados vazios e alertas'
        ],
        fallbackIfBlocked: 'Priorizar visualização de resultados em vez de formulários extensos de entrada.'
      },
      {
        hours: m4Hours,
        title: 'Ensaio de Pitch, Deploy & Auditoria Final',
        deliverables: [
          'Deploy público verificado em ambiente de alta disponibilidade',
          'Ensaio do pitch de 3 minutos cronometrado com relógio',
          'Gravação de vídeo de segurança de 90 segundos sem cortes'
        ],
        fallbackIfBlocked: 'Ter o build local rodando em `localhost:3000` pronto para espelhamento de tela caso o Wi-Fi caia.'
      }
    ],
    verifiableDataSources: [
      {
        name: 'Dataset Oficial do Desafio / API Pública',
        urlOrEndpoint: 'https://dados.gov.br ou APIs oficiais de satélite/sensores',
        purpose: 'Prover séries temporais reais para o motor processar sem dados inventados.',
        isRealTime: true,
        mockFallback: 'src/fixtures/verified_benchmark_data.json'
      }
    ],
    testingStrategy: [
      'Testes unitários automatizados para o motor de cálculo (assertivas de precisão e limites)',
      'Teste de estresse com injeção de 1.000 amostras simultâneas para verificar ausência de travamentos',
      'Teste em modo avião (offline total) para provar a autonomia da solução',
      'Validação de viewport em 320px, 390px, 768px e 1440px'
    ],
    measurableSuccessMetrics: [
      'Latência de processamento < 150ms na máquina do jurado',
      'Zero dependência de serviços externos com cobrança ou chaves de API restritas',
      'Tempo de demonstração do problema à solução < 60 segundos',
      'Taxa de acerto ou economia comprovada numericamente na tela'
    ],
    fallbackContingencyPlan: `Se o Wi-Fi do local da competição falhar ou a API do patrocinador atingir limite de requisições, a aplicação aciona instantaneamente o switch interno "Modo Demonstração Offline", carregando um lote auditado de dados reais gravados em memória sem quebrar a apresentação.`,
    judgingDemoScript: [
      {
        minute: '00:00 - 00:30',
        action: 'Apresentar o problema crítico em 2 frases e mostrar o estado atual quebrado das alternativas.',
        spokenPitch: `"Jurados, quando um operador enfrenta ${hypothesis.category.toLowerCase()}, ele perde preciosas horas porque as ferramentas atuais dependem de nuvens lentas e caras."`,
        onScreenVisual: 'Tela inicial com diagnóstico do gargalo e métrica de tempo perdido.'
      },
      {
        minute: '00:30 - 01:15',
        action: 'Disparar a execução do motor com dados reais ao vivo.',
        spokenPitch: `"Construímos o ${hypothesis.name}. Vejam: clicamos em executar e o motor processa localmente em milissegundos, gerando a rota/ação ideal."`,
        onScreenVisual: 'Processamento instantâneo com gráfico reativo e indicador verde de sucesso.'
      },
      {
        minute: '01:15 - 02:00',
        action: 'Convidar o jurado para injetar uma anomalia ou estresse no sistema.',
        spokenPitch: `"Não é um vídeo gravado nem um mock. Vamos injetar uma falha agora... Vejam o sistema recalibrar automaticamente sem quebrar."`,
        onScreenVisual: 'Botão "Injetar Anomalia" acionado, recalculando o fluxo em 30ms diante dos olhos da banca.'
      },
      {
        minute: '02:00 - 02:45',
        action: 'Explicar a arquitetura técnica enxuta e alinhamento com os critérios.',
        spokenPitch: `"Desenvolvemos isso em ${hours} horas utilizando ${hypothesis.requiredTechnologies.slice(0, 3).join(', ')}, com código 100% aberto e pronto para implantação imediata."`,
        onScreenVisual: 'Aba de Auditoria e Arquitetura com testes unitários passando.'
      },
      {
        minute: '02:45 - 03:00',
        action: 'Fechamento com call to action claro e agradecimento.',
        spokenPitch: `"Obrigado! O repositório e o link público estão disponíveis para teste direto no celular de vocês agora."`,
        onScreenVisual: 'QR code para o deploy ativo e link do repositório.'
      }
    ],
    pitchScript: {
      hook: `E se você pudesse resolver ${hypothesis.category.toLowerCase()} em menos de 100 milissegundos sem gastar um centavo em servidores caros?`,
      painPoint: hypothesis.specificProblem,
      liveProof: `Ao contrário de promessas teóricas, nosso protótipo está rodando ao vivo e provou ${hypothesis.coreTechnicalDifferentiator}.`,
      technicalMoat: `Combinamos ${hypothesis.requiredTechnologies.slice(0, 3).join(' + ')} criando uma barreira técnica que nenhum wrapper genérico de IA consegue igualar.`,
      alignmentToCriteria: `Atendemos 100% dos requisitos do desafio oficial de ${competition.name}, garantindo código limpo, dados abertos e impacto social mensurável.`,
      closingCall: `Estamos prontos para levar este projeto além do hackathon e colocar na mão dos usuários reais amanhã.`
    },
    knownLimitationsAndNextSteps: [
      'Expansão do suporte de dados para outros formatos legados da indústria',
      'Testes de campo com grupo focal de 20 usuários pioneiros na próxima semana',
      'Documentação de API para desenvolvedores comunitários integrarem módulos adicionais'
    ]
  };
}
