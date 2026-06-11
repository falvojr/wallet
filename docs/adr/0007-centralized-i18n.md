# 0007. Strings de interface centralizadas (i18n)

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

Hoje a interface existe apenas em português do Brasil, mas o texto espalhado por HTML e JavaScript dificulta revisão, consistência de tom e uma eventual tradução.

## Decisão

Centralizar todas as strings visíveis em `js/i18n.js`, acessadas por `t()` (strings e funções com parâmetros) e `tn()` (mapas como rótulos de classes).
O HTML estático carrega com texto em pt-BR e atributos `data-i18n*`, reaplicados por `applyTranslations()` na inicialização.
Para adicionar um idioma: duplicar o bloco `pt-BR`, traduzir e alternar a variável `locale`.

## Consequências

- Todo o texto da interface fica num único arquivo, fácil de revisar.
- O custo é uma pequena indireção: novos textos exigem criar a chave em `i18n.js` em vez de escrever inline.
- Não há seletor de idioma na interface; ele só deve existir quando houver um segundo idioma de fato.
