'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/utils/fetchJson';
import { useToast } from '@/components/notifications/ToastProvider';

interface NotificationPreferences {
  phone_e164: string | null;
  sms_opt_in: boolean;
  sms_consented_at: string | null;
  whatsapp_opt_in: boolean;
  whatsapp_consented_at: string | null;
}

const emptyPreferences: NotificationPreferences = {
  phone_e164: null,
  sms_opt_in: false,
  sms_consented_at: null,
  whatsapp_opt_in: false,
  whatsapp_consented_at: null,
};

export default function NotificationPreferencesPage() {
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState(emptyPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetchJson<NotificationPreferences>(
      '/api/notifications/preferences',
      'No se pudieron cargar las preferencias.'
    )
      .then((data) => {
        if (active) setPreferences(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar las preferencias.';
        setError(message);
        console.error('Error loading notification preferences:', loadError);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const saved = await fetchJson<NotificationPreferences>(
        '/api/notifications/preferences',
        'No se pudieron guardar las preferencias.',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sms_opt_in: preferences.sms_opt_in,
            whatsapp_opt_in: preferences.whatsapp_opt_in,
            phone_e164: preferences.phone_e164?.trim() || null,
          }),
        }
      );
      setPreferences(saved);
      showToast('Preferencias de notificación guardadas.', 'success');
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'No se pudieron guardar las preferencias.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="p-6 text-sm text-gray-600">Cargando preferencias...</p>;
  }

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">
        Alertas de inventario
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Las alertas externas se envían solo cuando tienes acceso de lectura al
        módulo Inventario y has aceptado recibirlas por el canal seleccionado.
      </p>

      <form className="mt-6 space-y-5" onSubmit={savePreferences}>
        <div>
          <label
            htmlFor="phone-e164"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Teléfono en formato internacional
          </label>
          <input
            id="phone-e164"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            pattern="\+[1-9][0-9]{7,14}"
            placeholder="+50255550123"
            value={preferences.phone_e164 ?? ''}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                phone_e164: event.target.value || null,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Incluye el prefijo del país, por ejemplo +502. Se elimina al
            desactivar todos los canales.
          </p>
        </div>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-900">
            Consentimiento de recepción
          </legend>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input
              type="checkbox"
              checked={preferences.sms_opt_in}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  sms_opt_in: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">
              Acepto recibir por SMS alertas de inventario bajo en el número
              indicado. Pueden aplicar tarifas del operador; puedo cancelar
              desactivando esta opción.
              {preferences.sms_consented_at && (
                <span className="mt-1 block text-xs text-gray-500">
                  Consentimiento guardado:{' '}
                  {new Date(preferences.sms_consented_at).toLocaleString(
                    'es-GT'
                  )}
                </span>
              )}
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input
              type="checkbox"
              checked={preferences.whatsapp_opt_in}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  whatsapp_opt_in: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">
              Acepto recibir por WhatsApp alertas de inventario bajo en el
              número indicado. Puedo retirar este consentimiento
              desactivando esta opción.
              {preferences.whatsapp_consented_at && (
                <span className="mt-1 block text-xs text-gray-500">
                  Consentimiento guardado:{' '}
                  {new Date(preferences.whatsapp_consented_at).toLocaleString(
                    'es-GT'
                  )}
                </span>
              )}
            </span>
          </label>
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Guardando...' : 'Guardar preferencias'}
        </button>
      </form>
    </section>
  );
}
