# Minha Holding

Dashboard pessoal para carteira de investimentos Buy and Hold. Funciona no navegador, sem backend, sem cadastro. Seus dados ficam no seu dispositivo.

## Como usar

1. Acesse **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**
2. Importe o JSON abaixo para criar uma carteira vazia
3. Adicione seus ativos usando o botão **+ Adicionar ativo** em cada classe
4. Em ⚙️, configure tokens gratuitos do [brapi.dev](https://brapi.dev) e/ou [Finnhub](https://finnhub.io) para cotações
5. Clique em **Cotar** para atualizar preços

### Carteira vazia

Salve como `portfolio.json` e importe:

```json
{
  "brStocks":         { "target": 25, "items": [] },
  "brFiis":           { "target": 10, "items": [] },
  "usStocks":         { "target": 25, "items": [] },
  "usReits":          { "target": 10, "items": [] },
  "fixedIncome":      { "target": 25, "items": [] },
  "storeOfValue":     { "target": 5,  "items": [] },
  "emergencyReserve": { "goal": 0,    "items": [] },
  "assets":           { "target": 0,  "items": [] }
}
```

Ajuste as metas (`target`) para somar 100%. A Reserva de Emergência usa `goal` (valor fixo em R$). Classes com `target: 0` (como Bens) não participam do rebalanceamento.

## Funcionalidades

- **Metas**: cards por classe com alocação atual vs. meta e sugestões de aporte
- **Carteira**: mapa de bolhas com proporção de cada ativo. Clique na legenda para ocultar classes
- **Rebalanceamento**: a tag APORTAR indica onde investir. Se a Reserva de Emergência não foi atingida, ela é priorizada
- **Offline**: funciona sem internet após o primeiro acesso

## Tecnologias

HTML, CSS e JS puros (ES2023+). Sem frameworks, sem backend.

- [D3.js](https://d3js.org) · [Lucide Icons](https://lucide.dev) · [Google Fonts](https://fonts.google.com)
- [brapi.dev](https://brapi.dev) · [Finnhub](https://finnhub.io) · [AwesomeAPI](https://docs.awesomeapi.com.br)
