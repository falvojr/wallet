# 0013. Convenções de código e estilo

Data: 2026-06-11
Status: Aceita

## Contexto

Projeto de uma pessoa só, sem linter ou formatador automático (coerente com a ADR [0001](0001-html-css-js-puros-sem-build.md)).
As convenções precisam estar escritas para que qualquer contribuição, humana ou assistida, mantenha o mesmo estilo.

## Decisão

- Limite de 160 caracteres por linha, registrado no `.editorconfig`. O limite é um teto, não uma meta: comentários de linha única e expressões simples não são quebrados; encadeamentos longos, ternários aninhados e blocos com mais de uma instrução mantêm indentação convencional.
- Indentação de 2 espaços, UTF-8, final de linha LF.
- Nomes semânticos e sem abreviações, em inglês no código; texto de interface em português via i18n.
- Comentários apenas quando agregam contexto técnico ou de negócio que o código não expressa; nada de comentários narrando o óbvio.
- Classes de domínio (`Portfolio`, `Settings`) com campos privados (`#`) para encapsular persistência; funções puras para cálculo.
- Sem otimizações prematuras nem abstrações especulativas: a solução mais simples que resolve o caso real vence.
- Commits pequenos e segmentados por assunto, com mensagem explicando o porquê.

A versão operacional dessas regras vive no [CLAUDE.md](../../CLAUDE.md); esta ADR registra a decisão e o racional.

## Consequências

- Consistência sem toolchain: o custo é disciplina manual na revisão.
- Se o projeto ganhar mais contribuintes, vale revisitar esta ADR e considerar um formatador automático.
