/**
 * INTEG-MS6 U-INTEG30: Sync Status Indicator
 *
 * Persistent UI indicator showing online/offline/syncing/conflict states.
 * Follows Calculator Studio design language.
 */

import { useCallback, useEffect, useState } from 'react';
import { useOptimisticSync } from '../hooks/useOptimisticSync';
import { optimisticSyncManager, type ConflictInfo, type OptimisticUpdate } from '../lib/OptimisticSyncManager';

interface SyncStatusIndicatorProps {
  /** Show full status bar (default) or compact dot only */
  variant?: 'full' | 'compact' | 'minimal';
  /** Position for fixed indicator */
  position?: 'top-right' | 'bottom-right' | 'bottom-left';
  /** Whether to show conflict resolution dialog */
  showConflictDialog?: boolean;
}

export function SyncStatusIndicator({
  variant = 'full',
  position,
  showConflictDialog = true,
}: SyncStatusIndicatorProps) {
  const { status, pendingCount, conflictCount, isSyncing, syncNow } = useOptimisticSync();
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ updateId: string; update: OptimisticUpdate; conflict: ConflictInfo }>>([]);

  useEffect(() => {
    setConflicts(optimisticSyncManager.getConflicts());
  }, [conflictCount]);

  // Status colors following Calculator Studio theme
  const statusConfig: Record<string, { color: string; glow: string; text: string; icon: string; animate?: boolean }> = {
    online: {
      color: 'bg-emerald-400',
      glow: 'shadow-emerald-400/50',
      text: 'Online',
      icon: '●',
    },
    offline: {
      color: 'bg-slate-400',
      glow: 'shadow-slate-400/50',
      text: 'Offline',
      icon: '○',
    },
    syncing: {
      color: 'bg-cyan-400',
      glow: 'shadow-cyan-400/50',
      text: 'Syncing...',
      icon: '◐',
      animate: true,
    },
    conflict: {
      color: 'bg-amber-400',
      glow: 'shadow-amber-400/50',
      text: 'Conflicts',
      icon: '⚠',
    },
    error: {
      color: 'bg-red-400',
      glow: 'shadow-red-400/50',
      text: 'Sync Error',
      icon: '✕',
    },
  };

  const config = statusConfig[status];
  const positionClasses = position ? {
    'top-right': 'fixed top-4 right-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
  }[position] : '';

  const handleResolveConflict = useCallback(async (
    updateId: string,
    resolution: 'client_wins' | 'server_wins',
  ) => {
    await optimisticSyncManager.resolveConflict(updateId, resolution);
    setConflicts(optimisticSyncManager.getConflicts());
  }, []);

  // Minimal variant - just a dot
  if (variant === 'minimal') {
    return (
      <div className={`${positionClasses}`}>
        <div
          className={`w-2 h-2 rounded-full ${config.color} ${config.animate ? 'animate-pulse' : ''}`}
          title={config.text}
        />
      </div>
    );
  }

  // Compact variant - dot with count badge
  if (variant === 'compact') {
    return (
      <div className={`${positionClasses} flex items-center gap-2`}>
        <div className="relative">
          <div
            className={`w-3 h-3 rounded-full ${config.color} ${config.glow} shadow-lg ${config.animate ? 'animate-pulse' : ''}`}
          />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-violet-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>
        {conflictCount > 0 && showConflictDialog && (
          <button
            onClick={() => setShowConflicts(true)}
            className="text-amber-400 text-xs hover:underline"
          >
            {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    );
  }

  // Full variant - status bar with details
  return (
    <>
      <div className={`${positionClasses} bg-[rgba(2,6,23,0.95)] border border-white/10 rounded-lg px-3 py-2 backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${config.color} ${config.glow} shadow-lg ${config.animate ? 'animate-pulse' : ''}`}
            />
            <span className="text-sm text-slate-300">{config.text}</span>
          </div>

          {/* Pending count */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="text-violet-400">{pendingCount}</span>
              <span>pending</span>
            </div>
          )}

          {/* Conflict badge */}
          {conflictCount > 0 && (
            <button
              onClick={() => setShowConflicts(true)}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>⚠</span>
              <span>{conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Sync button (when offline with pending) */}
          {status === 'offline' && pendingCount > 0 && (
            <span className="text-xs text-slate-500">Will sync when online</span>
          )}

          {/* Manual sync button */}
          {status === 'online' && pendingCount > 0 && !isSyncing && (
            <button
              onClick={syncNow}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Sync now
            </button>
          )}
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      {showConflicts && showConflictDialog && conflicts.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[rgba(2,6,23,0.98)] border border-white/10 rounded-xl max-w-lg w-full mx-4 shadow-2xl">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Resolve Conflicts</h3>
              <button
                onClick={() => setShowConflicts(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {conflicts.map(({ updateId, update, conflict }) => (
                <div
                  key={updateId}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
                >
                  <div className="text-sm text-slate-300 mb-2">
                    <span className="text-violet-400">{update.entityType}</span>
                    <span className="text-slate-500 mx-1">•</span>
                    <span>{update.entityId}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-xs">
                      <div className="text-amber-400 mb-1">Server Value</div>
                      <div className="bg-slate-900 rounded p-2 text-slate-300 font-mono text-[11px] overflow-auto max-h-20">
                        {JSON.stringify(conflict.serverValue, null, 2)}
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="text-cyan-400 mb-1">Your Changes</div>
                      <div className="bg-slate-900 rounded p-2 text-slate-300 font-mono text-[11px] overflow-auto max-h-20">
                        {JSON.stringify(conflict.clientValue, null, 2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveConflict(updateId, 'server_wins')}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                      Keep Server
                    </button>
                    <button
                      onClick={() => handleResolveConflict(updateId, 'client_wins')}
                      className="flex-1 px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                    >
                      Keep Mine
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowConflicts(false)}
                className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Simplified offline banner for header integration.
 */
export function OfflineBanner() {
  const { status, pendingCount } = useOptimisticSync();

  if (status === 'online' && pendingCount === 0) {
    return null;
  }

  if (status === 'offline') {
    return (
      <div className="bg-slate-800 text-slate-300 text-sm py-1.5 px-4 text-center">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          You're offline.
          {pendingCount > 0 && ` ${pendingCount} change${pendingCount !== 1 ? 's' : ''} will sync when reconnected.`}
        </span>
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div className="bg-cyan-900/50 text-cyan-300 text-sm py-1.5 px-4 text-center">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...
        </span>
      </div>
    );
  }

  return null;
}
