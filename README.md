# Minha Holding

Dashboard pessoal para carteira de investimentos Buy and Hold. Funciona 100% no navegador, sem backend, sem cadastro. Seus dados ficam apenas no seu dispositivo.

> Interpretação pessoal da estratégia de Buy and Hold, influenciada por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

---

## Começando

1. Acesse **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**;
2. Importe o JSON abaixo para criar uma carteira vazia, ou use um backup existente;
3. Em ⚙️, adicione tokens gratuitos do [brapi.dev](https://brapi.dev) e/ou [Finnhub](https://finnhub.io) para cotações;
4. Clique em **Cotar** para buscar preços (ficam em cache por 24h).

Tudo é salvo localmente no navegador. Para backup, exporte o JSON.

> Quer rodar sua própria cópia? Faça fork e ative GitHub Pages, ou rode `npx serve .` localmente.

### Carteira vazia

Copie o JSON abaixo, salve como `portfolio.json` e importe para começar do zero:

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

As metas em `target` (%) podem ser ajustadas livremente, desde que somem 100%. As classes com `target: 0` (como Bens) não participam do rebalanceamento. A Reserva de Emergência usa `goal` (valor fixo em R$) no lugar de meta percentual.

Depois de importar, use o botão **+ Adicionar ativo** dentro de cada classe para incluir seus ativos. Quantidade zero é permitida para reservar posição em ativos que você pretende comprar. Para backup, exporte o JSON a qualquer momento.

---

## Modelo do JSON

Cada classe de ativos tem seus `items` e uma meta de alocação:

| Classe | Chave | Meta | Descrição |
|--------|-------|------|-----------|
| Ações | `brStocks` | `target` (%) | Ações brasileiras (B3) |
| FIIs | `brFiis` | `target` (%) | Fundos Imobiliários |
| Stocks | `usStocks` | `target` (%) | Ações americanas |
| REITs | `usReits` | `target` (%) | REITs americanos |
| Renda Fixa | `fixedIncome` | `target` (%) | CDBs, Tesouro, LCIs/LCAs |
| Reserva de Valor | `storeOfValue` | `target` (%) | Bitcoin, ouro, etc. |
| Reserva de Emergência | `emergencyReserve` | `goal` (R$) | Valor fixo, liquidez imediata |
| Bens | `assets` | `target` (%) | Imóveis, veículos (use `0`) |

### Campos dos ativos

| Campo | Descrição |
|-------|-----------|
| `id` | Ticker (ex: `WEGE3`, `AAPL`) ou nome livre (ex: `Tesouro Selic`) |
| `amount` | Quantidade de cotas, ou valor em R$ para renda fixa, reserva de emergência e bens |
| `target` | Meta % dentro da classe (vazio = distribuição igual, `0` = quarentena) |
| `note` | Comentário pessoal (acessível pelo ícone de comentário ao lado do nome) |

### Exemplo completo

```json
{
  "brStocks": {
    "target": 25,
    "items": [
      { "id": "WEGE3", "amount": 400 },
      { "id": "MGLU3", "amount": 100, "target": 0 }
    ]
  },
  "brFiis": {
    "target": 10,
    "items": [{ "id": "HGLG11", "amount": 55 }]
  },
  "usStocks": {
    "target": 25,
    "items": [
      { "id": "AAPL", "amount": 15 },
      { "id": "NVDA", "amount": 100 }
    ]
  },
  "usReits": {
    "target": 10,
    "items": [{ "id": "O", "amount": 30 }]
  },
  "fixedIncome": {
    "target": 25,
    "items": [
      { "id": "CDB Nubank", "amount": 200000, "note": "Vence em 2029" },
      { "id": "Tesouro Selic", "amount": 50000 }
    ]
  },
  "storeOfValue": {
    "target": 5,
    "items": [
      { "id": "BTC", "amount": 0.21, "target": 95, "note": "Bitcoin" },
      { "id": "GLD", "amount": 1, "target": 5 }
    ]
  },
  "emergencyReserve": {
    "goal": 50000,
    "items": [
      { "id": "Tesouro Selic", "amount": 30000 },
      { "id": "CDB Liquidez Diária", "amount": 15000 }
    ]
  },
  "assets": {
    "target": 0,
    "items": [
      { "id": "Apartamento", "amount": 205000 },
      { "id": "Carro", "amount": 90000 }
    ]
  }
}
```

---

## Funcionalidades

### Metas

Cards de resumo por classe mostrando valor total, alocação atual vs. meta e barra de progresso. A tag `APORTAR` aparece nas classes com maior necessidade de aporte. Classes com meta 0% aparecem por último, em estado desabilitado. A Reserva de Emergência mostra progresso em relação a um valor fixo em R$.

### Carteira

Mapa da carteira em formato de bolhas, onde o tamanho de cada círculo representa a proporção do ativo no portfólio total. Cores indicam a classe do ativo. A legenda lateral permite ocultar classes do gráfico (sem afetar as outras abas) e navegar para a aba correspondente.

### Tabelas de Ativos

Cada classe tem sua aba com tabela completa dos ativos. As colunas são ordenáveis e incluem: nome, quantidade, preço atual, variação do dia, valor total, meta % e ações (comentar e excluir). Todos os campos de quantidade e meta são editáveis inline.

### Rebalanceamento

A tag `APORTAR` aparece nas classes e ativos com maior necessidade de aporte, com base na diferença entre a alocação atual e a meta. O algoritmo usa um limiar proporcional para filtrar desvios irrelevantes e sugere de 1 a 3 ativos por classe. Ativos em quarentena (tag `IGNORAR`) são desconsiderados. O objetivo é apontar onde o portfólio está mais desbalanceado.

### Comentários

Cada ativo tem um botão de comentário na coluna de ações. Clique para adicionar ou editar uma nota pessoal (ex: data de vencimento, rentabilidade). O comentário aparece como tooltip ao passar o mouse.

---

## Tecnologias

Feito com HTML, CSS e JS puros (ES2023+). Sem frameworks, sem backend. Funciona offline via Service Worker.

- [D3.js](https://d3js.org): visualização de dados (bubble chart)
- [Lucide Icons](https://lucide.dev): ícones
- [Google Fonts](https://fonts.google.com): tipografia (Outfit + Plus Jakarta Sans)
- [brapi.dev](https://brapi.dev): cotações B3 (Ações e FIIs)
- [Finnhub](https://finnhub.io): cotações US (Stocks e REITs)
- [AwesomeAPI](https://docs.awesomeapi.com.br): câmbio e criptomoedas
