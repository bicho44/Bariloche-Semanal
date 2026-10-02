import { DatosClima, PronosticoDia, ConfiguracionClima } from '../types/index.js';
import { brandingService } from './branding.service.js';

interface CacheEntry {
  datos: DatosClima;
  expira: number;
}

// Lista curada de ciudades patagónicas y argentinas de referencia rápida
export const CIUDADES_PREDEFINIDAS: ConfiguracionClima[] = [
  {
    ciudad: 'San Carlos de Bariloche',
    provincia: 'Río Negro',
    pais: 'Argentina',
    latitud: -41.1335,
    longitud: -71.3103,
    activo: true,
  },
  {
    ciudad: 'Dina Huapi',
    provincia: 'Río Negro',
    pais: 'Argentina',
    latitud: -41.0716,
    longitud: -71.1611,
    activo: true,
  },
  {
    ciudad: 'El Bolsón',
    provincia: 'Río Negro',
    pais: 'Argentina',
    latitud: -41.9667,
    longitud: -71.5333,
    activo: true,
  },
  {
    ciudad: 'Villa La Angostura',
    provincia: 'Neuquén',
    pais: 'Argentina',
    latitud: -40.7631,
    longitud: -71.6441,
    activo: true,
  },
  {
    ciudad: 'San Martín de los Andes',
    provincia: 'Neuquén',
    pais: 'Argentina',
    latitud: -40.1581,
    longitud: -71.3534,
    activo: true,
  },
  {
    ciudad: 'Esquel',
    provincia: 'Chubut',
    pais: 'Argentina',
    latitud: -42.9115,
    longitud: -71.3195,
    activo: true,
  },
  {
    ciudad: 'Neuquén Capital',
    provincia: 'Neuquén',
    pais: 'Argentina',
    latitud: -38.9516,
    longitud: -68.0591,
    activo: true,
  },
  {
    ciudad: 'Viedma',
    provincia: 'Río Negro',
    pais: 'Argentina',
    latitud: -40.8135,
    longitud: -62.9967,
    activo: true,
  },
  {
    ciudad: 'Ciudad Autónoma de Buenos Aires',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    latitud: -34.6037,
    longitud: -58.3816,
    activo: true,
  },
];

function traducirCodigoWMO(code: number): { condicion: string; icono: string } {
  switch (code) {
    case 0:
      return { condicion: 'Despejado / Soleado', icono: 'sun' };
    case 1:
      return { condicion: 'Mayormente despejado', icono: 'cloud-sun' };
    case 2:
      return { condicion: 'Parcialmente nublado', icono: 'cloud-sun' };
    case 3:
      return { condicion: 'Nublado', icono: 'cloud' };
    case 45:
    case 48:
      return { condicion: 'Niebla / Neblina', icono: 'cloud-fog' };
    case 51:
    case 53:
    case 55:
      return { condicion: 'Llovizna leve', icono: 'cloud-drizzle' };
    case 56:
    case 57:
      return { condicion: 'Llovizna helada', icono: 'cloud-snow' };
    case 61:
      return { condicion: 'Lluvia ligera', icono: 'cloud-rain' };
    case 63:
      return { condicion: 'Lluvia moderada', icono: 'cloud-rain' };
    case 65:
      return { condicion: 'Lluvia intensa', icono: 'cloud-rain' };
    case 66:
    case 67:
      return { condicion: 'Lluvia con agua nieve', icono: 'cloud-snow' };
    case 71:
      return { condicion: 'Nevada ligera', icono: 'snowflake' };
    case 73:
      return { condicion: 'Nevada moderada', icono: 'snowflake' };
    case 75:
      return { condicion: 'Nevada intensa cordillerana', icono: 'snowflake' };
    case 77:
      return { condicion: 'Granizo / Aguanieve', icono: 'cloud-snow' };
    case 80:
    case 81:
    case 82:
      return { condicion: 'Chaparrones de lluvia', icono: 'cloud-rain' };
    case 85:
    case 86:
      return { condicion: 'Chaparrones de nieve', icono: 'snowflake' };
    case 95:
      return { condicion: 'Tormenta eléctrica', icono: 'cloud-lightning' };
    case 96:
    case 99:
      return { condicion: 'Tormenta con granizo', icono: 'cloud-lightning' };
    default:
      return { condicion: 'Parcialmente nublado', icono: 'cloud-sun' };
  }
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export class ClimaService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de caché

  /**
   * Obtiene los datos de clima para la ciudad configurada en el branding o por coordenadas específicas.
   */
  async obtenerClima(opciones?: {
    latitud?: number;
    longitud?: number;
    ciudad?: string;
    provincia?: string;
    pais?: string;
    forceFresh?: boolean;
  }): Promise<DatosClima> {
    const branding = await brandingService.obtener();
    const configClima: ConfiguracionClima = branding.clima || {
      ciudad: 'San Carlos de Bariloche',
      provincia: 'Río Negro',
      pais: 'Argentina',
      latitud: -41.1335,
      longitud: -71.3103,
      activo: true,
    };

    const lat = opciones?.latitud !== undefined ? opciones.latitud : configClima.latitud;
    const lon = opciones?.longitud !== undefined ? opciones.longitud : configClima.longitud;
    const ciudad = opciones?.ciudad || configClima.ciudad || 'San Carlos de Bariloche';
    const provincia = opciones?.provincia || configClima.provincia || 'Río Negro';
    const pais = opciones?.pais || configClima.pais || 'Argentina';

    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const ahora = Date.now();

    if (!opciones?.forceFresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.expira > ahora) {
        return {
          ...cached.datos,
          ciudad,
          provincia,
          pais,
        };
      }
    }

    try {
      // Consulta a la API abierta de Open-Meteo
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=4`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BarilocheSemanal/3.0 (observatorio periodistico)',
        },
      });

      if (!res.ok) {
        throw new Error(`Open-Meteo respondió HTTP ${res.status}`);
      }

      const data = await res.json();
      const current = data.current;
      const daily = data.daily;

      const { condicion, icono } = traducirCodigoWMO(current.weather_code ?? 0);

      // Mapear pronóstico diario
      const pronostico_diario: PronosticoDia[] = [];
      if (daily?.time && Array.isArray(daily.time)) {
        for (let i = 0; i < daily.time.length; i++) {
          const fechaStr = daily.time[i];
          const [ano, mes, dia] = fechaStr.split('-').map(Number);
          const fechaObj = new Date(ano, mes - 1, dia);
          const nombreDia = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DIAS_SEMANA[fechaObj.getDay()];

          const codeDia = daily.weather_code?.[i] ?? 0;
          const { condicion: condDia, icono: iconDia } = traducirCodigoWMO(codeDia);

          pronostico_diario.push({
            fecha: fechaStr,
            dia: nombreDia,
            temp_min: Math.round(daily.temperature_2m_min?.[i] ?? 0),
            temp_max: Math.round(daily.temperature_2m_max?.[i] ?? 0),
            condicion: condDia,
            codigo_wmo: codeDia,
            icono: iconDia,
          });
        }
      }

      const tempMinHoy = pronostico_diario[0]?.temp_min ?? Math.round(current.temperature_2m - 4);
      const tempMaxHoy = pronostico_diario[0]?.temp_max ?? Math.round(current.temperature_2m + 4);

      const resultado: DatosClima = {
        ciudad,
        provincia,
        pais,
        latitud: lat,
        longitud: lon,
        temperatura: Math.round(current.temperature_2m),
        sensacion_termica: Math.round(current.apparent_temperature),
        temp_min: tempMinHoy,
        temp_max: tempMaxHoy,
        humedad: Math.round(current.relative_humidity_2m ?? 60),
        viento_kmh: Math.round(current.wind_speed_10m ?? 15),
        direccion_viento_grados: current.wind_direction_10m,
        condicion,
        codigo_wmo: current.weather_code ?? 0,
        icono,
        hora_actualizacion: new Date().toLocaleTimeString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
        }),
        pronostico_diario,
      };

      // Guardar en caché
      this.cache.set(cacheKey, {
        datos: resultado,
        expira: ahora + this.CACHE_TTL_MS,
      });

      return resultado;
    } catch (err) {
      console.warn('[ClimaService] Error al consultar Open-Meteo, utilizando fallback estacional:', (err as Error)?.message);

      // Si falló la red externa, responder con un fallback digno sin romper la UI
      return {
        ciudad,
        provincia,
        pais,
        latitud: lat,
        longitud: lon,
        temperatura: 12,
        sensacion_termica: 11,
        temp_min: 4,
        temp_max: 16,
        humedad: 58,
        viento_kmh: 18,
        condicion: 'Parcialmente nublado',
        codigo_wmo: 2,
        icono: 'cloud-sun',
        hora_actualizacion: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        pronostico_diario: [
          { fecha: 'Hoy', dia: 'Hoy', temp_min: 4, temp_max: 16, condicion: 'Parcialmente nublado', codigo_wmo: 2, icono: 'cloud-sun' },
          { fecha: 'Mañana', dia: 'Mañana', temp_min: 5, temp_max: 17, condicion: 'Despejado / Soleado', codigo_wmo: 0, icono: 'sun' },
          { fecha: 'Pasado', dia: 'Pasado', temp_min: 3, temp_max: 14, condicion: 'Lluvia ligera', codigo_wmo: 61, icono: 'cloud-rain' },
        ],
      };
    }
  }

  /**
   * Busca ciudades por nombre y retorna sus coordenadas geográficas.
   */
  async buscarCiudades(query: string): Promise<ConfiguracionClima[]> {
    const q = query.trim();
    if (!q || q.length < 2) {
      return CIUDADES_PREDEFINIDAS;
    }

    // Filtrar primero en la lista predefinida
    const coincidenciasPredefinidas = CIUDADES_PREDEFINIDAS.filter((c) =>
      c.ciudad.toLowerCase().includes(q.toLowerCase()) ||
      (c.provincia && c.provincia.toLowerCase().includes(q.toLowerCase()))
    );

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=es`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          const externas: ConfiguracionClima[] = data.results.map((item: any) => ({
            ciudad: item.name,
            provincia: item.admin1 || item.admin2 || '',
            pais: item.country || 'Argentina',
            latitud: Number(item.latitude),
            longitud: Number(item.longitude),
            activo: true,
          }));

          // Unir y remover duplicados por nombre
          const combinadas = [...coincidenciasPredefinidas];
          for (const ext of externas) {
            if (!combinadas.some((c) => c.ciudad.toLowerCase() === ext.ciudad.toLowerCase())) {
              combinadas.push(ext);
            }
          }
          return combinadas;
        }
      }
    } catch {
      // Fallback a las predefinidas
    }

    return coincidenciasPredefinidas.length > 0 ? coincidenciasPredefinidas : CIUDADES_PREDEFINIDAS;
  }
}

export const climaService = new ClimaService();
