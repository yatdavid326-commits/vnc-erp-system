export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  href: string;
  created_at: string;
  read_at: string | null;
}

export function isRealtimeNotification(
  value: unknown
): value is RealtimeNotification {
  if (typeof value !== 'object' || value === null) return false;

  const notification = value as Record<string, unknown>;
  return (
    typeof notification.id === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string' &&
    typeof notification.href === 'string' &&
    notification.href.startsWith('/') &&
    !notification.href.startsWith('//') &&
    typeof notification.created_at === 'string' &&
    Number.isFinite(Date.parse(notification.created_at)) &&
    (notification.read_at === null ||
      (typeof notification.read_at === 'string' &&
        Number.isFinite(Date.parse(notification.read_at))))
  );
}

export function mergeRealtimeNotification(
  current: RealtimeNotification[],
  incoming: RealtimeNotification,
  limit = 20
): RealtimeNotification[] {
  return [
    incoming,
    ...current.filter((notification) => notification.id !== incoming.id),
  ]
    .sort(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at)
    )
    .slice(0, limit);
}
