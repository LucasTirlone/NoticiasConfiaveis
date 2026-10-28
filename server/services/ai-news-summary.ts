import { GoogleGenAI } from "@google/genai";
import {
  buildClassificationPrompt,
  CLASSIFICATION_RESPONSE_SCHEMA,
  parseClassifiedSummary,
  type ClassifiedSummary,
} from "./news-classification";

export async function withClassificationRetry(
  generate: () => Promise<ClassifiedSummary | null>,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 1000)),
): Promise<ClassifiedSummary | null> {
  // An intentionally empty classification is a valid result, not a reason
  // to pay for another call. Only request/format failures get one retry.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generate();
      if (result) return result;
    } catch {
      // Both request failures and invalid structured responses fail closed.
    }
    if (attempt === 0) await wait();
  }
  return null;
}

export async function generateAiSummary(
  title: string,
  content: string,
  isPortuguese: boolean,
): Promise<ClassifiedSummary | null> {
  if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseJsonSchema: CLASSIFICATION_RESPONSE_SCHEMA,
        maxOutputTokens: 1400,
      },
      contents: buildClassificationPrompt(title, content, isPortuguese),
    });
    const result = parseClassifiedSummary(response.text || "", title, content);
    console.log(`[Classificação IA] tokens: entrada=${response.usageMetadata?.promptTokenCount ?? "?"}, saída=${response.usageMetadata?.candidatesTokenCount ?? "?"}`);
    return result;
  } catch (error) {
    console.error("Falha no resumo/classificação contextual:", error instanceof Error ? error.message : "erro desconhecido");
    return null;
  }
}
