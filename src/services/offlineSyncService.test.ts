import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

const storedValues = new Map<string, string>();
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const navigatorState = { onLine: false };

before(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key)
    }
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: navigatorState
  });
});

beforeEach(() => {
  storedValues.clear();
  navigatorState.onLine = false;
});

after(() => {
  if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else Reflect.deleteProperty(globalThis, 'navigator');
});

test('offline actions persist and are restored after service reinitialization', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const firstService = new OfflineSyncService();
  firstService.bindUser('user-1');

  const queued = firstService.enqueue('PASS_USER', {
    userId: 'user-1',
    targetId: 'user-2'
  });
  assert.equal(queued.status, 'pending');

  const restoredService = new OfflineSyncService();
  restoredService.bindUser('user-1');
  assert.deepEqual(restoredService.getQueue(), [queued]);
  assert.equal(restoredService.getPendingCount(), 1);
  firstService.dispose();
  restoredService.dispose();
});

test('failed storage writes are reported and do not claim a queued action was saved', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      }
    }
  });

  try {
    const service = new OfflineSyncService();
    service.bindUser('user-1');
    assert.throws(
      () => service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-2' }),
      /Impossible d’enregistrer/
    );
    assert.equal(service.getQueue().length, 0);
    service.dispose();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('successful synchronization removes the action from persistent storage', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const service = new OfflineSyncService(
    async () => {},
    async () => 'user-1'
  );
  service.bindUser('user-1');
  service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-2' });
  navigatorState.onLine = true;

  try {
    await service.processQueue();
    assert.deepEqual(service.getQueue(), []);
    assert.equal(JSON.parse(storedValues.get('bavel_offline_action_queue:user-1') || '[]').length, 0);
  } finally {
    navigatorState.onLine = false;
    service.dispose();
  }
});

test('failed synchronization remains queued with an explicit retry delay', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const service = new OfflineSyncService(
    async () => {
      throw new Error('network unavailable');
    },
    async () => 'user-1'
  );
  service.bindUser('user-1');
  service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-2' });
  navigatorState.onLine = true;

  try {
    await service.processQueue();
    const [action] = service.getQueue();
    assert.equal(action.status, 'pending');
    assert.equal(action.retryCount, 1);
    assert.ok(action.nextAttemptAt > Date.now());
  } finally {
    navigatorState.onLine = false;
    service.dispose();
  }
});

test('subscribers are notified when an action is queued and the queue is cleared', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const service = new OfflineSyncService();
  service.bindUser('user-1');
  const queueSizes: number[] = [];
  const unsubscribe = service.subscribe((queue) => queueSizes.push(queue.length));

  service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-2' });
  service.clearQueue();
  unsubscribe();
  assert.deepEqual(queueSizes, [0, 1, 0]);
  service.dispose();
});

test('retries actions that exhausted the automatic retry limit when requested manually', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  let attempts = 0;
  const service = new OfflineSyncService(
    async () => {
      attempts += 1;
      throw new Error('backend unavailable');
    },
    async () => 'user-1'
  );
  service.bindUser('user-1');
  service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-2' });
  navigatorState.onLine = true;

  try {
    for (let retry = 0; retry < 5; retry += 1) {
      await service.processQueue();
      now = service.getQueue()[0]?.nextAttemptAt || now;
    }
    assert.equal(service.getQueue()[0].status, 'failed');
    await service.processQueue(true);
    assert.equal(attempts, 6);
    assert.equal(service.getQueue()[0].status, 'pending');
  } finally {
    Date.now = originalNow;
    navigatorState.onLine = false;
    service.dispose();
  }
});

test('offline queues are isolated by account and reject cross-account actions', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const service = new OfflineSyncService();
  service.bindUser('user-1');
  service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-2' });
  assert.throws(
    () => service.enqueue('PASS_USER', { userId: 'user-2', targetId: 'user-3' }),
    /ne correspond pas au compte/
  );

  service.bindUser('user-2');
  assert.deepEqual(service.getQueue(), []);
  service.bindUser('user-1');
  assert.equal(service.getQueue().length, 1);
  service.dispose();
});

test('legacy queued actions migrate only to their owning account', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  storedValues.set(
    'bavel_offline_action_queue',
    JSON.stringify([
      {
        id: 'legacy-1',
        type: 'PASS_USER',
        payload: { userId: 'user-1', targetId: 'user-3' },
        timestamp: 1,
        retryCount: 0,
        nextAttemptAt: 0,
        status: 'pending'
      },
      {
        id: 'legacy-2',
        type: 'SEND_MESSAGE',
        payload: { senderId: 'user-2', targetId: 'user-3', text: 'private' },
        timestamp: 2,
        retryCount: 0,
        nextAttemptAt: 0,
        status: 'pending'
      }
    ])
  );
  const service = new OfflineSyncService();
  service.bindUser('user-1');

  assert.equal(service.getQueue().length, 1);
  assert.equal(service.getQueue()[0].userId, 'user-1');
  assert.equal(JSON.parse(storedValues.get('bavel_offline_action_queue') || '[]')[0].id, 'legacy-2');
  assert.equal(storedValues.has('bavel_offline_action_queue:user-2'), false);
  service.dispose();
});

test('legacy actions for other accounts are preserved until each account signs in', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  const legacyQueue = [
    {
      id: 'legacy-user-1',
      type: 'PASS_USER',
      payload: { userId: 'user-1', targetId: 'user-3' },
      timestamp: 1,
      retryCount: 0,
      nextAttemptAt: 0,
      status: 'pending'
    },
    {
      id: 'legacy-user-2',
      type: 'SEND_MESSAGE',
      payload: { senderId: 'user-2', targetId: 'user-3', text: 'private' },
      timestamp: 2,
      retryCount: 0,
      nextAttemptAt: 0,
      status: 'pending'
    }
  ];
  storedValues.set('bavel_offline_action_queue', JSON.stringify(legacyQueue));

  const firstAccount = new OfflineSyncService();
  firstAccount.bindUser('user-1');
  assert.deepEqual(
    firstAccount.getQueue().map((action) => action.id),
    ['legacy-user-1']
  );
  assert.deepEqual(
    JSON.parse(storedValues.get('bavel_offline_action_queue') || '[]').map((action: { id: string }) => action.id),
    ['legacy-user-2']
  );
  firstAccount.dispose();

  const secondAccount = new OfflineSyncService();
  secondAccount.bindUser('user-2');
  assert.deepEqual(
    secondAccount.getQueue().map((action) => action.id),
    ['legacy-user-2']
  );
  assert.equal(storedValues.has('bavel_offline_action_queue'), false);
  secondAccount.dispose();
});

test('queued actions are not sent unless the authenticated account matches', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  let executed = false;
  const service = new OfflineSyncService(
    async () => {
      executed = true;
    },
    async () => 'user-2'
  );
  service.bindUser('user-1');
  service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-3' });
  navigatorState.onLine = true;

  try {
    await service.processQueue();
    assert.equal(executed, false);
    assert.equal(service.getQueue()[0].status, 'pending');
  } finally {
    navigatorState.onLine = false;
    service.dispose();
  }
});

test('an account switch during an in-flight action cannot move its result into the next account queue', async () => {
  const { OfflineSyncService } = await import('./offlineSyncService');
  let resolveAction: (() => void) | undefined;
  const executedIds: string[] = [];
  navigatorState.onLine = false;

  const service = new OfflineSyncService(
    (action) => {
      executedIds.push(action.userId);
      return new Promise<void>((resolve) => {
        resolveAction = resolve;
      });
    },
    async () => 'user-1'
  );
  service.bindUser('user-1');
  service.enqueue('PASS_USER', { userId: 'user-1', targetId: 'user-2' });
  navigatorState.onLine = true;
  const sync = service.processQueue();

  try {
    await new Promise((resolve) => setImmediate(resolve));
    service.bindUser('user-2');
    resolveAction?.();
    await sync;
    assert.deepEqual(executedIds, ['user-1']);
    assert.deepEqual(service.getQueue(), []);
  } finally {
    navigatorState.onLine = false;
    service.dispose();
  }
});
