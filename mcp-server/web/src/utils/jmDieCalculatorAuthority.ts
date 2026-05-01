import type { MachineMode } from '../data/calculatorWorkspace';

type HolderAuthorityPackage = {
  id?: string | null;
  label?: string | null;
  brandId?: string | null;
  holderSubcategory?: string | null;
  detail?: string | null;
};

export type JMDieHolderCatalogAuthorityStage =
  | 'database-unavailable'
  | 'no-compatible-live-results'
  | 'failure'
  | 'hybrid';

export const CANONICAL_JM_DIE_HOLDER_IDS: Record<MachineMode, string[]> = {
  mill: ['th-jmd-big-er32-4nl', 'th-jmd-big-er16-3nl'],
  lathe: ['th-jmd-vdi30-turning-baseline', 'th-jmd-regofix-capto-c6-pg25'],
  edm: ['th-jmd-system3r-er32'],
  wire_edm: [],
  laser: [],
  waterjet: [],
};

function text(value: string | null | undefined) {
  return (value ?? '').trim();
}

export function isJMDieCanonicalHolderPackage(holderPackage?: HolderAuthorityPackage | null) {
  const id = text(holderPackage?.id);
  const brandId = text(holderPackage?.brandId).toLowerCase();
  const holderSubcategory = text(holderPackage?.holderSubcategory).toUpperCase();
  const detail = text(holderPackage?.detail);

  return (
    id.startsWith('th-jmd-')
    || brandId === 'jm-die'
    || holderSubcategory.startsWith('JM_DIE_')
    || /\bJM Die\b/i.test(detail)
  );
}

export function findJMDieCanonicalHolderSeed<T extends HolderAuthorityPackage>(
  mode: MachineMode,
  items: T[],
) {
  for (const id of CANONICAL_JM_DIE_HOLDER_IDS[mode]) {
    const match = items.find((item) => item.id === id);
    if (match) {
      return match;
    }
  }

  return items.find((item) => isJMDieCanonicalHolderPackage(item)) ?? null;
}

export function describeJMDieHolderCatalogAuthority<T extends HolderAuthorityPackage>(
  mode: MachineMode,
  items: T[],
  stage: JMDieHolderCatalogAuthorityStage,
) {
  const seed = findJMDieCanonicalHolderSeed(mode, items);
  const label = text(seed?.label);
  if (!label) {
    return null;
  }

  switch (stage) {
    case 'database-unavailable':
      return `Live holder database is unavailable, so the JM Die canonical ${label} seed remains active for this machine slice.`;
    case 'no-compatible-live-results':
      return `Live holder database returned no compatible packages, so the JM Die canonical ${label} seed remains active for this machine slice.`;
    case 'failure':
      return `Holder catalog failed, so the JM Die canonical ${label} seed remains active for this machine slice.`;
    case 'hybrid':
      return `Live holder database is merged with the curated holder fallback so compatible packages stay populated, and the JM Die canonical ${label} seed remains selectable.`;
    default:
      return null;
  }
}
