import Parser from "rss-parser";
import { storage } from "../storage";
import type { InsertNewsItem } from "@shared/schema";
import { findThemesByText } from "@shared/categories";
import { GoogleGenAI } from "@google/genai";

const parser = new Parser();

const SENTINELA_PROMPT = `# ROLE
Você é o **Sentinela IA**, um Analista Sênior de Riscos Globais e Desastres para o aplicativo "Verifica". Sua função é atuar como um filtro de segurança rigoroso, analisando feeds de notícias em tempo real e selecionando apenas eventos de **ALTO IMPACTO**, **RISCO IMINENTE** ou **RELEVÂNCIA CIENTÍFICA**.

# OBJECTIVE
Receba um objeto contendo \`título\` e \`descrição\` de uma notícia. Retorne um JSON indicando se a notícia deve ser aprovada ou rejeitada, baseado em uma análise de 4 etapas.

# KNOWLEDGE BASE (TÓPICOS MONITORADOS)
Use estas categorias como guia. Se a notícia não se encaixar aqui, rejeite.

1.  **FENÔMENOS NATURAIS:** Terremoto, Tsunami, Vulcão, Ciclone/Furacão, Tornado, Chuva Severa/Enchente, Deslizamento, Seca Extrema, Onda de Calor, Frio Extremo/Nevasca, Granizo, Maré Alta/Ressaca.
2.  **ESPAÇO & ASTRONOMIA:** Tempestade Solar/Geomagnética, Aurora Boreal, Eclipse, Asteroide/Meteoro (NEO), Lixo Espacial (Reentrada).
3.  **RISCOS BIOLÓGICOS & AMBIENTAIS:** Epidemia/Vírus (Surtos Novos), Incêndio (Florestal ou Grande Escala), Poluição Tóxica/Radiação.
4.  **RISCOS TECNOLÓGICOS:** Colapso Estrutural (Barragens/Pontes), Apagão (Blackout massivo), Acidente de Transporte (Massa/Aéreo), Ciberataque (Infraestrutura).
5.  **GEOPOLÍTICA & CONFLITOS:** Guerra/Invasão, Golpe de Estado, Terrorismo, Ameaça Nuclear, Crise Diplomática Grave (Ruptura).

---

# PROTOCOLO DE ANÁLISE (CHAIN OF THOUGHT)

Para cada notícia, você deve processar estas 4 verificações sequenciais. Se falhar em qualquer uma, REJEITE.

### PASSO 1: VERIFICAÇÃO SEMÂNTICA (Literal vs. Metafórico)
A notícia usa os termos de forma literal?
* **REJEITAR (Metáforas):** "Terremoto político", "Tempestade de críticas", "Chuva de gols", "Vírus de computador" (exceto se for Ciberataque infraestrutural), "Bomba no mercado financeiro".
* **APROVAR:** Apenas eventos físicos e reais.

### PASSO 2: FILTRO DE MAGNITUDE (Macro vs. Micro)
O evento tem escala relevante para um alerta público?
* **REJEITAR (Micro/Local):** Incêndio em uma única casa, acidente de carro comum, chuva leve, crime urbano comum, briga de bar.
* **APROVAR (Macro/Regional):** Incêndios florestais, enchentes que param cidades, acidentes com múltiplas vítimas, eventos que afetam infraestrutura (aeroportos, represas, hospitais).

### PASSO 3: FILTRO GEOPOLÍTICO (Ação vs. Retórica)
Se o tema for Geopolítica, separe o fato do discurso.
* **REJEITAR (Retórica):** Discursos de líderes, ameaças verbais vazias, pesquisas de opinião, reuniões protocolares, "tensões aumentam" (sem ação).
* **APROVAR (Cinética/Fática):** Movimentação de tropas, disparos de mísseis, ataques confirmados, sanções assinadas, mortes, golpes de estado consumados.

### PASSO 4: VALIDAÇÃO CIENTÍFICA (Para Espaço/Vulcões)
* **REJEITAR:** Curiosidades menores ("Lua bonita hoje"), vulcão apenas fumegando (sem mudança de alerta).
* **APROVAR:** Eventos raros (Eclipses), perigosos (Tempestades Solares G4/G5) ou mudanças de nível de alerta vulcânico.

---

# FEW-SHOT EXAMPLES (Padrão de Qualidade)

Input: "Mercado financeiro sofre terremoto com a nova taxa de juros."
Output: {"aprovado": false, "motivo": "Metáfora para economia"}

Input: "Incêndio destrói loja de sapatos no centro, ninguém se feriu."
Output: {"aprovado": false, "motivo": "Escala micro/local irrelevante"}

Input: "Coreia do Norte promete destruir inimigos em discurso anual."
Output: {"aprovado": false, "motivo": "Retórica geopolítica sem ação cinética"}

Input: "USGS reporta terremoto de magnitude 7.2 no Japão, alerta de Tsunami emitido."
Output: {"aprovado": true, "tag": "Terremoto", "risco": "Crítico"}

Input: "Tempestade Solar classe X atinge a Terra, risco de falha em satélites."
Output: {"aprovado": true, "tag": "Tempestade Solar", "risco": "Alto"}

Input: "Tanques cruzam a fronteira e iniciam invasão terrestre na região leste."
Output: {"aprovado": true, "tag": "Guerra / Conflito", "risco": "Crítico"}

---

# OUTPUT FORMAT (JSON ONLY)

Responda estritamente com este JSON. Não adicione texto fora do JSON.

{
  "aprovado": boolean,
  "tag_exibicao": string, // Escolha a melhor tag da lista "KNOWLEDGE BASE"
  "nivel_de_risco": string, // "Informativo", "Alerta", "Crítico"
  "resumo_analise": string // Uma frase curta (max 10 palavras) justificando a decisão.
}`;

async function verifySentinela(title: string, content: string): Promise<{
  aprovado: boolean;
  tag_exibicao?: string;
  nivel_de_risco?: string;
  resumo_analise?: string;
} | null> {
  try {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
      return { aprovado: true };
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const inputData = `{
  "título": "${title.replace(/"/g, '\\"')}",
  "descrição": "${content.replace(/"/g, '\\"').slice(0, 500)}"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${SENTINELA_PROMPT}\n\nNotícia para análise:\n${inputData}`,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Error in Sentinela verification:", error);
    return null;
  }
}

async function generateAiSummary(title: string, content: string): Promise<string | null> {
  try {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
      return null;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const prompt = `Você é um jornalista brasileiro especializado em traduzir notícias complexas para linguagem simples e acessível.

Título da notícia: ${title}

Conteúdo original: ${content}

Por favor, crie um resumo muito claro e simples desta notícia em português brasileiro. O resumo deve:
- Ser fácil de entender por qualquer pessoa
- Explicar o que aconteceu de forma objetiva
- Ter no máximo 3 parágrafos curtos
- Evitar jargões técnicos
- Responder: O que? Onde? Quando? Por quê é importante?

Responda apenas com o resumo, sem introduções ou explicações adicionais.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || null;
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return null;
  }
}

function calculateReliability(sourceType: "official" | "media" | "blog"): {
  reliability: "high" | "medium" | "low" | "investigating";
  whyReliable: string;
} {
  if (sourceType === "official") {
    return {
      reliability: "high",
      whyReliable: "Confirmado por fonte oficial governamental."
    };
  } else if (sourceType === "media") {
    return {
      reliability: "medium",
      whyReliable: "Reportado por veículo de imprensa, aguardando confirmação oficial."
    };
  } else {
    return {
      reliability: "investigating",
      whyReliable: "Fonte independente, requer verificação adicional."
    };
  }
}

export async function fetchRSSFromSource(sourceId: string): Promise<void> {
  const source = await storage.getSource(sourceId);
  if (!source || !source.rssUrl) return;

  try {
    const feed = await parser.parseURL(source.rssUrl);
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    for (const item of feed.items.slice(0, 10)) {
      const title = item.title || "Sem título";
      const originalUrl = item.link || source.url;
      
      // Check if news is within 48 hours FIRST before any processing
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      if (!pubDate || pubDate < fortyEightHoursAgo) {
        console.log(`Notícia antiga (>48h) ignorada: ${title.slice(0, 50)}...`);
        continue;
      }
      
      const existing = await storage.findNewsItemByUrlOrTitle(originalUrl, title);
      if (existing) {
        console.log(`Notícia já existe no banco: ${title.slice(0, 50)}...`);
        continue;
      }
      
      const rawContent = item.contentSnippet || item.content || item.summary || "";
      const content = rawContent.replace(/<[^>]*>?/gm, '').trim();
      
      const foundThemes = findThemesByText(`${title} ${content}`);
      if (foundThemes.length === 0) {
        console.log(`Nenhum tema encontrado para: ${title.slice(0, 50)}...`);
        continue;
      }

      const verification = await verifySentinela(title, content);
      if (!verification || !verification.aprovado) {
        console.log(`Sentinela rejeitou: ${title.slice(0, 50)}... - ${verification?.resumo_analise || 'sem motivo'}`);
        continue;
      }

      const { reliability, whyReliable } = calculateReliability(source.type);
      
      let alertLevel: "critical" | "warning" | "info" = "info";
      if (verification.nivel_de_risco === "Crítico") {
        alertLevel = "critical";
      } else if (verification.nivel_de_risco === "Alerta") {
        alertLevel = "warning";
      }

      const newsItem: InsertNewsItem = {
        title,
        summary: content.slice(0, 300) + (content.length > 300 ? "..." : ""),
        fullContent: content.slice(0, 1000),
        tags: foundThemes.map(t => t.id),
        timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
        reliability,
        alertLevel,
        sourceIds: [sourceId],
        verificationNotes: `Fonte: ${source.name}`,
        impactAnalysis: verification.resumo_analise,
        riskLevel: verification.nivel_de_risco,
        whyReliable,
        originalUrl,
      };

      const createdItem = await storage.createNewsItem(newsItem);
      console.log(`Notícia aprovada e salva: ${title.slice(0, 50)}...`);
      
      const aiSummary = await generateAiSummary(title, content);
      if (aiSummary) {
        await storage.updateNewsItemAiSummary(createdItem.id, aiSummary);
      }
    }

    await storage.updateSourceLastFetched(sourceId);
  } catch (error) {
    console.error(`Error fetching RSS from ${source.name}:`, error);
  }
}

export async function fetchAllRSS(): Promise<void> {
  const allSources = await storage.getAllSources();
  const sourcesWithRSS = allSources.filter(s => s.rssUrl);
  
  for (const source of sourcesWithRSS) {
    await fetchRSSFromSource(source.id);
  }
}
