import { GoogleGenAI } from "@google/genai";

// Configuración dinámica del modelo desde variable de entorno con fallback al alias genérico estable
export const MODELO_GEMINI = process.env.GEMINI_MODEL || 'gemini-flash';
export const GEMINI_MODEL = MODELO_GEMINI;

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Gemini API] GEMINI_API_KEY no está configurada en las variables de entorno.");
    }
    const client = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Mapeo transparente de alias genéricos estables de Gemini a identificadores API
    const originalGenerateContent = client.models.generateContent.bind(client.models);
    client.models.generateContent = (params: any) => {
      let targetModel = params.model;
      if (targetModel === 'gemini-flash') {
        targetModel = 'gemini-flash-latest';
      } else if (targetModel === 'gemini-flash-lite') {
        targetModel = 'gemini-flash-lite-latest';
      } else if (targetModel === 'gemini-pro' || (typeof targetModel === 'string' && targetModel.toLowerCase().includes('pro'))) {
        console.warn(`[Gemini API] Modelo Pro evitado ('${targetModel}'). Redirigiendo a 'gemini-flash-latest' para evitar error 429 por cuota limit: 0 en Free Tier.`);
        targetModel = 'gemini-flash-latest';
      }
      return originalGenerateContent({ ...params, model: targetModel });
    };

    geminiClient = client;
  }
  return geminiClient;
}
