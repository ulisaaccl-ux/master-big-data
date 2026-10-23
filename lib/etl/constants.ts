// ==============================================================================
// Constantes y Configuración Base - Pipeline ETL Big Data
// ==============================================================================

import { CityConfig, ETLPipelineState, FilterCriteria, SortCriteria } from './types';

export const INITIAL_CITIES: CityConfig[] = [
  { id: 'barcelona', name: 'Barcelona', latitude: 41.3874, longitude: 2.1686, country: 'España' },
  { id: 'madrid', name: 'Madrid', latitude: 40.4168, longitude: -3.7038, country: 'España' },
  { id: 'sevilla', name: 'Sevilla', latitude: 37.3891, longitude: -5.9845, country: 'España' },
  { id: 'bilbao', name: 'Bilbao', latitude: 43.2630, longitude: -2.9350, country: 'España' },
  { id: 'valencia', name: 'Valencia', latitude: 39.4699, longitude: -0.3763, country: 'España' },
];

export const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

export const DEFAULT_START_DATE = '2026-09-01';
export const DEFAULT_END_DATE = '2026-09-30';
export const MAX_EXTRACTION_DAYS = 31;
export const MAX_BATCH_SIZE = 500;

export const DEFAULT_FILTERS: FilterCriteria = {
  cities: [], // Vacío = todas las ciudades
  dateFrom: '',
  dateTo: '',
  tempMin: null,
  tempMax: null,
  humidityMin: null,
  humidityMax: null,
  precipMin: null,
  precipMax: null,
  onlyRain: false,
};

export const DEFAULT_SORT: SortCriteria = {
  field: 'fecha_hora',
  direction: 'asc',
};

export function createInitialPipelineState(): ETLPipelineState {
  return {
    status: 'idle',
    extraction: {
      status: 'pending',
      inputCount: 0,
      outputCount: 0,
      durationMs: 0,
      explanation: 'Extracción HTTP desde la API histórica de Open-Meteo en formato UTC para las ciudades y fechas configuradas.',
      processedCities: [],
      pendingCities: [],
      failedCities: {},
    },
    transformation: {
      status: 'pending',
      inputCount: 0,
      outputCount: 0,
      durationMs: 0,
      explanation: 'Conversión de matrices y arrays paralelos (time, temperature, humidity, precipitation) en filas tabulares normalizadas.',
    },
    cleaning: {
      status: 'pending',
      inputCount: 0,
      outputCount: 0,
      rejectedCount: 0,
      duplicatesCount: 0,
      durationMs: 0,
      explanation: 'Verificación de tipos finitos, no conversión de nulos en cero, validación de rangos físicos y deduplicación determinista.',
    },
    filtering: {
      status: 'pending',
      inputCount: 0,
      outputCount: 0,
      selectedCount: 0,
      outsideFilterSelectedCount: 0,
      durationMs: 0,
      explanation: 'Aplicación de filtros multidimensionales, ordenación en memoria y selección granular de filas antes de persistir.',
    },
    loading: {
      status: 'pending',
      inputCount: 0,
      outputCount: 0,
      failedCount: 0,
      durationMs: 0,
      explanation: 'Carga por lotes (micro-batching de hasta 500 filas) con upsert idempotente en Supabase y verificación de claves.',
      totalBatches: 0,
      completedBatches: 0,
      failedBatches: 0,
      batchStatuses: [],
      inFlight: false,
    },
  };
}
