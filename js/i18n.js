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
    pageTitle: 'Minha Holding',

    // Header and navigation
    navAssetClasses: 'Navegação por classe de ativos',
    importJsonTitle: 'Importar carteira JSON',
    exportJsonTitle: 'Exportar carteira JSON',
    themeToggleTitle: 'Alternar tema claro e escuro',
    settingsTitleShort: 'Configurações de API',
    refreshPricesTitle: 'Atualizar cotações',

    // Tabs
    tabOverview: 'Metas',
    tabPortfolio: 'Carteira',

    // Classes
    classLabels: {
      brStocks: 'Ações',
      brFiis: 'FIIs',
      usStocks: 'Stocks',
      usReits: 'REITs',
      fixedIncome: 'Renda Fixa',
      emergencyReserve: 'Reserva Emergência',
      storeOfValue: 'Reserva Valor',
      assets: 'Bens',
    },
    classDescriptions: {
      brStocks: 'Participações em empresas na bolsa brasileira (B3). No longo prazo, tendem a superar a inflação por meio de valorização e dividendos.',
      brFiis: 'Fundos Imobiliários negociados na B3, que investem em imóveis ou títulos imobiliários. Distribuem rendimentos mensais isentos de IR para pessoa física.',
      usStocks: 'Ações de empresas nas bolsas americanas (NYSE, Nasdaq). Dão exposição ao dólar e acesso a setores como tecnologia, saúde e consumo global.',
      usReits: 'Real Estate Investment Trusts, os equivalentes americanos dos FIIs. Investem em imóveis como data centers, hospitais e galpões, com dividendos regulares.',
      fixedIncome: 'Títulos como CDBs, LCIs, LCAs e Tesouro Direto. Oferecem previsibilidade e proteção, sendo a base de segurança da carteira.',
      emergencyReserve: 'Reserva com liquidez imediata, geralmente de 6 a 12 meses de custo de vida. Deve ficar em ativos seguros e de resgate rápido, como Tesouro Selic ou CDB diário.',
      storeOfValue: 'Ativos que preservam valor no longo prazo, como Bitcoin e ouro. Servem como proteção contra desvalorização cambial e instabilidade monetária.',
      assets: 'Bens patrimoniais como imóveis de uso pessoal e veículos. Compõem o patrimônio total, mas não fazem parte da estratégia de aporte.',
    },

    // Overview
    metaLabel: 'Meta',
    targetLabel: 'Meta %',
    goalLabel: 'Meta',
    warningTargetSum: (sum) => `As metas somam <strong>${sum}%</strong>, mas o total ideal é 100%.`,
    infoStale: (date) => `Cotações desatualizadas (${date}). Atualize em <strong>Cotar</strong>.`,
    infoNoPrices: 'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.',
    successBalanced: 'Carteira balanceada. Nenhuma classe precisa de aporte no momento.',
    inactiveClassHint: 'Classe ignorada no rebalanceamento.',
    emergencyPriority: 'A meta da Reserva de Emergência ainda não foi atingida. Priorize novos aportes nela antes das demais classes.',

    // Badges
    badgeInvest: 'aportar',
    badgeInvestTitle: 'Ativo com prioridade de aporte.',
    badgeSkip: 'ignorar',
    badgeSkipTitle: 'Ativo ignorado no rebalanceamento.',

    // Charts
    portfolioLabel: 'Patrimônio',
    noData: 'Sem dados para exibir',
    partialSuffix: '(parcial)',

    // Table
    colName: 'Nome',
    colAmount: 'Qtd.',
    colPrice: 'Preço',
    colChange: 'Hoje',
    colTotal: 'Total',
    colTarget: 'Meta %',
    colActionsA11y: 'Opções',
    addAsset: '+ Adicionar ativo',
    emptyClass: 'Nenhum ativo nesta classe.',
    declaredPrice: 'Valor declarado',
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
    btnSave: 'Salvar',

    // Settings
    settingsTitle: 'Tokens de API',
    settingsHint: 'Tokens gratuitos para buscar cotações em tempo real.',
    brapiLabel: 'brapi.dev (Ações / FIIs)',
    brapiHint: 'Crie grátis em brapi.dev/dashboard',
    brapiCreateAccount: 'Criar conta',
    finnhubLabel: 'Finnhub (Stocks / REITs)',
    finnhubHint: 'Crie grátis em finnhub.io',
    finnhubCreateAccount: 'Criar conta',
    externalLinkLabel: 'Abrir link externo',

    // Toasts
    toastConfigTokens: 'Configure os tokens de API em ⚙️',
    toastPricesOk: 'Cotações atualizadas',
    toastPricesFail: 'Não foi possível buscar as cotações',
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
    welcomeTitle: 'Importe sua carteira',
    welcomeText: 'Arraste um arquivo <code>.json</code> ou clique para carregar.',
    welcomeBtn: 'Importar JSON',

    // Loading
    loadingDefault: 'Carregando...',
    loadingImporting: 'Importando...',
    loadingExchange: 'Atualizando câmbio',
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
    a11yMoveUp: 'Mover para cima',
    a11yMoveDown: 'Mover para baixo',
  },
};

let locale = 'pt-BR';

export function setLocale(nextLocale) {
  if (strings[nextLocale]) locale = nextLocale;
}

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
