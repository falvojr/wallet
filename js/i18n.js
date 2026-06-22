/*
 * Centralized UI strings for internationalization.
 * To add a locale, duplicate `pt-BR`, translate, and switch `locale`.
 */

const strings = {
  'pt-BR': {
    // App
    appTitle: 'Minha Holding',
    pageTitle: 'Minha Holding',
    btnPrices: 'Cotar',

    // Header and navigation
    navAssetClasses: 'Navegação por classe de ativos',
    importJsonTitle: 'Importar carteira JSON',
    exportJsonTitle: 'Exportar carteira JSON',
    themeToggleTitle: 'Alternar tema claro e escuro',
    settingsTitleShort: 'Configurações',
    refreshPricesTitle: 'Atualizar cotações',

    // Tabs
    tabOverview: 'Metas',
    tabPortfolio: 'Carteira',

    // Classes (order matches CLASS_KEYS)
    classLabels: {
      emergencyReserve: 'Reserva Emergência',
      fixedIncome: 'Renda Fixa',
      brStocks: 'Ações',
      brFiis: 'FIIs',
      usStocks: 'Stocks',
      usReits: 'REITs',
      storeOfValue: 'Reserva Valor',
      assets: 'Bens',
    },
    classDescriptions: {
      emergencyReserve: 'Dinheiro para imprevistos, geralmente de 6 a 12 meses de custo de vida, em ativos seguros e de resgate rápido como Tesouro Selic ou CDB de liquidez diária. É a primeira prioridade da carteira: evita vender investimentos numa emergência.',
      fixedIncome: 'Títulos que rendem juros, como CDBs, LCIs, LCAs e Tesouro Direto. Trazem previsibilidade e protegem o patrimônio das oscilações da bolsa, formando a base de segurança da carteira.',
      brStocks: 'Participações em empresas da bolsa brasileira (B3), de setores como bancos, energia e consumo. No longo prazo, tendem a superar a inflação por valorização e dividendos.',
      brFiis: 'Fundos Imobiliários negociados na B3, que investem em imóveis como galpões, shoppings e lajes corporativas, ou em títulos do setor. Distribuem rendimentos mensais, hoje isentos de IR para pessoa física.',
      usStocks: 'Ações de empresas nas bolsas dos Estados Unidos (NYSE e Nasdaq). Dão exposição ao dólar e acesso a líderes globais de tecnologia, saúde e consumo.',
      usReits: 'Os equivalentes americanos dos FIIs (Real Estate Investment Trusts). Investem em imóveis como data centers, hospitais e galpões, pagando dividendos regulares em dólar.',
      storeOfValue: 'Ativos que preservam valor no longo prazo, como ouro e Bitcoin. Servem de proteção contra a desvalorização da moeda e a instabilidade econômica.',
      assets: 'Bens de uso pessoal, como imóveis e veículos. Entram na visão de patrimônio total, mas ficam fora da estratégia de aportes e do rebalanceamento.',
    },

    // Overview
    metaLabel: 'Meta',
    goalLabel: 'Meta',
    warningTargetSum: (sum) => `As metas somam <strong>${sum}%</strong>, mas o total ideal é 100%.`,
    infoStale: (date) => `Cotações desatualizadas (${date}). Atualize em <strong>Cotar</strong>.`,
    infoNoPrices: 'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.',
    successBalanced: 'Carteira balanceada. Nenhuma classe precisa de aporte no momento.',
    inactiveClassHint: 'Classe fora das metas.',
    emergencyPriority: 'A meta da Reserva de Emergência ainda não foi atingida. Priorize novos aportes nela antes das demais classes.',

    // Badges
    badgeInvest: 'aportar',
    badgeInvestTitle: 'Sugerido para o próximo aporte.',
    badgeSkip: 'ignorar',
    badgeSkipTitle: 'Fora do rebalanceamento (meta zerada).',

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
    colActual: 'Atual %',
    colTarget: 'Meta %',
    colActionsA11y: 'Opções',
    addAsset: 'Adicionar ativo',
    descMore: 'ver mais',
    descLess: 'ver menos',
    emptyClass: 'Nenhum ativo nesta classe.',
    declaredPrice: '-',
    targetPlaceholder: 'auto',
    assetCount: (count) => `${count} ativo${count !== 1 ? 's' : ''}`,

    // Add modal
    addModalTitle: 'Adicionar ativo',
    addFieldTicker: 'Nome / Ticker',
    addTickerHint: 'Ex: WEG3, CDB Nubank',
    addFieldAmount: 'Quantidade ou valor (R$)',
    addAmountHint: 'Ex: 100 (use 0 para incluir sem posição)',
    addFieldTarget: 'Meta % na Classe',
    addTargetHint: 'Deixe em branco para distribuição igual; use 0 para ignorar',
    btnCancel: 'Cancelar',
    btnAdd: 'Adicionar',

    // Note modal
    noteModalTitle: 'Comentário',
    noteHintPrefix: 'Comentário sobre',
    notePlaceholder: 'Ex: Vence em 2027, rendendo 120% do CDI',
    noteTextAria: 'Comentário sobre o ativo',
    noteShortcutHint: 'Ctrl + Enter para salvar',
    btnSave: 'Salvar',

    // Settings
    settingsTitle: 'Configurações',
    settingsSectionApis: 'Cotações',
    settingsSectionInvest: 'Aportes',
    settingsSectionDisplay: 'Exibição',
    settingsHint: 'Crie um token na <a href="https://brapi.dev" target="_blank" rel="noopener">brapi.dev</a> para cotar seus ativos.',
    tokenPlaceholder: 'Seu token (ações, FIIs, stocks e REITs)',
    tokenShow: 'Mostrar token',
    tokenHide: 'Ocultar token',
    recommendedClassesLabel: 'Classes recomendadas',
    recommendedClassesHint: 'Quantas classes recebem o selo aportar.',
    recommendedAssetsLabel: 'Ativos recomendados',
    recommendedAssetsHint: 'Quantos ativos destacar em cada classe.',
    a11yDecrease: 'Diminuir',
    a11yIncrease: 'Aumentar',
    sardineModeLabel: 'Modo Sardinha',
    sardineModeHint: 'Mostra cotações, variação e totais em reais. Desligado, só quantidades e percentuais.',

    // Toasts
    toastConfigTokens: 'Adicione um token para cotar',
    toastConfigAction: 'Configurar',
    toastPricesOk: 'Cotações atualizadas',
    toastPricesFail: 'Não foi possível buscar as cotações',
    toastPricesRecent: 'Respira, Sardinha! As cotações ainda estão fresquinhas.',
    toastImported: 'Carteira importada',
    toastExported: 'JSON exportado',
    toastSettingsSaved: 'Configurações salvas',
    toastAdded: (id) => `${id} adicionado`,
    toastRemoved: (id) => `${id} removido`,
    toastExists: (id) => `${id} já existe`,
    toastUndo: 'Desfazer',
    toastJsonOnly: 'Envie apenas arquivos .json',
    toastErrorPrefix: 'Erro: ',
    toastInvalidFormat: 'Formato inválido',

    // Welcome
    welcomeTitle: 'Comece sua carteira',
    welcomeText: 'Crie uma carteira vazia ou importe um <code>.json</code> existente.',
    welcomeInitBtn: 'Criar carteira',
    welcomeImportBtn: 'Importar JSON',

    // Loading
    loadingDefault: 'Carregando...',
    loadingImporting: 'Importando...',
    loadingExchange: 'Atualizando câmbio',
    loadingCrypto: 'Buscando cripto',
    dropHint: 'Solte o arquivo JSON aqui',

    // Accessibility
    a11yBubbleChart: 'Mapa da carteira por tamanho de posição',
    a11yRemove: (id) => `Remover ${id}`,
    a11yNote: (id) => `Comentário de ${id}`,
    a11yAddNote: 'Adicionar comentário',
    a11yTargetClass: (label) => `Meta de ${label} (%)`,
    a11yGoalClass: (label) => `Meta de ${label} (R$)`,
    a11yAmountOf: (id) => `Quantidade de ${id}`,
    a11yTargetOf: (id) => `Meta % de ${id} na classe`,
    a11yToggleChart: (label, hidden) => `${hidden ? 'Ocultar' : 'Mostrar'} ${label} no gráfico`,
    a11yGotoClass: (label) => `Abrir ${label}`,
    a11yMoveUp: 'Mover para cima',
    a11yMoveDown: 'Mover para baixo',
  },
};

let locale = 'pt-BR';

export function getLocale() {
  return locale;
}

export function t(key, ...args) {
  const value = strings[locale]?.[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
}

export function tn(section, key) {
  return strings[locale]?.[section]?.[key] ?? key;
}
