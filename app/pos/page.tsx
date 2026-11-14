'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Venta {
  id: string;
  numero_venta: string;
  cliente_id: string;
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  estado: string;
  created_at: string;
}

export default function POSPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    numero_venta: '',
    cliente_id: '',
    metodo_pago: 'efectivo',
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchVentas();
  }, [session, router]);

  const fetchVentas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pos');
      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setVentas(data);
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
      const descuento = 0;
      const total = subtotal - descuento;

      const venta = {
        ...formData,
        numero_venta: `V-${Date.now()}`,
        subtotal,
        descuento,
        total,
      };

      const response = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venta),
      });

      if (!response.ok) throw new Error('Error');
      await fetchVentas();
      setCarrito([]);
      setShowForm(false);
      setFormData({ numero_venta: '', cliente_id: '', metodo_pago: 'efectivo' });
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const agregarAlCarrito = () => {
    setCarrito([...carrito, { id: Date.now(), nombre: 'Producto', cantidad: 1, precio: 0 }]);
  };

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <h1 className="text-3xl font-bold mb-6">Punto de Venta</h1>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

            {showForm && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Nueva Venta</h2>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Cliente ID" value={formData.cliente_id} onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })} className="px-3 py-2 border rounded-md" />
                  <select value={formData.metodo_pago} onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })} className="px-3 py-2 border rounded-md">
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <h3 className="text-lg font-semibold mb-4">Carrito</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {carrito.length === 0 ? (
                    <p className="text-gray-500">Carrito vacío</p>
                  ) : (
                    carrito.map((item, idx) => (
                      <div key={item.id} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Producto"
                          value={item.nombre}
                          onChange={(e) => {
                            const newCarrito = [...carrito];
                            newCarrito[idx].nombre = e.target.value;
                            setCarrito(newCarrito);
                          }}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => {
                            const newCarrito = [...carrito];
                            newCarrito[idx].cantidad = parseInt(e.target.value);
                            setCarrito(newCarrito);
                          }}
                          className="w-16 px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Precio"
                          step="0.01"
                          value={item.precio}
                          onChange={(e) => {
                            const newCarrito = [...carrito];
                            newCarrito[idx].precio = parseFloat(e.target.value);
                            setCarrito(newCarrito);
                          }}
                          className="w-24 px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={agregarAlCarrito}
                  className="bg-gray-600 text-white px-3 py-2 rounded mb-4 text-sm"
                >
                  + Agregar Artículo
                </button>

                <form onSubmit={handleSubmit}>
                  <button type="submit" className="w-full bg-green-600 text-white px-4 py-2 rounded-lg">
                    Procesar Venta
                  </button>
                </form>
              </div>
            )}

            {!showForm && (
              <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-6">
                Nueva Venta
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-bold mb-4">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calcularTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Descuento:</span>
                <span>$0.00</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span>${calcularTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 mt-6">Cargando...</div>
        ) : (
          <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100"><tr><th className="px-6 py-3 text-left"># Venta</th><th className="px-6 py-3 text-left">Cliente</th><th className="px-6 py-3 text-left">Total</th><th className="px-6 py-3 text-left">Pago</th><th className="px-6 py-3 text-left">Estado</th></tr></thead>
              <tbody>
                {ventas.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay ventas</td></tr>
                ) : (
                  ventas.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="px-6 py-4 text-sm">{v.numero_venta}</td>
                      <td className="px-6 py-4 text-sm">{v.cliente_id}</td>
                      <td className="px-6 py-4 text-sm">${v.total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">{v.metodo_pago}</td>
                      <td className="px-6 py-4 text-sm"><span className="bg-green-100 px-2 py-1 rounded text-xs">{v.estado}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
