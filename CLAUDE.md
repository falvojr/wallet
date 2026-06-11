# CLAUDE.md

Guia para trabalhar neste repositório.

## Projeto

Minha Holding: PWA pessoal para acompanhar uma carteira buy and hold. Roda 100% no navegador, sem backend.
Os dados ficam no `localStorage` do usuário e a publicação é feita via GitHub Pages.

## Stack e restrições

- HTML, CSS e JavaScript puros (ES2023+), rodando direto no navegador. Não introduzir frameworks, TypeScript, bundlers, build step ou dependências de npm.
- Únicas bibliotecas externas: D3 (gráfico de bolhas) e Lucide (ícones), carregadas via CDN e cacheadas pelo Service Worker.

## Como rodar

Qualquer servidor estático na raiz do projeto, por exemplo: `python -m http.server 8123`.

Atenção: o Service Worker usa cache-first com atualização em segundo plano. Depois de alterar um arquivo, recarregue a página duas vezes para ver a mudança.

## Arquitetura

| Arquivo | Responsabilidade |
| --- | --- |
| `app.js` | Bootstrap, eventos de UI (delegação em `#panels`), modais e import/export |
| `js/state.js` | Domínio (`Portfolio`, `Preferences`, `PriceCache`, `Settings`), persistência e tema |
| `js/calc.js` | Cálculos puros: totais, percentuais e recomendação de aporte |
| `js/render.js` | Renderização (template literals + `innerHTML`) e gráfico de bolhas |
| `js/api.js` | Busca de cotações (brapi.dev, Finnhub, AwesomeAPI) |
| `js/i18n.js` | Strings centralizadas da interface (pt-BR) |
| `sw.js` | Service Worker (precache + cache em tempo de execução) |

Direção das dependências: `render` e `calc` leem o estado; `api` escreve em `prices`; `app` orquestra tudo; `i18n` não depende de ninguém.

## Convenções

- Limite de 160 caracteres por linha (ver `.editorconfig`). O limite é um teto, não uma meta:
  - comentários de linha única e expressões simples que caibam no limite não devem ser quebrados;
  - encadeamentos com vários passos, ternários aninhados, objetos longos e blocos com mais de uma instrução mantêm a indentação convencional, mesmo cabendo em uma linha;
  - strings de conteúdo (`js/i18n.js`) podem exceder o limite e não devem ser quebradas com concatenação.
- Nomes semânticos, sem abreviações. Indentação de 2 espaços.
- Comentários: `//` em linha única, `/* */` em blocos multilinha. Sentenças terminam com ponto final, respeitando o teto de 160 colunas por linha. Títulos de seção são comentários `//` curtos, sem separadores decorativos de traços.
- Texto visível ao usuário sempre via `t()`/`tn()` em `js/i18n.js`, nunca hardcoded no JavaScript.
- HTML gerado em template literals deve escapar dados do usuário com `esc()` (em `js/render.js`).
- Eventos de listas e tabelas usam delegação em `#panels` com data-attributes (`data-goto`, `data-sort`, `data-toggle-chart`).
- Modais usam `<dialog>` nativo com `showModal()`; estado interno é limpo no evento `close`.
- `localStorage` usa as chaves `holding_*` definidas em `STORAGE_KEYS` (`js/state.js`). Toda importação passa por `normalizePortfolioData`.
- Acessibilidade: controle clicável é `<button>`, tabela ordenável expõe `aria-sort`, tab ativa expõe `aria-current`.
- Material Design 3 como referência de UI. Tokens de design em `style.css`, temas claro e escuro via `[data-theme]`.
- Ao alterar arquivos do app, incremente `CACHE_NAME` em `sw.js` (`holding-vN`) para invalidar o cache dos clientes.

## Decisões de arquitetura

Registradas em [docs/adr](docs/adr/README.md). Antes de mudanças estruturais, leia as ADRs existentes e registre uma nova quando a decisão for relevante.

## Verificação

Não há testes automatizados. Valide manualmente no navegador: importação de JSON, aba Metas, ordenação da tabela, modais, Configurações e gráfico de bolhas.
Tokens de API ficam apenas no `localStorage` do usuário; nunca commitar tokens ou dados pessoais de carteira.
