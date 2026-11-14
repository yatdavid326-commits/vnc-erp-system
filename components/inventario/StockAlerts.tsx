'use client';

import { Producto } from '@/lib/services/products/productService';

interface StockAlertsProps {
  productos: Producto[];
}

export default function StockAlerts({ productos }: StockAlertsProps) {
  const outOfStock = productos.filter(p => p.cantidad_stock === 0);
  const lowStock = productos.filter(
    p => p.cantidad_stock > 0 && p.cantidad_stock <= p.stock_minimo
  );

  if (outOfStock.length === 0 && lowStock.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
        ✓ All products have adequate stock
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {outOfStock.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="font-semibold text-red-800 mb-2">
            Out of Stock ({outOfStock.length})
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {outOfStock.map(p => (
              <li key={p.id} className="flex justify-between">
                <span>{p.nombre}</span>
                <span className="font-mono">{p.sku}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="font-semibold text-yellow-800 mb-2">
            Low Stock ({lowStock.length})
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {lowStock.map(p => (
              <li key={p.id} className="flex justify-between">
                <span className="flex-1">{p.nombre}</span>
                <span className="font-mono">
                  {p.cantidad_stock} / {p.stock_minimo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
