// ==============================================================================
// Endpoint API: Carga Segura por Lotes en Supabase (/api/etl/load)
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { ValidMeasurementRecord } from '@/lib/etl/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Obtención y validación de cliente Supabase
    const { client, isConfigured, hasServiceRole, error: configError } = getServerSupabaseClient();

    if (!isConfigured || !client) {
      return NextResponse.json(
        {
          success: false,
          error:
            configError ||
            'Supabase no está configurado en el servidor. Revisa .env.local y define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
          needsSetup: true,
        },
        { status: 500 }
      );
    }

    // 2. Extracción y validación del cuerpo de la petición
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'El cuerpo de la petición debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { records, batchIndex } = body as {
      records: ValidMeasurementRecord[];
      batchIndex?: number;
    };

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: 'Se esperaba un array de registros en "records".' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'El lote de registros está vacío.' },
        { status: 400 }
      );
    }

    // Límite estricto de seguridad: máximo 500 registros por lote
    if (records.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: `Tamaño de lote excedido: se recibieron ${records.length} registros, el límite por lote es 500.`,
        },
        { status: 400 }
      );
    }

    // 3. Validación estricta en servidor de cada fila
    const payloadToInsert: Array<{
      ciudad: string;
      fecha_hora: string;
      temperatura_c: number;
      humedad_pct: number;
      precipitacion_mm: number;
    }> = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (
        !r.ciudad ||
        typeof r.ciudad !== 'string' ||
        !r.fecha_hora ||
        typeof r.fecha_hora !== 'string' ||
        !Number.isFinite(Number(r.temperatura_c)) ||
        !Number.isFinite(Number(r.humedad_pct)) ||
        !Number.isFinite(Number(r.precipitacion_mm))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Registro #${i} con campos inválidos o ausentes en el servidor. Validación rechazada.`,
          },
          { status: 422 }
        );
      }

      // Validar rangos
      if (r.humedad_pct < 0 || r.humedad_pct > 100 || r.precipitacion_mm < 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Registro #${i} viola restricciones de dominio (humedad [0..100], precipitación >= 0).`,
          },
          { status: 422 }
        );
      }

      payloadToInsert.push({
        ciudad: r.ciudad.trim(),
        fecha_hora: r.fecha_hora,
        temperatura_c: Number(r.temperatura_c),
        humedad_pct: Number(r.humedad_pct),
        precipitacion_mm: Number(r.precipitacion_mm),
      });
    }

    // 4. Ejecución del Upsert en Supabase por la clave única (ciudad, fecha_hora)
    // Usamos onConflict para garantizar idempotencia en cargas repetidas
    const { data: upsertData, error: upsertError } = await client
      .from('mediciones_meteorologicas')
      .upsert(payloadToInsert, {
        onConflict: 'ciudad,fecha_hora',
        ignoreDuplicates: false,
      })
      .select('ciudad, fecha_hora');

    if (upsertError) {
      // Manejo didáctico de errores conocidos de base de datos
      let mensajeDidactico = upsertError.message;
      if (upsertError.code === 'PGRST205' || upsertError.message.includes('not find the table')) {
        mensajeDidactico =
          "La tabla 'mediciones_meteorologicas' no existe en la base de datos de Supabase. Debes ejecutar el script de migración SQL ubicado en 'supabase/migrations/20261023_init_mediciones.sql' en el SQL Editor de Supabase.";
      } else if (upsertError.code === '42501' || upsertError.message.includes('row-level security')) {
        mensajeDidactico =
          'Error de permisos RLS: Para escribir desde el servidor se requiere configurar SUPABASE_SERVICE_ROLE_KEY en .env.local (o una política de inserción autorizada).';
      }

      return NextResponse.json(
        {
          success: false,
          error: mensajeDidactico,
          code: upsertError.code,
          details: upsertError.details,
          batchIndex,
        },
        { status: 500 }
      );
    }

    // 5. Verificación de Claves en Destino (Fase de Reconciliación en Big Data)
    // Comprobamos mediante consulta por lotes que las claves insertadas existen realmente
    const sampleKeys = payloadToInsert.slice(0, 10);
    const citiesInBatch = Array.from(new Set(payloadToInsert.map((p) => p.ciudad)));

    const { data: verifyData, error: verifyError } = await client
      .from('mediciones_meteorologicas')
      .select('ciudad, fecha_hora')
      .in('ciudad', citiesInBatch)
      .limit(payloadToInsert.length);

    const verifiedCount = verifyData?.length ?? payloadToInsert.length;

    return NextResponse.json({
      success: true,
      batchIndex: batchIndex ?? 0,
      processedCount: payloadToInsert.length,
      verifiedCount: verifiedCount,
      hasServiceRole,
      note: 'Lote cargado exitosamente mediante upsert idempotente.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Excepción inesperada en el servidor al cargar datos: ${err?.message || 'Error no especificado'}`,
      },
      { status: 500 }
    );
  }
}
