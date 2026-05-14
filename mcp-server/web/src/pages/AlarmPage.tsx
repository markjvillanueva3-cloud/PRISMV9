import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LoadingState, ErrorState } from '../components/LoadingState';
import { PurchaseRecommendationModal } from '../components/shell/PurchaseRecommendationModal';
import { StatusPill } from '../components/workspace/WorkspacePrimitives';
import { decodeAlarm, ApiError } from '../api/client';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type { AlarmCommerceWorkspace, PurchaseRecommendation } from '../features/operating-system/contracts';
import { useShellCommerceSelection } from '../features/operating-system/shellCommerceState';
import { buildCapturePath } from '../utils/captureRoute';
import { buildShopFloorPath } from '../utils/shopFloorRoute';

interface AlarmResult {
  code: string;
  description: string;
  severity: string;
  causes: string[];
  remediation: string[];
}

type ControllerOption = {
  value: string;
  label: string;
  note: string;
  posture: string;
  accent: string;
};

const CONTROLLERS: readonly ControllerOption[] = [
  {
    value: 'fanuc',
    label: 'Fanuc',
    note: 'Most common production baseline for mills and lathes.',
    posture: 'Strong for standard alarm libraries and broad shop-floor familiarity.',
    accent: 'from-cyan-400/22 via-cyan-300/8 to-transparent',
  },
  {
    value: 'haas',
    label: 'Haas',
    note: 'Operator-friendly messaging and quick machine-room triage.',
    posture: 'Great fit for service-style decode and action-first recovery.',
    accent: 'from-sky-400/22 via-sky-300/8 to-transparent',
  },
  {
    value: 'siemens',
    label: 'Siemens',
    note: 'Higher-end control stack with deeper system and axis context.',
    posture: 'Bias the brief toward axis state, channel context, and recovery order.',
    accent: 'from-indigo-400/22 via-indigo-300/8 to-transparent',
  },
  {
    value: 'mazak',
    label: 'Mazak',
    note: 'Mixed conversational and controller-specific machine alarms.',
    posture: 'Helpful when operator guidance needs both code and shop language.',
    accent: 'from-fuchsia-400/20 via-fuchsia-300/8 to-transparent',
  },
  {
    value: 'okuma',
    label: 'Okuma',
    note: 'Rigid production posture with controller-specific machine context.',
    posture: 'Best when alarm handling is paired with cause isolation and safe restart.',
    accent: 'from-emerald-400/20 via-emerald-300/8 to-transparent',
  },
  {
    value: 'heidenhain',
    label: 'Heidenhain',
    note: 'High-precision environments where context and state matter.',
    posture: 'Useful for clear guidance around setup, datum, and program integrity.',
    accent: 'from-amber-300/22 via-amber-200/8 to-transparent',
  },
] as const;

const SEVERITY_STYLES: Record<string, { pill: string; panel: string; label: string }> = {
  critical: {
    pill: 'border-rose-300/26 bg-rose-400/12 text-rose-100',
    panel: 'border-rose-300/18 bg-rose-400/[0.05]',
    label: 'Immediate stop',
  },
  error: {
    pill: 'border-orange-300/26 bg-orange-400/12 text-orange-100',
    panel: 'border-orange-300/18 bg-orange-400/[0.05]',
    label: 'Resolve before cycle resume',
  },
  warning: {
    pill: 'border-amber-300/26 bg-amber-300/12 text-amber-100',
    panel: 'border-amber-300/18 bg-amber-300/[0.05]',
    label: 'Operator caution',
  },
  info: {
    pill: 'border-sky-300/26 bg-sky-300/12 text-sky-100',
    panel: 'border-sky-300/18 bg-sky-300/[0.05]',
    label: 'Reference context',
  },
};

function InsightTile({
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
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/20 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function ResponseList({
  title,
  items,
  marker,
}: {
  title: string;
  items: string[];
  marker: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 px-5 py-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-3 text-sm leading-6 text-slate-200">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-3">
              <span className="mt-0.5 text-cyan-200">{marker}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-slate-400">No guidance returned for this section yet.</div>
      )}
    </div>
  );
}

export function AlarmPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const operatingSystem = useOperatingSystem();
  const { selection } = useShellCommerceSelection();
  const [code, setCode] = useState('');
  const [controller, setController] = useState('fanuc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AlarmResult | null>(null);
  const [alarmCommerce, setAlarmCommerce] = useState<AlarmCommerceWorkspace | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<PurchaseRecommendation | null>(null);

  const selectedController = useMemo(
    () => CONTROLLERS.find((item) => item.value === controller) ?? CONTROLLERS[0],
    [controller],
  );
  const routedJob = routeParams.get('job') ?? '';
  const routedDepartment = routeParams.get('department') ?? '';
  const routedMachine = routeParams.get('machine') ?? '';
  const routedNote = routeParams.get('note') ?? '';
  const capturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'alarm-decoder',
        target: 'alarm',
        job: routedJob || (result?.code ? `ALARM-${result.code}` : code ? `ALARM-${code}` : ''),
        department: routedDepartment || 'Run cycle',
        machine: routedMachine || `${selectedController.label} control`,
        note:
          routedNote
          || `Capture video, audio, panel photos, and setup evidence for ${selectedController.label}${result?.code ? ` alarm ${result.code}` : ' troubleshooting'}.`,
      }),
    [code, location.pathname, location.search, result?.code, routedDepartment, routedJob, routedMachine, routedNote, selectedController.label],
  );
  const shopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'alarm-decoder',
        job: routedJob || (result?.code ? `ALARM-${result.code}` : code ? `ALARM-${code}` : ''),
        department: routedDepartment || 'Run cycle',
        operation: 'Alarm follow-up',
        machine: routedMachine || `${selectedController.label} control`,
        note:
          routedNote
          || `Carry the alarm decode, machine context, and follow-up ownership for ${selectedController.label}${result?.code ? ` alarm ${result.code}` : ' troubleshooting'}.`,
      }),
    [code, location.pathname, location.search, result?.code, routedDepartment, routedJob, routedMachine, routedNote, selectedController.label],
  );

  const severityKey = (result?.severity ?? 'info').toLowerCase();
  const severityTone = SEVERITY_STYLES[severityKey] ?? SEVERITY_STYLES.info;

  async function handleDecode() {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const resp = await decodeAlarm({ code, controller });
      const raw = resp.result as Record<string, unknown>;
      setResult({
        code: String(raw.code ?? code.trim()),
        description: String(raw.description ?? 'Unknown alarm'),
        severity: String(raw.severity ?? 'warning'),
        causes: Array.isArray(raw.causes) ? raw.causes.map(String) : [],
        remediation: Array.isArray(raw.remediation) ? raw.remediation.map(String) : [],
      });
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Connection failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const severityGuidance =
    severityKey === 'critical'
      ? 'Keep the machine stopped, protect the tool posture, and verify cause before any reset or restart.'
      : severityKey === 'error'
        ? 'Resolve the alarm condition, verify offsets/program state, and only then return to cycle.'
        : severityKey === 'warning'
          ? 'Operator can usually continue after review, but treat this as a drift signal instead of noise.'
        : 'Reference-level decode. Use it to orient the operator and confirm the next troubleshooting step.';

  useEffect(() => {
    let active = true;
    const alarmCode = (result?.code ?? code.trim()) || undefined;
    operatingSystem
      .getAlarmCommerceWorkspace({
        controller,
        code: alarmCode,
        severity: result?.severity,
        selection,
      })
      .then((workspace) => {
        if (active) {
          setAlarmCommerce(workspace);
        }
      })
      .catch(() => {
        if (active) {
          setAlarmCommerce(null);
        }
      });

    return () => {
      active = false;
    };
  }, [code, controller, operatingSystem, result?.code, result?.severity, selection]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/12 bg-[linear-gradient(130deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_45%,rgba(10,22,34,0.96)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
              Alarm intelligence
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Alarm Decoder
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Decode controller alarms into operator-ready guidance, likely causes, and safe next actions.
                This surface should feel like a live troubleshooting desk, not a generic form.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InsightTile
                label="Controller posture"
                value={selectedController.label}
                hint={selectedController.posture}
                accent={selectedController.accent}
              />
              <InsightTile
                label="Last decode"
                value={result ? `Alarm ${result.code}` : 'Standby'}
                hint={result ? result.description : 'Enter an alarm code and choose the control family.'}
                accent="from-sky-400/20 via-sky-300/8 to-transparent"
              />
              <InsightTile
                label="Response lane"
                value={result ? severityTone.label : 'Operator ready'}
                hint={result ? severityGuidance : 'Decode results will classify the urgency and recovery posture.'}
                accent="from-rose-400/20 via-rose-300/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current brief</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xl font-semibold text-slate-50">{selectedController.label}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedController.note}</div>
              </div>
              <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Decode discipline</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Start with the exact controller family, then decode the alarm into cause and remediation before anyone resets the machine.
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Critical</div>
                  <div className="mt-2 text-sm text-slate-300">Machine stop, protect tooling, verify state before recovery.</div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Warning</div>
                  <div className="mt-2 text-sm text-slate-300">Review drift signals before they become stoppages.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {alarmCommerce ? (
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Alarm parts + sourcing</div>
              <div className="mt-2 text-xl font-semibold text-slate-50">Fix guidance, related parts data, and buy options</div>
              <div className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{alarmCommerce.summary}</div>
            </div>
            <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">Current sourcing posture</div>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {selection.unitSystem === 'inch' ? 'Inch-first' : 'Metric-first'} · {selection.regionId.replace(/-/g, ' ')}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recommended repair tracks</div>
                <div className="mt-4 space-y-3">
                  {alarmCommerce.repairTracks.map((track) => (
                    <div key={track.id} className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-100">{track.title}</div>
                        <StatusPill label={track.posture} tone="amber" />
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">{track.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Related parts data and pricing</div>
                <div className="mt-4 space-y-3">
                  {alarmCommerce.relatedParts.map((part) => (
                    <div key={part.id} className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{part.label}</div>
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{part.category}</div>
                        </div>
                        <StatusPill label={part.priceLabel} tone="sky" />
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{part.usageNote}</div>
                      <div className="mt-3 rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3 text-sm leading-6 text-slate-400">
                        <span className="font-semibold text-slate-200">Stock note:</span> {part.stockNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Buy recommended recovery options</div>
                <div className="mt-4 space-y-3">
                  {alarmCommerce.recommendations.map((recommendation) => (
                    <div key={recommendation.id} className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{recommendation.title}</div>
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{recommendation.category}</div>
                        </div>
                        <StatusPill label={recommendation.roiStrength} tone="emerald" />
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{recommendation.detail}</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Estimated price</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{recommendation.estimatedPrice}</div>
                        </div>
                        <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payback</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{recommendation.payback}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-400">{recommendation.whyNow}</div>
                      <button
                        type="button"
                        onClick={() => setPurchaseTarget(recommendation)}
                        className="mt-4 inline-flex rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                      >
                        Buy {recommendation.title}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Decode console</div>
              <div className="mt-2 text-xl font-semibold text-slate-50">Controller and alarm input</div>
              <div className="mt-1 text-sm text-slate-400">
                Choose the control family first, then decode the exact code so the brief matches the machine language the operator sees.
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Live troubleshooting
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {CONTROLLERS.map((item) => {
              const active = item.value === controller;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setController(item.value)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition-all duration-200 ${
                    active
                      ? 'border-cyan-300/24 bg-cyan-300/[0.08] shadow-[0_18px_40px_rgba(34,211,238,0.12)]'
                      : 'border-white/8 bg-white/[0.03] hover:border-cyan-300/18 hover:bg-white/[0.045]'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-50">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{item.note}</div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
            <div className="space-y-4 rounded-[24px] border border-white/8 bg-black/15 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="alarm-code">
                  Alarm Code
                </label>
                <input
                  id="alarm-code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="e.g. 1020, 414, 2006"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32 focus:ring-2 focus:ring-cyan-300/18"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="controller">
                  Controller
                </label>
                <select
                  id="controller"
                  value={controller}
                  onChange={(event) => setController(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32 focus:ring-2 focus:ring-cyan-300/18"
                >
                  {CONTROLLERS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleDecode}
                disabled={loading || !code.trim()}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Decode Alarm
              </button>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Decode note</div>
              <div className="mt-3 text-lg font-semibold text-slate-50">{selectedController.label}</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{selectedController.posture}</div>
              <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-slate-400">
                If the operator only gives you a screenshot or panel photo, match the exact controller family first so the remediation steps stay credible.
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to={capturePath}
                  className="inline-flex rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.12] px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.18]"
                >
                  Open Capture Ops
                </Link>
                <Link
                  to={shopFloorPath}
                  className="inline-flex rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.12] px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.18]"
                >
                  Open Shop Floor follow-up
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Response posture</div>
          <div className={`rounded-[24px] border px-5 py-5 ${result ? severityTone.panel : 'border-white/8 bg-white/[0.03]'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xl font-semibold text-slate-50">
                {result ? `Alarm ${result.code}` : 'Waiting for decode'}
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${result ? severityTone.pill : 'border-white/10 bg-black/20 text-slate-300'}`}>
                {result ? result.severity.toUpperCase() : 'Standby'}
              </span>
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-300">
              {result
                ? severityGuidance
                : 'Decoded alarms will surface the urgency lane here so operators know whether they are stopping, reviewing, or simply referencing.'}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operator workflow</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                1. Confirm the control family. 2. Decode the exact code. 3. Read cause and remediation before resetting anything. 4. Capture repeated alarms as shop-floor knowledge.
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Shift handoff value</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                This page should help the next operator understand whether a stop came from setup drift, tooling, program state, or machine condition.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        {loading ? (
          <LoadingState label="Decoding alarm..." />
        ) : error ? (
          <ErrorState message={error} onRetry={handleDecode} />
        ) : result ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Decoded alarm</div>
                <div className="mt-2 text-2xl font-semibold text-slate-50">Alarm {result.code}</div>
                <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{result.description}</div>
              </div>
              <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${severityTone.pill}`}>
                {result.severity.toUpperCase()}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.8fr)]">
              <ResponseList title="Possible Causes" items={result.causes} marker="•" />
              <ResponseList title="Resolution Steps" items={result.remediation} marker="→" />
              <div className="rounded-[24px] border border-white/8 bg-black/15 px-5 py-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Machine-room response</div>
                <div className="mt-3 text-lg font-semibold text-slate-50">{severityTone.label}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">{severityGuidance}</div>
                <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                  Capture controller screenshots, machine state, and the corrective action when this alarm repeats. That turns a one-off decode into reusable shop knowledge.
                </div>
                <Link
                  to={capturePath}
                  className="mt-4 inline-flex rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.12] px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.18]"
                >
                  Stage troubleshooting evidence
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="rounded-[24px] border border-white/8 bg-black/15 px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Decoded results will land here</div>
              <div className="mt-3 text-2xl font-semibold text-slate-50">Ready for the first code</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Once an alarm is decoded, this area expands into the actual description, likely causes, and ordered recovery steps for the selected controller family.
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recommended start</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">
                Keep the code exact, keep the controller honest, and use this surface as the first decode desk before deeper service or maintenance escalation.
              </div>
            </div>
          </div>
        )}
      </section>

      <PurchaseRecommendationModal recommendation={purchaseTarget} onClose={() => setPurchaseTarget(null)} />
    </div>
  );
}
