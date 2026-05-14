/**
 * BIZ-MS1 U-BIZ10: Real-time job status hook
 * WebSocket with 10s polling fallback and exponential backoff reconnect.
 * Falls back to polling when WS endpoint unavailable.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveJobs } from '../api/client';
import type { JobTimeEntry } from '../api/types';

export type ConnectionStatus = 'connected' | 'polling' | 'disconnected';

interface UseJobStatusSocketResult {
  jobs: JobTimeEntry[];
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 10_000;
const WS_BACKOFF_BASE_MS = 1000;
const WS_BACKOFF_MAX_MS = 30_000;

export function useJobStatusSocket(
  employeeId: string,
  enabled: boolean,
): UseJobStatusSocketResult {
  const [jobs, setJobs] = useState<JobTimeEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isMounted = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(WS_BACKOFF_BASE_MS);

  const fetchJobs = useCallback(async () => {
    if (!employeeId || !isMounted.current) return;
    try {
      const res = await getActiveJobs(employeeId);
      const data = ((res as any).data ?? (res as any).result ?? []) as JobTimeEntry[];
      if (isMounted.current) {
        setJobs(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
      }
    } catch {
      // Silent fallback
    }
  }, [employeeId]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setConnectionStatus('polling');
    void fetchJobs();
    pollRef.current = setInterval(() => void fetchJobs(), POLL_INTERVAL_MS);
  }, [fetchJobs]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const connectWs = useCallback(() => {
    if (!enabled || !isMounted.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/erp/ws/job-status?employee_id=${employeeId}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) { ws.close(); return; }
        setConnectionStatus('connected');
        stopPolling();
        backoffRef.current = WS_BACKOFF_BASE_MS;
      };

      ws.onmessage = (event) => {
        if (!isMounted.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'job_update' && Array.isArray(msg.jobs)) {
            setJobs(msg.jobs);
            setLastUpdated(new Date());
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!isMounted.current) return;
        startPolling();
        // Reconnect with exponential backoff
        const delay = Math.min(backoffRef.current, WS_BACKOFF_MAX_MS);
        backoffRef.current = Math.min(backoffRef.current * 2, WS_BACKOFF_MAX_MS);
        setTimeout(() => { if (isMounted.current) connectWs(); }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WS not available — stay on polling
      startPolling();
    }
  }, [enabled, employeeId, startPolling, stopPolling]);

  useEffect(() => {
    isMounted.current = true;

    if (!enabled || !employeeId) {
      setJobs([]);
      setConnectionStatus('disconnected');
      return;
    }

    // Try WS first, fall back to polling
    connectWs();
    // Also start polling immediately (WS upgrade will stop it)
    startPolling();

    return () => {
      isMounted.current = false;
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, employeeId, connectWs, startPolling, stopPolling]);

  return { jobs, connectionStatus, lastUpdated, refresh: fetchJobs };
}
