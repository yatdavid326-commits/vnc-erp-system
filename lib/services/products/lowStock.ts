export interface LowStockProduct {
  activo: boolean;
  cantidad_stock: number;
  stock_minimo: number;
}

export function isProductLowStock(producto: LowStockProduct): boolean {
  return producto.activo &&
    producto.cantidad_stock <= producto.stock_minimo;
}
