import { Dossier, Noticia } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';
import { noticiasService } from './noticias.service.js';
import { getGeminiClient, MODELO_GEMINI } from '../config/gemini.js';

export interface DossierConNoticias extends Dossier {
  noticias_vinculadas: Noticia[];
}

export interface DeepDiveOptions {
  slug?: string;
  dossier_id?: string;
  dossier?: Partial<Dossier>;
  criterio_inclusion?: string;
  prohibido_incluir?: string;
  datos_duros_verificados?: Record<string, string | number>;
  instrucciones_adicionales?: string;
  guardar?: boolean;
}

export class DossiersService {
  private repo = new FirestoreRepository<Dossier>('dossiers');

  async listar(soloActivos = false): Promise<Dossier[]> {
    const dossiers = await this.repo.getAll();
    if (soloActivos) {
      return dossiers.filter(d => d.estado === 'activo');
    }
    return dossiers.sort((a, b) => (b.ultima_actualizacion || '').localeCompare(a.ultima_actualizacion || ''));
  }

  async obtenerPorSlug(slug: string): Promise<DossierConNoticias | null> {
    const dossier = await this.repo.getById(slug);
    if (!dossier) return null;

    const noticias = await noticiasService.obtenerUltimasPorDossier(slug, 50);
    return {
      ...dossier,
      noticias_vinculadas: noticias,
    };
  }

  async crear(datos: Omit<Dossier, 'ultima_actualizacion'> & { ultima_actualizacion?: string }): Promise<Dossier> {
    const slug = (datos.id || datos.titulo || 'dossier')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40);

    const nuevoDossier: Dossier = {
      ...datos,
      id: slug,
      estado: datos.estado || 'activo',
      criterio_inclusion: datos.criterio_inclusion?.trim() || undefined,
      prohibido_incluir: datos.prohibido_incluir?.trim() || undefined,
      datos_duros_verificados: datos.datos_duros_verificados || {},
      actores_clave: datos.actores_clave || [],
      timeline: datos.timeline || [],
      cronica_html: datos.cronica_html || '',
      fecha_ultima_cronica: datos.fecha_ultima_cronica || (datos.cronica_html ? new Date().toISOString().split('T')[0] : undefined),
      media: datos.media || (datos.prompt_nanobanana ? { imagen_url: '', credito: '', prompt_nanobanana: datos.prompt_nanobanana } : undefined),
      prompt_nanobanana: datos.prompt_nanobanana || datos.media?.prompt_nanobanana || undefined,
      curada_manualmente: datos.curada_manualmente !== undefined ? Boolean(datos.curada_manualmente) : true,
      ultima_actualizacion: datos.ultima_actualizacion || new Date().toISOString(),
    };
    return this.repo.set(slug, nuevoDossier);
  }

  async actualizar(slug: string, partial: Partial<Dossier>): Promise<Dossier | null> {
    const dataToUpdate: Partial<Dossier> = {
      ...partial,
      ultima_actualizacion: new Date().toISOString(),
    };

    if (partial.criterio_inclusion !== undefined) {
      dataToUpdate.criterio_inclusion = partial.criterio_inclusion ? partial.criterio_inclusion.trim() : undefined;
    }
    if (partial.prohibido_incluir !== undefined) {
      dataToUpdate.prohibido_incluir = partial.prohibido_incluir ? partial.prohibido_incluir.trim() : undefined;
    }
    if (partial.datos_duros_verificados !== undefined) {
      dataToUpdate.datos_duros_verificados = partial.datos_duros_verificados;
    }
    if (partial.curada_manualmente !== undefined) {
      dataToUpdate.curada_manualmente = Boolean(partial.curada_manualmente);
    } else {
      dataToUpdate.curada_manualmente = true;
    }

    if (partial.prompt_nanobanana !== undefined && !dataToUpdate.media?.prompt_nanobanana) {
      dataToUpdate.media = {
        ...(dataToUpdate.media || { imagen_url: '', credito: '' }),
        prompt_nanobanana: partial.prompt_nanobanana,
      };
    }
    return this.repo.update(slug, dataToUpdate);
  }

  async eliminar(slug: string): Promise<boolean> {
    return this.repo.delete(slug);
  }

  async agregarHitoTimeline(
    slug: string,
    hito: { fecha: string; hito: string; noticia_id?: string; fuente_url?: string }
  ): Promise<Dossier | null> {
    const dossier = await this.repo.getById(slug);
    if (!dossier) return null;

    const timeline = [...(dossier.timeline || []), hito].sort((a, b) =>
      String(a.fecha || '').localeCompare(String(b.fecha || ''))
    );
    return this.actualizar(slug, { timeline, curada_manualmente: true });
  }

  /**
   * Generación y Redacción de Crónica Documental Profunda (Deep-Dive) con SDK @google/genai
   * Aplica blindaje anti-alucinación estricto y estructura en 4 secciones documentales obligatorias.
   */
  async redactarCronicaDeepDive(options: DeepDiveOptions): Promise<{
    cronica_html: string;
    fecha_ultima_cronica: string;
    dossier?: Dossier;
  }> {
    const targetSlug = options.slug || options.dossier_id || options.dossier?.id;
    let dossierExistente: Dossier | null = null;
    let noticiasVinculadas: Noticia[] = [];

    if (targetSlug) {
      const dataConNoticias = await this.obtenerPorSlug(targetSlug);
      if (dataConNoticias) {
        dossierExistente = dataConNoticias;
        noticiasVinculadas = dataConNoticias.noticias_vinculadas || [];
      }
    }

    // Fusión de datos del expediente (priorizando campos directos sobre los persistidos)
    const titulo = options.dossier?.titulo || dossierExistente?.titulo || 'Expediente Temático';
    const areaId = options.dossier?.area_id || dossierExistente?.area_id || 'gestion-publica';
    const resumenContexto = options.dossier?.resumen_contexto || dossierExistente?.resumen_contexto || '';
    const criterioInclusion = options.criterio_inclusion || options.dossier?.criterio_inclusion || dossierExistente?.criterio_inclusion || '';
    const prohibidoIncluir = options.prohibido_incluir || options.dossier?.prohibido_incluir || dossierExistente?.prohibido_incluir || '';
    const datosDuros = options.datos_duros_verificados || options.dossier?.datos_duros_verificados || dossierExistente?.datos_duros_verificados || {};
    const actores = options.dossier?.actores_clave || dossierExistente?.actores_clave || [];
    const timeline = options.dossier?.timeline || dossierExistente?.timeline || [];

    // Preparación del dossier documental estructurado para el prompt
    const timelineStr = timeline
      .map(
        (h) =>
          `- [${h.fecha}] ${h.hito}${h.fuente_url ? ` (Fuente verificada: ${h.fuente_url})` : ''}`
      )
      .join('\n');

    const noticiasStr = noticiasVinculadas
      .slice(0, 15)
      .map(
        (n) =>
          `* [${n.fecha_publicacion || n.fecha}] ${n.titular} (Fuente: ${n.fuente?.nombre || 'Local'} - ${n.fuente?.url_nota || n.url || 'Sin enlace'}): ${n.hecho_central}`
      )
      .join('\n');

    const datosDurosStr = Object.entries(datosDuros)
      .map(([k, v]) => `* ${k}: ${v}`)
      .join('\n');

    const prompt = `Actuás como el Editor de Fondo de Bariloche Semanal, un SEMANARIO de inteligencia local y pulso ciudadano (no un portal diario de cables). Redactá el Informe Documental Acumulativo en 4 actos (1. Antecedentes y Marco Estructural, 2. Bitácora Documental de Hitos Verificados con fecha [DD/MM/YYYY] y enlaces <a href='...'>, 3. Mapa de Posiciones Comprobadas sin inventar posturas no declaradas, 4. Próximas Instancias Confirmadas consignando 'Sin fecha oficial confirmada al cierre' cuando no exista fecha cierta), incluyendo el tablero <aside class='c-dossier-data'> con trazabilidad 1:1.

Expediente temático:
TITULO: "${titulo}"
AREA: "${areaId}"

================================================================================
CATÁLOGO CERRADO DE LOS 5 DOSSIERS MAESTROS (DOCTRINA SEMANARIO v5.5):
================================================================================
Este expediente forma parte del Catálogo Cerrado de los 5 Dossiers Maestros de Bariloche Semanal:
1. Transporte Urbano y SUBE (Crisis tarifaria, frecuencias de Mi Bus y contratos del TUP).
2. Crisis Habitacional y Alquileres Temporarios (Tensión entre oferta turística y falta de alquiler permanente).
3. Cooperativa de Electricidad Bariloche - CEB (Servicio eléctrico, tasas municipales en factura e infraestructura).
4. Obras Viales del Oeste y Movilidad (Av. Bustillo, Pioneros, rotondas y accesos).
5. Reforma Institucional y Concesiones Estratégicas (Carta Orgánica Municipal y concesión Cerro Catedral).

================================================================================
MANDATO EDITORIAL Y ANTI-ALUCINACIÓN (CUMPLIMIENTO ABSOLUTO):
================================================================================
1. REGLA ESTRICTA DE IMÁGENES: NUNCA inventes fotos, créditos falsos, fotógrafos ficticios ni URLs inventadas de medios o agencias. El asistente nunca inventa fotos.
2. CRITERIO DE INCLUSIÓN ESTRICTO:
${criterioInclusion ? `"${criterioInclusion}"` : 'Abarcar únicamente los hechos, expedientes y medidas oficiales directamente vinculados a este tema.'}

3. PROHIBIDO INCLUIR (EXCLUSIONES EXPLÍCITAS ANTI-DERIVACIÓN TEMÁTICA):
${prohibidoIncluir ? `"${prohibidoIncluir}"` : 'No derivar en especulaciones, temas ajenos o anécdotas no documentadas.'}
¡CRÍTICO!: Queda terminantemente prohibido incorporar o derivar hacia ninguno de los puntos prohibidos.

4. DATOS DUROS VERIFICADOS (FICHA TÉCNICA INMUTABLE):
${datosDurosStr || 'No se han cargado datos numéricos adicionales. Utiliza únicamente datos presentes en las fuentes documentadas.'}
¡CRÍTICO!: Si mencionas cifras, expedientes, ordenanzas o montos, DEBEN coincidir exactamente con estos datos o con las fuentes verificadas. No redondees ni inventes cifras.

5. ACTORES CLAVE COMPROBADOS:
${actores.length > 0 ? actores.join(', ') : 'Los mencionados en las fuentes periodísticas del expediente.'}
¡CRÍTICO!: PROHIBIDO inventar o inferir posturas de actores que no hayan sido expresadas de forma fehaciente en las fuentes provistas.

6. BITÁCORA Y FUENTES PERIODÍSTICAS DOCUMENTADAS:
LÍNEA DE TIEMPO DEL DOSSIER:
${timelineStr || 'Sin hitos cronológicos previos.'}

NOTICIAS ARCHIVADAS VINCULADAS:
${noticiasStr || 'Sin notas vinculadas adicionales en el archivo.'}

${options.instrucciones_adicionales ? `INSTRUCCIÓN EDITORIAL ADICIONAL:\n${options.instrucciones_adicionales}\n` : ''}

================================================================================
ESTRUCTURA OBLIGATORIA DEL ARTÍCULO (INFORME DOCUMENTAL ACUMULATIVO EN 4 ACTOS + TABLERO):
================================================================================
Genera un artículo en HTML semántico limpio y riguroso estructurado con los siguientes 4 bloques exactos más el tablero de trazabilidad:

<h3>1. Antecedentes y Marco Estructural</h3>
<p>Contexto de origen, marco normativo, ordenanzas y antecedentes históricos contrastados que dieron inicio al expediente en Bariloche, con prosa sobria y sin divagaciones.</p>

<h3>2. Bitácora Documental de Hitos Verificados</h3>
<ul class="space-y-2">
  Cada hito cronológico relevante con su fecha exacta en formato <strong>[DD/MM/YYYY]</strong>, descripción sobria y enlace a la fuente correspondiente cuando esté disponible utilizando la etiqueta &lt;a href="..." target="_blank" rel="noopener noreferrer"&gt;Nombre del medio o nota&lt;/a&gt;.
</ul>

<h3>3. Mapa de Posiciones Comprobadas</h3>
<p>Posturas declaradas fehacientemente por los distintos sectores (municipio, provincia, empresas, vecinos, gremios, justicia). Prohibido atribuir intenciones o posturas que no figuren en los documentos.</p>

<h3>4. Próximas Instancias Confirmadas</h3>
<p>Hitos institucionales, audiencias, licitaciones o plazos judiciales previstos con fecha confirmada. Si no existe una fecha oficial comprobada para un paso posterior, debes consignar textualmente: <em>"Sin fecha oficial confirmada al cierre"</em>.</p>

<aside class="c-dossier-data">
  <h4>Cifras y Ficha Técnica Verificada (Trazabilidad 1:1)</h4>
  <ul>
    ${datosDurosStr ? '<!-- Replicar aquí con precisión 1:1 cada dato duro verificado disponible -->' : '<li><strong>Estado del expediente:</strong> En seguimiento documental</li>'}
  </ul>
</aside>

================================================================================
REGLAS DE FORMATO:
================================================================================
- Devuelve ÚNICAMENTE código HTML dentro del cuerpo (etiquetas <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>, <blockquote>, <aside>, <h4>).
- NO envuelvas la respuesta en \`\`\`html o bloques de código markdown.
- NO inventes imágenes, fotos ni etiquetas <img>.
- NO agregues saludos, explicaciones meta ni conclusiones fuera de la estructura.`;

    const ai = getGeminiClient();
    let cronicaHtml = '';

    for (let intento = 1; intento <= 3; intento++) {
      try {
        const response = await ai.models.generateContent({
          model: intento === 1 ? MODELO_GEMINI : 'gemini-3.8-flash',
          contents: prompt,
        });
        cronicaHtml = (response.text || '').trim();
        if (cronicaHtml) break;
      } catch (err: any) {
        if (
          intento < 3 &&
          (err?.message?.includes('503') ||
            err?.message?.includes('high demand') ||
            err?.status === 503 ||
            err?.code === 503)
        ) {
          await new Promise((r) => setTimeout(r, 1200 * intento));
          continue;
        }
        throw err;
      }
    }
    // Limpieza de posibles delimitadores markdown accidentales
    if (cronicaHtml.startsWith('```html')) {
      cronicaHtml = cronicaHtml.replace(/^```html\s*/i, '').replace(/\s*```$/i, '');
    } else if (cronicaHtml.startsWith('```')) {
      cronicaHtml = cronicaHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const hoy = new Date().toISOString().split('T')[0];

    let dossierGuardado: Dossier | undefined = undefined;
    if (options.guardar && targetSlug) {
      const updated = await this.actualizar(targetSlug, {
        cronica_html: cronicaHtml,
        fecha_ultima_cronica: hoy,
        curada_manualmente: true,
      });
      if (updated) dossierGuardado = updated;
    }

    return {
      cronica_html: cronicaHtml,
      fecha_ultima_cronica: hoy,
      dossier: dossierGuardado,
    };
  }
}

export const dossiersService = new DossiersService();
