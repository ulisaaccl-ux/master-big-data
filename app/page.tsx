// ==============================================================================
// Página Principal: Pipeline ETL Big Data (Open-Meteo -> Supabase)
// ==============================================================================

'use client';

import React from 'react';
import {
  CityConfig,
  RawOpenMeteoResponse,
  TransformedMeasurementRecord,
  ValidMeasurementRecord,
  RejectedMeasurementRecord,
  ETLPipelineState,
  FilterCriteria,
  SortCriteria,
  BatchStatus,
} from '@/lib/etl/types';
import {
  INITIAL_CITIES,
  DEFAULT_START_DATE,
  DEFAULT_END_DATE,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  MAX_BATCH_SIZE,
  createInitialPipelineState,
} from '@/lib/etl/constants';
import {
  fetchCityOpenMeteo,
  transformParallelArraysToRecords,
  cleanAndValidateMeasurements,
  applyFiltersAndSorting,
  chunkRecords,
} from '@/lib/etl/engine';
import { ExtractionConfigZone } from '@/components/etl/ExtractionConfigZone';
import { PipelineVisualizer } from '@/components/etl/PipelineVisualizer';
import { FilterAndSelectionBar } from '@/components/etl/FilterAndSelectionBar';
import { DataInspectionZone } from '@/components/etl/DataInspectionZone';
import { SupabaseDataViewer } from '@/components/etl/SupabaseDataViewer';
import { VerificationTab } from '@/components/etl/VerificationTab';
import { BigDataDidacticGuide } from '@/components/etl/BigDataDidacticGuide';
import {
  Database,
  CloudSun,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function ETLDashboardPage() {
  // 1. Configuración de Extracción
  const [selectedCities, setSelectedCities] = React.useState<CityConfig[]>([...INITIAL_CITIES]);
  const [startDate, setStartDate] = React.useState<string>(DEFAULT_START_DATE);
  const [endDate, setEndDate] = React.useState<string>(DEFAULT_END_DATE);
  const [isExtracting, setIsExtracting] = React.useState<boolean>(false);
  const [failedCities, setFailedCities] = React.useState<Record<string, string>>({});

  // 2. Estado General del Pipeline ETL
  const [pipeline, setPipeline] = React.useState<ETLPipelineState>(createInitialPipelineState);

  // 3. Almacenamiento en Memoria de Trabajo
  const [rawJsons, setRawJsons] = React.useState<Record<string, RawOpenMeteoResponse>>({});
  const [transformedRecords, setTransformedRecords] = React.useState<TransformedMeasurementRecord[]>([]);
  const [validRecords, setValidRecords] = React.useState<ValidMeasurementRecord[]>([]);
  const [rejectedRecords, setRejectedRecords] = React.useState<RejectedMeasurementRecord[]>([]);

  // 4. Filtros, Ordenación y Selección Granular
  const [filters, setFilters] = React.useState<FilterCriteria>(DEFAULT_FILTERS);
  const [sort, setSort] = React.useState<SortCriteria>(DEFAULT_SORT);
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string>>(new Set());

  // 5. Carga a Supabase (Micro-Batching)
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const [frozenSnapshot, setFrozenSnapshot] = React.useState<ValidMeasurementRecord[] | null>(null);
  const [batchStatuses, setBatchStatuses] = React.useState<BatchStatus[]>([]);
  const [uploadReport, setUploadReport] = React.useState<{
    completed: number;
    failed: number;
    message?: string;
  } | null>(null);

  // 6. Navegación por Vistas Principales
  const [mainView, setMainView] = React.useState<
    'pipeline' | 'supabase_data' | 'verification' | 'guide'
  >('pipeline');
  const [inspectionTab, setInspectionTab] = React.useState<string>('preview');

  // --------------------------------------------------------------------------
  // LÓGICA DE FILTRADO Y SELECCIÓN EN MEMORIA
  // --------------------------------------------------------------------------
  // Registros que cumplen los filtros actuales ordenados
  const filteredRecords = React.useMemo(() => {
    return applyFiltersAndSorting(validRecords, filters, sort);
  }, [validRecords, filters, sort]);

  // Registros que cumplen los filtros Y además están seleccionados (Conjunto a subir)
  const previewRecords = React.useMemo(() => {
    return filteredRecords.filter((r) => selectedRowIds.has(r.id));
  }, [filteredRecords, selectedRowIds]);

  // Conteo de registros seleccionados que quedan fuera de los filtros activos
  const outsideFilterSelectedCount = React.useMemo(() => {
    return Math.max(0, selectedRowIds.size - previewRecords.length);
  }, [selectedRowIds, previewRecords]);

  // Actualizar métricas de la fase de filtrado en el visualizador
  React.useEffect(() => {
    setPipeline((prev) => ({
      ...prev,
      filtering: {
        ...prev.filtering,
        status: validRecords.length > 0 ? 'completed' : 'pending',
        inputCount: validRecords.length,
        outputCount: filteredRecords.length,
        selectedCount: previewRecords.length,
        outsideFilterSelectedCount,
      },
    }));
  }, [validRecords.length, filteredRecords.length, previewRecords.length, outsideFilterSelectedCount]);

  // --------------------------------------------------------------------------
  // ACCIONES DE SELECCIÓN
  // --------------------------------------------------------------------------
  const handleToggleRow = (id: string) => {
    if (isUploading) return;
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (isUploading) return;
    const newSelected = new Set(selectedRowIds);
    filteredRecords.forEach((r) => newSelected.add(r.id));
    setSelectedRowIds(newSelected);
  };

  const handleClearSelection = () => {
    if (isUploading) return;
    setSelectedRowIds(new Set());
  };

  const handleResetFilters = () => {
    if (isUploading) return;
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
  };

  // --------------------------------------------------------------------------
  // EJECUCIÓN DEL PIPELINE ETL (Extracción -> Transformación -> Limpieza)
  // --------------------------------------------------------------------------
  const runFullPipeline = async (citiesToProcess = selectedCities) => {
    if (citiesToProcess.length === 0 || isExtracting) return;

    setIsExtracting(true);
    setUploadReport(null);
    setBatchStatuses([]);

    // 1. Iniciar Fase de Extracción
    const extractionStart = performance.now();
    setPipeline((prev) => ({
      ...prev,
      status: 'running',
      extraction: {
        ...prev.extraction,
        status: 'in_progress',
        inputCount: citiesToProcess.length,
        outputCount: 0,
        processedCities: [],
        pendingCities: citiesToProcess.map((c) => c.name),
        failedCities: {},
      },
      transformation: { ...prev.transformation, status: 'pending' },
      cleaning: { ...prev.cleaning, status: 'pending' },
    }));

    const newRawJsons: Record<string, RawOpenMeteoResponse> = { ...rawJsons };
    const newFailed: Record<string, string> = {};
    const processed: string[] = [];

    for (const city of citiesToProcess) {
      const res = await fetchCityOpenMeteo(city, startDate, endDate);
      if (res.success && res.data) {
        newRawJsons[city.name] = res.data;
        processed.push(city.name);
      } else {
        newFailed[city.name] = res.error || 'Fallo desconocido';
      }

      // Actualizar progreso reactivo
      setPipeline((prev) => ({
        ...prev,
        extraction: {
          ...prev.extraction,
          outputCount: processed.length,
          processedCities: [...processed],
          pendingCities: citiesToProcess
            .map((c) => c.name)
            .filter((name) => !processed.includes(name) && !newFailed[name]),
          failedCities: { ...newFailed },
        },
      }));
    }

    const extractionDuration = performance.now() - extractionStart;
    setRawJsons(newRawJsons);
    setFailedCities(newFailed);

    const hasExtractionErrors = Object.keys(newFailed).length > 0;
    setPipeline((prev) => ({
      ...prev,
      extraction: {
        ...prev.extraction,
        status: hasExtractionErrors && processed.length === 0 ? 'error' : 'completed',
        durationMs: Math.round(extractionDuration),
      },
    }));

    if (processed.length === 0) {
      setIsExtracting(false);
      return;
    }

    // 2. Iniciar Fase de Transformación (Arrays Paralelos -> Registros Planos)
    const transformStart = performance.now();
    setPipeline((prev) => ({
      ...prev,
      transformation: { ...prev.transformation, status: 'in_progress' },
    }));

    const allTransformed: TransformedMeasurementRecord[] = [];
    let totalArrayElements = 0;

    for (const cityName of Object.keys(newRawJsons)) {
      const raw = newRawJsons[cityName];
      totalArrayElements += raw.hourly?.time?.length || 0;
      const { records } = transformParallelArraysToRecords(cityName, raw);
      allTransformed.push(...records);
    }

    const transformDuration = performance.now() - transformStart;
    setTransformedRecords(allTransformed);

    setPipeline((prev) => ({
      ...prev,
      transformation: {
        ...prev.transformation,
        status: 'completed',
        inputCount: totalArrayElements,
        outputCount: allTransformed.length,
        durationMs: Math.round(transformDuration),
      },
    }));

    // 3. Iniciar Fase de Limpieza y Calidad de Datos
    const cleaningStart = performance.now();
    setPipeline((prev) => ({
      ...prev,
      cleaning: { ...prev.cleaning, status: 'in_progress' },
    }));

    const { validRecords: cleanedValid, rejectedRecords: cleanedRejected, duplicateCount } =
      cleanAndValidateMeasurements(allTransformed);

    const cleaningDuration = performance.now() - cleaningStart;
    setValidRecords(cleanedValid);
    setRejectedRecords(cleanedRejected);

    // Seleccionar por defecto todos los registros válidos para facilitar la revisión
    const allValidIds = new Set(cleanedValid.map((r) => r.id));
    setSelectedRowIds(allValidIds);

    setPipeline((prev) => ({
      ...prev,
      status: 'completed',
      cleaning: {
        ...prev.cleaning,
        status: 'completed',
        inputCount: allTransformed.length,
        outputCount: cleanedValid.length,
        rejectedCount: cleanedRejected.length,
        duplicatesCount: duplicateCount,
        durationMs: Math.round(cleaningDuration),
      },
    }));

    setIsExtracting(false);
  };

  // Reintento exclusivo de una ciudad que haya fallado
  const handleRetrySingleCity = (city: CityConfig) => {
    runFullPipeline([city]);
  };

  // --------------------------------------------------------------------------
  // CARGA SEGURA POR LOTES EN SUPABASE (Fase 5)
  // --------------------------------------------------------------------------
  const handleUploadToSupabase = async () => {
    if (previewRecords.length === 0 || isUploading) return;

    // Congelar copia inmutable del conjunto seleccionado y su orden
    const snapshot = JSON.parse(JSON.stringify(previewRecords)) as ValidMeasurementRecord[];
    setFrozenSnapshot(snapshot);
    setIsUploading(true);

    const batches = chunkRecords(snapshot, MAX_BATCH_SIZE);
    const initialBatchStatuses: BatchStatus[] = batches.map((batch, idx) => ({
      batchIndex: idx + 1,
      rangeStart: idx * MAX_BATCH_SIZE + 1,
      rangeEnd: idx * MAX_BATCH_SIZE + batch.length,
      totalInBatch: batch.length,
      status: 'pending',
    }));

    setBatchStatuses(initialBatchStatuses);

    setPipeline((prev) => ({
      ...prev,
      loading: {
        ...prev.loading,
        status: 'in_progress',
        inputCount: snapshot.length,
        outputCount: 0,
        failedCount: 0,
        totalBatches: batches.length,
        completedBatches: 0,
        failedBatches: 0,
        batchStatuses: initialBatchStatuses,
        inFlight: true,
      },
    }));

    const loadingStart = performance.now();
    let totalProcessed = 0;
    let totalFailed = 0;
    const updatedStatuses = [...initialBatchStatuses];

    for (let i = 0; i < batches.length; i++) {
      const currentBatch = batches[i];
      updatedStatuses[i] = { ...updatedStatuses[i], status: 'in_progress' };
      setBatchStatuses([...updatedStatuses]);

      try {
        const response = await fetch('/api/etl/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchIndex: i + 1,
            records: currentBatch,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          updatedStatuses[i] = {
            ...updatedStatuses[i],
            status: 'success',
            verifiedCount: data.verifiedCount,
          };
          totalProcessed += data.processedCount || currentBatch.length;
        } else {
          updatedStatuses[i] = {
            ...updatedStatuses[i],
            status: 'error',
            errorMessage: data.error || 'Fallo desconocido en upsert de Supabase',
          };
          totalFailed += currentBatch.length;
        }
      } catch (err: any) {
        updatedStatuses[i] = {
          ...updatedStatuses[i],
          status: 'error',
          errorMessage: `Error de red: ${err?.message}`,
        };
        totalFailed += currentBatch.length;
      }

      setBatchStatuses([...updatedStatuses]);
    }

    const loadingDuration = performance.now() - loadingStart;
    const completedBatchesCount = updatedStatuses.filter((b) => b.status === 'success').length;
    const failedBatchesCount = updatedStatuses.filter((b) => b.status === 'error').length;

    setPipeline((prev) => ({
      ...prev,
      loading: {
        ...prev.loading,
        status: failedBatchesCount > 0 ? (completedBatchesCount > 0 ? 'completed' : 'error') : 'completed',
        outputCount: totalProcessed,
        failedCount: totalFailed,
        durationMs: Math.round(loadingDuration),
        completedBatches: completedBatchesCount,
        failedBatches: failedBatchesCount,
        batchStatuses: updatedStatuses,
        inFlight: false,
      },
    }));

    setUploadReport({
      completed: totalProcessed,
      failed: totalFailed,
      message:
        failedBatchesCount === 0
          ? `¡Carga completa! Se procesaron ${totalProcessed.toLocaleString('es-ES')} registros en Supabase con upsert idempotente y reconciliación de claves.`
          : `Carga parcial: ${totalProcessed.toLocaleString('es-ES')} registros procesados, ${totalFailed.toLocaleString('es-ES')} registros pendientes en lotes fallidos.`,
    });

    setIsUploading(false);
  };

  // Reintento aislado de lotes fallidos
  const handleRetryFailedBatches = async () => {
    if (!frozenSnapshot || isUploading) return;

    const batches = chunkRecords(frozenSnapshot, MAX_BATCH_SIZE);
    const updatedStatuses = [...batchStatuses];
    setIsUploading(true);

    for (let i = 0; i < updatedStatuses.length; i++) {
      if (updatedStatuses[i].status !== 'error') continue;

      const currentBatch = batches[i];
      updatedStatuses[i] = { ...updatedStatuses[i], status: 'in_progress', errorMessage: undefined };
      setBatchStatuses([...updatedStatuses]);

      try {
        const response = await fetch('/api/etl/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchIndex: i + 1,
            records: currentBatch,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          updatedStatuses[i] = {
            ...updatedStatuses[i],
            status: 'success',
            verifiedCount: data.verifiedCount,
          };
        } else {
          updatedStatuses[i] = {
            ...updatedStatuses[i],
            status: 'error',
            errorMessage: data.error || 'Reintento fallido',
          };
        }
      } catch (err: any) {
        updatedStatuses[i] = {
          ...updatedStatuses[i],
          status: 'error',
          errorMessage: `Fallo de conexión: ${err?.message}`,
        };
      }

      setBatchStatuses([...updatedStatuses]);
    }

    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Encabezado Principal */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <CloudSun className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Pipeline ETL Meteorológico
                </h1>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  Open-Meteo ➔ Supabase
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Especialización en Big Data · Extracción, Transformación, Limpieza, Filtrado y Carga Idempotente
              </p>
            </div>
          </div>

          {/* Navegación de Vistas */}
          <nav className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMainView('pipeline')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                mainView === 'pipeline'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Pipeline ETL
            </button>

            <button
              type="button"
              onClick={() => setMainView('supabase_data')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                mainView === 'supabase_data'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-emerald-500" />
              Datos en Supabase
            </button>

            <button
              type="button"
              onClick={() => setMainView('verification')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                mainView === 'verification'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
              10 Verificaciones
            </button>

            <button
              type="button"
              onClick={() => setMainView('guide')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                mainView === 'guide'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5 text-violet-500" />
              Guía Docente
            </button>
          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* VISTA 1: PIPELINE ETL COMPLETO */}
        {mainView === 'pipeline' && (
          <div className="space-y-6">
            {/* 1. Zona de Configuración de Extracción */}
            <ExtractionConfigZone
              selectedCities={selectedCities}
              startDate={startDate}
              endDate={endDate}
              onCitiesChange={setSelectedCities}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onExtractData={() => runFullPipeline()}
              onRetryCity={handleRetrySingleCity}
              isExtracting={isExtracting}
              failedCities={failedCities}
            />

            {/* 2. Visualizador del Pipeline (5 Fases) */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Fases del Pipeline ETL y Estado de Ejecución
                </h2>
                <p className="text-xs text-muted-foreground">
                  Supervisa la entrada, salida y duración real de cada transformación. Haz clic en cualquier fase para inspeccionar sus datos.
                </p>
              </div>

              <PipelineVisualizer
                pipeline={pipeline}
                activeTab={inspectionTab}
                onSelectPhaseTab={(tab) => {
                  setInspectionTab(tab);
                  if (tab === 'supabase_data') {
                    setMainView('supabase_data');
                  }
                }}
              />
            </div>

            {/* 3. Barra de Filtrado, Ordenación y Selección Granular */}
            {validRecords.length > 0 && (
              <FilterAndSelectionBar
                filters={filters}
                sort={sort}
                onFilterChange={setFilters}
                onSortChange={setSort}
                onSelectAllFiltered={handleSelectAllFiltered}
                onClearSelection={handleClearSelection}
                onResetFilters={handleResetFilters}
                totalValidCount={validRecords.length}
                filteredCount={filteredRecords.length}
                selectedCount={previewRecords.length}
                outsideFilterSelectedCount={outsideFilterSelectedCount}
                isUploading={isUploading}
              />
            )}

            {/* 4. Zona de Inspección de Datos con Pestañas y Vista Previa */}
            <DataInspectionZone
              activeTab={inspectionTab}
              onTabChange={setInspectionTab}
              rawJsons={rawJsons}
              transformedRecords={transformedRecords}
              validRecords={validRecords}
              rejectedRecords={rejectedRecords}
              previewRecords={previewRecords}
              selectedRowIds={selectedRowIds}
              onToggleRow={handleToggleRow}
              onUploadToSupabase={handleUploadToSupabase}
              onRetryFailedBatches={handleRetryFailedBatches}
              isUploading={isUploading}
              batchStatuses={batchStatuses}
              uploadReport={uploadReport}
            />
          </div>
        )}

        {/* VISTA 2: CONSULTA DEL DESTINO EN SUPABASE */}
        {mainView === 'supabase_data' && (
          <div className="space-y-6">
            <SupabaseDataViewer />
          </div>
        )}

        {/* VISTA 3: BATERÍA DE 10 VERIFICACIONES OBLIGATORIAS */}
        {mainView === 'verification' && (
          <div className="space-y-6">
            <VerificationTab />
          </div>
        )}

        {/* VISTA 4: GUÍA DOCENTE DE BIG DATA */}
        {mainView === 'guide' && (
          <div className="space-y-6">
            <BigDataDidacticGuide />
          </div>
        )}
      </main>
    </div>
  );
}
