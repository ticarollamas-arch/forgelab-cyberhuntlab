# HACKMIND — WINNING IDEA ENGINE
**Inteligência Competitiva para Hackathons**

HACKMIND é um motor de inteligência estratégica especializado em pesquisar editais e competições, dissecar projetos vencedores através de engenharia reversa, descobrir hipóteses de alto potencial e transformá-las em protótipos tecnicamente viáveis, demonstráveis e alinhados aos critérios reais de avaliação dos jurados.

---

## 🚀 O que o Sistema Faz

1. **Fase 1 — Pesquisa de Evidências:** Mapeamento de organizadores, patrocinadores, regras, restrições e critérios oficiais de julgamento com ponderação real (inclui benchmarks como NASA Space Apps, ETHGlobal, Junction e HackMIT, além de suporte a desafios customizados).
2. **Fase 2 — Engenharia Reversa do Sucesso:** Análise objetiva de projetos vencedores de edições anteriores, diferenciando fatos verificados de interpretações e sintetizando padrões de tomada de decisão de jurados técnicos.
3. **Fase 3 — Descoberta de 20 Candidatas:** Síntese de 20 hipóteses distintas cobrindo diversos vetores técnicos (Edge/Wasm, Sensoriamento Remoto, Provas de Conhecimento Zero, Sonificação de Acessibilidade, Otimização Combinatória), cada uma detalhada em 13 campos analíticos obrigatórios.
4. **Fase 4 — Comitê Adversarial 6X:** Simulação de comitê com 6 perspectivas independentes (Pesquisador, Engenheiro, Jurado, Concorrente, Usuário e Auditor) com notas, objeções fundamentadas e solicitações de evidências.
5. **Fase 5 — Pontuação Competitiva & Ranking:** Cálculo ponderado baseado na distribuição oficial (Alinhamento 20%, Originalidade 20%, Impacto 15%, Viabilidade 15%, Demonstração 15%, Evidências 10%, Apresentação 5%), com sliders interativos para adaptação caso o regulamento do hackathon defina pesos diferentes.
6. **Fase 6 — Validação de Originalidade & Anterioridade:** Confronto com soluções comerciais, artigos acadêmicos e repositórios open-source existentes, classificando a novidade do mecanismo sem promessas levianas.
7. **Fase 7 — Plano de Execução do MVP & Pitch:** Blueprint arquitetural em ASCII, corte cirúrgico de escopo, cronograma de marcos de horas, roteiro de demonstração minuto a minuto e pitch ensaiado para a banca.
8. **Exportação:** Exportação instantânea em Markdown estruturado (.md) e JSON completo.

---

## 🛠️ Arquitetura Multi-Provedor de IA

HACKMIND adota uma camada central de provedores desvinculada de SDKs proprietários específicos, suportando execução local ou remota:

- **Groq:** Inferência ultra-rápida em chips LPU com a família Meta Llama (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
- **NVIDIA NIM:** Microsserviços de IA corporativos hospedados em clusters com aceleração TensorRT (`meta/llama-3.3-70b-instruct`).
- **Ollama:** Execução local e offline de modelos open-source (`llama3.2`, `llama3.1:8b`, `mistral`, `qwen2.5`) sem envio de dados para servidores de terceiros e sem necessidade obrigatória de chaves de API.
- **Endpoint Customizado (OpenAI-Compatible):** Suporte a qualquer servidor compatível (vLLM, LM Studio, OpenRouter, Together AI).
- **HACKMIND Deterministic Engine:** Motor algorítmico embutido baseado em evidências que garante 100% de disponibilidade, latência zero e operação offline mesmo quando nenhuma chave externa estiver configurada.

---

## 🔒 Segurança de Credenciais

- As chaves de API (`GROQ_API_KEY`, `NVIDIA_NIM_API_KEY`, etc.) permanecem estritamente no backend Node.js (`server.ts`).
- Nenhuma chave secreta é injetada no bundle do navegador ou enviada no código-fonte cliente.
- O sistema permite testar e registrar credenciais para a sessão ativa de forma segura através do modal de configurações.

---

## 💻 Instalação e Execução

### Pré-requisitos
- Node.js 20+ ou 22+
- npm ou pnpm

### Passos
```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente (opcional, motor local funciona por padrão)
cp .env.example .env

# 3. Iniciar o servidor full-stack de desenvolvimento na porta 3000
npm run dev

# 4. Executar os testes unitários de lógica pura
npm test
```

Acesse no navegador: `http://localhost:3000`

---

## 🧪 Testes Automatizados

O sistema conta com testes unitários executados via `node:test` e `node:assert/strict`:

```bash
npm test
```

Testes inclusos em `src/engine/scoring.test.ts`:
- Normalização de pesos percentuais garantindo soma exata de 100%
- Cálculo da média ponderada com os 7 critérios do edital
- Aplicação e limites de penalidades por dependências inviáveis ou riscos ignorados
- Desempate determinístico por viabilidade técnica e originalidade

---

## 📌 Recursos Implementados e Limitações Conhecidas

### Recursos Implementados
- [x] Motor de pesquisa e benchmarks com dados de competições reais (NASA, ETHGlobal, Junction, MIT)
- [x] Engenharia reversa com separação de fatos verificados e interpretações
- [x] 20 candidatas geradas com 13 itens analíticos obrigatórios por proposta
- [x] Comitê com 6 agentes adversariais independentes
- [x] Ranking e ponderação com sliders customizáveis
- [x] Auditoria de originalidade e anterioridade
- [x] Plano de execução com diagrama ASCII, cronograma por horas e roteiro de demo minuto a minuto
- [x] Exportação para Markdown e JSON
- [x] Alternância de temas (Dark / Light)
- [x] Layout 100% responsivo funcional de 320px até desktops ultrawide
- [x] Camada de provedores extensível (Groq, NVIDIA NIM, Ollama, Custom e Motor Local)

### Limitações Conhecidas
- A validação de patentes é baseada em literatura indexada e projetos públicos de hackathons; não substitui busca formal em escritórios de propriedade intelectual.
- O servidor Ollama local requer que o serviço `ollama serve` esteja previamente iniciado na máquina do usuário para testes de modelos locais.
