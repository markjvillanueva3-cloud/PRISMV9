/**
 * cadRegressionDashboard.ts — thin API client for CINF08 engine
 *
 * Matches the DashboardSnapshot + BatchSummary shapes exported by
 * src/engines/CADRegressionDashboardEngine.ts. The /api/v1/cad-regression/*
 * routes land in CINF12; for now the UI degrades to empty state when the
 * backend is unavailable.
 */

const API_BASE = '/api/v1';

export type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skip' | 'error';
export type ErrorType =
  | 'format'
  | 'parse'
  | 'generation'
  | 'comparison'
  | 'timeout'
  | 'crash'
  | 'none';
export type BatchLifecycleStatus = 'running' | 'completed' | 'empty';

export interface DashboardCounts {
  total: number;
  pending: number;
  running: number;
  pass: number;
  fail: number;
  skip: number;
  error: number;
}

export interface ErrorBreakdown {
  format: number;
  parse: number;
  generation: number;
  comparison: number;
  timeout: number;
  crash: number;
  unclassified: number;
}

export interface ThroughputEstimate {
  avgTerminalDurationMs: number | null;
  windowedCompletedCount: number;
  windowMinutes: number;
  filesPerMinute: number | null;
  etaMs: number | null;
}

export interface RecentFailure {
  fileId: string;
  status: 'fail' | 'error';
  errorType: ErrorType;
  durationMs: number;
  retries: number;
  completedAt: string | null;
}

export interface DashboardSnapshot {
  batchId: string;
  schemaVersion: 1;
  lifecycle: BatchLifecycleStatus;
  pctComplete: number;
  counts: DashboardCounts;
  errorBreakdown: ErrorBreakdown;
  throughput: ThroughputEstimate;
  recentFailures: RecentFailure[];
  createdAt: string;
  lastCheckpoint: string;
  updatedAt: string;
  snapshotAt: string;
}

export interface BatchSummary {
  batchId: string;
  lifecycle: BatchLifecycleStatus;
  total: number;
  completed: number;
  pctComplete: number;
  lastCheckpoint: string;
}

async function fetchJSON(path: string, body?: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchBatchList(): Promise<BatchSummary[]> {
  try {
    const raw = await fetchJSON('/cad-regression/list');
    if (raw && typeof raw === 'object' && 'data' in raw) {
      const data = (raw as { data: unknown }).data;
      if (Array.isArray(data)) return data as BatchSummary[];
    }
    return Array.isArray(raw) ? (raw as BatchSummary[]) : [];
  } catch {
    return [];
  }
}

export async function fetchSnapshot(
  batchId: string,
  windowMinutes?: number,
  recentLimit?: number,
): Promise<DashboardSnapshot | null> {
  try {
    const raw = await fetchJSON('/cad-regression/snapshot', {
      batchId,
      windowMinutes,
      recentLimit,
    });
    if (raw && typeof raw === 'object' && 'data' in raw) {
      return (raw as { data: DashboardSnapshot }).data;
    }
    return raw as DashboardSnapshot;
  } catch {
    return null;
  }
}
