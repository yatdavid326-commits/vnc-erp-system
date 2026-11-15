'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useModuleStore } from '@/hooks';
import { supabase } from '@/lib/db/supabase';
import type { PurchaseInput, PartialReceiptInput } from '@/lib/purchases';

type Option = { id: string; name: string };
type Item = { product: Option; quantity: string; unitPrice: string };
type Order = {
  id: string; po_number: string; order_date: string; actual_delivery_date: string | null; status: string | null;
  total_amount: number; notes: string | null; supplier: Option | null;
  items: { id: string; quantity_ordered: number; quantity_received: number | null; unit_price: number; line_total: number;
    product: { name: string; product_code: string } | null }[];
};

async function request<T>(path: string, method = 'GET', body?: PurchaseInput | PartialReceiptInput): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Error al consultar compras (${response.status}).`);
  return result;
}

export default function ComprasPage() {
  const access = useModuleStore((state) => state.userModules.find(
    (item) => item.module?.name === 'purchases' && item.module.is_active && item.can_view
  ));
  const inventoryAccess = useModuleStore((state) => state.userModules.find(
    (item) => item.module?.name === 'inventory' && item.module.is_active && item.can_view && item.can_edit
  ));
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [number, setNumber] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [receiptDates, setReceiptDates] = useState<Record<string, string>>({});
  const [receiptIds, setReceiptIds] = useState<Record<string, string>>({});
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    request<{ data: Order[]; count: number }>(`/api/compras?page=${page}`).then((result) => {
      if (active) { setOrders(result.data); setCount(result.count); }
    }).catch((err) => {
      if (active) { setOrders([]); setError(err instanceof Error ? err.message : 'No se pudieron cargar las órdenes.'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision]);

  async function searchOptions(kind: 'suppliers' | 'products') {
    setError('');
    try {
      const search = kind === 'suppliers' ? supplierSearch : productSearch;
      const result = await request<{ data: Option[] }>(`/api/compras/opciones?${new URLSearchParams({ kind, search })}`);
      if (kind === 'suppliers') { setSuppliers(result.data); setSupplierId(''); }
      else { setProducts(result.data); setProductId(''); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las opciones.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) { setError('Agrega al menos un producto.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      await request('/api/compras', 'POST', {
        id: requestId, number, supplier_id: supplierId, order_date: date, notes,
        items: items.map((item) => ({ product_id: item.product.id, quantity: Number(item.quantity), unit_price: Number(item.unitPrice) })),
      });
      setRequestId(crypto.randomUUID()); setShowForm(false); setNumber(''); setDate(''); setNotes('');
      setItems([]); setSupplierId(''); setProductId(''); setSuppliers([]); setProducts([]);
      setNotice('Orden registrada como pendiente. No se modificaron las existencias.');
      setLoading(true); setPage(1); setRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof TypeError ? 'No se pudo confirmar la orden. Revisa la lista antes de reintentar.' :
        err instanceof Error ? err.message : 'No se pudo confirmar la orden. Revisa la lista antes de reintentar.');
    } finally { setSaving(false); }
  }

  async function receive(order: Order) {
    const date = receiptDates[order.id];
    if (!date) { setError('Selecciona la fecha de recepción.'); return; }
    const lines: PartialReceiptInput['items'] = [];
    for (const item of order.items) {
      const raw = receiptQuantities[item.id] ?? '';
      if (raw === '') continue;
      const quantity = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(quantity) || item.quantity_received === null ||
        quantity > item.quantity_ordered - item.quantity_received) {
        setError('Revisa las cantidades: no pueden superar lo pendiente.'); return;
      }
      if (quantity > 0) lines.push({ item_id: item.id, quantity });
    }
    if (!lines.length) { setError('Indica al menos una cantidad recibida.'); return; }
    if (!window.confirm(`¿Registrar las cantidades indicadas para la orden ${order.po_number}? Esto aumentará las existencias y no puede deshacerse desde Compras.`)) return;
    const id = receiptIds[order.id] ?? crypto.randomUUID();
    setReceiptIds((current) => ({ ...current, [order.id]: id }));
    setSaving(true); setError(''); setNotice('');
    try {
      await request(`/api/compras/${order.id}/recepcion-parcial`, 'POST', { id, date, items: lines });
      setReceiptIds((current) => {
        const next = { ...current }; delete next[order.id]; return next;
      });
      setReceiptQuantities((current) => {
        const next = { ...current }; order.items.forEach((item) => { delete next[item.id]; }); return next;
      });
      setNotice('Recepción registrada. Las existencias y el historial de inventario se actualizaron.');
      setLoading(true); setRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof TypeError ? 'No se pudo confirmar la recepción. Revisa la orden antes de reintentar.' :
        err instanceof Error ? err.message : 'No se pudo confirmar la recepción. Revisa la orden antes de reintentar.');
    } finally { setSaving(false); }
  }

  const input = 'mt-1 w-full rounded border border-gray-300 px-3 py-2';
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold text-gray-900">Compras</h1>
      {access?.can_create && <button className="rounded bg-blue-600 px-4 py-2 text-white" disabled={saving}
        onClick={() => { setShowForm(true); setError(''); setNotice(''); }}>Nueva orden</button>}
    </div>
    <p className="text-sm text-gray-700">Crear una orden no modifica existencias. Puedes recibir las cantidades que llegaron; inicializa primero las existencias de esos productos en Inventario.</p>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{notice}</p>}
    {showForm && <form onSubmit={submit} className="space-y-4 rounded bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Nueva orden de compra</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label>Número de orden<input className={input} required maxLength={80} value={number} onChange={(e) => setNumber(e.target.value)} /></label>
        <label>Fecha de orden<input className={input} required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Buscar proveedor<input className={input} maxLength={100} value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} /></label>
        <div className="self-end"><button type="button" className="rounded border px-3 py-2" onClick={() => void searchOptions('suppliers')}>Buscar proveedores</button></div>
        <label>Proveedor<select className={input} required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Selecciona un proveedor</option>{suppliers.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}
        </select></label>
        <label>Notas<input className={input} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <label>Buscar producto<input className={input} maxLength={100} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></label>
        <div className="self-end"><button type="button" className="rounded border px-3 py-2" onClick={() => void searchOptions('products')}>Buscar productos</button></div>
        <label>Producto<select className={input} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Selecciona un producto</option>{products.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
        </select></label>
        <div className="self-end"><button type="button" className="rounded border px-3 py-2" onClick={() => {
          const product = products.find((p) => p.id === productId);
          if (!product) { setError('Selecciona un producto.'); return; }
          if (items.some((item) => item.product.id === product.id)) { setError('El producto ya está en la orden.'); return; }
          if (items.length >= 100) { setError('La orden admite hasta 100 productos.'); return; }
          setItems([...items, { product, quantity: '1', unitPrice: '' }]); setError('');
        }}>Agregar producto</button></div>
      </div>
      {items.map((item, index) => <div key={item.product.id} className="grid gap-3 rounded border p-3 md:grid-cols-4">
        <p className="self-center">{item.product.name}</p>
        <label>Cantidad de {item.product.name}<input className={input} type="number" min="1" max="2147483647" step="1" required
          value={item.quantity} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} /></label>
        <label>Precio unitario de {item.product.name}<input className={input} type="number" min="0" max="9999999999.99" step="0.01" required
          value={item.unitPrice} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, unitPrice: e.target.value } : row))} /></label>
        <button type="button" className="self-end rounded border px-3 py-2" onClick={() => setItems(items.filter((_, i) => i !== index))}>Quitar {item.product.name}</button>
      </div>)}
      <div className="flex gap-3">
        <button className="rounded bg-blue-600 px-4 py-2 text-white" disabled={saving} type="submit">{saving ? 'Guardando...' : 'Guardar orden'}</button>
        <button className="rounded border px-4 py-2" disabled={saving} type="button" onClick={() => setShowForm(false)}>Cerrar formulario</button>
      </div>
    </form>}
    {loading ? <p>Cargando órdenes...</p> : orders.length === 0 ? <p>{error ? 'No se pudo mostrar la lista.' : 'No hay órdenes de compra.'}</p> :
      <div className="space-y-3">{orders.map((order) => <section key={order.id} className="rounded bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Orden {order.po_number}</h2>
        <p>Proveedor: {order.supplier?.name ?? 'No disponible'} · Fecha: {order.order_date} · Estado: {order.status === 'pending' ? 'Pendiente' : order.status === 'partially_received' ? 'Parcialmente recibida' : order.status === 'received' ? 'Recibida' : order.status ?? 'Sin estado'} · Total: {Number(order.total_amount).toFixed(2)}</p>
        {order.actual_delivery_date && <p>Fecha de recepción: {order.actual_delivery_date}</p>}
        {order.notes && <p>Notas: {order.notes}</p>}
        <table className="w-full text-left text-sm"><thead><tr>{['Producto', 'Cantidad', 'Recibida', 'Precio unitario', 'Total'].map((h) => <th className="p-2" key={h}>{h}</th>)}
          {(order.status === 'pending' || order.status === 'partially_received') && access?.can_edit && inventoryAccess && <th className="p-2">Recibir ahora</th>}</tr></thead>
          <tbody>{order.items.map((row) => <tr key={row.id} className="border-t"><td className="p-2">{row.product ? `${row.product.product_code} - ${row.product.name}` : 'No disponible'}</td>
            <td className="p-2">{row.quantity_ordered}</td><td className="p-2">{row.quantity_received ?? '—'}</td><td className="p-2">{Number(row.unit_price).toFixed(2)}</td><td className="p-2">{Number(row.line_total).toFixed(2)}</td>
            {(order.status === 'pending' || order.status === 'partially_received') && access?.can_edit && inventoryAccess && <td className="p-2">
              <input aria-label={`Recibir ${row.product?.product_code ?? row.id} en ${order.po_number}`} className={input}
                type="number" min="0" max={row.quantity_received === null ? 0 : row.quantity_ordered - row.quantity_received}
                step="1" disabled={saving || row.quantity_received === null || row.quantity_received >= row.quantity_ordered}
                value={receiptQuantities[row.id] ?? ''} onChange={(e) => setReceiptQuantities({ ...receiptQuantities, [row.id]: e.target.value })} />
            </td>}
          </tr>)}</tbody>
        </table>
        {(order.status === 'pending' || order.status === 'partially_received') && access?.can_edit && inventoryAccess &&
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label>Fecha de recepción de {order.po_number}<input className={input} type="date" disabled={saving}
              value={receiptDates[order.id] ?? ''} onChange={(e) => setReceiptDates({ ...receiptDates, [order.id]: e.target.value })} /></label>
            <button type="button" className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40" disabled={saving}
              onClick={() => void receive(order)}>Registrar recepción</button>
          </div>}
        {(order.status === 'pending' || order.status === 'partially_received') && access?.can_edit && !inventoryAccess &&
          <p className="mt-3 text-sm text-gray-700">Para recibir la orden necesitas permiso de edición en Inventario.</p>}
      </section>)}</div>}
    <div className="flex items-center gap-4">
      <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page === 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Anterior</button>
      <span>Página {page} · {count} órdenes</span>
      <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page * 25 >= count} onClick={() => { setLoading(true); setPage(page + 1); }}>Siguiente</button>
    </div>
  </div>;
}
