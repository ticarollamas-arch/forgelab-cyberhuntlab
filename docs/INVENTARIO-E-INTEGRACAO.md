# Inventário técnico e integração inicial

## Arquivos recebidos e preservação

1. `GitHub-Intelligence-Career-Suite.zip` — preservado em `modules/github-intelligence/` como aplicação principal. É um workspace pnpm com `artifacts/github-intelligence`, `artifacts/api-server`, bibliotecas e arquivos de projeto. A pasta `.git` foi removida apenas para não distribuir histórico/configuração local; o código de trabalho foi mantido.
2. `ziptogithub.zip` — preservado em `modules/ziptogit/`, incluindo frontend React/Vite, serviço GitHub, visualizador de árvore e preview de arquivos.
3. `Gerador-Ideias-Hackathons--main.zip` — preservado em `modules/hackmind/`, incluindo backend, frontend e provedores (Ollama, NVIDIA NIM, Groq, OpenAI-compatible e engine determinística).

## Decisões de arquitetura

- O GitHub Intelligence é a base de Career & GitHub Intelligence. Não foi criado um clone nem removida sua aplicação.
- ZIPTOGIT e Hackmind continuam isolados como módulos independentes. Seus runtimes e dependências são diferentes; tentar colar os três frontends em uma única SPA sem adaptar APIs quebraria os projetos.
- O novo portal apresenta páginas separadas e navegação consistente. As telas de módulo são honestas: apontam para o código preservado, mas não afirmam executar integração ainda inexistente.
- O portal tem servidor Node sem dependências externas e endpoint de saúde limitado ao processo web.

## Riscos observados / revisão necessária no código original

A análise anterior do projeto GitHub Intelligence identificou pontos que exigem revisão funcional antes de declarar pronto:

- `generateProfileOptimizationLocally()` pode sugerir títulos, tecnologias ou badges genéricos. Toda sugestão deve ser vinculada a evidência real ou rotulada como hipótese; nunca publicar automaticamente.
- `auditAndModernizeRealRepo()` / `executeSyncStep()` precisam separar plano, aprovação, execução e confirmação. Contadores não podem aumentar apenas porque uma análise foi realizada.
- `fetchAllGitHubRepos()` possui limite de paginação (5 páginas / 500 repositórios, conforme revisão anterior); a interface deve informar cobertura e permitir continuação quando aplicável.
- Operações de PR/README não equivalem a atualização do perfil até o merge confirmado. Bio e README são recursos distintos.
- Upload de diretórios e ZIPs precisa ser testado em Android e desktop, preservando binários e evitando depender exclusivamente de `webkitdirectory` ou `File.text()`.
- ZIPTOGIT tem limites de leitura/árvore em sua implementação original (revisão anterior: árvore truncada em 150 arquivos e conteúdo de arquivo em 3000 caracteres). A interface deve explicitar limites e permitir análise por etapas, sem afirmar cobertura integral.
- Hackmind possui provedores configuráveis. O provedor determinístico não deve ser confundido com descoberta ao vivo de hackathons. Evento real exige fonte, link, prazo e verificação atual.

## Páginas criadas

- `/` — início
- `/apresentacao` — apresentação
- `/venda` — página comercial sem valores inventados
- `/login` — interface de login de usuário
- `/admin/login` — interface de login administrativo
- `/painel` — painel do usuário
- `/painel/carreira` — evolução profissional
- `/painel/github` — GitHub Intelligence
- `/painel/engenharia` — ZIPTOGIT / engenharia
- `/painel/hackmind` — Hackmind
- `/admin` — painel administrativo

## Critérios de conclusão ainda pendentes

Este pacote não deve ser chamado de produção pronta. Antes de ativar usuários reais, implementar autenticação/RBAC, banco de dados, execução integrada de módulos, GitHub OAuth, upload seguro, processamento de currículo e testes automatizados de ponta a ponta.


## Atualização do portal e deploy

- A página `/` e `/apresentacao` foi refeita como apresentação pública longa, responsiva, com animações leves, metadados SEO, descrição dos três módulos, fluxo de uso, segurança, transparência, FAQ e garantia de 7 dias solicitada pelo responsável.
- O menu público contém somente a marca e o acesso `/login`; não há link administrativo na apresentação.
- A rota `/admin` exige sessão HMAC válida; `/admin/login` é acessível diretamente. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` (mínimo 32 caracteres).
- O fluxo de criação/otimização de currículo e a área de exportação de documentos foram retirados da interface do GitHub Intelligence. O upload do currículo permanece como contexto privado para orientar sugestões de melhoria do GitHub.
- Removido o asset de marca de origem e substituídas referências textuais ao ambiente de autoria por nomes genéricos de integração.
- Os módulos ZIPTOGIT e Hackmind recebem `BASE_PATH` e usam prefixos de API próprios (`/ziptogit/api` e `/hackmind/api`) para evitar colisões com `/api` do GitHub Intelligence.
- `vercel.json` define quatro serviços: portal, github-app, ziptogit e hackmind. Não há bindings internos porque não foram identificadas chamadas servidor-a-servidor entre os módulos.
- O `api-server` original do workspace GitHub Intelligence foi preservado, mas não publicado como quinto serviço: a aplicação `github-app` possui seu próprio servidor e endpoints ativos; publicar ambos em `/api` criaria conflito sem uma decisão de arquitetura adicional.

## Limites legais e funcionais

- A engenharia reversa deve ser autorizada e usada para inventário/arquitetura e reconstrução clean-room. Não remover avisos de copyright, créditos ou licenças de terceiros, nem copiar marca, identidade visual ou ativos proprietários de outros produtos.
- Scanner não garante remoção total de vulnerabilidades. Reportar achados com evidências, cobertura e estado de correção.
- O deploy multi-service está configurado como base de implantação, mas requer validação real no Vercel. Não foi possível executar um deploy de produção a partir deste ambiente.
