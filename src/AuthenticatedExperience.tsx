import React from 'react';
import { NotificationProvider } from './context/NotificationContext';
import { UXProvider } from './context/UXContext';
import { ToastProvider } from './components/ui';
import { NetworkStatusBanner, ActionSheet, ConfirmDialog } from './components/ux';
import { OfflineSyncStatus } from './features/offline';
import { DefaultFallback } from './routes';

const MobileApp = React.lazy(() =>
  import('./components/MobileApp').then((module) => ({ default: module.MobileApp }))
);

interface AuthenticatedExperienceProps {
  user: { id: string; [key: string]: unknown };
}

export function AuthenticatedExperience({ user }: AuthenticatedExperienceProps) {
  return (
    <NotificationProvider userId={user.id}>
      <UXProvider>
        <ToastProvider>
          <div className="min-h-screen bg-white">
            <NetworkStatusBanner />
            <React.Suspense fallback={<DefaultFallback />}>
              <MobileApp user={user as any} />
            </React.Suspense>
            <ActionSheet />
            <ConfirmDialog />
            <OfflineSyncStatus />
          </div>
        </ToastProvider>
      </UXProvider>
    </NotificationProvider>
  );
}
