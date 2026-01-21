import Parser from "rss-parser";
import { storage } from "../storage";
import type { InsertNewsItem } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";

const parser = new Parser();

const AVAILABLE_TAGS = [
  "tempestade solar", "aurora boreal", "terremoto", "tsunami", "ciclone", "tornado",
  "chuva forte", "enchente", "onda de calor", "frio extremo", "deslizamento", "seca",
  "granizo", "nevasca", "vulcão", "incêndio", "epidemia", "vírus", "radiação",
  "poluição", "maré alta"
];

async function verifyImpactAndRelevance(title: string, content: string): Promise<{
  aprovado: boolean;
  analise_de_impacto?: string;
  tag_sugerida?: string;
  nivel_de_risco?: string;
} | null> {
  try {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
      return { aprovado: true }; // Fallback se a IA não estiver configurada
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const prompt = `# ROLE
Você é um Especialista Sênior de Riscos Globais e Desastres Naturais para um sistema de alerta governamental. Sua função é filtrar notícias de feeds RSS e determinar se elas possuem RELEVÂNCIA PÚBLICA e ALTO IMPACTO.

# OBJECTIVE
Analise a notícia fornecida e decida se ela deve ser publicada no app "Verifica". Sua filtragem deve ser impiedosa: 90% das notícias do dia-a-dia devem ser descartadas. Apenas eventos com potencial catastrófico, impacto regional/nacional ou risco iminente de desastre devem passar.

# CRITÉRIOS DE APROVAÇÃO (IMPACTO E ESCALA)
Para ser aprovada, a notícia deve atender a pelo menos UM dos seguintes critérios de MAGNITUDE:

1. **Escala Geográfica:** Afeta uma região inteira, cidade, estado ou país. (Ex: "Incêndio na Califórnia" = SIM. "Incêndio no apartamento 302" = NÃO).
2. **Infraestrutura Crítica:** Causa colapso de serviços (falta de luz em massa, fechamento de aeroportos, destruição de represas).
3. **Risco à Vida em Massa:** Envolve evacuações, múltiplas vítimas ou alertas oficiais de perigo de vida.
4. **Anomalia Científica Relevante:** No caso de vulcões, tempestades solares ou vírus, não basta a ocorrência; deve haver um ALERTA DE RISCO aumentado. (Ex: "Vulcão fumegando normalmente" = NÃO. "Vulcão eleva nível de alerta para erupção iminente" = SIM).

# EXEMPLOS DE TREINAMENTO (FEW-SHOT LEARNING)

Input: "Bombeiros controlam incêndio em loja no centro de Osasco."
Reasoning: O evento é local, restrito a um imóvel, sem risco sistêmico ou evacuação em massa.
Veredito: REJEITAR

Input: "Tempestade na Grande SP deixa 500 mil sem luz e causa alagamentos nas marginais."
Reasoning: Afeta infraestrutura crítica (energia/trânsito), atinge milhões de pessoas e tem escala regional.
Veredito: APROVAR

Input: "Vulcão Etna solta anéis de fumaça, espetáculo visual atrai turistas."
Reasoning: Atividade vulcânica estética, sem elevação do nível de risco ou perigo à população.
Veredito: REJEITAR

Input: "Explosão em porto de Beirute gera onda de choque e destrói janelas a 10km."
Reasoning: Evento catastrófico, danos estruturais massivos, impacto nacional.
Veredito: APROVAR

Input: "OMS monitora nova variante de gripe com alta taxa de transmissão na Ásia."
Reasoning: Potencial pandêmico, risco biológico transnacional.
Veredito: APROVAR

# LISTA DE TAGS PERMITIDAS
Use apenas uma destas tags em "tag_sugerida": ${AVAILABLE_TAGS.join(", ")}

# FORMATO DE SAÍDA (JSON)
Responda APENAS um objeto JSON com:
- "aprovado": (true/false)
- "analise_de_impacto": (Uma frase curta justificando a escala)
- "tag_sugerida": (Escolha uma das tags da lista fornecida)
- "nivel_de_risco": (Baixo/Médio/Alto/Crítico)

Notícia para análise:
Título: ${title}
Conteúdo: ${content}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Error verifying impact:", error);
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

function calculateReliability(sourceType: "official" | "media" | "blog", sourceCount: number): {
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
    
    for (const item of feed.items.slice(0, 5)) {
      const title = item.title || "Sem título";
      const originalUrl = item.link || source.url;
      
      const existing = await storage.findNewsItemByUrlOrTitle(originalUrl, title);
      if (existing) continue;
      
      const content = item.contentSnippet || item.content || item.summary || "";
      
      // 1. Filtragem de Impacto (Novo passo solicitado)
      const verification = await verifyImpactAndRelevance(title, content);
      if (!verification || !verification.aprovado) {
        console.log(`Notícia rejeitada por falta de impacto/relevância: ${title}`);
        continue;
      }

      const { reliability, whyReliable } = calculateReliability(source.type, 1);
      
      // Mapear nível de risco para alert level do sistema
      let alertLevel: "critical" | "warning" | "info" = "info";
      if (verification.nivel_de_risco === "Crítico" || verification.nivel_de_risco === "Alto") {
        alertLevel = "critical";
      } else if (verification.nivel_de_risco === "Médio") {
        alertLevel = "warning";
      }

      const newsItem: InsertNewsItem = {
        title,
        summary: content.slice(0, 300) + (content.length > 300 ? "..." : ""),
        fullContent: content.slice(0, 1000),
        tags: [verification.tag_sugerida || "chuva forte"],
        timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
        reliability,
        alertLevel,
        sourceIds: [sourceId],
        verificationNotes: `Fonte: ${source.name}`,
        impactAnalysis: verification.analise_de_impacto,
        riskLevel: verification.nivel_de_risco,
        whyReliable,
        originalUrl,
      };

      const createdItem = await storage.createNewsItem(newsItem);
      
      // 2. Resumo com IA
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
