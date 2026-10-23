// ==============================================================================
// Componente: Guía Docente y Fundamentos de Big Data (Marco Teórico y Práctico)
// ==============================================================================

'use client';

import React from 'react';
import {
  GraduationCap,
  Layers,
  Database,
  Cpu,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export function BigDataDidacticGuide() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Guía Didáctica: Arquitectura de Ingestión y Pipelines ETL en Big Data
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Fundamentos conceptuales y decisiones de diseño implementadas en esta práctica de ingeniería de datos.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Concepto 1: Paradigma ETL vs ELT */}
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">1. El Paradigma ETL</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            En <strong>Extract, Transform, Load</strong>, la limpieza y estructuración se ejecutan antes de persistir los datos en el destino.
            Esto evita contaminar el almacén relacional con tipos no finitos, registros con duplicidad o datos incompletos.
          </p>
          <div className="mt-3 rounded-lg bg-muted/60 p-2 text-[11px] font-mono text-foreground">
            Extracción API → Memoria de Trabajo → Validación → Carga Idempotente
          </div>
        </div>

        {/* Concepto 2: Desnormalización de Arrays Paralelos */}
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">2. Arrays Paralelos vs Tuplas</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Las APIs modernas de series temporales (como Open-Meteo) transmiten matrices paralelas por compresión y ancho de banda.
            En la fase de <strong>Transformación</strong>, se sincronizan las posiciones para generar registros normalizados{' '}
            <code className="text-foreground">(ciudad, fecha_hora, métricas)</code>.
          </p>
          <div className="mt-3 rounded-lg bg-muted/60 p-2 text-[11px] font-mono text-foreground">
            time[i] + temp[i] + hum[i] + precip[i] ➔ Fila(i)
          </div>
        </div>

        {/* Concepto 3: Calidad y Semántica del Nulo */}
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">3. Preservación del Null vs 0</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            En analítica meteorológica, <strong>0°C</strong> es una temperatura física real (punto de congelación del agua).
            Un valor ausente (<strong>null</strong>) indica fallo de sensor. Imputar null a 0 distorsionaría medias, percentiles y modelos predictivos.
          </p>
          <div className="mt-3 rounded-lg bg-muted/60 p-2 text-[11px] font-mono text-destructive">
            null ≠ 0.00 ➔ Rechazo estricto con motivo documentado
          </div>
        </div>

        {/* Concepto 4: Idempotencia y Upserts */}
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">4. Idempotencia en Destino</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Una operación es <strong>idempotente</strong> si ejecutarla N veces produce el mismo resultado que ejecutarla una sola vez.
            Mediante la restricción <code className="text-foreground">UNIQUE (ciudad, fecha_hora)</code> y la cláusula{' '}
            <code className="text-foreground">ON CONFLICT DO UPDATE</code>, reintentar una extracción nunca genera filas repetidas.
          </p>
          <div className="mt-3 rounded-lg bg-muted/60 p-2 text-[11px] font-mono text-foreground">
            UPSERT onConflict: (ciudad, fecha_hora)
          </div>
        </div>

        {/* Concepto 5: Micro-Batching */}
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">5. Carga por Micro-Lotes</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Enviar miles de filas en una sola transacción HTTP puede provocar timeouts o sobrecarga de conexiones.
            Segmentamos en lotes de hasta <strong>500 registros</strong>. Si el lote 2 falla, el lote 1 persiste y se puede reintentar solo el fallido.
          </p>
          <div className="mt-3 rounded-lg bg-muted/60 p-2 text-[11px] font-mono text-foreground">
            Chunking [1..500], [501..1000] con aislamiento de errores
          </div>
        </div>

        {/* Concepto 6: Reconciliación de Claves */}
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-foreground">6. Fase de Reconciliación</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            En entornos empresariales de Big Data, no basta con recibir un código HTTP 200: se realiza una lectura de verificación
            para auditar que las claves enviadas existen efectivamente en los índices de PostgreSQL.
          </p>
          <div className="mt-3 rounded-lg bg-muted/60 p-2 text-[11px] font-mono text-foreground">
            Select in(keys) post-carga para comprobar integridad
          </div>
        </div>
      </div>
    </div>
  );
}
