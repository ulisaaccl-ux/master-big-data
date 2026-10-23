// ==============================================================================
// Tipos y Modelos de Datos - Pipeline ETL Big Data (Open-Meteo -> Supabase)
// ==============================================================================

export interface CityConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
}

export interface RawOpenMeteoHourly {
  time: string[];
  temperature_2m: (number | null)[];
  relative_humidity_2m: (number | null)[];
  precipitation: (number | null)[];
}

export interface RawOpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    precipitation: string;
  };
  hourly: RawOpenMeteoHourly;
}

// Registro plano intermedio obtenido tras convertir los arrays paralelos
export interface TransformedMeasurementRecord {
  tempId: string;
  ciudad: string;
  fecha_hora_raw: string;
  temperatura_raw: any;
  humedad_raw: any;
  precipitacion_raw: any;
}

// Registro validado de alta calidad listo para el almacén de datos
export interface ValidMeasurementRecord {
  id: string; // clave determinista única: `${ciudad}__${fecha_hora}`
  ciudad: string;
  fecha_hora: string; // ISO 8601 UTC estricto (ej. 2026-09-01T00:00:00.000Z)
  temperatura_c: number;
  humedad_pct: number;
  precipitacion_mm: number;
}

// Registro que falló en los filtros de calidad con su motivo documentado
export interface RejectedMeasurementRecord {
  id: string;
  ciudad: string;
  fecha_hora_raw: string;
  temperatura_raw: any;
  humedad_raw: any;
  precipitacion_raw: any;
  motivo_rechazo: string;
  codigo_error:
    | 'ARRAY_MISMATCH'
    | 'MISSING_FIELD'
    | 'INVALID_DATE'
    | 'NON_FINITE_NUMBER'
    | 'HUMIDITY_OUT_OF_RANGE'
    | 'NEGATIVE_PRECIPITATION'
    | 'DUPLICATE_KEY';
}

// Estados de cada fase del pipeline ETL
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'error';

export interface ExtractionPhaseState {
  status: PhaseStatus;
  inputCount: number; // Ciudades a extraer
  outputCount: number; // Respuestas obtenidas exitosamente
  durationMs: number;
  explanation: string;
  processedCities: string[];
  pendingCities: string[];
  failedCities: Record<string, string>; // ciudad -> mensaje de error
}

export interface TransformationPhaseState {
  status: PhaseStatus;
  inputCount: number; // Número de elementos en arrays
  outputCount: number; // Registros planos generados
  durationMs: number;
  explanation: string;
}

export interface CleaningPhaseState {
  status: PhaseStatus;
  inputCount: number; // Registros planos entrantes
  outputCount: number; // Registros válidos salientes
  rejectedCount: number;
  duplicatesCount: number;
  durationMs: number;
  explanation: string;
}

export interface FilteringPhaseState {
  status: PhaseStatus;
  inputCount: number; // Registros válidos totales
  outputCount: number; // Registros que cumplen los filtros activos
  selectedCount: number; // Registros seleccionados para cargar
  outsideFilterSelectedCount: number; // Seleccionados que quedaron fuera de filtros
  durationMs: number;
  explanation: string;
}

export interface BatchStatus {
  batchIndex: number;
  rangeStart: number;
  rangeEnd: number;
  totalInBatch: number;
  status: 'pending' | 'in_progress' | 'success' | 'error';
  errorMessage?: string;
  verifiedCount?: number;
}

export interface LoadingPhaseState {
  status: PhaseStatus;
  inputCount: number; // Registros seleccionados congelados para la carga
  outputCount: number; // Registros confirmados en Supabase
  failedCount: number;
  durationMs: number;
  explanation: string;
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  batchStatuses: BatchStatus[];
  inFlight: boolean;
}

export interface ETLPipelineState {
  status: 'idle' | 'running' | 'completed' | 'error';
  extraction: ExtractionPhaseState;
  transformation: TransformationPhaseState;
  cleaning: CleaningPhaseState;
  filtering: FilteringPhaseState;
  loading: LoadingPhaseState;
}

// Criterios de filtrado y ordenación
export interface FilterCriteria {
  cities: string[];
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  tempMin: number | null;
  tempMax: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  precipMin: number | null;
  precipMax: number | null;
  onlyRain: boolean; // precipitación > 0
}

export type SortField = 'ciudad' | 'fecha_hora' | 'temperatura_c' | 'humedad_pct' | 'precipitacion_mm';
export type SortDirection = 'asc' | 'desc';

export interface SortCriteria {
  field: SortField;
  direction: SortDirection;
}

// Registro almacenado en Supabase
export interface SupabaseMeasurementRow {
  id: number;
  ciudad: string;
  fecha_hora: string;
  temperatura_c: number;
  humedad_pct: number;
  precipitacion_mm: number;
  importado_en: string;
}
