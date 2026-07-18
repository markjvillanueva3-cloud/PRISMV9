import type {
  MachineAxisClass,
  MachineMode,
  MachineOrientation,
  MachinePackageConfidence,
  MachinePackageProvenance,
  MachineTaxonomyProfile,
} from '../data/calculatorWorkspace';

function slugifyMachineToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

const MACHINE_PACKAGE_CONFIDENCE_RANK: Record<MachinePackageConfidence, number> = {
  fallback: 0,
  inferred: 1,
  published: 2,
  merged: 3,
};

export function mergeMachinePackageConfidence(
  left: MachinePackageConfidence,
  right: MachinePackageConfidence,
): MachinePackageConfidence {
  return MACHINE_PACKAGE_CONFIDENCE_RANK[right] > MACHINE_PACKAGE_CONFIDENCE_RANK[left] ? right : left;
}

export function buildCanonicalMachineId(
  mode: MachineMode,
  manufacturer: string,
  model: string,
): string {
  const slug = slugifyMachineToken(`${manufacturer} ${model}`) || slugifyMachineToken(model) || 'machine';
  return `${mode}-${slug}`;
}

export function buildMachinePackageId(canonicalMachineId: string, suffix = 'standard'): string {
  return `${canonicalMachineId}::${suffix}`;
}

export function createMachineTaxonomyProfile(args: {
  mode: MachineMode;
  familyId: string;
  familyLabel: string;
  machineTypeId: string;
  machineTypeLabel: string;
  axisClass: MachineAxisClass;
  orientation: MachineOrientation;
}): MachineTaxonomyProfile {
  return {
    mode: args.mode,
    familyId: args.familyId,
    familyLabel: args.familyLabel,
    machineTypeId: args.machineTypeId,
    machineTypeLabel: args.machineTypeLabel,
    axisClass: args.axisClass,
    orientation: args.orientation,
  };
}

export function buildRegistryMachineProvenance(args: {
  recordId: string;
  confidence: MachinePackageConfidence;
  notes?: string[];
}): MachinePackageProvenance {
  return {
    source: 'registry',
    confidence: args.confidence,
    sourceRecordIds: [args.recordId],
    notes: [...new Set(args.notes ?? [])],
  };
}

export function mergeMachinePackageProvenance(
  left: MachinePackageProvenance | undefined,
  right: MachinePackageProvenance | undefined,
): MachinePackageProvenance | undefined {
  if (!left) return right;
  if (!right) return left;

  const sourceRecordIds = [...new Set([...left.sourceRecordIds, ...right.sourceRecordIds])];
  const baseConfidence = mergeMachinePackageConfidence(left.confidence, right.confidence);

  return {
    source: sourceRecordIds.length > 1 ? 'registry-merged' : left.source,
    confidence:
      sourceRecordIds.length > 1 && baseConfidence === 'published'
        ? 'merged'
        : baseConfidence,
    sourceRecordIds,
    notes: [...new Set([...left.notes, ...right.notes])],
  };
}
