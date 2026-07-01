/**
 * CADAIStatePage.tsx — U-CADC-AI04 thin UI
 *
 * Live inspector for the CADAIStateMachineEngine. Polls the current
 * session snapshot + recent transition log every 2s (cheap enough for
 * an FSM with ≤1 tick/sec expected workload). Exposes the six
 * forward events + pause/resume/reset so an operator can drive a
 * session manually while debugging.
 */

import { useEffect, useMemo, useState } from 'react';
import { GatedError } from '../components/entitlement';
import {
  fsmList,
  fsmOpen,
  fsmSnapshot,
  fsmLog,
  fsmAllowedEvents,
  fsmDispatch,
  type CADAIEvent,
  type CADAIState,
  type FSMSnapshot,
  type TransitionEvent,
} from '../api/cadAIStateMachine';

const STATE_COLORS: Record<CADAIState, string> = {
  IDLE: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  DECOMPOSING: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  PLANNING: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  EXECUTING: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  VALIDATING: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  LEARNING: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-400/30',
  COMPLETE: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
};

function formatAt(ms: number | null | undefined): string {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleTimeString();
  } catch {
    return String(ms);
  }
}

export default function CADAIStatePage() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<FSMSnapshot | null>(null);
  const [log, setLog] = useState<TransitionEvent[]>([]);
  const [allowed, setAllowed] = useState<CADAIEvent[]>([]);
  const [newSessionId, setNewSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    async function refreshList() {
      try {
        const r = await fsmList();
        if (!active) return;
        setSessions(r.sessions);
        if (!selected && r.sessions.length > 0) setSelected(r.sessions[0]!);
      } catch (e) {
        setGateError(e);
        setError((e as Error).message);
      }
    }
    refreshList();
    const t = setInterval(refreshList, 2000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    async function pull() {
      try {
        const [snap, logRes, allowedRes] = await Promise.all([
          fsmSnapshot(selected!),
          fsmLog(selected!, 25),
          fsmAllowedEvents(selected!),
        ]);
        if (!active) return;
        setSnapshot(snap);
        setLog(logRes.log);
        setAllowed(allowedRes.events);
        setError(null);
        setGateError(null);
      } catch (e) {
        setGateError(e);
        setError((e as Error).message);
      }
    }
    pull();
    const t = setInterval(pull, 2000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [selected]);

  async function handleOpen() {
    if (!newSessionId.trim()) return;
    try {
      await fsmOpen(newSessionId.trim());
      setSelected(newSessionId.trim());
      setNewSessionId('');
    } catch (e) {
      setGateError(e);
      setError((e as Error).message);
    }
  }

  async function handleDispatch(event: CADAIEvent) {
    if (!selected) return;
    try {
      const snap = await fsmDispatch(selected, event);
      setSnapshot(snap);
    } catch (e) {
      setGateError(e);
      setError((e as Error).message);
    }
  }

  const stateChip = useMemo(() => {
    if (!snapshot) return null;
    const cls = STATE_COLORS[snapshot.state] ?? STATE_COLORS.IDLE;
    return (
      <span className={`inline-block px-3 py-1 rounded border text-sm font-mono ${cls}`}>
        {snapshot.state}
        {snapshot.paused ? ' (paused)' : ''}
      </span>
    );
  }, [snapshot]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-slate-100">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">CAD AI State Machine</h1>
        <span className="text-xs text-slate-400">U-CADC-AI04</span>
      </header>

      {error && (
        <GatedError error={gateError} feature='cadcam' fallback={
          <div className="border border-red-400/30 bg-red-500/10 text-red-300 rounded px-4 py-2 text-sm">
            {error}
          </div>
        } />
      )}

      <section className="space-y-2">
        <label className="text-sm text-slate-300 flex items-center gap-2">
          Session:
          <select
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1"
            value={selected ?? ''}
            onChange={(e) => setSelected(e.target.value || null)}
          >
            <option value="">(none)</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
            placeholder="new session id"
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
          />
          <button
            onClick={handleOpen}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
            disabled={!newSessionId.trim()}
          >
            open
          </button>
        </label>
      </section>

      {snapshot ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-700 rounded p-4 space-y-2">
            <div className="flex items-center gap-2">State: {stateChip}</div>
            <div className="text-sm text-slate-400">
              Transitions: {snapshot.transitionCount} · Started:{' '}
              {formatAt(snapshot.startedAt)} · Last: {formatAt(snapshot.lastTransitionAt)}
            </div>
            {snapshot.failedReason && (
              <div className="text-sm text-red-300">reason: {snapshot.failedReason}</div>
            )}
          </div>
          <div className="border border-slate-700 rounded p-4 space-y-2">
            <h3 className="text-sm font-semibold">Dispatch</h3>
            <div className="flex flex-wrap gap-2">
              {allowed.map((e) => (
                <button
                  key={e}
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs font-mono"
                  onClick={() => handleDispatch(e)}
                >
                  {e}
                </button>
              ))}
              {allowed.length === 0 && (
                <span className="text-xs text-slate-400">(terminal — reset to restart)</span>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="text-sm text-slate-400">No session selected.</div>
      )}

      <section className="border border-slate-700 rounded p-4">
        <h3 className="text-sm font-semibold mb-2">Recent transitions</h3>
        <table className="w-full text-xs font-mono">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left">#</th>
              <th className="text-left">at</th>
              <th className="text-left">from → to</th>
              <th className="text-left">event</th>
            </tr>
          </thead>
          <tbody>
            {log
              .slice()
              .reverse()
              .map((ev) => (
                <tr
                  key={ev.id}
                  className={ev.refusedDueToPause ? 'text-amber-300' : 'text-slate-200'}
                >
                  <td>{ev.id}</td>
                  <td>{formatAt(ev.at)}</td>
                  <td>
                    {ev.from} → {ev.to}
                  </td>
                  <td>{ev.event}</td>
                </tr>
              ))}
            {log.length === 0 && (
              <tr>
                <td className="text-slate-500" colSpan={4}>
                  (no transitions yet)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
