/**
 * Centralised UI strings for internationalisation.
 * To add a locale, duplicate `pt-BR`, translate, and call setLocale().
 */

const strings = {
  'pt-BR': {
    // App
    appTitle: 'Minha Holding',
    btnSettings: 'Configurações de API',
    btnTheme: 'Alternar tema',
    btnImport: 'Importar JSON',
    btnExport: 'Exportar JSON',
    btnPrices: 'Cotar',

    // Tabs
    tabOverview: 'Metas',
    tabPortfolio: 'Carteira',

    // Classes
    className: {
      brStocks: 'Ações',
      brFiis: 'FIIs',
      usStocks: 'Stocks',
      usReits: 'REITs',
      fixedIncome: 'Renda Fixa',
      emergencyReserve: 'Reserva Emergência',
      storeOfValue: 'Reserva Valor',
      assets: 'Bens',
    },
    classDescription: {
      brStocks:
        'Participações em empresas na bolsa brasileira (B3). No longo prazo, tendem a superar a inflação por meio de valorização e dividendos.',
      brFiis:
        'Fundos Imobiliários negociados na B3, que investem em imóveis ou títulos imobiliários. Distribuem rendimentos mensais isentos de IR para pessoa física.',
      usStocks:
        'Ações de empresas nas bolsas americanas (NYSE, Nasdaq). Dão exposição ao dólar e acesso a setores como tecnologia, saúde e consumo global.',
      usReits:
        'Real Estate Investment Trusts, os equivalentes americanos dos FIIs. Investem em imóveis como data centers, hospitais e galpões, com dividendos regulares.',
      fixedIncome:
        'Títulos como CDBs, LCIs, LCAs e Tesouro Direto. Oferecem previsibilidade e proteção, sendo a base de segurança da carteira.',
      emergencyReserve:
        'Reserva com liquidez imediata, geralmente de 6 a 12 meses de custo de vida. Deve ficar em ativos seguros e de resgate rápido, como Tesouro Selic ou CDB diário.',
      storeOfValue:
        'Ativos que preservam valor no longo prazo, como Bitcoin e ouro. Servem como proteção contra desvalorização cambial e instabilidade monetária.',
      assets:
        'Bens patrimoniais como imóveis de uso pessoal e veículos. Compõem o patrimônio total, mas não fazem parte da estratégia de aporte.',
    },

    // Overview
    metaLabel: 'meta',
    targetLabel: 'Meta %',
    goalLabel: 'meta',
    warningTargetSum: (sum) => `As metas somam <strong>${sum}%</strong>, mas deveriam totalizar 100%.`,
    infoStale: (d) => `Cotações desatualizadas (${d}). Atualize em <strong>Cotar</strong>.`,
    infoNoPrices: 'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.',
    successBalanced: 'Carteira balanceada. Nenhuma classe precisa de aporte no momento.',
    inactiveClassHint: 'Não participa do rebalanceamento.',
    emergencyPriority:
      'Meta da Reserva Emergência não atingida. Priorize aportes nela antes de investir em outras classes.',

    // Badges
    badgeAportar: 'aportar',
    badgeAportarTitle: 'Maior necessidade de aporte',
    badgeIgnorar: 'ignorar',
    badgeIgnorarTitle: 'Em quarentena',

    // Charts
    portfolioLabel: 'Patrimônio',
    noData: 'Sem dados para exibir',
    partialSuffix: '(parcial)',

    // Table
    colName: 'Nome',
    colAmount: 'Qtd',
    colPrice: 'Preço',
    colChange: 'Hoje',
    colTotal: 'Total',
    colTarget: 'Meta %',
    colActions: '',
    colActionsA11y: 'Opções',
    addAsset: '+ Adicionar ativo',
    emptyClass: 'Nenhum ativo nesta classe.',
    declaredPrice: 'Declarado',
    targetPlaceholder: 'auto',
    assetCount: (n) => `${n} ativo${n !== 1 ? 's' : ''}`,

    // Add modal
    addModalTitle: 'Adicionar Ativo',
    addFieldTicker: 'Nome / Ticker',
    addTickerHint: 'Ex: PETR4, CDB Inter',
    addFieldAmount: 'Quantidade ou valor (R$)',
    addAmountHint: 'Ex: 100 (0 para incluir sem posição)',
    addFieldTarget: 'Meta % (dentro da classe)',
    addTargetHint: 'Vazio = distribuição igual, 0 = quarentena',
    btnCancel: 'Cancelar',
    btnAdd: 'Adicionar',

    // Note modal
    noteModalTitle: 'Comentário',
    noteHintPrefix: 'Nota sobre',
    notePlaceholder: 'Ex: Vence em 2027, rendendo 120% CDI',
    btnSave: 'Salvar',

    // Settings
    settingsTitle: 'Tokens de API',
    settingsHint: 'Tokens gratuitos para cotações em tempo real.',
    brapiLabel: 'brapi.dev (Ações / FIIs)',
    brapiHint: 'Crie grátis em brapi.dev/dashboard',
    finnhubLabel: 'Finnhub (Stocks / REITs)',
    finnhubHint: 'Crie grátis em finnhub.io',

    // Toasts
    toastConfigTokens: 'Configure os tokens de API em ⚙️',
    toastPricesOk: 'Cotações atualizadas',
    toastPricesFail: 'Erro ao buscar cotações',
    toastImported: 'Carteira importada',
    toastExported: 'JSON exportado',
    toastSettingsSaved: 'Configurações salvas',
    toastAdded: (id) => `${id} adicionado`,
    toastRemoved: (id) => `${id} removido`,
    toastExists: (id) => `${id} já existe`,
    toastUndo: 'Desfazer',
    toastJsonOnly: 'Apenas arquivos .json',
    toastErrorPrefix: 'Erro: ',
    toastInvalidFormat: 'Formato inválido',

    // Welcome
    welcomeTitle: 'Importe sua carteira',
    welcomeText: 'Arraste um arquivo <code>.json</code> ou clique para carregar.',
    welcomeBtn: 'Importar JSON',

    // Loading
    loadingDefault: 'Carregando...',
    loadingImporting: 'Importando...',
    loadingExchange: 'Câmbio',
    dropHint: 'Solte o arquivo JSON aqui',

    // Accessibility
    a11yBubbleChart: 'Mapa da carteira por tamanho de posição',
    a11yRemove: (id) => `Remover ${id}`,
    a11yNote: (id) => `Comentário de ${id}`,
    a11yAddNote: 'Adicionar comentário',
    a11yTargetClass: (l) => `Meta de ${l} (%)`,
    a11yGoalClass: (l) => `Meta de ${l} (R$)`,
    a11yAmountOf: (id) => `Quantidade de ${id}`,
    a11yTargetOf: (id) => `Meta % de ${id} na classe`,
    a11yToggleChart: (l, v) => `${v ? 'Ocultar' : 'Mostrar'} ${l} no gráfico`,
  },
};

let locale = 'pt-BR';

export function setLocale(l) {
  if (strings[l]) locale = l;
}

export function t(key, ...args) {
  const val = strings[locale]?.[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

export function tn(section, key) {
  return strings[locale]?.[section]?.[key] ?? key;
}
