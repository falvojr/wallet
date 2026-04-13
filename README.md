# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local.

A proposta é ajudar na organização da carteira, na visualização da diversificação e no acompanhamento de metas de alocação no longo prazo, sem foco em trade ou movimentações frequentes.

> [!NOTE]
> Este projeto é uma interpretação pessoal da estratégia de Buy and Hold, adaptada ao que tem funcionado para mim. Em termos práticos, ao longo da minha jornada de aprendizado, fui felizmente influenciado por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Estratégia e Classes de Ativos

A carteira é organizada em classes com papéis complementares, ordenadas da proteção ao crescimento. Cada classe contribui de forma diferente para o equilíbrio entre segurança, crescimento e liquidez:

| Aba no app | Chave interna | Papel na carteira |
|---|---|---|
| Reserva Emergência | `emergencyReserve` | Liquidez imediata para imprevistos (6 a 12 meses do custo de vida) |
| Renda Fixa | `fixedIncome` | Estabilidade, previsibilidade e proteção |
| Ações | `brStocks` | Crescimento patrimonial via empresas brasileiras na B3 |
| FIIs | `brFiis` | Renda passiva e diversificação imobiliária |
| Stocks | `usStocks` | Exposição ao dólar e a setores globais |
| REITs | `usReits` | Diversificação imobiliária internacional |
| Reserva Valor | `storeOfValue` | Proteção patrimonial de longo prazo (ouro, Bitcoin) |
| Bens | `assets` | Visão patrimonial completa (imóveis, veículos), fora do rebalanceamento |

### Metas e Rebalanceamento

Cada classe, exceto Reserva de Emergência e Bens, pode receber uma **meta percentual** que define sua participação ideal na carteira. A soma dessas metas deve ser 100%.

A **Reserva de Emergência** funciona de forma diferente: possui uma **meta em valor absoluto (R$)**. Enquanto essa meta não for atingida, a aplicação prioriza aportes nela antes de qualquer outra classe.

Dentro de cada classe, os ativos individuais também podem ter **metas internas** (% dentro da classe). Ativos sem meta definida dividem o espaço igualmente; ativos com meta 0 são ignorados no rebalanceamento.

## Como usar

A aplicação está disponível em **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**.

Funciona **100% local**, sem backend. Seus dados ficam apenas no navegador (`localStorage`) e nunca são enviados a servidores.

1. Acesse a aplicação.
2. Clique em **Criar carteira** para começar do zero ou **Importar JSON** para carregar uma carteira existente.
3. Adicione ativos em cada classe e defina metas na aba **Metas**.
4. Configure os tokens de cotação em ⚙️ para buscar preços automaticamente.
5. Use a aba **Carteira** para visualizar a distribuição do patrimônio.
6. Revise periodicamente como apoio visual à organização patrimonial e à decisão de aportes.

## Cotações

A aplicação busca cotações automaticamente usando tokens gratuitos de duas APIs:

* **[brapi.dev](https://brapi.dev)** para ações e FIIs brasileiros
* **[Finnhub](https://finnhub.io)** para ações e REITs americanos

Ativos de **Reserva de Valor** (como BTC) são consultados primeiro via [AwesomeAPI](https://economia.awesomeapi.com.br) e, se não forem encontrados, via Finnhub.

Ativos de **Renda Fixa**, **Reserva de Emergência** e **Bens** não possuem cotação automática. Nesses casos, o campo `amount` representa diretamente o valor em reais.

## Estrutura do `portfolio.json`

O arquivo `portfolio.json` é o formato de importação e exportação da carteira. Cada classe é representada por um objeto com `items` (lista de ativos), `target` (meta em %) e `goal` (meta em R$, usada pela Reserva de Emergência).

Cada ativo possui `id` (nome ou ticker) e `amount` (quantidade ou valor). Opcionalmente, pode ter `target` (meta % dentro da classe) e `note` (comentário livre).

Modelo mínimo:

```json
{
  "emergencyReserve": { "goal": 0, "items": [] },
  "fixedIncome":      { "target": 0, "items": [] },
  "brStocks":         { "target": 0, "items": [] },
  "brFiis":           { "target": 0, "items": [] },
  "usStocks":         { "target": 0, "items": [] },
  "usReits":          { "target": 0, "items": [] },
  "storeOfValue":     { "target": 0, "items": [] },
  "assets":           { "target": 0, "items": [] }
}
```

Exemplo com dados fictícios:

```json
{
  "emergencyReserve": {
    "goal": 30000,
    "items": [
      { "id": "CDB", "amount": 30000, "note": "Reserva de Emergência (6 meses do custo de vida)." }
    ]
  },
  "fixedIncome": {
    "target": 20,
    "items": [
      { "id": "Tesouro Selic", "amount": 15000 },
      { "id": "CDB Nubank", "amount": 5000, "note": "Vence em 2027, 120% CDI." }
    ]
  },
  "brStocks": {
    "target": 25,
    "items": [
      { "id": "WEGE3", "amount": 50, "note": "Posição principal." },
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
      { "id": "AAPL", "amount": 5 },
      { "id": "MSFT", "amount": 3 }
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

Classes ausentes no JSON são tratadas como vazias. Os campos `target` e `goal` são opcionais e assumem 0 quando omitidos.

## Stack

* HTML, CSS e JavaScript puros (ES2023+, sem build step)
* [D3.js](https://d3js.org) para o gráfico de bolhas
* [Lucide](https://lucide.dev) para ícones
* PWA com Service Worker para uso offline
