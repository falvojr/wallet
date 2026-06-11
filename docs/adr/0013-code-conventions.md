# 0013. Convenções de código e estilo

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

Projeto de uma pessoa só, sem linter ou formatador automático (coerente com a ADR [0001](0001-plain-html-css-js-no-build.md)).
Sem registro escrito, cada contribuição (humana ou assistida) tenderia a um estilo diferente.

## Decisão

Manter as convenções operacionais em um único lugar, o [CLAUDE.md](../../CLAUDE.md), com o `.editorconfig` cobrindo o que os editores aplicam sozinhos.
Dois princípios merecem registro aqui:

- Limite de 160 colunas como teto, não meta: comentários de linha única e expressões simples não são quebrados; estruturas com lógica encadeada mantêm indentação convencional.
- Comentários com `//` em linha única e `/* */` em blocos multilinha, sempre com sentenças terminadas em ponto final dentro do limite de 160 colunas. Títulos de seção são comentários `//` curtos, sem separadores decorativos de traços.

## Consequências

- Consistência sem toolchain; o custo é disciplina manual na revisão.
- Regras novas entram no CLAUDE.md, não aqui: esta ADR registra apenas a decisão de documentá-las e onde.
- Se o projeto ganhar mais contribuintes, vale considerar um formatador automático e revisitar esta ADR.
