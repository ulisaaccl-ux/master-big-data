// ==============================================================================
// Componente: Visualizador Didáctico del Pipeline ETL (5 Fases Secuenciales)
// ==============================================================================

'use client';

import React from 'react';
import { ETLPipelineState, PhaseStatus } from '@/lib/etl/types';
import {
  DownloadCloud,
  FileCode2,
  ShieldCheck,
  Filter,
  Database,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface PipelineVisualizerProps {
  pipeline: ETLPipelineState;
  activeTab: string;
  onSelectPhaseTab: (tabId: string) => void;
}

export function PipelineVisualizer({
  pipeline,
  activeTab,
  onSelectPhaseTab,
}: PipelineVisualizerProps) {
  const phases = [
    {
      id: 'raw_json',
      title: '1. Extracción',
      icon: DownloadCloud,
      state: pipeline.extraction,
      targetTab: 'raw_json',
      inputLabel: 'Ciudades configuradas',
      outputLabel: 'Respuestas exitosas',
      note: 'Peticiones HTTP a Open-Meteo Archive en UTC.',
    },
    {
      id: 'transformed',
      title: '2. Transformación',
      icon: FileCode2,
      state: pipeline.transformation,
      targetTab: 'transformed',
      inputLabel: 'Elementos de arrays',
      outputLabel: 'Filas estructuradas',
      note: 'Aplanado de arrays paralelos a registros horarios.',
    },
    {
      id: 'valid',
      title: '3. Limpieza & Calidad',
      icon: ShieldCheck,
      state: pipeline.cleaning,
      targetTab: 'valid',
      inputLabel: 'Filas entrantes',
      outputLabel: 'Registros validados',
      note: 'Tipado estricto, no nulos a cero y deduplicación.',
    },
    {
      id: 'preview',
      title: '4. Filtrado & Selección',
      icon: Filter,
      state: pipeline.filtering,
      targetTab: 'preview',
      inputLabel: 'Válidos globales',
      outputLabel: 'Seleccionados para subir',
      note: 'Filtros analíticos, ordenación y selección granular.',
    },
    {
      id: 'supabase_data',
      title: '5. Carga Supabase',
      icon: Database,
      state: pipeline.loading,
      targetTab: 'supabase_data',
      inputLabel: 'Filas en micro-lotes',
      outputLabel: 'Confirmados en BD',
      note: 'Upsert idempotente (onConflict) y reconciliación.',
    },
  ];

  const getStatusBadge = (status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Completada
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" /> En curso
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
            <AlertCircle className="h-3 w-3" /> Con errores
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3" /> Pendiente
          </span>
        );
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isSelected = activeTab === phase.targetTab;
          const status = phase.state.status;

          return (
            <div
              key={phase.id}
              onClick={() => onSelectPhaseTab(phase.targetTab)}
              className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all hover:shadow-md ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {/* Encabezado de la Fase */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : status === 'in_progress'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : status === 'error'
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                      {phase.title}
                    </h3>
                  </div>
                </div>

                <div className="mt-2">{getStatusBadge(status)}</div>

                {/* Explicación Didáctica */}
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {phase.state.explanation || phase.note}
                </p>
              </div>

              {/* Métricas de Entrada / Salida / Duración */}
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {phase.inputLabel}
                    </span>
                    <p className="font-mono font-semibold text-foreground">
                      {phase.state.inputCount.toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {phase.outputLabel}
                    </span>
                    <p className="font-mono font-semibold text-foreground">
                      {phase.state.outputCount.toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {phase.state.durationMs > 0
                      ? `${(phase.state.durationMs / 1000).toFixed(2)}s`
                      : '0.00s'}
                  </span>
                  <span className="text-[10px] text-primary underline underline-offset-2">
                    Inspeccionar →
                  </span>
                </div>

                {/* Ciudades procesadas / pendientes si aplica a la fase 1 */}
                {phase.id === 'raw_json' &&
                  (pipeline.extraction.processedCities.length > 0 ||
                    pipeline.extraction.pendingCities.length > 0) && (
                    <div className="mt-2 rounded-md bg-muted/60 p-1.5 text-[10px]">
                      <div className="text-emerald-600 dark:text-emerald-400">
                        ✓ {pipeline.extraction.processedCities.join(', ') || 'Ninguna'}
                      </div>
                      {pipeline.extraction.pendingCities.length > 0 && (
                        <div className="text-amber-600 dark:text-amber-400">
                          ⏳ {pipeline.extraction.pendingCities.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
