# 0006. Recomendação de aporte com limites configuráveis

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Negócio

## Contexto

O badge `aportar` indicava classes e ativos defasados usando heurísticas embutidas no código (a quantidade recomendada variava com o tamanho da lista).
Regras implícitas geram comportamento difícil de explicar e não refletem a preferência de quem usa. A estratégia por trás do badge está na ADR [0008](0008-domain-model-classes-goals-rebalancing.md).

## Decisão

- Limites explícitos nas Configurações: quantidade de classes recomendadas por aporte e de ativos por classe (padrão 1 e 1).
- Mantido o filtro de ruído: só entra na recomendação a classe com defasagem maior que o limiar (o maior entre 0,5 ponto percentual e 10% da meta da classe).
- O Modo Sardinha controla a exibição financeira, inspirado na opção "Exibir financeiro" do Bastter System. Desligado por padrão: preço e variação diária somem, valores em reais são mascarados e a coluna Total vira o percentual do ativo na classe. Quantidades e percentuais bastam para o rebalanceamento; no buy and hold, o preço do dia não deve influenciar a decisão de aporte.

## Consequências

- O comportamento do badge passa a ser transparente e ajustável; o padrão 1/1 maximiza o foco de cada aporte.
- Menos código: duas heurísticas viram um `slice` com o limite configurado.
- A busca de cotações continua necessária mesmo com os valores ocultos, pois os percentuais dependem dela.
- Novas preferências seguem o mesmo caminho: campo em `Settings` (js/state.js), seção no modal de Configurações e leitura direta onde for usada.
