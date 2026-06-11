# 0005. Modais com dialog nativo

Data: 2026-06-11
Status: Aceita
Tipo: Técnica

## Contexto

A primeira implementação dos modais usava `div` com overlay, focus trap manual, handler global de Escape e alternância de `aria-hidden`.
Era código repetitivo, propenso a bugs de foco e duplicava algo que a plataforma já oferece.

## Decisão

Usar o elemento `<dialog>` nativo com `showModal()`. O navegador cuida de focus trap, restauração de foco, tecla Escape, `::backdrop` e semântica ARIA.
O fechamento por clique no backdrop é o único comportamento adicionado (listener compartilhado que fecha quando o alvo do clique é o próprio dialog).
Estado interno de cada modal é limpo no evento `close`.

## Consequências

- Cerca de 60 linhas de infraestrutura removidas, junto com a classe de bugs de foco em modais.
- Dois cuidados de CSS: restaurar o `margin: auto` zerado pelo reset global e manter o conteúdo num wrapper interno (`.modal`) para distinguir clique no backdrop.
