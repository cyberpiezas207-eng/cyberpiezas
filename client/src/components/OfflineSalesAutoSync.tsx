import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { subscribeToConnectivityChanges } from '@/lib/desktopBridge';
import { syncOfflineSalesQueue } from '@/lib/offlineSalesSync';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function OfflineSalesAutoSync({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const syncingRef = useRef(false);

  const syncPendingSales = useCallback(async () => {
    if (loading || !user || syncingRef.current || !navigator.onLine) {
      return;
    }

    syncingRef.current = true;

    try {
      const summary = await syncOfflineSalesQueue();

      if (summary.synced > 0) {
        toast.success(`Se sincronizaron ${summary.synced} venta${summary.synced === 1 ? '' : 's'} offline.`);
        await Promise.all([
          utils.sales.listToday.invalidate(),
          utils.dashboard.todayStats.invalidate(),
          utils.dashboard.topProducts.invalidate(),
        ]);
      }

      if (summary.failed > 0) {
        toast.error(`Quedaron ${summary.failed} venta${summary.failed === 1 ? '' : 's'} offline pendientes por revisar.`);
      }
    } finally {
      syncingRef.current = false;
    }
  }, [loading, user, utils]);

  useEffect(() => {
    void syncPendingSales();
  }, [syncPendingSales]);

  useEffect(() => {
    return subscribeToConnectivityChanges((isOnline) => {
      if (isOnline) {
        void syncPendingSales();
      }
    });
  }, [syncPendingSales]);

  return <>{children}</>;

}
