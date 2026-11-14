'use client';

import { useState, useEffect } from 'react';
import { Producto } from '@/lib/services/products/productService';

interface InventarioFormProps {
  producto?: Producto;
  onSubmit: (data: Partial<Producto>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function InventarioForm({
  producto,
  onSubmit,
  onCancel,
  loading = false,
}: InventarioFormProps) {
  const [formData, setFormData] = useState<Partial<Producto>>({
    nombre: '',
    sku: '',
    descripcion: '',
    categoria: '',
    costo_unitario: 0,
    precio_venta: 0,
    cantidad_stock: 0,
    stock_minimo: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (producto) {
      setFormData(producto);
    }
  }, [producto]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre?.trim()) newErrors.nombre = 'Product name is required';
    if (!formData.sku?.trim()) newErrors.sku = 'SKU is required';
    if (!formData.categoria?.trim()) newErrors.categoria = 'Category is required';
    if (!formData.precio_venta || formData.precio_venta <= 0) {
      newErrors.precio_venta = 'Sale price must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      if (!producto) {
        setFormData({
          nombre: '',
          sku: '',
          descripcion: '',
          categoria: '',
          costo_unitario: 0,
          precio_venta: 0,
          cantidad_stock: 0,
          stock_minimo: 0,
        });
        setErrors({});
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    const numFields = [
      'costo_unitario',
      'precio_venta',
      'cantidad_stock',
      'stock_minimo',
    ];

    setFormData(prev => ({
      ...prev,
      [name]: numFields.includes(name) ? parseFloat(value) || 0 : value,
    }));

    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const margin = formData.precio_venta && formData.costo_unitario
    ? (((formData.precio_venta - formData.costo_unitario) / formData.precio_venta) * 100).toFixed(1)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold">
        {producto ? 'Edit Product' : 'New Product'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SKU */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            SKU *
          </label>
          <input
            type="text"
            name="sku"
            value={formData.sku || ''}
            onChange={handleChange}
            placeholder="SKU"
            className={`mt-1 block w-full px-3 py-2 border rounded-md ${
              errors.sku ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.sku && (
            <p className="mt-1 text-sm text-red-500">{errors.sku}</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product Name *
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre || ''}
            onChange={handleChange}
            placeholder="Product name"
            className={`mt-1 block w-full px-3 py-2 border rounded-md ${
              errors.nombre ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.nombre && (
            <p className="mt-1 text-sm text-red-500">{errors.nombre}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <input
            type="text"
            name="categoria"
            value={formData.categoria || ''}
            onChange={handleChange}
            placeholder="Category"
            className={`mt-1 block w-full px-3 py-2 border rounded-md ${
              errors.categoria ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.categoria && (
            <p className="mt-1 text-sm text-red-500">{errors.categoria}</p>
          )}
        </div>

        {/* Cost Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cost Price (Q)
          </label>
          <input
            type="number"
            name="costo_unitario"
            value={formData.costo_unitario || 0}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Sale Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sale Price (Q) *
          </label>
          <input
            type="number"
            name="precio_venta"
            value={formData.precio_venta || 0}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            className={`mt-1 block w-full px-3 py-2 border rounded-md ${
              errors.precio_venta ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.precio_venta && (
            <p className="mt-1 text-sm text-red-500">{errors.precio_venta}</p>
          )}
        </div>

        {/* Stock */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Current Stock
          </label>
          <input
            type="number"
            name="cantidad_stock"
            value={formData.cantidad_stock || 0}
            onChange={handleChange}
            placeholder="0"
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Min Stock */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Minimum Stock
          </label>
          <input
            type="number"
            name="stock_minimo"
            value={formData.stock_minimo || 0}
            onChange={handleChange}
            placeholder="0"
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Margin */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Profit Margin
          </label>
          <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
            {margin}%
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          name="descripcion"
          value={formData.descripcion || ''}
          onChange={handleChange}
          placeholder="Product description"
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : producto ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
