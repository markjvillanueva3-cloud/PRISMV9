import { useMemo, useState } from 'react';
import { createJobPlan, ApiError } from '../api/client';
import { SafetyBadge } from '../components/SafetyBadge';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { JobPlanResult } from '../api/types';

type MaterialOption = {
  value: string;
  family: string;
  note: string;
  posture: string;
};

type OperationOption = {
  value: string;
  label: string;
  note: string;
  output: string;
};

type MachineOption = {
  value: string;
  className: string;
  note: string;
  strength: string;
};

const MATERIALS: readonly MaterialOption[] = [
  { value: 'AISI 4140', family: 'Alloy steel', note: 'Stable roughing with moderate thermal load.', posture: 'Balance torque, roughing force, and insert wear.' },
  { value: 'AISI 1045', family: 'Carbon steel', note: 'General-purpose shop material with broad tooling support.', posture: 'Keep the plan biased toward dependable cycle time.' },
  { value: 'AISI 304', family: 'Stainless steel', note: 'Heat and work-hardening demand cleaner engagement.', posture: 'Protect finish and tool life before raw throughput.' },
  { value: 'AISI 316L', family: 'Stainless steel', note: 'Corrosion-resistant but gummy under poor chip control.', posture: 'Favor predictable chip evacuation and conservative stepdown.' },
  { value: '6061-T6', family: 'Aluminum', note: 'High MRR and broad machine compatibility.', posture: 'Push stock removal without losing wall control.' },
  { value: '7075-T6', family: 'Aluminum', note: 'High-strength aluminum with premium finish expectations.', posture: 'Keep surface quality and burr control in view.' },
  { value: 'Ti-6Al-4V', family: 'Titanium', note: 'Thermally sensitive and tool-life constrained.', posture: 'Protect the cutter and avoid heat accumulation.' },
  { value: 'Inconel 718', family: 'Superalloy', note: 'High-cost material where stability matters more than speed.', posture: 'Lean into safe engagement and measured cycle plans.' },
] as const;

const OPERATIONS: readonly OperationOption[] = [
  { value: 'bracket', label: 'Bracket', note: 'Mixed roughing and finish work on structural geometry.', output: 'Balanced route with rough, wall, and hole stages.' },
  { value: 'housing', label: 'Housing', note: 'Datum control plus pocket and bore readiness.', output: 'Fixture-first plan with cavity staging and cleanup passes.' },
  { value: 'shaft', label: 'Shaft', note: 'Turning or mill-turn style operation chain.', output: 'Sequence favors datum, diameter, and finish stability.' },
  { value: 'flange', label: 'Flange', note: 'Bolt pattern and circular-feature coordination.', output: 'Face, locate, then drill/finish sequence emphasis.' },
  { value: 'pocket', label: 'Pocket', note: 'High stock removal with wall deflection risk.', output: 'Rough-first pocket path with finish stock protection.' },
  { value: 'contour', label: 'Contour', note: 'Finish-critical profile or wall surface.', output: 'Contouring-first route with cleaner engagement and finish checks.' },
] as const;

const MACHINES: readonly MachineOption[] = [
  { value: 'Haas VF-2', className: '3-axis vertical mill', note: 'Reliable general-purpose production mill.', strength: 'Fast turnaround and familiar shop-floor setup.' },
  { value: 'DMG MORI DMU 50', className: '5-axis trunnion', note: 'High-access multiaxis machine with premium finish potential.', strength: 'Excellent for complex access and fewer setups.' },
  { value: 'Mazak QTN-200', className: 'Turning center', note: 'Strong fit for shafts, flanges, and turned geometry chains.', strength: 'Turning productivity and thread discipline.' },
  { value: 'Okuma LB3000', className: 'Turning center', note: 'Rigid lathe posture for heavy OD/ID work.', strength: 'Stable diametral control and reliable cycle execution.' },
] as const;

function formatOperationLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function PlanningMetric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function OperationCard({
  sequence,
  type,
  tool,
  speed,
  feed,
  doc,
  time,
}: {
  sequence: number;
  type: string;
  tool: string;
  speed: number;
  feed: number;
  doc: number;
  time: number;
}) {
  return (
    <article className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Operation {sequence}</div>
          <div className="mt-2 text-xl font-semibold text-slate-50">{type}</div>
          <div className="mt-1 text-sm text-slate-400">{tool}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          {time.toFixed(1)} min
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Speed</div>
          <div className="mt-2 text-sm font-medium text-slate-100">{speed.toLocaleString()} RPM</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Feed</div>
          <div className="mt-2 text-sm font-medium text-slate-100">{feed} mm/rev</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">DOC</div>
          <div className="mt-2 text-sm font-medium text-slate-100">{doc} mm</div>
        </div>
      </div>
    </article>
  );
}

export function JobPlannerPage() {
  const [material, setMaterial] = useState<string>(MATERIALS[0].value);
  const [operation, setOperation] = useState<string>(OPERATIONS[0].value);
  const [machine, setMachine] = useState<string>(MACHINES[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<JobPlanResult | null>(null);
  const [safetyScore, setSafetyScore] = useState<number>(0);

  const selectedMaterial = useMemo(
    () => MATERIALS.find((item) => item.value === material) ?? MATERIALS[0],
    [material],
  );
  const selectedOperation = useMemo(
    () => OPERATIONS.find((item) => item.value === operation) ?? OPERATIONS[0],
    [operation],
  );
  const selectedMachine = useMemo(
    () => MACHINES.find((item) => item.value === machine) ?? MACHINES[0],
    [machine],
  );

  const primaryTool = plan?.operations[0]?.tool ?? 'Awaiting plan generation';

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const response = await createJobPlan({ material, operation, machine });
      const result = response.result as unknown as JobPlanResult;
      setPlan(result);
      setSafetyScore(response.safety.score);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/12 bg-[linear-gradient(130deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_45%,rgba(9,23,34,0.96)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
              Planning workspace
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Job Planner
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Build a clean process route before the first chip. Choose the material, part type,
                and machine posture, then generate a multi-pass plan with safety and runtime context.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Material posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{selectedMaterial.family}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedMaterial.posture}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Part intent</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{selectedOperation.label}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedOperation.output}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Machine posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{selectedMachine.className}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedMachine.strength}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Planning brief</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xl font-semibold text-slate-50">{selectedMachine.value}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedMachine.note}</div>
              </div>
              <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Current job brief</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {selectedMaterial.value} · {formatOperationLabel(selectedOperation.value)} workflow · {selectedMachine.className}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Primary tool</div>
                  <div className="mt-2 text-sm font-medium text-slate-100">{primaryTool}</div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Safety posture</div>
                  <div className="mt-2">{plan ? <SafetyBadge score={safetyScore} /> : <span className="text-sm text-slate-400">Awaiting plan</span>}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Planner setup</div>
            <div className="mt-2 text-xl font-semibold text-slate-50">Define the route</div>
            <div className="mt-1 text-sm text-slate-400">
              Stay close to the real part, the real machine, and the shop conditions you are planning around.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="jp-material" className="mb-1.5 block text-sm font-medium text-slate-300">
                Material
              </label>
              <select
                id="jp-material"
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/15"
              >
                {MATERIALS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm text-slate-400">{selectedMaterial.note}</div>
            </div>

            <div>
              <label htmlFor="jp-operation" className="mb-1.5 block text-sm font-medium text-slate-300">
                Part Type
              </label>
              <select
                id="jp-operation"
                value={operation}
                onChange={(event) => setOperation(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/15"
              >
                {OPERATIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm text-slate-400">{selectedOperation.note}</div>
            </div>

            <div>
              <label htmlFor="jp-machine" className="mb-1.5 block text-sm font-medium text-slate-300">
                Machine
              </label>
              <select
                id="jp-machine"
                value={machine}
                onChange={(event) => setMachine(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/15"
              >
                {MACHINES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm text-slate-400">{selectedMachine.note}</div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {loading ? 'Generating plan…' : 'Generate Plan'}
          </button>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-8">
              <LoadingState label="Generating machining plan..." />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5">
              <ErrorState message={error} onRetry={handleGenerate} />
            </div>
          ) : null}

          {plan && !loading ? (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-3">
                <PlanningMetric
                  label="Total Time"
                  value={`${plan.total_time_min.toFixed(1)} min`}
                  hint="Projected total route duration"
                />
                <PlanningMetric
                  label="Operations"
                  value={String(plan.operations.length)}
                  hint="Distinct programmed stages in this route"
                  accent="from-sky-400/22 via-sky-300/8 to-transparent"
                />
                <PlanningMetric
                  label="Safety"
                  value={`${Math.round(safetyScore * 100)}%`}
                  hint="Risk posture returned from the planning bridge"
                  accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                />
              </section>

              <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Route breakdown</div>
                    <div className="mt-2 text-xl font-semibold text-slate-50">Operations</div>
                    <div className="mt-1 text-sm text-slate-400">
                      Review each planned stage before you commit the job to the floor.
                    </div>
                  </div>
                  <SafetyBadge score={safetyScore} />
                </div>

                <div className="grid gap-4">
                  {plan.operations.map((item) => (
                    <OperationCard
                      key={item.sequence}
                      sequence={item.sequence}
                      type={item.type}
                      tool={item.tool}
                      speed={item.speed_rpm}
                      feed={item.feed_mmrev}
                      doc={item.doc_mm}
                      time={item.time_min}
                    />
                  ))}
                </div>
              </section>

              {plan.gcode_preview ? (
                <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Program handoff</div>
                    <div className="mt-2 text-xl font-semibold text-slate-50">G-Code Preview</div>
                  </div>
                  <pre className="max-h-80 overflow-x-auto rounded-[22px] border border-white/10 bg-[#02070c] p-4 text-xs text-emerald-300">
                    {plan.gcode_preview}
                  </pre>
                </section>
              ) : null}
            </div>
          ) : !loading && !error ? (
            <div className="rounded-[28px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] px-6 py-10 text-center">
              <div className="text-lg font-semibold text-slate-50">No plan generated yet</div>
              <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Use the setup lane to describe the material, part type, and machine, then generate a route with staged operations and a preview program.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
