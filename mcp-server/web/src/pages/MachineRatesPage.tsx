import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, machineRateCompare, machineRateEffective, machineRateList } from '../api/client';
import { unwrapPrism } from '../api/unwrap';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import type { MachineRate } from '../api/types';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import type { ProgramReleaseCatalog } from '../features/operating-system/contracts';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { resolveProgramReleaseMachineRouteSeed } from '../utils/programReleaseRouteMachineResolver';
import { buildProgramReleaseRouteExtras } from '../utils/programReleaseSelectorExtras';
import { buildWorkflowPath, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'library' | 'compare' | 'effective';
type OeeLevel = 'worldClass' | 'typical' | 'poor';

type MachineRateComparisonResult = {
  machines?: Array<{
    id: string;
    name: string;
    hourly_rate: number;
    setup_multiplier: number;
    annual_cost: number;
  }>;
  cheapest?: string;
  most_productive?: string;
};

type EffectiveRateResult = {
  machine_id?: string;
  oee_level?: OeeLevel | string;
  effective_rate_hr?: number;
};

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  library: {
    label: 'Rate Library',
    detail: 'Keep the machine-rate baseline visible before quoting or schedule analysis reuses it.',
  },
  compare: {
    label: 'Compare Machines',
    detail: 'Compare the commercial posture of multiple machines before routing work by feel.',
  },
  effective: {
    label: 'Effective Rate',
    detail: 'Check one machine against realistic OEE posture when the raw library rate is not enough.',
  },
};

const OEE_OPTIONS: Array<{ id: OeeLevel; label: string; detail: string }> = [
  { id: 'worldClass', label: 'World class', detail: 'Best-case uptime and throughput.' },
  { id: 'typical', label: 'Typical', detail: 'Normal production posture for everyday planning.' },
  { id: 'poor', label: 'Poor', detail: 'Conservative posture when downtime or disruption is likely.' },
];

function formatOeeLabel(level: string | null | undefined) {
  if (!level) {
    return 'Not set';
  }
  if (level === 'worldClass') {
    return 'World class';
  }
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function normalizeRateFamilyToProgramReleaseFamily(family: string | null | undefined) {
  const normalized = (family ?? '').trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'mill') {
    return '3-axis';
  }
  if (normalized === '5-axis' || normalized === '5_axis') {
    return '5-axis';
  }
  if (normalized === 'lathe' || normalized === 'turning') {
    return 'lathe';
  }
  if (normalized === 'mill-turn' || normalized === 'mill_turn') {
    return 'mill-turn';
  }
  if (normalized === 'wire-edm' || normalized === 'wire_edm' || normalized === 'wedm') {
    return 'wire-edm';
  }
  return normalized;
}

function formatRefreshLabel(timestamp: number | null) {
  if (!timestamp) {
    return 'Not refreshed in this session';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toggleMachineSelection(current: string[], machineId: string) {
  if (current.includes(machineId)) {
    return current.filter((entry) => entry !== machineId);
  }

  return [...current, machineId];
}

function SourcePostureCard({
  label,
  source,
  refreshedAt,
  selection,
  unavailableReason,
}: {
  label: string;
  source: string;
  refreshedAt: number | null;
  selection: string;
  unavailableReason?: string | null;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 font-semibold text-slate-100">{source}</div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            unavailableReason
              ? 'border-amber-300/22 bg-amber-300/[0.10] text-amber-50'
              : 'border-emerald-300/22 bg-emerald-300/[0.10] text-emerald-50'
          }`}
        >
          {unavailableReason ? 'Unavailable' : 'Mounted'}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div>Last refresh: {formatRefreshLabel(refreshedAt)}</div>
        <div>Selection: {selection}</div>
      </div>
      {unavailableReason ? (
        <div className="mt-3 rounded-2xl border border-amber-300/18 bg-amber-300/[0.08] px-3 py-3 text-xs leading-5 text-amber-50">
          Unavailable reason: {unavailableReason}
        </div>
      ) : null}
    </div>
  );
}

export function MachineRatesPage() {
  const operatingSystem = useOperatingSystem();
  const location = useLocation();
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routedMachineId = routeParams.get('machineId') ?? '';
  const routedOeeLevel = routeParams.get('oeeLevel');
  const routedMachineIds = useMemo(
    () =>
      routedMachineId
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    [routedMachineId],
  );
  const [tab, setTab] = useState<Tab>('library');
  const [rates, setRates] = useState<MachineRate[]>([]);
  const [selectedCompareMachineIds, setSelectedCompareMachineIds] = useState<string[]>(routedMachineIds);
  const [useManualCompareIds, setUseManualCompareIds] = useState(false);
  const [manualCompareIds, setManualCompareIds] = useState('');
  const [compareResult, setCompareResult] = useState<MachineRateComparisonResult | null>(null);
  const [effectiveMachineId, setEffectiveMachineId] = useState(routedMachineId);
  const [useManualEffectiveMachineId, setUseManualEffectiveMachineId] = useState(false);
  const [manualEffectiveMachineId, setManualEffectiveMachineId] = useState('');
  const [oeeLevel, setOeeLevel] = useState<OeeLevel>(
    routedOeeLevel === 'worldClass' || routedOeeLevel === 'poor' || routedOeeLevel === 'typical'
      ? routedOeeLevel
      : 'typical',
  );
  const [effectiveResult, setEffectiveResult] = useState<EffectiveRateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releaseCatalog, setReleaseCatalog] = useState<ProgramReleaseCatalog | null>(PROGRAM_RELEASE_CATALOG);
  const [libraryRefreshedAt, setLibraryRefreshedAt] = useState<number | null>(null);
  const [compareRefreshedAt, setCompareRefreshedAt] = useState<number | null>(null);
  const [effectiveRefreshedAt, setEffectiveRefreshedAt] = useState<number | null>(null);
  const [libraryIssue, setLibraryIssue] = useState<string | null>(null);
  const [compareIssue, setCompareIssue] = useState<string | null>(null);
  const [effectiveIssue, setEffectiveIssue] = useState<string | null>(null);

  const activeTab = TAB_CONFIG[tab];
  const rateNameById = useMemo(() => new Map(rates.map((rate) => [rate.machine_id, rate.machine_name])), [rates]);
  const resolvedEffectiveMachineId = useMemo(
    () => (useManualEffectiveMachineId ? manualEffectiveMachineId.trim() : effectiveMachineId.trim()),
    [effectiveMachineId, manualEffectiveMachineId, useManualEffectiveMachineId],
  );
  const activeRate = useMemo(
    () =>
      rates.find((rate) => rate.machine_id === resolvedEffectiveMachineId)
      ?? (!resolvedEffectiveMachineId ? rates[0] ?? null : null),
    [rates, resolvedEffectiveMachineId],
  );
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'machine-rates',
            recordType: 'Machine',
            recordId: activeRate?.machine_id ?? resolvedEffectiveMachineId,
          },
    [activeRate?.machine_id, resolvedEffectiveMachineId, routeContext.origin],
  );
  const effectiveFocus = useMemo(
    () => (routeContext.focus.id ? routeContext.focus : undefined),
    [routeContext.focus],
  );
  const compareOutput = useMemo(
    () => ({
      machines: Array.isArray(compareResult?.machines) ? compareResult.machines : [],
      cheapest: compareResult?.cheapest ?? '',
      mostProductive: compareResult?.most_productive ?? '',
    }),
    [compareResult],
  );
  const effectiveOutput = useMemo(
    () => ({
      machineId: effectiveResult?.machine_id ?? activeRate?.machine_id ?? resolvedEffectiveMachineId,
      machineName:
        rateNameById.get(effectiveResult?.machine_id ?? activeRate?.machine_id ?? resolvedEffectiveMachineId)
        ?? activeRate?.machine_name
        ?? 'Unknown machine',
      oeeLevel: effectiveResult?.oee_level ?? oeeLevel,
      effectiveRateHr:
        typeof effectiveResult?.effective_rate_hr === 'number' ? effectiveResult.effective_rate_hr : null,
    }),
    [activeRate, effectiveResult, oeeLevel, rateNameById, resolvedEffectiveMachineId],
  );
  const releaseMachineSeed = useMemo(
    () =>
      resolveProgramReleaseMachineRouteSeed(releaseCatalog, [
        activeRate?.machine_id,
        activeRate?.machine_name,
        resolvedEffectiveMachineId,
      ]),
    [activeRate?.machine_id, activeRate?.machine_name, releaseCatalog, resolvedEffectiveMachineId],
  );
  const printToCncExtras = useMemo(
    () => ({
      source: 'machine-rates',
      ...buildProgramReleaseRouteExtras({
        catalog: releaseCatalog,
        routeSelection: {
          machineId: releaseMachineSeed?.machineId,
          machineFamilyId:
            releaseMachineSeed?.machineFamilyId ?? normalizeRateFamilyToProgramReleaseFamily(activeRate?.type),
          machineManufacturer: releaseMachineSeed?.machineManufacturer,
        },
        requireMachineId: false,
      }),
      oeeLevel,
    }),
    [activeRate?.type, oeeLevel, releaseCatalog, releaseMachineSeed?.machineFamilyId, releaseMachineSeed?.machineId, releaseMachineSeed?.machineManufacturer],
  );
  const quoteBuilderPath = useMemo(
    () =>
      buildWorkflowPath('/quote-builder', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'machine-rates',
          machineId: activeRate?.machine_id ?? resolvedEffectiveMachineId,
          machineFamilyId: activeRate?.type,
          oeeLevel,
        },
      }),
    [activeRate?.machine_id, activeRate?.type, effectiveFocus, effectiveOrigin, location.search, oeeLevel, resolvedEffectiveMachineId],
  );
  const printToCncPath = useMemo(
    () =>
      buildWorkflowPath('/print-to-cnc', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: printToCncExtras,
      }),
    [effectiveFocus, effectiveOrigin, location.search, printToCncExtras],
  );
  const compareSelectionSummary = useMemo(() => {
    if (useManualCompareIds) {
      return 'Manual ID override — provenance downgraded';
    }

    if (selectedCompareMachineIds.length === 0) {
      return 'No machines selected yet';
    }

    return `Registry-backed multi-select (${selectedCompareMachineIds.length})`;
  }, [selectedCompareMachineIds.length, useManualCompareIds]);
  const effectiveSelectionSummary = useMemo(
    () =>
      useManualEffectiveMachineId
        ? 'Manual machine override — provenance downgraded'
        : 'Registry-backed machine selector',
    [useManualEffectiveMachineId],
  );

  useEffect(() => {
    let active = true;

    operatingSystem
      .getProgramReleaseCatalog()
      .then((catalog) => {
        if (active) {
          setReleaseCatalog(catalog);
        }
      })
      .catch(() => {
        if (active) {
          setReleaseCatalog(PROGRAM_RELEASE_CATALOG);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  async function loadRates() {
    setLoading(true);
    setError(null);
    setLibraryIssue(null);
    try {
      const response = await machineRateList();
      const payload = unwrapPrism(response);
      const next =
        (payload as { rates?: MachineRate[] })?.rates ??
        (payload as MachineRate[]) ??
        [];
      const normalized = Array.isArray(next) ? next : [];
      const libraryIds = new Set(normalized.map((rate) => rate.machine_id));
      const matchedRoutedMachineIds = routedMachineIds.filter((machineId) => libraryIds.has(machineId));
      const unmatchedRoutedMachineIds = routedMachineIds.filter((machineId) => !libraryIds.has(machineId));

      setRates(normalized);
      setLibraryRefreshedAt(Date.now());
      if (selectedCompareMachineIds.length === 0 && matchedRoutedMachineIds.length > 0) {
        setSelectedCompareMachineIds(matchedRoutedMachineIds);
      }
      if (!useManualCompareIds && !manualCompareIds && unmatchedRoutedMachineIds.length > 0) {
        setUseManualCompareIds(true);
        setManualCompareIds(unmatchedRoutedMachineIds.join(', '));
      }
      if (!resolvedEffectiveMachineId && normalized.length > 0) {
        setEffectiveMachineId(matchedRoutedMachineIds[0] ?? normalized[0].machine_id);
      }
      if (!useManualEffectiveMachineId && resolvedEffectiveMachineId && !libraryIds.has(resolvedEffectiveMachineId)) {
        setUseManualEffectiveMachineId(true);
        setManualEffectiveMachineId(resolvedEffectiveMachineId);
      }
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Failed to load rates';
      setLibraryIssue(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function runCompare() {
    const machineIds = (useManualCompareIds ? manualCompareIds : selectedCompareMachineIds.join(','))
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (machineIds.length === 0) {
      const message = 'Select at least one machine from the library or provide manual IDs.';
      setCompareIssue(message);
      setError(message);
      return;
    }

    setLoading(true);
    setError(null);
    setCompareIssue(null);
    try {
      const response = await machineRateCompare({ machine_ids: machineIds });
      setCompareResult((unwrapPrism(response) as MachineRateComparisonResult) ?? null);
      setCompareRefreshedAt(Date.now());
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Compare failed';
      setCompareIssue(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function runEffective() {
    if (!resolvedEffectiveMachineId) {
      const message = 'Select a machine from the library or provide a manual machine ID.';
      setEffectiveIssue(message);
      setError(message);
      return;
    }

    setLoading(true);
    setError(null);
    setEffectiveIssue(null);
    try {
      const response = await machineRateEffective({
        machine_id: resolvedEffectiveMachineId,
        oee_level: oeeLevel,
      });
      setEffectiveResult((unwrapPrism(response) as EffectiveRateResult) ?? null);
      setEffectiveRefreshedAt(Date.now());
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Effective rate lookup failed';
      setEffectiveIssue(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRates();
  }, []);

  useEffect(() => {
    if (!rates.length) {
      return;
    }
    if (useManualEffectiveMachineId) {
      return;
    }
    if (!resolvedEffectiveMachineId) {
      setEffectiveMachineId(rates[0].machine_id);
      return;
    }
    if (!rates.some((rate) => rate.machine_id === resolvedEffectiveMachineId)) {
      setUseManualEffectiveMachineId(true);
      setManualEffectiveMachineId(resolvedEffectiveMachineId);
    }
  }, [rates, resolvedEffectiveMachineId, useManualEffectiveMachineId]);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Rate intelligence"
        title="Machine Rates"
        description="Keep rate library, machine comparison, and effective rate lookup in one commercial operations desk instead of relying on static spreadsheets."
        metrics={
          <>
            <SummaryTile label="Library size" value={String(rates.length)} hint="Machines currently staged in the rate library." />
            <SummaryTile
              label="Active lane"
              value={activeTab.label}
              hint={activeTab.detail}
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Effective lookup"
              value={effectiveResult ? formatOeeLabel(effectiveOutput.oeeLevel) : 'Standby'}
              hint="Selected OEE posture for the current machine."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this desk when routing, quoting, or planning decisions need a rate answer that is closer to reality than a single shop-average number.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={loadRates}>Refresh library</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('compare');
                  void runCompare();
                }}
              >
                Compare machines
              </ActionButton>
              <ActionButton
                tone="ghost"
                onClick={() => {
                  setTab('effective');
                  void runEffective();
                }}
              >
                Run effective lookup
              </ActionButton>
            </div>
          </div>
        }
      />

      <SurfaceStatusNotice
        title="Commercial source posture"
        surfaces={['commerce']}
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing machine rates..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'compare' ? runCompare : tab === 'effective' ? runEffective : loadRates} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'library' ? (
            <PanelCard title="Rate library" subtitle="Keep the baseline machine economics visible before you compare or override them.">
              {rates.length > 0 ? (
                <div className="space-y-3">
                  {rates.map((rate) => (
                    <div key={rate.machine_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{rate.machine_name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{rate.type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-semibold text-slate-100">${rate.effective_rate.toFixed(2)}</div>
                          <div className="mt-1 text-xs text-slate-500">effective / hr</div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-[1fr_1fr_1fr_auto]">
                        <div>Hourly: ${rate.hourly_rate.toFixed(2)}</div>
                        <div>Setup: ${rate.setup_rate.toFixed(2)}</div>
                        <div>Overhead: ${rate.overhead_rate.toFixed(2)}</div>
                        <div className="md:text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEffectiveMachineId(rate.machine_id);
                              setTab('effective');
                            }}
                            className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.10] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50 transition hover:bg-emerald-300/[0.18]"
                          >
                            Use for lookup
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No machine rates are currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'compare' ? (
            <>
              <PanelCard title="Compare machines" subtitle="Compare the machines you are actually choosing between instead of scanning the whole rate library.">
                <div className="space-y-4">
                  <Field label="Machine library">
                    <div className="grid gap-3 md:grid-cols-2">
                      {rates.map((rate) => {
                        const selected = selectedCompareMachineIds.includes(rate.machine_id);
                        return (
                          <button
                            key={rate.machine_id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              setUseManualCompareIds(false);
                              setSelectedCompareMachineIds((current) => toggleMachineSelection(current, rate.machine_id));
                            }}
                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                              selected
                                ? 'border-emerald-300/22 bg-emerald-300/[0.10] text-emerald-50'
                                : 'border-white/10 bg-slate-950/80 text-slate-200 hover:border-white/16 hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="text-sm font-semibold">{rate.machine_name}</div>
                            <div className="mt-2 text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
                              {rate.machine_id} · ${rate.effective_rate.toFixed(2)}/hr
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm leading-6 text-slate-300">
                        Registry-backed machine selection keeps the rate comparison tied to the mounted library instead of hand-typed IDs.
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseManualCompareIds((current) => !current)}
                        className="rounded-full border border-amber-300/22 bg-amber-300/[0.08] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-50 transition hover:bg-amber-300/[0.14]"
                      >
                        {useManualCompareIds ? 'Hide manual IDs' : 'Use manual IDs'}
                      </button>
                    </div>
                    {useManualCompareIds ? (
                      <div className="mt-4 space-y-2">
                        <Field label="Manual machine IDs">
                          <Input
                            value={manualCompareIds}
                            onChange={(event) => setManualCompareIds(event.target.value)}
                            placeholder="CNC-1, CNC-2, CNC-3"
                          />
                        </Field>
                        <div className="text-xs leading-5 text-amber-100/80">
                          Manual IDs remain available as an advanced path, but they downgrade provenance because the registry could not verify the selection.
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="md:self-end">
                    <ActionButton onClick={runCompare}>Compare</ActionButton>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Compare output" subtitle="Use the comparison lane for actual routing decisions, not just rate curiosity.">
                {compareOutput.machines.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <SummaryTile
                        label="Cheapest"
                        value={compareOutput.cheapest || 'Unknown'}
                        hint="Lowest hourly rate across the compared machines."
                        accent="from-amber-300/22 via-amber-200/8 to-transparent"
                      />
                      <SummaryTile
                        label="Most productive"
                        value={compareOutput.mostProductive || 'Unknown'}
                        hint="Highest annual cost posture returned by the backend comparison."
                        accent="from-sky-400/22 via-sky-300/8 to-transparent"
                      />
                    </div>
                    <div className="grid gap-3">
                      {compareOutput.machines.map((machine) => (
                        <div key={machine.id} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[1.2fr_120px_120px_160px]">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{machine.name}</div>
                            <div className="mt-1 text-xs font-mono text-slate-500">{machine.id}</div>
                          </div>
                          <div className="text-sm text-slate-300">
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Hourly</div>
                            <div className="mt-2 font-mono text-slate-100">${machine.hourly_rate.toFixed(2)}</div>
                          </div>
                          <div className="text-sm text-slate-300">
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Setup multiplier</div>
                            <div className="mt-2 text-slate-100">{machine.setup_multiplier.toFixed(2)}x</div>
                          </div>
                          <div className="text-sm text-slate-300">
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Annual cost</div>
                            <div className="mt-2 font-mono text-slate-100">${machine.annual_cost.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No machine comparison is currently staged.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'effective' ? (
            <>
              <PanelCard title="Effective rate lookup" subtitle="Use OEE posture when a raw library number is too blunt for the decision.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Field label="Machine library">
                    <Select
                      value={useManualEffectiveMachineId ? '__manual__' : (resolvedEffectiveMachineId || activeRate?.machine_id || '')}
                      onChange={(event) => {
                        if (event.target.value === '__manual__') {
                          setUseManualEffectiveMachineId(true);
                          setManualEffectiveMachineId(resolvedEffectiveMachineId);
                          return;
                        }

                        setUseManualEffectiveMachineId(false);
                        setEffectiveMachineId(event.target.value);
                      }}
                    >
                      {!resolvedEffectiveMachineId && !activeRate ? <option value="">Select a machine</option> : null}
                      {rates.map((rate) => (
                        <option key={rate.machine_id} value={rate.machine_id}>
                          {rate.machine_name} ({rate.machine_id})
                        </option>
                      ))}
                      <option value="__manual__">Manual machine ID</option>
                    </Select>
                  </Field>
                  <Field label="OEE posture">
                    <Select
                      value={oeeLevel}
                      onChange={(event) => setOeeLevel(event.target.value as OeeLevel)}
                    >
                      {OEE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={runEffective}>Lookup</ActionButton>
                  </div>
                </div>
                {useManualEffectiveMachineId ? (
                  <div className="mt-4 space-y-2">
                    <Field label="Manual machine ID">
                      <Input
                        value={manualEffectiveMachineId}
                        onChange={(event) => setManualEffectiveMachineId(event.target.value)}
                        placeholder="CNC-1"
                      />
                    </Field>
                    <div className="text-xs leading-5 text-amber-100/80">
                      Manual machine IDs remain available for advanced routing cases, but they downgrade provenance because the mounted library could not verify the selection.
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {OEE_OPTIONS.map((option) => (
                    <div
                      key={option.id}
                      className={`rounded-[20px] border px-4 py-4 text-sm ${
                        option.id === oeeLevel
                          ? 'border-emerald-300/22 bg-emerald-300/[0.08] text-emerald-50'
                          : 'border-white/8 bg-white/[0.03] text-slate-300'
                      }`}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <div className="mt-2 leading-6 text-slate-400">{option.detail}</div>
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard title="Effective rate output" subtitle="Keep the context-adjusted rate visible while the job is being routed or re-quoted.">
                {effectiveOutput.effectiveRateHr !== null ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <SummaryTile
                      label="Machine"
                      value={effectiveOutput.machineId || 'Unknown'}
                      hint={effectiveOutput.machineName}
                    />
                    <SummaryTile
                      label="OEE posture"
                      value={formatOeeLabel(effectiveOutput.oeeLevel)}
                      hint="Backend-adjusted rate posture."
                      accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                    />
                    <SummaryTile
                      label="Effective / hr"
                      value={`$${effectiveOutput.effectiveRateHr.toFixed(2)}`}
                      hint="Mounted ERP machine-rate-effective result."
                      accent="from-sky-400/22 via-sky-300/8 to-transparent"
                    />
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No effective rate lookup is currently staged.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Source posture" subtitle="Expose source, freshness, and override posture directly in the desk before a pricing or routing decision leaves this page.">
            <div className="space-y-3">
              <SourcePostureCard
                label="Rate library"
                source="Mounted ERP machine-rate library"
                refreshedAt={libraryRefreshedAt}
                selection="Registry-backed machine list"
                unavailableReason={libraryIssue}
              />
              <SourcePostureCard
                label="Compare lane"
                source="Mounted ERP machine-rate compare"
                refreshedAt={compareRefreshedAt}
                selection={compareSelectionSummary}
                unavailableReason={compareIssue}
              />
              <SourcePostureCard
                label="Effective lookup"
                source="Mounted ERP machine-rate-effective"
                refreshedAt={effectiveRefreshedAt}
                selection={effectiveSelectionSummary}
                unavailableReason={effectiveIssue}
              />
            </div>
          </PanelCard>

          <PanelCard title="Rate brief" subtitle="Keep the reason for the lookup visible so the rate desk supports real routing and commercial decisions.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Use the library for baseline posture, comparison for routing choices, and effective rate when one machine’s uptime profile changes the economics.</li>
                  <li>Setup and overhead matter as much as pure spindle-hour rate when routing short or complex work.</li>
                  <li>If the effective rate diverges sharply from the library, the routing or quote posture deserves a deeper review.</li>
                </ul>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Workflow handoff" subtitle="Carry the selected machine and upstream packet context into the next desk instead of reselecting it by hand.">
            <div className="space-y-3">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                Active machine: <span className="font-semibold text-slate-100">{activeRate?.machine_name ?? effectiveMachineId ?? 'No machine selected'}</span>
                {' -> '}OEE posture <span className="font-semibold text-slate-100">{formatOeeLabel(oeeLevel)}</span>
              </div>
              <Link
                to={quoteBuilderPath}
                className="block rounded-[20px] border border-violet-300/20 bg-violet-300/[0.10] px-4 py-4 text-sm font-semibold text-violet-50 transition hover:bg-violet-300/[0.16]"
              >
                <div>Open Quote Builder</div>
                <div className="mt-2 text-sm font-normal leading-6 text-violet-50/80">
                  Carry the selected machine posture back into quoting so commercial changes stay tied to the same machine truth.
                </div>
              </Link>
              <Link
                to={printToCncPath}
                className="block rounded-[20px] border border-cyan-300/20 bg-cyan-300/[0.10] px-4 py-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.16]"
              >
                <div>Open Print to CNC</div>
                <div className="mt-2 text-sm font-normal leading-6 text-cyan-50/80">
                  Use the same machine selection in release routing instead of rebuilding it from scratch downstream.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
