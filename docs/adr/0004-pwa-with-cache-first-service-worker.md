# 0004. PWA com Service Worker cache-first

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

O app deve abrir rápido e funcionar offline (consulta da carteira no celular, por exemplo). Os arquivos são estáticos e mudam com pouca frequência.
Bibliotecas e fontes vêm de CDNs e também precisam estar disponíveis offline.

## Decisão

Service Worker com precache dos arquivos do app (incluindo `./`) e estratégia cache-first com atualização em segundo plano,
aplicada tanto à origem do app quanto aos CDNs conhecidos (jsDelivr e Google Fonts). A versão do cache (`CACHE_NAME`, `holding-vN`) é incrementada manualmente a cada release.

## Consequências

- Abertura instantânea e funcionamento offline completo, incluindo ícones, gráfico e fontes.
- Atualizações chegam "uma recarga depois": a primeira recarga serve o cache e atualiza em segundo plano, a segunda mostra a nova versão.
- Esquecer de incrementar `CACHE_NAME` atrasa a entrega de updates para quem já tem o app instalado.
