# Architecture Decision Records (ADRs)

Registro das decisões de arquitetura do projeto, no formato proposto por Michael Nygard: contexto, decisão e consequências.

Uma ADR descreve uma decisão tomada e o porquê. Decisões superadas não são apagadas: o status muda para "Substituída" com link para a nova.

## Índice

| ADR | Título | Status |
| --- | --- | --- |
| [0001](0001-html-css-js-puros-sem-build.md) | HTML, CSS e JavaScript puros, sem build step | Aceita |
| [0002](0002-persistencia-local-com-localstorage.md) | Persistência local com localStorage | Aceita |
| [0003](0003-cotacoes-via-apis-publicas.md) | Cotações via APIs públicas gratuitas | Aceita |
| [0004](0004-pwa-com-service-worker-cache-first.md) | PWA com Service Worker cache-first | Aceita |
| [0005](0005-modais-com-dialog-nativo.md) | Modais com dialog nativo | Aceita |
| [0006](0006-recomendacao-de-aporte-configuravel.md) | Recomendação de aporte com limites configuráveis | Aceita |
| [0007](0007-i18n-centralizada.md) | Strings de interface centralizadas (i18n) | Aceita |
| [0008](0008-modelo-de-dominio-classes-metas-rebalanceamento.md) | Modelo de domínio: classes de ativos, metas e rebalanceamento passivo | Aceita |
| [0009](0009-renderizacao-declarativa-com-template-literals.md) | Renderização declarativa com template literals e innerHTML | Aceita |
| [0010](0010-delegacao-de-eventos-com-data-attributes.md) | Delegação de eventos com data-attributes | Aceita |
| [0011](0011-material-design-3-com-design-tokens.md) | Material Design 3 como referência visual, com design tokens em CSS | Aceita |
| [0012](0012-acessibilidade-com-semantica-nativa.md) | Acessibilidade com semântica nativa primeiro | Aceita |
| [0013](0013-convencoes-de-codigo.md) | Convenções de código e estilo | Aceita |

## Como criar uma nova ADR

1. Copie o modelo abaixo para `NNNN-titulo-curto.md`, usando o próximo número sequencial.
2. Preencha as seções e adicione a linha correspondente no índice acima.

```markdown
# NNNN. Título

Data: AAAA-MM-DD
Status: Proposta | Aceita | Substituída por [NNNN](NNNN-x.md)

## Contexto

Qual problema ou força motivou a decisão.

## Decisão

O que foi decidido, de forma afirmativa.

## Consequências

O que melhora, o que piora e quais cuidados passam a existir.
```
