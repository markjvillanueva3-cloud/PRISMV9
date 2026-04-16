import type { ProgramReleaseCatalog } from '../features/operating-system/contracts';
import type {
  ProgramReleaseRouteSelection,
  ProgramReleaseSelectorSnapshot,
} from '../features/machine-workspace/selectorAuthorityContract';
import { resolveProgramReleaseSelectorState } from '../features/machine-workspace/selectorAuthorityContract';

export type ProgramReleaseRouteExtras = {
  partClassId?: string;
  machineId?: string;
  machineFamilyId?: string;
  machineManufacturer?: string;
  toolholderId?: string;
  toolingPackageId?: string;
  fixtureId?: string;
  stockId?: string;
  cadSourceId?: string;
};

type BuildProgramReleaseRouteExtrasInput = {
  catalog: ProgramReleaseCatalog | null;
  routeSelection: Partial<ProgramReleaseRouteSelection>;
  current?: Partial<ProgramReleaseSelectorSnapshot>;
  allowDefaultPartClass?: boolean;
  requireMachineId?: boolean;
};

function normalizeRouteExtra(value: string | null | undefined) {
  return value ?? undefined;
}

function normalizeRouteExtras(routeSelection: Partial<ProgramReleaseRouteSelection>): ProgramReleaseRouteExtras {
  return {
    partClassId: normalizeRouteExtra(routeSelection.partClassId),
    machineId: normalizeRouteExtra(routeSelection.machineId),
    machineFamilyId: normalizeRouteExtra(routeSelection.machineFamilyId),
    machineManufacturer: normalizeRouteExtra(routeSelection.machineManufacturer),
    toolholderId: normalizeRouteExtra(routeSelection.toolholderId),
    toolingPackageId: normalizeRouteExtra(routeSelection.toolingPackageId),
    fixtureId: normalizeRouteExtra(routeSelection.fixtureId),
    stockId: normalizeRouteExtra(routeSelection.stockId),
    cadSourceId: normalizeRouteExtra(routeSelection.cadSourceId),
  };
}

function toSelectorRouteSelection(routeExtras: ProgramReleaseRouteExtras): ProgramReleaseRouteSelection {
  return {
    partClassId: routeExtras.partClassId ?? null,
    machineId: routeExtras.machineId ?? null,
    machineFamilyId: routeExtras.machineFamilyId ?? null,
    machineManufacturer: routeExtras.machineManufacturer ?? null,
    toolholderId: routeExtras.toolholderId ?? null,
    toolingPackageId: routeExtras.toolingPackageId ?? null,
    fixtureId: routeExtras.fixtureId ?? null,
    stockId: routeExtras.stockId ?? null,
    cadSourceId: routeExtras.cadSourceId ?? null,
  };
}

export function buildProgramReleaseRouteExtras({
  catalog,
  routeSelection,
  current,
  allowDefaultPartClass = false,
  requireMachineId = true,
}: BuildProgramReleaseRouteExtrasInput): ProgramReleaseRouteExtras {
  const normalized = normalizeRouteExtras(routeSelection);

  if (!catalog) {
    return normalized;
  }

  if (requireMachineId && !normalized.machineId) {
    return normalized;
  }

  if (!allowDefaultPartClass && !normalized.partClassId) {
    return normalized;
  }

  const selectorState = resolveProgramReleaseSelectorState({
    catalog,
    routeSelection: toSelectorRouteSelection(normalized),
    current,
  });
  const resolvedMachine = catalog.machines.find((machine) => machine.id === selectorState.machineId) ?? null;

  return {
    partClassId: selectorState.partClassId,
    machineId: selectorState.machineId,
    machineFamilyId: normalized.machineFamilyId ?? resolvedMachine?.familyId ?? undefined,
    machineManufacturer:
      normalized.machineManufacturer
      ?? resolvedMachine?.manufacturerId
      ?? resolvedMachine?.manufacturer?.trim().toLowerCase()
      ?? undefined,
    toolholderId: selectorState.toolholderId,
    toolingPackageId: selectorState.toolingPackageId,
    fixtureId: selectorState.fixtureId,
    stockId: selectorState.stockId,
    cadSourceId: selectorState.cadSourceId,
  };
}
