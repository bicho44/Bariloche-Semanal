import { getGeminiClient, MODELO_GEMINI } from '../config/gemini.js';

/**
 * Servicio utilitario pasivo de Gemini.
 * Diseñado exclusivamente para operaciones manuales y puntuales de apoyo a la redacción (on-demand).
 * NO se ejecuta en el arranque, NO contiene crons ni bucles automáticos.
 */
export class GeminiService {
  /**
   * Sugiere opciones de titulares periodísticos a partir del cuerpo o resumen de una noticia.
   */
  async sugerirTitulares(contenido: string, cantidad: number = 3): Promise<string[]> {
    if (!contenido || !contenido.trim()) return [];

    try {
      const ai = getGeminiClient();
      const prompt = `Eres un editor periodístico experto de San Carlos de Bariloche.
A partir del siguiente texto periodístico, genera exactamente ${cantidad} opciones de titulares concisos, atractivos y rigurosos (estilo crónica moderna).
Devuelve únicamente los titulares, uno por línea, sin numeración ni viñetas.

Texto:
"""
${contenido.slice(0, 3000)}
"""`;

      const response = await ai.models.generateContent({
        model: MODELO_GEMINI,
        contents: prompt,
      });

      const text = response.text || '';
      return text
        .split('\n')
        .map((line) => line.trim().replace(/^[-*•\d.]+\s*/, ''))
        .filter((line) => line.length > 0)
        .slice(0, cantidad);
    } catch (err) {
      console.warn('[GeminiService] Error al generar sugerencias de titulares:', err);
      return [];
    }
  }

  /**
   * Mejora o sintetiza un texto según una instrucción editorial específica.
   */
  async mejorarTexto(texto: string, instruccion: string): Promise<string> {
    if (!texto || !texto.trim()) return texto;

    try {
      const ai = getGeminiClient();
      const prompt = `Eres un asistente de redacción para el medio local "Bariloche Semanal".
Instrucción editorial: ${instruccion}

Texto a procesar:
"""
${texto}
"""

Responde únicamente con el texto procesado final, sin explicaciones ni introducciones.`;

      const response = await ai.models.generateContent({
        model: MODELO_GEMINI,
        contents: prompt,
      });

      return response.text?.trim() || texto;
    } catch (err) {
      console.warn('[GeminiService] Error al procesar texto con Gemini:', err);
      return texto;
    }
  }

  /**
   * Genera un resumen ejecutivo breve (ej. para campo resumen_contexto o bajada).
   */
  async generarResumen(texto: string, maxPalabras: number = 60): Promise<string> {
    if (!texto || !texto.trim()) return '';

    try {
      const ai = getGeminiClient();
      const prompt = `Resume en máximo ${maxPalabras} palabras el núcleo informativo del siguiente texto, con tono periodístico neutro y directo:
"""
${texto.slice(0, 3000)}
"""`;

      const response = await ai.models.generateContent({
        model: MODELO_GEMINI,
        contents: prompt,
      });

      return response.text?.trim() || '';
    } catch (err) {
      console.warn('[GeminiService] Error al generar resumen con Gemini:', err);
      return '';
    }
  }
}

export const geminiService = new GeminiService();
