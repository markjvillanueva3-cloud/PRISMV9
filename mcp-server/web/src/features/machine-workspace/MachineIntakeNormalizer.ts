import type { CalculatorCatalogLoadState } from '../../api/calculatorData';
import type { ShopMachineControllerRegistryEntry } from '../../api/shopProfile';
import type { ProgrammingEnvironmentOption } from '../../data/calculatorWorkspace';
import type {
  ProgramReleaseCatalog,
  ProgramReleaseStockProfile,
} from '../operating-system/contracts';
import {
  DEFAULT_PROGRAM_RELEASE_PATH,
  type MachineMode,
  type MachineWorkspaceContext,
  type MachineWorkspaceProgrammingAuthority,
} from './MachineWorkspaceState';
import { buildMachineWorkspaceProgrammingAuthority } from './routeProgrammingAuthority';
import {
  readProgramReleaseRouteSelection,
  resolveProgramReleaseSelectorState,
} from './selectorAuthorityContract';

type ProgrammingCatalogState = CalculatorCatalogLoadState<ProgrammingEnvironmentOption>;

type MachineWorkspaceSeed = {
  mode: MachineMode;
  machineLabel?: string;
  machineId?: string;
  machineManufacturer?: string;
  machineKinematics?: string;
  controllerId?: string;
  controllerLabel?: string;
  materialLabel?: string;
  materialGroup?: string;
  stockDiameterMm?: number;
  stockLengthMm?: number;
  stockThicknessMm?: number;
  targetRaUm?: number;
  holderStyle?: string;
  programReleasePath?: string;
  selectorAuthorityNote?: string;
  programmingAuthority?: MachineWorkspaceProgrammingAuthority;
};

function sanitizeNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Math.max(value ?? fallback, 0) : fallback;
}

function normalizeControllerId(value: string | undefined) {
  const controller = (value ?? '').trim().toLowerCase();
  if (!controller) {
    return undefined;
  }
  if (controller.includes('fanuc')) return 'fanuc';
  if (controller.includes('haas')) return 'haas';
  if (controller.includes('okuma')) return 'okuma';
  if (controller.includes('mazatrol') || controller.includes('mazak')) return 'mazak';
  if (controller.includes('siemens')) return 'siemens';
  if (controller.includes('mitsubishi')) return 'mitsubishi';
  if (controller.includes('sodick')) return 'sodick';
  if (controller.includes('makino')) return 'makino';
  if (controller.includes('agie')) return 'agiecharmilles';
  return controller.replace(/[^a-z0-9]+/g, '-');
}

function inferMaterialGroup(materialLabel: string | undefined) {
  const material = (materialLabel ?? '').toLowerCase();
  if (material.includes('alum')) return 'aluminum';
  if (material.includes('stainless') || material.includes('17-4') || material.includes('17 4')) return 'stainless';
  if (material.includes('copper') || material.includes('brass') || material.includes('graphite')) return 'non-ferrous';
  if (material.includes('titan') || material.includes('inconel') || material.includes('nickel')) return 'superalloy';
  return 'steel';
}

function extractSizeValuesMm(sizeLabel: string | undefined) {
  const values = Array.from((sizeLabel ?? '').matchAll(/(\d+(?:\.\d+)?)/g)).map((match) => Number(match[1]));
  const inUnits = /(^|[^a-z])in($|[^a-z])|"/i.test(sizeLabel ?? '');
  const multiplier = inUnits ? 25.4 : 1;
  return values.map((value) => Number((value * multiplier).toFixed(2)));
}

function summarizeLatheStock(stock: ProgramReleaseStockProfile | null) {
  const [diameterMm, lengthMm] = extractSizeValuesMm(stock?.size);
  return {
    materialLabel: stock?.material ?? 'Steel',
    materialGroup: inferMaterialGroup(stock?.material),
    stockDiameterMm: diameterMm ?? 32,
    stockLengthMm: lengthMm ?? 120,
    stockThicknessMm: diameterMm ?? 32,
  };
}

function buildProgramReleasePath(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${DEFAULT_PROGRAM_RELEASE_PATH}?${query}` : DEFAULT_PROGRAM_RELEASE_PATH;
}

function isWireRegistryEntry(entry: ShopMachineControllerRegistryEntry) {
  const haystack = `${entry.machine_type} ${entry.machine_name} ${entry.controller_family} ${entry.controller_model}`.toLowerCase();
  return haystack.includes('wire edm') || haystack.includes('wire-edm') || haystack.includes('wedm');
}

function pickWireRegistryEntry(registry: ShopMachineControllerRegistryEntry[]) {
  return [...registry]
    .filter((entry) => isWireRegistryEntry(entry))
    .sort((left, right) => {
      const leftScore = Number(left.program_release_ready) * 2 + Number(left.canonical_test_machine);
      const rightScore = Number(right.program_release_ready) * 2 + Number(right.canonical_test_machine);
      return rightScore - leftScore;
    })[0] ?? null;
}

function findCatalogItemById<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id) ?? null;
}

function resolveLatheWorkspaceMachine(catalog: ProgramReleaseCatalog) {
  const selectorState = resolveProgramReleaseSelectorState({
    catalog,
    routeSelection: readProgramReleaseRouteSelection('?source=lathe-upload&machineFamilyId=lathe&partClassId=turned-shaft'),
    current: {},
  });
  const machine = findCatalogItemById(catalog.machines, selectorState.machineId);
  const stock = findCatalogItemById(catalog.stockProfiles, selectorState.stockId);
  const toolholder = findCatalogItemById(catalog.toolholders, selectorState.toolholderId);

  return {
    selectorState,
    machine,
    stock,
    toolholder,
  };
}

export function createMachineWorkspaceContext(seed: MachineWorkspaceSeed): MachineWorkspaceContext {
  return {
    mode: seed.mode,
    machineLabel: seed.machineLabel,
    machineId: seed.machineId,
    machineManufacturer: seed.machineManufacturer,
    machineKinematics: seed.machineKinematics,
    controllerId: seed.controllerId,
    controllerLabel: seed.controllerLabel,
    materialLabel: seed.materialLabel ?? 'Steel',
    materialGroup: seed.materialGroup ?? 'steel',
    stockDiameterMm: sanitizeNumber(seed.stockDiameterMm, 25),
    stockLengthMm: sanitizeNumber(seed.stockLengthMm, 100),
    stockThicknessMm: sanitizeNumber(seed.stockThicknessMm, 12),
    targetRaUm: sanitizeNumber(seed.targetRaUm, 1.6),
    holderStyle: seed.holderStyle ?? 'standard',
    programReleasePath: seed.programReleasePath ?? DEFAULT_PROGRAM_RELEASE_PATH,
    selectorAuthorityNote: seed.selectorAuthorityNote,
    programmingAuthority:
      seed.programmingAuthority
      ?? buildMachineWorkspaceProgrammingAuthority({
        mode: seed.mode,
        machineLabel: seed.machineLabel,
        machineKinematics: seed.machineKinematics,
        controllerLabel: seed.controllerLabel,
      }),
  };
}

export function buildLatheMachineWorkspaceContext(
  overrides: Omit<Partial<MachineWorkspaceContext>, 'mode'> = {},
): MachineWorkspaceContext {
  return createMachineWorkspaceContext({
    mode: 'lathe',
    machineLabel: 'Lathe routed cell',
    machineId: 'lathe-route',
    machineManufacturer: 'Shared machine workspace',
    machineKinematics: 'Lathe with Y-axis and live tooling',
    controllerId: 'fanuc',
    materialLabel: 'Steel',
    materialGroup: 'steel',
    stockDiameterMm: 38,
    stockLengthMm: 120,
    stockThicknessMm: 38,
    targetRaUm: 1.6,
    holderStyle: 'od-turning',
    programReleasePath: '/program-release?source=lathe-upload&machineFamilyId=lathe',
    ...overrides,
  });
}

export function buildWireEdmMachineWorkspaceContext(
  overrides: Omit<Partial<MachineWorkspaceContext>, 'mode'> = {},
): MachineWorkspaceContext {
  return createMachineWorkspaceContext({
    mode: 'wire_edm',
    machineLabel: 'Wire EDM routed cell',
    machineId: 'wire-edm-route',
    machineManufacturer: 'Shared machine workspace',
    machineKinematics: 'Wire EDM',
    controllerId: 'sodick',
    materialLabel: 'Tool Steel',
    materialGroup: 'steel',
    stockDiameterMm: 0,
    stockLengthMm: 80,
    stockThicknessMm: 24,
    targetRaUm: 1.1,
    holderStyle: 'fine-wire',
    programReleasePath: '/program-release?source=wire-edm-upload&machineFamilyId=wire-edm',
    ...overrides,
  });
}

export function buildEdmElectrodeMachineWorkspaceContext(
  overrides: Omit<Partial<MachineWorkspaceContext>, 'mode'> = {},
): MachineWorkspaceContext {
  return createMachineWorkspaceContext({
    mode: 'edm',
    machineLabel: 'Sinker EDM routed cell',
    machineId: 'sinker-edm-route',
    machineManufacturer: 'Roku-Roku',
    machineKinematics: 'Sinker EDM electrode prep',
    controllerId: 'fanuc',
    materialLabel: 'Copper Tungsten',
    materialGroup: 'non-ferrous',
    stockDiameterMm: 0,
    stockLengthMm: 48,
    stockThicknessMm: 24,
    targetRaUm: 0.8,
    holderStyle: 'system-3r-er32',
    programReleasePath: '/program-release?source=sinker-edm-upload&machineFamilyId=sinker-edm',
    ...overrides,
  });
}

export function buildLatheRouteWorkspaceContextFromCatalog(
  catalog: ProgramReleaseCatalog,
  programmingCatalogState?: ProgrammingCatalogState | null,
): MachineWorkspaceContext {
  const { selectorState, machine, stock, toolholder } = resolveLatheWorkspaceMachine(catalog);
  const latheStock = summarizeLatheStock(stock);

  return createMachineWorkspaceContext({
    mode: 'lathe',
    machineLabel: machine?.label ?? 'Lathe routed cell',
    machineId: machine?.id ?? 'lathe-route',
    machineManufacturer: machine?.manufacturer ?? machine?.familyLabel ?? 'JM Die shared release catalog',
    machineKinematics: machine?.kinematics,
    controllerId: normalizeControllerId(machine?.controller) ?? 'fanuc',
    controllerLabel: machine?.controller,
    materialLabel: latheStock.materialLabel,
    materialGroup: latheStock.materialGroup,
    stockDiameterMm: latheStock.stockDiameterMm,
    stockLengthMm: latheStock.stockLengthMm,
    stockThicknessMm: latheStock.stockThicknessMm,
    targetRaUm: 1.6,
    holderStyle: toolholder?.style ?? 'od-turning',
    programReleasePath: buildProgramReleasePath({
      source: 'lathe-upload',
      partClassId: selectorState.partClassId,
      machineFamilyId: 'lathe',
      machineId: selectorState.machineId,
      toolholderId: selectorState.toolholderId,
      toolingPackageId: selectorState.toolingPackageId,
      fixtureId: selectorState.fixtureId,
      stockId: selectorState.stockId,
      cadSourceId: selectorState.cadSourceId,
    }),
    selectorAuthorityNote: selectorState.authorityNote,
    programmingAuthority: buildMachineWorkspaceProgrammingAuthority({
      mode: 'lathe',
      machineFamilyId: 'lathe',
      machineLabel: machine?.label ?? 'Lathe routed cell',
      machineKinematics: machine?.kinematics,
      controllerLabel: machine?.controller,
      programmingCatalogState,
    }),
  });
}

export function buildWireEdmRouteWorkspaceContextFromRegistry(
  registry: ShopMachineControllerRegistryEntry[],
  programmingCatalogState?: ProgrammingCatalogState | null,
): MachineWorkspaceContext {
  const wireEntry = pickWireRegistryEntry(registry);
  if (!wireEntry) {
    return buildWireEdmMachineWorkspaceContext({
      selectorAuthorityNote:
        'JM Die wire EDM route is still using the staged fallback because the canonical machine/controller registry has no wire EDM entry yet.',
    });
  }

  const controllerLabel = [wireEntry.controller_family, wireEntry.controller_model].filter(Boolean).join(' ');
  const readinessNote = wireEntry.program_release_ready
    ? `${wireEntry.machine_name} is the canonical JM Die wire EDM registry entry. Program Release still hands off this routed lane by family while the exact wire-machine release spine is converging.`
    : `${wireEntry.machine_name} is seeded in the JM Die machine/controller registry, but exact Program Release parity for the wire lane is still pending.`;

  return createMachineWorkspaceContext({
    mode: 'wire_edm',
    machineLabel: wireEntry.machine_name,
    machineId: wireEntry.machine_id,
    machineManufacturer: wireEntry.controller_family || 'JM Die wire EDM registry',
    machineKinematics: wireEntry.machine_type,
    controllerId: wireEntry.shop_controller || normalizeControllerId(controllerLabel) || 'sodick',
    controllerLabel: controllerLabel || undefined,
    materialLabel: 'Tool Steel',
    materialGroup: 'steel',
    stockDiameterMm: 0,
    stockLengthMm: 80,
    stockThicknessMm: 24,
    targetRaUm: 1.1,
    holderStyle: 'fine-wire',
    programReleasePath: buildProgramReleasePath({
      source: 'wire-edm-upload',
      machineFamilyId: 'wire-edm',
    }),
    selectorAuthorityNote: readinessNote,
    programmingAuthority: buildMachineWorkspaceProgrammingAuthority({
      mode: 'wire_edm',
      machineFamilyId: 'wire-edm',
      machineLabel: wireEntry.machine_name,
      machineKinematics: wireEntry.machine_type,
      controllerLabel: controllerLabel || undefined,
      programmingCatalogState,
    }),
  });
}
