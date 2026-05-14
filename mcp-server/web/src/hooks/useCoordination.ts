/**
 * useCoordination — Hook for WEDM coordination substrate state
 * MS-P1-FRONT-WIRE U-P1-FW-05
 *
 * Provides access to the coordination substrate state (ledger, blackboard, bridge).
 * Auto-refreshes when enabled. Used by AI Reasoning panels.
 */

import { useState, useEffect, useCallback } from "react";
import {
  coordinationApi,
  type CoordinationSnapshot,
  type ReasoningTraceEntry,
  type BlackboardEntry,
} from "../api/wedmCoordination";

export interface UseCoordinationOptions {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  maxLedgerEntries?: number;
  blackboardPrefix?: string;
}

export interface UseCoordinationResult {
  snapshot: CoordinationSnapshot | null;
  ledgerEntries: ReasoningTraceEntry[];
  blackboardEntries: BlackboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastRefreshAt: Date | null;
}

export function useCoordination(options: UseCoordinationOptions = {}): UseCoordinationResult {
  const {
    autoRefresh = false,
    refreshIntervalMs = 5000,
    maxLedgerEntries = 25,
    blackboardPrefix = "wedm",
  } = options;

  const [snapshot, setSnapshot] = useState<CoordinationSnapshot | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<ReasoningTraceEntry[]>([]);
  const [blackboardEntries, setBlackboardEntries] = useState<BlackboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [snapshotRes, ledgerRes, blackboardRes] = await Promise.all([
        coordinationApi.getSnapshot(),
        coordinationApi.getLedgerRecent(maxLedgerEntries),
        coordinationApi.queryBlackboard(blackboardPrefix),
      ]);

      if (snapshotRes.ok) setSnapshot(snapshotRes.data);
      else setError(snapshotRes.error);

      if (ledgerRes.ok) setLedgerEntries(ledgerRes.data);
      if (blackboardRes.ok) setBlackboardEntries(blackboardRes.data);

      setLastRefreshAt(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [maxLedgerEntries, blackboardPrefix]);

  useEffect(() => {
    refresh();
    if (!autoRefresh) return;
    const interval = setInterval(refresh, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, refresh]);

  return {
    snapshot,
    ledgerEntries,
    blackboardEntries,
    loading,
    error,
    refresh,
    lastRefreshAt,
  };
}
