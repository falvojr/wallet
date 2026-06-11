# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local.

O objetivo é organizar a carteira, visualizar a diversificação e acompanhar metas de alocação no longo prazo. Não é uma ferramenta de trade, controle de P&L ou acompanhamento de rentabilidade. O foco está em apoiar a disciplina de aportes regulares e a visão patrimonial de longo prazo.

> [!NOTE]
> Este projeto é uma interpretação pessoal da estratégia de Buy and Hold, adaptada ao que tem funcionado para mim. Ao longo da minha jornada de aprendizado, fui influenciado por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Estratégia

A ideia central é construir patrimônio de forma gradual, com aportes periódicos distribuídos entre classes de ativos que cumprem papéis diferentes. A prioridade parte da segurança e vai em direção ao crescimento:

1. **Reserva de Emergência** vem primeiro. Enquanto não estiver completa, todo aporte vai para ela. É a base de qualquer carteira saudável.
2. **Renda Fixa** oferece previsibilidade e estabilidade, protegendo o patrimônio contra volatilidade.
3. **Ações e FIIs** (Brasil) são o motor de crescimento e renda passiva no mercado local.
4. **Stocks e REITs** (EUA) trazem diversificação geográfica e exposição ao dólar.
5. **Reserva de Valor** (Bitcoin, ouro) serve como proteção contra desvalorização monetária no longo prazo.
6. **Bens** (imóveis, veículos) compõem a visão patrimonial total, mas ficam fora da estratégia de aportes.

Cada classe recebe uma **meta percentual** na carteira. A aplicação compara o percentual atual com a meta e sugere onde aportar. O rebalanceamento é passivo: não se vende para reequilibrar, apenas se direciona o próximo aporte para a classe mais defasada.

## Comece em 5 minutos

Você só precisa de um navegador. Não há cadastro, não há instalação e nenhum dado sai do seu dispositivo.

1. Acesse **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)**.
2. Clique em **Criar carteira** (ou em **Importar JSON**, se já tiver um backup).
3. Abra a aba de uma classe (por exemplo, **Ações**) e clique em **Adicionar ativo**. Preencha:
   - **Nome / ticker**: o código do ativo (ex.: `WEGE3`, `AAPL`) ou um nome livre (ex.: `CDB Nubank`);
   - **Quantidade ou valor**: a quantidade de cotas para ativos com cotação, ou o valor em reais para Renda Fixa, Reserva de Emergência e Bens;
   - **Meta % na classe**: opcional. Em branco, a meta é dividida igualmente entre os ativos da classe; `0` tira o ativo do rebalanceamento (badge `ignorar`).
4. Na aba **Metas**, defina o percentual alvo de cada classe (a soma deve fechar em 100%) e a meta em reais da Reserva de Emergência.
5. Pronto. O badge **`aportar`** indica a classe e o ativo mais defasados, ou seja, o melhor destino para o próximo aporte.

## Cotações automáticas (opcional)

Sem cotações o app continua funcionando, mas só calcula o valor das classes declaradas em reais. Para os demais ativos:

1. Crie uma conta gratuita em [brapi.dev](https://brapi.dev) e copie seu token (cobre ações e FIIs brasileiros).
2. Crie uma conta gratuita em [finnhub.io](https://finnhub.io/register) e copie sua API key (cobre stocks e REITs americanos).
3. No app, abra ⚙️ **Configurações**, cole os tokens nos campos correspondentes e salve.
4. Clique em **Cotar**. Os preços ficam salvos no dispositivo e um aviso aparece quando estiverem desatualizados (mais de 24 horas).

Câmbio USD-BRL e criptomoedas usam a [AwesomeAPI](https://economia.awesomeapi.com.br), que não precisa de token.

## Configurações

| Opção | O que faz |
| --- | --- |
| Classes recomendadas por aporte | Quantas classes podem receber o badge `aportar` ao mesmo tempo (padrão: 1) |
| Ativos recomendados por classe | Quantos ativos recebem o badge dentro de cada classe recomendada (padrão: 1) |
| Modo Sardinha | Exibe os valores financeiros (cotações, variação diária e totais em reais). Desligado por padrão, mostra apenas quantidades e percentuais: no buy and hold, o preço do dia não deve influenciar a decisão de aporte |

## Backup dos seus dados

Os dados ficam apenas no seu navegador. Se você limpar os dados do site, a carteira é apagada. Por isso:

- **Exportar** (seta para cima, no topo): baixa um arquivo `portfolio_AAAA-MM-DD.json`. Faça isso periodicamente.
- **Importar** (seta para baixo, ou arraste o arquivo para a janela): restaura o backup em qualquer dispositivo ou navegador.

## Instalar como aplicativo

O site é um PWA e funciona offline depois da primeira visita:

- **Android / Chrome**: menu do navegador, opção "Adicionar à tela inicial";
- **iPhone / Safari**: botão de compartilhar, opção "Adicionar à Tela de Início";
- **Desktop**: ícone de instalação na barra de endereço.

## Perguntas frequentes

**Meus dados vão para algum servidor?**
Não. Tudo fica no `localStorage` do navegador. Os tokens são usados apenas para consultar as APIs de cotação, direto do seu dispositivo.

**A cotação de um ativo não aparece. E agora?**
Confira se os tokens estão salvos em Configurações e clique em **Cotar**. Ativos com nome livre (ex.: `CDB Nubank`) não têm cotação: o valor informado é usado diretamente.

**O que significa o badge `aportar`?**
É a recomendação de destino do próximo aporte: a classe (e o ativo) mais distante da meta. Enquanto a meta da Reserva de Emergência não for atingida, ela é a única recomendação.

**Posso usar em mais de um dispositivo?**
Sim: exporte o JSON em um e importe no outro. Não há sincronização automática.

## Formato do `portfolio.json`

A carteira pode ser importada e exportada como JSON. Cada classe é um objeto com `items` (ativos), `target` (meta %) e `goal` (meta em R$, usada pela Reserva de Emergência). Cada ativo tem `id`, `amount`, e opcionalmente `target` e `note`.

```json
{
  "emergencyReserve": {
    "goal": 30000,
    "items": [
      { "id": "CDB", "amount": 30000, "note": "6 meses do custo de vida." }
    ]
  },
  "fixedIncome": {
    "target": 20,
    "items": [
      { "id": "Tesouro Selic", "amount": 15000 }
    ]
  },
  "brStocks": {
    "target": 25,
    "items": [
      { "id": "WEGE3", "amount": 50 },
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
      { "id": "AAPL", "amount": 5 }
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

## Stack

* HTML, CSS e JavaScript puros (ES2023+, sem build step)
* [D3.js](https://d3js.org) para o gráfico de bolhas
* [Lucide](https://lucide.dev) para ícones
* PWA com Service Worker para uso offline

## Desenvolvimento

Para rodar localmente, basta um servidor estático na raiz do projeto:

```bash
python -m http.server 8123
```

O Service Worker usa cache-first com atualização em segundo plano: depois de alterar um arquivo, recarregue a página duas vezes para ver a mudança.

As convenções do projeto estão em [CLAUDE.md](CLAUDE.md) e as decisões de arquitetura em [docs/adr](docs/adr/README.md).
