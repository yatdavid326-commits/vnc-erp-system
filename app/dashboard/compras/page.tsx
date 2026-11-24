'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PaginationControls from '@/components/common/PaginationControls';
import { useToast } from '@/components/notifications/ToastProvider';
import { useAuthStore, useModuleStore } from '@/hooks';
import { purchaseStatusLabel, type PurchaseInput, type PurchaseReceiptInput, type PurchaseDetailsInput } from '@/lib/purchases';
import { fetchJson, fetchPaginatedJson } from '@/lib/utils/fetchJson';
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/pagination';

type Option = { id: string; name: string };
type ItemDraft = { product: Option; quantity: string; unitPrice: string };
type Order = {
  id: string; numero_po: string; proveedor_id: string; fecha_orden: string;
  fecha_recepcion: string | null; estado: string | null; monto_total: number;
  notes: string | null; edit_version: number; supplier: Option | null;
  items: { id: string; quantity_ordered: number; quantity_received: number | null;
    unit_price: number; line_total: number; product: { id: string; name: string; product_code: string } | null }[];
};

const today = () => new Date().toISOString().slice(0, 10);
const inputClass = 'mt-1 w-full rounded-md border px-3 py-2';
const buttonClass = 'rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50';

async function write<T>(url: string, method: string, body?: PurchaseInput | PurchaseReceiptInput | PurchaseDetailsInput) {
  return fetchJson<T>(url, 'No se pudo completar la operación. Revisa la orden antes de reintentar.', {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export default function ComprasPage() {
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const modules = useModuleStore((state) => state.userModules);
  const admin = user?.role === 'admin';
  const purchaseAccess = modules.find((row) => row.module?.name === 'purchases' && row.module.is_active);
  const inventoryAccess = modules.find((row) => row.module?.name === 'inventory' && row.module.is_active);
  const canCreate = admin || purchaseAccess?.can_create === true;
  const canEdit = admin || purchaseAccess?.can_edit === true;
  const canReceive = canEdit && (admin || inventoryAccess?.can_edit === true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [createAttempted, setCreateAttempted] = useState(false);
  const [number, setNumber] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('0');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [receiptDates, setReceiptDates] = useState<Record<string, string>>({});
  const [receiptIds, setReceiptIds] = useState<Record<string, string>>({});
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ orderId: string; date: string; notes: string; version: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(DEFAULT_PAGE_SIZE) });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (supplierFilter) params.set('proveedor_id', supplierFilter);
      const result = await fetchPaginatedJson<Order>(`/api/compras?${params}`, 'No se pudieron cargar las compras.');
      setTotal(result.total);
      const lastPage = Math.max(1, Math.ceil(result.total / DEFAULT_PAGE_SIZE));
      if (page > lastPage) { setPage(lastPage); return; }
      setOrders(result.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las compras.');
    } finally { setLoading(false); }
  }, [page, search, status, supplierFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function searchOptions(kind: 'suppliers' | 'products') {
    try {
      const value = kind === 'suppliers' ? supplierSearch : productSearch;
      const params = new URLSearchParams({ kind, search: value });
      const result = await fetchJson<{ data: Option[] }>(`/api/compras/opciones?${params}`, 'No se pudieron cargar las opciones.');
      if (kind === 'suppliers') { setSuppliers(result.data); setSupplierId(''); }
      else { setProducts(result.data); setProductId(''); }
    } catch (err) { showToast(err instanceof Error ? err.message : 'No se pudieron cargar las opciones.', 'error'); }
  }

  function addItem() {
    const product = products.find((entry) => entry.id === productId);
    if (!product || !/^[1-9]\d*$/.test(quantity) || !Number.isSafeInteger(Number(quantity))
      || Number(quantity) > 2147483647 || !/^\d+(?:\.\d{1,2})?$/.test(price)) {
      showToast('Selecciona un producto e indica una cantidad entera y un precio válido.', 'error'); return;
    }
    if (items.some((item) => item.product.id === product.id)) {
      showToast('El producto ya está en la orden.', 'error'); return;
    }
    setItems((current) => [...current, { product, quantity, unitPrice: price }]);
    setProductId(''); setQuantity('1'); setPrice('0');
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) { showToast('Agrega al menos un producto.', 'error'); return; }
    setCreateAttempted(true);
    setSaving(true);
    try {
      await write('/api/compras', 'POST', {
        id: requestId, numero_po: number, proveedor_id: supplierId, fecha_orden: date, notes,
        items: items.map((item) => ({ product_id: item.product.id, quantity: Number(item.quantity), unit_price: Number(item.unitPrice) })),
      });
      setRequestId(crypto.randomUUID()); setCreateAttempted(false); setNumber(''); setDate(today()); setNotes(''); setItems([]);
      setSupplierId(''); setShowForm(false); showToast('Orden pendiente creada; las existencias no cambiaron.', 'success');
      if (page === 1) await load(); else setPage(1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo confirmar la orden.', 'error');
    } finally { setSaving(false); }
  }

  async function receive(order: Order) {
    const dateValue = receiptDates[order.id];
    if (!dateValue) { showToast('Selecciona la fecha de recepción.', 'error'); return; }
    const selected: PurchaseReceiptInput['items'] = [];
    for (const item of order.items) {
      const raw = receiptQuantities[item.id] ?? '';
      if (!raw || raw === '0') continue;
      const value = Number(raw);
      if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(value) || item.quantity_received === null
        || value > item.quantity_ordered - item.quantity_received) {
        showToast('La cantidad debe ser entera y no superar lo pendiente.', 'error'); return;
      }
      selected.push({ item_id: item.id, quantity: value });
    }
    if (!selected.length) { showToast('Indica al menos una cantidad recibida.', 'error'); return; }
    if (!confirm(`¿Registrar la recepción de ${order.numero_po}? Esto aumentará el inventario.`)) return;
    const id = receiptIds[order.id] ?? crypto.randomUUID();
    setReceiptIds((current) => ({ ...current, [order.id]: id }));
    setSaving(true);
    try {
      await write(`/api/compras/${order.id}/recepcion-parcial`, 'POST', { id, date: dateValue, items: selected });
      setReceiptIds((current) => { const next = { ...current }; delete next[order.id]; return next; });
      setReceiptQuantities((current) => { const next = { ...current }; order.items.forEach((item) => delete next[item.id]); return next; });
      showToast('Recepción registrada y existencias actualizadas.', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo confirmar la recepción.', 'error');
    } finally { setSaving(false); }
  }

  async function cancel(order: Order) {
    if (!confirm(`¿Anular la orden ${order.numero_po}? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    try {
      await write(`/api/compras/${order.id}/anulacion`, 'POST');
      showToast('Orden anulada.', 'success'); await load();
    } catch (err) { showToast(err instanceof Error ? err.message : 'No se pudo anular la orden.', 'error'); }
    finally { setSaving(false); }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await write(`/api/compras/${editing.orderId}/detalles`, 'PATCH', {
        fecha_orden: editing.date, notes: editing.notes, edit_version: editing.version,
      });
      setEditing(null); showToast('Datos de la orden actualizados.', 'success'); await load();
    } catch (err) { showToast(err instanceof Error ? err.message : 'No se pudo actualizar la orden.', 'error'); }
    finally { setSaving(false); }
  }

  return <div className="p-6">
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-3xl font-bold">Órdenes de compra</h1>
      {canCreate && <button className={buttonClass} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cerrar' : 'Nueva orden'}</button>}
    </div>
    {error && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
    {showForm && <form onSubmit={create} className="mb-6 space-y-4 rounded bg-white p-5 shadow">
      <h2 className="text-xl font-bold">Nueva orden</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label>Número<input className={inputClass} required maxLength={80} value={number} onChange={(e) => setNumber(e.target.value)} /></label>
        <label>Fecha<input className={inputClass} type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Notas<input className={inputClass} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="grid items-end gap-3 md:grid-cols-3">
        <label>Buscar proveedor<input className={inputClass} value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} /></label>
        <button type="button" className={buttonClass} onClick={() => void searchOptions('suppliers')}>Buscar proveedores</button>
        <label>Proveedor<select className={inputClass} required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Selecciona un proveedor</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
      </div>
      <div className="grid items-end gap-3 md:grid-cols-5">
        <label>Buscar producto<input className={inputClass} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></label>
        <button type="button" className={buttonClass} onClick={() => void searchOptions('products')}>Buscar productos</button>
        <label>Producto<select className={inputClass} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Selecciona un producto</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        <label>Cantidad<input className={inputClass} type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
        <label>Precio unitario<input className={inputClass} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      </div>
      <button type="button" className={buttonClass} onClick={addItem}>Agregar producto</button>
      <ul>{items.map((item) => <li key={item.product.id} className="flex items-center gap-3 py-1">
        {item.product.name}: {item.quantity} × Q {Number(item.unitPrice).toFixed(2)}
        <button type="button" className="text-red-700" onClick={() => setItems((current) => current.filter((entry) => entry.product.id !== item.product.id))}>Quitar</button>
      </li>)}</ul>
      <button type="submit" className={buttonClass} disabled={saving}>Crear orden pendiente</button>
      <p className="text-sm text-gray-600">Si falla la confirmación, revisa la lista antes de volver a intentar; no cambies los datos del intento.</p>
      {createAttempted && <button type="button" className="text-sm text-red-700" disabled={saving} onClick={() => {
        if (confirm('Antes de iniciar otro intento, revisa la lista y confirma si la orden anterior se registró. ¿Continuar?')) {
          setRequestId(crypto.randomUUID()); setCreateAttempted(false); void load();
        }
      }}>Reiniciar intento tras revisar</button>}
    </form>}
    <div className="mb-5 grid items-end gap-3 md:grid-cols-4">
      <label>Buscar órdenes<input className={inputClass} type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label>
      <label>Estado<select className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">Todos</option><option value="pending">Pendiente</option><option value="partially_received">Parcialmente recibida</option>
        <option value="received">Recibida</option><option value="cancelled">Anulada</option>
      </select></label>
      <label>Buscar proveedor<input className={inputClass} value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} /></label>
      <button type="button" className={buttonClass} onClick={() => void searchOptions('suppliers')}>Buscar proveedores</button>
      <label>Proveedor<select className={inputClass} value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }}>
        <option value="">Todos</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
    </div>
    {loading ? <p>Cargando...</p> : orders.length === 0 ? <p>No hay órdenes.</p> : <div className="space-y-4">
      {orders.map((order) => <section key={order.id} className="rounded bg-white p-5 shadow">
        <h2 className="text-lg font-bold">{order.numero_po} — {purchaseStatusLabel(order.estado)}</h2>
        <p>{order.supplier?.name ?? 'Proveedor no disponible'} · {order.fecha_orden} · Q {Number(order.monto_total).toFixed(2)}</p>
        {order.notes && <p>Notas: {order.notes}</p>}
        <div className="overflow-x-auto"><table className="mt-3 w-full text-left text-sm">
          <thead><tr><th>Producto</th><th>Solicitado</th><th>Recibido</th><th>Pendiente</th><th>Precio</th>{canReceive && <th>Recibir ahora</th>}</tr></thead>
          <tbody>{order.items.map((item) => <tr key={item.id} className="border-t">
            <td>{item.product?.name ?? 'Producto no disponible'}</td><td>{item.quantity_ordered}</td><td>{item.quantity_received ?? 'Inconsistente'}</td>
            <td>{item.quantity_received === null ? '—' : item.quantity_ordered - item.quantity_received}</td><td>Q {Number(item.unit_price).toFixed(2)}</td>
            {canReceive && <td>{['pending', 'partially_received'].includes(order.estado ?? '') && item.quantity_received !== null &&
              <input aria-label={`Cantidad recibida de ${item.product?.name ?? 'producto'}`} className={inputClass} type="number" min="0"
                max={item.quantity_ordered - item.quantity_received} step="1" value={receiptQuantities[item.id] ?? ''}
                onChange={(e) => setReceiptQuantities((current) => ({ ...current, [item.id]: e.target.value }))} />}</td>}
          </tr>)}</tbody>
        </table></div>
        {canReceive && ['pending', 'partially_received'].includes(order.estado ?? '') && <div className="mt-3 flex flex-wrap items-end gap-3">
          <label>Fecha de recepción<input className={inputClass} type="date" value={receiptDates[order.id] ?? ''} onChange={(e) => setReceiptDates((current) => ({ ...current, [order.id]: e.target.value }))} /></label>
          <button className={buttonClass} disabled={saving} onClick={() => void receive(order)}>Registrar recepción</button>
          {receiptIds[order.id] && <button className="text-sm text-red-700" disabled={saving} onClick={() => {
            if (confirm('Antes de iniciar otro intento, revisa la orden y confirma si la recepción anterior se registró. ¿Continuar?')) {
              setReceiptIds((current) => { const next = { ...current }; delete next[order.id]; return next; }); void load();
            }
          }}>Reiniciar intento tras revisar</button>}
        </div>}
        {canEdit && order.estado === 'pending' && <div className="mt-4 flex gap-3">
          <button className={buttonClass} disabled={saving} onClick={() => setEditing({ orderId: order.id, date: order.fecha_orden, notes: order.notes ?? '', version: order.edit_version })}>Editar fecha y notas</button>
          <button className="rounded bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={saving} onClick={() => void cancel(order)}>Anular</button>
        </div>}
        {editing?.orderId === order.id && <form onSubmit={saveDetails} className="mt-3 flex flex-wrap items-end gap-3">
          <label>Fecha<input className={inputClass} type="date" required value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
          <label>Notas<input className={inputClass} maxLength={500} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>
          <button className={buttonClass} disabled={saving}>Guardar</button>
          <button type="button" onClick={() => setEditing(null)}>Cancelar</button>
        </form>}
      </section>)}
    </div>}
    {!loading && <div className="mt-4"><PaginationControls page={page} pageSize={DEFAULT_PAGE_SIZE} total={total} itemLabel="órdenes" disabled={loading} onPageChange={setPage} /></div>}
  </div>;
}
