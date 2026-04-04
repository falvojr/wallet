# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local. A proposta é ajudar na organização da carteira, na visualização da diversificação e no acompanhamento de metas de alocação no longo prazo, sem foco em trade ou movimentações frequentes.

> [!NOTE]
> Este projeto é uma interpretação pessoal da estratégia de Buy and Hold, adaptada ao que tem funcionado para mim. Em termos práticos, ao longo da minha jornada de aprendizado, fui felizmente influenciado por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Estratégia e Classes de Ativos

A carteira é organizada em classes com papéis complementares. Cada classe contribui de forma diferente para o equilíbrio entre crescimento, proteção e liquidez:

| Aba no app | Chave interna | Papel na carteira |
|---|---|---|
| Ações | `brStocks` | Participações em empresas na bolsa brasileira (B3). No longo prazo, tendem a superar a inflação por meio de valorização e dividendos. |
| FIIs | `brFiis` | Fundos Imobiliários negociados na B3, que investem em imóveis ou títulos imobiliários. Distribuem rendimentos mensais isentos de IR (por enquanto) para pessoa física. |
| Stocks | `usStocks` | Ações de empresas nas bolsas americanas (NYSE, Nasdaq). Dão exposição ao dólar e acesso a setores como tecnologia, saúde e consumo global. |
| REITs | `usReits` | Real Estate Investment Trusts, os equivalentes americanos dos FIIs. Investem em imóveis como data centers, hospitais e galpões, com dividendos regulares. |
| Renda Fixa | `fixedIncome` | Títulos como CDBs, LCIs, LCAs e Tesouro Direto. Oferecem previsibilidade e proteção, sendo a base de segurança da carteira. |
| Reserva de Valor | `storeOfValue` | Ativos que preservam valor no longo prazo, como Bitcoin e ouro. Servem como proteção contra desvalorização cambial e instabilidade monetária. |
| Reserva de Emergência | `emergencyReserve` | Reserva com liquidez imediata, geralmente de 6 a 12 meses do custo de vida. Deve ficar em ativos seguros e de resgate rápido, como Tesouro Selic ou CDB com liquidez diária. |
| Bens | `assets` | Bens patrimoniais, como imóveis de uso pessoal e veículos. Compõem o patrimônio total, mas não fazem parte da estratégia de aporte. |

### Metas e Rebalanceamento

Cada classe, com exceção da **Reserva de Emergência**, pode receber uma **meta percentual** que define sua participação ideal na carteira. A soma dessas metas deve ser 100%. A **Reserva de Emergência** funciona de forma diferente: ela possui uma **meta em valor absoluto (R$)**. Enquanto essa meta não for atingida, a aplicação prioriza aportes nela antes de qualquer outra classe.

Dentro de cada classe, os ativos individuais também podem ter **metas internas** (% dentro da classe). Ativos sem meta definida dividem o espaço igualmente; ativos com meta 0 são ignorados no rebalanceamento.

## Estrutura do `portfolio.json`

O arquivo `portfolio.json` é o formato de importação e exportação da carteira. Cada classe é representada por um objeto com `items` (lista de ativos), `target` (meta em %) e `goal` (meta em R$, usada pela Reserva de Emergência).

Cada ativo possui `id` (nome ou ticker) e `amount` (quantidade ou valor). Opcionalmente, pode ter `target` (meta % dentro da classe) e `note` (comentário livre).

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
````

Exemplo com dados fictícios:

```json
{
  "brStocks": {
    "target": 10,
    "items": [
      { "id": "WEGE3", "amount": 1, "note": "Exemplo de ação brasileira para crescimento e dividendos no longo prazo." }
    ]
  },
  "brFiis": {
    "target": 10,
    "items": [
      { "id": "KNRI11", "amount": 1, "note": "Exemplo de FII da B3 com renda recorrente e exposição imobiliária." }
    ]
  },
  "usStocks": {
    "target": 10,
    "items": [
      { "id": "AAPL", "amount": 1, "note": "Exemplo de ação americana com exposição ao dólar e a empresas globais." }
    ]
  },
  "usReits": {
    "target": 10,
    "items": [
      { "id": "O", "amount": 1, "note": "Exemplo de REIT para diversificação internacional com foco em imóveis." }
    ]
  },
  "fixedIncome": {
    "target": 50,
    "items": [
      { "id": "CDB", "amount": 15000, "note": "Exemplo de Renda Fixa como base de segurança da carteira." }
    ]
  },
  "storeOfValue": {
    "target": 10,
    "items": [
      { "id": "BTC", "amount": 0.0021, "note": "Exemplo de Reserva de Valor com alocação pequena e fracionada." }
    ]
  },
  "emergencyReserve": {
    "goal": 30000,
    "items": [
      { "id": "Tesouro Selic", "amount": 30000, "note": "Exemplo de Reserva de Emergência para 6 a 12 meses do custo de vida." }
    ]
  },
  "assets": {
    "items": [
      { "id": "Apartamento", "amount": 115000, "note": "Exemplo de bem patrimonial, geralmente sem meta específica." }
    ]
  }
}
```

Classes ausentes no JSON são tratadas como vazias. Os campos `target` e `goal` são opcionais e assumem 0 quando omitidos.

## Cotações

A aplicação busca cotações automaticamente usando tokens gratuitos de duas APIs:

* **[brapi.dev](https://brapi.dev)** para ações e FIIs brasileiros
* **[Finnhub](https://finnhub.io)** para ações e REITs americanos

Ativos de **Reserva de Valor** (como BTC) são consultados primeiro via [AwesomeAPI](https://economia.awesomeapi.com.br) e, se não forem encontrados, via Finnhub.

Ativos de **Renda Fixa**, **Reserva de Emergência** e **Bens** não possuem cotação automática. Nesses casos, o campo `amount` representa diretamente o valor em reais.

## Como usar

A aplicação está disponível em **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**.

Ela funciona **100% local**, sem backend. Seus dados ficam apenas no navegador (`localStorage`) e nunca são enviados a servidores.

1. Acesse a aplicação.
2. Importe ou arraste seu `portfolio.json`.
3. Configure os tokens de cotação em ⚙️ para buscar preços automaticamente.
4. Use a aba **Metas** para acompanhar a diversificação entre classes e definir metas.
5. Revise a carteira periodicamente como apoio visual à organização patrimonial e à tomada de decisão nos aportes.

## Stack

* HTML, CSS e JavaScript puros (ES2023+, sem build step)
* [D3.js](https://d3js.org) para o gráfico de bolhas
* [Lucide](https://lucide.dev) para ícones
* PWA com Service Worker para uso offline
