import { useMemo, useState } from 'react';
import { callThreadRoute, OrphanRouteError } from '../api/orphanRoutes';

type ThreadAction = {
  id:
    | 'tap-drill'
    | 'mill-params'
    | 'depth'
    | 'engagement'
    | 'specifications'
    | 'gauges'
    | 'pitch-diameter'
    | 'diameters'
    | 'select-insert'
    | 'cutting-params'
    | 'validate-fit'
    | 'gcode';
  label: string;
  detail: string;
};

type ThreadResult = {
  action: ThreadAction;
  result: unknown;
  capturedAt: string;
};

const THREAD_ACTIONS: readonly ThreadAction[] = [
  { id: 'tap-drill', label: 'Tap Drill', detail: 'Recommended pre-tap drill size for the current thread.' },
  { id: 'mill-params', label: 'Thread Mill', detail: 'Thread-milling parameters for the selected spec.' },
  { id: 'depth', label: 'Depth', detail: 'Thread depth and pass planning posture.' },
  { id: 'engagement', label: 'Engagement', detail: 'Percent thread engagement against the target fit.' },
  { id: 'specifications', label: 'Specs', detail: 'Lookup the reference spec and standard posture.' },
  { id: 'gauges', label: 'Gauges', detail: 'Go / no-go gauge posture for inspection.' },
  { id: 'pitch-diameter', label: 'Pitch Diameter', detail: 'Pitch diameter math for internal or external threads.' },
  { id: 'diameters', label: 'Diameters', detail: 'Minor / major diameter recommendations.' },
  { id: 'select-insert', label: 'Insert Select', detail: 'Threading insert selection guidance.' },
  { id: 'cutting-params', label: 'Cutting Params', detail: 'Thread-cutting speed and feed recommendations.' },
  { id: 'validate-fit', label: 'Validate Fit', detail: 'Fit-class validation before release.' },
  { id: 'gcode', label: 'G-Code', detail: 'Generate threading program output.' },
] as const;

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function ActionButton({
  action,
  active,
  busy,
  onClick,
}: {
  action: ThreadAction;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-[20px] border px-4 py-4 text-left transition-all ${active ? 'border-cyan-300/28 bg-cyan-300/[0.08]' : 'border-white/8 bg-white/[0.03] hover:border-cyan-300/18 hover:bg-white/[0.05]'} ${busy ? 'opacity-60' : ''}`}
    >
      <div className="text-sm font-semibold text-slate-50">{action.label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{action.detail}</div>
    </button>
  );
}

function ResultCard({ entry }: { entry: ThreadResult }) {
  return (
    <article className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">{entry.action.label}</div>
          <div className="mt-1 text-sm text-slate-400">{entry.action.detail}</div>
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {formatTimestamp(entry.capturedAt)}
        </div>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-[18px] border border-white/8 bg-slate-950/70 p-4 text-xs leading-6 text-slate-200">
        {JSON.stringify(entry.result, null, 2)}
      </pre>
    </article>
  );
}

export function ThreadCalcPage() {
  const [threadStandard, setThreadStandard] = useState('UN');
  const [nominal, setNominal] = useState('0.500');
  const [pitch, setPitch] = useState('13');
  const [fitClass, setFitClass] = useState('2B');
  const [material, setMaterial] = useState('4140');
  const [threadHand, setThreadHand] = useState('right');
  const [results, setResults] = useState<ThreadResult[]>([]);
  const [activeActionId, setActiveActionId] = useState<ThreadAction['id'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<ThreadAction['id'] | null>(null);

  const activeAction = useMemo(
    () => THREAD_ACTIONS.find((action) => action.id === activeActionId) ?? THREAD_ACTIONS[0],
    [activeActionId],
  );

  async function runAction(action: ThreadAction) {
    setActiveActionId(action.id);
    setBusyActionId(action.id);
    setError(null);

    try {
      const response = await callThreadRoute(action.id, {
        standard: threadStandard,
        nominal,
        pitch,
        fit_class: fitClass,
        material,
        hand: threadHand,
      });

      setResults((previous) => [
        {
          action,
          result: response.result,
          capturedAt: new Date().toISOString(),
        },
        ...previous.filter((entry) => entry.action.id !== action.id),
      ]);
    } catch (issue) {
      setError(
        issue instanceof OrphanRouteError
          ? issue.message
          : 'Thread route could not be reached from the frontend.',
      );
    } finally {
      setBusyActionId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(9,18,28,0.98)_0%,rgba(5,10,16,0.98)_52%,rgba(7,26,38,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Thread intelligence
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                12 surfaced backend routes
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Thread Calculator
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Surface the full thread-manufacturing route stack from one desk: drill sizing,
                fit validation, gauge posture, insert selection, and threading G-code without
                leaving the shell.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current action</div>
            <div className="mt-4 text-lg font-semibold text-slate-50">{activeAction.label}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{activeAction.detail}</div>
            <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
              Use this desk when a programmer or setup lead needs a thread answer fast and wants
              the real backend route, not a separate pocket calculator.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-4 text-xl font-semibold text-slate-50">Thread setup</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Standard</span>
                <select value={threadStandard} onChange={(event) => setThreadStandard(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100">
                  <option>UN</option>
                  <option>Metric</option>
                  <option>NPT</option>
                  <option>ACME</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Nominal size</span>
                <input value={nominal} onChange={(event) => setNominal(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pitch / TPI</span>
                <input value={pitch} onChange={(event) => setPitch(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Fit class</span>
                <input value={fitClass} onChange={(event) => setFitClass(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Material</span>
                <input value={material} onChange={(event) => setMaterial(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Hand</span>
                <select value={threadHand} onChange={(event) => setThreadHand(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100">
                  <option value="right">Right hand</option>
                  <option value="left">Left hand</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-4 text-xl font-semibold text-slate-50">Route actions</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {THREAD_ACTIONS.map((action) => (
                <ActionButton
                  key={action.id}
                  action={action}
                  active={activeActionId === action.id}
                  busy={busyActionId === action.id}
                  onClick={() => runAction(action)}
                />
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Captured outputs</div>
              <div className="mt-2 text-xl font-semibold text-slate-50">Thread result board</div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              {results.length} responses
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-[20px] border border-rose-300/22 bg-rose-400/[0.08] px-4 py-4 text-sm leading-6 text-rose-100">
              {error}
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((entry) => (
                <ResultCard key={entry.action.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-black/15 px-5 py-8 text-sm leading-7 text-slate-400">
              Run one of the thread actions to capture a live backend response here.
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
