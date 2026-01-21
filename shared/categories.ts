export interface Theme {
  id: string;
  name: string;
  keywords: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  themes: Theme[];
}

export const CATEGORIES: Category[] = [
  {
    id: "space",
    name: "Espaço & Astronomia",
    icon: "🌌",
    themes: [
      {
        id: "tempestade_solar",
        name: "Tempestade Solar",
        keywords: ["tempestade geomagnética", "ejeção de massa coronal", "CME", "mancha solar", "atividade solar extrema", "flare solar", "solar storm", "geomagnetic storm"]
      },
      {
        id: "aurora_boreal",
        name: "Aurora Boreal",
        keywords: ["aurora austral", "luzes do norte", "tempestade geomagnética visível", "aurora", "northern lights"]
      },
      {
        id: "eclipse",
        name: "Eclipse",
        keywords: ["eclipse total", "eclipse anular", "lua de sangue", "anel de fogo", "ocultação estelar"]
      },
      {
        id: "asteroide_meteoro",
        name: "Asteroide / Meteoro",
        keywords: ["asteroide", "meteoro", "bólido", "bola de fogo", "NEO", "Near-Earth Object", "risco de impacto", "passagem próxima"]
      },
      {
        id: "lixo_espacial",
        name: "Lixo Espacial",
        keywords: ["reentrada atmosférica", "queda de satélite", "detritos espaciais", "foguete descontrolado", "estação espacial"]
      }
    ]
  },
  {
    id: "natural",
    name: "Fenômenos Naturais",
    icon: "🌪️",
    themes: [
      {
        id: "terremoto",
        name: "Terremoto",
        keywords: ["terremoto", "sismo", "tremor de terra", "abalo sísmico", "magnitude", "Richter", "epicentro", "earthquake", "quake", "seismic", "temblor"]
      },
      {
        id: "tsunami",
        name: "Tsunami",
        keywords: ["tsunami", "maremoto", "alerta de tsunami", "onda gigante", "recuo do mar", "tidal wave"]
      },
      {
        id: "vulcao",
        name: "Vulcão",
        keywords: ["vulcão", "erupção vulcânica", "fluxo piroclástico", "nuvem de cinzas", "lava", "atividade vulcânica", "volcano", "eruption", "magma", "ash cloud"]
      },
      {
        id: "ciclone_tornado",
        name: "Ciclone / Tornado",
        keywords: ["ciclone", "tornado", "furacão", "tufão", "tempestade tropical", "vendaval", "tromba d'água", "hurricane", "typhoon", "cyclone", "tropical storm", "twister", "storm surge"]
      },
      {
        id: "chuva_enchente",
        name: "Chuva Forte / Enchente",
        keywords: ["chuva forte", "enchente", "alagamento", "inundação", "transbordamento de rio", "tempestade severa", "acumulado de chuva", "flood", "flooding", "heavy rain", "deluge", "downpour"]
      },
      {
        id: "deslizamento",
        name: "Deslizamento",
        keywords: ["deslizamento", "queda de barreira", "desmoronamento", "soterramento", "deslizamento de terra", "landslide", "mudslide", "rockfall"]
      },
      {
        id: "onda_calor_seca",
        name: "Onda de Calor / Seca",
        keywords: ["onda de calor", "seca extrema", "estiagem", "recorde de temperatura", "falta de água", "heat wave", "drought", "extreme heat", "water shortage"]
      },
      {
        id: "frio_nevasca",
        name: "Frio Extremo / Nevasca",
        keywords: ["frio extremo", "nevasca", "geada negra", "tempestade de inverno", "congelamento", "frente fria intensa", "neve", "blizzard", "freezing", "snowstorm", "ice storm"]
      },
      {
        id: "granizo",
        name: "Granizo",
        keywords: ["granizo", "chuva de pedra", "granizo severo", "danos por granizo", "hail", "hailstone"]
      },
      {
        id: "mare_alta",
        name: "Maré Alta",
        keywords: ["maré alta", "ressaca", "avanço do mar", "erosão costeira", "storm surge", "high tide", "coastal flooding"]
      }
    ]
  },
  {
    id: "biological",
    name: "Riscos Biológicos e Ambientais",
    icon: "🧬",
    themes: [
      {
        id: "epidemia_virus",
        name: "Epidemia / Vírus",
        keywords: ["epidemia", "vírus", "surto", "pandemia", "contágio", "OMS alerta", "novo vírus", "patógeno", "quarentena", "febre hemorrágica", "epidemic", "virus", "outbreak", "infection", "public health emergency"]
      },
      {
        id: "incendio",
        name: "Incêndio",
        keywords: ["incêndio", "incêndio florestal", "queimada", "fogo em mata", "incêndio de grandes proporções", "wildfire", "fire", "bushfire", "blaze"]
      },
      {
        id: "poluicao_radiacao",
        name: "Poluição / Radiação",
        keywords: ["poluição", "radiação", "vazamento nuclear", "radioativo", "Césio", "vazamento de óleo", "maré negra", "nuvem tóxica", "qualidade do air perigosa", "pollution", "radiation", "nuclear", "toxic leak", "contamination"]
      }
    ]
  },
  {
    id: "tech",
    name: "Riscos Tecnológicos",
    icon: "🏭",
    themes: [
      {
        id: "colapso_estrutural",
        name: "Colapso Estrutural",
        keywords: ["rompimento de barragem", "queda de ponte", "desabamento de prédio", "colapso estrutural", "dam collapse", "bridge collapse"]
      },
      {
        id: "apagao",
        name: "Apagão",
        keywords: ["apagão", "blackout", "falta de luz massiva", "colapso energético", "queda do sistema elétrico", "power outage"]
      },
      {
        id: "acidente_transporte",
        name: "Acidente de Transporte",
        keywords: ["queda de avião", "acidente aéreo", "descarrilamento de trem", "naufrágio", "plane crash", "train derailment"]
      },
      {
        id: "ciberataque",
        name: "Ciberataque",
        keywords: ["ciberataque", "ataque hacker", "ransomware", "sequestro de dados", "infraestrutura crítica", "vazamento massivo", "cyberattack"]
      }
    ]
  },
  {
    id: "geopolitics",
    name: "Geopolítica e Conflitos",
    icon: "⚔️",
    themes: [
      {
        id: "conflito_guerra",
        name: "Conflito Armado / Guerra",
        keywords: ["guerra", "declaração de guerra", "invasão", "incursão militar", "ataque aéreo", "bombardeio", "mísseis balísticos", "troca de tiros na fronteira", "cessar-fogo", "zona de exclusão aérea", "war", "invasion", "airstrike", "missile strike", "military operation", "fighting", "combat"]
      },
      {
        id: "golpe_estado",
        name: "Golpe de Estado",
        keywords: ["golpe militar", "tentativa de golpe", "lei marcial", "estado de sítio", "queda do governo", "renúncia forçada", "tomada do palácio", "junta militar", "coup", "overthrow", "uprising"]
      },
      {
        id: "terrorismo",
        name: "Terrorismo",
        keywords: ["terrorismo", "atentado terrorista", "carro-bomba", "homem-bomba", "ataque suicida", "sequestro em massa", "célula extremista", "ataque coordenado", "terrorist attack", "bombing", "explosion"]
      },
      {
        id: "ameaca_nuclear",
        name: "Ameaça Nuclear",
        keywords: ["ameaça nuclear", "teste nuclear", "enriquecimento de urânio", "ogiva nuclear", "armas químicas", "armas biológicas", "ICBM", "nuclear threat", "atomic weapon"]
      },
      {
        id: "crise_diplomatica",
        name: "Crise Diplomática Grave",
        keywords: ["crise diplomática", "rompimento de relações diplomáticas", "expulsão de embaixadores", "fechamento de fronteira", "sanções econômicas severas", "embargo total", "mobilização de tropas", "diplomatic crisis", "sanctions", "embargo"]
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
