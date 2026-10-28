import { getOpenAIClient, NEWS_AI_MODEL } from "./openai-client";
import {
  buildClassificationPrompt,
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
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: NEWS_AI_MODEL,
      messages: [{
        role: "user",
        content: buildClassificationPrompt(title, content, isPortuguese),
      }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1400,
    });
    const text = response.choices[0]?.message?.content || "";
    const result = parseClassifiedSummary(text, title, content);
    console.log(`[Classificação IA] modelo=${NEWS_AI_MODEL}, tokens: entrada=${response.usage?.prompt_tokens ?? "?"}, saída=${response.usage?.completion_tokens ?? "?"}`);
    return result;
  } catch (error) {
    console.error("Falha no resumo/classificação contextual:", error instanceof Error ? error.message : "erro desconhecido");
    return null;
  }
}
