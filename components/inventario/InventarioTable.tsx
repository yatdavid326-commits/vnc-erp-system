'use client';

import { Producto } from '@/lib/services/products/productService';

interface InventarioTableProps {
  productos: Producto[];
  onEdit: (producto: Producto) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export default function InventarioTable({
  productos,
  onEdit,
  onDelete,
  loading = false,
}: InventarioTableProps) {
  const getStockColor = (stock: number, minStock: number) => {
    if (stock <= 0) return 'bg-red-100 text-red-800';
    if (stock <= minStock) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= minStock) return 'Low Stock';
    return 'In Stock';
  };

  if (loading && productos.length === 0) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (productos.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No products found</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold">SKU</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">
              Category
            </th>
            <th className="px-4 py-2 text-right text-sm font-semibold">
              Cost
            </th>
            <th className="px-4 py-2 text-right text-sm font-semibold">
              Price
            </th>
            <th className="px-4 py-2 text-right text-sm font-semibold">
              Stock
            </th>
            <th className="px-4 py-2 text-center text-sm font-semibold">
              Status
            </th>
            <th className="px-4 py-2 text-center text-sm font-semibold">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {productos.map(producto => (
            <tr key={producto.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-mono text-gray-700">
                {producto.sku}
              </td>
              <td className="px-4 py-2 text-sm">
                <div className="font-medium">{producto.nombre}</div>
                <div className="text-xs text-gray-500">
                  {producto.descripcion || 'N/A'}
                </div>
              </td>
              <td className="px-4 py-2 text-sm text-gray-600">
                {producto.categoria}
              </td>
              <td className="px-4 py-2 text-sm text-right text-gray-600">
                Q {producto.costo_unitario?.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-sm text-right font-semibold">
                Q {producto.precio_venta?.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-sm text-right text-gray-600">
                <div className="font-medium">{producto.cantidad_stock}</div>
                <div className="text-xs text-gray-500">
                  Min: {producto.stock_minimo}
                </div>
              </td>
              <td className="px-4 py-2 text-center">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${getStockColor(
                    producto.cantidad_stock,
                    producto.stock_minimo
                  )}`}
                >
                  {getStockStatus(producto.cantidad_stock, producto.stock_minimo)}
                </span>
              </td>
              <td className="px-4 py-2 text-center space-x-1">
                <button
                  onClick={() => onEdit(producto)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => onDelete(producto.id)}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Delete"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
