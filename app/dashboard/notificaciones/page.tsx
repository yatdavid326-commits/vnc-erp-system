export const dynamic = 'force-dynamic';

export default function NotificationPreferencesPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">
        Alertas de inventario
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Cuando un producto activo alcanza su mínimo de inventario, el ERP crea
        una notificación para administradores y usuarios con acceso de lectura
        al módulo Inventario. Puedes verla desde la campana de notificaciones.
      </p>
      <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        El envío por SMS y WhatsApp queda pospuesto. No se solicitan teléfonos ni
        consentimientos externos en esta etapa.
      </p>
    </section>
  );
}
