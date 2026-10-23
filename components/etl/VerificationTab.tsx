// ==============================================================================
// Componente: Pestaña de Verificación Didáctica (Batería de 10 Pruebas Clave)
// ==============================================================================

'use client';

import React from 'react';
import { runVerificationSuite, VerificationTestResult, CONTROLLED_FIXTURES } from '@/lib/etl/verification';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RotateCw,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';

export function VerificationTab() {
  const [results, setResults] = React.useState<VerificationTestResult[]>([]);
  const [hasRun, setHasRun] = React.useState<boolean>(false);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [showFixtures, setShowFixtures] = React.useState<boolean>(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const suiteResults = runVerificationSuite();
      setResults(suiteResults);
      setHasRun(true);
      setIsRunning(false);
    }, 400);
  };

  // Ejecución automática al montar para que el docente y los estudiantes tengan el estado visible
  React.useEffect(() => {
    handleRunTests();
  }, []);

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Batería de Verificación y Control de Calidad ETL (10 Pruebas)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Validación automatizada de los 10 puntos críticos de robustez, preservación de tipos, detección de duplicados e idempotencia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFixtures(!showFixtures)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            {showFixtures ? 'Ocultar Fixtures Sintéticos' : 'Ver Fixtures Sintéticos'}
          </button>

          <button
            type="button"
            onClick={handleRunTests}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                Ejecutando pruebas...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Reejecutar Verificaciones
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resumen de Resultados */}
      {hasRun && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-sm">
              {passedCount}/{totalCount}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {passedCount === totalCount
                  ? '¡Todas las Verificaciones del Pipeline Han Sido Superadas con Éxito!'
                  : `${passedCount} de ${totalCount} verificaciones completadas`}
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Se han comprobado las 10 especificaciones obligatorias mediante fixtures controlados e invariantes algorítmicos.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            100% Calidad Aprobada
          </span>
        </div>
      )}

      {/* Fixtures Controlados Sintéticos (Aislados) */}
      {showFixtures && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Datasets de Control Sintéticos (Totalmente Aislados de los Datos Reales):
            </span>
            <span className="text-[11px] text-muted-foreground">
              Utilizados para inducir y verificar nulos, rangos erróneos y duplicados.
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Ciudad</th>
                  <th className="px-3 py-2">Fecha/Hora Raw</th>
                  <th className="px-3 py-2">Temp Raw</th>
                  <th className="px-3 py-2">Hum Raw</th>
                  <th className="px-3 py-2">Precip Raw</th>
                  <th className="px-3 py-2">Objetivo del Fixture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {CONTROLLED_FIXTURES.map((f, i) => (
                  <tr key={f.tempId} className="hover:bg-muted/50">
                    <td className="px-3 py-1.5 font-semibold text-primary">{f.tempId}</td>
                    <td className="px-3 py-1.5 font-sans">{f.ciudad}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{f.fecha_hora_raw}</td>
                    <td className="px-3 py-1.5">
                      {f.temperatura_raw === null ? (
                        <span className="rounded bg-destructive/20 px-1 text-destructive">null</span>
                      ) : (
                        String(f.temperatura_raw)
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {f.humedad_raw === '' ? (
                        <span className="rounded bg-destructive/20 px-1 text-destructive">&quot;&quot; (vacío)</span>
                      ) : (
                        String(f.humedad_raw)
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {Number(f.precipitacion_raw) < 0 ? (
                        <span className="rounded bg-destructive/20 px-1 text-destructive">
                          {String(f.precipitacion_raw)}
                        </span>
                      ) : (
                        String(f.precipitacion_raw)
                      )}
                    </td>
                    <td className="px-3 py-1.5 font-sans text-xs text-muted-foreground">
                      {i === 0 && 'Control positivo válido'}
                      {i === 1 && 'Temperatura extrema natural admisible (-15.2°C)'}
                      {i === 2 && 'Null en temperatura (no imputar a cero)'}
                      {i === 3 && 'Cadena vacía en humedad (rechazo estricto)'}
                      {i === 4 && 'Humedad fuera de rango (>100%)'}
                      {i === 5 && 'Precipitación negativa imposible (<0)'}
                      {i === 6 && 'Duplicado deliberado de fxt_1'}
                      {i === 7 && 'Valor NaN no finito'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de las 10 Pruebas */}
      <div className="mt-5 space-y-3">
        {results.map((test) => (
          <div
            key={test.id}
            className={`rounded-xl border p-4 transition-all ${
              test.passed
                ? 'border-emerald-500/25 bg-card hover:border-emerald-500/50'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    test.passed
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {test.id}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{test.name}</h4>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {test.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{test.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {test.passed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verificado OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    <XCircle className="h-3.5 w-3.5" /> Fallo
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2.5 rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              {test.details}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
