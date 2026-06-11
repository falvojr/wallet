# 0001. HTML, CSS e JavaScript puros, sem build step

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

O projeto é um dashboard pessoal de carteira buy and hold, mantido por uma pessoa, com escopo pequeno e horizonte de manutenção longo.
Frameworks e toolchains de build trazem produtividade em times e aplicações grandes, mas aqui adicionariam dependências, atualizações constantes e atrito para algo que cabe em poucos arquivos.

## Decisão

Usar apenas HTML, CSS e JavaScript modernos (ES2023+), servidos como arquivos estáticos, sem framework, sem bundler e sem etapa de build.
As únicas bibliotecas externas são D3 (gráfico de bolhas) e Lucide (ícones), carregadas via CDN.

## Consequências

- Deploy trivial em GitHub Pages: basta servir os arquivos.
- O código permanece legível e depurável direto no navegador, sem sourcemaps.
- Recursos da plataforma (ES Modules, `<dialog>`, Service Worker, `color-mix`) são preferidos a abstrações de biblioteca.
- Sem npm, não há gestão de versões de dependências; as versões de D3 e Lucide ficam fixadas na URL do CDN.
- Funcionalidades que exigiriam um framework (roteamento complexo, estado reativo) devem ser evitadas ou resolvidas de forma simples.
