/**
 * ShopProfilePage — "My Shop" configuration page.
 *
 * Manages: machines (with lathe-specific capabilities), tool magazine per machine,
 *          shop rates, default preferences. Data persists to data/shop/shop-profile.json
 *          and flows into calculator defaults + program generation constraints.
 *
 * LATHE-UNIFIED M5: U-SHOP02
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  fetchProgrammingCatalogState,
  type CalculatorCatalogLoadState,
} from '../api/calculatorData';
import {
  addShopMachine,
  fetchActiveShopProfile,
  fetchShopMachineControllerRegistry,
  fetchShopMachineSeedSummary,
  fetchShopSelectorResourceSummary,
  removeShopMachine,
  type JMDieSelectorSeedSummary,
  type ShopMachine,
  type ShopMachineControllerRegistryEntry,
  type ShopMachineSeedSummary,
  type ShopProfile,
  updateActiveShopProfile,
  updateShopMachine,
} from '../api/shopProfile';
import {
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { MachineWorkspaceProgrammingAuthority } from '../features/machine-workspace/MachineWorkspaceState';
import { buildMachineWorkspaceProgrammingAuthority } from '../features/machine-workspace/routeProgrammingAuthority';
import {
  resolveToolpathAdvisorRouteAuthority,
  type ProgramReleaseRouteSelection,
} from '../features/machine-workspace/selectorAuthorityContract';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import type {
  MachineMode as CalculatorMachineMode,
  ProgrammingEnvironmentOption,
} from '../data/calculatorWorkspace';
import { buildWorkflowPath } from '../utils/workflowRouteContext';

const MACHINE_TYPES = [
  'Lathe', 'Swiss Lathe', 'VMC', '5-axis', 'HMC',
  'Grinder', 'Wire EDM', 'EDM', 'Saw', 'CMM',
];

const CONTROLLERS = [
  { id: 'fanuc', label: 'Fanuc' }, { id: 'haas', label: 'Haas NGC' },
  { id: 'okuma', label: 'Okuma OSP' }, { id: 'mazak', label: 'Mazak Smooth' },
  { id: 'siemens', label: 'Siemens 840D' }, { id: 'dmg_mori', label: 'DMG MORI' },
  { id: 'citizen', label: 'Citizen Cincom' }, { id: 'star', label: 'Star' },
];

const WEDM_BRANDS = [
  { id: 'sodick', label: 'Sodick' }, { id: 'mitsubishi', label: 'Mitsubishi' },
  { id: 'makino', label: 'Makino' }, { id: 'agiecharmilles', label: 'AgieCharmilles' },
  { id: 'fanuc', label: 'Fanuc' }, { id: 'other', label: 'Other' },
];

const ROOT_LABELS: Array<{ key: keyof ShopProfile['source_roots']; label: string }> = [
  { key: 'company_root', label: 'Company root' },
  { key: 'programs_root', label: 'Programs' },
  { key: 'employee_database_root', label: 'Employee database' },
  { key: 'machines_root', label: 'Machines' },
  { key: 'controllers_root', label: 'Controllers' },
  { key: 'tool_holders_root', label: 'Tool holders' },
  { key: 'tooling_root', label: 'Tooling' },
  { key: 'materials_root', label: 'Materials' },
  { key: 'prints_root', label: 'Prints' },
];

type ShopProgrammingMode = Extract<CalculatorMachineMode, 'mill' | 'lathe' | 'wire_edm' | 'edm'>;

type ShopProgrammingAuthoritySnapshot = {
  mode: ShopProgrammingMode;
  label: string;
  machineLabel: string;
  machineKinematics: string;
  controllerLabel: string;
  state: CalculatorCatalogLoadState<ProgrammingEnvironmentOption>;
  authority: MachineWorkspaceProgrammingAuthority | null;
};

type ShopProgrammingRouteSeed = {
  packetId: string;
  recordId: string;
  routeSelection: ProgramReleaseRouteSelection;
  releaseAvailable: boolean;
  releaseNote: string;
  releaseUnavailableNote?: string;
  toolpathUnavailableNote?: string;
};

type ShopProgrammingRouteLaunch = {
  printToCncPath: string | null;
  toolpathPath: string | null;
  releaseNote: string;
  toolpathNote: string;
};

const SHOP_PROGRAMMING_PROFILES: Array<{
  mode: ShopProgrammingMode;
  label: string;
  machineFamilyId: string;
  machineLabel: string;
  machineKinematics: string;
  controllerLabel: string;
}> = [
  {
    mode: 'mill',
    label: 'Mill programming',
    machineFamilyId: 'mill',
    machineLabel: 'Roku-Roku HC 658II',
    machineKinematics: '3-axis vertical mill',
    controllerLabel: 'Fanuc 31i-B5',
  },
  {
    mode: 'lathe',
    label: 'Lathe programming',
    machineFamilyId: 'lathe',
    machineLabel: 'Haas ST-20Y',
    machineKinematics: 'Turning center with Y-axis and live tooling',
    controllerLabel: 'Haas NGC',
  },
  {
    mode: 'wire_edm',
    label: 'Wire EDM programming',
    machineFamilyId: 'wire-edm',
    machineLabel: 'JM Die wire EDM cell',
    machineKinematics: 'Wire EDM',
    controllerLabel: 'Mitsubishi CNC',
  },
  {
    mode: 'edm',
    label: 'Sinker EDM programming',
    machineFamilyId: 'sinker-edm',
    machineLabel: 'JM Die sinker EDM electrode prep',
    machineKinematics: 'Sinker EDM electrode prep',
    controllerLabel: 'Fanuc 31i-B5',
  },
];

const SHOP_PROGRAMMING_ROUTE_SEEDS: Record<ShopProgrammingMode, ShopProgrammingRouteSeed> = {
  mill: {
    packetId: 'pkt__shop__mill_programming',
    recordId: 'mill-programming',
    routeSelection: {
      partClassId: 'prismatic-bracket',
      machineId: 'vf2-3x',
      machineFamilyId: '3-axis',
      machineManufacturer: 'haas',
      toolholderId: 'shrinkfit-short',
      toolingPackageId: 'alu-velocity',
      fixtureId: 'modular-plate',
      stockId: '6061-plate',
      cadSourceId: 'fusion-master',
    },
    releaseAvailable: true,
    releaseNote:
      'Launches Print to CNC with the shared 3-axis JM Die release spine while the Roku-Roku release row is still being published into Program Release.',
  },
  lathe: {
    packetId: 'pkt__shop__lathe_programming',
    recordId: 'lathe-programming',
    routeSelection: {
      partClassId: 'turned-shaft',
      machineId: 'st20-turn',
      machineFamilyId: 'lathe',
      machineManufacturer: 'haas',
      toolholderId: 'capto-turn',
      toolingPackageId: 'steel-balanced',
      fixtureId: 'softjaw-collet',
      stockId: '174-round',
      cadSourceId: 'fusion-master',
    },
    releaseAvailable: true,
    releaseNote: 'Launches Print to CNC with the canonical JM Die turning release packet.',
  },
  wire_edm: {
    packetId: 'pkt__shop__wire_edm_programming',
    recordId: 'wire-edm-programming',
    routeSelection: {
      partClassId: 'fixture-plate',
      machineId: 'aln600g-wire',
      machineFamilyId: 'wire-edm',
      machineManufacturer: 'sodick',
      toolholderId: null,
      toolingPackageId: null,
      fixtureId: 'modular-plate',
      stockId: 'd2-plate',
      cadSourceId: 'neutral-compare',
    },
    releaseAvailable: true,
    releaseNote: 'Launches Print to CNC with the canonical JM Die wire EDM release packet.',
  },
  edm: {
    packetId: 'pkt__shop__sinker_edm_programming',
    recordId: 'sinker-edm-programming',
    routeSelection: {
      partClassId: 'fixture-plate',
      machineId: null,
      machineFamilyId: 'sinker-edm',
      machineManufacturer: 'fanuc',
      toolholderId: null,
      toolingPackageId: null,
      fixtureId: null,
      stockId: null,
      cadSourceId: 'neutral-compare',
    },
    releaseAvailable: false,
    releaseNote: '',
    releaseUnavailableNote:
      'Print to CNC continuity for sinker EDM is still pending a canonical sinker machine row in the shared Program Release catalog.',
    toolpathUnavailableNote:
      'Toolpath Advisor stays unavailable for sinker EDM until the routed release contract can name a canonical sinker machine and electrode-package spine.',
  },
};

function programmingAuthorityTone(posture: MachineWorkspaceProgrammingAuthority['posture']) {
  if (posture === 'live') return 'emerald' as const;
  if (posture === 'hybrid') return 'sky' as const;
  if (posture === 'curated-service') return 'violet' as const;
  if (posture === 'fallback') return 'amber' as const;
  return 'slate' as const;
}

function buildShopProgrammingAuthoritySnapshot(
  profile: (typeof SHOP_PROGRAMMING_PROFILES)[number],
  state: CalculatorCatalogLoadState<ProgrammingEnvironmentOption>,
): ShopProgrammingAuthoritySnapshot {
  return {
    mode: profile.mode,
    label: profile.label,
    machineLabel: profile.machineLabel,
    machineKinematics: profile.machineKinematics,
    controllerLabel: profile.controllerLabel,
    state,
    authority:
      buildMachineWorkspaceProgrammingAuthority({
        mode: profile.mode,
        machineFamilyId: profile.machineFamilyId,
        machineLabel: profile.machineLabel,
        machineKinematics: profile.machineKinematics,
        controllerLabel: profile.controllerLabel,
        programmingCatalogState: state,
      }) ?? null,
  };
}

function buildShopProgrammingRouteLaunch(
  snapshot: ShopProgrammingAuthoritySnapshot,
  currentSearch: string,
): ShopProgrammingRouteLaunch {
  const seed = SHOP_PROGRAMMING_ROUTE_SEEDS[snapshot.mode];
  if (!seed.releaseAvailable) {
    return {
      printToCncPath: null,
      toolpathPath: null,
      releaseNote:
        seed.releaseUnavailableNote
        ?? 'Shared release continuity is still pending for this programming slice.',
      toolpathNote:
        seed.toolpathUnavailableNote
        ?? 'Toolpath Advisor is still pending a routed release contract for this programming slice.',
    };
  }

  const origin = {
    source: 'shop',
    recordType: 'Shop Programming Profile',
    recordId: seed.recordId,
    note: `Launch the canonical JM Die ${snapshot.label.toLowerCase()} packet from Shop Profile.`,
  };
  const focus = {
    type: 'packet',
    id: seed.packetId,
    packetId: seed.packetId,
  };
  const extras = {
    packetId: seed.packetId,
    partClassId: seed.routeSelection.partClassId,
    machineId: seed.routeSelection.machineId,
    machineFamilyId: seed.routeSelection.machineFamilyId,
    machineManufacturer: seed.routeSelection.machineManufacturer,
    toolholderId: seed.routeSelection.toolholderId,
    toolingPackageId: seed.routeSelection.toolingPackageId,
    fixtureId: seed.routeSelection.fixtureId,
    stockId: seed.routeSelection.stockId,
    cadSourceId: seed.routeSelection.cadSourceId,
  };
  const routedToolpathAuthority = resolveToolpathAdvisorRouteAuthority(
    PROGRAM_RELEASE_CATALOG,
    seed.routeSelection,
  );

  return {
    printToCncPath: buildWorkflowPath('/print-to-cnc', currentSearch, {
      origin,
      focus,
      extras,
    }),
    toolpathPath: routedToolpathAuthority?.unsupportedReason
      ? null
      : buildWorkflowPath('/toolpath', currentSearch, {
        origin,
        focus,
        extras,
      }),
    releaseNote: seed.releaseNote,
    toolpathNote:
      routedToolpathAuthority?.unsupportedReason
      ?? (
        routedToolpathAuthority
          ? `${routedToolpathAuthority.releaseContext.authorityNote} Toolpath Advisor will open with the same routed selector packet.`
          : 'Toolpath Advisor will open with the same routed selector packet.'
      ),
  };
}

export function ShopProfilePage() {
  const location = useLocation();
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMachine, setEditingMachine] = useState<ShopMachine | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [machineControllerRegistry, setMachineControllerRegistry] = useState<ShopMachineControllerRegistryEntry[]>([]);
  const [machineSeedSummary, setMachineSeedSummary] = useState<ShopMachineSeedSummary | null>(null);
  const [selectorResourceSummary, setSelectorResourceSummary] = useState<JMDieSelectorSeedSummary | null>(null);
  const [programmingAuthoritySnapshots, setProgrammingAuthoritySnapshots] = useState<ShopProgrammingAuthoritySnapshot[]>([]);

  const refreshAuthoritySnapshots = useCallback(async () => {
    const [registryResult, machineSeedResult, selectorSeedResult, programmingResults] = await Promise.allSettled([
      fetchShopMachineControllerRegistry(),
      fetchShopMachineSeedSummary(),
      fetchShopSelectorResourceSummary(),
      Promise.all(
        SHOP_PROGRAMMING_PROFILES.map(async (programmingProfile) =>
          buildShopProgrammingAuthoritySnapshot(
            programmingProfile,
            await fetchProgrammingCatalogState(programmingProfile.mode),
          )),
      ),
    ]);

    if (registryResult.status === 'fulfilled') {
      setMachineControllerRegistry(registryResult.value);
    }
    if (machineSeedResult.status === 'fulfilled') {
      setMachineSeedSummary(machineSeedResult.value);
    }
    if (selectorSeedResult.status === 'fulfilled') {
      setSelectorResourceSummary(selectorSeedResult.value);
    }
    if (programmingResults.status === 'fulfilled') {
      setProgrammingAuthoritySnapshots(programmingResults.value);
    }
  }, []);

  // Load profile on mount
  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchActiveShopProfile(),
      fetchShopMachineControllerRegistry(),
      fetchShopMachineSeedSummary(),
      fetchShopSelectorResourceSummary(),
      Promise.all(
        SHOP_PROGRAMMING_PROFILES.map(async (programmingProfile) =>
          buildShopProgrammingAuthoritySnapshot(
            programmingProfile,
            await fetchProgrammingCatalogState(programmingProfile.mode),
          )),
      ),
    ])
      .then(([profileResult, registryResult, machineSeedResult, selectorSeedResult, programmingResults]) => {
        if (!active) {
          return;
        }

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
        }
        if (registryResult.status === 'fulfilled') {
          setMachineControllerRegistry(registryResult.value);
        }
        if (machineSeedResult.status === 'fulfilled') {
          setMachineSeedSummary(machineSeedResult.value);
        }
        if (selectorSeedResult.status === 'fulfilled') {
          setSelectorResourceSummary(selectorSeedResult.value);
        }
        if (programmingResults.status === 'fulfilled') {
          setProgrammingAuthoritySnapshots(programmingResults.value);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const saveProfile = useCallback(async (updates: Partial<ShopProfile>) => {
    setSaving(true);
    try {
      const nextProfile = await updateActiveShopProfile(updates);
      setProfile(nextProfile);
    } finally { setSaving(false); }
  }, []);

  const upsertMachine = useCallback(async (machine: ShopMachine) => {
    try {
      const exists = profile?.machines.some((item) => item.id === machine.id) ?? false;

      if (exists) {
        const updatedMachine = await updateShopMachine(machine.id, machine);
        if (profile) {
          setProfile({
            ...profile,
            machines: profile.machines.map((item) => (item.id === updatedMachine.id ? updatedMachine : item)),
          });
        }
      } else {
        const machines = await addShopMachine(machine);
        if (profile) {
          setProfile({ ...profile, machines });
        }
      }

      setShowAddForm(false);
      setEditingMachine(null);
      void refreshAuthoritySnapshots();
    } catch {}
  }, [profile, refreshAuthoritySnapshots]);

  const removeMachine = useCallback(async (id: string) => {
    try {
      const machines = await removeShopMachine(id);
      if (profile) {
        setProfile({ ...profile, machines });
      }
      void refreshAuthoritySnapshots();
    } catch {}
  }, [profile, refreshAuthoritySnapshots]);

  const sec = 'bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-5 mb-4';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const inp = 'w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 mt-1';
  const programmingRouteLaunches = useMemo(
    () => new Map(
      programmingAuthoritySnapshots.map((snapshot) => [
        snapshot.mode,
        buildShopProgrammingRouteLaunch(snapshot, location.search),
      ]),
    ),
    [location.search, programmingAuthoritySnapshots],
  );
  const launchLink =
    'inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/15 hover:text-cyan-100';

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-400">Loading shop profile...</div>;

  const lathes = profile?.machines.filter(m => m.type === 'Lathe' || m.type === 'Swiss Lathe') ?? [];
  const wireEdmMachines = profile?.machines.filter(m => m.type === 'Wire EDM') ?? [];
  const mills = profile?.machines.filter(m => m.type === 'VMC' || m.type === '5-axis' || m.type === 'HMC') ?? [];
  const other = profile?.machines.filter(m => !['Lathe', 'Swiss Lathe', 'VMC', '5-axis', 'HMC', 'Wire EDM'].includes(m.type)) ?? [];
  const activeSeedDomains = profile?.seed_domains.filter(domain => domain.status !== 'planned').length ?? 0;
  const readyRegistryMachines = machineControllerRegistry.filter((entry) => entry.program_release_ready).length;
  const canonicalRegistryMachines = machineControllerRegistry.filter((entry) => entry.canonical_test_machine).length;
  const selectorRootsPresent = [
    selectorResourceSummary?.tool_holders_root_present,
    selectorResourceSummary?.tooling_root_present,
    selectorResourceSummary?.materials_root_present,
  ].filter(Boolean).length;
  const programsSeedDomain = profile?.seed_domains.find((domain) => domain.id === 'programs');
  const seededProgrammingSlices = programmingAuthoritySnapshots.filter((snapshot) => snapshot.authority).length;
  const liveProgrammingSlices = programmingAuthoritySnapshots.filter((snapshot) => snapshot.state.source === 'live').length;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 pb-12">
      <WorkspaceHero
        eyebrow={profile?.company_profile.canonical_test_shop ? 'Canonical Test Shop' : 'Shop Profile'}
        title={profile?.company_profile.legal_name ?? 'Shop Configuration'}
        description={
          profile?.company_profile.development_role ??
          'Configure your machines, rates, and preferences. Programs are optimized for your equipment.'
        }
        metrics={
          <>
            <SummaryTile label="Machines" value={String(profile?.machines.length ?? 0)} hint="configured" />
            <SummaryTile label="Lathes" value={String(lathes.length)} hint="turning" />
            <SummaryTile label="Wire EDM" value={String(wireEdmMachines.length)} hint="wire cutting" />
            <SummaryTile label="Seed Domains" value={String(profile?.seed_domains.length ?? 0)} hint={`${activeSeedDomains} active`} />
          </>
        }
      />

      {profile && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className={sec}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">JM Die canonical company profile</h3>
                <p className="mt-1 text-sm text-zinc-400">{profile.company_profile.specialization}</p>
              </div>
              <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-300">
                {profile.company_profile.short_code}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Identity</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  <div><span className="text-zinc-500">Industry:</span> {profile.company_profile.industry}</div>
                  <div><span className="text-zinc-500">Region:</span> {profile.company_profile.region}</div>
                  <div><span className="text-zinc-500">Timezone:</span> {profile.company_profile.timezone}</div>
                  <div><span className="text-zinc-500">Archive:</span> {profile.company_profile.file_archive_path}</div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Systems</div>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs text-zinc-500">CAD</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.company_profile.cad_systems.map(system => (
                        <span key={system} className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200">{system}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">CAM</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.company_profile.cam_systems.map(system => (
                        <span key={system} className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200">{system}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Canonical roots</div>
                <div className="text-xs text-zinc-500">{profile.source_roots.company_root}</div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {ROOT_LABELS.map(({ key, label }) => (
                  <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
                    <div className="mt-1 break-all font-mono text-[11px] text-zinc-200">
                      {profile.source_roots[key]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={sec}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Development seed domains</h3>
                <p className="mt-1 text-sm text-zinc-400">Programs, people, machines, tooling, materials, and prints all stage through JM Die first.</p>
              </div>
              <div className="text-xs text-zinc-500">{activeSeedDomains} active</div>
            </div>

            <div className="space-y-3">
              {profile.seed_domains.map((domain) => (
                <div key={domain.id} className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-zinc-100">{domain.label}</div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${
                      domain.status === 'seeded'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : domain.status === 'in_progress'
                          ? 'bg-cyan-500/15 text-cyan-300'
                          : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {domain.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{domain.note}</p>
                  <div className="mt-2 break-all font-mono text-[11px] text-zinc-500">{domain.source_path}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className={sec}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Canonical machine and controller authority</h3>
              <p className="mt-1 text-sm text-zinc-400">Routed machine pages and Program Release now read from this JM Die registry posture.</p>
            </div>
            <div className="text-xs text-zinc-500">{machineControllerRegistry.length} registry rows</div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <SummaryTile label="Mapped controllers" value={String(machineSeedSummary?.mapped_controller_count ?? 0)} hint="controller registry matches" />
            <SummaryTile label="Release ready" value={String(machineSeedSummary?.program_release_ready_machine_count ?? readyRegistryMachines)} hint="program release posture" />
            <SummaryTile label="Canonical machines" value={String(canonicalRegistryMachines)} hint="JM Die test cells" />
            <SummaryTile label="Unmapped" value={String(machineSeedSummary?.unmapped_machine_count ?? 0)} hint="needs controller truth" />
          </div>

          <div className="mt-4 space-y-3">
            {machineControllerRegistry.length === 0 ? (
              <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 px-4 py-4 text-sm text-zinc-500">
                Machine/controller registry snapshots are not available yet.
              </div>
            ) : (
              machineControllerRegistry.slice(0, 6).map((entry) => (
                <div key={entry.machine_id} className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-100">{entry.machine_name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{entry.machine_id} - {entry.machine_type}</div>
                    </div>
                    <div className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${
                      entry.program_release_ready
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {entry.program_release_ready ? 'release ready' : 'staged'}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-3">
                    <div><span className="text-zinc-500">Controller:</span> {entry.controller_family} {entry.controller_model}</div>
                    <div><span className="text-zinc-500">Rate:</span> ${entry.machine_rate_per_hour}/hr</div>
                    <div><span className="text-zinc-500">Post:</span> {entry.post_processor ?? 'pending'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className={sec}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Selector resource authority</h3>
                <p className="mt-1 text-sm text-zinc-400">Tool holders, tooling, and material selectors now track these JM Die seed resources.</p>
              </div>
              <div className="text-xs text-zinc-500">{selectorRootsPresent}/3 roots present</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SummaryTile label="Tool holders" value={String(selectorResourceSummary?.toolholder_count ?? 0)} hint={`${selectorResourceSummary?.live_holder_count ?? 0} live entries`} />
              <SummaryTile label="Tooling packages" value={String(selectorResourceSummary?.tooling_package_count ?? 0)} hint={`${selectorResourceSummary?.live_tool_count ?? 0} live tools`} />
              <SummaryTile label="Stock profiles" value={String(selectorResourceSummary?.stock_profile_count ?? 0)} hint="selector-ready stock baselines" />
              <SummaryTile label="Categories" value={String(selectorResourceSummary?.tooling_categories.length ?? 0)} hint="tooling domain coverage" />
            </div>

            <div className="mt-4 space-y-3">
              {selectorResourceSummary ? (
                <>
                  <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Live roots</div>
                    <div className="mt-3 space-y-2 text-xs text-zinc-300">
                      <div><span className="text-zinc-500">Tool holders:</span> {selectorResourceSummary.tool_holders_root_present ? 'present' : 'pending'} - {selectorResourceSummary.tool_holders_root}</div>
                      <div><span className="text-zinc-500">Tooling:</span> {selectorResourceSummary.tooling_root_present ? 'present' : 'pending'} - {selectorResourceSummary.tooling_root}</div>
                      <div><span className="text-zinc-500">Materials:</span> {selectorResourceSummary.materials_root_present ? 'present' : 'pending'} - {selectorResourceSummary.materials_root}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Tooling categories</div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {selectorResourceSummary.tooling_categories.map((category) => (
                        <span key={category} className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200">{category}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 px-4 py-4 text-sm text-zinc-500">
                  Selector seed summaries are still loading or unavailable.
                </div>
              )}
            </div>
          </div>

          <div className={sec}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Programming authority</h3>
                <p className="mt-1 text-sm text-zinc-400">JM Die programming seeds now stay visible across mill, lathe, wire EDM, and sinker EDM setup slices.</p>
              </div>
              <div className="text-xs text-zinc-500">{seededProgrammingSlices}/4 slices resolved</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SummaryTile label="CAM systems" value={String(profile?.company_profile.cam_systems.length ?? 0)} hint="company-standard packages" />
              <SummaryTile label="Live slices" value={String(liveProgrammingSlices)} hint="backend programming registry" />
              <SummaryTile
                label="Programs root"
                value={programsSeedDomain?.status === 'seeded' ? 'Seeded' : programsSeedDomain?.status === 'in_progress' ? 'Staged' : 'Planned'}
                hint={profile?.source_roots.programs_root ?? 'Programs root pending'}
              />
              <SummaryTile label="Profiles" value={String(programmingAuthoritySnapshots.length)} hint="shared programming posture cards" />
            </div>

            <div className="mt-4 space-y-3">
              {programmingAuthoritySnapshots.length ? (
                programmingAuthoritySnapshots.map((snapshot) => {
                  const routeLaunch = programmingRouteLaunches.get(snapshot.mode);

                  return (
                  <div
                    key={snapshot.mode}
                    role="region"
                    aria-label={snapshot.label}
                    className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-100">{snapshot.label}</div>
                        <div className="mt-1 text-xs text-zinc-500">{snapshot.machineLabel} - {snapshot.controllerLabel}</div>
                      </div>
                      {snapshot.authority ? (
                        <StatusPill
                          label={snapshot.authority.badge}
                          tone={programmingAuthorityTone(snapshot.authority.posture)}
                        />
                      ) : null}
                    </div>
                    {snapshot.authority ? (
                      <>
                        <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-3">
                          <div><span className="text-zinc-500">Environment:</span> {snapshot.authority.environmentLabel ?? snapshot.authority.badge}</div>
                          <div><span className="text-zinc-500">License:</span> {snapshot.authority.licenseLabel ?? 'pending'}</div>
                          <div><span className="text-zinc-500">Toolpath:</span> {snapshot.authority.toolpathLabel ?? snapshot.authority.toolpathTypeLabel ?? 'pending'}</div>
                        </div>
                        <div className="mt-3 text-sm text-zinc-400">{snapshot.authority.note}</div>
                      </>
                    ) : (
                      <div className="mt-3 text-sm text-zinc-500">Programming posture has not resolved for this slice yet.</div>
                    )}
                    {routeLaunch ? (
                      <div className="mt-4 rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-4">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Continuity</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {routeLaunch.printToCncPath ? (
                            <Link to={routeLaunch.printToCncPath} className={launchLink}>
                              Open Print to CNC
                            </Link>
                          ) : null}
                          {routeLaunch.toolpathPath ? (
                            <Link to={routeLaunch.toolpathPath} className={launchLink}>
                              Open Toolpath Advisor
                            </Link>
                          ) : null}
                        </div>
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="text-zinc-400">{routeLaunch.releaseNote}</div>
                          <div className={routeLaunch.toolpathPath ? 'text-sky-200/80' : 'text-amber-300'}>
                            {routeLaunch.toolpathNote}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
                })
              ) : (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 px-4 py-4 text-sm text-zinc-500">
                  Programming authority snapshots are still loading or unavailable.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shop Rates */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-200">Shop Rates</h3>
          <span className="text-xs text-zinc-500">Used for cost estimation and quoting</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {profile && Object.entries(profile.rates).map(([key, val]) => (
            <div key={key}>
              <label className={lbl}>{key.replace(/_/g, ' ')}</label>
              <div className="flex items-center mt-1">
                <span className="text-zinc-400 text-sm mr-1">$</span>
                <input type="number" className={inp} value={val}
                  onChange={(e) => {
                    const newRates = { ...profile.rates, [key]: Number(e.target.value) };
                    setProfile({ ...profile, rates: newRates });
                  }}
                  onBlur={() => saveProfile({ rates: profile.rates })}
                  min={0} step={5}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Machines — Lathes */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-200">Lathes ({lathes.length})</h3>
          <button onClick={() => { setEditingMachine({ id: `LTH-${Date.now()}`, name: '', type: 'Lathe', hourly_rate: 75, capabilities: ['turning'], turret_stations: 12 }); setShowAddForm(true); }}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-medium text-white">
            + Add Lathe
          </button>
        </div>
        {lathes.length === 0 && <p className="text-sm text-zinc-500">No lathes configured. Add one to enable lathe programming.</p>}
        <div className="grid grid-cols-1 gap-3">
          {lathes.map(m => (
            <div key={m.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-zinc-100">{m.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">{m.id}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingMachine(m); setShowAddForm(true); }} className="text-xs text-cyan-400 hover:text-cyan-300">Edit</button>
                  <button onClick={() => removeMachine(m.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div><span className="text-zinc-500">Controller:</span> <span className="text-zinc-200">{m.controller ?? 'fanuc'}</span></div>
                <div><span className="text-zinc-500">Max RPM:</span> <span className="text-zinc-200">{m.max_rpm ?? '—'}</span></div>
                <div><span className="text-zinc-500">Power:</span> <span className="text-zinc-200">{m.max_power_kw ?? '—'} kW</span></div>
                <div><span className="text-zinc-500">Bar:</span> <span className="text-zinc-200">{m.bar_capacity_mm ? `${m.bar_capacity_mm}mm` : '—'}</span></div>
                <div><span className="text-zinc-500">Live tool:</span> <span className={m.has_live_tooling ? 'text-emerald-400' : 'text-zinc-500'}>{m.has_live_tooling ? 'Yes' : 'No'}</span></div>
                <div><span className="text-zinc-500">Sub-spindle:</span> <span className={m.has_sub_spindle ? 'text-emerald-400' : 'text-zinc-500'}>{m.has_sub_spindle ? 'Yes' : 'No'}</span></div>
              </div>
              {m.magazine && m.magazine.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {m.magazine.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-zinc-700 rounded text-[10px] text-zinc-300">
                      T{String(t.station).padStart(2, '0')}: {t.insert_type ?? 'empty'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Machines — Wire EDM */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-200">Wire EDM ({wireEdmMachines.length})</h3>
          <button onClick={() => { setEditingMachine({ id: `WEDM-${Date.now()}`, name: '', type: 'Wire EDM', hourly_rate: 85, capabilities: ['wire_edm'], wedm_brand: 'sodick', wedm_uv_travel_mm: 80, wedm_max_taper_deg: 30, wedm_max_workpiece_height_mm: 400, wedm_auto_threading: true, wedm_submerged_cutting: true, wedm_wire_inventory: [{ wire_type: 'brass_0.25', diameter_mm: 0.25, spool_weight_kg: 5, remaining_pct: 100 }] }); setShowAddForm(true); }}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-medium text-white">
            + Add Wire EDM
          </button>
        </div>
        {wireEdmMachines.length === 0 && <p className="text-sm text-zinc-500">No wire EDM machines configured. Add one to enable wire EDM programming with your machine limits.</p>}
        <div className="grid grid-cols-1 gap-3">
          {wireEdmMachines.map(m => (
            <div key={m.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-zinc-100">{m.name}</span>
                  <span className="ml-2 text-xs text-purple-400">{m.wedm_brand ?? 'Wire EDM'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingMachine(m); setShowAddForm(true); }} className="text-xs text-cyan-400 hover:text-cyan-300">Edit</button>
                  <button onClick={() => removeMachine(m.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div><span className="text-zinc-500">UV Travel:</span> <span className="text-zinc-200">{m.wedm_uv_travel_mm ?? '—'}mm</span></div>
                <div><span className="text-zinc-500">Max Taper:</span> <span className="text-zinc-200">{m.wedm_max_taper_deg ?? '—'}\u00B0</span></div>
                <div><span className="text-zinc-500">Max Height:</span> <span className="text-zinc-200">{m.wedm_max_workpiece_height_mm ?? '—'}mm</span></div>
                <div><span className="text-zinc-500">Auto Thread:</span> <span className={m.wedm_auto_threading ? 'text-emerald-400' : 'text-zinc-500'}>{m.wedm_auto_threading ? 'Yes' : 'No'}</span></div>
                <div><span className="text-zinc-500">Submerged:</span> <span className={m.wedm_submerged_cutting ? 'text-emerald-400' : 'text-zinc-500'}>{m.wedm_submerged_cutting ? 'Yes' : 'No'}</span></div>
                <div><span className="text-zinc-500">Rate:</span> <span className="text-zinc-200">${m.hourly_rate}/hr</span></div>
              </div>
              {m.wedm_wire_inventory && m.wedm_wire_inventory.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {m.wedm_wire_inventory.map((w, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded text-[10px] ${
                      w.remaining_pct < 20 ? 'bg-red-500/20 text-red-300' : 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {w.wire_type.replace(/_/g, ' ')} {w.diameter_mm}mm ({w.remaining_pct}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Machines — Mills */}
      {mills.length > 0 && (
        <div className={sec}>
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Mills ({mills.length})</h3>
          {mills.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
              <span className="text-sm text-zinc-200">{m.name} <span className="text-xs text-zinc-500">({m.type})</span></span>
              <span className="text-xs text-zinc-400">${m.hourly_rate}/hr</span>
            </div>
          ))}
        </div>
      )}

      {/* Machines — Other */}
      {other.length > 0 && (
        <div className={sec}>
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Other Equipment ({other.length})</h3>
          {other.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
              <span className="text-sm text-zinc-200">{m.name} <span className="text-xs text-zinc-500">({m.type})</span></span>
              <span className="text-xs text-zinc-400">${m.hourly_rate}/hr</span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Machine Modal */}
      {showAddForm && editingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-600 rounded-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              {profile?.machines.some(m => m.id === editingMachine.id) ? 'Edit Machine' : 'Add Machine'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Name</label>
                <input className={inp} value={editingMachine.name} onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })} placeholder="Haas ST-20" /></div>
              <div><label className={lbl}>Type</label>
                <select className={inp} value={editingMachine.type} onChange={(e) => setEditingMachine({ ...editingMachine, type: e.target.value })}>
                  {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className={lbl}>Hourly Rate ($)</label>
                <input type="number" className={inp} value={editingMachine.hourly_rate} onChange={(e) => setEditingMachine({ ...editingMachine, hourly_rate: Number(e.target.value) })} /></div>
              <div><label className={lbl}>Controller</label>
                <select className={inp} value={editingMachine.controller ?? 'fanuc'} onChange={(e) => setEditingMachine({ ...editingMachine, controller: e.target.value })}>
                  {CONTROLLERS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select></div>
              <div><label className={lbl}>Max RPM</label>
                <input type="number" className={inp} value={editingMachine.max_rpm ?? ''} onChange={(e) => setEditingMachine({ ...editingMachine, max_rpm: Number(e.target.value) || undefined })} placeholder="4000" /></div>
              <div><label className={lbl}>Max Power (kW)</label>
                <input type="number" className={inp} value={editingMachine.max_power_kw ?? ''} onChange={(e) => setEditingMachine({ ...editingMachine, max_power_kw: Number(e.target.value) || undefined })} placeholder="15" /></div>
              <div><label className={lbl}>Bar Capacity (mm)</label>
                <input type="number" className={inp} value={editingMachine.bar_capacity_mm ?? ''} onChange={(e) => setEditingMachine({ ...editingMachine, bar_capacity_mm: Number(e.target.value) || undefined })} placeholder="65" /></div>
              <div><label className={lbl}>Turret Stations</label>
                <input type="number" className={inp} value={editingMachine.turret_stations ?? 12} onChange={(e) => setEditingMachine({ ...editingMachine, turret_stations: Number(e.target.value) })} /></div>
              {editingMachine.type !== 'Wire EDM' && (
                <div className="flex items-center gap-4 col-span-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={editingMachine.has_bar_feeder ?? false} onChange={(e) => setEditingMachine({ ...editingMachine, has_bar_feeder: e.target.checked })} /> Bar Feeder
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={editingMachine.has_live_tooling ?? false} onChange={(e) => setEditingMachine({ ...editingMachine, has_live_tooling: e.target.checked })} /> Live Tooling
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={editingMachine.has_sub_spindle ?? false} onChange={(e) => setEditingMachine({ ...editingMachine, has_sub_spindle: e.target.checked })} /> Sub-Spindle
                  </label>
                </div>
              )}
              {editingMachine.type === 'Wire EDM' && (
                <>
                  <div><label className={lbl}>Brand</label>
                    <select className={inp} value={editingMachine.wedm_brand ?? 'sodick'} onChange={(e) => setEditingMachine({ ...editingMachine, wedm_brand: e.target.value })}>
                      {WEDM_BRANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select></div>
                  <div><label className={lbl}>UV Travel (mm)</label>
                    <input type="number" className={inp} value={editingMachine.wedm_uv_travel_mm ?? 80} onChange={(e) => setEditingMachine({ ...editingMachine, wedm_uv_travel_mm: Number(e.target.value) })} placeholder="80" /></div>
                  <div><label className={lbl}>Max Taper (\u00B0)</label>
                    <input type="number" className={inp} value={editingMachine.wedm_max_taper_deg ?? 30} onChange={(e) => setEditingMachine({ ...editingMachine, wedm_max_taper_deg: Number(e.target.value) })} /></div>
                  <div><label className={lbl}>Max Workpiece Height (mm)</label>
                    <input type="number" className={inp} value={editingMachine.wedm_max_workpiece_height_mm ?? 400} onChange={(e) => setEditingMachine({ ...editingMachine, wedm_max_workpiece_height_mm: Number(e.target.value) })} /></div>
                  <div className="flex items-center gap-4 col-span-2">
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input type="checkbox" checked={editingMachine.wedm_auto_threading ?? true} onChange={(e) => setEditingMachine({ ...editingMachine, wedm_auto_threading: e.target.checked })} /> Auto Wire Threading
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input type="checkbox" checked={editingMachine.wedm_submerged_cutting ?? true} onChange={(e) => setEditingMachine({ ...editingMachine, wedm_submerged_cutting: e.target.checked })} /> Submerged Cutting
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-zinc-200">Cancel</button>
              <button onClick={() => upsertMachine(editingMachine)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-medium text-white">
                {profile?.machines.some(m => m.id === editingMachine.id) ? 'Save' : 'Add Machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
