/**
 * BIZ-MS1 U-BIZ11: Offline sync React hook
 * Subscribes to OfflineQueueManager, auto-replays on reconnect.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { offlineQueueManager } from '../lib/OfflineQueueManager';

interface UseOfflineSyncResult {
  pendingCount: number;
  isSyncing: boolean;
}

export function useOfflineSync(): UseOfflineSyncResult {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const mountedRef = useRef(true);

  const replay = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsSyncing(true);
    try {
      await offlineQueueManager.replayAll(async (action_type, payload) => {
        const resp = await fetch(`/api/v1/erp/${action_type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return resp;
      });
    } finally {
      if (mountedRef.current) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const unsub = offlineQueueManager.subscribe((count) => {
      if (mountedRef.current) setPendingCount(count);
    });

    const handleOnline = () => void replay();
    window.addEventListener('online', handleOnline);

    return () => {
      mountedRef.current = false;
      unsub();
      window.removeEventListener('online', handleOnline);
    };
  }, [replay]);

  return { pendingCount, isSyncing };
}
