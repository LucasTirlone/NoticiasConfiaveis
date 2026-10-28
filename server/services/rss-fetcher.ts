import Parser from "rss-parser";
import { storage } from "../storage";
import { db } from "../../db";
import { newsItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { InsertNewsItem } from "@shared/schema";
import { findThemesByText } from "@shared/categories";
import { generateAiSummary, withClassificationRetry } from "./ai-news-summary";
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
3.  **RISCOS BIOLÓGICOS & AMBIENTAIS:** Epidemia/Vírus (Surtos Novos em humanos), Incêndio (Florestal ou Grande Escala), Poluição Tóxica/Radiação.
4.  **RISCOS TECNOLÓGICOS:** Colapso Estrutural (Barragens/Pontes), Apagão (Blackout massivo), Acidente de Transporte (Massa/Aéreo), Ciberataque (Infraestrutura).
5.  **GEOPOLÍTICA & CONFLITOS:** Guerra/Invasão, Golpe de Estado, Terrorismo, Ameaça Nuclear, Crise Diplomática Grave (Ruptura).
6.  **POLÍTICA & ECONOMIA:** Crise Econômica (Recessão/Crash/Colapso bancário), Eleições Polêmicas (Fraude/Disputas graves/Impeachment), Guerras Tarifárias/Acordos Comerciais de Grande Impacto, Escândalos de Corrupção de Alto Nível, Protestos Massivos/Greve Geral.

---

# PROTOCOLO DE ANÁLISE (CHAIN OF THOUGHT)

Para cada notícia, você deve processar estas 4 verificações sequenciais. Se falhar em qualquer uma, REJEITE.

### PASSO 1: VERIFICAÇÃO SEMÂNTICA (Literal vs. Metafórico)
A notícia usa os termos de forma literal?
* **REJEITAR (Metáforas):** "Terremoto político", "Tempestade de críticas", "Chuva de gols", "Vírus de computador" (exceto se for Ciberataque infraestrutural), "Bomba no mercado financeiro".
* **APROVAR:** Apenas eventos físicos e reais.

### PASSO 2: FILTRO DE MAGNITUDE (Macro vs. Micro)
O evento tem escala relevante para um alerta público global ou regional?
* **REJEITAR (Micro/Local/Crime Comum):** Incêndio em uma única casa, acidente de carro comum, chuva leve, briga de bar, **OPERAÇÕES POLICIAIS DE ROTINA, CRIMES URBANOS (assaltos, grupos armados locais), PRISÕES INDIVIDUAIS**.
* **APROVAR (Macro/Regional):** Incêndios florestais, enchentes que param cidades, acidentes com múltiplas vítimas, eventos que afetam infraestrutura (aeroportos, represas, hospitais), CONFLITOS ARMADOS DE ESCALA NACIONAL OU TERRORISMO CONFIRMADO.

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
      config: { thinkingConfig: { thinkingBudget: 0 } },
      contents: `${SENTINELA_PROMPT}\n\nNotícia para análise:\n${inputData}`,
    });

    const text = response.text || "";
    console.log(`\n--- INICIO DEBUG SENTINELA ---`);
    console.log(`Notícia: ${title.slice(0, 80)}...`);
    console.log(`Resposta Bruta: ${text}`);
    console.log(`--- FIM DEBUG SENTINELA ---\n`);
    
    // Verificação extra de segurança: Se a resposta não contém JSON ou contém recusa, rejeitar
    if (!text.includes('{')) {
      console.log(`[Sentinela] Rejeitado por falta de formato JSON na resposta.`);
      return { aprovado: false };
    }

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

const PORTUGUESE_SOURCE_EXACT_NAMES = [
  'agência brasil (nacional)',
  'bbc news brasil',
  'g1 - globo',
  'onu news (nações unidas - em português)',
  'uol - folha',
  'uol notícias',
  'folha de s.paulo',
  'folha de são paulo',
];

function isPortugueseSource(sourceName: string): boolean {
  const lowerName = sourceName.toLowerCase().trim();
  const isPortuguese = PORTUGUESE_SOURCE_EXACT_NAMES.some(exactName => lowerName === exactName);
  console.log(`[Idioma] Fonte "${sourceName}" -> ${isPortuguese ? 'PORTUGUÊS (sem tradução)' : 'INGLÊS (traduzir)'}`);
  return isPortuguese;
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
      whyReliable: "Verificada pelo Sentinela IA. Publicada por veículo de grande imprensa."
    };
  } else {
    return {
      reliability: "investigating",
      whyReliable: "Fonte independente, requer verificação adicional."
    };
  }
}

export async function fetchRSSFromSource(sourceId: string, onProgress?: (stats: { count: number }) => void): Promise<void> {
  const source = await storage.getSource(sourceId);
  if (!source || !source.rssUrl) return;

  console.log(`\n--- Iniciando busca na fonte: ${source.name} ---`);

  try {
    // Fetch with explicit encoding detection to handle feeds that use
    // ISO-8859-1 / Latin-1 (common in some Brazilian news sources like UOL)
    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      const response = await fetch(source.rssUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SentinelaIA/1.0)" },
      });
      const buffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      // Peek at the first 300 bytes to detect encoding declaration in XML header
      const peek = new TextDecoder("utf-8", { fatal: false }).decode(uint8.slice(0, 300));
      const xmlEncMatch = peek.match(/encoding=["']([^"']+)["']/i);
      const ctEncMatch = (response.headers.get("content-type") || "").match(/charset=([^\s;]+)/i);
      const encoding = xmlEncMatch?.[1] || ctEncMatch?.[1] || "utf-8";
      const xmlText = new TextDecoder(encoding).decode(uint8);
      feed = await parser.parseString(xmlText);
    } catch {
      // Fallback to direct URL parsing if custom fetch fails
      feed = await parser.parseURL(source.rssUrl);
    }
    console.log(`Sucesso ao conectar com ${source.name}. Itens encontrados: ${feed.items.length}`);
    
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    let processedCount = 0;
    let localCount = 0;
    
    for (const item of feed.items) {
      if (processedCount >= 20) break; // Limit to 20 items total per source

      const title = item.title || "Sem título";
      const originalUrl = item.link || source.url;
      
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      const isDateValid = pubDate && !isNaN(pubDate.getTime());

      // If date is valid and older than 72h, ignore
      if (isDateValid && pubDate < seventyTwoHoursAgo) {
        continue;
      }

      // If date is invalid or missing, we allow it but only for the first 3 items as fallback
      if (!isDateValid && processedCount >= 3) {
        console.log(`Ignorando item sem data válida após limite de 3: ${title.slice(0, 50)}...`);
        continue;
      }
      
      // Verificar duplicata pelo título original OU URL original
      const existing = await storage.findNewsItemByOriginalTitleOrUrl(title, originalUrl);
      if (existing) {
        continue;
      }
      
      const rawContent = item.contentSnippet || item.content || item.summary || "";
      const content = rawContent.replace(/<[^>]*>?/gm, '').trim();
      
      const foundThemes = findThemesByText(`${title} ${content}`);
      if (foundThemes.length === 0) {
        continue;
      }

      const verification = await verifySentinela(title, content);
      if (!verification || !verification.aprovado) {
        console.log(`Sentinela rejeitou item de ${source.name}: ${title.slice(0, 50)}... - ${verification?.resumo_analise || 'sem motivo'}`);
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
        title: verification.tag_exibicao ? `${verification.tag_exibicao}: ${title}` : title,
        originalTitle: title,
        summary: content.slice(0, 300) + (content.length > 300 ? "..." : ""),
        fullContent: content,
        // Keywords are only a cheap intake gate, never a source of filter tags.
        // A new row remains unclassified until contextual validation completes.
        tags: [],
        timestamp: isDateValid ? pubDate : new Date(),
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
      console.log(`Notícia de ${source.name} aprovada: ${title.slice(0, 50)}...`);
      processedCount++;
      localCount++;
      if (onProgress) onProgress({ count: localCount });
      
      const isPortuguese = isPortugueseSource(source.name);
      const aiResult = await withClassificationRetry(
        () => generateAiSummary(title, content, isPortuguese),
      );
      
      if (aiResult) {
        // One atomic update: never expose tags before their summary/title is ready.
        // Preserve original RSS content for auditing and any later reclassification.
        await db.update(newsItems).set({
          aiSummary: aiResult.summary,
          title: isPortuguese ? title : aiResult.translatedTitle,
          tags: aiResult.tags,
        }).where(eq(newsItems.id, createdItem.id));
        console.log(`[Classificação] ${createdItem.id}: ${JSON.stringify({
          status: aiResult.tags.length ? "classificada" : "sem_classificacao_segura",
          decisions: aiResult.decisions,
        })}`);
      } else {
        // No third AI call just for translation, and no keyword fallback.
        // Retain the original row, untagged and excluded from category feeds.
        console.warn(`[Classificação] ${createdItem.id}: pendente por falha da IA; tags vazias preservadas.`);
      }
    }

    await storage.updateSourceLastFetched(sourceId);
    console.log(`--- Busca finalizada em ${source.name} ---\n`);
  } catch (error) {
    console.error(`!!! FALHA CRÍTICA NA FONTE: ${source.name} !!!`);
    console.error(`URL RSS: ${source.rssUrl}`);
    console.error(`Erro:`, error);
  }
}

export async function fetchAllRSS(): Promise<boolean> {
  // Tentar adquirir o lock distribuído via PostgreSQL
  const lockAcquired = await storage.acquireRefreshLock();
  if (!lockAcquired) {
    console.log("[RSS] Atualização já em andamento por outra instância, pulando...");
    return false;
  }

  try {
    const allSources = await storage.getAllSources();
    const sourcesWithRSS = allSources.filter(s => s.rssUrl);

    // Buscar 5 fontes em paralelo para reduzir o tempo total de ~10min para ~2min
    const { default: pLimit } = await import("p-limit");
    const limit = pLimit(5);

    await Promise.allSettled(
      sourcesWithRSS.map(source => limit(() => fetchRSSFromSource(source.id)))
    );
    return true;
  } finally {
    await storage.releaseRefreshLock();
  }
}
