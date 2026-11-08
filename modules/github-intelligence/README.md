# GitHub Intelligence — núcleo do ForgeLab Studio

Este workspace contém a aplicação principal de análise de GitHub e seus pacotes compartilhados.

## Estrutura

- `artifacts/github-intelligence/` — aplicação React/Vite e servidor Express principal.
- `artifacts/api-server/` — serviço API alternativo/preservado do workspace.
- `artifacts/mockup-sandbox/` — ambiente de prototipação preservado.
- `lib/` — clientes, schemas e acesso a dados compartilhados.
- `pnpm-workspace.yaml` — configuração do monorepo.

## Executar o aplicativo principal

Requisitos: Node.js 20+ e pnpm.

```bash
pnpm install
cd artifacts/github-intelligence
PORT=5000 BASE_PATH=/ pnpm dev
```

O aplicativo principal contém o servidor Express e as rotas `/api`. Para produção, o build é executado pelo script do workspace e gera `artifacts/github-intelligence/dist/server.mjs` com os arquivos estáticos em `dist/public`.

## Variáveis

Consulte `artifacts/github-intelligence/.env.example`. Configure somente as chaves necessárias no servidor, nunca no bundle do navegador. Para a integração com GitHub, use o fluxo de token/OAuth e conceda apenas os escopos necessários.

## Uso do currículo

O currículo é opcional e serve somente como contexto privado para orientar a comparação entre competências declaradas e evidências técnicas dos repositórios. A interface de criação/otimização de currículo foi removida. O arquivo não deve ser publicado, comitado ou incluído em READMEs.

## Segurança e publicação

- A análise e a modernização devem ser executadas somente em repositórios autorizados.
- Toda alteração deve ser apresentada como proposta, revisada e aprovada antes de ser publicada.
- Uma Pull Request aberta não equivale a uma alteração já incorporada.
- Achados de segurança precisam conter evidências e cobertura; o scanner não garante eliminar todas as vulnerabilidades.
- A aplicação deve ser configurada com segredos no ambiente do servidor, rate limiting, validação de uploads e logs auditáveis antes de receber usuários reais.

O deploy multi-service no repositório ForgeLab Studio usa o serviço `github-app` no caminho `/github/` e encaminha `/api/*` para este mesmo servidor.
