// ==============================================================================
// Componente: Consulta Real del Destino en Supabase ("Datos en Supabase")
// ==============================================================================

'use client';

import React from 'react';
import { SupabaseMeasurementRow } from '@/lib/etl/types';
import { INITIAL_CITIES } from '@/lib/etl/constants';
import {
  Database,
  RotateCw,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Copy,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export function SupabaseDataViewer() {
  const [records, setRecords] = React.useState<SupabaseMeasurementRow[]>([]);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [copiedMigration, setCopiedMigration] = React.useState<boolean>(false);

  // Parámetros de consulta
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [selectedCity, setSelectedCity] = React.useState<string>('all');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [sortField, setSortField] = React.useState<string>('fecha_hora');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const fetchSupabaseData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        city: selectedCity,
        dateFrom,
        dateTo,
        sortField,
        sortDirection,
      });

      const res = await fetch(`/api/etl/query?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error || 'Error al conectar con la base de datos de Supabase.'
        );
        setRecords([]);
        setTotalCount(0);
      } else {
        setRecords(data.records || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err: any) {
      setErrorMessage(
        `Error de red al consultar Supabase: ${err?.message || 'Fallo desconocido'}`
      );
      setRecords([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedCity, dateFrom, dateTo, sortField, sortDirection]);

  // Carga inicial y ante cambios de filtros
  React.useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const copySqlMigration = () => {
    const sql = `-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase:
create table if not exists public.mediciones_meteorologicas (
    id bigint generated always as identity primary key,
    ciudad text not null,
    fecha_hora timestamptz not null,
    temperatura_c double precision not null,
    humedad_pct double precision not null,
    precipitacion_mm double precision not null,
    importado_en timestamptz not null default now(),
    constraint mediciones_ciudad_fecha_key unique (ciudad, fecha_hora),
    constraint humedad_rango check (humedad_pct >= 0 and humedad_pct <= 100),
    constraint precipitacion_no_negativa check (precipitacion_mm >= 0)
);

alter table public.mediciones_meteorologicas enable row level security;

create policy "Permitir lectura publica de mediciones"
    on public.mediciones_meteorologicas for select using (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Database className="h-3.5 w-3.5" />
              Destino Persistido: PostgreSQL en Supabase
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
            Inspección de Datos en Destino (`public.mediciones_meteorologicas`)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Consulta en vivo mediante SELECT al almacén relacional de Supabase. Distinción explícita frente a la memoria de trabajo local.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchSupabaseData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar consulta
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Ordenación en Servidor */}
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Ciudad */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Filtrar por Ciudad:</label>
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
          >
            <option value="all">Todas las ciudades</option>
            {INITIAL_CITIES.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha Desde */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Fecha Desde:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
          />
        </div>

        {/* Fecha Hasta */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Fecha Hasta:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
          />
        </div>

        {/* Campo Ordenación */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Ordenar por:</label>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
          >
            <option value="fecha_hora">Fecha y Hora</option>
            <option value="ciudad">Ciudad</option>
            <option value="temperatura_c">Temperatura</option>
            <option value="humedad_pct">Humedad</option>
            <option value="precipitacion_mm">Precipitación</option>
            <option value="importado_en">Momento de Importación</option>
          </select>
        </div>

        {/* Dirección */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Dirección:</label>
          <button
            type="button"
            onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="mt-1 flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            <span>{sortDirection === 'asc' ? 'Ascendente (A-Z, 0-9)' : 'Descendente (Z-A, 9-0)'}</span>
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Manejo de Aviso / Error si la tabla no existe aún */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                Aviso de Base de Datos en Supabase
              </h4>
              <p className="mt-1 text-amber-800 dark:text-amber-300">{errorMessage}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={copySqlMigration}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-amber-700"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedMigration ? '¡SQL Copiado!' : 'Copiar Script SQL de Migración'}
                </button>
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  Pégalo en el Editor SQL de tu panel de Supabase para inicializar la tabla.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Resultados Persistidos */}
      <div className="mt-4">
        {records.length === 0 && !errorMessage ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Database className="h-12 w-12 stroke-[1.2] opacity-40" />
            <p className="mt-3 text-sm font-medium text-foreground">
              0 Registros en Supabase para los filtros seleccionados
            </p>
            <p className="mt-1 text-xs">
              Ejecuta el pipeline de extracción y carga desde la pestaña "Vista Previa" para subir mediciones.
            </p>
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">ID (Identidad)</th>
                  <th className="px-4 py-3">Ciudad</th>
                  <th className="px-4 py-3">Fecha y Hora (timestamptz)</th>
                  <th className="px-4 py-3">Temperatura (°C)</th>
                  <th className="px-4 py-3">Humedad (%)</th>
                  <th className="px-4 py-3">Precipitación (mm)</th>
                  <th className="px-4 py-3">Importado En</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {records.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-semibold text-primary">#{row.id}</td>
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
                    <td className="px-4 py-2 text-[11px] text-muted-foreground">
                      {row.importado_en ? new Date(row.importado_en).toLocaleString('es-ES') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Paginación */}
      {totalCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-border/80 pt-3 text-xs text-muted-foreground">
          <div>
            Total registros persistidos: <strong>{totalCount.toLocaleString('es-ES')}</strong> | Página{' '}
            <strong>{page}</strong> de <strong>{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
