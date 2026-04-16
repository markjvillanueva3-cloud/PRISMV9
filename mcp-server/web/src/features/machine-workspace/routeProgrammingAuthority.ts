import type { CalculatorCatalogLoadState } from '../../api/calculatorData';
import {
  PROGRAMMING_ENVIRONMENTS,
  type MachineCatalogItem,
  type MachineMode as CalculatorMachineMode,
  type ProgrammingEnvironmentOption,
} from '../../data/calculatorWorkspace';
import {
  buildJMDieProgrammingCatalogAuthority,
  findJMDieCanonicalProgrammingSeed,
} from '../../utils/jmDieCalculatorProgrammingAuthority';
import type { MachineWorkspaceProgrammingAuthority } from './MachineWorkspaceState';
import { buildProgrammingSelectionContext } from './programmingAuthorityContract';

type ProgrammingCatalogState = Pick<
  CalculatorCatalogLoadState<ProgrammingEnvironmentOption>,
  'authority' | 'items'
>;

type ProgrammingMachineProfile = Pick<MachineCatalogItem, 'machineTypeId' | 'toolingLayout'>;

type ProgrammingAuthorityInput = {
  controllerLabel?: string;
  machineFamilyId?: string;
  machineKinematics?: string;
  machineLabel?: string;
  mode?: CalculatorMachineMode;
  programmingCatalogState?: ProgrammingCatalogState | null;
};

function buildSignature(parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();
}

function sortProgrammingCatalog(items: ProgrammingEnvironmentOption[]) {
  return [...items].sort(
    (left, right) =>
      left.label.localeCompare(right.label)
      || left.vendor.localeCompare(right.vendor)
      || left.id.localeCompare(right.id),
  );
}

export function inferProgrammingModeFromMachineSignature({
  controllerLabel,
  machineFamilyId,
  machineKinematics,
  machineLabel,
}: Omit<ProgrammingAuthorityInput, 'mode' | 'programmingCatalogState'>): CalculatorMachineMode | undefined {
  const familySignature = buildSignature([machineFamilyId]).replace(/-/g, ' ');
  if (familySignature.includes('wire edm') || familySignature.includes('wedm')) {
    return 'wire_edm';
  }
  if (familySignature.includes('sinker edm') || familySignature === 'edm') {
    return 'edm';
  }
  if (familySignature.includes('lathe') || familySignature.includes('turn')) {
    return 'lathe';
  }
  if (familySignature.includes('laser')) {
    return 'laser';
  }
  if (familySignature.includes('waterjet')) {
    return 'waterjet';
  }
  if (familySignature.includes('mill')) {
    return 'mill';
  }

  const signature = buildSignature([machineLabel, machineKinematics, controllerLabel]);
  if (!signature) {
    return undefined;
  }
  if (signature.includes('wire edm') || signature.includes('wedm') || /\bwire\b/.test(signature)) {
    return 'wire_edm';
  }
  if ((signature.includes('edm') || signature.includes('burn')) && !signature.includes('wire edm')) {
    return 'edm';
  }
  if (
    signature.includes('lathe')
    || signature.includes('turn')
    || signature.includes('mill-turn')
    || signature.includes('integrex')
    || signature.includes('multus')
  ) {
    return 'lathe';
  }
  if (signature.includes('laser')) {
    return 'laser';
  }
  if (signature.includes('waterjet')) {
    return 'waterjet';
  }
  if (
    signature.includes('mill')
    || signature.includes('trunnion')
    || signature.includes('vertical')
    || signature.includes('horizontal')
    || signature.includes('gantry')
  ) {
    return 'mill';
  }
  return undefined;
}

function inferProgrammingMachineProfile(
  mode: CalculatorMachineMode,
  signature: string,
): ProgrammingMachineProfile | undefined {
  if (mode === 'lathe') {
    const isSwiss = /swiss|guide bushing|sliding head|cincom|star/i.test(signature);
    const hasLiveTooling = isSwiss || /live tooling|live-tool|live tool|y-axis|y axis|mill-turn|mill turn|b-axis|b axis|integrex|multus|driven tool|sub-spindle|sub spindle/i.test(signature);
    return {
      machineTypeId: isSwiss ? 'lathe_swiss' : hasLiveTooling ? 'lathe_y_axis' : 'lathe_turning',
      toolingLayout: {
        kind: isSwiss ? 'gang' : 'turret',
        liveTooling: hasLiveTooling,
        liveRpm: hasLiveTooling ? 6000 : 0,
        millingHeadLabel: hasLiveTooling && !isSwiss ? 'Live tooling' : undefined,
      },
    };
  }

  if (mode === 'mill') {
    const isFiveAxis = /5-axis|5 axis|trunnion|simultaneous/i.test(signature);
    const isFourAxis = !isFiveAxis && /4-axis|4 axis|4th axis|rotary|index/i.test(signature);
    return {
      machineTypeId: isFiveAxis ? 'mill_5axis' : isFourAxis ? 'mill_4axis' : 'mill_3axis',
      toolingLayout: {
        kind: 'magazine',
      },
    };
  }

  return undefined;
}

function preferredLicenseTierId(
  mode: CalculatorMachineMode,
  machineProfile: ProgrammingMachineProfile | undefined,
): string {
  switch (mode) {
    case 'mill':
      if (machineProfile?.machineTypeId.includes('_5')) return 'multiaxis';
      return 'advanced-3d';
    case 'lathe':
      if (machineProfile?.machineTypeId === 'lathe_swiss') return 'swiss-sync';
      if (machineProfile?.toolingLayout?.liveTooling) return 'live-tooling';
      return 'turning-core';
    case 'wire_edm':
      return 'taper-skim';
    case 'edm':
      return 'orbit-detail';
    case 'laser':
      return 'quality-nesting';
    case 'waterjet':
      return 'quality-taper';
    default:
      return 'full';
  }
}

function preferredToolpathTypeId(
  mode: CalculatorMachineMode,
  machineProfile: ProgrammingMachineProfile | undefined,
): string {
  switch (mode) {
    case 'mill':
      return machineProfile?.machineTypeId.includes('_5') ? 'multiaxis' : 'roughing';
    case 'lathe':
      if (machineProfile?.machineTypeId === 'lathe_swiss') return 'swiss_sync';
      if (machineProfile?.toolingLayout?.liveTooling) return 'live_milling';
      return 'turning_rough';
    case 'wire_edm':
      return 'wire_profile';
    case 'edm':
      return 'burn_roughing';
    case 'laser':
      return 'laser_profile';
    case 'waterjet':
      return 'abrasive_contour';
    default:
      return 'all';
  }
}

export function buildMachineWorkspaceProgrammingAuthority({
  controllerLabel,
  machineFamilyId,
  machineKinematics,
  machineLabel,
  mode,
  programmingCatalogState,
}: ProgrammingAuthorityInput): MachineWorkspaceProgrammingAuthority | undefined {
  const resolvedMode = mode ?? inferProgrammingModeFromMachineSignature({
    machineFamilyId,
    machineLabel,
    machineKinematics,
    controllerLabel,
  });

  if (!resolvedMode) {
    return undefined;
  }

  const catalogItems = sortProgrammingCatalog(
    (programmingCatalogState?.items?.length
      ? programmingCatalogState.items
      : PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === resolvedMode)),
  );

  const authority =
    programmingCatalogState?.authority
    ?? buildJMDieProgrammingCatalogAuthority({
      mode: resolvedMode,
      items: catalogItems,
      liveCount: 0,
      fallbackCount: catalogItems.length,
      stage: catalogItems.length ? 'database-unavailable' : 'empty',
    });

  if (!catalogItems.length) {
    return authority;
  }

  const seed =
    findJMDieCanonicalProgrammingSeed(resolvedMode, catalogItems)
    ?? catalogItems[0];

  const signature = buildSignature([machineLabel, machineKinematics, controllerLabel, machineFamilyId]);
  const machineProfile = inferProgrammingMachineProfile(resolvedMode, signature);
  const selection = buildProgrammingSelectionContext({
    programming: seed,
    machine: machineProfile,
    requestedLicenseTierId: preferredLicenseTierId(resolvedMode, machineProfile),
    requestedToolpathTypeId: preferredToolpathTypeId(resolvedMode, machineProfile),
    requestedToolpathId: '',
  });
  const selectedLicense = selection.licenseOptions.find((item) => item.id === selection.licenseTierId);

  return {
    ...authority,
    environmentLabel: seed.label,
    environmentVendor: seed.vendor,
    licenseLabel: selectedLicense?.label ?? selection.licenseOptions[0]?.label,
    toolpathTypeLabel: selection.selectedToolpathType?.label,
    toolpathLabel: selection.selectedToolpath?.label,
  };
}
