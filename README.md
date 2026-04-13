# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local.

O objetivo é organizar a carteira, visualizar a diversificação e acompanhar metas de alocação no longo prazo. Não é uma ferramenta de trade, controle de P&L ou acompanhamento de rentabilidade. O foco está em apoiar a disciplina de aportes regulares e a visão patrimonial de longo prazo.

> [!NOTE]
> Este projeto é uma interpretação pessoal da estratégia de Buy and Hold, adaptada ao que tem funcionado para mim. Ao longo da minha jornada de aprendizado, fui influenciado por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Estratégia

A ideia central é construir patrimônio de forma gradual, com aportes periódicos distribuídos entre classes de ativos que cumprem papéis diferentes. A prioridade parte da segurança e vai em direção ao crescimento:

1. **Reserva de Emergência** vem primeiro. Enquanto não estiver completa, todo aporte vai para ela. É a base de qualquer carteira saudável.
2. **Renda Fixa** oferece previsibilidade e estabilidade, protegendo o patrimônio contra volatilidade.
3. **Ações e FIIs** (Brasil) são o motor de crescimento e renda passiva no mercado local.
4. **Stocks e REITs** (EUA) trazem diversificação geográfica e exposição ao dólar.
5. **Reserva de Valor** (Bitcoin, ouro) serve como proteção contra desvalorização monetária no longo prazo.
6. **Bens** (imóveis, veículos) compõem a visão patrimonial total, mas ficam fora da estratégia de aportes.

Cada classe recebe uma **meta percentual** na carteira. A aplicação compara o percentual atual com a meta e sugere onde aportar. O rebalanceamento é passivo: não se vende para reequilibrar, apenas se direciona o próximo aporte para a classe mais defasada.

## Como usar

A aplicação está disponível em **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**.

Funciona 100% no navegador, sem backend. Seus dados ficam no `localStorage` e nunca são enviados a servidores.

1. Acesse a aplicação e clique em **Criar carteira** (ou **Importar JSON** se já tiver uma).
2. Adicione ativos em cada classe e defina suas metas na aba **Metas**.
3. Configure tokens gratuitos em ⚙️ para buscar cotações automaticamente.
4. Use a aba **Carteira** para visualizar a distribuição do patrimônio.
5. Revise periodicamente para apoiar a decisão de onde aportar.

### Cotações

As cotações são buscadas via APIs gratuitas: [brapi.dev](https://brapi.dev) para ações e FIIs brasileiros, [Finnhub](https://finnhub.io) para Stocks e REITs americanos, e [AwesomeAPI](https://economia.awesomeapi.com.br) para ativos de Reserva de Valor. Classes como Renda Fixa, Reserva de Emergência e Bens não possuem cotação automática: o valor é informado manualmente.

## Formato do `portfolio.json`

A carteira pode ser importada e exportada como JSON. Cada classe é um objeto com `items` (ativos), `target` (meta %) e `goal` (meta em R$, usada pela Reserva de Emergência). Cada ativo tem `id`, `amount`, e opcionalmente `target` e `note`.

```json
{
  "emergencyReserve": {
    "goal": 30000,
    "items": [
      { "id": "CDB", "amount": 30000, "note": "6 meses do custo de vida." }
    ]
  },
  "fixedIncome": {
    "target": 20,
    "items": [
      { "id": "Tesouro Selic", "amount": 15000 }
    ]
  },
  "brStocks": {
    "target": 25,
    "items": [
      { "id": "WEGE3", "amount": 50 },
      { "id": "ITSA4", "amount": 100 }
    ]
  },
  "brFiis": {
    "target": 10,
    "items": [
      { "id": "KNRI11", "amount": 10 }
    ]
  },
  "usStocks": {
    "target": 25,
    "items": [
      { "id": "AAPL", "amount": 5 }
    ]
  },
  "usReits": {
    "target": 10,
    "items": [
      { "id": "O", "amount": 5 }
    ]
  },
  "storeOfValue": {
    "target": 10,
    "items": [
      { "id": "BTC", "amount": 0.02 }
    ]
  },
  "assets": {
    "items": [
      { "id": "Carro", "amount": 45000 }
    ]
  }
}
```

## Stack

* HTML, CSS e JavaScript puros (ES2023+, sem build step)
* [D3.js](https://d3js.org) para o gráfico de bolhas
* [Lucide](https://lucide.dev) para ícones
* PWA com Service Worker para uso offline
