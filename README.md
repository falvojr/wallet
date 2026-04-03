# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local.
A proposta do projeto é ajudar na organização da carteira, na visualização da diversificação e no acompanhamento de metas de alocação no longo prazo, sem foco em trade ou movimentações frequentes.

> Interpretação pessoal da estratégia de Buy and Hold, influenciada por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Classes de Ativos

A aplicação organiza a carteira em classes que cumprem papéis diferentes dentro da estratégia. Alguns nomes internos estão em inglês por simplicidade técnica, mas a ideia prática é esta:

| Aba no app | Chave no JSON | O que representa | Papel na carteira | Atributos esperados |
|---|---|---|---|---|
| Ações | `stocksBr` | Ações brasileiras da B3 | Crescimento patrimonial no longo prazo | `ticker`, `quantity`, `averagePrice` |
| FIIs | `fiis` | Fundos imobiliários brasileiros | Renda e diversificação imobiliária | `ticker`, `quantity`, `averagePrice` |
| Stocks | `stocksUs` | Ações internacionais, geralmente dos EUA | Diversificação geográfica e cambial | `ticker`, `quantity`, `averagePrice` |
| REITs | `reits` | Fundos imobiliários internacionais | Diversificação imobiliária global | `ticker`, `quantity`, `averagePrice` |
| Renda Fixa | `fixedIncome` | CDBs, LCIs, LCAs, Tesouro Direto etc. | Estabilidade, previsibilidade e proteção | `name`, `amount` |
| Reserva Valor | `valueReserve` | Ouro, Bitcoin e ativos similares | Proteção patrimonial de longo prazo | `name`, `amount` |
| Reserva Emergência | `emergencyReserve` | Recursos para imprevistos | Liquidez e segurança financeira | `name`, `amount` |
| Bens | `assets` | Imóveis, veículos e outros bens | Visão patrimonial total, fora do rebalanceamento principal | `name`, `amount` |

## Estrutura do `portfolio.json`

Classes ausentes são tratadas como vazias por padrão.

Modelo mínimo totalmente zerado:

```json
{
  "stocksBr": [],
  "fiis": [],
  "stocksUs": [],
  "reits": [],
  "fixedIncome": [],
  "valueReserve": [],
  "emergencyReserve": [],
  "assets": []
}
```

Exemplo simples com dados fictícios:

```json
{
  "stocksBr": [
    { "ticker": "ITSA4", "quantity": 100, "averagePrice": 9.8 }
  ],
  "fiis": [
    { "ticker": "HGLG11", "quantity": 10, "averagePrice": 158.5 }
  ],
  "stocksUs": [
    { "ticker": "MSFT", "quantity": 3, "averagePrice": 320 }
  ],
  "reits": [
    { "ticker": "O", "quantity": 5, "averagePrice": 55 }
  ],
  "fixedIncome": [
    { "name": "Tesouro Selic", "amount": 15000 }
  ],
  "valueReserve": [
    { "name": "Bitcoin", "amount": 3000 }
  ],
  "emergencyReserve": [
    { "name": "Caixa de emergência", "amount": 12000 }
  ],
  "assets": [
    { "name": "Carro", "amount": 45000 }
  ]
}
```

## Como usar

A aplicação está disponível em **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**.

Ela funciona **sem backend**. Isso significa que seus dados **não são salvos em nuvem** nem enviados para um servidor da aplicação. Tudo fica salvo apenas localmente no seu dispositivo e no seu navegador.

Uso básico:

1. Acesse a aplicação.
2. Importe ou arraste seu `portfolio.json`.
3. Configure tokens de cotação, se quiser buscar preços automaticamente.
4. Use a aba **Metas** para acompanhar a diversificação entre classes.
5. Revise a carteira periodicamente como apoio visual para aportes e organização patrimonial.
