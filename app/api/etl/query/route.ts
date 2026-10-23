// ==============================================================================
// Endpoint API: Consulta Real de Destino en Supabase (/api/etl/query)
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { client, isConfigured, error: configError } = getServerSupabaseClient();

    if (!isConfigured || !client) {
      return NextResponse.json(
        {
          success: false,
          error: configError || 'Supabase no está configurado en el servidor.',
          records: [],
          totalCount: 0,
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));
    const city = searchParams.get('city') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortField = searchParams.get('sortField') || 'fecha_hora';
    const sortDirection = searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc';

    const offset = (page - 1) * pageSize;

    // Construcción de la consulta con filtros dinámicos
    let query = client
      .from('mediciones_meteorologicas')
      .select('*', { count: 'exact' });

    if (city && city !== 'all') {
      query = query.eq('ciudad', city);
    }

    if (dateFrom) {
      query = query.gte('fecha_hora', `${dateFrom}T00:00:00.000Z`);
    }

    if (dateTo) {
      query = query.lte('fecha_hora', `${dateTo}T23:59:59.999Z`);
    }

    // Ordenación
    const validSortFields = ['ciudad', 'fecha_hora', 'temperatura_c', 'humedad_pct', 'precipitacion_mm', 'importado_en'];
    const fieldToSort = validSortFields.includes(sortField) ? sortField : 'fecha_hora';

    query = query
      .order(fieldToSort, { ascending: sortDirection === 'asc' })
      .range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      let friendlyError = error.message;
      if (error.code === 'PGRST205' || error.message.includes('not find the table')) {
        friendlyError =
          "La tabla 'mediciones_meteorologicas' todavía no existe en Supabase. Ejecuta la migración en Supabase SQL Editor para ver registros persistidos.";
      }
      return NextResponse.json(
        {
          success: false,
          error: friendlyError,
          code: error.code,
          records: [],
          totalCount: 0,
        },
        { status: 200 } // Retornamos 200 con status false para que la UI muestre el aviso didáctico amigable
      );
    }

    return NextResponse.json({
      success: true,
      records: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Error al consultar datos en Supabase: ${err?.message || 'Error no especificado'}`,
        records: [],
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}
