# Minha Holding

PWA para visualização e rebalanceamento de carteira de investimentos pessoal, baseada na estratégia Buy and Hold.

Funciona offline, sem backend, com dados armazenados localmente no navegador.

> Esta solução é uma interpretação pessoal da estratégia de Buy and Hold, influenciada por investidores e educadores como [Bastter](https://bastter.com), [Fabio Faria (Canal do Holder)](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Funcionalidades

- **Visão consolidada** do portfólio com gráfico de diversificação e valor total em BRL
- **7 classes de ativos**: Ações BR, FIIs, Ações US, REITs, Renda Fixa, Reserva de Valor e Imóveis
- **Cotações em tempo real** via [brapi.dev](https://brapi.dev) (B3), [Finnhub](https://finnhub.io) (US) e [AwesomeAPI](https://docs.awesomeapi.com.br) (câmbio e cripto)
- **Reserva de Valor inteligente**: busca automática via AwesomeAPI para criptomoedas (BTC, ETH, etc.) e fallback para Finnhub para ETFs (GLD, SLV, etc.)
- **Sistema de metas e rebalanceamento**: defina metas por classe e por ativo, as tags `APORTAR` indicam automaticamente as 2 classes e 2 ativos prioritários para o próximo aporte
- **Quarentena**: ativos com meta 0% ficam marcados e são excluídos das sugestões de aporte
- **Regra de aporte**: classes que já estão acima da meta não recebem sugestão de aporte
- **Classes persistentes**: todas as 7 classes são sempre acessíveis, mesmo quando vazias
- **Tema claro/escuro**: alternável pelo botão no header, com preferência salva localmente
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
  "storeOfValue": [
    { "id": "BTC", "amount": 0.5 },
    { "id": "GLD", "amount": 10 }
  ]
}
```

### Campos por ativo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Identificador do ativo (ticker ou nome livre) |
| `amount` | number | Quantidade (cotas) ou valor declarado (renda fixa/imóveis) |
| `target` | number? | Meta % dentro da classe. Omitido = distribuição igual. `0` = quarentena |

**`classTargets`** define a meta % de cada classe no portfólio total. Se omitido, distribui igualmente entre as classes com ativos.

### Regras de rebalanceamento

A sugestão de aporte segue duas regras simples:

1. **Classe**: as 2 classes com maior diferença positiva entre meta e valor atual recebem a tag `APORTAR`. Classes acima da meta são ignoradas.
2. **Ativo**: dentro de cada classe, os 2 ativos mais defasados em relação à sua meta recebem a tag `APORTAR`. Ativos em quarentena são ignorados.

A primeira tag (vermelha) indica a prioridade máxima. A segunda (amarela) indica o próximo candidato.

### Reserva de Valor

Ativos na classe Reserva de Valor são cotados automaticamente:

- **Criptomoedas** (BTC, ETH, LTC, etc.): buscados na AwesomeAPI via par `{TICKER}-BRL`
- **ETFs de commodities** (GLD, SLV, IAU, etc.): buscados no Finnhub como fallback
- A detecção é automática, sem necessidade de configuração

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
