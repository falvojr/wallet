# Minha Holding

Dashboard pessoal para carteira de investimentos Buy and Hold.

PWA feito com HTML, CSS e JS puros. Sem backend. Roda no GitHub Pages. Funciona offline.

> Esta solução é uma interpretação pessoal da estratégia de Buy and Hold, influenciada por investidores e educadores como [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

---

## Como usar

```bash
# 1. Fork + GitHub Pages (Settings > Pages > main)
# 2. Ou local:
npx serve .
```

1. Importe seu `portfolio.json` (drag & drop ou botão)
2. Configure tokens gratuitos de API em ⚙️ ([brapi.dev](https://brapi.dev) + [Finnhub](https://finnhub.io))
3. Clique em "Cotar" para atualizar preços
4. Edite ativos e metas, exporte o JSON atualizado

---

## O que faz

- **Visão geral** com gráfico de diversificação e patrimônio total em BRL
- **Cotações automáticas** para Ações BR, FIIs, Ações US, REITs, Cripto, Moedas e ETFs
- **Rebalanceamento**: tag `APORTAR` indica classe e ativo mais defasados em relação à meta
- **Quarentena**: meta 0% exclui o ativo das sugestões de aporte
- **Tema** claro/escuro
- **Offline-first** via Service Worker

---

## Estrutura

```
📁 minha-holding/
├── 📄 index.html           → Página principal
├── 📄 style.css             → Estilos (mobile-first + tema claro/escuro)
├── 📄 app.js                → Entry point (eventos, modais, import/export)
├── 📁 js/
│   ├── 📄 state.js          → Estado global, persistência, tema
│   ├── 📄 calc.js           → Cálculos, metas, rebalanceamento
│   ├── 📄 api.js            → brapi.dev, Finnhub, AwesomeAPI
│   └── 📄 render.js         → Renderização do DOM
├── 📄 sw.js                 → Service Worker
├── 📄 manifest.json         → PWA manifest
└── 📄 portfolio.json        → Exemplo de carteira
```

---

## Formato do JSON

```json
{
  "currency": "BRL",
  "classTargets": {
    "brStocks": 25, "brFiis": 10, "usStocks": 25,
    "usReits": 10, "fixedIncome": 15, "storeOfValue": 5, "realEstate": 10
  },
  "brStocks": [
    { "id": "WEGE3", "amount": 400 },
    { "id": "MGLU3", "amount": 105, "target": 0 }
  ],
  "storeOfValue": [
    { "id": "BTC", "amount": 0.5 },
    { "id": "USD", "amount": 1000 },
    { "id": "GLD", "amount": 10 },
    { "id": "OURO FISICO", "amount": 25000 }
  ],
  "fixedIncome": [
    { "id": "TESOURO SELIC", "amount": 50000 },
    { "id": "RESERVA (BRL)", "amount": 5000 }
  ]
}
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | Ticker, código de moeda ou nome livre |
| `amount` | `number` | Quantidade (cotas) ou valor em BRL (renda fixa, imóveis, espécie) |
| `target` | `number?` | Meta % dentro da classe. Omitido = igual. `0` = quarentena |

`classTargets` define a % desejada de cada classe no portfólio. Omitido = distribuição igual.

---

## Ativos suportados

| Classe | Exemplo | Cotação | Nota |
|--------|---------|---------|------|
| Ações BR | `WEGE3` | brapi.dev | Ticker B3 |
| FIIs | `HGLG11` | brapi.dev | Ticker B3 |
| Ações US | `AAPL` | Finnhub | Ticker NYSE/NASDAQ |
| REITs | `O` | Finnhub | Ticker NYSE/NASDAQ |
| Reserva de Valor | `BTC`, `ETH` | AwesomeAPI | Cripto (par `{ID}-BRL`) |
| Reserva de Valor | `USD`, `EUR` | AwesomeAPI | Moeda estrangeira em espécie |
| Reserva de Valor | `GLD`, `SLV` | Finnhub | ETFs (fallback automático) |
| Reserva de Valor | `OURO FISICO` | -- | Nome livre, `amount` = valor em BRL |
| Renda Fixa | `CDB INTER` | -- | Nome livre, `amount` = valor em BRL |
| Imóveis | `APT CENTRO` | -- | Nome livre, `amount` = valor em BRL |

> Ativos sem cotação disponível usam `amount` como valor declarado em BRL (Renda Fixa, Imóveis e Reserva de Valor).

---

## Regras de rebalanceamento

1. A tag `APORTAR` aparece apenas em classes **abaixo da meta**
2. Com **3+ candidatos** elegíveis, as 2 maiores defasagens recebem tag. Com 2 ou menos, apenas 1
3. A mesma lógica se aplica para ativos dentro de cada classe
4. Ativos em **quarentena** (`target: 0`) são ignorados no cálculo

---

## Tecnologias

[Lucide Icons](https://lucide.dev) · [Google Fonts](https://fonts.google.com) · [brapi.dev](https://brapi.dev) · [Finnhub](https://finnhub.io) · [AwesomeAPI](https://docs.awesomeapi.com.br)
