// ==============================================================================
// Componente: Zona de Inspección de Datos (Pestañas Didácticas del Pipeline)
// ==============================================================================

'use client';

import React from 'react';
import {
  RawOpenMeteoResponse,
  TransformedMeasurementRecord,
  ValidMeasurementRecord,
  RejectedMeasurementRecord,
  BatchStatus,
} from '@/lib/etl/types';
import {
  Download,
  FileJson,
  FileCode2,
  CheckCircle2,
  XCircle,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  Check,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

interface DataInspectionZoneProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  rawJsons: Record<string, RawOpenMeteoResponse>;
  transformedRecords: TransformedMeasurementRecord[];
  validRecords: ValidMeasurementRecord[];
  rejectedRecords: RejectedMeasurementRecord[];
  previewRecords: ValidMeasurementRecord[];
  selectedRowIds: Set<string>;
  onToggleRow: (id: string) => void;
  // Carga a Supabase
  onUploadToSupabase: () => void;
  onRetryFailedBatches: () => void;
  isUploading: boolean;
  batchStatuses: BatchStatus[];
  uploadReport: {
    completed: number;
    failed: number;
    message?: string;
  } | null;
}

export function DataInspectionZone({
  activeTab,
  onTabChange,
  rawJsons,
  transformedRecords,
  validRecords,
  rejectedRecords,
  previewRecords,
  selectedRowIds,
  onToggleRow,
  onUploadToSupabase,
  onRetryFailedBatches,
  isUploading,
  batchStatuses,
  uploadReport,
}: DataInspectionZoneProps) {
  // Paginación interna por pestaña
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [selectedRawCity, setSelectedRawCity] = React.useState<string>('');

  // Reset de página al cambiar de pestaña
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Selección de primera ciudad disponible para Raw JSON
  const rawCityNames = Object.keys(rawJsons);
  React.useEffect(() => {
    if (rawCityNames.length > 0 && (!selectedRawCity || !rawJsons[selectedRawCity])) {
      setSelectedRawCity(rawCityNames[0]);
    }
  }, [rawJsons, selectedRawCity, rawCityNames]);

  // Descarga del JSON original de una ciudad
  const handleDownloadRawJson = () => {
    if (!selectedRawCity || !rawJsons[selectedRawCity]) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(rawJsons[selectedRawCity], null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `open_meteo_${selectedRawCity.toLowerCase()}_raw.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Cálculo de paginación para la pestaña activa
  let currentListLength = 0;
  if (activeTab === 'transformed') currentListLength = transformedRecords.length;
  else if (activeTab === 'valid') currentListLength = validRecords.length;
  else if (activeTab === 'rejected') currentListLength = rejectedRecords.length;
  else if (activeTab === 'preview') currentListLength = previewRecords.length;

  const totalPages = Math.max(1, Math.ceil(currentListLength / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, currentListLength);

  const paginatedTransformed = transformedRecords.slice(startIndex, endIndex);
  const paginatedValid = validRecords.slice(startIndex, endIndex);
  const paginatedRejected = rejectedRecords.slice(startIndex, endIndex);
  const paginatedPreview = previewRecords.slice(startIndex, endIndex);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm transition-all">
      {/* Navegación por Pestañas de Inspección */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/80 px-4 pt-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onTabChange('raw_json')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === 'raw_json'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileJson className="h-4 w-4" />
            JSON Original ({rawCityNames.length} ciudades)
          </button>

          <button
            type="button"
            onClick={() => onTabChange('transformed')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === 'transformed'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCode2 className="h-4 w-4" />
            Datos Transformados ({transformedRecords.length.toLocaleString('es-ES')})
          </button>

          <button
            type="button"
            onClick={() => onTabChange('valid')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === 'valid'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Registros Válidos ({validRecords.length.toLocaleString('es-ES')})
          </button>

          <button
            type="button"
            onClick={() => onTabChange('rejected')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === 'rejected'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <XCircle className="h-4 w-4 text-destructive" />
            Rechazados & Calidad ({rejectedRecords.length.toLocaleString('es-ES')})
          </button>

          <button
            type="button"
            onClick={() => onTabChange('preview')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UploadCloud className="h-4 w-4 text-blue-500" />
            Vista Previa de Carga ({previewRecords.length.toLocaleString('es-ES')})
          </button>
        </div>

        {/* Selector de tamaño de página */}
        {activeTab !== 'raw_json' && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <span>Mostrar:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>por página</span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PESTAÑA 1: JSON ORIGINAL POR CIUDAD */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'raw_json' && (
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Respuesta Cruda de la API Histórica de Open-Meteo
              </h3>
              <p className="text-xs text-muted-foreground">
                Arrays paralelos recibidos directamente del proveedor de datos meteorológicos sin alterar.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {rawCityNames.length > 0 && (
                <>
                  <select
                    value={selectedRawCity}
                    onChange={(e) => setSelectedRawCity(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {rawCityNames.map((city) => (
                      <option key={city} value={city}>
                        Ciudad: {city}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleDownloadRawJson}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar .json
                  </button>
                </>
              )}
            </div>
          </div>

          {rawCityNames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FileJson className="h-12 w-12 stroke-[1.2] opacity-40" />
              <p className="mt-3 text-sm font-medium">No se han extraído datos todavía</p>
              <p className="mt-1 text-xs">
                Configura las fechas y haz clic en "Extraer datos" para consultar Open-Meteo.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Mostrando JSON de: <strong>{selectedRawCity}</strong> ({' '}
                  {rawJsons[selectedRawCity]?.hourly?.time?.length || 0} marcas de tiempo registradas)
                </span>
                <span className="font-mono text-[11px]">
                  Zona horaria: {rawJsons[selectedRawCity]?.timezone} (
                  {rawJsons[selectedRawCity]?.timezone_abbreviation})
                </span>
              </div>
              <pre className="max-h-[500px] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs text-zinc-100 shadow-inner">
                {JSON.stringify(rawJsons[selectedRawCity], null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PESTAÑA 2: DATOS TRANSFORMADOS (Arrays a Registros Planos) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'transformed' && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Registros Planos Transformados (Desnormalización Inicial)
            </h3>
            <p className="text-xs text-muted-foreground">
              Conversión de arrays paralelos de Open-Meteo en tuplas normalizadas por ciudad y hora antes de aplicar las reglas de calidad y filtros.
            </p>
          </div>

          {transformedRecords.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">Sin datos transformados aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Ciudad</th>
                    <th className="px-4 py-3">Fecha/Hora Original</th>
                    <th className="px-4 py-3">Temp Original (°C)</th>
                    <th className="px-4 py-3">Humedad Original (%)</th>
                    <th className="px-4 py-3">Precipitación Original (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {paginatedTransformed.map((row, i) => (
                    <tr key={row.tempId} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground">{startIndex + i + 1}</td>
                      <td className="px-4 py-2 font-sans font-medium text-foreground">
                        {row.ciudad}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{row.fecha_hora_raw}</td>
                      <td className="px-4 py-2">
                        {row.temperatura_raw === null ? (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                            null
                          </span>
                        ) : (
                          `${row.temperatura_raw}`
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {row.humedad_raw === null ? (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                            null
                          </span>
                        ) : (
                          `${row.humedad_raw}`
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {row.precipitacion_raw === null ? (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                            null
                          </span>
                        ) : (
                          `${row.precipitacion_raw}`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PESTAÑA 3: REGISTROS VÁLIDOS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'valid' && (
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Registros Validados de Alta Calidad
              </h3>
              <p className="text-xs text-muted-foreground">
                Filas con tipos numéricos finitos, fechas en UTC estricto, mediciones completas y sin duplicados.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Total Válidos: <strong>{validRecords.length.toLocaleString('es-ES')}</strong>
            </div>
          </div>

          {validRecords.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">No hay registros válidos disponibles.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3">Sel</th>
                    <th className="px-4 py-3">Ciudad</th>
                    <th className="px-4 py-3">Fecha y Hora (UTC)</th>
                    <th className="px-4 py-3">Temperatura (°C)</th>
                    <th className="px-4 py-3">Humedad (%)</th>
                    <th className="px-4 py-3">Precipitación (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {paginatedValid.map((row) => {
                    const isSelected = selectedRowIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => onToggleRow(row.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleRow(row.id)}
                            className="h-3.5 w-3.5 rounded border-input text-primary"
                          />
                        </td>
                        <td className="px-4 py-2 font-sans font-medium text-foreground">
                          {row.ciudad}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{row.fecha_hora}</td>
                        <td className="px-4 py-2 text-foreground">{row.temperatura_c.toFixed(2)}</td>
                        <td className="px-4 py-2 text-foreground">{row.humedad_pct.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-foreground">
                          {row.precipitacion_mm > 0 ? (
                            <span className="font-semibold text-blue-500">
                              {row.precipitacion_mm.toFixed(2)} mm
                            </span>
                          ) : (
                            '0.00 mm'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PESTAÑA 4: REGISTROS RECHAZADOS Y MOTIVOS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'rejected' && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Auditoría de Calidad: Registros Rechazados y Motivos
            </h3>
            <p className="text-xs text-muted-foreground">
              Transparencia total en el descarte de datos: se identifican nulos, anomalías de rango físico y duplicados.
            </p>
          </div>

          {rejectedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 opacity-60" />
              <p className="mt-3 text-sm font-medium text-foreground">
                ¡Calidad Impecable! 0 Registros Rechazados
              </p>
              <p className="mt-1 text-xs">
                Todas las mediciones extraídas cumplieron rigurosamente las reglas de integridad física y temporal.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-destructive/20">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-destructive/10 font-semibold text-foreground">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Ciudad</th>
                    <th className="px-4 py-3">Fecha/Hora Raw</th>
                    <th className="px-4 py-3">Valores Detectados (T / H / P)</th>
                    <th className="px-4 py-3">Motivo de Rechazo Documentado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedRejected.map((rej) => (
                    <tr key={rej.id} className="hover:bg-destructive/5">
                      <td className="px-4 py-2.5">
                        <span className="rounded-md bg-destructive/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-destructive">
                          {rej.codigo_error}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{rej.ciudad}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {rej.fecha_hora_raw || 'Ausente'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        T: {String(rej.temperatura_raw)} | H: {String(rej.humedad_raw)} | P:{' '}
                        {String(rej.precipitacion_raw)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-destructive">
                        {rej.motivo_rechazo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PESTAÑA 5: VISTA PREVIA DE LA CARGA Y EJECUCIÓN A SUPABASE */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'preview' && (
        <div className="p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  Vista Previa del Conjunto a Cargar en Supabase
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Representación exacta de las {previewRecords.length} filas seleccionadas que cumplen los filtros actuales en el orden establecido.
              </p>
            </div>

            {/* Botón de Carga por Micro-Lotes */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onUploadToSupabase}
                disabled={previewRecords.length === 0 || isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Subiendo lotes a Supabase...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Subir {previewRecords.length.toLocaleString('es-ES')} registros a Supabase
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Advertencia Didáctica de Arquitectura SQL / Big Data */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <strong className="font-semibold">Fundamento de Bases de Datos Relacionales:</strong>
              <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                Una base de datos SQL (como PostgreSQL en Supabase) almacena las tuplas como conjuntos relacionales desordenados físicamente.
                El orden de inserción <strong>no se conserva implícitamente</strong>. Cualquier consulta analítica posterior requiere siempre una cláusula{' '}
                <code className="rounded bg-blue-500/20 px-1 py-0.5 font-mono text-blue-950 dark:text-blue-100">
                  ORDER BY columna ASC/DESC
                </code>{' '}
                para garantizar predictibilidad en los resultados.
              </p>
            </div>
          </div>

          {/* Informe de Lotes y Reintentos Parciales */}
          {batchStatuses.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Progreso Real de Micro-Lotes (Máx. 500 registros/lote):
                </span>
                {batchStatuses.some((b) => b.status === 'error') && (
                  <button
                    type="button"
                    onClick={onRetryFailedBatches}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    <RotateCw className="h-3 w-3" /> Reintentar lotes fallidos
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {batchStatuses.map((batch) => (
                  <div
                    key={batch.batchIndex}
                    className={`rounded-lg border p-2 text-xs ${
                      batch.status === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : batch.status === 'error'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : batch.status === 'in_progress'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">Lote #{batch.batchIndex}</div>
                    <div className="text-[11px]">
                      {batch.totalInBatch} filas ({batch.rangeStart}..{batch.rangeEnd})
                    </div>
                    <div className="mt-1 font-mono text-[10px]">
                      {batch.status === 'success' && '✓ Éxito (Upsert)'}
                      {batch.status === 'in_progress' && '⏳ Cargando...'}
                      {batch.status === 'error' && '❌ Error'}
                      {batch.status === 'pending' && '⋯ En espera'}
                    </div>
                    {batch.errorMessage && (
                      <div className="mt-1 truncate text-[9px] text-destructive" title={batch.errorMessage}>
                        {batch.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {uploadReport && (
                <div className="mt-3 rounded-lg bg-background p-2.5 text-xs">
                  <span className="font-semibold">Informe de Carga: </span>
                  {uploadReport.message ||
                    `Completados: ${uploadReport.completed} filas | Fallidos: ${uploadReport.failed}`}
                </div>
              )}
            </div>
          )}

          {/* Tabla de Registros a Enviar */}
          {previewRecords.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">No hay registros seleccionados que cumplan los filtros actuales.</p>
              <p className="mt-1 text-xs">
                Selecciona registros desde la pestaña de "Registros Válidos" o pulsa "Seleccionar todos filtrados".
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Ciudad</th>
                    <th className="px-4 py-3">Fecha y Hora (UTC)</th>
                    <th className="px-4 py-3">Temperatura (°C)</th>
                    <th className="px-4 py-3">Humedad (%)</th>
                    <th className="px-4 py-3">Precipitación (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {paginatedPreview.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground">{startIndex + idx + 1}</td>
                      <td className="px-4 py-2 font-sans font-medium text-foreground">
                        {row.ciudad}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{row.fecha_hora}</td>
                      <td className="px-4 py-2">{row.temperatura_c.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.humedad_pct.toFixed(2)}%</td>
                      <td className="px-4 py-2">
                        {row.precipitacion_mm > 0 ? (
                          <span className="font-semibold text-blue-500">
                            {row.precipitacion_mm.toFixed(2)} mm
                          </span>
                        ) : (
                          '0.00 mm'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Paginación Inferior Compartida */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab !== 'raw_json' && currentListLength > 0 && (
        <div className="flex flex-wrap items-center justify-between border-t border-border/80 px-6 py-3 text-xs text-muted-foreground">
          <div>
            Mostrando registros del <strong>{startIndex + 1}</strong> al <strong>{endIndex}</strong> de{' '}
            <strong>{currentListLength.toLocaleString('es-ES')}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="font-mono text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
