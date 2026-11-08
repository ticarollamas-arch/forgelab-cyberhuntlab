# Prompt mestre — Página de apresentação do ForgeLab Studio

Crie e mantenha uma página pública longa, responsiva, acessível e orientada à conversão para o **ForgeLab Studio**, com identidade visual própria e conteúdo otimizado para tráfego orgânico relacionado a GitHub Intelligence, otimização de repositórios, AppSec, DevSecOps, análise de ZIP/APK autorizada e hackathons.

## O que o produto é

ForgeLab Studio é uma plataforma modular composta por três projetos:

1. **GitHub Intelligence:** análise de perfil e repositórios autorizados, leitura de evidências técnicas, sugestões de README, organização de metadados, análise de segurança e propostas de modernização.
2. **ZIPTOGIT / Engenharia de software:** upload e inspeção de ZIPs, árvore de arquivos, preview, inventário de dependências e análise arquitetural. APKs só podem ser inspecionados nos limites técnicos e legais do módulo.
3. **Hackmind:** geração e avaliação de hipóteses, planejamento de MVP e apoio à preparação de projetos para hackathons.

## Fluxo de uso

1. O usuário conecta uma conta GitHub ou envia um projeto que tem autorização para analisar.
2. Opcionalmente, anexa um currículo que será usado somente como contexto privado de competências.
3. A IA compara competências declaradas com evidências do código e dos repositórios.
4. O sistema aponta riscos, lacunas, oportunidades e propõe alterações específicas.
5. O usuário revisa os diffs e aprova ou rejeita cada mudança.
6. Somente alterações autorizadas são executadas; o resultado precisa ser verificado depois.

## Conteúdo obrigatório

- Hero com proposta de valor clara e CTA para entrar.
- Explicação dos três módulos e benefícios concretos.
- Seção de segurança explicando detecção de segredos e vulnerabilidades dentro da cobertura das ferramentas.
- Seção explicando o uso do currículo exclusivamente como contexto para otimização do GitHub; não criar, editar ou exportar currículos.
- Fluxo de uso em etapas.
- Transparência sobre evidências, aprovações e limitações.
- Condições de acesso e preços; não inventar valores. Se ainda não definidos, informar que estão em configuração.
- Garantia de 7 dias solicitada pelo proprietário, com aviso de que os termos completos precisam ser publicados antes do checkout.
- FAQ sobre permissões, segurança, currículo, vulnerabilidades, arquivos de terceiros, preços e estado das integrações.
- CTA final e metadados SEO.

## Design

Use uma linguagem visual tecnológica, premium e autoral: fundo escuro, gradientes sutis, tipografia legível, cartões com hierarquia, microinterações e animações discretas. A página deve funcionar em celular e desktop, respeitar `prefers-reduced-motion` e carregar sem dependências pesadas desnecessárias.

## Navegação

A página pública deve exibir somente a marca e o acesso `/login`. Não colocar menu de dashboard, módulos, documentos, PDF ou administração na apresentação. O acesso administrativo é direto por `/admin/login` e nunca deve ser divulgado no menu público.

## Regras de integridade

- Não inventar usuários, vendas, faturamento, depoimentos, avaliações, métricas, clientes, preços ou resultados.
- Não afirmar que o scanner remove todas as vulnerabilidades; apresentar achados, cobertura, severidade, evidências e estado de correção.
- Não inventar competências, certificações, senioridade, cargos, tecnologias ou anos de experiência.
- Não publicar o currículo nem incluí-lo em commits.
- Não executar alterações no GitHub sem autorização explícita e confirmação posterior.
- Não remover avisos de copyright, créditos ou licenças de terceiros.
- Não copiar logotipos, marca, arquivos proprietários ou identidade visual de produtos concorrentes. Recursos semelhantes devem ser implementados com código e design originais.
- Materiais ZIP/APK só devem ser analisados quando o usuário tiver autorização.
- Diferenciar claramente o que está implementado, o que depende de configuração e o que ainda não foi testado.
