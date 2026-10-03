export class QueueCapacityError extends Error {
  constructor() {
    super('The serial work queue is at capacity.');
    this.name = 'QueueCapacityError';
  }
}

export class BoundedSerialQueue {
  private tail = Promise.resolve();
  private outstanding = 0;

  constructor(private readonly maximumOutstanding: number) {
    if (!Number.isInteger(maximumOutstanding) || maximumOutstanding < 1) {
      throw new RangeError('maximumOutstanding must be a positive integer.');
    }
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.outstanding >= this.maximumOutstanding) {
      throw new QueueCapacityError();
    }

    this.outstanding += 1;
    const result = this.tail.then(task);
    this.tail = result.then(
      () => undefined,
      () => undefined
    );
    return result.finally(() => {
      this.outstanding -= 1;
    });
  }
}
