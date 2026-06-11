# 0009. Renderização declarativa com template literals e innerHTML

Data: 2026-06-11
Status: Aceita
Tipo: Técnica

## Contexto

Sem framework reativo (ADR [0001](0001-plain-html-css-js-no-build.md)), a interface precisa de uma forma previsível de refletir o estado sem manipulação imperativa de DOM espalhada pelo código.

## Decisão

A interface é re-renderizada a partir do estado: funções em `js/render.js` montam HTML com template literals e o aplicam via `innerHTML`.
`render()` reconstrói tudo; `renderOverviewOnly()` e `renderChartOnly()` reconstroem painéis específicos quando a mudança é localizada.

Todo dado vindo do usuário (ids de ativos, comentários) passa por `esc()` antes de entrar no HTML. Texto de interface vem de `t()`/`tn()`.

## Consequências

- O fluxo é unidirecional e fácil de raciocinar: muda o estado, chama render, a tela reflete.
- Sem diffing, o re-render descarta estado transitório do DOM (foco, seleção). Edições inline usam o evento `change` e um debounce de salvamento para o re-render não atrapalhar a digitação.
- `esc()` é obrigatório em qualquer interpolação de dado do usuário; esquecer é um risco de injeção de HTML.
- Listeners não podem ser anexados ao HTML gerado, pois seriam perdidos no re-render; ver ADR [0010](0010-event-delegation-with-data-attributes.md).
