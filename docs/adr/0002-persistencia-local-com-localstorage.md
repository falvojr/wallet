# 0002. Persistência local com localStorage

Data: 2026-06-11
Status: Aceita
Tipo: Técnica

## Contexto

Os dados da carteira são pessoais e sensíveis. Um backend traria custos, autenticação e responsabilidade sobre dados financeiros de terceiros, sem benefício para o caso de uso de um único usuário por dispositivo.

## Decisão

Persistir tudo no `localStorage` do navegador, sob chaves com prefixo `holding_` (carteira, preferências, cache de cotações, configurações e tema).
O backup e a portabilidade entre dispositivos são responsabilidade do usuário, via exportação e importação de JSON.

## Consequências

- Nenhum dado sai do dispositivo; privacidade por construção.
- Importação de JSON passa por normalização defensiva (`normalizePortfolioData`), pois o arquivo pode ser editado à mão.
- Limpar os dados do navegador apaga a carteira; o hábito de exportar JSON é o mecanismo de backup.
- Sem sincronização automática entre dispositivos. Se isso virar requisito, esta ADR deve ser revisitada.
