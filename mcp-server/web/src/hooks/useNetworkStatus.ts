/**
 * Network Status Hook — Online/Offline Detection
 * S4-MS1 P0-U04: Error Handling & Offline Support
 *
 * Provides real-time network status and connection quality information.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getNetworkStatus(): NetworkStatus {
  if (typeof navigator === 'undefined') {
    return {
      isOnline: true,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: false,
    };
  }

  const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;

  return {
    isOnline: navigator.onLine,
    effectiveType: (connection?.effectiveType as NetworkStatus['effectiveType']) ?? null,
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
    saveData: connection?.saveData ?? false,
  };
}

function subscribeToNetworkStatus(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);

  const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
  connection?.addEventListener?.('change', callback);

  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
    connection?.removeEventListener?.('change', callback);
  };
}

/**
 * Hook to track network status
 */
export function useNetworkStatus(): NetworkStatus {
  const status = useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkStatus,
    () => ({
      isOnline: true,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: false,
    })
  );

  return status;
}

/**
 * Simple hook for just online/offline status
 */
export function useIsOnline(): boolean {
  return useNetworkStatus().isOnline;
}

/**
 * Hook to detect slow connections
 */
export function useIsSlowConnection(): boolean {
  const { effectiveType, saveData } = useNetworkStatus();
  return saveData || effectiveType === 'slow-2g' || effectiveType === '2g';
}

/**
 * Hook to run a callback when going online/offline
 */
export function useOnNetworkChange(
  onOnline?: () => void,
  onOffline?: () => void
): void {
  const wasOnline = useSyncExternalStore(
    subscribeToNetworkStatus,
    () => navigator.onLine,
    () => true
  );

  useEffect(() => {
    const handleOnline = () => onOnline?.();
    const handleOffline = () => onOffline?.();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);
}
