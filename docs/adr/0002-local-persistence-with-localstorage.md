# 0002. Persistência local com localStorage

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

Os dados da carteira são pessoais e sensíveis. Um backend traria custos, autenticação e responsabilidade sobre dados financeiros de terceiros, sem benefício para o caso de uso de um único usuário por dispositivo.

## Decisão

Persistir tudo no `localStorage` do navegador, sob chaves com prefixo `holding_` (carteira, preferências, cache de cotações, configurações e tema).
O backup e a portabilidade entre dispositivos são responsabilidade do usuário, via exportação e importação de JSON.
A exportação inclui a carteira e as preferências não sensíveis (ordem das classes, ocultas no gráfico, ordenação, limites de aporte e Modo Sardinha). Os tokens de API nunca entram no arquivo, e a importação jamais os sobrescreve.

## Consequências

- Nenhum dado sai do dispositivo; privacidade por construção.
- Importação de JSON passa por normalização defensiva (a carteira por `normalizePortfolioData`, as preferências por validação de tipo), pois o arquivo pode ser editado à mão.
- O JSON exportado é portável entre dispositivos sem carregar segredos: os tokens ficam fora e são reconfigurados em cada dispositivo.
- Toda escrita no `localStorage` tolera falhas (cota cheia, modo privado) sem quebrar o app.
- Limpar os dados do navegador apaga a carteira; o hábito de exportar JSON é o mecanismo de backup.
- Sem sincronização automática entre dispositivos. Se isso virar requisito, esta ADR deve ser revisitada.
