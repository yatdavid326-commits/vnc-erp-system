'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { fetchJson } from '@/lib/utils/fetchJson';
import PaginationControls from '@/components/common/PaginationControls';
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/pagination';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

interface Movimiento {
  id: string;
  tipo: string;
  concepto: string;
  monto: number;
  referencia: string;
  fecha: string;
  created_at: string;
}

interface CashMovementPage {
  data: Movimiento[];
  total: number;
  incomeTotal: number;
  expenseTotal: number;
}

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'ingreso',
    concepto: '',
    monto: 0,
    referencia: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter) params.set('tipo', typeFilter);
      if (dateFrom) params.set('desde', dateFrom);
      if (dateTo) params.set('hasta', dateTo);
      const result = await fetchJson<CashMovementPage>(`/api/caja?${params}`, 'Error');
      setMovimientos(result.data);
      setTotal(result.total);
      setIncomeTotal(result.incomeTotal);
      setExpenseTotal(result.expenseTotal);
      setError('');
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, search, typeFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchMovimientos(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchMovimientos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar el movimiento.');
      if (page === 1) await fetchMovimientos();
      else setPage(1);
      setShowForm(false);
      setFormData({
        tipo: 'ingreso',
        concepto: '',
        monto: 0,
        referencia: '',
        fecha: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento.');
    }
  };

  const saldo = incomeTotal - expenseTotal;

  return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Gestión de Caja</h1>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <p className="text-sm text-green-600 font-semibold">Ingresos</p>
            <p className="text-2xl font-bold text-green-700">${incomeTotal.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <p className="text-sm text-red-600 font-semibold">Egresos</p>
            <p className="text-2xl font-bold text-red-700">${expenseTotal.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <p className="text-sm text-blue-600 font-semibold">Saldo</p>
            <p className="text-2xl font-bold text-blue-700">${saldo.toFixed(2)}</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Nuevo Movimiento</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} className="px-3 py-2 border rounded-md">
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
              <input
                type="text"
                placeholder="Concepto"
                required
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Monto"
                step="0.01"
                required
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input type="date" required value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="px-3 py-2 border rounded-md col-span-2" />
              <button type="submit" className="col-span-2 bg-green-600 text-white px-4 py-2 rounded-lg">
                Registrar
              </button>
            </form>
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-6">
            Nuevo Movimiento
          </button>
        )}

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">
            Buscar movimientos
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Concepto o referencia"
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Tipo
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border px-3 py-2"
            >
              <option value="">Todos los tipos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
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
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100"><tr><th className="px-6 py-3 text-left">Tipo</th><th className="px-6 py-3 text-left">Concepto</th><th className="px-6 py-3 text-left">Monto</th><th className="px-6 py-3 text-left">Referencia</th><th className="px-6 py-3 text-left">Fecha</th></tr></thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay movimientos con esos filtros</td></tr>
                ) : (
                  movimientos.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{m.concepto}</td>
                      <td className="px-6 py-4 text-sm font-semibold">${m.monto.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">{m.referencia}</td>
                      <td className="px-6 py-4 text-sm">{m.fecha}</td>
                    </tr>
                  ))
                )}
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
              itemLabel="movimientos"
              disabled={loading}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    );
}



