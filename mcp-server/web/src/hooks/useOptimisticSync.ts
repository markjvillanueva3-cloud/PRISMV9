/**
 * INTEG-MS6 U-INTEG28: Optimistic Updates React Hook
 *
 * Provides optimistic state management for React components.
 * Updates UI immediately, reverts on server rejection.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  optimisticSyncManager,
  type SyncEvent,
  type SyncStatus,
} from '../lib/OptimisticSyncManager';

export interface UseOptimisticSyncResult {
  /** Current sync status */
  status: SyncStatus;
  /** Number of pending updates */
  pendingCount: number;
  /** Number of unresolved conflicts */
  conflictCount: number;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Apply an optimistic update */
  applyUpdate: <T>(params: {
    entityType: string;
    entityId: string;
    optimisticValue: T;
    originalValue: T;
    action_type: string;
    payload: Record<string, unknown>;
  }) => Promise<string>;
  /** Get optimistic value for an entity */
  getOptimisticValue: <T>(entityType: string, entityId: string) => T | undefined;
  /** Check if entity has pending update */
  hasPending: (entityType: string, entityId: string) => boolean;
  /** Force sync now */
  syncNow: () => Promise<void>;
}

/**
 * Hook for managing optimistic updates with automatic sync.
 */
export function useOptimisticSync(): UseOptimisticSyncResult {
  const [status, setStatus] = useState<SyncStatus>(optimisticSyncManager.getStatus());
  const [pendingCount, setPendingCount] = useState(optimisticSyncManager.getPendingCount());
  const [conflictCount, setConflictCount] = useState(optimisticSyncManager.getConflictCount());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const handleEvent = (event: SyncEvent) => {
      if (!mountedRef.current) return;

      switch (event.type) {
        case 'status_change':
          if (event.status) setStatus(event.status);
          break;
        case 'queue_change':
          if (typeof event.pendingCount === 'number') setPendingCount(event.pendingCount);
          setConflictCount(optimisticSyncManager.getConflictCount());
          break;
        case 'conflict_detected':
          setConflictCount(optimisticSyncManager.getConflictCount());
          break;
        case 'update_confirmed':
        case 'update_rejected':
          setPendingCount(optimisticSyncManager.getPendingCount());
          setConflictCount(optimisticSyncManager.getConflictCount());
          break;
      }
    };

    const unsubscribe = optimisticSyncManager.subscribe(handleEvent);

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const applyUpdate = useCallback(async <T>(params: {
    entityType: string;
    entityId: string;
    optimisticValue: T;
    originalValue: T;
    action_type: string;
    payload: Record<string, unknown>;
  }): Promise<string> => {
    return optimisticSyncManager.applyOptimistic(params);
  }, []);

  const getOptimisticValue = useCallback(<T>(entityType: string, entityId: string): T | undefined => {
    return optimisticSyncManager.getOptimisticValue<T>(entityType, entityId);
  }, []);

  const hasPending = useCallback((entityType: string, entityId: string): boolean => {
    return optimisticSyncManager.hasPendingUpdate(entityType, entityId);
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    await optimisticSyncManager.syncNow();
  }, []);

  return {
    status,
    pendingCount,
    conflictCount,
    isSyncing: status === 'syncing',
    applyUpdate,
    getOptimisticValue,
    hasPending,
    syncNow,
  };
}

// ============================================================================
// ENTITY-SPECIFIC HOOK
// ============================================================================

export interface UseOptimisticEntityResult<T> {
  /** Current value (optimistic if pending, otherwise server) */
  value: T;
  /** Whether this entity has a pending update */
  isPending: boolean;
  /** Apply an optimistic update to this entity */
  update: (newValue: T, action_type: string, payload: Record<string, unknown>) => Promise<void>;
}

/**
 * Hook for optimistic updates on a specific entity.
 * Provides merged optimistic/server state.
 */
export function useOptimisticEntity<T>(
  entityType: string,
  entityId: string,
  serverValue: T,
): UseOptimisticEntityResult<T> {
  const [localValue, setLocalValue] = useState<T | undefined>();
  const [isPending, setIsPending] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Check for existing optimistic value
    const optimistic = optimisticSyncManager.getOptimisticValue<T>(entityType, entityId);
    if (optimistic !== undefined) {
      setLocalValue(optimistic);
      setIsPending(true);
    }

    const handleEvent = (event: SyncEvent) => {
      if (!mountedRef.current) return;

      if (event.update?.entityType === entityType && event.update?.entityId === entityId) {
        if (event.type === 'update_confirmed' || event.type === 'update_rejected') {
          setLocalValue(undefined);
          setIsPending(false);
        }
      }
    };

    const unsubscribe = optimisticSyncManager.subscribe(handleEvent);

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [entityType, entityId]);

  const update = useCallback(async (
    newValue: T,
    action_type: string,
    payload: Record<string, unknown>,
  ): Promise<void> => {
    setLocalValue(newValue);
    setIsPending(true);

    await optimisticSyncManager.applyOptimistic({
      entityType,
      entityId,
      optimisticValue: newValue,
      originalValue: serverValue,
      action_type,
      payload,
    });
  }, [entityType, entityId, serverValue]);

  return {
    value: localValue !== undefined ? localValue : serverValue,
    isPending,
    update,
  };
}
