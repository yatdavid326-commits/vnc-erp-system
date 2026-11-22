'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { fetchJson, fetchPaginatedJson } from '@/lib/utils/fetchJson';
import PaginationControls from '@/components/common/PaginationControls';
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/pagination';
import QRScanner from '@/components/asistencia/QRScanner';
import { MAX_ATTENDANCE_QR_LENGTH } from '@/lib/utils/qrCode';
import { getGeolocationErrorMessage } from '@/lib/utils/geolocation';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  estado: 'activo' | 'inactivo';
}

interface Asistencia {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string | null;
  latitud_entrada: number | null;
  longitud_entrada: number | null;
  created_at: string;
}

export default function AsistenciaPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [empleados, setEmpleados] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showRegistro, setShowRegistro] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [empleadoId, setEmpleadoId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (employeeFilter) params.set('empleado_id', employeeFilter);
    if (dateFrom) params.set('desde', dateFrom);
    if (dateTo) params.set('hasta', dateTo);
    if (statusFilter) params.set('estado', statusFilter);
    if (employeeSearch.trim()) params.set('search', employeeSearch.trim());
    try {
      const [attendance, employees] = await Promise.all([
        fetchPaginatedJson<Asistencia>(`/api/asistencia?${params}`, 'Error al cargar asistencia'),
        fetchJson<Employee[]>('/api/asistencia/empleados', 'Error al cargar empleados'),
      ]);
      setTotal(attendance.total);
      const lastPage = Math.max(1, Math.ceil(attendance.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setAsistencias(attendance.data);
      setEmpleados(employees);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, employeeFilter, employeeSearch, page, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchData(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchData]);

  const obtenerGPS = () => {
    if (!('geolocation' in navigator)) {
      setError('La geolocalización no está disponible en este dispositivo.');
      return;
    }
    setObteniendoGps(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setError('');
        setObteniendoGps(false);
      },
      (geolocationError) => {
        setError(getGeolocationErrorMessage(geolocationError.code, geolocationError.message));
        setObteniendoGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
    );
  };

  const registrarAsistencia = async () => {
    if (!empleadoId) {
      setError('Selecciona un empleado.');
      return;
    }
    if (!coords) {
      setError('Obtén la ubicación GPS antes de registrar la asistencia.');
      return;
    }

    setRegistrando(true);
    setError('');
    try {
      const ahora = new Date();
      const fechaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 10);
      const response = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado_id: empleadoId,
          fecha: fechaLocal,
          hora_entrada: ahora.toTimeString().slice(0, 8),
          hora_salida: null,
          latitud_entrada: coords.lat,
          longitud_entrada: coords.lng,
          latitud_salida: null,
          longitud_salida: null,
          qr_code: qrCode || undefined,
          observaciones: '',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar la asistencia.');

      if (page === 1) await fetchData();
      else setPage(1);
      setShowRegistro(false);
      setShowQrScanner(false);
      setEmpleadoId('');
      setQrCode('');
      setCoords(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la asistencia.');
    } finally {
      setRegistrando(false);
    }
  };

  const employeeName = (id: string) => {
    const employee = empleados.find((item) => item.id === id);
    return employee ? `${employee.nombre} ${employee.apellido}`.trim() : 'Empleado no disponible';
  };
  const handleQrScan = useCallback((value: string) => {
    setQrCode(value);
    setShowQrScanner(false);
    setError('');
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Control de Asistencia</h1>

      {error && <div role="alert" className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {showRegistro && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold">Registrar entrada</h2>
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Empleado
              <select
                required
                value={empleadoId}
                onChange={(event) => setEmpleadoId(event.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="">Selecciona un empleado</option>
                {empleados.filter((employee) => employee.estado === 'activo').map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {employee.nombre} {employee.apellido}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm font-medium">
              <label htmlFor="attendance-qr-code">Código QR (opcional)</label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <input
                  id="attendance-qr-code"
                  type="text"
                  maxLength={MAX_ATTENDANCE_QR_LENGTH}
                  value={qrCode}
                  onChange={(event) => setQrCode(event.target.value)}
                  className="min-w-0 flex-1 rounded-md border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => setShowQrScanner((visible) => !visible)}
                  className="rounded-md border px-3 py-2"
                >
                  {showQrScanner ? 'Cerrar lector' : 'Escanear QR'}
                </button>
              </div>
              {showQrScanner && <QRScanner onScan={handleQrScan} />}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Ubicación GPS</p>
              {coords ? (
                <div className="rounded-md border border-green-200 bg-green-50 p-4">
                  <p className="text-sm">Latitud: {coords.lat.toFixed(6)}</p>
                  <p className="text-sm">Longitud: {coords.lng.toFixed(6)}</p>
                  <p className="mt-1 text-sm">Precisión estimada: ±{coords.accuracy.toFixed(1)} m</p>
                  <p className="text-xs text-gray-600">
                    Obtenida a las {new Date(coords.timestamp).toLocaleTimeString()}
                  </p>
                  <button
                    type="button"
                    onClick={obtenerGPS}
                    disabled={obteniendoGps}
                    className="mt-2 rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                  >
                    {obteniendoGps ? 'Actualizando ubicación...' : 'Actualizar ubicación'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={obtenerGPS}
                  disabled={obteniendoGps}
                  className="w-full rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {obteniendoGps ? 'Obteniendo ubicación GPS...' : 'Obtener ubicación GPS'}
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={registrarAsistencia}
                disabled={registrando || obteniendoGps || !coords || !empleadoId}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white disabled:bg-gray-400"
              >
                {registrando ? 'Registrando...' : 'Registrar entrada'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRegistro(false);
                  setShowQrScanner(false);
                }}
                className="rounded-lg border px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {!showRegistro && (
        <button
          onClick={() => {
            setShowRegistro(true);
            setShowQrScanner(false);
          }}
          disabled={!empleados.some((employee) => employee.estado === 'activo')}
          className="mb-6 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Registrar asistencia
        </button>
      )}
      {!loading && empleados.every((employee) => employee.estado !== 'activo') && (
        <p className="mb-6 text-sm text-gray-600">Crea un empleado activo antes de registrar asistencia.</p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium">
          Buscar empleado
          <input
            type="search"
            value={employeeSearch}
            onChange={(event) => {
              setEmployeeSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Nombre o apellido"
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Empleado
          <select
            value={employeeFilter}
            onChange={(event) => {
              setEmployeeFilter(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            <option value="">Todos los empleados</option>
            {empleados.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {employee.nombre} {employee.apellido}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Estado
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="completa">Completa</option>
            <option value="pendiente">Entrada registrada</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Desde
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Hasta
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
      </div>

      {loading ? (
        <div className="py-12 text-center">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Empleado</th>
                <th className="px-6 py-3 text-left">Fecha</th>
                <th className="px-6 py-3 text-left">Entrada</th>
                <th className="px-6 py-3 text-left">Salida</th>
                <th className="px-6 py-3 text-left">Ubicación</th>
                <th className="px-6 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {asistencias.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay registros con esos filtros</td></tr>
              ) : asistencias.map((asistencia) => (
                <tr key={asistencia.id} className="border-b">
                  <td className="px-6 py-4 text-sm">{employeeName(asistencia.empleado_id)}</td>
                  <td className="px-6 py-4 text-sm">{asistencia.fecha}</td>
                  <td className="px-6 py-4 text-sm">{asistencia.hora_entrada}</td>
                  <td className="px-6 py-4 text-sm">{asistencia.hora_salida || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    {asistencia.latitud_entrada != null && asistencia.longitud_entrada != null ? (
                      <a
                        href={`https://maps.google.com/?q=${asistencia.latitud_entrada},${asistencia.longitud_entrada}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Ver en mapa
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">{asistencia.hora_salida ? 'Completa' : 'Entrada registrada'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && (
        <div className="mt-4">
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            itemLabel="registros"
            disabled={loading}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
