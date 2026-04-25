import type { ProgrammingCatalogAuthoritySummary } from '../../utils/jmDieCalculatorProgrammingAuthority';

import type { MachineMode as CalculatorMachineMode } from '../../data/calculatorWorkspace';

// Narrow subset of the canonical MachineMode union — only the modes this
// workspace feature owns. Derived from canonical so additions to the parent
// union never silently expand this surface (U-LPR09).
export type MachineMode = Extract<CalculatorMachineMode, 'lathe' | 'wire_edm' | 'edm'>;

export type MachineWorkspaceProgrammingAuthority = ProgrammingCatalogAuthoritySummary & {
  environmentLabel?: string;
  environmentVendor?: string;
  licenseLabel?: string;
  toolpathTypeLabel?: string;
  toolpathLabel?: string;
};

export type MachineWorkspaceContext = {
  mode: MachineMode;
  machineLabel?: string;
  machineId?: string;
  machineManufacturer?: string;
  machineKinematics?: string;
  controllerId?: string;
  controllerLabel?: string;
  materialLabel: string;
  materialGroup: string;
  stockDiameterMm: number;
  stockLengthMm: number;
  stockThicknessMm: number;
  targetRaUm: number;
  holderStyle: string;
  programReleasePath: string;
  selectorAuthorityNote?: string;
  programmingAuthority?: MachineWorkspaceProgrammingAuthority;
};

export const DEFAULT_PROGRAM_RELEASE_PATH = '/program-release';
