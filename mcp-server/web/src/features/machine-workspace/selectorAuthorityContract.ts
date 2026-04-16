import type {
  ProgramReleaseCadSourceProfile,
  ProgramReleaseCatalog,
  ProgramReleaseMachineProfile,
  ProgramReleaseSavedMachineProfile,
  ProgramReleaseStockProfile,
  ProgramReleaseToolholderProfile,
  ProgramReleaseToolingPackage,
} from '../operating-system/contracts';

export type ToolpathAdvisorMaterialProfile = 'aluminum' | 'steel' | 'stainless' | 'superalloy';
export type ToolpathAdvisorAxisProfile = '3-axis' | '3+2' | '5-axis' | 'lathe';

export type ProgramReleaseRouteSelection = {
  partClassId: string | null;
  machineId: string | null;
  machineFamilyId: string | null;
  machineManufacturer: string | null;
  toolholderId: string | null;
  toolingPackageId: string | null;
  fixtureId: string | null;
  stockId: string | null;
  cadSourceId: string | null;
};

export type ProgramReleaseSelectorSnapshot = {
  partClassId: string;
  machineId: string;
  toolholderId: string;
  toolingPackageId: string;
  fixtureId: string;
  stockId: string;
  cadSourceId: string;
};

export type ProgramReleaseSelectorState = ProgramReleaseSelectorSnapshot & {
  authorityNote: string;
};

export type ToolpathAdvisorMaterialOption = {
  value: ToolpathAdvisorMaterialProfile;
  label: string;
  note: string;
  stockId?: string;
};

export type ToolpathAdvisorMachineAxisOption = {
  value: ToolpathAdvisorAxisProfile;
  label: string;
  note: string;
  machineId?: string;
  controller?: string;
};

export type ToolpathAdvisorSelectorAuthority = {
  machineOptions: ToolpathAdvisorMachineAxisOption[];
  materialOptions: ToolpathAdvisorMaterialOption[];
  defaultAxis: ToolpathAdvisorAxisProfile;
  defaultMaterial: ToolpathAdvisorMaterialProfile;
  authorityNote: string;
};

export type ToolpathAdvisorReleaseContext = {
  machineId?: string;
  machineLabel?: string;
  controller?: string;
  toolholderId?: string;
  toolholderLabel?: string;
  toolingPackageId?: string;
  toolingPackageLabel?: string;
  stockId?: string;
  stockLabel?: string;
  authorityNote: string;
};

export type ToolpathAdvisorRouteAuthority = {
  axis: ToolpathAdvisorAxisProfile;
  material: ToolpathAdvisorMaterialProfile;
  releaseContext: ToolpathAdvisorReleaseContext;
  authorityNote: string;
  unsupportedReason?: string;
};

type ProgramReleaseSelectorResolverInput = {
  catalog: ProgramReleaseCatalog;
  routeSelection: ProgramReleaseRouteSelection;
  savedMachineProfile?: ProgramReleaseSavedMachineProfile | null;
  current?: Partial<ProgramReleaseSelectorSnapshot>;
};

type ProgramReleaseMachineAuthorityKind =
  | 'route-machine'
  | 'route-family'
  | 'route-manufacturer'
  | 'saved-profile'
  | 'shared-catalog';

type ProgramReleaseMachineAuthority = {
  kind: ProgramReleaseMachineAuthorityKind;
  machine: ProgramReleaseMachineProfile | null;
  label?: string;
};

const TOOLPATH_MATERIAL_BASE: Record<ToolpathAdvisorMaterialProfile, { label: string; note: string }> = {
  aluminum: {
    label: 'Aluminum alloys',
    note: 'High chip volume, low cutting force, fast roughing windows.',
  },
  steel: {
    label: 'Carbon / alloy steel',
    note: 'Balanced heat, chip load, and rigidity needs.',
  },
  stainless: {
    label: 'Stainless steel',
    note: 'Heat and work-hardening demand controlled engagement.',
  },
  superalloy: {
    label: 'Titanium / nickel alloy',
    note: 'Thermal sensitivity and tool life dominate the plan.',
  },
};

const TOOLPATH_AXIS_BASE: Record<ToolpathAdvisorAxisProfile, { label: string; note: string }> = {
  '3-axis': {
    label: '3-axis mill',
    note: 'Flat workholding and standard indexed rough/finish workflows.',
  },
  '3+2': {
    label: '3+2 indexed',
    note: 'Tilted access with repositioning between toolpath groups.',
  },
  '5-axis': {
    label: 'Simultaneous 5-axis',
    note: 'Lean on collision-safe, low-force, high-access strategies.',
  },
  lathe: {
    label: 'Turning / lathe',
    note: 'Prioritize stable engagement and thread form control.',
  },
};

const TOOLPATH_AXIS_ORDER: ToolpathAdvisorAxisProfile[] = ['3-axis', '3+2', '5-axis', 'lathe'];
const TOOLPATH_MATERIAL_ORDER: ToolpathAdvisorMaterialProfile[] = ['steel', 'aluminum', 'stainless', 'superalloy'];

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function tokenize(value: string | null | undefined) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function chooseCatalogSelection(current: string | undefined, ids: string[]) {
  if (current && ids.includes(current)) {
    return current;
  }
  return ids[0] ?? '';
}

function chooseCatalogSelectionWithPreferred(current: string | undefined, preferred: string | null | undefined, ids: string[]) {
  if (preferred && ids.includes(preferred)) {
    return preferred;
  }
  return chooseCatalogSelection(current, ids);
}

function findItemById<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id) ?? null;
}

function findByExactOrKeywords<T extends { id: string; label: string }>(
  items: T[],
  exactIds: string[],
  keywordFields: Array<(item: T) => string>,
  keywords: string[],
) {
  for (const id of exactIds) {
    const exactMatch = items.find((item) => item.id === id);
    if (exactMatch) {
      return exactMatch;
    }
  }

  if (keywords.length === 0) {
    return null;
  }

  return (
    items.find((item) => {
      const haystack = keywordFields
        .map((getField) => normalize(getField(item)))
        .filter(Boolean)
        .join(' ');
      return keywords.some((keyword) => haystack.includes(keyword));
    }) ?? null
  );
}

function machineHaystack(machine: ProgramReleaseMachineProfile) {
  return [
    machine.id,
    machine.label,
    machine.familyId,
    machine.familyLabel,
    machine.manufacturerId,
    machine.manufacturer,
    machine.controller,
    machine.kinematics,
    machine.spindle,
    machine.strength,
  ]
    .map((value) => normalize(value))
    .join(' ');
}

function isLatheMachine(machine: ProgramReleaseMachineProfile) {
  const haystack = machineHaystack(machine);
  return haystack.includes('lathe') || haystack.includes('turning') || haystack.includes('turn ');
}

function isMillTurnMachine(machine: ProgramReleaseMachineProfile) {
  const haystack = machineHaystack(machine);
  return haystack.includes('mill-turn') || haystack.includes('turn-mill') || haystack.includes('mill turn');
}

function isFiveAxisMachine(machine: ProgramReleaseMachineProfile) {
  const haystack = machineHaystack(machine);
  return haystack.includes('5-axis') || haystack.includes('5 axis') || haystack.includes('trunnion') || haystack.includes('simultaneous');
}

function isIndexedMachine(machine: ProgramReleaseMachineProfile) {
  const haystack = machineHaystack(machine);
  return isFiveAxisMachine(machine) || isMillTurnMachine(machine) || haystack.includes('3+2') || haystack.includes('indexed');
}

function isEdmMachine(machine: ProgramReleaseMachineProfile) {
  const haystack = machineHaystack(machine);
  return haystack.includes('wire edm') || haystack.includes('sinker edm') || haystack.includes('wedm') || haystack.includes('edm');
}

function matchesMachineFamily(machine: ProgramReleaseMachineProfile, familyId: string | null) {
  const normalizedFamily = normalize(familyId).replace(/_/g, '-');
  if (!normalizedFamily) {
    return false;
  }

  if (normalizedFamily === 'lathe' || normalizedFamily === 'turning') {
    return isLatheMachine(machine) && !isMillTurnMachine(machine);
  }
  if (normalizedFamily === 'wire-edm' || normalizedFamily === 'wire edm' || normalizedFamily === 'wedm') {
    return machineHaystack(machine).includes('wire edm') || machineHaystack(machine).includes('wedm');
  }
  if (
    normalizedFamily === 'sinker-edm'
    || normalizedFamily === 'sinker edm'
    || normalizedFamily === 'edm'
  ) {
    const haystack = machineHaystack(machine);
    return (haystack.includes('sinker edm') || haystack.includes('edm')) && !haystack.includes('wire edm');
  }
  if (normalizedFamily === '5-axis' || normalizedFamily === '5 axis' || normalizedFamily === '5axis') {
    return isFiveAxisMachine(machine);
  }
  if (normalizedFamily === '3+2' || normalizedFamily === 'indexed') {
    return isIndexedMachine(machine) && !isLatheMachine(machine);
  }

  const tokens = tokenize(normalizedFamily);
  if (tokens.length === 0) {
    return false;
  }
  const haystack = machineHaystack(machine);
  return tokens.every((token) => haystack.includes(token));
}

function matchesMachineManufacturer(machine: ProgramReleaseMachineProfile, manufacturer: string | null) {
  const tokens = tokenize(manufacturer);
  if (tokens.length === 0) {
    return false;
  }

  const haystack = [
    machine.manufacturerId,
    machine.manufacturer,
    machine.familyLabel,
    machine.label,
    machine.controller,
    machine.id,
  ]
    .map((value) => normalize(value))
    .join(' ');

  return tokens.every((token) => haystack.includes(token));
}

function findPreferredRouteMachine(
  catalog: ProgramReleaseCatalog,
  routeSelection: ProgramReleaseRouteSelection,
): ProgramReleaseMachineAuthority {
  if (routeSelection.machineId) {
    const machine = findItemById(catalog.machines, routeSelection.machineId);
    if (machine) {
      return {
        kind: 'route-machine',
        machine,
        label: machine.label,
      };
    }
  }

  if (routeSelection.machineFamilyId) {
    const machine = catalog.machines.find((item) => matchesMachineFamily(item, routeSelection.machineFamilyId)) ?? null;
    if (machine) {
      return {
        kind: 'route-family',
        machine,
        label: routeSelection.machineFamilyId,
      };
    }
  }

  if (routeSelection.machineManufacturer) {
    const machine = catalog.machines.find((item) => matchesMachineManufacturer(item, routeSelection.machineManufacturer)) ?? null;
    if (machine) {
      return {
        kind: 'route-manufacturer',
        machine,
        label: routeSelection.machineManufacturer,
      };
    }
  }

  return {
    kind: 'shared-catalog',
    machine: null,
  };
}

function mapMachineToAxisProfile(machine: ProgramReleaseMachineProfile): ToolpathAdvisorAxisProfile {
  if (isLatheMachine(machine) && !isMillTurnMachine(machine)) {
    return 'lathe';
  }
  if (isFiveAxisMachine(machine)) {
    return '5-axis';
  }
  if (isIndexedMachine(machine)) {
    return '3+2';
  }
  return '3-axis';
}

function inferMaterialProfile(rawValue: string | undefined): ToolpathAdvisorMaterialProfile {
  const haystack = normalize(rawValue);
  if (/(alum|6061|7075|2024|non-ferrous)/.test(haystack)) {
    return 'aluminum';
  }
  if (/(stainless|17-4|17 4|316|304|15-5|ph)/.test(haystack)) {
    return 'stainless';
  }
  if (/(titan|inconel|nickel|superalloy|hastelloy)/.test(haystack)) {
    return 'superalloy';
  }
  return 'steel';
}

function findRepresentativeMachine(catalog: ProgramReleaseCatalog, axis: ToolpathAdvisorAxisProfile) {
  if (axis === 'lathe') {
    return catalog.machines.find((machine) => isLatheMachine(machine) && !isMillTurnMachine(machine)) ?? null;
  }
  if (axis === '5-axis') {
    return catalog.machines.find((machine) => isFiveAxisMachine(machine)) ?? null;
  }
  if (axis === '3+2') {
    return catalog.machines.find((machine) => isIndexedMachine(machine) && !isLatheMachine(machine)) ?? null;
  }
  return (
    catalog.machines.find((machine) => mapMachineToAxisProfile(machine) === '3-axis' && !isEdmMachine(machine))
    ?? null
  );
}

function findRepresentativeStock(catalog: ProgramReleaseCatalog, material: ToolpathAdvisorMaterialProfile) {
  return (
    catalog.stockProfiles.find((stock) => inferMaterialProfile(`${stock.material} ${stock.label}`) === material) ?? null
  );
}

function recommendToolholderProfile(catalog: ProgramReleaseCatalog, machine: ProgramReleaseMachineProfile | null) {
  if (!machine) {
    return catalog.toolholders[0] ?? null;
  }

  if (isEdmMachine(machine)) {
    return findByExactOrKeywords(
      catalog.toolholders,
      ['th-jmd-system3r-er32'],
      [(item) => item.id, (item) => item.label, (item) => item.style, (item) => item.note],
      ['system 3r', 'system3r', 'electrode', 'er32'],
    );
  }

  if (isLatheMachine(machine) && !isMillTurnMachine(machine)) {
    return findByExactOrKeywords(
      catalog.toolholders,
      ['th-jmd-vdi30-turning-baseline'],
      [(item) => item.id, (item) => item.label, (item) => item.style, (item) => item.note],
      ['vdi', 'turn', 'capto'],
    );
  }

  if (isIndexedMachine(machine)) {
    return findByExactOrKeywords(
      catalog.toolholders,
      ['th-jmd-regofix-capto-c6-pg25'],
      [(item) => item.id, (item) => item.label, (item) => item.style, (item) => item.note],
      ['capto', 'hydraulic', 'reach'],
    );
  }

  return findByExactOrKeywords(
    catalog.toolholders,
    ['th-jmd-big-er32-4nl'],
    [(item) => item.id, (item) => item.label, (item) => item.style, (item) => item.note],
    ['shrink', 'er32', 'hydraulic'],
  );
}

function recommendStockProfile(
  catalog: ProgramReleaseCatalog,
  machine: ProgramReleaseMachineProfile | null,
  partClassId: string,
) {
  if (machine && isEdmMachine(machine)) {
    return findByExactOrKeywords(
      catalog.stockProfiles,
      ['stk-jmd-ofhc-copper'],
      [(item) => item.id, (item) => item.label, (item) => item.material, (item) => item.size],
      ['copper', 'electrode'],
    );
  }

  if ((machine && isLatheMachine(machine)) || partClassId === 'turned-shaft') {
    return findByExactOrKeywords(
      catalog.stockProfiles,
      ['stk-jmd-m2-round'],
      [(item) => item.id, (item) => item.label, (item) => item.material, (item) => item.size],
      ['round', 'bar'],
    );
  }

  if (partClassId === 'fixture-plate') {
    return findByExactOrKeywords(
      catalog.stockProfiles,
      ['stk-jmd-a2-plate'],
      [(item) => item.id, (item) => item.label, (item) => item.material, (item) => item.size],
      ['plate', 'remnant'],
    );
  }

  return catalog.stockProfiles[0] ?? null;
}

function recommendToolingPackage(
  catalog: ProgramReleaseCatalog,
  machine: ProgramReleaseMachineProfile | null,
  materialProfile: ToolpathAdvisorMaterialProfile,
) {
  if (machine && isEdmMachine(machine)) {
    return findByExactOrKeywords(
      catalog.toolingPackages,
      ['tp-jmd-mill-electrode'],
      [(item) => item.id, (item) => item.label, (item) => item.coverage, (item) => item.note],
      ['electrode', 'finish'],
    );
  }

  if (machine && isLatheMachine(machine) && !isMillTurnMachine(machine)) {
    return findByExactOrKeywords(
      catalog.toolingPackages,
      ['tp-jmd-lathe-production'],
      [(item) => item.id, (item) => item.label, (item) => item.coverage, (item) => item.note],
      ['turn', 'production'],
    );
  }

  const genericTooling = (() => {
    if (materialProfile === 'aluminum') {
      return findByExactOrKeywords(
        catalog.toolingPackages,
        [],
        [(item) => item.id, (item) => item.label, (item) => item.coverage, (item) => item.note],
        ['aluminum', 'velocity'],
      );
    }
    if (materialProfile === 'superalloy') {
      return findByExactOrKeywords(
        catalog.toolingPackages,
        [],
        [(item) => item.id, (item) => item.label, (item) => item.coverage, (item) => item.note],
        ['titanium', 'superalloy', 'safe'],
      );
    }
    return findByExactOrKeywords(
      catalog.toolingPackages,
      ['tp-jmd-release-baseline'],
      [(item) => item.id, (item) => item.label, (item) => item.coverage, (item) => item.note],
      ['balanced', 'baseline', 'steel'],
    );
  })();

  return genericTooling ?? catalog.toolingPackages[0] ?? null;
}

function summarizeReleaseSpine(
  machine: ProgramReleaseMachineProfile | null,
  toolholder: ProgramReleaseToolholderProfile | null,
  toolingPackage: ProgramReleaseToolingPackage | null,
  stock: ProgramReleaseStockProfile | null,
) {
  return [machine?.label, toolholder?.label, toolingPackage?.label, stock?.label].filter(Boolean).join(' / ');
}

function buildProgramReleaseAuthorityNote(
  machineAuthority: ProgramReleaseMachineAuthority,
  savedMachineProfile: ProgramReleaseSavedMachineProfile | null | undefined,
  machine: ProgramReleaseMachineProfile | null,
  toolholder: ProgramReleaseToolholderProfile | null,
  toolingPackage: ProgramReleaseToolingPackage | null,
  stock: ProgramReleaseStockProfile | null,
) {
  const spine = summarizeReleaseSpine(machine, toolholder, toolingPackage, stock);
  let prefix = 'JM Die selector authority normalized this release from the shared catalog';

  if (machineAuthority.kind === 'route-machine') {
    prefix = `Route authority pinned ${machine?.label ?? machineAuthority.label ?? 'the incoming machine'} for this release`;
  } else if (machineAuthority.kind === 'route-family') {
    prefix = `Route authority normalized this release to the ${machineAuthority.label ?? 'requested'} family via ${machine?.label ?? 'the shared machine catalog'}`;
  } else if (machineAuthority.kind === 'route-manufacturer') {
    prefix = `Route authority normalized this release to the ${machineAuthority.label ?? 'requested'} manufacturer posture via ${machine?.label ?? 'the shared machine catalog'}`;
  } else if (machineAuthority.kind === 'saved-profile' && savedMachineProfile) {
    prefix = `JM Die selector authority started from the saved ${savedMachineProfile.machineLabel} machine profile`;
  }

  return spine ? `${prefix}. Shared release spine: ${spine}.` : `${prefix}.`;
}

function buildToolpathAuthorityNote(machineOptions: ToolpathAdvisorMachineAxisOption[], materialOptions: ToolpathAdvisorMaterialOption[]) {
  const machineNote = machineOptions.find((option) => option.machineId)?.note ?? TOOLPATH_AXIS_BASE['3-axis'].note;
  const materialNote = materialOptions.find((option) => option.stockId)?.note ?? TOOLPATH_MATERIAL_BASE.steel.note;
  return `Toolpath Advisor is reading machine and material posture from the shared Program Release catalog. ${machineNote} ${materialNote}`;
}

export function readProgramReleaseRouteSelection(search: string): ProgramReleaseRouteSelection {
  const params = new URLSearchParams(search);
  return {
    partClassId: params.get('partClassId'),
    machineId: params.get('machineId'),
    machineFamilyId: params.get('machineFamilyId'),
    machineManufacturer: params.get('machineManufacturer'),
    toolholderId: params.get('toolholderId'),
    toolingPackageId: params.get('toolingPackageId'),
    fixtureId: params.get('fixtureId'),
    stockId: params.get('stockId'),
    cadSourceId: params.get('cadSourceId'),
  };
}

export function findProgramReleaseCadSourceId(
  catalog: ProgramReleaseCatalog | null,
  preference: 'compare' | 'prism',
) {
  if (!catalog) {
    return '';
  }

  if (preference === 'compare') {
    return catalog.cadSources.find((source) => source.status === 'compare')?.id ?? catalog.cadSources[0]?.id ?? '';
  }

  return (
    catalog.cadSources.find((source) => /prism/i.test(source.id) || /prism/i.test(source.label))?.id
    ?? catalog.cadSources.find((source) => source.status === 'preferred')?.id
    ?? catalog.cadSources[0]?.id
    ?? ''
  );
}

export function resolveProgramReleaseSelectorState({
  catalog,
  routeSelection,
  savedMachineProfile,
  current,
}: ProgramReleaseSelectorResolverInput): ProgramReleaseSelectorState {
  const partClassId = chooseCatalogSelectionWithPreferred(
    current?.partClassId,
    routeSelection.partClassId,
    catalog.partClasses.map((item) => item.id),
  );
  const routeMachineAuthority = findPreferredRouteMachine(catalog, routeSelection);
  const machineId = chooseCatalogSelectionWithPreferred(
    current?.machineId,
    routeMachineAuthority.machine?.id ?? savedMachineProfile?.machineId ?? routeSelection.machineId,
    catalog.machines.map((item) => item.id),
  );
  const machine = findItemById(catalog.machines, machineId);
  const resolvedMachineAuthority: ProgramReleaseMachineAuthority =
    routeMachineAuthority.machine?.id === machine?.id
      ? routeMachineAuthority
      : savedMachineProfile && machine?.id === savedMachineProfile.machineId
        ? {
            kind: 'saved-profile',
            machine,
            label: savedMachineProfile.machineLabel,
          }
        : {
            kind: 'shared-catalog',
            machine,
          };

  const recommendedStock = recommendStockProfile(catalog, machine, partClassId);
  const stockId = chooseCatalogSelectionWithPreferred(
    current?.stockId,
    routeSelection.stockId ?? recommendedStock?.id,
    catalog.stockProfiles.map((item) => item.id),
  );
  const stock = findItemById(catalog.stockProfiles, stockId);
  const materialProfile = inferMaterialProfile(`${stock?.material ?? ''} ${stock?.label ?? ''}`);
  const recommendedToolholder = recommendToolholderProfile(catalog, machine);
  const toolholderId = chooseCatalogSelectionWithPreferred(
    current?.toolholderId,
    routeSelection.toolholderId ?? recommendedToolholder?.id,
    catalog.toolholders.map((item) => item.id),
  );
  const recommendedToolingPackage = recommendToolingPackage(catalog, machine, materialProfile);
  const toolingPackageId = chooseCatalogSelectionWithPreferred(
    current?.toolingPackageId,
    routeSelection.toolingPackageId ?? recommendedToolingPackage?.id,
    catalog.toolingPackages.map((item) => item.id),
  );
  const fixtureId = chooseCatalogSelectionWithPreferred(
    current?.fixtureId,
    routeSelection.fixtureId,
    catalog.fixtures.map((item) => item.id),
  );
  const cadSourceId = chooseCatalogSelectionWithPreferred(
    current?.cadSourceId,
    routeSelection.cadSourceId,
    catalog.cadSources.map((item) => item.id),
  );

  return {
    partClassId,
    machineId,
    toolholderId,
    toolingPackageId,
    fixtureId,
    stockId,
    cadSourceId,
    authorityNote: buildProgramReleaseAuthorityNote(
      resolvedMachineAuthority,
      savedMachineProfile,
      machine,
      findItemById(catalog.toolholders, toolholderId),
      findItemById(catalog.toolingPackages, toolingPackageId),
      stock,
    ),
  };
}

function buildAxisOption(catalog: ProgramReleaseCatalog, axis: ToolpathAdvisorAxisProfile): ToolpathAdvisorMachineAxisOption {
  const base = TOOLPATH_AXIS_BASE[axis];
  const machine = findRepresentativeMachine(catalog, axis);
  if (!machine) {
    return {
      value: axis,
      label: base.label,
      note: base.note,
    };
  }

  return {
    value: axis,
    label: base.label,
    note: `${machine.label} - ${machine.controller} - ${machine.kinematics}`,
    machineId: machine.id,
    controller: machine.controller,
  };
}

function buildMaterialOption(catalog: ProgramReleaseCatalog, material: ToolpathAdvisorMaterialProfile): ToolpathAdvisorMaterialOption {
  const base = TOOLPATH_MATERIAL_BASE[material];
  const stock = findRepresentativeStock(catalog, material);
  if (!stock) {
    return {
      value: material,
      label: base.label,
      note: base.note,
    };
  }

  return {
    value: material,
    label: base.label,
    note: `${stock.label} - ${stock.material} - ${stock.size}`,
    stockId: stock.id,
  };
}

export function buildToolpathAdvisorSelectorAuthority(catalog: ProgramReleaseCatalog): ToolpathAdvisorSelectorAuthority {
  const machineOptions = TOOLPATH_AXIS_ORDER.map((axis) => buildAxisOption(catalog, axis));
  const materialOptions = TOOLPATH_MATERIAL_ORDER.map((material) => buildMaterialOption(catalog, material));
  const defaultAxis = machineOptions.some((option) => option.value === '3-axis') ? '3-axis' : machineOptions[0]?.value ?? '3-axis';
  const defaultMaterial = materialOptions.some((option) => option.value === 'steel') ? 'steel' : materialOptions[0]?.value ?? 'steel';

  return {
    machineOptions,
    materialOptions,
    defaultAxis,
    defaultMaterial,
    authorityNote: buildToolpathAuthorityNote(machineOptions, materialOptions),
  };
}

export function resolveToolpathAdvisorReleaseContext(
  catalog: ProgramReleaseCatalog,
  axis: ToolpathAdvisorAxisProfile,
  material: ToolpathAdvisorMaterialProfile,
): ToolpathAdvisorReleaseContext {
  const machine = findRepresentativeMachine(catalog, axis);
  const stock = findRepresentativeStock(catalog, material)
    ?? recommendStockProfile(catalog, machine, axis === 'lathe' ? 'turned-shaft' : 'prismatic-bracket');
  const toolholder = recommendToolholderProfile(catalog, machine);
  const toolingPackage = recommendToolingPackage(catalog, machine, material);
  const spine = summarizeReleaseSpine(machine, toolholder, toolingPackage, stock);

  return {
    machineId: machine?.id,
    machineLabel: machine?.label,
    controller: machine?.controller,
    toolholderId: toolholder?.id,
    toolholderLabel: toolholder?.label,
    toolingPackageId: toolingPackage?.id,
    toolingPackageLabel: toolingPackage?.label,
    stockId: stock?.id,
    stockLabel: stock?.label,
    authorityNote: spine
      ? `Shared release spine for this strategy posture: ${spine}.`
      : 'Shared release spine will populate once the machine and stock catalog finishes loading.',
  };
}

export function resolveToolpathAdvisorRouteAuthority(
  catalog: ProgramReleaseCatalog,
  routeSelection: ProgramReleaseRouteSelection,
): ToolpathAdvisorRouteAuthority | null {
  const hasRouteSelection = Object.values(routeSelection).some(Boolean);
  if (!hasRouteSelection) {
    return null;
  }

  const selectorState = resolveProgramReleaseSelectorState({
    catalog,
    routeSelection,
    current: {},
  });
  const machine = findItemById(catalog.machines, selectorState.machineId);
  const stock = findItemById(catalog.stockProfiles, selectorState.stockId);
  const toolholder = findItemById(catalog.toolholders, selectorState.toolholderId);
  const toolingPackage = findItemById(catalog.toolingPackages, selectorState.toolingPackageId);
  const axis = machine ? mapMachineToAxisProfile(machine) : buildToolpathAdvisorSelectorAuthority(catalog).defaultAxis;
  const material = inferMaterialProfile(`${stock?.material ?? ''} ${stock?.label ?? ''}`);
  const spine = summarizeReleaseSpine(machine, toolholder, toolingPackage, stock);
  const unsupportedReason =
    machine && isEdmMachine(machine)
      ? `Toolpath Advisor is not yet wired for the routed ${machine.familyLabel ?? machine.kinematics ?? machine.label} posture. Keep this release on Print to CNC, Setup Sheet, and Prove-Out until EDM toolpath authority is extracted.`
      : undefined;

  return {
    axis,
    material,
    authorityNote: selectorState.authorityNote,
    unsupportedReason,
    releaseContext: {
      machineId: machine?.id,
      machineLabel: machine?.label,
      controller: machine?.controller,
      toolholderId: toolholder?.id,
      toolholderLabel: toolholder?.label,
      toolingPackageId: toolingPackage?.id,
      toolingPackageLabel: toolingPackage?.label,
      stockId: stock?.id,
      stockLabel: stock?.label,
      authorityNote: spine
        ? `Routed release spine for this strategy posture: ${spine}.`
        : selectorState.authorityNote,
    },
  };
}

export function chooseToolpathSelectorValue<T extends string>(
  current: T,
  availableValues: T[],
  fallback: T,
) {
  return availableValues.includes(current) ? current : fallback;
}

export function formatCadSourceStatus(source: ProgramReleaseCadSourceProfile | null) {
  if (!source) {
    return '';
  }
  if (source.status === 'compare') {
    return 'Compare route';
  }
  if (source.status === 'preferred') {
    return 'Recommended route';
  }
  return 'Fallback route';
}
