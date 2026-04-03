# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local.
Funciona direto no navegador, sem backend, sem cadastro e sem depender de serviços externos para armazenar seus dados.

> Interpretação pessoal da estratégia de Buy and Hold, influenciada por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Objetivo

A proposta do projeto é servir como um painel leve para:
- visualizar patrimônio e alocação por classe de ativos;
- acompanhar metas de diversificação;
- apoiar decisões de aporte com foco em longo prazo;
- manter uma visão didática da carteira, inclusive mostrando classes ainda sem ativos.

A ideia não é prever preço, fazer trade ou sugerir movimentos frequentes. O foco está em **organização, clareza e disciplina de alocação**.

## Visão resumida sobre Buy and Hold

Nesta leitura pessoal, Buy and Hold é uma estratégia baseada em:
- construção gradual de patrimônio;
- aportes recorrentes;
- diversificação entre classes de ativos;
- horizonte de longo prazo;
- menor foco em ruído de curto prazo.

Em vez de tentar acertar o melhor momento do mercado, a proposta é montar uma carteira coerente com seus objetivos e evoluí-la com constância.

## Classes de ativos da carteira

A aplicação organiza a carteira em classes que representam papéis diferentes dentro da estratégia.
Os nomes internos de algumas classes estão em inglês por simplicidade técnica, mas o sentido prático é este:

### Ações (`stocksBr` / aba **Ações**)
Empresas listadas na bolsa brasileira (B3).
Papel na carteira: crescimento patrimonial no longo prazo, com valorização e dividendos.

Atributos esperados por ativo:
- `ticker`: código do ativo na B3
- `quantity`: quantidade de cotas/ações
- `averagePrice`: preço médio

Exemplo:

```json
{ "ticker": "ITSA4", "quantity": 100, "averagePrice": 9.80 }
```

### FIIs (`fiis` / aba **FIIs**)
Fundos imobiliários negociados na B3.
Papel na carteira: exposição imobiliária com foco em renda e diversificação.

Atributos esperados por ativo:
- `ticker`
- `quantity`
- `averagePrice`

Exemplo:

```json
{ "ticker": "HGLG11", "quantity": 12, "averagePrice": 158.50 }
```

### Stocks (`stocksUs` / aba **Stocks**)
Ações internacionais, normalmente dos Estados Unidos.
Papel na carteira: diversificação geográfica e cambial.

Atributos esperados por ativo:
- `ticker`
- `quantity`
- `averagePrice`

Exemplo:

```json
{ "ticker": "MSFT", "quantity": 5, "averagePrice": 320.00 }
```

### REITs (`reits` / aba **REITs**)
Fundos imobiliários internacionais, equivalentes aos FIIs em outros mercados.
Papel na carteira: diversificação imobiliária global.

Atributos esperados por ativo:
- `ticker`
- `quantity`
- `averagePrice`

Exemplo:

```json
{ "ticker": "O", "quantity": 8, "averagePrice": 55.00 }
```

### Renda Fixa (`fixedIncome` / aba **Renda Fixa**)
Reserva mais previsível da carteira, como CDBs, LCIs, LCAs e Tesouro Direto.
Papel na carteira: estabilidade, proteção e previsibilidade.

Atributos esperados por item:
- `name`: nome do ativo/aplicação
- `amount`: valor atual

Exemplo:

```json
{ "name": "Tesouro Selic", "amount": 15000 }
```

### Reserva de Valor (`valueReserve` / aba **Reserva Valor**)
Ativos usados como proteção patrimonial no longo prazo, como ouro ou Bitcoin.
Papel na carteira: defesa contra desvalorização cambial e perda de poder de compra.

Atributos esperados por item:
- `name`
- `amount`

Exemplo:

```json
{ "name": "Bitcoin", "amount": 5000 }
```

### Reserva de Emergência (`emergencyReserve` / aba **Reserva Emergência**)
Valor destinado a imprevistos e liquidez imediata.
Papel na carteira: segurança financeira, não crescimento.

Atributos esperados por item:
- `name`
- `amount`

Exemplo:

```json
{ "name": "Caixa de emergência", "amount": 12000 }
```

### Bens (`assets` / aba **Bens**)
Patrimônio não financeiro, como imóvel de moradia ou veículo.
Papel na carteira: compor a visão patrimonial total, sem entrar no rebalanceamento principal.

Atributos esperados por item:
- `name`
- `amount`

Exemplo:

```json
{ "name": "Carro", "amount": 45000 }
```

## Estrutura do `portfolio.json`

O arquivo pode ser importado pela aplicação. Classes ausentes são tratadas como vazias por padrão.

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

1. Acesse a aplicação.
2. Importe ou arraste seu `portfolio.json`.
3. Configure tokens de cotação, se desejar.
4. Revise a aba **Metas** para acompanhar a distribuição entre classes.
5. Use a carteira como apoio visual para aportes e diversificação.

## Setup do projeto

Como é uma aplicação estática, o uso local é simples.

### Opção 1: abrir direto no navegador
Basta abrir o `index.html`.

### Opção 2: rodar com servidor local
Se preferir evitar restrições de navegador com arquivos locais:

```bash
python -m http.server 8000
```

Depois, abra `http://localhost:8000`.

## Observações

- Os dados ficam no seu dispositivo.
- O projeto não substitui análise pessoal.
- A organização das classes reflete uma leitura pessoal de diversificação e construção patrimonial.
