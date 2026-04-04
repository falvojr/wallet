# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local.

A proposta é ajudar na organização da carteira, na visualização da diversificação e no acompanhamento de metas de alocação no longo prazo, sem foco em trade ou movimentações frequentes.

> Interpretação pessoal da estratégia de Buy and Hold, influenciada por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Estratégia e Classes de Ativos

A carteira é organizada em classes com papéis complementares. Cada classe contribui de forma diferente para o equilíbrio entre crescimento, proteção e liquidez:

| Aba no app | Chave interna | Papel na carteira |
|---|---|---|
| Ações | `brStocks` | Crescimento patrimonial via empresas brasileiras na B3 |
| FIIs | `brFiis` | Renda passiva e diversificação imobiliária |
| Stocks | `usStocks` | Exposição ao dólar e a setores globais |
| REITs | `usReits` | Diversificação imobiliária internacional |
| Renda Fixa | `fixedIncome` | Estabilidade, previsibilidade e proteção |
| Reserva Valor | `storeOfValue` | Proteção patrimonial de longo prazo (ouro, Bitcoin) |
| Reserva Emergência | `emergencyReserve` | Liquidez imediata para imprevistos |
| Bens | `assets` | Visão patrimonial completa (imóveis, veículos), fora do rebalanceamento |

### Metas e Rebalanceamento

Cada classe (exceto Bens e Reserva de Emergência) recebe uma **meta percentual** que define sua participação ideal na carteira. A soma das metas deve ser 100%.

A **Reserva de Emergência** funciona de forma diferente: possui uma **meta em reais** (valor absoluto). Enquanto essa meta não for atingida, a aplicação prioriza aportes nela antes de qualquer outra classe.

Dentro de cada classe, ativos individuais também podem ter **metas internas** (% na classe). Ativos sem meta definida dividem o espaço igualmente; ativos com meta 0 são ignorados no rebalanceamento.

## Estrutura do `portfolio.json`

O arquivo `portfolio.json` é o formato de importação e exportação da carteira. Cada classe é representada por um objeto com `items` (lista de ativos), `target` (meta %) e `goal` (meta em R$, usado pela Reserva de Emergência).

Cada ativo possui `id` (nome ou ticker) e `amount` (quantidade ou valor). Opcionalmente, `target` (meta % na classe) e `note` (comentário livre).

Modelo mínimo:

```json
{
  "brStocks":         { "target": 0, "goal": 0, "items": [] },
  "brFiis":           { "target": 0, "goal": 0, "items": [] },
  "usStocks":         { "target": 0, "goal": 0, "items": [] },
  "usReits":          { "target": 0, "goal": 0, "items": [] },
  "fixedIncome":      { "target": 0, "goal": 0, "items": [] },
  "storeOfValue":     { "target": 0, "goal": 0, "items": [] },
  "emergencyReserve": { "target": 0, "goal": 0, "items": [] },
  "assets":           { "target": 0, "goal": 0, "items": [] }
}
```

Exemplo com dados fictícios:

```json
{
  "brStocks": {
    "target": 30,
    "goal": 0,
    "items": [
      { "id": "ITSA4", "amount": 100 },
      { "id": "WEGE3", "amount": 50, "target": 60, "note": "Posição principal" }
    ]
  },
  "brFiis": {
    "target": 15,
    "goal": 0,
    "items": [
      { "id": "HGLG11", "amount": 10 }
    ]
  },
  "usStocks": {
    "target": 20,
    "goal": 0,
    "items": [
      { "id": "MSFT", "amount": 3 }
    ]
  },
  "usReits": {
    "target": 5,
    "goal": 0,
    "items": [
      { "id": "O", "amount": 5 }
    ]
  },
  "fixedIncome": {
    "target": 20,
    "goal": 0,
    "items": [
      { "id": "Tesouro Selic", "amount": 15000 },
      { "id": "CDB Nubank", "amount": 5000, "note": "Vence em 2027, 120% CDI" }
    ]
  },
  "storeOfValue": {
    "target": 10,
    "goal": 0,
    "items": [
      { "id": "BTC", "amount": 3000 }
    ]
  },
  "emergencyReserve": {
    "target": 0,
    "goal": 18000,
    "items": [
      { "id": "Caixa de emergência", "amount": 12000 }
    ]
  },
  "assets": {
    "target": 0,
    "goal": 0,
    "items": [
      { "id": "Carro", "amount": 45000 }
    ]
  }
}
```

Classes ausentes no JSON são tratadas como vazias. Campos `target` e `goal` são opcionais e assumem 0 quando omitidos.

## Cotações

A aplicação busca cotações automaticamente usando tokens gratuitos de duas APIs:

- **[brapi.dev](https://brapi.dev)** para ações e FIIs brasileiros.
- **[Finnhub](https://finnhub.io)** para ações e REITs americanos.

Ativos de Reserva de Valor (como BTC) são consultados primeiro via [AwesomeAPI](https://economia.awesomeapi.com.br) e, se não encontrados, via Finnhub.

Ativos de Renda Fixa, Reserva de Emergência e Bens não possuem cotação automática: o campo `amount` representa diretamente o valor em reais.

## Como usar

A aplicação está disponível em **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**.

Funciona **100% local**, sem backend. Seus dados ficam apenas no navegador (localStorage) e nunca são enviados a servidores.

1. Acesse a aplicação.
2. Importe ou arraste seu `portfolio.json`.
3. Configure os tokens de cotação em ⚙️ para buscar preços automaticamente.
4. Use a aba **Metas** para acompanhar a diversificação entre classes e definir metas.
5. Revise a carteira periodicamente como apoio visual para aportes e organização patrimonial.

## Stack

- HTML, CSS e JavaScript puros (ES2023+, sem build step)
- [D3.js](https://d3js.org) para o gráfico de bolhas
- [Lucide](https://lucide.dev) para ícones
- PWA com Service Worker para uso offline
