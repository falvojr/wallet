# Minha Holding

Dashboard pessoal para acompanhar uma carteira **Buy and Hold** de forma simples, visual e 100% local.

O objetivo é organizar a carteira, visualizar a diversificação e acompanhar metas de alocação no longo prazo. Não é uma ferramenta de trade, controle de P&L ou acompanhamento de rentabilidade.

> [!NOTE]
> Este projeto é uma interpretação pessoal da estratégia de Buy and Hold, adaptada ao que tem funcionado para mim. Ao longo da minha jornada de aprendizado, fui influenciado por [Bastter](https://bastter.com), [Fabio Faria](https://www.youtube.com/@canaldoholder), [Gustavo Cerbasi](https://www.youtube.com/@gustavocerbasi), [Eduardo Cavalcanti](https://www.youtube.com/@eduardocavalcanti) e [Arthur Asvid](https://www.youtube.com/@CanaldoASVID).

## Comece em 5 minutos

Você só precisa de um navegador. Não há cadastro e nenhum dado sai do seu dispositivo.

1. Acesse **[falvojr.github.io/wallet](https://falvojr.github.io/wallet)** e clique em **Criar carteira** (ou **Importar JSON**, se já tiver um backup).
2. Abra a aba de uma classe (ex.: **Ações**), clique em **Adicionar ativo** e informe o ticker ou nome livre, a quantidade (ou valor em reais, nas classes declarativas) e, se quiser, a meta % do ativo na classe.
3. Na aba **Metas**, defina o percentual alvo de cada classe (a soma deve fechar em 100%) e a meta em reais da Reserva de Emergência.
4. Pronto. O badge **`aportar`** indica o melhor destino para o próximo aporte.

Para **cotações automáticas** (opcional): crie tokens gratuitos em [brapi.dev](https://brapi.dev) (ações e FIIs) e [finnhub.io](https://finnhub.io/register) (stocks e REITs), cole-os em ⚙️ **Configurações** e clique em **Cotar**. Câmbio e cripto usam a [AwesomeAPI](https://economia.awesomeapi.com.br), sem token. Os preços ficam salvos no dispositivo, com aviso quando desatualizados (mais de 24 horas).

## Estratégia

A ideia central é construir patrimônio de forma gradual, com aportes periódicos distribuídos entre classes de ativos que cumprem papéis diferentes. A prioridade parte da segurança e vai em direção ao crescimento:

1. **Reserva de Emergência** vem primeiro. Enquanto não estiver completa, todo aporte vai para ela.
2. **Renda Fixa** oferece previsibilidade e estabilidade, protegendo o patrimônio contra volatilidade.
3. **Ações e FIIs** (Brasil) são o motor de crescimento e renda passiva no mercado local.
4. **Stocks e REITs** (EUA) trazem diversificação geográfica e exposição ao dólar.
5. **Reserva de Valor** (Bitcoin, ouro) serve como proteção contra desvalorização monetária no longo prazo.
6. **Bens** (imóveis, veículos) compõem a visão patrimonial total, mas ficam fora da estratégia de aportes.

Cada classe recebe uma **meta percentual** na carteira. A aplicação compara o percentual atual com a meta e sugere onde aportar. O rebalanceamento é passivo: não se vende para reequilibrar, apenas se direciona o próximo aporte para a classe mais defasada.

## Configurações

| Opção | O que faz |
| --- | --- |
| Classes recomendadas por aporte | Quantas classes podem receber o badge `aportar` ao mesmo tempo (padrão: 1) |
| Ativos recomendados por classe | Quantos ativos recebem o badge dentro de cada classe recomendada (padrão: 1) |
| Modo Sardinha | Exibe os valores financeiros (cotações, variação diária e totais em reais). Desligado por padrão, mostra apenas quantidades e percentuais: no buy and hold, o preço do dia não deve influenciar a decisão de aporte |

## Backup e instalação

Os dados ficam apenas no navegador: limpar os dados do site apaga a carteira. **Exporte periodicamente** (seta para cima no topo) e importe o JSON em qualquer dispositivo (seta para baixo, ou arraste o arquivo para a janela).

O site é um PWA e funciona offline após a primeira visita. Instale pelo menu do navegador ("Adicionar à tela inicial" no celular, ícone de instalação na barra de endereço no desktop).

## Perguntas frequentes

**Meus dados vão para algum servidor?**
Não. Tudo fica no `localStorage` do navegador; os tokens são usados apenas para consultar as APIs de cotação, direto do seu dispositivo.

**A cotação de um ativo não aparece. E agora?**
Confira se os tokens estão salvos em Configurações e clique em **Cotar**. Ativos com nome livre (ex.: `CDB Nubank`) não têm cotação: o valor informado é usado diretamente.

**O que significa o badge `aportar`?**
A classe (e o ativo) mais distante da meta, ou seja, o melhor destino do próximo aporte. Enquanto a meta da Reserva de Emergência não for atingida, ela é a única recomendação.

## Formato do `portfolio.json`

Cada classe tem `items` (ativos), `target` (meta %) e `goal` (meta em R$, usada pela Reserva de Emergência). Cada ativo tem `id`, `amount` e, opcionalmente, `target` e `note`. As oito classes (`emergencyReserve`, `fixedIncome`, `brStocks`, `brFiis`, `usStocks`, `usReits`, `storeOfValue`, `assets`) seguem o mesmo formato:

```json
{
  "emergencyReserve": {
    "goal": 30000,
    "items": [
      { "id": "CDB", "amount": 30000, "note": "6 meses do custo de vida." }
    ]
  },
  "brStocks": {
    "target": 25,
    "items": [
      { "id": "WEGE3", "amount": 50 },
      { "id": "ITSA4", "amount": 100, "target": 0 }
    ]
  },
  "usStocks": {
    "target": 25,
    "items": [
      { "id": "AAPL", "amount": 5 }
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
