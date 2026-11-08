# Status de implementação e checklist de produção

## Integrado nesta entrega
- Código-base dos dois projetos em um único diretório.
- Currículo/Professional Intelligence como primeira tela.
- Curadoria de repositórios posicionada como segunda etapa.
- Hackmind acessível pelo novo item de navegação.
- Rotas do motor Hackmind e provedores adicionadas ao servidor principal.
- README refeito em português.

## Ainda exige implementação e credenciais antes de vender
- Página pública comercial completa e editor visual de identidade/títulos.
- Painel administrativo protegido por autenticação forte e RBAC.
- Banco de dados para usuários, licenças, planos, preços, cupons e auditoria.
- Webhook Kiwify: validar assinatura, identificar evento, conferir pagamento, idempotência, estorno e chargeback.
- Ativação de licença pelo e-mail confirmado no pedido e fluxo de troca obrigatória de senha.
- Checkout dinâmico por plano e URLs editáveis no admin.
- Campanhas promocionais com validade, limite de uso e regras de elegibilidade.
- Upload robusto de diretórios no Android, com preservação de caminhos relativos e relatório de falhas.
- Revisão assistida de README/títulos de cada repositório com diff, backup e aprovação antes de commit.

## Importante
Não publique como SaaS pago até concluir os itens acima e executar testes. Não existe senha padrão embutida nesta entrega. Não coloque tokens NVIDIA/Groq/GitHub ou segredos Kiwify no frontend, README ou Git. O backend deve guardar segredos em variáveis de ambiente ou secret manager.
