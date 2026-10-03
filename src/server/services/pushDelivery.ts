export type PushDeliveryStatus = 'no_subscriptions' | 'accepted' | 'partial_failure' | 'failed';

export interface PushDeliveryResult {
  status: PushDeliveryStatus;
  subscriptionCount: number;
  acceptedCount: number;
  failedCount: number;
  expiredCount: number;
}

export async function dispatchPushSubscriptions<T extends { endpoint: string }>(
  subscriptions: T[],
  send: (subscription: T) => Promise<void>,
  removeExpired: (subscription: T) => Promise<void>
): Promise<PushDeliveryResult> {
  let acceptedCount = 0;
  let expiredCount = 0;

  for (const subscription of subscriptions) {
    try {
      await send(subscription);
      acceptedCount += 1;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        ((error as { statusCode?: unknown }).statusCode === 404 ||
          (error as { statusCode?: unknown }).statusCode === 410)
      ) {
        try {
          await removeExpired(subscription);
          expiredCount += 1;
        } catch {
          // The failed delivery remains visible in failedCount if cleanup also fails.
        }
      }
    }
  }

  const subscriptionCount = subscriptions.length;
  const failedCount = subscriptionCount - acceptedCount;
  const status: PushDeliveryStatus =
    subscriptionCount === 0
      ? 'no_subscriptions'
      : acceptedCount === 0
        ? 'failed'
        : failedCount > 0
          ? 'partial_failure'
          : 'accepted';

  return { status, subscriptionCount, acceptedCount, failedCount, expiredCount };
}
