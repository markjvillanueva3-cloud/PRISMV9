import type {
  MachineCatalogItem,
  MachineMode,
  MaterialCatalogItem,
  ProgrammingEnvironmentOption,
  ProgrammingToolpathOption,
  SelectionOption,
} from '../data/calculatorWorkspace';
import type {
  MachineWorkspaceContext,
  MachineWorkspaceProgrammingAuthority,
} from '../features/machine-workspace/MachineWorkspaceState';
import type { ProgrammingCatalogAuthoritySummary } from './jmDieCalculatorProgrammingAuthority';
import type { JMDieCalculatorRouteAuthority } from './jmDieCalculatorRouteAuthority';

type CalculatorWorkspaceMode = MachineWorkspaceContext['mode'];

type CalculatorPostWorkflowInput = {
  machineMode: MachineMode;
  machine?: Pick<
    MachineCatalogItem,
    'id' | 'manufacturer' | 'model' | 'machineTypeLabel' | 'family' | 'axes'
  > | null;
  material?: Pick<MaterialCatalogItem, 'id' | 'name' | 'group'> | null;
  controllerOption?: Pick<SelectionOption, 'id' | 'label'> | null;
  holderStyle: string;
  stockDiameterMm: number;
  stockLengthMm: number;
  stockThicknessMm: number;
  targetRaUm: number;
  programReleasePath: string;
  routeAuthority: JMDieCalculatorRouteAuthority;
  programmingAuthority?: ProgrammingCatalogAuthoritySummary | null;
  programming?: Pick<ProgrammingEnvironmentOption, 'id' | 'label' | 'vendor' | 'badge' | 'summary'> | null;
  licenseLabel?: string | null;
  toolpathTypeLabel?: string | null;
  toolpath?: Pick<ProgrammingToolpathOption, 'label' | 'operationId'> | null;
};

export type JMDieCalculatorPostWorkflowState = {
  sourceLabel: string;
  workspaceContext?: MachineWorkspaceContext;
  unsupportedReason?: string;
  machineModel?: string;
  controller?: string;
  machinePosture?: string;
  operation?: string;
  camSystem?: string;
  notes?: string;
};

function resolveWorkspaceMode(machineMode: MachineMode): CalculatorWorkspaceMode | null {
  if (machineMode === 'lathe' || machineMode === 'wire_edm' || machineMode === 'edm') {
    return machineMode;
  }
  return null;
}

function buildProgrammingAuthority(
  machineMode: MachineMode,
  programmingAuthority: ProgrammingCatalogAuthoritySummary | null | undefined,
  programming: CalculatorPostWorkflowInput['programming'],
  licenseLabel: string | null | undefined,
  toolpathTypeLabel: string | null | undefined,
  toolpathLabel: string | null | undefined,
): MachineWorkspaceProgrammingAuthority | undefined {
  if (!programmingAuthority && !programming) {
    return undefined;
  }

  const authorityBase = programmingAuthority ?? {
    badge: programming?.badge ?? 'Calculator programming posture',
    summary: programming?.summary ?? 'Calculator-selected programming posture is being carried forward.',
    posture: 'fallback-staged',
    note: 'Calculator is carrying the current machine and programming posture into the downstream post workflow.',
  };

  const environmentLabel =
    programmingAuthority?.usesJMDieSeed && programmingAuthority.seedLabel
      ? programmingAuthority.seedLabel
      : programming?.label;

  const environmentVendor =
    programmingAuthority?.usesJMDieSeed && programmingAuthority.seedLabel
      ? resolveEnvironmentVendor(machineMode, programmingAuthority.seedLabel)
      : programming?.vendor;

  return {
    ...authorityBase,
    environmentLabel,
    environmentVendor,
    licenseLabel: licenseLabel ?? undefined,
    toolpathTypeLabel: toolpathTypeLabel ?? undefined,
    toolpathLabel: toolpathLabel ?? undefined,
  };
}

function buildUnsupportedReason(mode: CalculatorWorkspaceMode | null) {
  if (mode === 'wire_edm') {
    return 'Post processor generation is not yet supported for this routed wire EDM posture. Kienzle keeps this surface fail-closed until the canonical EDM post and controller contract is extracted.';
  }
  if (mode === 'edm') {
    return 'Post processor generation is not yet supported for this routed sinker EDM posture. Kienzle keeps this surface fail-closed until the canonical sinker EDM post, controller, and electrode release contract is extracted.';
  }
  return undefined;
}

function buildMachinePosture(machineMode: MachineMode, machineTypeLabel: string | null | undefined) {
  if (machineMode === 'lathe') {
    return 'lathe';
  }
  if (machineMode === 'mill') {
    const normalized = (machineTypeLabel ?? '').toLowerCase();
    return normalized.includes('5') ? '5_axis_trunnion' : '3_axis_vmc';
  }
  return undefined;
}

function resolveEnvironmentVendor(machineMode: MachineMode, environmentLabel: string) {
  const normalized = environmentLabel.trim().toLowerCase();
  if (normalized.includes('fusion')) {
    return 'Autodesk';
  }
  if (normalized.includes('cimatron')) {
    return 'Cimatron';
  }
  if (normalized.includes('nx')) {
    return 'Siemens';
  }
  if (normalized.includes('peps')) {
    return 'PEPS';
  }
  if (normalized.includes('conversational')) {
    return machineMode === 'lathe' ? 'Shop-floor control' : 'Operator console';
  }
  return environmentLabel;
}

function resolveCamSystem(
  machineMode: MachineMode,
  programmingAuthority: ProgrammingCatalogAuthoritySummary | null | undefined,
  programmingId: string | null | undefined,
) {
  if (programmingAuthority?.usesJMDieSeed) {
    if (machineMode === 'lathe' || machineMode === 'mill') {
      return 'fusion_360';
    }
    if (machineMode === 'wire_edm' || machineMode === 'edm') {
      return 'cimatron';
    }
  }
  return programmingId ?? undefined;
}

export function buildJMDieCalculatorPostWorkflowState({
  machineMode,
  machine,
  material,
  controllerOption,
  holderStyle,
  stockDiameterMm,
  stockLengthMm,
  stockThicknessMm,
  targetRaUm,
  programReleasePath,
  routeAuthority,
  programmingAuthority,
  programming,
  licenseLabel,
  toolpathTypeLabel,
  toolpath,
}: CalculatorPostWorkflowInput): JMDieCalculatorPostWorkflowState {
  const workspaceMode = resolveWorkspaceMode(machineMode);
  const workspaceContext = workspaceMode
    ? {
        mode: workspaceMode,
        machineLabel: machine?.model ?? machine?.id ?? '',
        machineId: routeAuthority.routeSelection.machineId ?? machine?.id,
        machineManufacturer: machine?.manufacturer ?? undefined,
        machineKinematics: machine?.axes ?? machine?.machineTypeLabel ?? machine?.family,
        controllerId: controllerOption?.id ?? undefined,
        controllerLabel: controllerOption?.label ?? undefined,
        materialLabel: material?.name ?? material?.id ?? 'Selected material',
        materialGroup: material?.group ?? 'unknown',
        stockDiameterMm,
        stockLengthMm,
        stockThicknessMm,
        targetRaUm,
        holderStyle,
        programReleasePath,
        selectorAuthorityNote: routeAuthority.releaseNote,
        programmingAuthority: buildProgrammingAuthority(
          machineMode,
          programmingAuthority,
          programming,
          licenseLabel,
          toolpathTypeLabel,
          toolpath?.label,
        ),
      }
    : null;

  const unsupportedReason = buildUnsupportedReason(workspaceMode);

  return {
    sourceLabel: 'calculator',
    workspaceContext: workspaceContext ?? undefined,
    unsupportedReason,
    machineModel: machine?.model ?? undefined,
    controller: controllerOption?.label ?? controllerOption?.id ?? undefined,
    machinePosture: buildMachinePosture(machineMode, machine?.machineTypeLabel),
    operation: toolpath?.operationId ?? undefined,
    camSystem: resolveCamSystem(machineMode, programmingAuthority, programming?.id),
    notes: workspaceContext
      ? 'Routed from Calculator so post generation stays aligned with the JM Die selector and programming posture.'
      : 'Carry the current calculator machine and operation posture into the post workflow.',
  };
}
