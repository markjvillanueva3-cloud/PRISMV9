import type { MachineMode } from '../data/calculatorWorkspace';

type ProgrammingAuthorityEnvironment = {
  id?: string | null;
  label?: string | null;
  vendor?: string | null;
  badge?: string | null;
};

export type JMDieProgrammingCatalogAuthorityStage =
  | 'curated-service'
  | 'database-unavailable'
  | 'empty'
  | 'hybrid'
  | 'live'
  | 'no-compatible-live-results';

export type ProgrammingCatalogAuthoritySummary = {
  badge: string;
  summary: string;
  note: string;
  // 2026-05-27 iter14: + 'fallback-staged' for 8 test fixtures that use it
  // (CycleTimePage, FeatureTogglePage, OptimizationReportPage, PostProcessorGeneratorPage,
  // ProveOutWorkflowPage, SetupSheetPage, ToolOptimizationPage, jmDieCalculatorPostWorkflowState).
  // Semantic: 'fallback' state staged for promotion — sub-posture under fallback.
  posture: 'curated-service' | 'empty' | 'fallback' | 'fallback-staged' | 'hybrid' | 'live';
  seedLabel?: string;
  // 2026-05-27 iter14: optional — 5 test fixtures (CycleTimePage, FeatureTogglePage,
  // PostProcessorGeneratorPage, ToolOptimizationPage, WireEdmResultsPage) don't set
  // usesJMDieSeed in their MachineWorkspaceProgrammingAuthority literal. Production
  // consumers should read with ?? false when needed.
  usesJMDieSeed?: boolean;
};

const CANONICAL_JM_DIE_PROGRAMMING_IDS: Record<MachineMode, string[]> = {
  mill: ['cimatron-mill', 'powermill-mill', 'fusion360-mill'],
  lathe: ['fusion360-lathe', 'nx-lathe', 'conversational-lathe'],
  edm: ['cimatron-edm', 'peps-edm', 'conversational-edm'],
  wire_edm: ['cimatron-wire', 'peps-wire', 'conversational-wire'],
  laser: [],
  waterjet: [],
};

function text(value: string | null | undefined) {
  return (value ?? '').trim();
}

function formatCount(count: number) {
  return count.toLocaleString();
}

function summaryLabel(count: number, usesJMDieSeed: boolean, seededLabel: string, genericLabel: string) {
  return `${formatCount(count)} ${usesJMDieSeed ? seededLabel : genericLabel}`;
}

export function findJMDieCanonicalProgrammingSeed<T extends ProgrammingAuthorityEnvironment>(
  mode: MachineMode | undefined,
  items: T[],
) {
  if (!mode) {
    return null;
  }

  for (const id of CANONICAL_JM_DIE_PROGRAMMING_IDS[mode]) {
    const match = items.find((item) => item.id === id);
    if (match) {
      return match;
    }
  }

  return null;
}

export function buildJMDieProgrammingCatalogAuthority<T extends ProgrammingAuthorityEnvironment>({
  fallbackCount,
  items,
  liveCount,
  mode,
  seedCandidates,
  stage,
}: {
  fallbackCount: number;
  items: T[];
  liveCount: number;
  mode?: MachineMode;
  seedCandidates?: T[];
  stage: JMDieProgrammingCatalogAuthorityStage;
}): ProgrammingCatalogAuthoritySummary {
  const seed = findJMDieCanonicalProgrammingSeed(mode, seedCandidates ?? items);
  const seedLabel = text(seed?.label);
  const usesJMDieSeed = Boolean(seedLabel);

  switch (stage) {
    case 'curated-service':
      return {
        badge: usesJMDieSeed ? 'JM Die curated programming' : 'Curated programming service',
        summary: `${formatCount(fallbackCount || items.length)} curated packages loaded`,
        note: usesJMDieSeed
          ? `Backend-served curated programming catalog is active. No live programming registry is wired yet, so the JM Die canonical ${seedLabel} seed remains advisory for this machine slice.`
          : 'Backend-served curated programming catalog is active. No live programming registry is wired yet, so CAM package guidance remains advisory.',
        posture: 'curated-service',
        seedLabel: seedLabel || undefined,
        usesJMDieSeed,
      };
    case 'database-unavailable':
      return {
        badge: usesJMDieSeed ? 'JM Die seeded programming' : 'Fallback programming catalog',
        summary: summaryLabel(
          fallbackCount || items.length,
          usesJMDieSeed,
          'JM Die seeded packages loaded',
          'bundled packages loaded',
        ),
        note: usesJMDieSeed
          ? `Programming catalog route is unavailable, so the JM Die canonical ${seedLabel} seed remains active for this machine slice.`
          : 'Programming catalog route is unavailable, so the bundled programming catalog is active.',
        posture: 'fallback',
        seedLabel: seedLabel || undefined,
        usesJMDieSeed,
      };
    case 'no-compatible-live-results':
      return {
        badge: usesJMDieSeed ? 'JM Die seeded programming' : 'Fallback programming catalog',
        summary: summaryLabel(
          fallbackCount || items.length,
          usesJMDieSeed,
          'JM Die seeded packages loaded',
          'bundled packages loaded',
        ),
        note: usesJMDieSeed
          ? `Programming catalog route returned no compatible packages, so the JM Die canonical ${seedLabel} seed remains active for this machine slice.`
          : 'Programming catalog route returned no compatible packages, so the bundled programming catalog is active.',
        posture: 'fallback',
        seedLabel: seedLabel || undefined,
        usesJMDieSeed,
      };
    case 'hybrid':
      return {
        badge: usesJMDieSeed ? 'Hybrid + JM Die seed' : 'Hybrid programming catalog',
        summary: `${formatCount(liveCount)} live + ${formatCount(fallbackCount)} ${usesJMDieSeed ? 'JM Die seeded' : 'bundled'}`,
        note: usesJMDieSeed
          ? `Live programming registry is merged with the JM Die canonical ${seedLabel} seed so compatible CAM and toolpath coverage stays populated for this machine slice.`
          : 'Live programming registry is merged with the bundled programming catalog so compatible CAM and toolpath coverage stays populated for this machine slice.',
        posture: 'hybrid',
        seedLabel: seedLabel || undefined,
        usesJMDieSeed,
      };
    case 'live':
      return {
        badge: 'Live programming catalog',
        summary: `${formatCount(liveCount || items.length)} live packages loaded`,
        note: 'Backend programming catalog is active for this machine slice.',
        posture: 'live',
        seedLabel: seedLabel || undefined,
        usesJMDieSeed,
      };
    default:
      return {
        badge: 'No programming catalog',
        summary: '0 packages loaded',
        note: 'No programming packages were available for this machine slice.',
        posture: 'empty',
        seedLabel: seedLabel || undefined,
        usesJMDieSeed,
      };
  }
}
