# 🌦️ Pipeline ETL Meteorológico: Open-Meteo ➔ Supabase
> **Especialización en Big Data** · Ingestión de Datos, Normalización de Series Temporales, Limpieza Rigurosa, Filtrado y Carga Idempotente

---

## 📌 1. Visión General del Proyecto

Esta aplicación interactiva implementa y visualiza de forma didáctica un **pipeline ETL (Extract, Transform, Load)** completo para el tratamiento de series temporales meteorológicas históricas. 

El objetivo es capacitar a estudiantes y desarrolladores en los conceptos clave de la ingeniería de datos:
1. **Extracción**: Peticiones HTTP a la API histórica de Open-Meteo en formato **UTC**.
2. **Transformación**: Desnormalización de matrices/arrays paralelos (`time`, `temperature_2m`, `relative_humidity_2m`, `precipitation`) en registros tabulares planos por ciudad y hora.
3. **Limpieza & Calidad**:
   - Validación estricta de tipos numéricos finitos (`Number.isFinite`).
   - **Preservación semántica del nulo**: Los valores `null` o vacíos **nunca se imputan a 0**, sino que se rechazan documentando el motivo exacto (`MISSING_FIELD`).
   - Restricciones de dominio físico: humedad relativa en $[0, 100]\%$, precipitación $\ge 0\text{ mm}$.
   - **Deduplicación determinista**: Se preserva el primer registro recibido para la clave `(ciudad, fecha_hora)` y se descartan las apariciones posteriores.
   - **Temperaturas extremas**: No se descartan temperaturas naturales bajo umbrales arbitrarios.
4. **Filtrado, Ordenación y Selección**:
   - Filtros multidimensionales (ciudades, rango de fechas, rangos de temperatura/humedad/precipitación, conmutador de solo lluvia).
   - Ordenación global en memoria antes de la paginación.
   - Selección persistente entre páginas y control de registros seleccionados fuera de filtros.
5. **Carga en Supabase (Micro-Batching & Idempotencia)**:
   - Escritura **exclusiva desde el servidor backend** (Next.js API route).
   - Carga dividida en micro-lotes de hasta 500 registros con control de reintento de fallos aislados.
   - Cláusula `upsert` con `onConflict: 'ciudad,fecha_hora'` para garantizar idempotencia.
   - Fase de **reconciliación y verificación** de claves post-inserción.

---

## 🚀 2. Requisitos Previos e Instalación

### Requisitos:
- Node.js 18+ (recomendado Node 20 LTS o superior).
- Gestor de paquetes `npm`.
- Cuenta o proyecto activo en [Supabase](https://supabase.com).

### Pasos de Instalación:
```bash
# 1. Navegar al directorio del proyecto
cd "next-app"

# 2. Instalar dependencias
npm install
```

---

## ⚙️ 3. Configuración de Variables de Entorno

Copia el archivo de plantilla `.env.example` como `.env.local`:
```bash
cp .env.example .env.local
```

Configura tus credenciales reales en `.env.local`:
```env
# URL de tu instancia de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Clave pública / anon (para lectura desde el cliente)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_tu_clave_publica

# Clave secreta con rol de servicio (SERVICE_ROLE) para carga backend segura
# NUNCA uses NEXT_PUBLIC_ para esta clave ni la compartas en el repositorio.
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_secreta
```

---

## 🗄️ 4. Migración de Base de Datos en Supabase

Antes de ejecutar la carga a Supabase, debes crear la tabla de destino ejecutando la migración SQL en el **SQL Editor** de tu panel de Supabase.

El script se encuentra en:
📁 `supabase/migrations/20261023_init_mediciones.sql`

```sql
create table if not exists public.mediciones_meteorologicas (
    id bigint generated always as identity primary key,
    ciudad text not null,
    fecha_hora timestamptz not null,
    temperatura_c double precision not null,
    humedad_pct double precision not null,
    precipitacion_mm double precision not null,
    importado_en timestamptz not null default now(),

    -- Restricción única para garantizar idempotencia
    constraint mediciones_ciudad_fecha_key unique (ciudad, fecha_hora),

    -- Restricciones de integridad física
    constraint humedad_rango check (humedad_pct >= 0 and humedad_pct <= 100),
    constraint precipitacion_no_negativa check (precipitacion_mm >= 0)
);

-- Índices para acelerar agregaciones analíticas
create index if not exists idx_mediciones_ciudad_fecha 
    on public.mediciones_meteorologicas (ciudad, fecha_hora desc);

-- Seguridad a Nivel de Fila (RLS)
alter table public.mediciones_meteorologicas enable row level security;

-- Política de lectura pública para el dashboard
create policy "Permitir lectura publica de mediciones"
    on public.mediciones_meteorologicas for select using (true);
```

---

## 💻 5. Ejecución en Desarrollo

Para iniciar el servidor local con Turbopack:
```bash
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 🧪 6. Suite de Verificación (10 Pruebas Clave)

La aplicación incluye una pestaña de **"10 Verificaciones"** en la barra superior con datasets de control sintéticos (fixtures aislados) que evalúan en tiempo real:
1. **Extracción horaria**: 24 registros para 1 día en zona horaria UTC.
2. **Transformación de arrays paralelos**: mapeo coherente a filas estructuradas.
3. **Tratamiento estricto de nulos**: no se imputa a cero (rechazo con `MISSING_FIELD`).
4. **Deduplicación determinista**: conservación de la primera aparición y auditoría del rechazo.
5. **Filtrado y ordenación antes de paginar**: el orden se aplica sobre la colección global.
6. **Persistencia de selección entre páginas**: selección multi-página mediante `Set<string>`.
7. **Coincidencia idéntica**: correspondencia exacta entre vista previa y payload congelado.
8. **Idempotencia de carga**: upsert sobre `(ciudad, fecha_hora)`.
9. **Micro-batching**: aislamiento de errores y reintento de lotes fallidos individuales.
10. **Integridad de tipos**: chequeo estricto TypeScript y restricciones CHECK en SQL.

---

## 🛡️ 7. Seguridad y Buenas Prácticas

- **Escritura aislada en servidor**: El endpoint `/api/etl/load` ejecuta las escrituras en Supabase utilizando `SUPABASE_SERVICE_ROLE_KEY`. El cliente frontend nunca tiene acceso a claves con permisos de escritura directa en la base de datos.
- **Validación dual**: Los datos son validados tanto en el cliente para retroalimentación inmediata, como en el backend (`/api/etl/load`) para prevenir inyecciones o desbordamientos de tamaño (>500 registros por lote).
- **Protección RLS**: La tabla destino mantiene RLS activo y solo permite operaciones públicas de lectura (`SELECT`), impidiendo inserciones directas no autorizadas.
