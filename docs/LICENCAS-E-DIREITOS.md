# Direitos autorais, atribuição e licenças

O ForgeLab Studio reúne três bases de código independentes. Não foi atribuída uma licença única a todos os módulos porque isso poderia substituir ou conflitar com direitos de autores e dependências originais.

## Situação observada nos arquivos recebidos

- O workspace `modules/github-intelligence` declara `MIT` no `package.json` da raiz do workspace; não foi encontrado um arquivo `LICENSE` no pacote.
- `modules/ziptogit` não declara licença no `package.json` e não contém arquivo `LICENSE`; o README foi corrigido para não afirmar MIT sem base.
- `modules/hackmind` não declara licença no `package.json` e não contém arquivo `LICENSE`.
- As licenças de dependências npm/pnpm continuam sendo regidas pelos respectivos pacotes e seus avisos.

## Regras aplicadas

- Avisos de copyright, autoria, atribuição, marcas e licenças existentes devem ser preservados.
- O gerador de README não deve declarar MIT (ou qualquer outra licença) automaticamente.
- Se um projeto não contiver arquivo `LICENSE`, a documentação deve indicar que a licença não foi especificada e solicitar confirmação dos direitos antes de redistribuição.
- A substituição do nome do projeto não pode alterar linhas de copyright, atribuição ou licença.
- Não remover créditos para ocultar a origem de software de terceiros.
- Não copiar código, marca, identidade visual ou ativos proprietários de produtos de terceiros.
- A análise de ZIP/APK deve ser feita somente com autorização do titular.

## Licenciamento futuro

Antes de publicar o repositório publicamente, revise os arquivos de licença e avisos de cada módulo e das dependências. Uma licença para o portal ForgeLab de autoria própria pode ser definida separadamente, mas não deve ser aplicada retroativamente ao código de terceiros.
