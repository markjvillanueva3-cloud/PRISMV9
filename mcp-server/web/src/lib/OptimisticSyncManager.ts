/**
 * INTEG-MS6: Optimistic Sync Manager
 *
 * Provides optimistic updates with automatic rollback on server rejection.
 * Integrates with OfflineQueueManager for offline support.
 *
 * U-INTEG27: Enhanced Offline Queue — retry metadata, FIFO replay
 * U-INTEG28: Optimistic Updates — immediate UI updates, revert on rejection
 * U-INTEG29: Conflict Resolution — last-write-wins with conflict notification
 */

import { offlineQueueManager } from './OfflineQueueManager';

// ============================================================================
// TYPES
// ============================================================================

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'conflict' | 'error';

export interface OptimisticUpdate<T = unknown> {
  id: string;
  entityType: string;
  entityId: string;
  optimisticValue: T;
  originalValue: T;
  action_type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'pending' | 'syncing' | 'confirmed' | 'rejected' | 'conflict';
  retryCount: number;
  maxRetries: number;
  conflictData?: ConflictInfo;
}

export interface ConflictInfo {
  serverValue: unknown;
  clientValue: unknown;
  serverTimestamp: string;
  resolution?: 'client_wins' | 'server_wins' | 'manual';
  resolvedAt?: string;
}

export interface SyncEvent {
  type: 'status_change' | 'update_confirmed' | 'update_rejected' | 'conflict_detected' | 'queue_change';
  status?: SyncStatus;
  update?: OptimisticUpdate;
  conflict?: ConflictInfo;
  pendingCount?: number;
}

type SyncEventListener = (event: SyncEvent) => void;

// ============================================================================
// OPTIMISTIC SYNC MANAGER
// ============================================================================

class OptimisticSyncManagerImpl {
  private status: SyncStatus = 'online';
  private pendingUpdates: Map<string, OptimisticUpdate> = new Map();
  private listeners: Set<SyncEventListener> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress: boolean = false;
  private conflicts: Map<string, ConflictInfo> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Apply an optimistic update immediately and queue for server sync.
   * Returns the update ID for tracking.
   */
  async applyOptimistic<T>(params: {
    entityType: string;
    entityId: string;
    optimisticValue: T;
    originalValue: T;
    action_type: string;
    payload: Record<string, unknown>;
    maxRetries?: number;
  }): Promise<string> {
    const id = `${params.entityType}:${params.entityId}:${Date.now()}`;

    const update: OptimisticUpdate<T> = {
      id,
      entityType: params.entityType,
      entityId: params.entityId,
      optimisticValue: params.optimisticValue,
      originalValue: params.originalValue,
      action_type: params.action_type,
      payload: params.payload,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      maxRetries: params.maxRetries ?? 3,
    };

    this.pendingUpdates.set(id, update as OptimisticUpdate);

    // Queue in IndexedDB for persistence across sessions
    await offlineQueueManager.enqueue(params.action_type, {
      ...params.payload,
      __optimistic_id: id,
      __original_value: params.originalValue,
      __client_timestamp: update.timestamp,
    });

    this.emit({ type: 'queue_change', pendingCount: this.pendingUpdates.size });

    // If online, attempt immediate sync
    if (this.isOnline && !this.syncInProgress) {
      void this.syncPending();
    }

    return id;
  }

  /**
   * Get current optimistic value for an entity, or undefined if no pending update.
   */
  getOptimisticValue<T>(entityType: string, entityId: string): T | undefined {
    for (const update of this.pendingUpdates.values()) {
      if (update.entityType === entityType && update.entityId === entityId && update.status === 'pending') {
        return update.optimisticValue as T;
      }
    }
    return undefined;
  }

  /**
   * Check if entity has pending optimistic updates.
   */
  hasPendingUpdate(entityType: string, entityId: string): boolean {
    for (const update of this.pendingUpdates.values()) {
      if (update.entityType === entityType && update.entityId === entityId && update.status === 'pending') {
        return true;
      }
    }
    return false;
  }

  /**
   * Manually confirm an update (when server confirms success).
   */
  confirmUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (update) {
      update.status = 'confirmed';
      this.pendingUpdates.delete(updateId);
      this.emit({ type: 'update_confirmed', update });
      this.emit({ type: 'queue_change', pendingCount: this.pendingUpdates.size });
    }
  }

  /**
   * Reject an update and trigger rollback.
   */
  rejectUpdate(updateId: string, _serverValue?: unknown): void {
    const update = this.pendingUpdates.get(updateId);
    if (update) {
      update.status = 'rejected';
      this.pendingUpdates.delete(updateId);
      this.emit({ type: 'update_rejected', update });
      this.emit({ type: 'queue_change', pendingCount: this.pendingUpdates.size });
    }
  }

  /**
   * Mark an update as conflicted.
   */
  markConflict(updateId: string, serverValue: unknown, serverTimestamp: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (update) {
      const conflict: ConflictInfo = {
        serverValue,
        clientValue: update.optimisticValue,
        serverTimestamp,
      };
      update.status = 'conflict';
      update.conflictData = conflict;
      this.conflicts.set(updateId, conflict);
      this.updateStatus('conflict');
      this.emit({ type: 'conflict_detected', update, conflict });
    }
  }

  /**
   * Resolve a conflict with specified strategy.
   */
  async resolveConflict(
    updateId: string,
    resolution: 'client_wins' | 'server_wins' | 'manual',
    manualValue?: unknown,
  ): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update || !update.conflictData) return;

    update.conflictData.resolution = resolution;
    update.conflictData.resolvedAt = new Date().toISOString();

    if (resolution === 'server_wins') {
      // Accept server value, remove from pending
      this.pendingUpdates.delete(updateId);
      this.conflicts.delete(updateId);
    } else if (resolution === 'client_wins' || resolution === 'manual') {
      // Re-queue with client/manual value
      const newPayload = {
        ...update.payload,
        __conflict_resolution: resolution,
        __resolved_value: resolution === 'manual' ? manualValue : update.optimisticValue,
        __force_overwrite: true,
      };
      update.status = 'pending';
      update.retryCount = 0;
      update.payload = newPayload;
      if (resolution === 'manual' && manualValue !== undefined) {
        update.optimisticValue = manualValue;
      }
      this.conflicts.delete(updateId);

      // Re-attempt sync
      if (this.isOnline) {
        void this.syncPending();
      }
    }

    // Clear conflict status if no more conflicts
    if (this.conflicts.size === 0 && this.status === 'conflict') {
      this.updateStatus(this.isOnline ? 'online' : 'offline');
    }
  }

  /**
   * Get all pending conflicts.
   */
  getConflicts(): Array<{ updateId: string; update: OptimisticUpdate; conflict: ConflictInfo }> {
    return Array.from(this.pendingUpdates.entries())
      .filter(([, u]) => u.status === 'conflict' && u.conflictData)
      .map(([id, u]) => ({ updateId: id, update: u, conflict: u.conflictData! }));
  }

  /**
   * Get current sync status.
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Get count of pending updates.
   */
  getPendingCount(): number {
    return Array.from(this.pendingUpdates.values()).filter(u => u.status === 'pending').length;
  }

  /**
   * Get count of conflicts.
   */
  getConflictCount(): number {
    return this.conflicts.size;
  }

  /**
   * Subscribe to sync events.
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    // Immediately notify current state
    listener({ type: 'status_change', status: this.status });
    listener({ type: 'queue_change', pendingCount: this.pendingUpdates.size });
    return () => this.listeners.delete(listener);
  }

  /**
   * Force sync all pending updates.
   */
  async syncNow(): Promise<{ synced: number; failed: number; conflicts: number }> {
    return this.syncPending();
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private handleOnline = (): void => {
    this.isOnline = true;
    this.updateStatus('syncing');
    void this.syncPending().then(() => {
      if (this.conflicts.size > 0) {
        this.updateStatus('conflict');
      } else {
        this.updateStatus('online');
      }
    });
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.updateStatus('offline');
  };

  private updateStatus(status: SyncStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit({ type: 'status_change', status });
    }
  }

  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[OptimisticSyncManager] Listener error:', e);
      }
    }
  }

  private async syncPending(): Promise<{ synced: number; failed: number; conflicts: number }> {
    if (this.syncInProgress || !this.isOnline) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    this.syncInProgress = true;
    this.updateStatus('syncing');

    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // Replay through OfflineQueueManager
      const result = await offlineQueueManager.replayAll(async (action_type, payload) => {
        const optimisticId = payload.__optimistic_id as string | undefined;
        const clientTimestamp = payload.__client_timestamp as string | undefined;

        // Remove internal tracking fields before sending
        const cleanPayload = { ...payload };
        delete cleanPayload.__optimistic_id;
        delete cleanPayload.__original_value;
        delete cleanPayload.__client_timestamp;
        delete cleanPayload.__conflict_resolution;
        delete cleanPayload.__resolved_value;
        delete cleanPayload.__force_overwrite;

        try {
          const res = await fetch(`/api/v1/erp/${action_type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanPayload),
          });

          if (res.ok) {
            if (optimisticId) {
              this.confirmUpdate(optimisticId);
            }
            synced++;
          } else if (res.status === 409) {
            // Conflict — check if we should apply last-write-wins
            const serverData = await res.json().catch(() => ({}));
            if (optimisticId && serverData.server_timestamp) {
              // Compare timestamps for last-write-wins
              if (clientTimestamp && clientTimestamp > serverData.server_timestamp) {
                // Client is newer, force overwrite on retry
                return new Response(null, { status: 409 });
              } else {
                // Server is newer, mark as conflict for user resolution
                this.markConflict(optimisticId, serverData.value, serverData.server_timestamp);
                conflicts++;
              }
            }
          } else {
            if (optimisticId) {
              const update = this.pendingUpdates.get(optimisticId);
              if (update && update.retryCount < update.maxRetries) {
                update.retryCount++;
              } else if (update) {
                this.rejectUpdate(optimisticId);
                failed++;
              }
            }
          }

          return res;
        } catch (e) {
          // Network error, keep in queue
          return new Response(null, { status: 503 });
        }
      });

      synced = result.replayed;
      failed += result.failed;
    } finally {
      this.syncInProgress = false;
      if (conflicts > 0) {
        this.updateStatus('conflict');
      } else if (failed > 0) {
        this.updateStatus('error');
      } else {
        this.updateStatus(this.isOnline ? 'online' : 'offline');
      }
    }

    return { synced, failed, conflicts };
  }
}

export const optimisticSyncManager = new OptimisticSyncManagerImpl();
