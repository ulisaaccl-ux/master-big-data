// ==============================================================================
// Componente: Barra de Filtros, Ordenación y Selección Granular (Fase 4 ETL)
// ==============================================================================

'use client';

import React from 'react';
import { FilterCriteria, SortCriteria, SortField, SortDirection } from '@/lib/etl/types';
import { INITIAL_CITIES } from '@/lib/etl/constants';
import {
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  RotateCcw,
  CloudRain,
  AlertTriangle,
} from 'lucide-react';

interface FilterAndSelectionBarProps {
  filters: FilterCriteria;
  sort: SortCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
  onSortChange: (sort: SortCriteria) => void;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onResetFilters: () => void;
  totalValidCount: number;
  filteredCount: number;
  selectedCount: number;
  outsideFilterSelectedCount: number;
  isUploading?: boolean;
}

export function FilterAndSelectionBar({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  onSelectAllFiltered,
  onClearSelection,
  onResetFilters,
  totalValidCount,
  filteredCount,
  selectedCount,
  outsideFilterSelectedCount,
  isUploading = false,
}: FilterAndSelectionBarProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  const toggleCityFilter = (cityName: string) => {
    const current = [...filters.cities];
    const index = current.indexOf(cityName);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(cityName);
    }
    onFilterChange({ ...filters, cities: current });
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all">
      {/* Contadores Clave del Pipeline */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contadores Didácticos:
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Válidos globales: <strong>{totalValidCount.toLocaleString('es-ES')}</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            Cumplen filtros: <strong>{filteredCount.toLocaleString('es-ES')}</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Seleccionados para cargar: <strong>{selectedCount.toLocaleString('es-ES')}</strong>
          </span>
          {outsideFilterSelectedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {outsideFilterSelectedCount} seleccionados fuera de filtros actuales
            </span>
          )}
        </div>

        {/* Acciones de Selección Rápida */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAllFiltered}
            disabled={filteredCount === 0 || isUploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            title="Selecciona todos los registros que cumplen los filtros actuales en todas las páginas"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Seleccionar todos filtrados ({filteredCount})
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={selectedCount === 0 || isUploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            title="Deselecciona todas las filas marcadas"
          >
            <Square className="h-3.5 w-3.5" />
            Vaciar selección
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            title="Restablece todos los filtros analíticos a sus valores por defecto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer filtros
          </button>
        </div>
      </div>

      {/* Panel de Controles de Filtrado y Ordenación */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 1. Filtro por Ciudades */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Filtrar por Ciudades:</label>
          <div className="flex flex-wrap gap-1">
            {INITIAL_CITIES.map((c) => {
              const active = filters.cities.includes(c.name);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCityFilter(c.name)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Filtro Rango de Fechas */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Rango de Fechas (UTC):</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs"
              placeholder="Desde"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs"
              placeholder="Hasta"
            />
          </div>
        </div>

        {/* 3. Filtros Métricos (Temp & Humedad) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Límites Temp / Humedad:</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="T. Min °C"
                value={filters.tempMin ?? ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    tempMin: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
              <input
                type="number"
                placeholder="T. Max °C"
                value={filters.tempMax ?? ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    tempMax: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="H. Min %"
                value={filters.humidityMin ?? ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    humidityMin: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
              <input
                type="number"
                placeholder="H. Max %"
                value={filters.humidityMax ?? ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    humidityMax: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* 4. Filtro de Lluvia y Ordenación */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Lluvia y Ordenación:</label>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted">
              <input
                type="checkbox"
                checked={filters.onlyRain}
                onChange={(e) => onFilterChange({ ...filters, onlyRain: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary"
              />
              <CloudRain className="h-3.5 w-3.5 text-blue-500" />
              <span>Solo lluvia</span>
            </label>

            {/* Selector de Ordenación */}
            <select
              value={sort.field}
              onChange={(e) => onSortChange({ ...sort, field: e.target.value as SortField })}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              <option value="fecha_hora">Fecha/Hora</option>
              <option value="ciudad">Ciudad</option>
              <option value="temperatura_c">Temperatura</option>
              <option value="humedad_pct">Humedad</option>
              <option value="precipitacion_mm">Precipitación</option>
            </select>

            <button
              type="button"
              onClick={() =>
                onSortChange({
                  ...sort,
                  direction: sort.direction === 'asc' ? 'desc' : 'asc',
                })
              }
              className="rounded-md border border-border bg-background p-1 hover:bg-muted"
              title={`Dirección actual: ${sort.direction.toUpperCase()}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
