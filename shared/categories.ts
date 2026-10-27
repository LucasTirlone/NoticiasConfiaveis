export interface Theme {
  id: string;
  name: string;
  keywords: string[];
  editorialGuidance: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  editorialGuidance: string;
  themes: Theme[];
}

export const CATEGORIES: Category[] = [
  {
    id: "space",
    name: "Espaço & Astronomia",
    icon: "🌌",
    editorialGuidance: "Eventos astronômicos e espaciais que sejam o assunto principal; não inclua metáforas, curiosidades ou menções incidentais a fenômenos celestes.",
    themes: [
      {
        id: "tempestade_solar",
        name: "Tempestade Solar",
        editorialGuidance: "Inclua atividade solar ou geomagnética relevante, como ejeção de massa coronal ou tempestade que afete a Terra. Exclua tempestades meteorológicas terrestres e atividade solar rotineira sem impacto ou relevância destacada.",
        keywords: ["tempestade geomagnética", "ejeção de massa coronal", "CME", "mancha solar", "atividade solar extrema", "flare solar", "solar storm", "geomagnetic storm"]
      },
      {
        id: "aurora_boreal",
        name: "Aurora Boreal",
        editorialGuidance: "Inclua observação, previsão ou impacto de auroras boreais ou austrais como foco. Exclua matéria sobre tempestade geomagnética sem aurora quando o evento central for outro.",
        keywords: ["aurora austral", "luzes do norte", "tempestade geomagnética visível", "aurora", "northern lights"]
      },
      {
        id: "eclipse",
        name: "Eclipse",
        editorialGuidance: "Inclua eclipse ou ocultação astronômica como evento central, com observação, trajetória ou efeitos. Exclua lua cheia, alinhamento comum e expressões figuradas como 'anel de fogo' sem eclipse.",
        keywords: ["eclipse total", "eclipse anular", "lua de sangue", "anel de fogo", "ocultação estelar"]
      },
      {
        id: "asteroide_meteoro",
        name: "Asteroide / Meteoro",
        editorialGuidance: "Inclua descoberta, passagem, observação ou risco real de asteroide, meteoro ou bólido. Exclua explosões terrestres e analogias; não trate passagem próxima como risco de impacto sem evidência.",
        keywords: ["asteroide", "meteoro", "bólido", "bola de fogo", "NEO", "Near-Earth Object", "risco de impacto", "passagem próxima"]
      },
      {
        id: "lixo_espacial",
        name: "Lixo Espacial",
        editorialGuidance: "Inclua detritos, satélite ou estágio de foguete descontrolado/reentrando, ou risco de colisão orbital. Exclua lançamentos e operações espaciais normais sem relação com detritos.",
        keywords: ["reentrada atmosférica", "queda de satélite", "detritos espaciais", "foguete descontrolado", "estação espacial"]
      }
    ]
  },
  {
    id: "natural",
    name: "Fenômenos Naturais",
    icon: "🌪️",
    editorialGuidance: "Eventos naturais perigosos ou de impacto público; classifique pelo fenômeno que causa a notícia, não por condições meteorológicas secundárias.",
    themes: [
      {
        id: "terremoto",
        name: "Terremoto",
        editorialGuidance: "Inclua abalo sísmico natural com magnitude, impacto, alerta ou resposta como foco. Exclua tremores de máquinas, explosões e menções históricas sem novo evento.",
        keywords: ["terremoto", "sismo", "tremor de terra", "abalo sísmico", "magnitude", "Richter", "epicentro", "earthquake", "quake", "seismic", "temblor"]
      },
      {
        id: "tsunami",
        name: "Tsunami",
        editorialGuidance: "Inclua tsunami/maremoto ou alerta oficial associado a ondas sísmicas como assunto central. Exclua maré alta, ressaca costeira e ondas comuns sem origem em tsunami.",
        keywords: ["tsunami", "maremoto", "alerta de tsunami", "onda gigante", "recuo do mar", "tidal wave"]
      },
      {
        id: "vulcao",
        name: "Vulcão",
        editorialGuidance: "Inclua erupção, atividade vulcânica, lava, cinzas ou risco vulcânico que organize a notícia. Exclua incêndios comuns e nuvens de cinza não vulcânicas.",
        keywords: ["vulcão", "erupção vulcânica", "fluxo piroclástico", "nuvem de cinzas", "lava", "atividade vulcânica", "volcano", "eruption", "magma", "ash cloud"]
      },
      {
        id: "ciclone_tornado",
        name: "Ciclone / Tornado",
        editorialGuidance: "Inclua ciclone tropical, furacão, tufão ou tornado como evento central, incluindo trajetória e impactos diretamente atribuídos. Exclua tempestade comum sem sistema ciclônico/tornado identificado.",
        keywords: ["ciclone", "tornado", "furacão", "tufão", "tempestade tropical", "vendaval", "tromba d'água", "hurricane", "typhoon", "cyclone", "tropical storm", "twister", "storm surge"]
      },
      {
        id: "chuva_enchente",
        name: "Chuva Forte / Enchente",
        editorialGuidance: "Inclua chuva excepcional, inundação ou transbordamento com risco/impacto como foco. Exclua chuva rotineira e alagamento apenas citado como consequência menor de outro evento.",
        keywords: ["chuva forte", "enchente", "alagamento", "inundação", "transbordamento de rio", "tempestade severa", "acumulado de chuva", "flood", "flooding", "heavy rain", "deluge", "downpour"]
      },
      {
        id: "deslizamento",
        name: "Deslizamento",
        editorialGuidance: "Inclua movimento de terra/rocha, soterramento ou queda de barreira como evento principal. Exclua desabamento de construção por falha estrutural, sem deslizamento natural.",
        keywords: ["deslizamento", "queda de barreira", "desmoronamento", "soterramento", "deslizamento de terra", "landslide", "mudslide", "rockfall"]
      },
      {
        id: "onda_calor_seca",
        name: "Onda de Calor / Seca",
        editorialGuidance: "Inclua calor extremo persistente, recordes relevantes ou seca/escassez hídrica com impacto. Exclua previsão de dia quente comum e falta localizada de água sem relação com seca.",
        keywords: ["onda de calor", "seca extrema", "estiagem", "recorde de temperatura", "falta de água", "heat wave", "drought", "extreme heat", "water shortage"]
      },
      {
        id: "frio_nevasca",
        name: "Frio Extremo / Nevasca",
        editorialGuidance: "Inclua frio extremo, nevasca ou congelamento com alerta ou impacto relevante. Exclua frio sazonal normal e neve sem risco ou repercussão.",
        keywords: ["frio extremo", "nevasca", "geada negra", "tempestade de inverno", "congelamento", "frente fria intensa", "neve", "blizzard", "freezing", "snowstorm", "ice storm"]
      },
      {
        id: "granizo",
        name: "Granizo",
        editorialGuidance: "Inclua queda de granizo significativa, alerta ou danos atribuídos ao granizo como foco. Exclua menção a possibilidade de granizo quando o evento central é outra ameaça e sem impacto.",
        keywords: ["granizo", "chuva de pedra", "granizo severo", "danos por granizo", "hail", "hailstone"]
      },
      {
        id: "mare_alta",
        name: "Maré Alta",
        editorialGuidance: "Inclua maré excepcional, ressaca ou avanço/erosão costeira que seja o evento central. Exclua inundação fluvial e tsunami, que pertencem a filtros próprios.",
        keywords: ["maré alta", "ressaca", "avanço do mar", "erosão costeira", "storm surge", "high tide", "coastal flooding"]
      }
    ]
  },
  {
    id: "biological",
    name: "Riscos Biológicos e Ambientais",
    icon: "🧬",
    editorialGuidance: "Ameaças à saúde pública ou ao ambiente. O filtro exige que a ameaça seja um dos eventos centrais, e não uma consequência ou detalhe lateral.",
    themes: [
      {
        id: "epidemia_virus",
        name: "Epidemia / Vírus",
        editorialGuidance: "Inclua surto, epidemia, pandemia, disseminação de patógeno ou alerta sanitário de escala relevante como assunto principal. Exclua casos isolados e menções a vírus sem surto ou risco coletivo.",
        keywords: ["epidemia", "vírus", "surto", "pandemia", "contágio", "OMS alerta", "novo vírus", "patógeno", "quarentena", "febre hemorrágica", "epidemic", "virus", "outbreak", "infection", "public health emergency"]
      },
      {
        id: "incendio",
        name: "Incêndio",
        editorialGuidance: "Inclua incêndio/queimada cuja ocorrência, propagação, ameaça, combate ou impacto seja parte central da notícia. Exclua fogo ateado durante ataque, guerra, protesto ou acidente quando serve apenas como detalhe da ação principal; a palavra 'fogo' sozinha não basta.",
        keywords: ["incêndio", "incêndio florestal", "queimada", "fogo em mata", "incêndio de grandes proporções", "wildfire", "fire", "bushfire", "blaze"]
      },
      {
        id: "poluicao_radiacao",
        name: "Poluição / Radiação",
        editorialGuidance: "Inclua contaminação, poluição, vazamento químico/nuclear/radioativo ou derramamento ambiental relevante como evento central. Exclua referência genérica a emissões, risco hipotético ou substância sem contaminação confirmada.",
        keywords: ["poluição", "radiação", "vazamento nuclear", "radioativo", "Césio", "vazamento de óleo", "maré negra", "nuvem tóxica", "qualidade do air perigosa", "pollution", "radiation", "nuclear", "toxic leak", "contamination"]
      }
    ]
  },
  {
    id: "tech",
    name: "Riscos Tecnológicos",
    icon: "🏭",
    editorialGuidance: "Falhas, acidentes e ataques a sistemas ou infraestrutura causados por tecnologia/atividade humana; diferencie a causa central de efeitos secundários.",
    themes: [
      {
        id: "colapso_estrutural",
        name: "Colapso Estrutural",
        editorialGuidance: "Inclua colapso, desabamento ou ruptura física de estrutura/infraestrutura como evento principal. Exclua ponte submersa sem colapso, congestionamento ou dano superficial.",
        keywords: ["rompimento de barragem", "queda de ponte", "desabamento de prédio", "colapso estrutural", "dam collapse", "bridge collapse"]
      },
      {
        id: "apagao",
        name: "Apagão",
        editorialGuidance: "Inclua interrupção ampla ou crítica do fornecimento de energia/rede elétrica. Exclua falta de energia em poucas casas ou interrupção localizada sem escala sistêmica.",
        keywords: ["apagão", "blackout", "falta de luz massiva", "colapso energético", "queda do sistema elétrico", "power outage"]
      },
      {
        id: "acidente_transporte",
        name: "Acidente de Transporte",
        editorialGuidance: "Inclua colisão, queda, descarrilamento ou naufrágio com transporte como evento central. Exclua veículo parado/atolado sem acidente ou acidente secundário mencionado de passagem.",
        keywords: ["queda de avião", "acidente aéreo", "descarrilamento de trem", "naufrágio", "plane crash", "train derailment"]
      },
      {
        id: "ciberataque",
        name: "Ciberataque",
        editorialGuidance: "Inclua intrusão, sabotagem, ransomware ou comprometimento cibernético confirmado/relevante como foco. Exclua fraude comum, falha técnica ou alegação não sustentada de invasão.",
        keywords: ["ciberataque", "ataque hacker", "ransomware", "sequestro de dados", "infraestrutura crítica", "vazamento massivo", "cyberattack"]
      }
    ]
  },
  {
    id: "geopolitics",
    name: "Geopolítica e Conflitos",
    icon: "⚔️",
    editorialGuidance: "Conflitos armados, rupturas institucionais e crises entre grupos/Estados. Diferencie a ação central de danos ou métodos incidentais.",
    themes: [
      {
        id: "conflito_guerra",
        name: "Conflito Armado / Guerra",
        editorialGuidance: "Inclua combate organizado, ataque militar/armado, invasão, bombardeio, operação de guerra ou cessar-fogo como assunto principal. Exclua violência criminal isolada sem contexto de conflito armado, metáforas e fogo sem evidência de ataque organizado. Casas queimadas durante um ataque não mudam o evento central de conflito para incêndio.",
        keywords: ["guerra", "declaração de guerra", "invasão", "incursão militar", "ataque aéreo", "bombardeio", "mísseis balísticos", "troca de tiros na fronteira", "cessar-fogo", "zona de exclusão aérea", "war", "invasion", "airstrike", "missile strike", "military operation", "fighting", "combat"]
      },
      {
        id: "golpe_estado",
        name: "Golpe de Estado",
        editorialGuidance: "Inclua tentativa ou tomada inconstitucional do poder, deposição forçada ou junta militar como evento central. Exclua disputa política, protesto ou mudança de governo regular sem ruptura institucional.",
        keywords: ["golpe militar", "tentativa de golpe", "lei marcial", "estado de sítio", "queda do governo", "renúncia forçada", "tomada do palácio", "junta militar", "coup", "overthrow", "uprising"]
      },
      {
        id: "terrorismo",
        name: "Terrorismo",
        editorialGuidance: "Inclua atentado ou ação violenta contra civis/objetivos políticos com motivação terrorista explicitada ou atribuída na fonte. Exclua explosão, tiroteio ou ataque sem caracterização/contexto que sustente terrorismo.",
        keywords: ["terrorismo", "atentado terrorista", "carro-bomba", "homem-bomba", "ataque suicida", "sequestro em massa", "célula extremista", "ataque coordenado", "terrorist attack", "bombing", "explosion"]
      },
      {
        id: "ameaca_nuclear",
        name: "Ameaça Nuclear",
        editorialGuidance: "Inclua ameaça, teste, uso ou escalada concreta envolvendo armas nucleares ou material/instalação nuclear com risco público. Exclua energia nuclear civil e retórica vaga sem ação ou ameaça específica.",
        keywords: ["ameaça nuclear", "teste nuclear", "enriquecimento de urânio", "ogiva nuclear", "armas químicas", "armas biológicas", "ICBM", "nuclear threat", "atomic weapon"]
      },
      {
        id: "crise_diplomatica",
        name: "Crise Diplomática Grave",
        editorialGuidance: "Inclua ruptura de relações, expulsões oficiais, sanções severas, embargo ou fechamento de fronteira que configure escalada diplomática central. Exclua desacordo verbal ou declaração rotineira.",
        keywords: ["crise diplomática", "rompimento de relações diplomáticas", "expulsão de embaixadores", "fechamento de fronteira", "sanções econômicas severas", "embargo total", "mobilização de tropas", "diplomatic crisis", "sanctions", "embargo"]
      }
    ]
  },
  {
    id: "politics",
    name: "Política & Economia",
    icon: "📊",
    editorialGuidance: "Eventos políticos, institucionais e econômicos de impacto coletivo; não classifique notícia apenas porque autoridades ou empresas são citadas.",
    themes: [
      {
        id: "crise_economica",
        name: "Crise Econômica",
        editorialGuidance: "Inclua recessão, crise bancária/financeira, colapso de mercado ou inflação extrema como foco e com evidência de gravidade. Exclua variações diárias normais e previsões sem crise instalada.",
        keywords: ["recessão", "colapso econômico", "crash financeiro", "crise bancária", "inflação extrema", "colapso da bolsa", "queda do PIB", "recession", "financial crisis", "market crash", "bank collapse", "economic collapse", "hyperinflation"]
      },
      {
        id: "eleicoes_democracia",
        name: "Eleições e Democracia",
        editorialGuidance: "Inclua eleições, fraude eleitoral comprovada/contestada, ruptura democrática, impeachment ou destituição quando forem o evento principal. Exclua atividade partidária rotineira e pesquisa eleitoral isolada.",
        keywords: ["fraude eleitoral", "eleição contestada", "crise democrática", "impeachment", "destituição", "cassação de mandato", "election fraud", "contested election", "democratic crisis", "coup attempt", "electoral fraud"]
      },
      {
        id: "tarifas_comercio",
        name: "Tarifas e Comércio",
        editorialGuidance: "Inclua tarifa, embargo comercial ou disputa/acordo de comércio com efeito relevante como assunto central. Exclua comércio genérico, preço de produto ou sanção sem dimensão comercial.",
        keywords: ["guerra comercial", "tarifa de importação", "tarifa aduaneira", "guerra tarifária", "acordo comercial", "trade war", "import tariff", "trade deal", "trade dispute", "customs duty", "protectionism"]
      },
      {
        id: "corrupcao_governanca",
        name: "Corrupção e Governança",
        editorialGuidance: "Inclua investigação, prova ou acusação atribuída de corrupção/desvio/abuso de governança como foco. Preserve a atribuição e exclua rumor, crítica política genérica ou crime sem nexo de governança.",
        keywords: ["corrupção governamental", "escândalo político", "desvio de verba pública", "lavagem de dinheiro", "superfaturamento", "corruption scandal", "bribery", "money laundering", "political scandal", "embezzlement"]
      },
      {
        id: "protestos_sociais",
        name: "Protestos e Greves",
        editorialGuidance: "Inclua manifestação coletiva, greve ou mobilização social como evento central. Exclua protesto pequeno citado como contexto de outro evento e violência isolada sem manifestação coletiva.",
        keywords: ["greve geral", "protesto massivo", "manifestação de massa", "revolta popular", "desobediência civil", "general strike", "mass protest", "civil unrest", "riot", "uprising", "demonstration"]
      }
    ]
  }
];

export function getAllThemeIds(): string[] {
  return CATEGORIES.flatMap(cat => cat.themes.map(t => t.id));
}

export function getThemeById(themeId: string): Theme | undefined {
  for (const cat of CATEGORIES) {
    const theme = cat.themes.find(t => t.id === themeId);
    if (theme) return theme;
  }
  return undefined;
}

export function getCategoryByThemeId(themeId: string): Category | undefined {
  return CATEGORIES.find(cat => cat.themes.some(t => t.id === themeId));
}

export function getAllKeywords(): string[] {
  return CATEGORIES.flatMap(cat => cat.themes.flatMap(t => t.keywords));
}

export function findThemeByKeyword(text: string): Theme | undefined {
  const lowerText = text.toLowerCase();
  for (const cat of CATEGORIES) {
    for (const theme of cat.themes) {
      if (theme.keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
        return theme;
      }
    }
  }
  return undefined;
}

export function findThemesByText(text: string): Theme[] {
  const lowerText = text.toLowerCase();
  const foundThemes: Theme[] = [];
  
  for (const cat of CATEGORIES) {
    for (const theme of cat.themes) {
      if (theme.keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
        if (!foundThemes.find(t => t.id === theme.id)) {
          foundThemes.push(theme);
        }
      }
    }
  }
  
  return foundThemes;
}
