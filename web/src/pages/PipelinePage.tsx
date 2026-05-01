import { useMemo, useState } from 'react';
import { callPipelineRoute, OrphanRouteError } from '../api/orphanRoutes';

type PipelineStage = {
  id:
    | 'analyze'
    | 'tools'
    | 'sequence'
    | 'speed-feed'
    | 'program'
    | 'quote'
    | 'roi'
    | 'full'
    | 'fusion360';
  label: string;
  detail: string;
};

type PipelineRun = {
  stage: PipelineStage;
  result: unknown;
  capturedAt: string;
};

const PIPELINE_STAGES: readonly PipelineStage[] = [
  { id: 'analyze', label: 'Analyze Print', detail: 'Extract features and manufacturing posture from the print or description.' },
  { id: 'tools', label: 'Select Tools', detail: 'Ask the backend to choose tools from the available inventory context.' },
  { id: 'sequence', label: 'Sequence Ops', detail: 'Generate the order of operations for the current part.' },
  { id: 'speed-feed', label: 'Speed / Feed', detail: 'Calculate cutting parameters for the current plan.' },
  { id: 'program', label: 'Assemble Program', detail: 'Build CNC program content from the staged route.' },
  { id: 'quote', label: 'Quote Posture', detail: 'Estimate cost posture inside the same pipeline pass.' },
  { id: 'roi', label: 'ROI Upgrades', detail: 'Surface upgrade recommendations and ROI posture.' },
  { id: 'full', label: 'Run Full', detail: 'Execute the full print-to-program pipeline in one shot.' },
  { id: 'fusion360', label: 'Fusion 360', detail: 'Generate the Fusion 360 handoff or script output.' },
] as const;

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export function PipelinePage() {
  const [description, setDescription] = useState('Titanium housing with two deep pockets, one bearing bore, and four tapped holes.');
  const [material, setMaterial] = useState('Ti-6Al-4V');
  const [quantity, setQuantity] = useState('12');
  const [machine, setMachine] = useState('Okuma MU-5000V');
  const [stock, setStock] = useState('6.0 x 6.0 x 3.0');
  const [goal, setGoal] = useState('Balanced release: prove out, quote accurately, and keep setup count low.');
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [busyStageId, setBusyStageId] = useState<PipelineStage['id'] | null>(null);
  const [activeStageId, setActiveStageId] = useState<PipelineStage['id'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeStage = useMemo(
    () => PIPELINE_STAGES.find((stage) => stage.id === activeStageId) ?? PIPELINE_STAGES[0],
    [activeStageId],
  );

  async function runStage(stage: PipelineStage) {
    setActiveStageId(stage.id);
    setBusyStageId(stage.id);
    setError(null);

    try {
      const response = await callPipelineRoute(stage.id, {
        description,
        material,
        quantity: Number(quantity) || quantity,
        machine,
        stock,
        goal,
      });

      setRuns((previous) => [
        {
          stage,
          result: response.result,
          capturedAt: new Date().toISOString(),
        },
        ...previous.filter((entry) => entry.stage.id !== stage.id),
      ]);
    } catch (issue) {
      setError(
        issue instanceof OrphanRouteError
          ? issue.message
          : 'Pipeline route could not be reached from the frontend.',
      );
    } finally {
      setBusyStageId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1580px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/14 bg-[linear-gradient(120deg,rgba(9,18,28,0.98)_0%,rgba(5,10,16,0.98)_44%,rgba(6,28,36,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Print-to-program
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                9 surfaced backend stages
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Pipeline Orchestrator
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Give the surfaced pipeline routes a real frontend home: stage the part, run the
                wizard one lane at a time, or fire the full print-to-program chain from one desk.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current stage</div>
            <div className="mt-4 text-lg font-semibold text-slate-50">{activeStage.label}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{activeStage.detail}</div>
            <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
              Use this desk to reach orphan pipeline routes directly while `Print to CNC` keeps
              its higher-level release workflow posture.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-4 text-xl font-semibold text-slate-50">Pipeline packet</div>
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Part description</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="w-full rounded-[22px] border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-slate-100" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Material</span>
                  <input value={material} onChange={(event) => setMaterial(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Quantity</span>
                  <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Preferred machine</span>
                  <input value={machine} onChange={(event) => setMachine(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Stock</span>
                  <input value={stock} onChange={(event) => setStock(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100" />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Business goal</span>
                <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} className="w-full rounded-[22px] border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-slate-100" />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-4 text-xl font-semibold text-slate-50">Stage actions</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PIPELINE_STAGES.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => runStage(stage)}
                  disabled={busyStageId === stage.id}
                  className={`rounded-[20px] border px-4 py-4 text-left transition-all ${activeStageId === stage.id ? 'border-cyan-300/28 bg-cyan-300/[0.08]' : 'border-white/8 bg-white/[0.03] hover:border-cyan-300/18 hover:bg-white/[0.05]'} ${busyStageId === stage.id ? 'opacity-60' : ''}`}
                >
                  <div className="text-sm font-semibold text-slate-50">{stage.label}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{stage.detail}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Stage outputs</div>
              <div className="mt-2 text-xl font-semibold text-slate-50">Pipeline response deck</div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              {runs.length} captured
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-[20px] border border-rose-300/22 bg-rose-400/[0.08] px-4 py-4 text-sm leading-6 text-rose-100">
              {error}
            </div>
          ) : null}

          {runs.length > 0 ? (
            <div className="space-y-4">
              {runs.map((entry) => (
                <article key={entry.stage.id} className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">{entry.stage.label}</div>
                      <div className="mt-1 text-sm text-slate-400">{entry.stage.detail}</div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {formatTimestamp(entry.capturedAt)}
                    </div>
                  </div>
                  <pre className="mt-4 overflow-x-auto rounded-[18px] border border-white/8 bg-slate-950/70 p-4 text-xs leading-6 text-slate-200">
                    {JSON.stringify(entry.result, null, 2)}
                  </pre>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-black/15 px-5 py-8 text-sm leading-7 text-slate-400">
              Run any pipeline stage to capture the live backend response here.
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
