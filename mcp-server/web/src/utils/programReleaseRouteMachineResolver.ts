import type { ProgramReleaseCatalog, ProgramReleaseMachineProfile } from '../features/operating-system/contracts';

export type ProgramReleaseRouteMachineSeed = {
  machineId: string;
  machineFamilyId?: string;
  machineManufacturer?: string;
};

type MachineHintMatch = {
  hintIndex: number;
  matchStrength: number;
  signatureLength: number;
};

function normalizeMachineSignature(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildMachineSignatures(machine: ProgramReleaseMachineProfile) {
  return [
    machine.id,
    machine.label,
    machine.manufacturer,
    machine.manufacturerId,
    machine.familyId,
    machine.familyLabel,
    machine.controller,
    `${machine.manufacturer ?? ''} ${machine.label}`,
    `${machine.label} ${machine.controller}`,
  ]
    .map(normalizeMachineSignature)
    .filter((value, index, collection) => value && collection.indexOf(value) === index);
}

function resolveMachineHintMatch(
  machine: ProgramReleaseMachineProfile,
  hints: string[],
): MachineHintMatch | null {
  const signatures = buildMachineSignatures(machine);

  for (let hintIndex = 0; hintIndex < hints.length; hintIndex += 1) {
    const hint = hints[hintIndex];
    let bestMatch: MachineHintMatch | null = null;

    for (const signature of signatures) {
      if (signature === hint) {
        return {
          hintIndex,
          matchStrength: 3,
          signatureLength: signature.length,
        };
      }

      if (signature.includes(hint) || hint.includes(signature)) {
        const candidate = {
          hintIndex,
          matchStrength: 2,
          signatureLength: Math.min(signature.length, hint.length),
        };
        if (
          !bestMatch
          || candidate.matchStrength > bestMatch.matchStrength
          || (
            candidate.matchStrength === bestMatch.matchStrength
            && candidate.signatureLength > bestMatch.signatureLength
          )
        ) {
          bestMatch = candidate;
        }
      }
    }

    if (bestMatch) {
      return bestMatch;
    }
  }

  return null;
}

export function resolveProgramReleaseMachineRouteSeed(
  catalog: ProgramReleaseCatalog | null,
  hints: Array<string | null | undefined>,
): ProgramReleaseRouteMachineSeed | null {
  if (!catalog) {
    return null;
  }

  const normalizedHints = hints
    .map(normalizeMachineSignature)
    .filter((value, index, collection) => value && collection.indexOf(value) === index);

  if (!normalizedHints.length) {
    return null;
  }

  const machine = catalog.machines.reduce<{
    entry: ProgramReleaseMachineProfile;
    match: MachineHintMatch;
  } | null>((best, entry) => {
    const match = resolveMachineHintMatch(entry, normalizedHints);
    if (!match) {
      return best;
    }

    if (!best) {
      return { entry, match };
    }

    if (match.hintIndex < best.match.hintIndex) {
      return { entry, match };
    }

    if (match.hintIndex > best.match.hintIndex) {
      return best;
    }

    if (match.matchStrength > best.match.matchStrength) {
      return { entry, match };
    }

    if (match.matchStrength < best.match.matchStrength) {
      return best;
    }

    if (match.signatureLength > best.match.signatureLength) {
      return { entry, match };
    }

    return best;
  }, null)?.entry ?? null;
  if (!machine) {
    return null;
  }

  return {
    machineId: machine.id,
    machineFamilyId: machine.familyId || undefined,
    machineManufacturer: (machine.manufacturerId ?? machine.manufacturer?.trim().toLowerCase()) || undefined,
  };
}
