# Architecture Decision Records (ADRs)

Registro das decisões do projeto, no formato proposto por Michael Nygard: contexto, decisão e consequências.

Todas as ADRs vivem nesta pasta, com numeração sequencial única. A separação entre decisões de negócio e técnicas é feita pelo campo **Tipo** no cabeçalho de cada ADR (e na coluna do índice), não por pastas ou sufixos.
Esse é o padrão mais usado na prática (sequência única com categorização leve por metadados, como no formato MADR): dividir em pastas complica a numeração e os links cruzados sem benefício real em um projeto deste tamanho.

Decisões superadas não são apagadas: o status muda para "Substituída" com link para a nova.

## Índice

| ADR | Título | Tipo | Status |
| --- | --- | --- | --- |
| [0001](0001-html-css-js-puros-sem-build.md) | HTML, CSS e JavaScript puros, sem build step | Técnica | Aceita |
| [0002](0002-persistencia-local-com-localstorage.md) | Persistência local com localStorage | Técnica | Aceita |
| [0003](0003-cotacoes-via-apis-publicas.md) | Cotações via APIs públicas gratuitas | Técnica | Aceita |
| [0004](0004-pwa-com-service-worker-cache-first.md) | PWA com Service Worker cache-first | Técnica | Aceita |
| [0005](0005-modais-com-dialog-nativo.md) | Modais com dialog nativo | Técnica | Aceita |
| [0006](0006-recomendacao-de-aporte-configuravel.md) | Recomendação de aporte com limites configuráveis | Negócio | Aceita |
| [0007](0007-i18n-centralizada.md) | Strings de interface centralizadas (i18n) | Técnica | Aceita |
| [0008](0008-modelo-de-dominio-classes-metas-rebalanceamento.md) | Modelo de domínio: classes de ativos, metas e rebalanceamento passivo | Negócio | Aceita |
| [0009](0009-renderizacao-declarativa-com-template-literals.md) | Renderização declarativa com template literals e innerHTML | Técnica | Aceita |
| [0010](0010-delegacao-de-eventos-com-data-attributes.md) | Delegação de eventos com data-attributes | Técnica | Aceita |
| [0011](0011-material-design-3-com-design-tokens.md) | Material Design 3 como referência visual, com design tokens em CSS | Técnica | Aceita |
| [0012](0012-acessibilidade-com-semantica-nativa.md) | Acessibilidade com semântica nativa primeiro | Técnica | Aceita |
| [0013](0013-convencoes-de-codigo.md) | Convenções de código e estilo | Técnica | Aceita |

## Como criar uma nova ADR

1. Copie o modelo abaixo para `NNNN-titulo-curto.md`, usando o próximo número sequencial.
2. Preencha as seções e adicione a linha correspondente no índice acima.

```markdown
# NNNN. Título

Data: AAAA-MM-DD
Status: Proposta | Aceita | Substituída por [NNNN](NNNN-x.md)
Tipo: Negócio | Técnica

## Contexto

Qual problema ou força motivou a decisão.

## Decisão

O que foi decidido, de forma afirmativa.

## Consequências

O que melhora, o que piora e quais cuidados passam a existir.
```
