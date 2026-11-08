# ForgeLab Studio

ForgeLab Studio reúne três projetos-fonte em um único repositório, com identidade e portal público próprios:

- `modules/github-intelligence/` — inteligência de GitHub, análise de repositórios, perfil profissional e segurança.
- `modules/ziptogit/` — inspeção de ZIPs, estrutura de arquivos, análise de arquitetura e operações com GitHub.
- `modules/hackmind/` — geração e avaliação de ideias, hipóteses e planos para hackathons.

O código dos três módulos foi mantido dentro de suas pastas originais. Como usam dependências, APIs e servidores próprios, cada módulo é compilado como serviço separado e publicado sob um caminho do mesmo domínio.

## Portal público

- `/` — apresentação completa do ForgeLab Studio.
- `/apresentacao` — apresentação institucional.
- `/venda` — informações comerciais (preços e checkout dependem de configuração real).
- `/login` — entrada de usuários (a autenticação de usuários/licenças ainda precisa ser conectada).
- `/admin/login` — login administrativo, acessível diretamente.
- `/admin` — rota administrativa protegida por sessão assinada.

A apresentação pública contém somente a marca e o acesso de usuário. Não há link administrativo no menu público.

## Executar localmente

Requisitos: Node.js 20 ou superior.

```bash
npm start
```

Abra `http://localhost:4173`.

O portal local serve a apresentação e as telas de acesso. Para executar os módulos técnicos localmente, consulte o README e o `.env.example` de cada pasta.

## Deploy multi-service no Vercel

O `vercel.json` define quatro serviços no mesmo projeto/domínio:

| Serviço | Caminho público |
|---|---|
| `portal` | `/`, `/apresentacao`, `/venda`, `/login`, `/admin/*` |
| `github-app` | `/github/*` e `/api/*` |
| `ziptogit` | `/ziptogit/*` |
| `hackmind` | `/hackmind/*` |

Os serviços não têm bindings entre si porque os módulos não fazem chamadas servidor-a-servidor uns aos outros. As chamadas dos navegadores são roteadas pelos caminhos públicos de cada serviço. O `api-server` original do workspace GitHub Intelligence permanece preservado no código-fonte; a aplicação `github-app` mantém seu servidor Express próprio e suas rotas `/api`.

Configure no Vercel, em **Settings → Environment Variables**:

```text
ADMIN_EMAIL=seu-email-administrativo
ADMIN_PASSWORD=uma-senha-forte-e-unica
ADMIN_SESSION_SECRET=segredo-aleatorio-com-pelo-menos-32-caracteres
```

Use valores próprios. Não publique credenciais no GitHub. Depois de alterar variáveis, faça novo deploy. O login administrativo usa cookie `HttpOnly`, `SameSite=Strict` e assinatura HMAC. A autenticação de usuários comuns, banco de dados, licenças, clientes, checkout e pagamentos ainda precisam de integração. Até essa autenticação ser conectada, os caminhos técnicos `/github/`, `/ziptogit/` e `/hackmind/` não devem ser considerados áreas privadas; restrinja-os no Vercel se o acesso precisar ser exclusivo.

### Variáveis dos módulos

Configure somente os provedores que for utilizar. Exemplos:

- `GITHUB_TOKEN` / OAuth GitHub conforme o fluxo escolhido.
- `GEMINI_API_KEY` para funções que utilizam Gemini.
- `GROQ_API_KEY`, `NVIDIA_NIM_API_KEY` / `NVIDIA_API_KEY` e `AI_DEFAULT_PROVIDER` / `AI_DEFAULT_MODEL` conforme o módulo que utilizar.
- Credenciais de banco de dados exigidas pelo workspace GitHub Intelligence.

Não coloque chaves em variáveis `VITE_*` ou no código do navegador.

## Uso do currículo

O currículo é opcional e serve somente como contexto privado para comparar competências declaradas com evidências verificáveis dos repositórios. A interface de criação/otimização de currículo foi retirada do fluxo do usuário. O sistema não deve inventar habilidades, cargos, senioridade, anos de experiência ou métricas, nem publicar o currículo no GitHub.

## Direitos autorais e licenças\n\nNão foi criada uma licença única que substitua os direitos dos projetos originais. Avisos de autoria, copyright e licenças de terceiros são preservados. Consulte `docs/LICENCAS-E-DIREITOS.md`.\n\n## Segurança e engenharia reversa

Os scanners ajudam a encontrar achados dentro da cobertura das regras e ferramentas configuradas; não garantem detectar ou remover todas as vulnerabilidades. Correções devem ser testadas e aprovadas antes da publicação.

A análise de ZIP/APK deve ocorrer somente em materiais próprios ou autorizados. A função de engenharia reversa é orientada a inventário e reconstrução clean-room com implementação original. Avisos de autoria e licenças de terceiros devem ser preservados; não se removem créditos ou direitos autorais de código alheio.

## Garantia e condições comerciais

A apresentação informa a garantia de 7 dias solicitada pelo responsável. Antes de ativar checkout, publique os termos completos de elegibilidade, contagem do prazo, canal de solicitação e reembolso. Preços, planos e meios de pagamento não foram inventados nem ativados.

## Estado de validação

Foram realizadas verificações estáticas de arquivos, rotas do portal, sintaxe JSON, estrutura dos módulos e integridade do ZIP. O deploy multi-service deve ser validado no ambiente Vercel com suas dependências, variáveis e limites reais. Não se declara autenticação de usuários, cobrança ou integração comercial concluída.

## Administração, usuários, preço e integrações (portal Vercel)

O portal inclui painel administrativo em `/admin`, login administrativo em `/admin/login`, login de usuários em `/login` e área do usuário em `/painel`.

### Persistência obrigatória (Supabase)

Os dados de usuários, preço e configurações não são gravados no disco da Vercel. Para persistência entre deploys, configure um projeto Supabase:

1. Crie um projeto Supabase.
2. Abra **SQL Editor** e execute `database/schema.sql`.
3. Em Vercel → Project → Settings → Environment Variables, cadastre:
   - `SUPABASE_URL`: URL do projeto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role` (somente no servidor; nunca use `anon` aqui).
   - `ADMIN_EMAIL`: e-mail de administrador.
   - `ADMIN_PASSWORD`: senha forte do administrador.
   - `ADMIN_SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres.
   - `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres para tokens de usuário.
   - `APP_ENCRYPTION_KEY`: segredo aleatório para criptografar o segredo do webhook armazenado no banco.
4. Faça um novo deploy.

Gere segredos aleatórios com `openssl rand -hex 32`. Não coloque valores reais no GitHub. A chave `service_role` do Supabase deve ficar exclusivamente nas variáveis de ambiente do servidor.

### Recursos administrativos

- `/admin`: visão geral, gestão de usuários, plano e licença, preço único ativo, pagamento/webhook, JWT, Google e SEO.
- Usuários podem ser criados manualmente pelo administrador. Plano: gratuito, Premium mensal ou Premium vitalício; status: ativo ou suspenso.
- O preço público tem uma única oferta ativa: mensal recorrente **ou** pagamento único vitalício. A página `/apresentacao` e `/venda` carrega a configuração publicada pelo painel.
- Webhook genérico: `POST /api/webhooks/payment`, assinatura no cabeçalho `X-ForgeLab-Signature: sha256=<HMAC_SHA256_do_corpo>`. O corpo deve conter `type` e `data.email`. Eventos de pagamento aprovado suportados: `payment.paid`, `subscription.activated`, `checkout.session.completed`. Cancelamento/reembolso: `payment.refunded`, `subscription.cancelled`, `subscription.expired`.
- O endpoint não substitui a configuração do gateway. Cadastre a URL no provedor e adapte o payload do provedor para o formato documentado. O checkout externo só é aberto se uma URL for configurada no preço.
- Parâmetros `iss`, `aud`, validade e renovação JWT são configuráveis no painel. Os segredos de assinatura permanecem em variáveis de ambiente.
- Google Analytics 4, Tag Manager, Search Console e metadados SEO são publicados nas páginas públicas após salvar as configurações.

### Observações de segurança

- Não exponha `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ADMIN_SESSION_SECRET`, `APP_ENCRYPTION_KEY`, tokens do GitHub ou chaves de IA no navegador.
- O webhook genérico requer assinatura HMAC válida e usuário previamente cadastrado.
- A ativação mensal inicial utiliza um período aproximado de 31 dias; ajuste a lógica do webhook ao ciclo de cobrança e aos eventos reais do gateway antes de produção comercial.
- Configure termos, cancelamento, reembolso, política de privacidade e consentimento de Analytics antes de abrir vendas.
- As rotas dos três módulos agora verificam o cookie JWT do ForgeLab e exigem plano `monthly` ou `lifetime`. Contas gratuitas podem entrar no painel, mas são encaminhadas à página de planos ao tentar abrir os módulos Premium. O middleware valida assinatura e expiração do token; suspensão administrativa passa a valer assim que o token atual expirar (ou no próximo refresh/login).
