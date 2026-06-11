# 0003. Cotações via APIs públicas gratuitas

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

O app precisa de preços de ações brasileiras, FIIs, stocks, REITs, moedas e cripto para calcular a alocação real da carteira.
Provedores pagos não se justificam para uso pessoal, e a estratégia buy and hold não exige dados em tempo real.

## Decisão

Buscar cotações diretamente do navegador em três APIs gratuitas:

- Ações e FIIs brasileiros: brapi.dev, com token do usuário.
- Stocks e REITs americanos: Finnhub, com token do usuário.
- Câmbio USD-BRL e criptomoedas: AwesomeAPI, sem token.

Os tokens ficam no `localStorage`; os preços ficam em cache e um aviso de desatualização aparece após 24 horas.
Classes declarativas (Renda Fixa, Reserva de Emergência, Bens) não têm cotação: o valor é informado manualmente.

## Consequências

- Custo zero e nenhum segredo no repositório; cada usuário usa seus próprios tokens.
- O pipeline precisa tolerar falhas parciais: erro em um ticker ou no câmbio não pode abortar o restante, e ativo em USD sem taxa de câmbio vale "desconhecido", nunca zero.
- Limites de requisição das APIs gratuitas exigem busca sequencial com pequenos atrasos (Finnhub).
- Mudanças de contrato nas APIs quebram a busca silenciosamente; o cache e o aviso de cotações desatualizadas reduzem o impacto.
