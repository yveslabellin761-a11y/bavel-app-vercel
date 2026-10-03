import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BoundedSerialQueue, QueueCapacityError } from './boundedSerialQueue';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('BoundedSerialQueue', () => {
  it('rejects excess work while preserving order and recovering after failures', async () => {
    const queue = new BoundedSerialQueue(2);
    const first = deferred<string>();
    const order: number[] = [];
    const firstResult = queue.enqueue(async () => {
      order.push(1);
      return first.promise;
    });
    const secondResult = queue.enqueue(async () => {
      order.push(2);
      throw new Error('expected task failure');
    });

    assert.throws(
      () => queue.enqueue(async () => 'overflow'),
      QueueCapacityError
    );
    first.resolve('finished');
    assert.equal(await firstResult, 'finished');
    await assert.rejects(secondResult, /expected task failure/);

    assert.equal(await queue.enqueue(async () => 'recovered'), 'recovered');
    assert.deepEqual(order, [1, 2]);
  });
});
