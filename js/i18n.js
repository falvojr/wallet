/**
 * Centralised UI strings for future internationalisation.
 *
 * To add a locale, duplicate `pt-BR` under a new key and translate.
 * Then call `setLocale('xx-YY')` at boot.
 */

const strings = {
  'pt-BR': {
    appTitle:           'Minha Holding',
    btnSettings:        'Configurações de API',
    btnTheme:           'Alternar tema claro e escuro',
    btnImport:          'Importar carteira JSON',
    btnExport:          'Exportar carteira JSON',
    btnPrices:          'Cotar',
    btnPricesLabel:     'Atualizar cotações',

    tabOverview:        'Metas',
    tabPortfolio:       'Carteira',

    className: {
      brStocks:           'Ações',
      brFiis:             'FIIs',
      usStocks:           'Stocks',
      usReits:            'REITs',
      fixedIncome:        'Renda Fixa',
      emergencyReserve:   'Reserva de Emergência',
      storeOfValue:       'Reserva de Valor',
      assets:             'Bens',
    },

    classDescription: {
      brStocks:
        'Participações em empresas na bolsa brasileira (B3). ' +
        'No longo prazo, tendem a superar a inflação por meio de valorização e dividendos.',
      brFiis:
        'Fundos Imobiliários negociados na B3, que investem em imóveis ou títulos imobiliários. ' +
        'Distribuem rendimentos mensais isentos de IR para pessoa física.',
      usStocks:
        'Ações de empresas nas bolsas americanas (NYSE, Nasdaq). ' +
        'Dão exposição ao dólar e acesso a setores como tecnologia, saúde e consumo global.',
      usReits:
        'Real Estate Investment Trusts, os equivalentes americanos dos FIIs. ' +
        'Investem em imóveis como data centers, hospitais e galpões, com dividendos regulares.',
      fixedIncome:
        'Títulos como CDBs, LCIs, LCAs e Tesouro Direto. ' +
        'Oferecem previsibilidade e proteção, sendo a base de segurança da carteira.',
      emergencyReserve:
        'Reserva com liquidez imediata, geralmente de 6 a 12 meses de custo de vida. ' +
        'Deve ficar em ativos seguros e de resgate rápido, como Tesouro Selic ou CDB diário.',
      storeOfValue:
        'Ativos que preservam valor no longo prazo, como Bitcoin e ouro. ' +
        'Servem como proteção contra desvalorização cambial e instabilidade monetária.',
      assets:
        'Bens patrimoniais como imóveis de uso pessoal e veículos. ' +
        'Compõem o patrimônio total, mas não fazem parte da estratégia de aporte.',
    },

    /* Overview / Metas */
    metaLabel:          'meta',
    targetLabel:        'Meta %',
    goalLabel:          'meta',
    goalUnit:           'R$',
    warningTargetSum:   (sum) => `As metas somam <strong>${sum}%</strong>, mas deveriam totalizar 100%.`,
    infoStale:          (dateStr) => `Cotações desatualizadas (${dateStr}). Atualize em <strong>Cotar</strong>.`,
    infoNoPrices:       'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.',
    successBalanced:    'Carteira balanceada. Nenhuma classe precisa de aporte no momento.',
    inactiveClassHint:  'Não participa do rebalanceamento.',
    emergencyHint:      'Valor fixo, não participa do rebalanceamento.',

    /* Badges */
    badgeAportar:       'aportar',
    badgeAportarTitle:  'Maior necessidade de aporte',
    badgeIgnorar:       'ignorar',
    badgeIgnorarTitle:  'Em quarentena',

    /* Carteira / Charts */
    portfolioLabel:     'Patrimônio',
    noData:             'Sem dados para exibir',
    partialSuffix:      '(parcial)',

    /* Asset table */
    colName:            'Nome',
    colAmount:          'Qtd',
    colPrice:           'Preço',
    colChange:          'Hoje',
    colTotal:           'Total',
    colTarget:          'Meta %',
    colActions:         'Ações',
    addAsset:           '+ Adicionar ativo',
    emptyClass:         'Nenhum ativo nesta classe.',
    declaredPrice:      'Declarado',
    targetPlaceholder:  'auto',
    assetCount:         (n) => `${n} ativo${n !== 1 ? 's' : ''}`,

    /* Add modal */
    addModalTitle:      'Adicionar Ativo',
    addFieldTicker:     'Nome / Ticker',
    addTickerHint:      'Ex: PETR4, CDB Inter',
    addFieldAmount:     'Quantidade ou valor (R$)',
    addAmountHint:      'Ex: 100 (0 para incluir sem posição)',
    addFieldTarget:     'Meta % (dentro da classe)',
    addTargetHint:      'Vazio = distribuição igual, 0 = quarentena',
    btnCancel:          'Cancelar',
    btnAdd:             'Adicionar',

    /* Note modal */
    noteModalTitle:     'Comentário',
    noteHintPrefix:     'Nota sobre',
    notePlaceholder:    'Ex: Vence em 2027, rendendo 120% CDI',
    btnSave:            'Salvar',

    /* Settings */
    settingsTitle:      'Tokens de API',
    settingsHint:       'Tokens gratuitos para cotações em tempo real.',
    brapiLabel:         'brapi.dev (Ações / FIIs)',
    brapiHint:          'Crie grátis em brapi.dev/dashboard',
    finnhubLabel:       'Finnhub (Stocks / REITs)',
    finnhubHint:        'Crie grátis em finnhub.io',
    linkCreate:         'Criar conta',

    /* Toasts */
    toastConfigTokens:  'Configure os tokens de API em ⚙️',
    toastPricesOk:      'Cotações atualizadas',
    toastPricesFail:    'Erro ao buscar cotações',
    toastImported:      'Carteira importada',
    toastExported:      'JSON exportado',
    toastSettingsSaved: 'Configurações salvas',
    toastAdded:         (id) => `${id} adicionado`,
    toastRemoved:       (id) => `${id} removido`,
    toastExists:        (id) => `${id} já existe`,
    toastUndo:          'Desfazer',
    toastJsonOnly:      'Apenas arquivos .json',
    toastErrorPrefix:   'Erro: ',
    toastInvalidFormat: 'Formato inválido',

    welcomeTitle:       'Importe sua carteira',
    welcomeText:        'Arraste um arquivo <code>.json</code> ou clique para carregar.',
    welcomeBtn:         'Importar JSON',

    loadingDefault:     'Carregando...',
    loadingImporting:   'Importando...',
    loadingExchange:    'Câmbio',
    dropHint:           'Solte o arquivo JSON aqui',

    /* Accessibility */
    a11yBubbleChart:    'Mapa da carteira por tamanho de posição',
    a11yRemove:         (id) => `Remover ${id}`,
    a11yNote:           (id) => `Comentário de ${id}`,
    a11yAddNote:        'Adicionar comentário',
    a11yTargetClass:    (label) => `Meta de ${label} (%)`,
    a11yGoalClass:      (label) => `Meta de ${label} (R$)`,
    a11yAllocation:     (label, actual, target) => `Alocação de ${label}: ${actual}% de ${target}%`,
    a11yAmountOf:       (id) => `Quantidade de ${id}`,
    a11yTargetOf:       (id) => `Meta % de ${id} na classe`,
    a11yTargetTitle:    'Meta do ativo na classe',
    a11yToggleChart:    (label, visible) => `${visible ? 'Ocultar' : 'Mostrar'} ${label} no gráfico`,
  },
};

let currentLocale = 'pt-BR';

export function setLocale(locale) { if (strings[locale]) currentLocale = locale; }

export function t(key, ...args) {
  const val = strings[currentLocale]?.[key] ?? strings['pt-BR']?.[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

export function tn(section, key) {
  return strings[currentLocale]?.[section]?.[key]
      ?? strings['pt-BR']?.[section]?.[key]
      ?? key;
}
