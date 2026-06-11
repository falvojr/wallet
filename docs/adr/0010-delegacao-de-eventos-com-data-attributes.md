# 0010. Delegação de eventos com data-attributes

Data: 2026-06-11
Status: Aceita

## Contexto

Com a interface re-renderizada via `innerHTML` (ADR [0009](0009-renderizacao-declarativa-com-template-literals.md)), listeners anexados a elementos gerados seriam destruídos a cada render.
Reanexar listeners após cada render seria repetitivo e propenso a vazamentos.

## Decisão

Eventos de elementos dinâmicos usam delegação: listeners únicos em contêineres estáveis (`#panels`, `#tabNav`) identificam o alvo com `closest()` e data-attributes que declaram a intenção:

- `data-goto`: navegar para a aba de uma classe;
- `data-sort`: ordenar a tabela pela coluna;
- `data-toggle-chart`: ocultar ou exibir uma classe no gráfico;
- `data-order-swap`: trocar a ordem de exibição de duas classes;
- `data-add-class`, `data-class`/`data-idx`, `data-note-class`/`data-note-id`: ações sobre ativos.

Elementos estáticos do HTML (botões do header, modais) usam listeners diretos, anexados uma única vez no bootstrap.

## Consequências

- Os listeners sobrevivem a qualquer re-render e não há gestão de ciclo de vida.
- O HTML gerado declara comportamento de forma legível; o JavaScript não conhece a estrutura interna dos templates.
- Os mesmos data-attributes servem de gancho de estilo (ex.: `--card-color` por classe via `[data-goto]`/`[data-tab]`); renomeá-los exige atenção a CSS e JS.
- A ordem das verificações no listener delegado importa quando um elemento carrega mais de um atributo.
