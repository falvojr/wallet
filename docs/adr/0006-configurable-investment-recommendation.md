# 0006. Recomendação de aporte com limites configuráveis

Data: 2026-06-11
Status: Aceita
Tipo: Negócio

## Contexto

O badge `aportar` indicava classes e ativos defasados usando heurísticas embutidas no código (a quantidade recomendada variava com o tamanho da lista).
Regras implícitas geram comportamento difícil de explicar e não refletem a preferência de quem usa. A estratégia por trás do badge está na ADR [0008](0008-domain-model-classes-goals-rebalancing.md).

## Decisão

- Limites explícitos nas Configurações: quantidade de classes recomendadas por aporte e de ativos por classe (padrão 1 e 1).
- Mantido o filtro de ruído: só entra na recomendação a classe com defasagem maior que o limiar (o maior entre 0,5 ponto percentual e 10% da meta da classe).
- O Modo Sardinha controla a exibição de preço e variação diária na tabela. Desligado por padrão: no buy and hold, o preço do dia não deve influenciar a decisão de aporte. Totais e percentuais continuam visíveis, pois alimentam o rebalanceamento.

## Consequências

- O comportamento do badge passa a ser transparente e ajustável; o padrão 1/1 maximiza o foco de cada aporte.
- Menos código: duas heurísticas viram um `slice` com o limite configurado.
- A busca de cotações continua necessária mesmo com as colunas ocultas.
- Novas preferências seguem o mesmo caminho: campo em `Settings` (js/state.js), seção no modal de Configurações e leitura direta onde for usada.
