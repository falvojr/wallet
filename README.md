# Minha Holding

PWA para visualização e rebalanceamento de carteira de investimentos pessoal, baseada na estratégia Buy and Hold.

Funciona offline, sem backend, com dados armazenados localmente no navegador.

> Esta solução é uma interpretação pessoal da estratégia de Buy and Hold, influenciada por investidores e educadores como [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Funcionalidades

- **Visão consolidada** do portfólio com gráfico de diversificação e valor total em BRL
- **7 classes de ativos**: Ações BR, FIIs, Ações US, REITs, Renda Fixa, Reserva de Valor e Imóveis
- **Cotações automáticas** via [brapi.dev](https://brapi.dev) (B3), [Finnhub](https://finnhub.io) (US) e [AwesomeAPI](https://docs.awesomeapi.com.br) (câmbio, cripto e moedas)
- **Reserva de Valor inteligente**: detecção automática de criptomoedas (BTC, ETH), moedas estrangeiras (USD, EUR, GBP) e ETFs (GLD, SLV)
- **Metas e rebalanceamento**: defina metas por classe e por ativo, a tag `APORTAR` indica onde alocar o próximo aporte
- **Quarentena**: ativos com meta 0% ficam marcados e são excluídos das sugestões de aporte
- **Tema claro/escuro** com preferência salva localmente
- **Edição inline**: adicione, remova e edite ativos e metas diretamente na interface
- **Import/Export JSON**: importe arrastando um arquivo `.json`, exporte para versionar
- **PWA offline-first**: funciona sem internet após o primeiro acesso

## Setup

1. Faça fork ou clone do repositório
2. Ative o GitHub Pages (Settings > Pages > Source: `main`, pasta `/`)
3. Acesse `https://seu-usuario.github.io/seu-repo/`

Para desenvolvimento local:

```bash
npx serve .
```

## Uso

1. **Importe** seu `portfolio.json` (arraste ou clique em importar)
2. **Configure os tokens** clicando em ⚙️ (ambos são gratuitos)
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
  "storeOfValue": [
    { "id": "BTC", "amount": 0.5 },
    { "id": "USD", "amount": 1000 },
    { "id": "GLD", "amount": 10 }
  ],
  "fixedIncome": [
    { "id": "TESOURO SELIC", "amount": 50000 },
    { "id": "CAIXA (BRL)", "amount": 5000 }
  ]
}
```

### Campos por ativo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Identificador do ativo (ticker, código de moeda ou nome livre) |
| `amount` | number | Quantidade (cotas/unidades) ou valor declarado em BRL (renda fixa/imóveis) |
| `target` | number? | Meta % dentro da classe. Omitido = distribuição igual. `0` = quarentena |

**`classTargets`** define a meta % de cada classe no portfólio total. Se omitido, distribui igualmente entre as classes com ativos.

### Tipos de ativos suportados

| Classe | Exemplos de `id` | Cotação via | Observação |
|--------|-------------------|-------------|------------|
| Ações BR / FIIs | `WEGE3`, `HGLG11` | brapi.dev | Ticker da B3 |
| Ações US / REITs | `AAPL`, `O` | Finnhub | Ticker NYSE/NASDAQ |
| Reserva de Valor | `BTC`, `ETH` | AwesomeAPI | Criptomoedas (par {ID}-BRL) |
| Reserva de Valor | `USD`, `EUR`, `GBP` | AwesomeAPI | Moedas estrangeiras (quantidade em espécie) |
| Reserva de Valor | `GLD`, `SLV`, `IAU` | Finnhub | ETFs de commodities (fallback automático) |
| Renda Fixa | `TESOURO SELIC`, `CDB BANCO X` | -- | Nome livre, `amount` = valor em BRL |
| Imóveis | `APARTAMENTO SP` | -- | Nome livre, `amount` = valor em BRL |

Para **dinheiro em espécie (BRL)**, use a classe Renda Fixa com um nome descritivo (ex: `"id": "CAIXA (BRL)"`) e `amount` como o valor em reais.

### Regras de rebalanceamento

A tag `APORTAR` segue estas regras:

1. **Apenas classes abaixo da meta** recebem a tag. Classes que já atingiram ou ultrapassaram seu objetivo são ignoradas.
2. **Quantidade de tags**: quando existem 3 ou mais candidatos elegíveis, as 2 maiores defasagens recebem tag. Com apenas 2 candidatos, apenas 1 recebe.
3. **Prioridade visual**: a tag primária (âmbar sólido) indica a maior defasagem. A secundária (âmbar outline) indica a segunda.
4. A mesma lógica se aplica dentro de cada classe para os ativos individuais. Ativos em quarentena são ignorados.

## Estrutura do Projeto

```
index.html          HTML principal
style.css           Estilos (mobile-first, tema claro/escuro)
app.js              Entry point (eventos, modais, import/export)
js/
  state.js          Estado, constantes, persistência, tema
  calc.js           Cálculos de valor, metas, rebalanceamento
  api.js            Integração com APIs de cotação
  render.js         Renderização do DOM
sw.js               Service Worker (offline-first)
manifest.json       PWA manifest
portfolio.json      Exemplo de carteira
```

## Tecnologias

- HTML, CSS e JavaScript puros (ES Modules)
- [Lucide Icons](https://lucide.dev) via CDN
- [Google Fonts](https://fonts.google.com) (Outfit + Plus Jakarta Sans)
- APIs gratuitas: brapi.dev, Finnhub, AwesomeAPI
