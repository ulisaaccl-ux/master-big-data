// ==============================================================================
// Componente: Zona de Configuración de Extracción (Fase 1 ETL)
// ==============================================================================

'use client';

import React from 'react';
import { CityConfig } from '@/lib/etl/types';
import { INITIAL_CITIES, MAX_EXTRACTION_DAYS } from '@/lib/etl/constants';
import { validateExtractionConfig } from '@/lib/etl/engine';
import {
  MapPin,
  Calendar,
  Layers,
  Play,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface ExtractionConfigZoneProps {
  selectedCities: CityConfig[];
  startDate: string;
  endDate: string;
  onCitiesChange: (cities: CityConfig[]) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onExtractData: () => void;
  onRetryCity: (city: CityConfig) => void;
  isExtracting: boolean;
  failedCities: Record<string, string>;
}

export function ExtractionConfigZone({
  selectedCities,
  startDate,
  endDate,
  onCitiesChange,
  onStartDateChange,
  onEndDateChange,
  onExtractData,
  onRetryCity,
  isExtracting,
  failedCities,
}: ExtractionConfigZoneProps) {
  const validation = validateExtractionConfig(selectedCities, startDate, endDate);

  const toggleCity = (city: CityConfig) => {
    const exists = selectedCities.some((c) => c.id === city.id);
    if (exists) {
      onCitiesChange(selectedCities.filter((c) => c.id !== city.id));
    } else {
      onCitiesChange([...selectedCities, city]);
    }
  };

  const selectAllCities = () => {
    onCitiesChange([...INITIAL_CITIES]);
  };

  const deselectAllCities = () => {
    onCitiesChange([]);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all">
      <div className="flex flex-col justify-between gap-4 border-b border-border/50 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Configuración de la Extracción (Data Source: Open-Meteo Archive)
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Define el alcance espacial y temporal para la ingestión inicial de series temporales horarias.
          </p>
        </div>

        {/* Resumen del Volumen Previsto */}
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-2 text-xs">
          <Layers className="h-4 w-4 text-primary" />
          <div>
            <span className="text-muted-foreground">Volumen estimado: </span>
            <strong className="font-mono text-sm text-foreground">
              {validation.estimatedVolume.toLocaleString('es-ES')}
            </strong>{' '}
            <span className="text-muted-foreground">
              registros ({selectedCities.length} ciudades × {validation.daysCount} días × 24h)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Selector Múltiple de Ciudades */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ciudades de estudio:
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllCities}
                disabled={isExtracting}
                className="text-primary hover:underline"
              >
                Todas
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={deselectAllCities}
                disabled={isExtracting}
                className="text-muted-foreground hover:underline"
              >
                Ninguna
              </button>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {INITIAL_CITIES.map((city) => {
              const isSelected = selectedCities.some((c) => c.id === city.id);
              const hasFailed = Boolean(failedCities[city.name]);

              return (
                <div
                  key={city.id}
                  onClick={() => !isExtracting && toggleCity(city)}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3 transition-all ${
                    hasFailed
                      ? 'border-destructive/60 bg-destructive/5'
                      : isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin
                        className={`h-4 w-4 ${
                          hasFailed
                            ? 'text-destructive'
                            : isSelected
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <span className="text-sm font-medium text-foreground">{city.name}</span>
                    </div>
                    {isSelected && !hasFailed && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {city.latitude.toFixed(4)}°, {city.longitude.toFixed(4)}°
                  </div>

                  {/* Fallo con opción de reintento aislado */}
                  {hasFailed && (
                    <div className="mt-2 flex items-center justify-between border-t border-destructive/20 pt-1.5 text-[11px] text-destructive">
                      <span className="truncate">Error en descarga</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryCity(city);
                        }}
                        disabled={isExtracting}
                        className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 font-medium hover:bg-destructive/20"
                        title="Reintentar exclusivamente esta ciudad"
                      >
                        <RotateCw className="h-3 w-3" /> Reintentar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rango de Fechas y Botón de Ejecución */}
        <div className="flex flex-col justify-between lg:col-span-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Periodo de Extracción (Límite {MAX_EXTRACTION_DAYS} días):
            </label>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground">Fecha inicial (UTC):</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  disabled={isExtracting}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Fecha final (UTC):</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  disabled={isExtracting}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Mensajes de Validación */}
            {!validation.isValid ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{validation.errorMessage}</span>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">
                ✓ Solicitud en zona horaria UTC explícita con variables: temperatura_2m (°C), relative_humidity_2m (%) y precipitation (mm).
              </p>
            )}
          </div>

          {/* Botón Principal de Ejecución del Pipeline */}
          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={onExtractData}
              disabled={!validation.isValid || isExtracting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Extrayendo datos de Open-Meteo...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Extraer datos ({validation.estimatedVolume} registros previstos)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
