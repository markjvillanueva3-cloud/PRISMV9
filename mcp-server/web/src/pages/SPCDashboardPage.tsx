import { useCallback, useState } from 'react';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { qualitySPCChart } from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'charts' | 'capability' | 'nelson' | 'dmaic';

type NelsonStatus = 'violation' | 'clear';

interface SamplePoint {
  sample: number;
  xBar: number;
  range: number;
  outOfControl: boolean;
}

interface ControlLimits {
  ucl: number;
  lcl: number;
  centerLine: number;
}

interface NelsonRule {
  id: number;
  name: string;
  description: string;
  status: NelsonStatus;
  detail: string;
}

type DMAICStage = 'define' | 'measure' | 'analyze' | 'improve' | 'control';

interface DMAICProject {
  id: string;
  title: string;
  qualityProjectId: string;
  currentStage: DMAICStage;
  owner: string;
  metric: string;
  target: string;
}

interface CapabilityData {
  cpk: number;
  ppk: number;
  cp: number;
  pp: number;
  usl: number;
  lsl: number;
  processMean: number;
  processStdDev: number;
  specSpread: number;
  processSpread: number;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_XBAR_LIMITS: ControlLimits = {
  ucl: 25.032,
  lcl: 24.968,
  centerLine: 25.000,
};

const SEED_R_LIMITS: ControlLimits = {
  ucl: 0.058,
  lcl: 0,
  centerLine: 0.027,
};

const SEED_SAMPLES: SamplePoint[] = [
  { sample: 1, xBar: 25.002, range: 0.018, outOfControl: false },
  { sample: 2, xBar: 24.998, range: 0.022, outOfControl: false },
  { sample: 3, xBar: 25.005, range: 0.015, outOfControl: false },
  { sample: 4, xBar: 24.995, range: 0.030, outOfControl: false },
  { sample: 5, xBar: 25.010, range: 0.025, outOfControl: false },
  { sample: 6, xBar: 25.008, range: 0.020, outOfControl: false },
  { sample: 7, xBar: 24.990, range: 0.028, outOfControl: false },
  { sample: 8, xBar: 25.015, range: 0.032, outOfControl: false },
  { sample: 9, xBar: 25.020, range: 0.019, outOfControl: false },
  { sample: 10, xBar: 24.985, range: 0.024, outOfControl: false },
  { sample: 11, xBar: 25.012, range: 0.021, outOfControl: false },
  { sample: 12, xBar: 25.035, range: 0.042, outOfControl: true },
  { sample: 13, xBar: 24.997, range: 0.017, outOfControl: false },
  { sample: 14, xBar: 25.003, range: 0.023, outOfControl: false },
  { sample: 15, xBar: 24.992, range: 0.026, outOfControl: false },
  { sample: 16, xBar: 25.001, range: 0.019, outOfControl: false },
  { sample: 17, xBar: 25.007, range: 0.014, outOfControl: false },
  { sample: 18, xBar: 25.004, range: 0.021, outOfControl: false },
  { sample: 19, xBar: 24.970, range: 0.038, outOfControl: true },
  { sample: 20, xBar: 25.000, range: 0.020, outOfControl: false },
];

const SEED_CAPABILITY: CapabilityData = {
  cpk: 1.42,
  ppk: 1.35,
  cp: 1.56,
  pp: 1.48,
  usl: 25.050,
  lsl: 24.950,
  processMean: 25.002,
  processStdDev: 0.0107,
  specSpread: 0.100,
  processSpread: 0.064,
};

const SEED_NELSON_RULES: NelsonRule[] = [
  { id: 1, name: 'Rule 1 — Beyond 3-sigma', description: 'One point beyond 3 standard deviations from the center line.', status: 'violation', detail: 'Sample 12 (25.035) exceeds UCL 25.032. Sample 19 (24.970) exceeds LCL 24.968.' },
  { id: 2, name: 'Rule 2 — Zone A Run', description: 'Nine consecutive points on the same side of the center line.', status: 'clear', detail: 'No run of 9 or more detected.' },
  { id: 3, name: 'Rule 3 — Trend', description: 'Six consecutive points steadily increasing or decreasing.', status: 'clear', detail: 'No monotonic trend of 6+ points found.' },
  { id: 4, name: 'Rule 4 — Alternating', description: 'Fourteen consecutive points alternating up and down.', status: 'clear', detail: 'No alternating pattern of 14+ points detected.' },
  { id: 5, name: 'Rule 5 — Zone A (2 of 3)', description: 'Two of three consecutive points in Zone A or beyond.', status: 'clear', detail: 'No Zone A clustering detected.' },
  { id: 6, name: 'Rule 6 — Zone B (4 of 5)', description: 'Four of five consecutive points in Zone B or beyond.', status: 'clear', detail: 'No Zone B clustering detected.' },
  { id: 7, name: 'Rule 7 — Stratification', description: 'Fifteen consecutive points within Zone C (both sides).', status: 'clear', detail: 'No stratification pattern found.' },
  { id: 8, name: 'Rule 8 — Mixture', description: 'Eight consecutive points outside Zone C on both sides.', status: 'clear', detail: 'No mixture pattern detected.' },
];

const DMAIC_STAGES: DMAICStage[] = ['define', 'measure', 'analyze', 'improve', 'control'];

const SEED_DMAIC_PROJECTS: DMAICProject[] = [
  {
    id: 'DMAIC-001',
    title: 'Reduce Bore Diameter Variation',
    qualityProjectId: 'QP-2026-014',
    currentStage: 'analyze',
    owner: 'Sarah Chen',
    metric: 'Cpk on 25mm bore',
    target: 'Cpk > 1.67',
  },
  {
    id: 'DMAIC-002',
    title: 'Surface Finish Consistency on Inconel',
    qualityProjectId: 'QP-2026-018',
    currentStage: 'measure',
    owner: 'Mike Torres',
    metric: 'Ra variation',
    target: 'Ra 0.8 +/- 0.2 um',
  },
  {
    id: 'DMAIC-003',
    title: 'First-Pass Yield on 5-Axis Features',
    qualityProjectId: 'QP-2026-022',
    currentStage: 'improve',
    owner: 'Ana Reyes',
    metric: 'First-pass yield %',
    target: '> 97%',
  },
  {
    id: 'DMAIC-004',
    title: 'Reduce Thread Gauge Failures',
    qualityProjectId: 'QP-2026-025',
    currentStage: 'define',
    owner: 'James Walker',
    metric: 'Thread gauge fail rate',
    target: '< 0.5%',
  },
  {
    id: 'DMAIC-005',
    title: 'Flatness Control on Thin-Wall Parts',
    qualityProjectId: 'QP-2026-029',
    currentStage: 'control',
    owner: 'Dave Kim',
    metric: 'Flatness deviation',
    target: '< 0.01mm',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cpkTone(cpk: number): 'rose' | 'amber' | 'emerald' {
  if (cpk < 1.0) return 'rose';
  if (cpk <= 1.33) return 'amber';
  return 'emerald';
}

function cpkLabel(cpk: number): string {
  if (cpk < 1.0) return 'Not Capable';
  if (cpk <= 1.33) return 'Marginal';
  return 'Capable';
}

function stageIndex(stage: DMAICStage): number {
  return DMAIC_STAGES.indexOf(stage);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SPCDashboardPage() {
  const [tab, setTab] = useState<Tab>('charts');
  const [samples, setSamples] = useState<SamplePoint[]>(SEED_SAMPLES);
  const [xBarLimits, setXBarLimits] = useState<ControlLimits>(SEED_XBAR_LIMITS);
  const [rLimits, setRLimits] = useState<ControlLimits>(SEED_R_LIMITS);
  const [capability] = useState<CapabilityData>(SEED_CAPABILITY);
  const [nelsonRules] = useState<NelsonRule[]>(SEED_NELSON_RULES);
  const [dmaicProjects] = useState<DMAICProject[]>(SEED_DMAIC_PROJECTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartForm, setChartForm] = useState({ part_number: '25mm-BORE-001', dimension: 'ID Bore 25.000' });

  // Derived metrics
  const violationCount = nelsonRules.filter((r) => r.status === 'violation').length;
  const oocCount = samples.filter((s) => s.outOfControl).length;
  const activeProjects = dmaicProjects.length;

  const handleLoadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await qualitySPCChart({
        part_number: chartForm.part_number,
        dimension: chartForm.dimension,
      });
      // If backend returns data, use it; otherwise keep seed data
      const result = response.result as Record<string, unknown> | undefined;
      if (result && typeof result === 'object') {
        if (Array.isArray(result.samples)) {
          setSamples(result.samples as SamplePoint[]);
        }
        if (result.xbar_limits && typeof result.xbar_limits === 'object') {
          setXBarLimits(result.xbar_limits as ControlLimits);
        }
        if (result.r_limits && typeof result.r_limits === 'object') {
          setRLimits(result.r_limits as ControlLimits);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SPC chart data');
    } finally {
      setLoading(false);
    }
  }, [chartForm]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Hero */}
      <WorkspaceHero
        eyebrow="Quality Intelligence"
        title="SPC Dashboard"
        description="Statistical process control with control charts, capability analysis, Nelson rule detection, and DMAIC project tracking. Catch drift before it becomes scrap."
        metrics={
          <>
            <SummaryTile
              label="Cpk"
              value={capability.cpk.toFixed(2)}
              hint={cpkLabel(capability.cpk)}
              accent={
                capability.cpk >= 1.33
                  ? 'from-emerald-400/22 via-emerald-300/10 to-transparent'
                  : capability.cpk >= 1.0
                    ? 'from-amber-400/22 via-amber-300/10 to-transparent'
                    : 'from-rose-400/22 via-rose-300/10 to-transparent'
              }
            />
            <SummaryTile
              label="Violations"
              value={String(violationCount)}
              hint={`${oocCount} out-of-control points detected`}
              accent={violationCount > 0
                ? 'from-rose-400/22 via-rose-300/10 to-transparent'
                : 'from-emerald-400/22 via-emerald-300/10 to-transparent'}
            />
            <SummaryTile
              label="DMAIC Projects"
              value={String(activeProjects)}
              hint={`${dmaicProjects.filter((p) => p.currentStage === 'control').length} in control phase`}
              accent="from-sky-400/22 via-sky-300/10 to-transparent"
            />
          </>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['charts', 'capability', 'nelson', 'dmaic'] as const).map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === 'charts' ? 'Control Charts' : t === 'capability' ? 'Capability' : t === 'nelson' ? 'Nelson Rules' : 'DMAIC'}
          </TabButton>
        ))}
      </div>

      {/* ====== Charts Tab ====== */}
      {tab === 'charts' && (
        <div className="space-y-6">
          {/* Query form */}
          <PanelCard title="Chart Parameters" subtitle="Select a part and dimension to view control charts">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Part Number">
                <Input
                  value={chartForm.part_number}
                  onChange={(e) => setChartForm((prev) => ({ ...prev, part_number: e.target.value }))}
                  placeholder="e.g. 25mm-BORE-001"
                />
              </Field>
              <Field label="Dimension">
                <Input
                  value={chartForm.dimension}
                  onChange={(e) => setChartForm((prev) => ({ ...prev, dimension: e.target.value }))}
                  placeholder="e.g. ID Bore 25.000"
                />
              </Field>
              <div className="flex items-end">
                <ActionButton onClick={handleLoadChart} disabled={loading}>
                  {loading ? 'Loading...' : 'Load Chart'}
                </ActionButton>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          </PanelCard>

          {/* X-bar Chart */}
          <PanelCard title="X-bar Chart" subtitle={`UCL: ${xBarLimits.ucl.toFixed(3)}  |  CL: ${xBarLimits.centerLine.toFixed(3)}  |  LCL: ${xBarLimits.lcl.toFixed(3)}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sample</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">X-bar</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">UCL</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">CL</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">LCL</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => {
                    const ooc = s.xBar > xBarLimits.ucl || s.xBar < xBarLimits.lcl;
                    return (
                      <tr
                        key={s.sample}
                        className={`border-b border-white/5 ${ooc ? 'bg-rose-300/[0.06]' : ''}`}
                      >
                        <td className="px-3 py-2 text-slate-300">{s.sample}</td>
                        <td className={`px-3 py-2 text-right font-mono ${ooc ? 'font-semibold text-rose-300' : 'text-slate-100'}`}>
                          {s.xBar.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{xBarLimits.ucl.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{xBarLimits.centerLine.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{xBarLimits.lcl.toFixed(3)}</td>
                        <td className="px-3 py-2 text-center">
                          {ooc
                            ? <StatusPill label="OOC" tone="rose" />
                            : <StatusPill label="OK" tone="emerald" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PanelCard>

          {/* R Chart */}
          <PanelCard title="R Chart (Range)" subtitle={`UCL: ${rLimits.ucl.toFixed(3)}  |  CL: ${rLimits.centerLine.toFixed(3)}  |  LCL: ${rLimits.lcl.toFixed(3)}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sample</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">Range</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">UCL</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">CL</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">LCL</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => {
                    const ooc = s.range > rLimits.ucl;
                    return (
                      <tr
                        key={s.sample}
                        className={`border-b border-white/5 ${ooc ? 'bg-rose-300/[0.06]' : ''}`}
                      >
                        <td className="px-3 py-2 text-slate-300">{s.sample}</td>
                        <td className={`px-3 py-2 text-right font-mono ${ooc ? 'font-semibold text-rose-300' : 'text-slate-100'}`}>
                          {s.range.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{rLimits.ucl.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{rLimits.centerLine.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{rLimits.lcl.toFixed(3)}</td>
                        <td className="px-3 py-2 text-center">
                          {ooc
                            ? <StatusPill label="OOC" tone="rose" />
                            : <StatusPill label="OK" tone="emerald" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </div>
      )}

      {/* ====== Capability Tab ====== */}
      {tab === 'capability' && (
        <div className="space-y-6">
          <PanelCard title="Process Capability Indices" subtitle="Cpk/Ppk assessment against specification limits">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Cpk</div>
                <div className={`mt-2 text-3xl font-bold ${
                  cpkTone(capability.cpk) === 'emerald' ? 'text-emerald-300'
                    : cpkTone(capability.cpk) === 'amber' ? 'text-amber-300'
                      : 'text-rose-300'
                }`}>
                  {capability.cpk.toFixed(2)}
                </div>
                <StatusPill label={cpkLabel(capability.cpk)} tone={cpkTone(capability.cpk)} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ppk</div>
                <div className={`mt-2 text-3xl font-bold ${
                  cpkTone(capability.ppk) === 'emerald' ? 'text-emerald-300'
                    : cpkTone(capability.ppk) === 'amber' ? 'text-amber-300'
                      : 'text-rose-300'
                }`}>
                  {capability.ppk.toFixed(2)}
                </div>
                <StatusPill label={cpkLabel(capability.ppk)} tone={cpkTone(capability.ppk)} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Cp</div>
                <div className="mt-2 text-3xl font-bold text-slate-100">{capability.cp.toFixed(2)}</div>
                <div className="mt-1 text-xs text-slate-500">Potential capability</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pp</div>
                <div className="mt-2 text-3xl font-bold text-slate-100">{capability.pp.toFixed(2)}</div>
                <div className="mt-1 text-xs text-slate-500">Overall performance</div>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Capability Interpretation" subtitle="Process spread vs specification spread">
            {/* Thresholds guide */}
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.05] px-4 py-3">
                <div className="text-sm font-semibold text-rose-300">Cpk {'<'} 1.0</div>
                <div className="mt-1 text-xs text-slate-400">Not capable. Process spread exceeds spec limits. Immediate action required.</div>
              </div>
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3">
                <div className="text-sm font-semibold text-amber-300">1.0 {'<='} Cpk {'<='} 1.33</div>
                <div className="mt-1 text-xs text-slate-400">Marginal. Process is barely capable. Monitor closely and improve.</div>
              </div>
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3">
                <div className="text-sm font-semibold text-emerald-300">Cpk {'>'} 1.33</div>
                <div className="mt-1 text-xs text-slate-400">Capable. Process is well within spec limits. Maintain and monitor.</div>
              </div>
            </div>

            {/* Spec vs Process data */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Specification Limits</div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">USL</span>
                    <span className="font-mono text-slate-100">{capability.usl.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">LSL</span>
                    <span className="font-mono text-slate-100">{capability.lsl.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Spec Spread (USL - LSL)</span>
                    <span className="font-mono text-slate-100">{capability.specSpread.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Process Statistics</div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Process Mean</span>
                    <span className="font-mono text-slate-100">{capability.processMean.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Std Dev (sigma)</span>
                    <span className="font-mono text-slate-100">{capability.processStdDev.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Process Spread (6-sigma)</span>
                    <span className="font-mono text-slate-100">{capability.processSpread.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </PanelCard>
        </div>
      )}

      {/* ====== Nelson Rules Tab ====== */}
      {tab === 'nelson' && (
        <PanelCard title="Nelson Rules" subtitle="8 rules for detecting out-of-control conditions on control charts">
          <div className="space-y-3">
            {nelsonRules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-2xl border p-4 ${
                  rule.status === 'violation'
                    ? 'border-rose-300/20 bg-rose-300/[0.05]'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-100">{rule.name}</h3>
                      <StatusPill
                        label={rule.status === 'violation' ? 'VIOLATION' : 'Clear'}
                        tone={rule.status === 'violation' ? 'rose' : 'emerald'}
                      />
                    </div>
                    <p className="text-sm text-slate-400">{rule.description}</p>
                  </div>
                </div>
                <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${
                  rule.status === 'violation'
                    ? 'bg-rose-300/[0.08] text-rose-200'
                    : 'bg-white/[0.03] text-slate-500'
                }`}>
                  {rule.detail}
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {/* ====== DMAIC Tab ====== */}
      {tab === 'dmaic' && (
        <PanelCard title="DMAIC Project Tracker" subtitle="Six Sigma improvement projects linked to quality metrics">
          <div className="space-y-4">
            {dmaicProjects.map((project) => {
              const currentIdx = stageIndex(project.currentStage);
              return (
                <div
                  key={project.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-slate-100">{project.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{project.id}</span>
                        <span>Owner: {project.owner}</span>
                        <span>Quality ID: {project.qualityProjectId}</span>
                      </div>
                    </div>
                    <StatusPill
                      label={project.currentStage.toUpperCase()}
                      tone={
                        project.currentStage === 'control' ? 'emerald'
                          : project.currentStage === 'improve' ? 'sky'
                            : project.currentStage === 'analyze' ? 'amber'
                              : 'slate'
                      }
                    />
                  </div>

                  {/* DMAIC stage progress dots */}
                  <div className="mt-4 flex items-center gap-1">
                    {DMAIC_STAGES.map((stage, idx) => (
                      <div key={stage} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold uppercase ${
                              idx < currentIdx
                                ? 'bg-emerald-300/20 text-emerald-300'
                                : idx === currentIdx
                                  ? 'bg-cyan-300/20 text-cyan-200 ring-2 ring-cyan-300/40'
                                  : 'bg-white/[0.06] text-slate-600'
                            }`}
                          >
                            {stage[0]}
                          </div>
                          <span className={`mt-1 text-[9px] uppercase tracking-wide ${
                            idx <= currentIdx ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {stage}
                          </span>
                        </div>
                        {idx < DMAIC_STAGES.length - 1 && (
                          <div className={`mx-1 mb-4 h-0.5 w-6 ${
                            idx < currentIdx ? 'bg-emerald-300/40' : 'bg-white/10'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Metric info */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Metric</div>
                      <div className="mt-1 text-sm text-slate-200">{project.metric}</div>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Target</div>
                      <div className="mt-1 text-sm text-emerald-300">{project.target}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </PanelCard>
      )}
    </div>
  );
}
