import OpenAI from "openai";

export const NEWS_AI_MODEL = "gpt-6-luna";

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey || !baseURL) {
    throw new Error(
      "OpenAI (Replit managed) is not enabled. Enable the OpenAI AI Integration to use gpt-6-luna.",
    );
  }

  return new OpenAI({ apiKey, baseURL });
}
