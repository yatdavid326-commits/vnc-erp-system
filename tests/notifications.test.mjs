import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isRealtimeNotification,
  mergeRealtimeNotification,
} from '../lib/utils/notifications.ts';

const firstNotification = {
  id: '1',
  title: 'Nueva venta',
  message: 'Se registró una nueva venta en POS.',
  href: '/dashboard/pos',
  created_at: '2026-11-22T11:00:00.000Z',
  read_at: null,
};

test('Realtime notifications are validated and keep links internal', () => {
  assert.equal(isRealtimeNotification(firstNotification), true);
  assert.equal(
    isRealtimeNotification({ ...firstNotification, href: '//example.com' }),
    false
  );
  assert.equal(
    isRealtimeNotification({ ...firstNotification, created_at: 'invalid' }),
    false
  );
});

test('Realtime updates replace duplicates, sort newest first, and preserve read state', () => {
  const newer = {
    ...firstNotification,
    id: '2',
    created_at: '2026-11-22T11:01:00.000Z',
  };
  const markedRead = { ...firstNotification, read_at: '2026-11-22T11:02:00.000Z' };
  const notifications = mergeRealtimeNotification(
    [firstNotification, newer],
    markedRead
  );

  assert.deepEqual(
    notifications.map(({ id }) => id),
    ['2', '1']
  );
  assert.equal(notifications[1].read_at, markedRead.read_at);
  assert.equal(notifications[0].read_at, null);
});
