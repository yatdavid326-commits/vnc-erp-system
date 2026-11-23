'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import {
  isRealtimeNotification,
  type RealtimeNotification,
} from '@/lib/utils/notifications';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error || 'No se pudieron cargar las notificaciones.'
          );
        }
        if (
          !Array.isArray(result.notifications) ||
          !Number.isInteger(result.unreadCount)
        ) {
          throw new Error('Respuesta de notificaciones no válida.');
        }
        if (!active) return;
        setNotifications(
          result.notifications.filter(isRealtimeNotification)
        );
        setUnreadCount(result.unreadCount);
        setLoadError(null);
      } catch (error) {
        if (!active) return;
        console.error('Error loading notifications:', error);
        setLoadError('No se pudieron cargar las notificaciones.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 15_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const markAsRead = async (id: string) => {
    const wasUnread = notifications.some(
      (notification) => notification.id === id && notification.read_at === null
    );
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo marcar la notificación.');
      }

      setActionError(null);
      if (wasUnread) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, read_at: result.read_at }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setActionError('No se pudo marcar la notificación como leída.');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudieron marcar como leídas.');
      }

      setActionError(null);
      setUnreadCount(0);
      setNotifications((current) =>
        current.map((notification) =>
          notification.read_at === null
            ? { ...notification, read_at: result.read_at }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setActionError('No se pudieron marcar todas como leídas.');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="font-semibold text-gray-900">Notificaciones</h2>
              <p className="text-xs text-gray-500">
                Actividad reciente de POS e inventario
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/notificaciones"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                <Settings size={14} aria-hidden="true" />
                Alertas
              </Link>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  Marcar leídas
                </button>
              )}
            </div>
          </header>

          {(loadError || actionError) && (
            <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {actionError || loadError}
            </p>
          )}

          {isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              Cargando notificaciones...
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              No hay notificaciones.
            </p>
          ) : (
            <ul className="max-h-[24rem] divide-y divide-gray-100 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.href}
                    onClick={() => {
                      if (notification.read_at === null) {
                        void markAsRead(notification.id);
                      }
                      setIsOpen(false);
                    }}
                    className={`block px-4 py-3 transition-colors hover:bg-gray-50 ${
                      notification.read_at === null ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          notification.read_at === null
                            ? 'bg-blue-600'
                            : 'bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-600">
                          {notification.message}
                        </p>
                        <time
                          dateTime={notification.created_at}
                          className="mt-1 block text-xs text-gray-500"
                        >
                          {new Date(notification.created_at).toLocaleString(
                            'es-GT',
                            { dateStyle: 'short', timeStyle: 'short' }
                          )}
                        </time>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
