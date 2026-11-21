'use client';

import { useState, useEffect } from 'react';
import type { CreditTransaction } from '@/lib/services/customers/customerService';
import { fetchJson } from '@/lib/utils/fetchJson';

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  tipo: string;
  estado_cliente: string;
  limite_credito?: number;
  saldo_actual?: number;
  created_at?: string;
}

interface ClientesModalProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientesModal({ cliente, isOpen, onClose }: ClientesModalProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadedClienteId, setLoadedClienteId] = useState<string | null>(null);
  const loading = isOpen && cliente !== null && loadedClienteId !== cliente.id;
  const clienteId = cliente?.id;

  useEffect(() => {
    if (!isOpen || !clienteId) return;

    let active = true;
    fetchJson<CreditTransaction[]>(
      `/api/clientes/${clienteId}/transactions?limit=20`,
      'Error loading transactions'
    )
      .then((data) => {
        if (active) setTransactions(data);
      })
      .catch((error: unknown) => {
        if (active) console.error('Error loading transactions:', error);
      })
      .finally(() => {
        if (active) setLoadedClienteId(clienteId);
      });

    return () => {
      active = false;
    };
  }, [isOpen, clienteId]);

  if (!isOpen || !cliente) return null;

  const availableCredit = (cliente.limite_credito || 0) - (cliente.saldo_actual || 0);
  const creditUsage = cliente.limite_credito ? ((cliente.saldo_actual || 0) / cliente.limite_credito) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="text-gray-900 font-medium">{cliente.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Teléfono</label>
                <p className="text-gray-900 font-medium">{cliente.telefono || 'No disponible'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Ciudad</label>
                <p className="text-gray-900 font-medium">{cliente.ciudad || 'No disponible'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Tipo de Cliente</label>
                <p className="text-gray-900 font-medium">
                  {cliente.tipo === 'retail' ? 'Minorista' : cliente.tipo === 'wholesale' ? 'Mayorista' : 'Negocio'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Dirección</label>
                <p className="text-gray-900 font-medium">{cliente.direccion || 'No disponible'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Estado del Cliente</label>
                <p className={`text-gray-900 font-medium px-2 py-1 rounded inline-block ${
                  cliente.estado_cliente === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {cliente.estado_cliente.charAt(0).toUpperCase() + cliente.estado_cliente.slice(1)}
                </p>
              </div>
            </div>
          </div>

          {/* Credit Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Crédito</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Límite de Crédito</label>
                <p className="text-2xl font-bold text-gray-900">${(cliente.limite_credito || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Saldo Actual</label>
                <p className="text-2xl font-bold text-red-600">${(cliente.saldo_actual || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Crédito Disponible</label>
                <p className="text-2xl font-bold text-green-600">${Math.max(0, availableCredit).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Utilización de Crédito</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          creditUsage > 80 ? 'bg-red-600' : creditUsage > 50 ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(100, creditUsage)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{creditUsage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transacciones Recientes</h3>
            {loading ? (
              <p className="text-gray-500 text-center py-4">Cargando transacciones...</p>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay transacciones</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.map((transaction, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.descripcion || transaction.tipo}</p>
                      <p className="text-xs text-gray-500">{new Date(transaction.fecha).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-bold ${
                      transaction.tipo === 'pago' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.tipo === 'pago' ? '-' : '+'} ${transaction.monto.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-6 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
