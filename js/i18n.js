/**
 * Centralised UI strings for future internationalisation.
 *
 * Every user-visible label, hint, placeholder and description lives here.
 * To add a new locale, duplicate the `pt-BR` object under a new key
 * and translate each value. Then call `setLocale('xx-YY')` at boot.
 */

const strings = {
  'pt-BR': {
    /* ── App chrome ─────────────────────────────────────────── */
    appTitle:           'Minha Holding',
    btnSettings:        'Configurações de API',
    btnTheme:           'Alternar tema claro e escuro',
    btnImport:          'Importar carteira JSON',
    btnExport:          'Exportar carteira JSON',
    btnPrices:          'Cotar',
    btnPricesLabel:     'Atualizar cotações',

    /* ── Tabs ───────────────────────────────────────────────── */
    tabOverview:        'Metas',
    tabPortfolio:       'Carteira',

    /* ── Classes ────────────────────────────────────────────── */
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
        'Participações em empresas listadas na bolsa brasileira (B3). ' +
        'No longo prazo, ações tendem a superar a inflação e gerar riqueza por meio de valorização e dividendos.',
      brFiis:
        'Fundos Imobiliários negociados na B3. Investem em imóveis físicos ou títulos imobiliários ' +
        'e distribuem rendimentos mensais isentos de IR para pessoa física.',
      usStocks:
        'Ações de empresas listadas nas bolsas americanas (NYSE, Nasdaq). ' +
        'Proporcionam exposição ao dólar e acesso a setores como tecnologia, saúde e consumo global.',
      usReits:
        'Real Estate Investment Trusts — equivalentes americanos dos FIIs. ' +
        'Investem em imóveis como data centers, hospitais e galpões logísticos, distribuindo dividendos regulares.',
      fixedIncome:
        'Títulos de renda fixa como CDBs, LCIs, LCAs e Tesouro Direto. ' +
        'Oferecem previsibilidade e proteção, sendo a base de segurança da carteira.',
      emergencyReserve:
        'Reserva com liquidez imediata para imprevistos — geralmente de 6 a 12 meses de custo de vida. ' +
        'Deve ficar em ativos seguros e de resgate rápido, como Tesouro Selic ou CDB com liquidez diária.',
      storeOfValue:
        'Ativos que preservam valor no longo prazo, como Bitcoin e ouro. ' +
        'Funcionam como proteção contra desvalorização cambial e instabilidade monetária.',
      assets:
        'Bens patrimoniais como imóveis de uso pessoal e veículos. ' +
        'Compõem o patrimônio total mas não fazem parte da estratégia de aporte.',
    },

    /* ── Overview / Metas ───────────────────────────────────── */
    metaLabel:          'meta',
    allocationLabel:    'Alocação',
    targetLabel:        'Meta %',
    actualLabel:        'Atual',
    warningTargetSum:   (sum) => `As metas somam <strong>${sum}%</strong>, mas deveriam totalizar 100%.`,
    infoStale:          (dateStr) => `Cotações desatualizadas (${dateStr}). Atualize em <strong>Cotar</strong>.`,
    infoNoPrices:       'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.',
    successBalanced:    'Carteira balanceada — nenhuma classe precisa de aporte no momento.',
    disabledClassHint:  'Meta 0% — não participa do rebalanceamento.',

    /* ── Badges ─────────────────────────────────────────────── */
    badgeAportar:       'aportar',
    badgeAportarTitle:  'Maior necessidade de aporte',
    badgeIgnorar:       'ignorar',
    badgeIgnorarTitle:  'Em quarentena',

    /* ── Carteira / Charts ──────────────────────────────────── */
    portfolioLabel:     'Patrimônio',
    noData:             'Sem dados para exibir',
    partialSuffix:      '(parcial)',

    /* ── Asset table ────────────────────────────────────────── */
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

    /* ── Add modal ──────────────────────────────────────────── */
    addModalTitle:      'Adicionar Ativo',
    addFieldTicker:     'Nome / Ticker',
    addTickerHint:      'Ex: PETR4, CDB Inter',
    addFieldAmount:     'Quantidade ou valor (R$)',
    addAmountHint:      'Ex: 100 (0 para incluir sem posição)',
    addFieldTarget:     'Meta % (dentro da classe)',
    addTargetHint:      'Vazio = distribuição igual, 0 = quarentena',
    btnCancel:          'Cancelar',
    btnAdd:             'Adicionar',

    /* ── Note modal ─────────────────────────────────────────── */
    noteModalTitle:     'Comentário',
    noteHintPrefix:     'Nota sobre',
    notePlaceholder:    'Ex: Vence em 2027, rendendo 120% CDI',
    btnSave:            'Salvar',

    /* ── Settings modal ─────────────────────────────────────── */
    settingsTitle:      'Tokens de API',
    settingsHint:       'Tokens gratuitos para cotações em tempo real.',
    brapiLabel:         'brapi.dev (Ações / FIIs)',
    brapiHint:          'Crie grátis em brapi.dev/dashboard',
    finnhubLabel:       'Finnhub (Stocks / REITs)',
    finnhubHint:        'Crie grátis em finnhub.io',
    linkCreate:         'Criar conta',

    /* ── Toasts ─────────────────────────────────────────────── */
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

    /* ── Welcome ────────────────────────────────────────────── */
    welcomeTitle:       'Importe sua carteira',
    welcomeText:        'Arraste um arquivo <code>.json</code> ou clique para carregar.',
    welcomeBtn:         'Importar JSON',

    /* ── Loading ────────────────────────────────────────────── */
    loadingDefault:     'Carregando...',
    loadingImporting:   'Importando...',
    loadingExchange:    'Câmbio',

    /* ── Drop zone ──────────────────────────────────────────── */
    dropHint:           'Solte o arquivo JSON aqui',

    /* ── Accessibility ──────────────────────────────────────── */
    a11yBubbleChart:    'Mapa da carteira por tamanho de posição',
    a11yRemove:         (id) => `Remover ${id}`,
    a11yNote:           (id) => `Comentário de ${id}`,
    a11yAddNote:        'Adicionar comentário',
    a11yTargetClass:    (label) => `Meta de ${label} (%)`,
    a11yAllocation:     (label, actual, target) => `Alocação de ${label}: ${actual}% de ${target}%`,
    a11yAmountOf:       (id) => `Quantidade de ${id}`,
    a11yTargetOf:       (id) => `Meta % de ${id} na classe`,
    a11yTargetTitle:    'Meta do ativo na classe',
  },
};

let currentLocale = 'pt-BR';

export function setLocale(locale) {
  if (strings[locale]) currentLocale = locale;
}

export function t(key, ...args) {
  const val = strings[currentLocale]?.[key] ?? strings['pt-BR']?.[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

/** Access nested keys like t('className', 'brStocks') → 'Ações'. */
export function tn(section, key) {
  return strings[currentLocale]?.[section]?.[key]
      ?? strings['pt-BR']?.[section]?.[key]
      ?? key;
}
