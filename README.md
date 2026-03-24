# Minha Holding

PWA para visualização e rebalanceamento de carteira de investimentos pessoal. Funciona offline, sem backend, com dados armazenados localmente no navegador.

## Funcionalidades

- **Visão consolidada** do portfólio com gráfico de diversificação e valor total em BRL
- **7 classes de ativos**: Ações BR, FIIs, Ações US, REITs, Renda Fixa, Reserva de Valor e Imóveis
- **Cotações em tempo real** via [brapi.dev](https://brapi.dev) (B3) e [Finnhub](https://finnhub.io) (US), com câmbio USD/BRL e BTC/BRL via [AwesomeAPI](https://docs.awesomeapi.com.br)
- **Sistema de metas e rebalanceamento**: defina metas por classe e por ativo, visualize qual está mais defasado com a tag `APORTAR`
- **Quarentena**: ativos com meta 0% são excluídos do cálculo de rebalanceamento
- **Edição inline**: adicione, remova e edite ativos e metas diretamente na interface
- **Import/Export JSON**: importe sua carteira arrastando um arquivo `.json`, exporte para salvar ou versionar
- **PWA offline-first**: funciona sem internet após o primeiro acesso

## Setup

1. Faça fork ou clone do repositório
2. Ative o GitHub Pages (Settings > Pages > Source: `main`, pasta `/`)
3. Acesse `https://seu-usuario.github.io/seu-repo/`

Para desenvolvimento local, use qualquer servidor HTTP estático:

```bash
npx serve .
```

## Uso

1. **Importe** seu arquivo `portfolio.json` (arraste ou clique em importar)
2. **Configure os tokens** de API clicando em ⚙️ (ambos são gratuitos)
3. **Atualize cotações** clicando em "Cotar"
4. **Edite** ativos e metas clicando em "Editar"
5. **Exporte** o JSON atualizado para versionar no repositório

## Formato do JSON

```json
{
  "currency": "BRL",
  "syncedAt": "2026-03-24",
  "classTargets": {
    "brStocks": 25,
    "brFiis": 10,
    "usStocks": 25,
    "usReits": 10,
    "fixedIncome": 15,
    "storeOfValue": 5,
    "realEstate": 10
  },
  "brStocks": [
    { "id": "WEGE3", "amount": 400 },
    { "id": "MGLU3", "amount": 105, "target": 0 }
  ],
  "brFiis": [],
  "usStocks": [],
  "usReits": [],
  "fixedIncome": [],
  "storeOfValue": [],
  "realEstate": []
}
```

**Campos por ativo:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Identificador do ativo (ticker ou nome) |
| `amount` | number | Quantidade (cotas) ou valor declarado (renda fixa/imóveis) |
| `target` | number? | Meta % dentro da classe. Omitido = distribuição igual. `0` = quarentena |

**`classTargets`** define a meta % de cada classe no portfólio total. Se omitido, distribui igualmente entre as classes ativas.

## Estrutura do Projeto

```
index.html          HTML principal
style.css           Estilos (mobile-first)
app.js              Entry point (eventos, modais, import/export)
js/state.js         Estado, constantes, persistência
js/calc.js          Cálculos de valor, metas, rebalanceamento
js/api.js           Integração com APIs de cotação
js/render.js        Renderização do DOM
sw.js               Service Worker (offline-first)
manifest.json       PWA manifest
portfolio.json      Exemplo de carteira
```

## Tecnologias

- HTML, CSS e JavaScript puros (ES Modules)
- [Lucide Icons](https://lucide.dev) via CDN
- [Google Fonts](https://fonts.google.com) (Outfit + Plus Jakarta Sans)
- APIs gratuitas: brapi.dev, Finnhub, AwesomeAPI
