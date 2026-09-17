import { getGeminiClient, GEMINI_MODEL } from '../config/gemini.js';
import { dossiersService } from './dossiers.service.js';
import { noticiasService } from './noticias.service.js';

export interface DeepDiveResponse {
  dossier_id: string;
  dossier_titulo: string;
  noticias_analizadas: number;
  columna_markdown: string;
  generado_at: string;
  modelo_utilizado: string;
}

export class EditorialService {
  async generarDeepDive(dossierId: string): Promise<DeepDiveResponse> {
    const dossier = await dossiersService.obtenerPorSlug(dossierId);
    if (!dossier) {
      throw new Error(`Dossier con id '${dossierId}' no encontrado`);
    }

    const noticias = await noticiasService.obtenerUltimasPorDossier(dossierId, 10);

    const promptContexto = `
ERES EL EDITOR JEFE Y ANALISTA POLÍTICO-SOCIAL DE "BARILOCHE SEMANAL", el observatorio periodístico de San Carlos de Bariloche, Río Negro, Argentina.

Tu tarea es redactar una COLUMNA DE ANÁLISIS PERIODÍSTICO EN PROFUNDIDAD ("Deep Dive") de entre 800 y 1.200 palabras en formato Markdown profesional.

DATOS DEL DOSSIER:
- Título: ${dossier.titulo}
- Área Temática: ${dossier.area_id}
- Estado de la investigación: ${dossier.estado}
- Resumen de Contexto: ${dossier.resumen_contexto}
- Actores Clave: ${dossier.actores_clave.join(', ') || 'Actores locales de Bariloche'}
- Hitos cronológicos recientes:
${(dossier.timeline || []).map(h => `  * ${h.fecha}: ${h.hito}`).join('\n')}

NOTICIAS RECIENTES COBERTAS (${noticias.length} notas analizadas):
${noticias.map((n, idx) => `
[Nota ${idx + 1}]
- Fecha: ${n.fecha_publicacion}
- Titular: ${n.titular}
- Hecho central: ${n.hecho_central}
- Fuente: ${n.fuente?.nombre} (${n.fuente?.url_nota})
- Citas registradas: ${(n.citas || []).map(c => `"${c.texto}" (${c.autor})`).join('; ') || 'Sin citas'}
- Datos duros: ${JSON.stringify(n.datos_duros || {})}
- Delta / Novedad: ${n.novedad_respecto_a_dias_previos || 'Sin delta'}
`).join('\n---\n')}

DIRECTIVAS EDITORIALES OBLIGATORIAS:
1. Longitud: Entre 800 y 1.200 palabras.
2. Tono: Riguroso, investigativo, crítico, sin sensacionalismo ni complacencia partidaria.
3. Estructura Markdown:
   # Titular sugerente y analítico
   *Subtítulo o copete explicativo con el pulso barilochense.*
   
   ## 1. El Hecho Conductor y el Contexto Barilochense
   ## 2. Los Números y el Contraste de Datos Duros
   ## 3. Las Voces en Disputa (incorporar citas directas de los actores)
   ## 4. Impacto en la Comunidad y el Turismo de San Carlos de Bariloche
   ## 5. Lo que Viene: El Radar Semanal
4. Integra explícitamente los datos duros, cifras económicas o normativas provinciales/municipales mencionadas.
5. Cita a las fuentes originales citadas en las notas.
`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptContexto,
      });

      const columnaMarkdown = response.text || 'No se pudo generar el texto de la columna editorial.';

      return {
        dossier_id: dossierId,
        dossier_titulo: dossier.titulo,
        noticias_analizadas: noticias.length,
        columna_markdown: columnaMarkdown,
        generado_at: new Date().toISOString(),
        modelo_utilizado: GEMINI_MODEL,
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[EditorialService] Error al generar con Gemini:', error);
      throw new Error(`Error en API Gemini: ${error.message || 'Error desconocido'}`);
    }
  }
}

export const editorialService = new EditorialService();
