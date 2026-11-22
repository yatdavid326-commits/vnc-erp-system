import JSZip from 'jszip';

const EXPORT_PAGE_SIZE = 100;

interface CsvExportModule {
  key: string;
  label: string;
  filename: string;
  endpoint: string;
  mode: 'paginated' | 'cash' | 'single';
}

export interface CsvExportProgress {
  current: number;
  total: number;
  module: string;
}

interface CsvModuleStatus extends Record<string, string | number> {
  modulo: string;
  estado: string;
  registros: number;
  detalle: string;
}

class CsvExportHttpError extends Error {
  readonly status: number;

  constructor(
    status: number,
    message: string
  ) {
    super(message);
    this.name = 'CsvExportHttpError';
    this.status = status;
  }
}

function getExportModules(filters: { tipo: string; inicio: string; fin: string }): CsvExportModule[] {
  const reportParams = new URLSearchParams({
    tipo: filters.tipo,
    inicio: filters.inicio,
    fin: filters.fin,
  });

  return [
    {
      key: 'asistencia',
      label: 'Asistencia',
      filename: 'asistencia.csv',
      endpoint: '/api/asistencia',
      mode: 'paginated',
    },
    {
      key: 'caja',
      label: 'Caja',
      filename: 'caja.csv',
      endpoint: '/api/caja',
      mode: 'cash',
    },
    {
      key: 'clientes',
      label: 'Clientes',
      filename: 'clientes.csv',
      endpoint: '/api/clientes',
      mode: 'paginated',
    },
    {
      key: 'compras',
      label: 'Compras',
      filename: 'compras.csv',
      endpoint: '/api/compras',
      mode: 'paginated',
    },
    {
      key: 'empleados',
      label: 'Empleados',
      filename: 'empleados.csv',
      endpoint: '/api/empleados',
      mode: 'paginated',
    },
    {
      key: 'inventario',
      label: 'Inventario',
      filename: 'inventario.csv',
      endpoint: '/api/inventario',
      mode: 'paginated',
    },
    {
      key: 'pos',
      label: 'Ventas POS',
      filename: 'pos.csv',
      endpoint: '/api/pos',
      mode: 'paginated',
    },
    {
      key: 'proveedores',
      label: 'Proveedores',
      filename: 'proveedores.csv',
      endpoint: '/api/proveedores',
      mode: 'paginated',
    },
    {
      key: 'reportes',
      label: 'Reportes',
      filename: 'reportes.csv',
      endpoint: `/api/reportes?${reportParams}`,
      mode: 'single',
    },
  ];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('La respuesta del módulo no contiene un registro válido.');
  }
  return value as Record<string, unknown>;
}

function asRecords(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    throw new Error('La respuesta del módulo no contiene una lista de registros.');
  }
  return value.map(asRecord);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error('El servidor devolvió una respuesta JSON no válida.');
  }
}

async function requestModulePage(
  endpoint: string,
  page: number
): Promise<{ response: Response; payload: unknown }> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const response = await fetch(
    `${endpoint}${separator}page=${page}&limit=${EXPORT_PAGE_SIZE}`,
    { cache: 'no-store' }
  );
  const payload = await readJson(response);
  if (!response.ok) {
    const body = typeof payload === 'object' && payload !== null ? payload : {};
    const message =
      'error' in body && typeof body.error === 'string'
        ? body.error
        : 'No se pudo obtener la información del módulo.';
    throw new CsvExportHttpError(response.status, message);
  }
  return { response, payload };
}

function getCount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`El total de registros de ${label} no es válido.`);
  }
  return value;
}

async function fetchModuleRecords(module: CsvExportModule): Promise<Record<string, unknown>[]> {
  if (module.mode === 'single') {
    const { payload } = await requestModulePage(module.endpoint, 1);
    return Array.isArray(payload) ? asRecords(payload) : [asRecord(payload)];
  }

  const records: Array<Record<string, unknown>> = [];
  let expectedTotal: number | undefined;
  let page = 1;

  while (expectedTotal === undefined || records.length < expectedTotal) {
    const { response, payload } = await requestModulePage(module.endpoint, page);
    let pageRecords: Array<Record<string, unknown>>;
    let total: number;

    if (module.mode === 'cash') {
      const body = asRecord(payload);
      pageRecords = asRecords(body.data);
      total = getCount(body.total, module.label);
    } else {
      pageRecords = asRecords(payload);
      const totalHeader = response.headers.get('X-Total-Count');
      if (totalHeader === null || !/^\d+$/.test(totalHeader)) {
        throw new Error(`La respuesta de ${module.label} no incluye un total válido.`);
      }
      total = getCount(Number(totalHeader), module.label);
    }

    if (expectedTotal !== undefined && total !== expectedTotal) {
      throw new Error(`El total de ${module.label} cambió durante la exportación.`);
    }
    expectedTotal = total;
    records.push(...pageRecords);
    if (records.length > expectedTotal) {
      throw new Error(`La respuesta de ${module.label} excede el total anunciado.`);
    }
    if (records.length < expectedTotal && pageRecords.length === 0) {
      throw new Error(`La exportación de ${module.label} quedó incompleta.`);
    }
    page += 1;
  }

  return records;
}

function csvCell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  if (typeof value === 'string' && /^[\u0000-\u0020]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeRecordsToCsv(records: readonly Record<string, unknown>[]): string {
  const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
  if (columns.length === 0) return '\uFEFF';

  const lines = [
    columns.map(csvCell).join(','),
    ...records.map((record) => columns.map((column) => csvCell(record[column])).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export async function generateAllModuleCsvZip(
  filters: { tipo: string; inicio: string; fin: string },
  onProgress?: (progress: CsvExportProgress) => void
): Promise<Blob> {
  const modules = getExportModules(filters);
  const zip = new JSZip();
  const statuses: CsvModuleStatus[] = [];
  let accessibleModules = 0;

  for (const [index, module] of modules.entries()) {
    onProgress?.({ current: index + 1, total: modules.length, module: module.label });

    try {
      const records = await fetchModuleRecords(module);
      accessibleModules += 1;
      if (records.length > 0) zip.file(module.filename, serializeRecordsToCsv(records));
      const scopeDetail =
        module.key === 'caja'
          ? 'Incluye solo los movimientos de la caja abierta del usuario actual.'
          : module.key === 'reportes'
            ? 'Incluye el resumen agregado devuelto por la API de reportes.'
            : '';
      statuses.push({
        modulo: module.label,
        estado: records.length > 0 ? 'Exportado' : 'Sin registros',
        registros: records.length,
        detalle:
          records.length > 0
            ? scopeDetail
            : [scopeDetail, 'No había registros para exportar.'].filter(Boolean).join(' '),
      });
    } catch (error) {
      if (error instanceof CsvExportHttpError && error.status === 403) {
        statuses.push({
          modulo: module.label,
          estado: 'Sin permiso de lectura',
          registros: 0,
          detalle: error.message,
        });
        continue;
      }
      if (error instanceof CsvExportHttpError && error.status === 409 && module.key === 'caja') {
        statuses.push({
          modulo: module.label,
          estado: 'No disponible',
          registros: 0,
          detalle: error.message,
        });
        continue;
      }
      throw new Error(
        `No se pudo exportar ${module.label}: ${
          error instanceof Error ? error.message : 'Error desconocido.'
        }`
      );
    }
  }

  if (accessibleModules === 0) {
    throw new Error('No hay módulos con permiso de lectura para exportar.');
  }

  zip.file(
    'manifiesto.csv',
    serializeRecordsToCsv(statuses)
  );
  return zip.generateAsync({ type: 'blob' });
}
