# 0003. Cotações via APIs públicas gratuitas

- **Data**: 2026-06-18
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

O app precisa de preços de ações brasileiras, FIIs, stocks, REITs, ouro e cripto para calcular a alocação real da carteira.
Provedores pagos não se justificam para uso pessoal, e a estratégia buy and hold não exige dados em tempo real.
Cada integração externa é uma fonte de falha, então quanto menos APIs, melhor.

## Decisão

Buscar cotações direto do navegador em duas APIs gratuitas, escolhidas para cobrir tudo com o mínimo de integrações:

- brapi.dev (com token do usuário): toda a renda variável, brasileira e americana. Cobre ações da B3, FIIs, stocks, REITs e ETFs como o GLD, cada um na sua moeda nativa (BRL ou USD).
- CoinGecko (sem token): cripto e o câmbio USD-BRL. O câmbio é derivado de um ativo de referência cotado nas duas moedas, já que o CoinGecko não expõe um endpoint só de moedas.

A classe do ativo desambígua a fonte, sem nenhuma lista fixa de moedas: as classes de mercado vão sempre para a brapi. Na Reserva de Valor, uma busca por símbolo no CoinGecko separa o que é cripto (o BTC) do que é security (o ETF GLD, que não é reconhecido como moeda e cai na brapi).

Os tokens ficam no `localStorage`; os preços ficam em cache e um aviso de desatualização aparece após 24 horas.
Classes declarativas (Renda Fixa, Reserva de Emergência, Bens) não têm cotação: o valor é informado manualmente.

## Consequências

- Apenas duas integrações e um único token (brapi); cripto e câmbio funcionam sem chave.
- Custo zero e nenhum segredo no repositório; cada usuário usa seu próprio token.
- O pipeline tolera falhas parciais: erro em um ticker ou no câmbio não aborta o restante, e ativo em USD sem taxa de câmbio vale "desconhecido", nunca zero.
- A brapi usa o próprio formato para ações de classe (BRK-B, não BRK.B); a busca tenta a forma com hífen quando a com ponto falha, então qualquer um dos dois formatos cadastrados funciona.
- Mudanças de contrato nas APIs quebram a busca silenciosamente; o cache e o aviso de cotações desatualizadas reduzem o impacto.
