'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { supabaseClient } from '@/lib/db/supabase';
import {
  isRealtimeNotification,
  mergeRealtimeNotification,
  type RealtimeNotification,
} from '@/lib/utils/notifications';

const notificationFields = 'id, title, message, href, created_at, read_at';

export default function NotificationCenter({
  authUserId,
}: {
  authUserId: string;
}) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let hasSubscribed = false;

    async function loadUnreadCount() {
      try {
        const { count, error } = await supabaseClient
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_auth_id', authUserId)
          .is('read_at', null);

        if (!active) return;
        if (error) throw error;
        setUnreadCount(count ?? 0);
        setLoadError(null);
      } catch (error) {
        if (!active) return;
        console.error('Error loading unread notification count:', error);
        setLoadError('No se pudo actualizar el contador de notificaciones.');
      }
    }

    const loadNotifications = async () => {
      try {
        const [notificationResult, countResult] = await Promise.all([
          supabaseClient
            .from('notifications')
            .select(notificationFields)
            .eq('recipient_auth_id', authUserId)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(20),
          supabaseClient
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_auth_id', authUserId)
            .is('read_at', null),
        ]);

        if (!active) return;
        if (notificationResult.error) throw notificationResult.error;

        const records = (notificationResult.data ?? []).filter(
          isRealtimeNotification
        );
        setNotifications((current) =>
          records.reduce(
            (merged, notification) =>
              mergeRealtimeNotification(merged, notification),
            current
          )
        );
        if (countResult.error) {
          console.error(
            'Error loading unread notification count:',
            countResult.error
          );
          setLoadError('No se pudo actualizar el contador de notificaciones.');
        } else {
          setUnreadCount(countResult.count ?? 0);
          setLoadError(null);
        }
      } catch (error) {
        if (!active) return;
        console.error('Error loading notifications:', error);
        setLoadError('No se pudieron cargar las notificaciones.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadNotifications();

    const channel = supabaseClient
      .channel(`notifications:${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_auth_id=eq.${authUserId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const incoming: unknown = payload.new;
          if (!isRealtimeNotification(incoming)) return;
          setNotifications((current) =>
            mergeRealtimeNotification(current, incoming)
          );
          void loadUnreadCount();
        }
      )
      .subscribe((status, error) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          if (hasSubscribed) void loadNotifications();
          hasSubscribed = true;
          setRealtimeError(null);
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.error('Realtime notifications channel error:', error);
          setRealtimeError(
            'La conexión en tiempo real no está disponible.'
          );
        }
      });

    return () => {
      active = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [authUserId]);

  const markAsRead = async (id: string) => {
    const wasUnread = notifications.some(
      (notification) => notification.id === id && notification.read_at === null
    );
    const readAt = new Date().toISOString();
    const { error } = await supabaseClient
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', id)
      .eq('recipient_auth_id', authUserId)
      .is('read_at', null);

    if (error) {
      console.error('Error marking notification as read:', error);
      setActionError('No se pudo marcar la notificación como leída.');
      return;
    }

    setActionError(null);
    if (wasUnread) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read_at: readAt }
          : notification
      )
    );
  };

  const markAllAsRead = async () => {
    const readAt = new Date().toISOString();
    const { error } = await supabaseClient
      .from('notifications')
      .update({ read_at: readAt })
      .eq('recipient_auth_id', authUserId)
      .is('read_at', null);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      setActionError('No se pudieron marcar todas como leídas.');
      return;
    }

    setActionError(null);
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((notification) =>
        notification.read_at === null
          ? { ...notification, read_at: readAt }
          : notification
      )
    );
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
              <p className="text-xs text-gray-500">Actividad reciente de POS</p>
            </div>
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
          </header>

          {(loadError || realtimeError || actionError) && (
            <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {actionError || loadError || realtimeError}
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
