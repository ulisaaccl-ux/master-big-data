// ==============================================================================
// Motor ETL y Reglas de Calidad de Datos - Pipeline Open-Meteo -> Supabase
// ==============================================================================

import {
  CityConfig,
  RawOpenMeteoResponse,
  TransformedMeasurementRecord,
  ValidMeasurementRecord,
  RejectedMeasurementRecord,
  FilterCriteria,
  SortCriteria,
} from './types';
import { OPEN_METEO_ARCHIVE_URL, MAX_EXTRACTION_DAYS } from './constants';

export interface ValidationConfigResult {
  isValid: boolean;
  errorMessage?: string;
  daysCount: number;
  estimatedVolume: number;
}

/**
 * Valida la configuración de extracción antes de realizar peticiones de red
 */
export function validateExtractionConfig(
  selectedCities: CityConfig[],
  startDate: string,
  endDate: string
): ValidationConfigResult {
  if (!selectedCities || selectedCities.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Debes seleccionar al menos una ciudad para la extracción.',
      daysCount: 0,
      estimatedVolume: 0,
    };
  }

  if (!startDate || !endDate) {
    return {
      isValid: false,
      errorMessage: 'Debes indicar una fecha inicial y una fecha final.',
      daysCount: 0,
      estimatedVolume: 0,
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      errorMessage: 'El formato de las fechas debe ser válido (AAAA-MM-DD).',
      daysCount: 0,
      estimatedVolume: 0,
    };
  }

  if (start > end) {
    return {
      isValid: false,
      errorMessage: 'La fecha inicial no puede ser posterior a la fecha final.',
      daysCount: 0,
      estimatedVolume: 0,
    };
  }

  // Diferencia en días naturales inclusivos
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const daysCount = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (daysCount > MAX_EXTRACTION_DAYS) {
    return {
      isValid: false,
      errorMessage: `El periodo solicitado (${daysCount} días) supera el límite máximo permitido de ${MAX_EXTRACTION_DAYS} días por extracción.`,
      daysCount,
      estimatedVolume: 0,
    };
  }

  // Volumen previsto: Ciudades x Días x 24 horas
  const estimatedVolume = selectedCities.length * daysCount * 24;

  return {
    isValid: true,
    daysCount,
    estimatedVolume,
  };
}

/**
 * Extrae los datos horarios de Open-Meteo Archive API para una ciudad específica
 */
export async function fetchCityOpenMeteo(
  city: CityConfig,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: RawOpenMeteoResponse; error?: string }> {
  try {
    const params = new URLSearchParams({
      latitude: city.latitude.toString(),
      longitude: city.longitude.toString(),
      start_date: startDate,
      end_date: endDate,
      hourly: 'temperature_2m,relative_humidity_2m,precipitation',
      timezone: 'UTC',
      temperature_unit: 'celsius',
      precipitation_unit: 'mm',
    });

    const url = `${OPEN_METEO_ARCHIVE_URL}?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Error HTTP ${response.status} en Open-Meteo: ${errorText || response.statusText}`,
      };
    }

    const data: RawOpenMeteoResponse = await response.json();

    if (!data.hourly || !Array.isArray(data.hourly.time)) {
      return {
        success: false,
        error: 'La respuesta de la API no contiene el objeto horario estructurado esperado.',
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: `Fallo de conexión al extraer ${city.name}: ${err?.message || 'Error de red desconocido'}`,
    };
  }
}

/**
 * Fase de Transformación:
 * Convierte los arrays paralelos (time, temperature_2m, relative_humidity_2m, precipitation)
 * en registros tabulares independientes (un registro por ciudad y hora).
 */
export function transformParallelArraysToRecords(
  cityName: string,
  raw: RawOpenMeteoResponse
): {
  records: TransformedMeasurementRecord[];
  hasLengthMismatch: boolean;
  mismatchReason?: string;
} {
  const hourly = raw.hourly;
  const times = hourly.time || [];
  const temps = hourly.temperature_2m || [];
  const humidities = hourly.relative_humidity_2m || [];
  const precips = hourly.precipitation || [];

  const lengths = [times.length, temps.length, humidities.length, precips.length];
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  const hasLengthMismatch = minLength !== maxLength;

  let mismatchReason: string | undefined;
  if (hasLengthMismatch) {
    mismatchReason = `Discrepancia en longitudes de arrays paralelos: time=${times.length}, temp=${temps.length}, hum=${humidities.length}, precip=${precips.length}.`;
  }

  const records: TransformedMeasurementRecord[] = [];

  // Recorremos hasta maxLength para capturar también registros truncados/desalineados
  for (let i = 0; i < maxLength; i++) {
    records.push({
      tempId: `${cityName}__raw__${i}`,
      ciudad: cityName,
      fecha_hora_raw: times[i],
      temperatura_raw: temps[i],
      humedad_raw: humidities[i],
      precipitacion_raw: precips[i],
    });
  }

  return { records, hasLengthMismatch, mismatchReason };
}

/**
 * Convierte de manera determinista una cadena de fecha de Open-Meteo ("2026-09-01T00:00")
 * a formato ISO 8601 UTC estricto ("2026-09-01T00:00:00.000Z")
 */
export function parseExplicitUtcIso(rawTimestamp: string): string | null {
  if (!rawTimestamp || typeof rawTimestamp !== 'string') return null;

  // Open-Meteo envía "YYYY-MM-DDTHH:mm" cuando pedimos timezone=UTC
  const cleaned = rawTimestamp.trim();
  const normalized = cleaned.endsWith('Z') ? cleaned : `${cleaned}:00.000Z`;
  const timestamp = Date.parse(normalized);

  if (isNaN(timestamp)) {
    // Intento alternativo estándar
    const fallback = Date.parse(cleaned);
    if (isNaN(fallback)) return null;
    return new Date(fallback).toISOString();
  }

  return new Date(timestamp).toISOString();
}

/**
 * Fase de Limpieza y Reglas de Calidad de Datos:
 * 1. Comprueba tipos numéricos finitos.
 * 2. NO convierte null, cadenas vacías ni valores ausentes en cero.
 * 3. Rechaza registros sin ciudad, fecha válida o alguna de las tres mediciones.
 * 4. Valida humedad entre 0 y 100 y precipitación >= 0.
 * 5. Deduplica por (ciudad, fecha_hora), conservando el primer registro y documentando el descarte.
 * 6. NO descarta temperaturas extremas por umbrales arbitrarios.
 * 7. Registra el motivo exacto de rechazo de cada fila.
 */
export function cleanAndValidateMeasurements(
  transformedRecords: TransformedMeasurementRecord[]
): {
  validRecords: ValidMeasurementRecord[];
  rejectedRecords: RejectedMeasurementRecord[];
  duplicateCount: number;
} {
  const validRecords: ValidMeasurementRecord[] = [];
  const rejectedRecords: RejectedMeasurementRecord[] = [];
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  for (let idx = 0; idx < transformedRecords.length; idx++) {
    const raw = transformedRecords[idx];
    const recordId = `rec_${idx}_${raw.ciudad}_${raw.fecha_hora_raw || 'nodate'}`;

    // 1. Validación de Ciudad
    if (!raw.ciudad || typeof raw.ciudad !== 'string' || raw.ciudad.trim() === '') {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad || 'DESCONOCIDA',
        fecha_hora_raw: String(raw.fecha_hora_raw),
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: 'Falta el nombre o identificador de la ciudad.',
        codigo_error: 'MISSING_FIELD',
      });
      continue;
    }

    // 2. Validación y Parsing de Fecha en UTC
    const parsedIsoDate = parseExplicitUtcIso(raw.fecha_hora_raw);
    if (!parsedIsoDate) {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: String(raw.fecha_hora_raw),
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: `Fecha y hora ausente o inválida: "${raw.fecha_hora_raw}". No pudo interpretarse como UTC.`,
        codigo_error: 'INVALID_DATE',
      });
      continue;
    }

    // 3. Regla Didáctica Big Data: Comprobar presencia de valores (NO convertir null en cero)
    // El cero en meteorología representa 0°C (congelación) o 0% de humedad (aire seco extremo),
    // mientras que null representa ausencia de medición por fallo de sensor o pérdida de señal.
    if (
      raw.temperatura_raw === null ||
      raw.temperatura_raw === undefined ||
      raw.temperatura_raw === ''
    ) {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: raw.fecha_hora_raw,
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: 'Medición de temperatura ausente (null/undefined). No se imputa a cero para preservar la veracidad analítica.',
        codigo_error: 'MISSING_FIELD',
      });
      continue;
    }

    if (
      raw.humedad_raw === null ||
      raw.humedad_raw === undefined ||
      raw.humedad_raw === ''
    ) {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: raw.fecha_hora_raw,
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: 'Medición de humedad relativa ausente (null/undefined). No se imputa a cero.',
        codigo_error: 'MISSING_FIELD',
      });
      continue;
    }

    if (
      raw.precipitacion_raw === null ||
      raw.precipitacion_raw === undefined ||
      raw.precipitacion_raw === ''
    ) {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: raw.fecha_hora_raw,
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: 'Medición de precipitación ausente (null/undefined). No se asume lluvia cero sin dato explícito.',
        codigo_error: 'MISSING_FIELD',
      });
      continue;
    }

    // 4. Verificación de Tipos Numéricos Finitos (Number.isFinite)
    const tempNum = Number(raw.temperatura_raw);
    const humNum = Number(raw.humedad_raw);
    const precipNum = Number(raw.precipitacion_raw);

    if (!Number.isFinite(tempNum) || !Number.isFinite(humNum) || !Number.isFinite(precipNum)) {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: raw.fecha_hora_raw,
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: 'Uno o más valores no corresponden a números finitos válidos (NaN o Infinity detectado).',
        codigo_error: 'NON_FINITE_NUMBER',
      });
      continue;
    }

    // 5. Restricciones Físicas de Dominio
    // Humedad relativa debe estar entre 0% y 100%
    if (humNum < 0 || humNum > 100) {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: raw.fecha_hora_raw,
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: `Humedad relativa (${humNum}%) fuera del rango físico admisible [0, 100].`,
        codigo_error: 'HUMIDITY_OUT_OF_RANGE',
      });
      continue;
    }

    // Precipitación acumulada no puede ser negativa
    if (precipNum < 0) {
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: raw.fecha_hora_raw,
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: `Precipitación (${precipNum} mm) negativa inadmisible.`,
        codigo_error: 'NEGATIVE_PRECIPITATION',
      });
      continue;
    }

    // 6. Deduplicación Determinista por Clave Compuesta (ciudad, fecha_hora)
    // Documentación didáctica: Se conserva la primera ocurrencia encontrada y se rechazan
    // las subsiguientes para respetar la restricción única de destino.
    const uniqueKey = `${raw.ciudad.toLowerCase().trim()}__${parsedIsoDate}`;

    if (seenKeys.has(uniqueKey)) {
      duplicateCount++;
      rejectedRecords.push({
        id: recordId,
        ciudad: raw.ciudad,
        fecha_hora_raw: raw.fecha_hora_raw,
        temperatura_raw: raw.temperatura_raw,
        humedad_raw: raw.humedad_raw,
        precipitacion_raw: raw.precipitacion_raw,
        motivo_rechazo: `Registro duplicado para la clave compuesta (${raw.ciudad}, ${parsedIsoDate}). Se conserva el primer registro procesado y se descarta esta ocurrencia redundante.`,
        codigo_error: 'DUPLICATE_KEY',
      });
      continue;
    }

    seenKeys.add(uniqueKey);

    // Registro Válido
    validRecords.push({
      id: `${raw.ciudad.toLowerCase().trim()}__${parsedIsoDate}`,
      ciudad: raw.ciudad,
      fecha_hora: parsedIsoDate,
      temperatura_c: Number(tempNum.toFixed(2)),
      humedad_pct: Number(humNum.toFixed(2)),
      precipitacion_mm: Number(precipNum.toFixed(2)),
    });
  }

  return { validRecords, rejectedRecords, duplicateCount };
}

/**
 * Fase de Filtrado y Ordenación:
 * Aplica filtros analíticos y ordenación en memoria sobre los registros válidos.
 * Esta operación ocurre SIEMPRE antes de la paginación.
 */
export function applyFiltersAndSorting(
  records: ValidMeasurementRecord[],
  filters: FilterCriteria,
  sort: SortCriteria
): ValidMeasurementRecord[] {
  // 1. Filtrado
  const filtered = records.filter((r) => {
    // Filtro por ciudad
    if (filters.cities && filters.cities.length > 0) {
      if (!filters.cities.includes(r.ciudad)) return false;
    }

    // Filtro por rango de fecha
    if (filters.dateFrom) {
      const fromIso = `${filters.dateFrom}T00:00:00.000Z`;
      if (r.fecha_hora < fromIso) return false;
    }
    if (filters.dateTo) {
      const toIso = `${filters.dateTo}T23:59:59.999Z`;
      if (r.fecha_hora > toIso) return false;
    }

    // Filtros de Temperatura
    if (filters.tempMin !== null && r.temperatura_c < filters.tempMin) return false;
    if (filters.tempMax !== null && r.temperatura_c > filters.tempMax) return false;

    // Filtros de Humedad
    if (filters.humidityMin !== null && r.humedad_pct < filters.humidityMin) return false;
    if (filters.humidityMax !== null && r.humedad_pct > filters.humidityMax) return false;

    // Filtros de Precipitación
    if (filters.precipMin !== null && r.precipitacion_mm < filters.precipMin) return false;
    if (filters.precipMax !== null && r.precipitacion_mm > filters.precipMax) return false;

    // Solo registros con lluvia (> 0 mm)
    if (filters.onlyRain && r.precipitacion_mm <= 0) return false;

    return true;
  });

  // 2. Ordenación
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'ciudad':
        comparison = a.ciudad.localeCompare(b.ciudad, 'es');
        break;
      case 'fecha_hora':
        comparison = a.fecha_hora.localeCompare(b.fecha_hora);
        break;
      case 'temperatura_c':
        comparison = a.temperatura_c - b.temperatura_c;
        break;
      case 'humedad_pct':
        comparison = a.humedad_pct - b.humedad_pct;
        break;
      case 'precipitacion_mm':
        comparison = a.precipitacion_mm - b.precipitacion_mm;
        break;
    }

    return sort.direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Divide un conjunto de registros en lotes de tamaño máximo especificado
 */
export function chunkRecords<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
