/**
 * MillingWizardPage — 5-step wizard for milling program generation.
 *
 * Step 1: Material selection
 * Step 2: Machine selection (Haas, Hurco, Roku-Roku, Okuma MU)
 * Step 3: Milling strategy (roughing, semi-finish, finishing, pocketing, profiling)
 * Step 4: Quality tier and tolerances
 * Step 5: Review & Generate → POST /api/v1/milling/wizard-submit
 *
 * MILL-WEB M1: U-MWWIZ02
 */

import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';
import { ApiError, submitMillingWizard } from '../api/client';

// ── Data ─────────────────────────────────────────────────────────────────────

const MILLING_MATERIALS = [
  { id: 'M2',       label: 'M2 HSS (HRC 60-65)',           group: 'H' },
  { id: 'D2',       label: 'D2 Tool Steel (HRC 58-62)',    group: 'H' },
  { id: 'A2',       label: 'A2 Tool Steel (HRC 57-62)',    group: 'H' },
  { id: 'S7',       label: 'S7 Tool Steel (HRC 54-58)',    group: 'H' },
  { id: 'H13',      label: 'H13 Hot Work Steel',           group: 'H' },
  { id: '4140',     label: '4140 Steel (HRC 28-32)',       group: 'P' },
  { id: '4340',     label: '4340 Steel (HRC 30-35)',       group: 'P' },
  { id: '1018',     label: '1018 Mild Steel',              group: 'P' },
  { id: '316SS',    label: '316 Stainless Steel',          group: 'M' },
  { id: '17-4PH',   label: '17-4 PH Stainless',           group: 'M' },
  { id: 'Ti6Al4V',  label: 'Ti-6Al-4V Titanium',          group: 'S' },
  { id: 'Inconel',  label: 'Inconel 718',                  group: 'S' },
  { id: 'Al6061',   label: 'Aluminum 6061-T6',             group: 'N' },
  { id: 'Al7075',   label: 'Aluminum 7075-T6',             group: 'N' },
  { id: 'Graphite', label: 'Graphite (EDM electrode)',     group: 'N' },
  { id: 'Carbide',  label: 'Tungsten Carbide (WC-Co)',     group: 'K' },
];

const MILLING_MACHINES = [
  {
    id: 'haas-vf2',
    label: 'Haas VF-2',
    controller: 'Haas NGC',
    axes: '3-axis VMC',
    travel: '762 × 406 × 508 mm',
    spindle: '8100 RPM / 22 kW',
    note: 'General-purpose VMC — aluminum to hardened steel',
  },
  {
    id: 'hurco-vm10i',
    label: 'Hurco VM10i',
    controller: 'WinMax',
    axes: '3-axis VMC',
    travel: '508 × 406 × 457 mm',
    spindle: '12000 RPM / 11 kW',
    note: 'Conversational programming — ideal for quick setups',
  },
  {
    id: 'roku-rb630',
    label: 'Roku-Roku RB-630',
    controller: 'Fanuc 0i-MD',
    axes: '3-axis VMC',
    travel: '630 × 410 × 510 mm',
    spindle: '10000 RPM / 15 kW',
    note: 'High-rigidity — heavy cuts in tool steel',
  },
  {
    id: 'okuma-mu400v',
    label: 'Okuma MU-400V',
    controller: 'OSP-P300M',
    axes: '5-axis VMC',
    travel: 'Ø400 table / 350 Z',
    spindle: '20000 RPM / 22 kW',
    note: '5-axis simultaneous — complex die cavities and contours',
  },
];

const MILLING_STRATEGIES = [
  {
    id: 'roughing',
    label: 'Roughing',
    desc: 'Max MRR, large stepovers, high feeds. Leaves ~0.5 mm stock.',
    color: 'text-amber-300',
  },
  {
    id: 'semi-finish',
    label: 'Semi-Finishing',
    desc: 'Blend passes, reduce scallops. Leaves ~0.1 mm for finish.',
    color: 'text-blue-300',
  },
  {
    id: 'finishing',
    label: 'Finishing',
    desc: 'Light cuts, small stepdowns. Target Ra 0.8-1.6 um.',
    color: 'text-emerald-300',
  },
  {
    id: 'pocketing',
    label: 'Pocketing',
    desc: 'Adaptive clearing for enclosed pockets and cavities.',
    color: 'text-violet-300',
  },
  {
    id: 'profiling',
    label: 'Profiling',
    desc: 'Contour following — outside walls and ribs.',
    color: 'text-cyan-300',
  },
  {
    id: 'drilling',
    label: 'Drilling / Tapping',
    desc: 'Hole cycles — G81/G83 drilling, G84 tapping.',
    color: 'text-rose-300',
  },
];

const QUALITY_TIERS = [
  {
    id: 'general',
    label: 'General',
    desc: 'Ra 3.2 um | IT10-11 | ±0.05 mm',
    color: 'text-zinc-300',
  },
  {
    id: 'precision',
    label: 'Precision',
    desc: 'Ra 1.6 um | IT8-9 | ±0.025 mm',
    color: 'text-blue-300',
  },
  {
    id: 'die',
    label: 'Die & Tooling',
    desc: 'Ra 0.8 um | IT7 | ±0.010 mm — JM Die standard',
    color: 'text-amber-300',
  },
  {
    id: 'aerospace',
    label: 'Aerospace',
    desc: 'Ra 0.4 um | IT6 | ±0.005 mm | NADCAP-ready',
    color: 'text-emerald-300',
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface LocationState {
  fileName?: string;
  fileRoute?: string;
  fileSize?: number;
  extractedData?: Record<string, unknown>;
  sourceLabel?: string;
  materialId?: string;
  materialName?: string;
  machineId?: string;
  machinePreference?: string;
  operation?: string;
  notes?: string;
  workspaceContext?: {
    machineLabel?: string;
    controllerLabel?: string;
    packetId?: string;
    focusId?: string;
  };
}

function resolveMillingMaterialId(state: LocationState) {
  const candidates = [
    state.materialId,
    state.materialName,
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  if (!candidates.length) return '4140';

  const matched = MILLING_MATERIALS.find((item) =>
    candidates.some((candidate) => item.id.toLowerCase() === candidate || item.label.toLowerCase().includes(candidate)),
  );

  return matched?.id ?? '4140';
}

function resolveMillingMachineId(state: LocationState) {
  const candidates = [
    state.machineId,
    state.machinePreference,
    state.workspaceContext?.machineLabel,
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  if (!candidates.length) return 'haas-vf2';

  const matched = MILLING_MACHINES.find((item) =>
    candidates.some((candidate) => {
      const normalizedCandidate = candidate.replace(/[^a-z0-9]+/g, '');
      const normalizedId = item.id.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const normalizedLabel = item.label.toLowerCase().replace(/[^a-z0-9]+/g, '');
      return normalizedCandidate.includes(normalizedId)
        || normalizedId.includes(normalizedCandidate)
        || normalizedCandidate.includes(normalizedLabel);
    }),
  );

  return matched?.id ?? 'haas-vf2';
}

function defaultStrategiesForOperation(operation?: string) {
  const normalized = operation?.toLowerCase() ?? '';
  if (!normalized) return ['roughing', 'finishing'];
  if (normalized.includes('drill') || normalized.includes('tap')) return ['drilling'];
  if (normalized.includes('profile')) return ['profiling', 'finishing'];
  if (normalized.includes('pocket')) return ['pocketing', 'finishing'];
  if (normalized.includes('finish')) return ['semi-finish', 'finishing'];
  return ['roughing', 'finishing'];
}

function defaultQualityTierForOperation(operation?: string) {
  const normalized = operation?.toLowerCase() ?? '';
  if (normalized.includes('finish') || normalized.includes('profile')) return 'die';
  if (normalized.includes('drill') || normalized.includes('tap')) return 'general';
  return 'precision';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MillingWizardPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const state = (location.state as LocationState | null) ?? {};
  const fileName    = state.fileName;
  const fileRoute   = state.fileRoute;
  const extractedData = state.extractedData;

  const [step, setStep]           = useState<WizardStep>(1);
  const [material, setMaterial]   = useState(() => resolveMillingMaterialId(state));
  const [machine, setMachine]     = useState(() => resolveMillingMachineId(state));
  const [strategies, setStrategies] = useState<string[]>(() => defaultStrategiesForOperation(state.operation));
  const [qualityTier, setQualityTier] = useState(() => defaultQualityTierForOperation(state.operation));
  const [submitting, setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalSteps = 5;

  const toggleStrategy = useCallback((id: string) => {
    setStrategies(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await submitMillingWizard({
        fileName,
        fileRoute,
        material,
        machine,
        strategies,
        qualityTier,
        extractedData,
      });

      const resultPayload =
        response?.result ??
        (response as Record<string, unknown> | null)?.data ??
        null;

      const jobId = response?.jobId;

      if (resultPayload && typeof resultPayload === 'object') {
        navigate('/milling/results', {
          state: {
            result: resultPayload,
            jobId,
            fileName,
            fileRoute,
            material,
            machine,
            strategies,
            qualityTier,
          },
        });
        return;
      }

      if (jobId) {
        navigate('/milling/results', {
          state: {
            result: null,
            jobId,
            fileName,
            fileRoute,
            material,
            machine,
            strategies,
            qualityTier,
          },
        });
        return;
      }

      setSubmitError(
        'The live /api/v1/milling/wizard-submit route returned no usable payload. The wizard stays here instead of implying a generated milling program.',
      );
    } catch (issue) {
      setSubmitError(
        issue instanceof ApiError
          ? issue.message
          : 'The milling wizard submit route is unavailable right now. The wizard stays here instead of implying a generated program.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [extractedData, fileName, fileRoute, machine, material, navigate, qualityTier, strategies]);

  const sec = 'bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-6';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide mb-1';

  const materialObj     = MILLING_MATERIALS.find(m => m.id === material);
  const machineObj      = MILLING_MACHINES.find(m => m.id === machine);
  const qualityObj      = QUALITY_TIERS.find(q => q.id === qualityTier);
  const strategyLabels  = strategies.map(s => MILLING_STRATEGIES.find(x => x.id === s)?.label ?? s).join(', ');

  const stepTitle = [
    'Material',
    'Machine',
    'Strategy',
    'Quality Tier',
    'Review & Generate',
  ][step - 1];

  // Guard: redirect to upload if accessed directly
  if (!fileName) {
    return (
      <div className="mx-auto flex w-full max-w-[1520px] flex-col items-center gap-6 pt-12">
        <p className="text-zinc-400">No file uploaded. Go back to upload.</p>
        <button
          onClick={() => navigate('/milling')}
          className="rounded bg-violet-600 px-6 py-2 text-sm text-white hover:bg-violet-500"
        >
          Upload a File
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 pb-12">
      <WorkspaceHero
        eyebrow={`Milling: ${fileName}`}
        title="Configure Your Milling Job"
        description={`Step ${step} of ${totalSteps} — ${stepTitle}`}
        metrics={
          <>
            <SummaryTile label="File" value={fileName ?? 'Unknown'} hint={fileRoute ?? ''} />
            <SummaryTile
              label="Step"
              value={`${step}/${totalSteps}`}
              hint={submitting ? 'Submitting...' : stepTitle}
              accent={submitting ? 'from-amber-400/22 via-amber-300/8 to-transparent' : undefined}
            />
            <SummaryTile
              label="Material"
              value={materialObj?.id ?? '—'}
              hint={materialObj?.group ?? ''}
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
          </>
        }
      />

      {/* Step 1 — Material */}
      {step === 1 && (
        <div className={sec}>
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Select Material</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MILLING_MATERIALS.map(mat => (
              <button
                key={mat.id}
                onClick={() => setMaterial(mat.id)}
                className={`rounded-lg border p-3 text-left text-xs transition ${
                  material === mat.id
                    ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <div className="font-semibold">{mat.id}</div>
                <div className="mt-0.5 text-[10px] text-zinc-500 leading-tight">{mat.label.split('(')[0].trim()}</div>
                <div className="mt-1 text-[10px] text-zinc-600">ISO {mat.group}</div>
              </button>
            ))}
          </div>
          {extractedData && typeof extractedData.material === 'string' && (
            <p className="mt-3 text-xs text-amber-300">
              Extracted from file: <span className="font-semibold">{extractedData.material}</span>
            </p>
          )}
        </div>
      )}

      {/* Step 2 — Machine */}
      {step === 2 && (
        <div className={sec}>
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Select Machine</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MILLING_MACHINES.map(m => (
              <button
                key={m.id}
                onClick={() => setMachine(m.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  machine === m.id
                    ? 'border-violet-400/50 bg-violet-500/15'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-200">{m.label}</span>
                  <span className="rounded bg-zinc-700/60 px-2 py-0.5 text-[10px] text-zinc-400">{m.axes}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-400">{m.controller}</div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  Travel: {m.travel} | Spindle: {m.spindle}
                </div>
                <div className="mt-2 text-[11px] text-violet-300">{m.note}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Strategy */}
      {step === 3 && (
        <div className={sec}>
          <h3 className="mb-1 text-sm font-semibold text-zinc-200">Select Milling Strategies</h3>
          <p className="mb-4 text-xs text-zinc-500">Select all strategies needed for this job.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MILLING_STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => toggleStrategy(s.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  strategies.includes(s.id)
                    ? 'border-violet-400/50 bg-violet-500/15'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'
                }`}
              >
                <div className={`text-sm font-medium ${s.color}`}>{s.label}</div>
                <div className="mt-1 text-[11px] text-zinc-500 leading-tight">{s.desc}</div>
                {strategies.includes(s.id) && (
                  <div className="mt-2 text-[10px] font-semibold text-violet-400">SELECTED</div>
                )}
              </button>
            ))}
          </div>
          {strategies.length === 0 && (
            <p className="mt-3 text-xs text-rose-400">Select at least one strategy to continue.</p>
          )}
        </div>
      )}

      {/* Step 4 — Quality Tier */}
      {step === 4 && (
        <div className={sec}>
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Quality Tier</h3>
          <div className="grid grid-cols-2 gap-3">
            {QUALITY_TIERS.map(q => (
              <button
                key={q.id}
                onClick={() => setQualityTier(q.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  qualityTier === q.id
                    ? 'border-violet-400/50 bg-violet-500/15'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'
                }`}
              >
                <div className={`text-sm font-medium ${q.color}`}>{q.label}</div>
                <div className="mt-1 text-xs text-zinc-500">{q.desc}</div>
                {q.id === 'die' && (
                  <div className="mt-2 text-[10px] text-amber-400">JM DIE DEFAULT</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5 — Review & Generate */}
      {step === 5 && (
        <div className={sec}>
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Review & Generate</h3>

          {submitError ? (
            <div className="mb-4 rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
              {submitError}
            </div>
          ) : null}

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <span className={lbl}>File</span>
              <div className="text-sm text-zinc-200">{fileName}</div>
            </div>
            <div>
              <span className={lbl}>Material</span>
              <div className="text-sm text-zinc-200">{materialObj?.label ?? material}</div>
            </div>
            <div>
              <span className={lbl}>ISO Group</span>
              <div className="text-sm text-zinc-200">{materialObj?.group}</div>
            </div>
            <div>
              <span className={lbl}>Machine</span>
              <div className="text-sm text-zinc-200">{machineObj?.label ?? machine}</div>
            </div>
            <div>
              <span className={lbl}>Controller</span>
              <div className="text-sm text-zinc-200">{machineObj?.controller ?? '—'}</div>
            </div>
            <div>
              <span className={lbl}>Axes</span>
              <div className="text-sm text-zinc-200">{machineObj?.axes ?? '—'}</div>
            </div>
            <div className="col-span-2">
              <span className={lbl}>Strategies</span>
              <div className="text-sm text-zinc-200">{strategyLabels || '—'}</div>
            </div>
            <div>
              <span className={lbl}>Quality</span>
              <div className="text-sm text-zinc-200">{qualityObj?.label ?? qualityTier}</div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || strategies.length === 0}
            className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
          >
            {submitting ? 'Generating Milling Program...' : 'Generate Milling Program'}
          </button>
        </div>
      )}

      {/* Navigation */}
      {!submitting && (
        <div className="flex justify-between">
          <button
            onClick={() =>
              step > 1 ? setStep((step - 1) as WizardStep) : navigate('/milling')
            }
            className="rounded bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600"
          >
            {step === 1 ? 'Back to Upload' : 'Previous'}
          </button>
          {step < totalSteps ? (
            <button
              onClick={() => {
                if (step === 3 && strategies.length === 0) return;
                setStep((step + 1) as WizardStep);
              }}
              disabled={step === 3 && strategies.length === 0}
              className="rounded bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              Next
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
