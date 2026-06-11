# 0006. Recomendação de aporte com limites configuráveis

Data: 2026-06-11
Status: Aceita

## Contexto

O marcador "Aportar" indicava classes e ativos defasados usando heurísticas embutidas no código (quantidade recomendada variava com o tamanho da lista).
Regras implícitas geram comportamento difícil de explicar e não refletem a preferência de quem usa.

A estratégia do projeto é o rebalanceamento passivo: nada é vendido para reequilibrar; o aporte novo é direcionado para o que está mais defasado.
A Reserva de Emergência tem prioridade absoluta enquanto a meta em reais não for atingida.

## Decisão

Substituir as heurísticas por limites explícitos nas Configurações: quantidade de classes recomendadas por aporte e de ativos recomendados por classe (padrão 1 e 1).
Manter o filtro de ruído por limiar proporcional (defasagem mínima de 0,5% ou 10% da meta da classe) para evitar recomendações irrelevantes.

Na mesma linha, o Modo Sardinha controla a exibição de preço e variação diária na tabela. Desligado por padrão: no buy and hold, o preço do dia não deve influenciar a decisão de aporte.
Os totais e percentuais continuam visíveis, pois alimentam o rebalanceamento, e a busca de cotações continua necessária mesmo com as colunas ocultas.

## Consequências

- O comportamento do marcador "Aportar" passa a ser transparente e ajustável por quem usa.
- Menos código: duas heurísticas viram um `slice` com o limite configurado.
- O padrão 1 classe / 1 ativo maximiza o foco de cada aporte mensal.
- Novas preferências devem seguir o mesmo caminho: campo em `Settings` (js/state.js), seção no modal de Configurações e leitura direta onde for usada.
