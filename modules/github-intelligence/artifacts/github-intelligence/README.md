# GitHub Intelligence Career Suite

Plataforma unificada para alinhar currículo, portfólio GitHub e desenvolvimento de projetos. Esta versão reúne a aplicação **GitHub Auto Modernization Engine** com o motor **Hackmind — Gerador de Ideias para Hackathons**, preservando seus módulos originais.

## Fluxo principal

1. **Currículo e perfil profissional (primeira etapa):** anexe o currículo, revise o perfil e defina a área/cargo-alvo.
2. **Curadoria dos repositórios (segunda etapa):** conecte o GitHub, avalie relevância profissional, riscos, privacidade, README e metadados.
3. **Modernização:** revise as alterações propostas antes de aplicar. Não apague projetos nem funcionalidades automaticamente.
4. **Hackathons e ideias:** pesquisa, geração de hipóteses, comitê adversarial, pontuação, originalidade, plano de MVP e exportação.
5. **Revisão final:** valide o portfólio e os documentos antes de publicar.

## O que foi unificado nesta entrega

- Aplicação principal e componentes originais preservados.
- Currículo/Professional Intelligence definido como tela inicial.
- Menu reordenado para currículo primeiro e curadoria de repositórios em seguida.
- Aplicação Hackmind incorporada como módulo navegável em **Hackathons & Ideias**.
- Rotas backend do Hackmind adicionadas ao servidor principal: provedores, competições, hipóteses, revisão adversarial, plano de execução e exportação Markdown.
- Configuração dos provedores Groq, NVIDIA NIM, Ollama e endpoint OpenAI-compatible mantida no backend.
- README principal refeito com fluxo, instalação, segurança e limitações.

## Relevância profissional e privacidade

A curadoria deve classificar cada repositório como:
- **Alta relevância:** demonstra competências diretamente ligadas ao cargo-alvo.
- **Relevância complementar:** demonstra fundamentos ou competências transferíveis.
- **Baixa relevância:** pouco alinhado ao objetivo atual; pode ser arquivado ou mantido privado após confirmação.
- **Precisa de revisão:** sem evidência suficiente para recomendar uma ação.

**Política de segurança:** nenhuma rotina deve excluir projetos, apagar funcionalidades, alterar visibilidade ou publicar commits sem confirmação explícita. Faça backup antes de aplicar mudanças em lote. Analise segredos antes de publicar e nunca inclua tokens em README, histórico Git ou frontend.

## Instalação

Requisitos: Node.js 20+ (recomendado 22+) e npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:3000`.

Build de produção:

```bash
npm run build
npm start
```

Testes disponíveis:

```bash
npm test
```

## Provedores de IA

Configure no `.env` do servidor:

```env
AI_DEFAULT_PROVIDER=groq
GROQ_API_KEY=
NVIDIA_NIM_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5
CUSTOM_AI_BASE_URL=
CUSTOM_AI_API_KEY=
CUSTOM_AI_MODEL=
```

- **Groq:** use modelos e limites atualmente disponíveis na conta/API. A disponibilidade de um modelo gratuito não é garantida permanentemente.
- **NVIDIA NIM:** requer chave NVIDIA válida; cota/free tier depende das condições atuais da NVIDIA.
- **Ollama:** execução local, sem chave externa.
- **OpenAI-compatible:** endpoint configurável para provedores compatíveis.

As chaves devem permanecer no backend. Não use prefixo `VITE_` em segredos. Não coloque chaves no Git.

## Integrações comerciais — status

Esta unificação de código **não ativa automaticamente** um SaaS comercial. Para produção ainda é necessário implementar e testar:
- autenticação administrativa real, controle de sessão, recuperação e troca de senha;
- persistência de usuários, planos, preços, cupons e licenças em banco de dados;
- webhook Kiwify com validação de assinatura, idempotência e eventos de pagamento/estorno;
- ativação de licença pelo mesmo e-mail confirmado na compra, expiração, renovação e revogação;
- checkout URL por plano, editor de preços/ofertas e publicação da página pública;
- painel admin protegido, logs de auditoria e gestão de permissões;
- testes ponta a ponta de upload de diretórios e seleção de arquivos no Android.

Não existe senha padrão segura para produção. O primeiro administrador deve ser criado por fluxo de configuração seguro e obrigado a trocar a senha. Nunca publique credenciais padrão no repositório.

## Upload de pastas no Android

O navegador Android pode entregar ao seletor de arquivos uma URI de provedor (por exemplo, Google Drive) em vez de um caminho local convencional. O servidor não consegue navegar diretamente pelo Drive do celular. O fluxo deve aceitar seleção múltipla de arquivos/diretórios quando o navegador oferecer suporte, manter a estrutura relativa e exibir erros por arquivo. Se o seletor do aparelho abrir o Drive, selecione os arquivos ou baixe a pasta para o dispositivo antes de enviar; não presuma que uma pasta inteira foi enviada.

## Limitações conhecidas desta entrega

- O módulo Hackmind foi integrado à navegação e às rotas do backend, mas a integração visual/funcional ainda precisa ser validada em build e teste de navegador.
- As funcionalidades de cobrança Kiwify, webhook de produção, licenciamento, cupons e painel administrativo comercial não foram implementadas nesta etapa.
- A análise de relevância e as sugestões de projeto dependem do currículo efetivamente anexado e dos dados dos repositórios conectados.
- A aplicação não deve prometer que todos os READMEs foram reescritos ou que todos os repositórios foram publicados até que cada operação tenha sido executada e confirmada pelo GitHub.

## Estrutura

- `src/` — aplicação principal e módulos de carreira/portfólio.
- `src/hackathons/` — interface Hackmind integrada.
- `hackmind-engine/` — motor, provedores e lógica de hackathons.
- `server.ts` — API principal e rotas integradas.

## Licença

Defina aqui a licença apropriada antes de publicar o repositório publicamente. Revise também as licenças dos componentes e dependências incorporados.
