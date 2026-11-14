'use client';

interface Proveedor {
  id: string;
  nombre: string;
  email: string;
  teléfono: string;
  persona_contacto: string;
  dirección: string;
  ciudad: string;
  estado: string;
  país: string;
  términos_pago: string;
  activo: boolean;
  created_at: string;
}

interface ProveedoresTableProps {
  proveedores: Proveedor[];
  onEdit: (proveedor: Proveedor) => void;
  onDelete: (id: string) => void;
}

export default function ProveedoresTable({ proveedores, onEdit, onDelete }: ProveedoresTableProps) {
  const getStatusColor = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Teléfono</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contacto</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ciudad</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">País</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No hay proveedores registrados
                </td>
              </tr>
            ) : (
              proveedores.map((proveedor) => (
                <tr key={proveedor.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{proveedor.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{proveedor.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{proveedor.teléfono || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{proveedor.persona_contacto || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{proveedor.ciudad || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{proveedor.país || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(proveedor.activo)}`}>
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => onEdit(proveedor)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(proveedor.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
