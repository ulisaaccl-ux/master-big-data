-- ==============================================================================
-- Migración SQL: Tabla mediciones_meteorologicas (Pipeline ETL Open-Meteo -> Supabase)
-- Especialización en Big Data
-- ==============================================================================

-- 1. Creación de la tabla principal de almacenamiento
create table if not exists public.mediciones_meteorologicas (
    id bigint generated always as identity primary key,
    ciudad text not null,
    fecha_hora timestamptz not null,
    temperatura_c double precision not null,
    humedad_pct double precision not null,
    precipitacion_mm double precision not null,
    importado_en timestamptz not null default now(),

    -- Restricción única para garantizar idempotencia en upserts (ciudad + fecha_hora)
    constraint mediciones_ciudad_fecha_key unique (ciudad, fecha_hora),

    -- Restricciones de calidad de datos física
    constraint humedad_rango check (humedad_pct >= 0 and humedad_pct <= 100),
    constraint precipitacion_no_negativa check (precipitacion_mm >= 0)
);

-- 2. Índices para acelerar consultas analíticas y ordenación
create index if not exists idx_mediciones_ciudad_fecha 
    on public.mediciones_meteorologicas (ciudad, fecha_hora desc);

create index if not exists idx_mediciones_fecha 
    on public.mediciones_meteorologicas (fecha_hora desc);

-- 3. Habilitación de Seguridad a Nivel de Fila (Row Level Security - RLS)
alter table public.mediciones_meteorologicas enable row level security;

-- 4. Política de Lectura Pública (permite consultar el destino desde el cliente / dashboard)
drop policy if exists "Permitir lectura publica de mediciones" on public.mediciones_meteorologicas;
create policy "Permitir lectura publica de mediciones"
    on public.mediciones_meteorologicas
    for select
    using (true);

-- 5. Restricción de Escritura:
-- No se crean políticas públicas de INSERT/UPDATE.
-- Las operaciones de escritura solo están autorizadas desde el servidor mediante
-- la clave con rol de servicio (service_role) o usuarios autenticados autorizados.
-- Esto protege la integridad del almacén de datos frente a inserciones no validadas desde el navegador.

-- Comentario explicativo didáctico en la tabla
comment on table public.mediciones_meteorologicas is 
'Tabla destino para el pipeline ETL de Big Data. Almacena mediciones horarias normalizadas y limpiadas de Open-Meteo.';
