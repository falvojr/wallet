# 0008. Modelo de domínio: classes de ativos, metas e rebalanceamento passivo

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Negócio

## Contexto

A estratégia buy and hold do projeto distribui aportes periódicos entre classes de ativos com papéis distintos, partindo da segurança em direção ao crescimento.
O modelo de dados precisa refletir essa estratégia sem se tornar um sistema de corretagem.

## Decisão

O domínio é composto por oito classes fixas (`CLASS_KEYS` em `js/state.js`): Reserva de Emergência, Renda Fixa, Ações, FIIs, Stocks, REITs, Reserva de Valor e Bens.

- Cada classe tem `target` (meta percentual na carteira) e `items` (ativos com `id`, `amount` e, opcionalmente, `target` e `note`).
- A Reserva de Emergência usa `goal` (meta em reais) no lugar de meta percentual. Enquanto a meta não for atingida, ela trava todas as outras recomendações de aporte.
- Classes declarativas (Renda Fixa, Reserva de Emergência, Bens) guardam o valor em reais direto no `amount`; as demais guardam quantidade e dependem de cotação.
- Bens e Reserva de Emergência ficam fora do rebalanceamento percentual (`NON_REBALANCED_CLASSES`).
- Um ativo com `target: 0` é ignorado no rebalanceamento (útil para posições em quarentena ou em desinvestimento).
- O rebalanceamento é passivo: nada é vendido para reequilibrar; o próximo aporte é direcionado para a classe e o ativo mais defasados em relação às metas.

## Consequências

- O modelo cabe em um JSON simples, fácil de exportar, importar e editar à mão.
- Adicionar uma nova classe exige mudança de código (chave, ícone, rótulo e descrição), o que é aceitável: a alocação estratégica muda raramente.
- A semântica do `amount` varia por classe (reais ou quantidade); a função `assetValueBRL` centraliza essa regra.
- O significado especial de `target: 0` precisa estar documentado na interface (badge "ignorar") e protegido na normalização.
