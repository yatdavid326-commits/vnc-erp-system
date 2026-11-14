'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks';
import { useRouter } from 'next/navigation';


interface Asistencia {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  latitud: number;
  longitud: number;
  estado: string;
  created_at: string;
}

export default function AsistenciaPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegistro, setShowRegistro] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchAsistencias();
  }, [session, router]);

  const fetchAsistencias = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/asistencia');
      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setAsistencias(data);
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const obtenerGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setError('');
        },
        (err) => {
          setError('Error al obtener GPS: ' + err.message);
        }
      );
    } else {
      setError('Geolocalización no disponible');
    }
  };

  const registrarAsistencia = async () => {
    if (!coords) {
      setError('Debe obtener la ubicación GPS');
      return;
    }

    setRegistrando(true);
    try {
      const ahora = new Date();
      const formData = {
        empleado_id: 'EMP-' + Math.random().toString(36).substr(2, 9),
        fecha: ahora.toISOString().split('T')[0],
        hora_entrada: ahora.toTimeString().split(' ')[0],
        hora_salida: null,
        latitud: coords.lat,
        longitud: coords.lng,
        qr_code: qrCode || 'MANUAL',
        estado: 'entrada',
      };

      const response = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al registrar');

      await fetchAsistencias();
      setShowRegistro(false);
      setQrCode('');
      setCoords(null);
      setError('');
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setRegistrando(false);
    }
  };

  return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Control de Asistencia</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {showRegistro && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Registrar Asistencia</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Código QR</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escanear QR o ingresar código"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                    autoFocus
                  />
                  <button
                    onClick={() => setQrCode('QR-' + Math.random().toString(36).substr(2, 9))}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg"
                  >
                    Simular QR
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ubicación GPS</label>
                {coords ? (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                    <p className="text-sm">Latitud: {coords.lat.toFixed(6)}</p>
                    <p className="text-sm">Longitud: {coords.lng.toFixed(6)}</p>
                    <button
                      onClick={obtenerGPS}
                      className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Actualizar ubicación
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={obtenerGPS}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
                  >
                    📍 Obtener Ubicación GPS
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={registrarAsistencia}
                  disabled={registrando || !coords}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                >
                  {registrando ? 'Registrando...' : 'Registrar Entrada'}
                </button>
                <button
                  onClick={() => setShowRegistro(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {!showRegistro && (
          <button
            onClick={() => setShowRegistro(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-6"
          >
            Registrar Asistencia
          </button>
        )}

        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100"><tr><th className="px-6 py-3 text-left">Empleado</th><th className="px-6 py-3 text-left">Fecha</th><th className="px-6 py-3 text-left">Entrada</th><th className="px-6 py-3 text-left">Salida</th><th className="px-6 py-3 text-left">Ubicación</th><th className="px-6 py-3 text-left">Estado</th></tr></thead>
              <tbody>
                {asistencias.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay registros</td></tr>
                ) : (
                  asistencias.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="px-6 py-4 text-sm">{a.empleado_id}</td>
                      <td className="px-6 py-4 text-sm">{a.fecha}</td>
                      <td className="px-6 py-4 text-sm">{a.hora_entrada}</td>
                      <td className="px-6 py-4 text-sm">{a.hora_salida || '-'}</td>
                      <td className="px-6 py-4 text-sm text-xs">
                        <a
                          href={`https://maps.google.com/?q=${a.latitud},${a.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          📍 Ver en mapa
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="bg-green-100 px-2 py-1 rounded text-xs">{a.estado}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
}



