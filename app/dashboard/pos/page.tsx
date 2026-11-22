'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

interface Venta {
  id: string;
  numero_transaccion: string;
  cliente_id: string | null;
  monto_total: number | string;
  metodo_pago: string;
  estado: string;
  created_at: string;
}

interface ProductoPOS {
  inventory_id: string;
  product_id: string;
  product_code: string;
  name: string;
  selling_price: number;
  available_quantity: number;
}

interface CajaAbierta {
  id: string;
  opening_balance: number | string;
  opened_at: string;
  status: string;
}

interface CarritoItem extends ProductoPOS {
  quantity: number;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : 'No se pudo completar la solicitud.';
    throw new Error(message);
  }
  return payload as T;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  return readJson<T>(await fetch(url, init));
}

function moneda(value: number | string) {
  return `$${Number(value).toFixed(2)}`;
}

export default function POSPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<ProductoPOS[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [caja, setCaja] = useState<CajaAbierta | null>(null);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatus, setSalesStatus] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'cheque'>(
    'efectivo'
  );
  const [efectivoRecibido, setEfectivoRecibido] = useState('0');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [saldoFinal, setSaldoFinal] = useState('0');
  const [paginaCatalogo, setPaginaCatalogo] = useState(1);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [savingRegister, setSavingRegister] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargarVentas = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: '1', limit: '10' });
    if (salesSearch.trim()) params.set('search', salesSearch.trim());
    if (salesStatus) params.set('status', salesStatus);
    const response = await fetch(`/api/pos?${params}`, signal ? { signal } : undefined);
    setVentas(await readJson<Venta[]>(response));
  }, [salesSearch, salesStatus]);

  const cargarCaja = useCallback(async () => {
    const register = await requestJson<CajaAbierta | null>('/api/pos/register');
    setCaja(register);
    if (register) setSaldoFinal(String(register.opening_balance));
  }, []);

  const cargarResumen = useCallback(async () => {
    await Promise.all([cargarVentas(), cargarCaja()]);
  }, [cargarCaja, cargarVentas]);

  const cargarCatalogo = useCallback(
    async (page: number, search: string, append: boolean) => {
      setCatalogLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: '100',
          search,
        });
        const response = await fetch(`/api/pos/catalog?${query}`);
        const data = await readJson<ProductoPOS[]>(response);
        const count = Number(response.headers.get('X-Total-Count') ?? 0);
        setProductos((current) => (append ? [...current, ...data] : data));
        setTotalProductos(count);
        setPaginaCatalogo(page);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error de catálogo.');
      } finally {
        setCatalogLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    requestJson<CajaAbierta | null>('/api/pos/register')
      .then((register) => {
        if (active) {
          setCaja(register);
          if (register) setSaldoFinal(String(register.opening_balance));
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Error al cargar la caja.');
        }
      })
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      cargarVentas(controller.signal)
        .catch((loadError: unknown) => {
          if (!controller.signal.aborted) {
            setError(loadError instanceof Error ? loadError.message : 'Error al cargar ventas.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cargarVentas]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void cargarCatalogo(1, busqueda, false);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [busqueda, cargarCatalogo]);

  const total = carrito.reduce(
    (sum, item) => sum + item.selling_price * item.quantity,
    0
  );
  const recibido = Number(efectivoRecibido);

  const agregarProducto = (producto: ProductoPOS) => {
    if (producto.available_quantity < 1) return;
    setCarrito((current) => {
      const existing = current.find(
        (item) => item.inventory_id === producto.inventory_id
      );
      if (existing) {
        return current.map((item) =>
          item.inventory_id === producto.inventory_id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  producto.available_quantity
                ),
              }
            : item
        );
      }
      return [...current, { ...producto, quantity: 1 }];
    });
  };

  const actualizarCantidad = (inventoryId: string, quantity: number) => {
    setCarrito((current) =>
      current.map((item) =>
        item.inventory_id === inventoryId
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(quantity, item.available_quantity)
              ),
            }
          : item
      )
    );
  };

  const abrirCaja = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingRegister(true);
    try {
      const register = await requestJson<CajaAbierta>('/api/pos/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opening_balance: Number(saldoInicial) }),
      });
      setCaja(register);
      setSaldoFinal(String(register.opening_balance));
      setSuccess('Caja abierta correctamente.');
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'No se pudo abrir la caja.');
    } finally {
      setSavingRegister(false);
    }
  };

  const cerrarCaja = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingRegister(true);
    try {
      await requestJson<CajaAbierta>('/api/pos/register', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closing_balance: Number(saldoFinal) }),
      });
      setCaja(null);
      setSuccess('Caja cerrada correctamente.');
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'No se pudo cerrar la caja.');
    } finally {
      setSavingRegister(false);
    }
  };

  const procesarVenta = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!caja) {
      setError('Abre una caja antes de procesar ventas.');
      return;
    }
    if (carrito.length === 0) {
      setError('Agrega al menos un producto al carrito.');
      return;
    }
    if (
      metodoPago === 'efectivo' &&
      (!Number.isFinite(recibido) || recibido < total)
    ) {
      setError('El efectivo recibido debe cubrir el total de la venta.');
      return;
    }

    setSavingSale(true);
    let sale: Venta;
    try {
      sale = await requestJson<Venta>('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: clienteId.trim() || null,
          payment_method: metodoPago,
          amount_paid: metodoPago === 'efectivo' ? recibido : 0,
          items: carrito.map((item) => ({
            inventory_id: item.inventory_id,
            quantity: item.quantity,
          })),
        }),
      });
    } catch (saleError) {
      setError(
        saleError instanceof Error
          ? saleError.message
          : 'No se pudo procesar la venta.'
      );
      setSavingSale(false);
      return;
    }

    setCarrito([]);
    setClienteId('');
    setEfectivoRecibido('0');
    setSuccess(`Venta ${sale.numero_transaccion} registrada correctamente.`);
    try {
      await Promise.all([
        cargarResumen(),
        cargarCatalogo(1, busqueda, false),
      ]);
    } catch (refreshError) {
      setError(
        `La venta se registró, pero no se pudo actualizar la pantalla: ${
          refreshError instanceof Error
            ? refreshError.message
            : 'Error de actualización.'
        }`
      );
    } finally {
      setSavingSale(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Punto de Venta</h1>
        <p className="mt-1 text-gray-600">
          Las existencias y los precios se verifican al confirmar cada venta.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {success}
        </div>
      )}

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Caja</h2>
        {caja ? (
          <div className="flex flex-wrap items-end gap-4">
            <div className="mr-auto">
              <p className="font-medium text-green-700">Caja abierta</p>
              <p className="text-sm text-gray-600">
                Apertura: {new Date(caja.opened_at).toLocaleString()} · Saldo inicial:{' '}
                {moneda(caja.opening_balance)}
              </p>
            </div>
            <form onSubmit={cerrarCaja} className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                Efectivo contado al cierre
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={saldoFinal}
                  onChange={(event) => setSaldoFinal(event.target.value)}
                  className="mt-1 block rounded border px-3 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={savingRegister}
                className="rounded bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
              >
                Cerrar caja
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={abrirCaja} className="flex flex-wrap items-end gap-3">
            <div className="mr-auto">
              <p className="font-medium text-amber-700">No hay una caja abierta</p>
              <p className="text-sm text-gray-600">
                Es necesario abrir caja para registrar ventas.
              </p>
            </div>
            <label className="text-sm">
              Saldo inicial
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={saldoInicial}
                onChange={(event) => setSaldoInicial(event.target.value)}
                className="mt-1 block rounded border px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={savingRegister}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              Abrir caja
            </button>
          </form>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-lg bg-white p-5 shadow lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Catálogo</h2>
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o código"
              className="w-full rounded border px-3 py-2 sm:w-72"
            />
          </div>

          {catalogLoading ? (
            <p className="py-8 text-center text-gray-500">Cargando catálogo...</p>
          ) : productos.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No hay productos activos con registros de inventario.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {productos.map((producto) => (
                <article
                  key={producto.inventory_id}
                  className="rounded border p-4"
                >
                  <p className="text-xs text-gray-500">{producto.product_code}</p>
                  <h3 className="mt-1 font-medium">{producto.name}</h3>
                  <p className="mt-2 font-semibold">
                    {moneda(producto.selling_price)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Disponibles: {producto.available_quantity}
                  </p>
                  <button
                    type="button"
                    onClick={() => agregarProducto(producto)}
                    disabled={producto.available_quantity < 1 || !caja}
                    className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </article>
              ))}
            </div>
          )}

          {!catalogLoading && productos.length < totalProductos && (
            <button
              type="button"
              onClick={() =>
                void cargarCatalogo(paginaCatalogo + 1, busqueda, true)
              }
              className="rounded border px-4 py-2"
            >
              Cargar más productos
            </button>
          )}
        </section>

        <section className="h-fit rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Venta actual</h2>
          <form onSubmit={procesarVenta} className="space-y-4">
            <label className="block text-sm">
              ID de cliente (opcional)
              <input
                type="text"
                value={clienteId}
                onChange={(event) => setClienteId(event.target.value)}
                placeholder="UUID del cliente"
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>

            {carrito.length === 0 ? (
              <p className="rounded bg-gray-50 p-4 text-center text-gray-500">
                El carrito está vacío.
              </p>
            ) : (
              <ul className="divide-y">
                {carrito.map((item) => (
                  <li
                    key={item.inventory_id}
                    className="flex items-center gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        {moneda(item.selling_price)} c/u
                      </p>
                    </div>
                    <input
                      aria-label={`Cantidad de ${item.name}`}
                      type="number"
                      min="1"
                      max={item.available_quantity}
                      value={item.quantity}
                      onChange={(event) =>
                        actualizarCantidad(
                          item.inventory_id,
                          Number(event.target.value)
                        )
                      }
                      className="w-16 rounded border px-2 py-1"
                    />
                    <button
                      type="button"
                      aria-label={`Quitar ${item.name}`}
                      onClick={() =>
                        setCarrito((current) =>
                          current.filter(
                            (currentItem) =>
                              currentItem.inventory_id !== item.inventory_id
                          )
                        )
                      }
                      className="px-2 text-red-600"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Total estimado</span>
              <span>{moneda(total)}</span>
            </div>

            <label className="block text-sm">
              Método de pago
              <select
                value={metodoPago}
                onChange={(event) =>
                  setMetodoPago(event.target.value as typeof metodoPago)
                }
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </label>

            {metodoPago === 'efectivo' && (
              <>
                <label className="block text-sm">
                  Efectivo recibido
                  <input
                    type="number"
                    min={total}
                    step="0.01"
                    required
                    value={efectivoRecibido}
                    onChange={(event) =>
                      setEfectivoRecibido(event.target.value)
                    }
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </label>
                <p className="flex justify-between text-sm">
                  <span>Cambio estimado</span>
                  <span>{moneda(Math.max(0, recibido - total))}</span>
                </p>
              </>
            )}

            <p className="text-xs text-gray-500">
              Solo las ventas en efectivo registran un movimiento en caja. El
              precio y la existencia se vuelven a validar al confirmar.
            </p>
            <button
              type="submit"
              disabled={!caja || carrito.length === 0 || savingSale}
              className="w-full rounded bg-green-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingSale ? 'Procesando...' : 'Procesar venta'}
            </button>
          </form>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg bg-white shadow">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold">Ventas recientes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Buscar transacciones
              <input
                type="search"
                value={salesSearch}
                onChange={(event) => setSalesSearch(event.target.value)}
                placeholder="Número o método de pago"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Estado
              <select
                value={salesStatus}
                onChange={(event) => setSalesStatus(event.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="">Todos los estados</option>
                <option value="completada">Completada</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-gray-500">Cargando ventas...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-5 py-3">Transacción</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Pago</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ventas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-gray-500">
                      No hay ventas registradas.
                    </td>
                  </tr>
                ) : (
                  ventas.map((venta) => (
                    <tr key={venta.id} className="border-t">
                      <td className="px-5 py-3">{venta.numero_transaccion}</td>
                      <td className="px-5 py-3">
                        {venta.cliente_id ?? 'Público general'}
                      </td>
                      <td className="px-5 py-3">{moneda(venta.monto_total)}</td>
                      <td className="px-5 py-3">{venta.metodo_pago}</td>
                      <td className="px-5 py-3">{venta.estado}</td>
                      <td className="px-5 py-3">
                        {new Date(venta.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
