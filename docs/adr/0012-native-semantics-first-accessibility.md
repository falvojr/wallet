# 0012. Acessibilidade com semântica nativa primeiro

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

Interfaces montadas com `div` clicável funcionam no mouse, mas excluem teclado e leitores de tela. Recriar acessibilidade com ARIA sobre elementos genéricos é mais código e mais frágil do que usar a semântica que o navegador já oferece.

## Decisão

Priorizar elementos nativos e complementar com ARIA apenas onde necessário:

- Todo controle clicável é `<button>` (ordenação de tabela, legenda do gráfico, setas de ordem).
- Modais usam `<dialog>` nativo (ADR [0005](0005-native-dialog-modals.md)).
- Estados expostos via atributos: `aria-sort` nas colunas ordenáveis, `aria-current` na aba ativa, `aria-live` em toasts e loading.
- Rótulos acessíveis (`aria-label`) em controles cujo significado visual é icônico, sempre via i18n.
- Conteúdo auxiliar para leitores de tela com a classe `sr-only`.
- Alvos de toque com mínimo de 40px (`--touch-min`) e foco visível via `:focus-visible`.

## Consequências

- Teclado e leitores de tela funcionam com pouco código extra; o navegador faz o trabalho pesado.
- Novos componentes devem começar pela pergunta "qual elemento nativo faz isso?" antes de partir para `div` + ARIA.
- A navegação por abas usa botões com `aria-current`, uma simplificação consciente do padrão completo de tabs ARIA (`role="tablist"` e gestão de foco por setas), que pode evoluir se necessário.
