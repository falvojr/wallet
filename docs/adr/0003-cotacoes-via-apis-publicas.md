# 0003. Cotações via APIs públicas gratuitas

Data: 2026-06-11
Status: Aceita

## Contexto

O app precisa de preços de ações brasileiras, FIIs, stocks, REITs, moedas e cripto para calcular a alocação real da carteira.
Provedores pagos não se justificam para uso pessoal, e a estratégia buy and hold não exige dados em tempo real.

## Decisão

Buscar cotações diretamente do navegador em três APIs gratuitas:

- brapi.dev para ações e FIIs brasileiros (token do usuário);
- Finnhub para stocks e REITs americanos (token do usuário);
- AwesomeAPI para câmbio USD-BRL e criptomoedas (sem token).

Os tokens ficam no `localStorage` e os preços são cacheados com validade de 24 horas.
Classes declarativas (Renda Fixa, Reserva de Emergência, Bens) não têm cotação: o valor é informado manualmente.

## Consequências

- Custo zero e nenhum segredo no repositório; cada usuário usa seus próprios tokens.
- O pipeline precisa tolerar falhas parciais: erro em um ticker ou no câmbio não pode abortar o restante, e ativo em USD sem taxa de câmbio vale "desconhecido", nunca zero.
- Limites de requisição das APIs gratuitas exigem busca sequencial com pequenos atrasos (Finnhub).
- Mudanças de contrato nas APIs quebram a busca silenciosamente; o cache e o aviso de cotações desatualizadas reduzem o impacto.
