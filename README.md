# Minha Holding

Dashboard pessoal para carteira de investimentos Buy and Hold. Funciona 100% no navegador, sem backend, sem cadastro. Seus dados ficam apenas no seu dispositivo.

> Interpretação pessoal da estratégia de Buy and Hold, influenciada por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

---

## Começando

1. Acesse **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**
2. Crie seu `portfolio.json` seguindo o modelo abaixo e importe (ou arraste) na tela
3. Em ⚙️, adicione tokens gratuitos do [brapi.dev](https://brapi.dev) e/ou [Finnhub](https://finnhub.io) para cotações
4. Clique em **Cotar** para buscar preços (ficam em cache por 24h)

Tudo é salvo localmente no navegador. Para fazer backup, exporte o JSON.

> Quer rodar sua própria cópia? Faça fork e ative GitHub Pages, ou rode `npx serve .` localmente.

---

## Modelo do JSON

```json
{
  "classTargets": {
    "brStocks": 25, "brFiis": 10, "usStocks": 25,
    "usReits": 10, "fixedIncome": 20, "storeOfValue": 10, "assets": 0
  },
  "brStocks": [
    { "id": "WEGE3", "amount": 400 },
    { "id": "MGLU3", "amount": 100, "target": 0 }
  ],
  "brFiis": [
    { "id": "HGLG11", "amount": 55 }
  ],
  "usStocks": [
    { "id": "AAPL", "amount": 15 },
    { "id": "NVDA", "amount": 100 }
  ],
  "usReits": [
    { "id": "O", "amount": 30 }
  ],
  "fixedIncome": [
    { "id": "CDB Nubank", "amount": 200000, "note": "Vence em 2029" },
    { "id": "Tesouro Selic", "amount": 50000 }
  ],
  "storeOfValue": [
    { "id": "BTC", "amount": 0.21, "target": 95, "note": "Bitcoin" },
    { "id": "GLD", "amount": 1, "target": 5 }
  ],
  "assets": [
    { "id": "Apartamento", "amount": 205000 },
    { "id": "Carro", "amount": 90000 }
  ]
}
```

**Classes disponíveis:** `brStocks` (Ações), `brFiis` (FIIs), `usStocks` (Stocks), `usReits` (REITs), `fixedIncome` (Renda Fixa), `storeOfValue` (Reserva de Valor), `assets` (Bens).

**Campos de cada ativo:**

| Campo | Descrição |
|-------|-----------|
| `id` | Ticker (ex: WEGE3, AAPL) ou nome livre (ex: Tesouro Selic) |
| `amount` | Quantidade de cotas, ou valor em R$ para renda fixa e bens |
| `target` | Meta % dentro da classe. Deixe vazio para distribuir igual, ou 0 para quarentena |
| `note` | Comentário pessoal (aparece ao clicar no nome do ativo) |

---

## Como funciona o rebalanceamento

A tag **aportar** aparece nas classes e ativos onde faz mais sentido aportar, com base na diferença entre a alocação atual e a meta definida.

1. Se uma classe está abaixo da meta por uma margem relevante, ela recebe **aportar**
2. Dentro da classe, os ativos mais distantes da meta individual são priorizados
3. O número de sugestões é limitado (1 a 3) para manter a tela limpa
4. Ativos em quarentena (meta 0%) e classes ocultas são ignorados

O objetivo é apontar rapidamente onde o portfólio está mais desbalanceado, não dizer exatamente quanto aportar.

---

## Tecnologias e referências

Feito com HTML, CSS e JS puros. Sem frameworks, sem backend. Funciona offline via Service Worker.

[Lucide Icons](https://lucide.dev) · [Google Fonts](https://fonts.google.com) · [brapi.dev](https://brapi.dev) · [Finnhub](https://finnhub.io) · [AwesomeAPI](https://docs.awesomeapi.com.br)