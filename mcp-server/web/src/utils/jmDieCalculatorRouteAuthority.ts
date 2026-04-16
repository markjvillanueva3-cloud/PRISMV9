import type { MachineMode } from '../data/calculatorWorkspace';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import {
  resolveToolpathAdvisorRouteAuthority,
  type ProgramReleaseRouteSelection,
} from '../features/machine-workspace/selectorAuthorityContract';

type CalculatorRouteMachine = {
  id?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  machineTypeId?: string | null;
};

type CalculatorRouteMaterial = {
  name?: string | null;
  group?: string | null;
};

type CalculatorRouteInput = {
  machineMode: MachineMode;
  machine?: CalculatorRouteMachine | null;
  material?: CalculatorRouteMaterial | null;
};

export type JMDieCalculatorRouteAuthority = {
  routeSelection: ProgramReleaseRouteSelection;
  releaseNote: string;
  toolpathNote: string;
  toolpathSupported: boolean;
};

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function machineTypeToken(machine?: CalculatorRouteMachine | null) {
  return normalize(machine?.machineTypeId);
}

function inferMachineFamilyId(machineMode: MachineMode, machine?: CalculatorRouteMachine | null) {
  if (machineMode === 'lathe') {
    return machineTypeToken(machine).includes('multitask') ? 'mill-turn' : 'lathe';
  }
  if (machineMode === 'wire_edm') {
    return 'wire-edm';
  }
  if (machineMode === 'edm') {
    return 'sinker-edm';
  }
  if (machineMode === 'mill') {
    return machineTypeToken(machine).includes('_5') ? '5-axis' : '3-axis';
  }
  return null;
}

function canonicalMachineSelection(
  machineMode: MachineMode,
  machine?: CalculatorRouteMachine | null,
) {
  const machineId = normalize(machine?.id);
  if (machineId === 'haas-vf2ss') {
    return { id: 'vf2-3x', exact: true };
  }
  if (machineId === 'haas-st20y') {
    return { id: 'st20-turn', exact: true };
  }
  if (machineId === 'okuma-multus-u3000') {
    return { id: 'integrex-millturn', exact: false };
  }

  const familyId = inferMachineFamilyId(machineMode, machine);
  if (familyId === '5-axis') {
    return { id: 'umc-5x', exact: false };
  }
  if (familyId === '3-axis') {
    return { id: 'vf2-3x', exact: false };
  }
  if (familyId === 'lathe') {
    return { id: 'st20-turn', exact: false };
  }
  if (familyId === 'mill-turn') {
    return { id: 'integrex-millturn', exact: false };
  }
  if (familyId === 'wire-edm') {
    return { id: 'aln600g-wire', exact: false };
  }
  return { id: null, exact: false };
}

function canonicalMachineLabel(machineId: string | null) {
  if (!machineId) {
    return '';
  }
  return PROGRAM_RELEASE_CATALOG.machines.find((candidate) => candidate.id === machineId)?.label ?? '';
}

function inferPartClassId(machineMode: MachineMode) {
  if (machineMode === 'lathe') {
    return 'turned-shaft';
  }
  if (machineMode === 'wire_edm' || machineMode === 'edm') {
    return 'fixture-plate';
  }
  return 'prismatic-bracket';
}

function inferCadSourceId(machineMode: MachineMode) {
  return machineMode === 'wire_edm' || machineMode === 'edm' ? 'neutral-compare' : 'fusion-master';
}

function inferToolholderId(machineMode: MachineMode) {
  if (machineMode === 'lathe') {
    return 'capto-turn';
  }
  if (machineMode === 'mill') {
    return 'shrinkfit-short';
  }
  return null;
}

function inferToolingPackageId(machineMode: MachineMode, material?: CalculatorRouteMaterial | null) {
  if (machineMode === 'lathe') {
    return 'steel-balanced';
  }
  if (machineMode === 'mill') {
    const group = normalize(material?.group);
    const name = normalize(material?.name);
    if (group === 'aluminum' || /alum|6061|7075/.test(name)) {
      return 'alu-velocity';
    }
    if (group === 'superalloy' || group === 'titanium' || /titan|inconel|nickel/.test(name)) {
      return 'titanium-safe';
    }
    return 'steel-balanced';
  }
  return null;
}

function inferFixtureId(machineMode: MachineMode) {
  if (machineMode === 'lathe') {
    return 'softjaw-collet';
  }
  if (machineMode === 'mill' || machineMode === 'wire_edm') {
    return 'modular-plate';
  }
  return null;
}

function inferStockId(machineMode: MachineMode, material?: CalculatorRouteMaterial | null) {
  if (machineMode === 'lathe') {
    return '174-round';
  }
  if (machineMode === 'wire_edm') {
    return 'd2-plate';
  }
  if (machineMode === 'mill') {
    const group = normalize(material?.group);
    const name = normalize(material?.name);
    if (group === 'aluminum' || /alum|6061|7075/.test(name)) {
      return '6061-plate';
    }
  }
  return null;
}

function buildReleaseNote(
  machineMode: MachineMode,
  machine: CalculatorRouteMachine | null | undefined,
  routeSelection: ProgramReleaseRouteSelection,
  exactMachineMatch: boolean,
) {
  if (!routeSelection.machineId) {
    if (machineMode === 'edm') {
      return 'Print to CNC stays available from Calculator, but the shared release catalog does not publish a canonical sinker EDM machine row yet.';
    }
    return 'Release continuity will open with the shared JM Die selector packet for this setup.';
  }

  const label = canonicalMachineLabel(routeSelection.machineId) || 'the shared JM Die machine spine';
  if (exactMachineMatch) {
    return `Release continuity is pinned to ${label} with the shared JM Die selector packet.`;
  }

  return `Release continuity will open on the shared ${label} spine because ${machine?.model ?? 'this machine'} does not have an exact Program Release row yet.`;
}

export function buildJMDieCalculatorRouteAuthority({
  machineMode,
  machine,
  material,
}: CalculatorRouteInput): JMDieCalculatorRouteAuthority {
  const canonicalMachine = canonicalMachineSelection(machineMode, machine);
  const routeSelection: ProgramReleaseRouteSelection = {
    partClassId: inferPartClassId(machineMode),
    machineId: canonicalMachine.id,
    machineFamilyId: inferMachineFamilyId(machineMode, machine),
    machineManufacturer: normalize(machine?.manufacturer) || null,
    toolholderId: inferToolholderId(machineMode),
    toolingPackageId: inferToolingPackageId(machineMode, material),
    fixtureId: inferFixtureId(machineMode),
    stockId: inferStockId(machineMode, material),
    cadSourceId: inferCadSourceId(machineMode),
  };

  const routedToolpathAuthority =
    machineMode === 'mill' || machineMode === 'lathe' || machineMode === 'wire_edm'
      ? resolveToolpathAdvisorRouteAuthority(PROGRAM_RELEASE_CATALOG, routeSelection)
      : null;

  return {
    routeSelection,
    releaseNote: buildReleaseNote(machineMode, machine, routeSelection, canonicalMachine.exact),
    toolpathSupported: Boolean(routedToolpathAuthority && !routedToolpathAuthority.unsupportedReason),
    toolpathNote:
      routedToolpathAuthority?.unsupportedReason
      ?? (
        routedToolpathAuthority
          ? `${routedToolpathAuthority.releaseContext.authorityNote} Toolpath Advisor will open with the same routed calculator packet.`
          : 'Toolpath Advisor is currently wired only for mill, turning, and shared routed release postures from Calculator.'
      ),
  };
}
