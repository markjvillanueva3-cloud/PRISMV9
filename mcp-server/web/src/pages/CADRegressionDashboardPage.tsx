/**
 * CADRegressionDashboardPage.tsx — U-CINF09 thin UI
 *
 * Consumes the CINF08 DashboardSnapshot + BatchSummary shapes from
 * `api/cadRegressionDashboard.ts`. Keeps the page deliberately thin —
 * batch selector, count tiles, error breakdown, throughput line, and
 * a recent-failures table. Heavier analysis lands in CINF10/CINF11.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  fetchBatchList,
  fetchSnapshot,
  type BatchSummary,
  type DashboardSnapshot,
  type ErrorBreakdown,
  type DashboardCounts,
  type TestStatus,
} from '../api/cadRegressionDashboard';

const DEFAULT_WINDOW_MIN = 5;
const DEFAULT_RECENT_LIMIT = 10;

function formatMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatNumber(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function lifecycleChip(status: DashboardSnapshot['lifecycle'] | BatchSummary['lifecycle']) {
  if (status === 'running') {
    return { label: 'Running', cls: 'bg-amber-500/15 text-amber-300 border-amber-400/30' };
  }
  if (status === 'completed') {
    return { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' };
  }
  return { label: 'Empty', cls: 'bg-slate-500/15 text-slate-300 border-slate-400/30' };
}

function formatDateNullable(iso?: string | null): string {
  if (!iso) return '—';
  return formatDate(iso);
}

function statusPill(status: TestStatus | 'fail' | 'error') {
  return 'rounded border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-xs uppercase text-rose-200';
}

interface CountTileProps {
  label: string;
  value: number;
  tone: 'neutral' | 'running' | 'pass' | 'fail' | 'skip' | 'error';
}

function CountTile({ label, value, tone }: CountTileProps) {
  const toneMap: Record<CountTileProps['tone'], string> = {
    neutral: 'border-slate-400/20 text-slate-200',
    running: 'border-amber-400/30 text-amber-200',
    pass: 'border-emerald-400/30 text-emerald-200',
    fail: 'border-rose-400/30 text-rose-200',
    skip: 'border-slate-400/20 text-slate-300',
    error: 'border-rose-500/40 text-rose-100',
  };
  return (
    <div
      className={`rounded-lg border ${toneMap[tone]} bg-[rgba(2,6,23,0.78)] p-3`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ErrorRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className="relative flex-1 overflow-hidden rounded bg-slate-800/60">
        <div
          className="prism-spectrum-fill h-2 bg-rose-500/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs text-slate-300">{value}</span>
    </div>
  );
}

export function CADRegressionDashboardPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchBatchList()
      .then((list) => {
        if (!active) return;
        setBatches(list);
        if (list.length > 0 && !selectedBatch) {
          setSelectedBatch(list[0].batchId);
        }
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load batch list');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedBatch]);

  useEffect(() => {
    if (!selectedBatch) {
      setSnapshot(null);
      return;
    }
    let active = true;
    setRefreshing(true);
    fetchSnapshot(selectedBatch, DEFAULT_WINDOW_MIN, DEFAULT_RECENT_LIMIT)
      .then((snap) => {
        if (!active) return;
        setSnapshot(snap);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load snapshot');
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [selectedBatch]);

  const counts: DashboardCounts = useMemo(
    () =>
      snapshot?.counts ?? {
        total: 0,
        pending: 0,
        running: 0,
        pass: 0,
        fail: 0,
        skip: 0,
        error: 0,
      },
    [snapshot],
  );

  const errors: ErrorBreakdown = useMemo(
    () =>
      snapshot?.errorBreakdown ?? {
        format: 0,
        parse: 0,
        generation: 0,
        comparison: 0,
        timeout: 0,
        crash: 0,
        unclassified: 0,
      },
    [snapshot],
  );

  const totalErrors =
    errors.format +
    errors.parse +
    errors.generation +
    errors.comparison +
    errors.timeout +
    errors.crash +
    errors.unclassified;

  const lifecycle = snapshot?.lifecycle ?? 'empty';
  const chip = lifecycleChip(lifecycle);

  return (
    <div className="min-h-screen bg-[rgba(2,6,23,0.95)] p-6 text-slate-100">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            CAD Regression Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Real-time progress for CAD regression test batches. Select a batch
            to view counts, error breakdown, throughput, and recent failures.
          </p>
        </div>
        <span
          className={`prism-chip rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${chip.cls}`}
        >
          {chip.label}
        </span>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="mb-5 rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-4">
        <div className="flex items-center gap-3">
          <label htmlFor="batch-select" className="text-xs uppercase tracking-wide text-slate-400">
            Batch
          </label>
          <select
            id="batch-select"
            className="flex-1 rounded border border-white/10 bg-[rgba(2,6,23,0.92)] px-2 py-1 text-sm text-slate-100"
            value={selectedBatch ?? ''}
            onChange={(e) => setSelectedBatch(e.target.value || null)}
            disabled={loading}
          >
            {batches.length === 0 ? (
              <option value="">{loading ? 'Loading…' : 'No batches available'}</option>
            ) : (
              batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId.slice(0, 8)} — {b.lifecycle} ({b.completed}/{b.total} · {Math.round(b.pctComplete)}%)
                </option>
              ))
            )}
          </select>
          {refreshing && (
            <span className="text-xs text-slate-400">refreshing…</span>
          )}
        </div>
        {snapshot && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
            <span>Created: {formatDate(snapshot.createdAt)}</span>
            <span>Updated: {formatDate(snapshot.updatedAt)}</span>
            <span>Last checkpoint: {formatDate(snapshot.lastCheckpoint)}</span>
            <span>Progress: {Math.round(snapshot.pctComplete)}%</span>
          </div>
        )}
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <CountTile label="Total" value={counts.total} tone="neutral" />
        <CountTile label="Pending" value={counts.pending} tone="neutral" />
        <CountTile label="Running" value={counts.running} tone="running" />
        <CountTile label="Pass" value={counts.pass} tone="pass" />
        <CountTile label="Fail" value={counts.fail} tone="fail" />
        <CountTile label="Skip" value={counts.skip} tone="skip" />
        <CountTile label="Error" value={counts.error} tone="error" />
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Error breakdown
          </h2>
          <div className="space-y-2">
            <ErrorRow label="Format" value={errors.format} total={totalErrors} />
            <ErrorRow label="Parse" value={errors.parse} total={totalErrors} />
            <ErrorRow label="Generation" value={errors.generation} total={totalErrors} />
            <ErrorRow label="Comparison" value={errors.comparison} total={totalErrors} />
            <ErrorRow label="Timeout" value={errors.timeout} total={totalErrors} />
            <ErrorRow label="Crash" value={errors.crash} total={totalErrors} />
            <ErrorRow label="Unclassified" value={errors.unclassified} total={totalErrors} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Throughput
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Avg duration</dt>
              <dd className="mt-1 text-lg">{formatMs(snapshot?.throughput.avgTerminalDurationMs)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Files/min (last 5m)</dt>
              <dd className="mt-1 text-lg">{formatNumber(snapshot?.throughput.filesPerMinute)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Windowed completed</dt>
              <dd className="mt-1 text-lg">{snapshot?.throughput.windowedCompletedCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">ETA</dt>
              <dd className="mt-1 text-lg">{formatMs(snapshot?.throughput.etaMs)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Recent failures
        </h2>
        {!snapshot || snapshot.recentFailures.length === 0 ? (
          <p className="text-sm text-slate-400">No failures to display.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 text-left">File</th>
                  <th className="py-2 pr-4 text-left">Status</th>
                  <th className="py-2 pr-4 text-left">Error type</th>
                  <th className="py-2 pr-4 text-left">Retries</th>
                  <th className="py-2 pr-4 text-right">Duration</th>
                  <th className="py-2 pr-4 text-left">Completed</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentFailures.map((f) => (
                  <tr key={f.fileId} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-mono text-xs">{f.fileId}</td>
                    <td className="py-2 pr-4">
                      <span className={statusPill(f.status)}>{f.status}</span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-300">{f.errorType}</td>
                    <td className="py-2 pr-4 text-xs text-slate-300">{f.retries}</td>
                    <td className="py-2 pr-4 text-right text-xs text-slate-300">
                      {formatMs(f.durationMs)}
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-400">
                      {formatDateNullable(f.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
