/**
 * EMP-MS0 U-CLK1: Shift Clock Widget
 * Always-visible IN/OUT badge with timer, clock buttons,
 * handoff checklist on clock-out, and 12-hr fatigue gate.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { shiftClockIn, shiftClockOut, getShiftHandoff } from '../../api/client';
import { ActionButton } from '../workspace/WorkspacePrimitives';

interface ShiftClockWidgetProps {
  employeeId: string;
  employeeName: string;
  /** Called after successful clock-in/out to refresh parent state */
  onStatusChange?: () => void;
}

const FATIGUE_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ShiftClockWidget({ employeeId, employeeName, onStatusChange }: ShiftClockWidgetProps) {
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftStart, setShiftStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffNotes, setHandoffNotes] = useState('');
  const [fatigueWarning, setFatigueWarning] = useState(false);
  const [prevHandoff, setPrevHandoff] = useState<{ notes: string; operator: string; time: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch previous shift's handoff notes
  useEffect(() => {
    if (!clockedIn) {
      getShiftHandoff(employeeId).then(res => {
        const d = res?.data;
        if (d?.previous_handoff_notes) {
          setPrevHandoff({
            notes: d.previous_handoff_notes,
            operator: d.previous_shift?.employee_id ?? 'Previous operator',
            time: d.previous_shift?.clock_out ?? '',
          });
        } else {
          setPrevHandoff(null);
        }
      }).catch(() => setPrevHandoff(null));
    }
  }, [employeeId, clockedIn]);

  // Live timer
  useEffect(() => {
    if (clockedIn && shiftStart) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = now - shiftStart;
        setElapsed(diff);
        if (diff >= FATIGUE_LIMIT_MS && !fatigueWarning) {
          setFatigueWarning(true);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clockedIn, shiftStart, fatigueWarning]);

  const handleClockIn = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await shiftClockIn({ employee_id: employeeId });
      setClockedIn(true);
      setShiftStart(Date.now());
      setElapsed(0);
      setFatigueWarning(false);
      onStatusChange?.();
    } catch (e: any) {
      setError(e.message ?? 'Clock-in failed');
    } finally {
      setLoading(false);
    }
  }, [employeeId, onStatusChange]);

  const handleClockOut = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await shiftClockOut({ employee_id: employeeId, handoff_notes: handoffNotes || undefined });
      setClockedIn(false);
      setShiftStart(null);
      setElapsed(0);
      setShowHandoff(false);
      setHandoffNotes('');
      setFatigueWarning(false);
      onStatusChange?.();
    } catch (e: any) {
      setError(e.message ?? 'Clock-out failed');
    } finally {
      setLoading(false);
    }
  }, [employeeId, onStatusChange]);

  const isFatigued = elapsed >= FATIGUE_LIMIT_MS;

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
      {/* Status badge + timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 items-center rounded-full px-4 text-sm font-bold ${
              clockedIn
                ? 'border border-emerald-400/30 bg-emerald-400/15 text-emerald-300'
                : 'border border-slate-500/30 bg-slate-500/15 text-slate-400'
            }`}
          >
            {clockedIn ? 'IN' : 'OUT'}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">{employeeName}</div>
            <div className="text-xs text-slate-400">{employeeId}</div>
          </div>
        </div>

        {clockedIn && (
          <div className={`font-mono text-2xl font-bold ${isFatigued ? 'text-red-400' : 'text-slate-100'}`}>
            {formatElapsed(elapsed)}
          </div>
        )}
      </div>

      {/* Previous shift handoff notes */}
      {!clockedIn && prevHandoff && (
        <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          <div className="font-semibold">Handoff from {prevHandoff.operator}{prevHandoff.time ? ` at ${new Date(prevHandoff.time).toLocaleTimeString()}` : ''}</div>
          <div className="mt-1 text-amber-100/80">{prevHandoff.notes}</div>
        </div>
      )}

      {/* Fatigue gate warning */}
      {fatigueWarning && (
        <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          12-hour fatigue limit reached. Please clock out for safety.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Clock buttons */}
      <div className="mt-4 flex gap-3">
        {!clockedIn ? (
          <ActionButton onClick={() => void handleClockIn()} disabled={loading} tone="emerald">
            {loading ? 'Clocking in...' : 'Clock In'}
          </ActionButton>
        ) : (
          <ActionButton
            onClick={() => setShowHandoff(true)}
            disabled={loading}
            tone="rose"
          >
            Clock Out
          </ActionButton>
        )}
      </div>

      {/* Handoff checklist modal */}
      {showHandoff && (
        <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4">
          <div className="mb-3 text-sm font-semibold text-amber-200">Shift Handoff Checklist</div>
          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input type="checkbox" className="mt-1 accent-amber-400" />
            All active jobs stopped or paused
          </label>
          <label className="mt-2 flex items-start gap-2 text-sm text-slate-300">
            <input type="checkbox" className="mt-1 accent-amber-400" />
            Parts count entered for completed jobs
          </label>
          <label className="mt-2 flex items-start gap-2 text-sm text-slate-300">
            <input type="checkbox" className="mt-1 accent-amber-400" />
            Machine area clean and tools returned
          </label>
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-400">Handoff notes for next operator <span className="text-amber-400">*</span></label>
            <textarea
              value={handoffNotes}
              onChange={(e) => setHandoffNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              placeholder="Notes for the next shift..."
            />
          </div>
          <div className="mt-3 flex gap-3">
            <ActionButton onClick={() => void handleClockOut()} disabled={loading || !handoffNotes.trim()} tone="rose">
              {loading ? 'Clocking out...' : 'Confirm Clock Out'}
            </ActionButton>
            <button
              onClick={() => setShowHandoff(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
