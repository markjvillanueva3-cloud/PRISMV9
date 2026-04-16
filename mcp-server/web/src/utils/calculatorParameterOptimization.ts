import type { MachineCatalogItem, MachineMode, MaterialCatalogItem, ToolCatalogItem } from '../data/calculatorWorkspace';

type ToolpathLike = {
  id: string;
  label: string;
  path: string;
  operationId: string;
};

type MachineLike = Pick<MachineCatalogItem, 'machineTypeId' | 'machineTypeLabel' | 'spindleRpm' | 'powerHp' | 'toolingLayout'>;
type MaterialLike = Pick<MaterialCatalogItem, 'group' | 'hardness' | 'baseSfm' | 'idealCoolant' | 'name'>;
type ToolLike = Pick<
  ToolCatalogItem,
  | 'id'
  | 'label'
  | 'defaultDiameter'
  | 'fluteLengthMm'
  | 'overallLengthMm'
  | 'maxApMm'
  | 'geometryClass'
  | 'toolMaterialClass'
  | 'edgePrep'
  | 'wiperGeometry'
  | 'operation'
>;

export interface ToolReachDefaults {
  fluteLengthMm: number;
  stickoutMm: number;
}

export interface CuttingParameterOptimizationInput {
  machineMode: MachineMode;
  machine?: MachineLike | null;
  material?: MaterialLike | null;
  tool?: ToolLike | null;
  toolpath?: ToolpathLike | null;
  operationId?: string;
  toolpathTypeId?: string;
  holderStyleId?: string;
  stabilityId?: string;
  coolantId?: string;
  toolDiameterMm: number;
  currentDocMm: number;
  currentWocMm: number;
  currentLocMm?: number | null;
  currentStickoutMm?: number | null;
  stockZMm?: number;
}

export interface CuttingParameterOptimizationResult {
  recommendedDocMm: number;
  recommendedLocMm: number;
  recommendedStickoutMm: number;
  docReason: string;
  locReason: string;
  stickoutReason: string;
  docStatusLabel: string;
  locStatusLabel: string;
  stickoutStatusLabel: string;
}

export function deriveToolReachDefaults(
  tool: ToolLike | null | undefined,
  toolDiameterMm: number,
  machineMode: MachineMode,
): ToolReachDefaults {
  const diameter = Math.max(toolDiameterMm || tool?.defaultDiameter || 12, machineMode === 'lathe' ? 1 : 2);
  const geometry = tool?.geometryClass ?? '';
  const signature = `${tool?.label ?? ''} ${geometry}`.toLowerCase();
  const publishedFluteLength = safePositive(tool?.fluteLengthMm);
  const publishedOverallLength = safePositive(tool?.overallLengthMm);
  const compactFluteFloor =
    machineMode === 'lathe'
      ? 8
      : diameter <= 3
        ? 6
        : diameter <= 6
          ? 8
          : diameter <= 10
            ? 12
            : 18;
  const compactClearanceFloor =
    machineMode === 'lathe'
      ? 16
      : diameter <= 3
        ? 4
        : diameter <= 6
          ? 6
          : diameter <= 10
            ? 10
            : 16;
  let fluteLength = publishedFluteLength ?? Math.max(diameter * 2.2, compactFluteFloor);
  let stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 1.8, compactClearanceFloor));

  if (geometry === 'face-mill') {
    fluteLength = publishedFluteLength ?? Math.max(Math.min(diameter * 0.28, 22), diameter <= 50 ? 10 : 16);
    stickout = publishedOverallLength ?? Math.max(diameter * 0.55, diameter <= 50 ? 28 : 38);
  } else if (geometry === 'ball-endmill') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 2.6, diameter <= 6 ? 8 : 20);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 2.2, diameter <= 6 ? 8 : 24));
  } else if (geometry === 'drill') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 5, diameter <= 6 ? 18 : 32);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 2.5, diameter <= 6 ? 12 : 24));
  } else if (geometry === 'tap' || geometry === 'reamer') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 4.4, diameter <= 6 ? 14 : 24);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 2.2, diameter <= 6 ? 10 : 22));
  } else if (geometry === 'boring-bar') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 2.4, 18);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 5, 60));
  } else if (
    geometry === 'roughing-insert'
    || geometry === 'finishing-insert'
    || geometry === 'grooving-insert'
    || geometry === 'threading-insert'
    || signature.includes('turning insert')
  ) {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 0.65, 8);
    stickout = publishedOverallLength ?? Math.max(diameter * 1.8, 28);
  } else if (signature.includes('long reach') || signature.includes('extended')) {
    if (!publishedFluteLength) fluteLength *= 1.1;
    if (!publishedOverallLength) stickout *= 1.22;
  }

  return {
    fluteLengthMm: roundMetric(Math.max(fluteLength, diameter * 0.75), 1),
    stickoutMm: roundMetric(Math.max(stickout, fluteLength + Math.max(diameter * 0.5, machineMode === 'lathe' ? 4 : 3)), 1),
  };
}

export function buildCuttingParameterOptimization(
  input: CuttingParameterOptimizationInput,
): CuttingParameterOptimizationResult {
  const toolDiameterMm = Math.max(input.toolDiameterMm || input.tool?.defaultDiameter || 12, input.machineMode === 'lathe' ? 1 : 0.5);
  const reachDefaults = deriveToolReachDefaults(input.tool, toolDiameterMm, input.machineMode);
  const toolpathSignature = `${input.toolpathTypeId ?? ''} ${input.toolpath?.operationId ?? input.operationId ?? ''} ${input.toolpath?.label ?? ''} ${input.toolpath?.path ?? ''}`.toLowerCase();
  const finishPriority =
    /(surface_finish|multiaxis|turning_finish|finish|parallel|scallop|flow|swarf|grind|skim)/.test(toolpathSignature);
  const roughingPriority =
    /(rough|adaptive|dynamic|high-removal|turning_rough|pocket|slot|face_milling|face mill)/.test(toolpathSignature);
  const wocRatio = safeRatio(input.currentWocMm, toolDiameterMm);
  const drillingLike = /drill|bor|tap|ream/.test(toolpathSignature);
  const turningLike = input.machineMode === 'lathe' && !/live_milling|live milling|mill-turn|live tool|milling head/.test(toolpathSignature);
  const materialFactor = materialDocFactor(input.material, finishPriority);
  const setupFactor = stabilityDocFactor(input.stabilityId);
  const holderFactor = holderDocFactor(input.holderStyleId, finishPriority);
  const machineFactor = machineDocFactor(input.machine, finishPriority);
  const coolantFactor = coolantDocFactor(input.coolantId, input.material);
  const reachPenalty = currentReachPenalty(input.currentStickoutMm, input.currentLocMm, toolDiameterMm);
  const wocFactor = wocAggressionFactor(wocRatio, finishPriority, roughingPriority);
  const toolApLimit = Math.max(input.tool?.maxApMm ?? Number.POSITIVE_INFINITY, 0);
  const stockDepth = Math.max(input.stockZMm ?? 0, input.currentDocMm, finishPriority ? toolDiameterMm * 0.25 : toolDiameterMm * 0.45);
  const toolFluteLimit = safePositive(input.tool?.fluteLengthMm) ?? reachDefaults.fluteLengthMm;
  const toolOverallLimit = safePositive(input.tool?.overallLengthMm) ?? reachDefaults.stickoutMm;

  let recommendedDocMm = baseDocForPosture({
    machineMode: input.machineMode,
    toolDiameterMm,
    finishPriority,
    roughingPriority,
    operationId: input.toolpath?.operationId ?? input.operationId ?? input.tool?.operation ?? '',
  });
  recommendedDocMm *= materialFactor * setupFactor * holderFactor * machineFactor * coolantFactor * reachPenalty * wocFactor;
  if (Number.isFinite(toolApLimit)) {
    recommendedDocMm = Math.min(recommendedDocMm, toolApLimit * (finishPriority ? 0.88 : 0.97));
  }
  recommendedDocMm = clamp(
    recommendedDocMm,
    input.machineMode === 'lathe' ? 0.08 : Math.max(toolDiameterMm * 0.04, 0.08),
    input.machineMode === 'lathe'
      ? Math.max(roughingPriority ? 4.5 : 1.2, input.currentDocMm || 0.15)
      : Math.max(toolDiameterMm * (roughingPriority ? 1.6 : 0.65), input.currentDocMm * 0.85, 0.2),
  );

  const reachDemandMm = drillingLike
    ? Math.max(stockDepth, recommendedDocMm, input.currentDocMm)
    : turningLike
      ? Math.max(
          recommendedDocMm * (finishPriority ? 1.35 : 1.55),
          input.currentDocMm * (finishPriority ? 1.4 : 1.65),
          toolDiameterMm * (finishPriority ? 0.8 : 1.2),
        )
      : Math.max(
          recommendedDocMm * (finishPriority ? 1.35 : 1.6),
          input.currentDocMm * (finishPriority ? 1.45 : 1.8),
          toolDiameterMm * (finishPriority ? 0.95 : 1.55),
        );

  const minLocClearanceFactor =
    input.machineMode === 'lathe' ? 1.18 :
    finishPriority ? 1.35 :
    roughingPriority ? 1.55 :
    1.42;
  const recommendedLocSeed = Math.max(
    recommendedDocMm * minLocClearanceFactor,
    reachDemandMm,
    finishPriority ? toolDiameterMm * 0.95 : toolDiameterMm * 1.45,
  );
  const locLowerBound = Math.max(
    recommendedDocMm * 1.18,
    input.machineMode === 'lathe'
      ? 8
      : diameterFloorForLoc(toolDiameterMm),
  );
  const locSoftLimit = Math.max(
    Math.min(toolFluteLimit, reachDefaults.fluteLengthMm * (drillingLike ? 1.04 : finishPriority ? 1.02 : 1.06)),
    reachDemandMm,
  );
  const locTighteningFactor =
    (input.machineMode === 'lathe' ? 0.92 : 1)
    * (finishPriority ? 0.94 : 1)
    * (input.stabilityId === 'detail-control' ? 0.95 : 1)
    * (input.holderStyleId === 'shrink-fit' ? 0.97 : 1);
  const locUpperBound = Math.max(
    locLowerBound,
    Math.min(
      Math.max(locSoftLimit, recommendedLocSeed),
      toolFluteLimit * (drillingLike ? 1.04 : 1.02),
    ),
  );
  const recommendedLocMm = clamp(
    recommendedLocSeed * locTighteningFactor,
    locLowerBound,
    locUpperBound,
  );

  const recommendedStickoutFloor = Math.max(
    recommendedLocMm + (input.machineMode === 'lathe' ? Math.max(toolDiameterMm * 0.9, 4) : Math.max(toolDiameterMm * 0.9, 3)),
    drillingLike
      ? stockDepth + (input.machineMode === 'lathe' ? Math.max(toolDiameterMm * 1.1, 6) : Math.max(toolDiameterMm * 1.2, 5))
      : recommendedLocMm + (finishPriority ? Math.max(toolDiameterMm * 1.1, 4) : Math.max(toolDiameterMm * 1.35, 5)),
    finishPriority ? toolDiameterMm * 2.2 : toolDiameterMm * 2.8,
  );
  const recommendedStickoutCeiling = Math.max(
    Math.min(
      toolOverallLimit * (drillingLike ? 1.04 : 1.02),
      reachDefaults.stickoutMm * (finishPriority ? 1.02 : 1.08),
    ),
    recommendedStickoutFloor,
  );
  const recommendedStickoutMm = clamp(
    recommendedStickoutFloor * (finishPriority ? 0.98 : 1),
    Math.max(recommendedLocMm + Math.max(toolDiameterMm * 0.6, 2), input.machineMode === 'lathe' ? 12 : 8),
    recommendedStickoutCeiling,
  );

  return {
    recommendedDocMm: roundMetric(recommendedDocMm, 2),
    recommendedLocMm: roundMetric(recommendedLocMm, 2),
    recommendedStickoutMm: roundMetric(recommendedStickoutMm, 2),
    docReason: buildDocReason({
      finishPriority,
      roughingPriority,
      toolDiameterMm,
      material: input.material,
      tool: input.tool,
      machine: input.machine,
      currentWocRatio: wocRatio,
      recommendedDocMm,
    }),
    locReason: buildLocReason({
      finishPriority,
      recommendedDocMm,
      recommendedLocMm,
      stockDepth,
      toolDiameterMm,
    }),
    stickoutReason: buildStickoutReason({
      finishPriority,
      recommendedStickoutMm,
      recommendedLocMm,
      toolDiameterMm,
      holderStyleId: input.holderStyleId,
    }),
    docStatusLabel: buildStatusLabel(input.currentDocMm, recommendedDocMm, 'DOC'),
    locStatusLabel: buildStatusLabel(input.currentLocMm ?? reachDefaults.fluteLengthMm, recommendedLocMm, 'LOC'),
    stickoutStatusLabel: buildStatusLabel(
      input.currentStickoutMm ?? reachDefaults.stickoutMm,
      recommendedStickoutMm,
      'Extension',
    ),
  };
}

function safePositive(value: number | null | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : undefined;
}

function diameterFloorForLoc(toolDiameterMm: number) {
  if (toolDiameterMm <= 3) return 4;
  if (toolDiameterMm <= 6) return 6;
  if (toolDiameterMm <= 10) return 8;
  return 10;
}

function baseDocForPosture(input: {
  machineMode: MachineMode;
  toolDiameterMm: number;
  finishPriority: boolean;
  roughingPriority: boolean;
  operationId: string;
}) {
  const operationId = input.operationId.toLowerCase();
  if (input.machineMode === 'lathe') {
    if (input.finishPriority || operationId.includes('finish')) return 0.22;
    if (operationId.includes('groov')) return 1.6;
    if (operationId.includes('bor')) return 0.8;
    return 2.4;
  }
  if (input.finishPriority) {
    return input.toolDiameterMm * 0.18;
  }
  if (input.roughingPriority) {
    return input.toolDiameterMm * 0.95;
  }
  if (operationId.includes('drill')) {
    return input.toolDiameterMm * 0.5;
  }
  return input.toolDiameterMm * 0.55;
}

function materialDocFactor(material: MaterialLike | null | undefined, finishPriority: boolean) {
  if (!material) return 1;
  let factor =
    material.group === 'tool_steel' ? 0.76 :
    material.group === 'stainless' ? 0.82 :
    material.group === 'steel' ? 0.92 :
    material.group === 'titanium' ? 0.72 :
    material.group === 'exotic' ? 0.7 :
    material.group === 'aluminum' ? 1.1 :
    material.group === 'copper' ? 1.03 :
    1;

  const hardnessMatch = /(\d+(?:\.\d+)?)\s*hrc/i.exec(material.hardness);
  const hrc = hardnessMatch ? Number(hardnessMatch[1]) : null;
  if (hrc != null) {
    if (hrc >= 52) factor *= 0.82;
    else if (hrc >= 45) factor *= 0.9;
  } else if (/pre[- ]?hard|ph|17-4|4140/i.test(material.name)) {
    factor *= 0.94;
  }

  if (finishPriority && factor < 1) {
    factor += 0.06;
  }
  return factor;
}

function stabilityDocFactor(stabilityId: string | undefined) {
  switch (stabilityId) {
    case 'aggressive-rigid':
      return 1.12;
    case 'detail-control':
      return 0.82;
    case 'index-ready':
      return 0.94;
    case 'swiss-support':
      return 0.9;
    case 'sheet-flat':
      return 0.88;
    case 'cold-cut-stable':
      return 0.93;
    case 'production-stable':
    default:
      return 1;
  }
}

function holderDocFactor(holderStyleId: string | undefined, finishPriority: boolean) {
  switch (holderStyleId) {
    case 'shrink-fit':
      return finishPriority ? 1.06 : 0.98;
    case 'hydraulic':
      return finishPriority ? 1.03 : 0.97;
    case 'rigid-turning':
    case 'twin-turret':
    case 'milling-head':
    case 'machine-standard':
      return 1;
    default:
      return 0.98;
  }
}

function machineDocFactor(machine: MachineLike | null | undefined, finishPriority: boolean) {
  if (!machine) return 1;
  let factor = 1;
  if (!finishPriority && machine.powerHp >= 30) {
    factor *= 1.06;
  }
  if (finishPriority && machine.spindleRpm >= 15000) {
    factor *= 1.05;
  }
  if (machine.machineTypeId.includes('5-axis') || machine.machineTypeId.includes('mill-turn')) {
    factor *= finishPriority ? 1.03 : 0.98;
  }
  return factor;
}

function coolantDocFactor(coolantId: string | undefined, material: MaterialLike | null | undefined) {
  if (!coolantId || !material) return 1;
  if (material.idealCoolant === coolantId) {
    return 1.04;
  }
  if (
    (material.group === 'tool_steel' || material.group === 'stainless' || material.group === 'titanium')
    && (coolantId === 'air' || coolantId === 'mist')
  ) {
    return 0.9;
  }
  return 0.98;
}

function currentReachPenalty(
  currentStickoutMm: number | null | undefined,
  currentLocMm: number | null | undefined,
  toolDiameterMm: number,
) {
  const stickoutRatio = safeRatio(currentStickoutMm, toolDiameterMm);
  const locRatio = safeRatio(currentLocMm, toolDiameterMm);
  let factor = 1;

  if (stickoutRatio >= 8) factor *= 0.8;
  else if (stickoutRatio >= 6) factor *= 0.88;
  else if (stickoutRatio <= 3.25 && stickoutRatio > 0) factor *= 1.03;

  if (locRatio >= 5.5) factor *= 0.9;
  else if (locRatio >= 4.25) factor *= 0.95;

  return factor;
}

function wocAggressionFactor(wocRatio: number, finishPriority: boolean, roughingPriority: boolean) {
  if (finishPriority) {
    if (wocRatio >= 0.4) return 0.82;
    if (wocRatio >= 0.25) return 0.9;
    return 1.04;
  }
  if (roughingPriority) {
    if (wocRatio <= 0.12) return 1.04;
    if (wocRatio >= 0.6) return 0.9;
    return 1;
  }
  if (wocRatio >= 0.75) return 0.9;
  return 1;
}

function buildDocReason(input: {
  finishPriority: boolean;
  roughingPriority: boolean;
  toolDiameterMm: number;
  material?: MaterialLike | null;
  tool?: ToolLike | null;
  machine?: MachineLike | null;
  currentWocRatio: number;
  recommendedDocMm: number;
}) {
  const posture = input.finishPriority
    ? 'finishing posture'
    : input.roughingPriority
      ? 'roughing posture'
      : 'general engagement';
  const material = input.material?.name ?? 'the selected material';
  const tool = input.tool?.label ?? 'the active tool';
  const machine = input.machine?.machineTypeLabel ?? 'the machine';
  const wocNote =
    input.currentWocRatio >= 0.5
      ? 'The wide radial bite is pulling axial depth back to keep the cut stable.'
      : input.currentWocRatio <= 0.15
        ? 'The lighter radial bite gives you room to stand DOC up a bit harder.'
        : 'The radial bite is staying in a balanced zone.';

  return `${posture[0].toUpperCase()}${posture.slice(1)} on ${machine} with ${tool} in ${material} points to about ${roundMetric(input.recommendedDocMm, 2)} mm DOC. ${wocNote}`;
}

function buildLocReason(input: {
  finishPriority: boolean;
  recommendedDocMm: number;
  recommendedLocMm: number;
  stockDepth: number;
  toolDiameterMm: number;
}) {
  const margin = input.recommendedLocMm - input.recommendedDocMm;
  const bias = input.finishPriority ? 'keep the finish edge supported' : 'leave enough flute to breathe and evacuate chips';
  return `LOC is being sized to ${bias}. That leaves ${roundMetric(margin, 2)} mm of flute margin above the axial step while still clearing about ${roundMetric(input.stockDepth, 2)} mm of working depth.`;
}

function buildStickoutReason(input: {
  finishPriority: boolean;
  recommendedStickoutMm: number;
  recommendedLocMm: number;
  toolDiameterMm: number;
  holderStyleId?: string;
}) {
  const holderNote =
    input.holderStyleId === 'shrink-fit'
      ? 'The shrink-fit posture supports a slightly tighter extension.'
      : input.holderStyleId === 'hydraulic'
        ? 'The hydraulic/collet posture wants a little extra breathing room.'
        : 'The holder posture is staying machine-standard.';
  return `${holderNote} Extension is staying around ${roundMetric(input.recommendedStickoutMm, 2)} mm so the holder clears the feature while the live flute length still covers ${roundMetric(input.recommendedLocMm, 2)} mm of cut.`;
}

function buildStatusLabel(currentValue: number, recommendedValue: number, noun: string) {
  const delta = recommendedValue - currentValue;
  if (Math.abs(delta) <= 0.12) {
    return `${noun} is already on target`;
  }
  return delta > 0
    ? `${noun} should open by ${roundMetric(delta, 2)} mm`
    : `${noun} can tighten by ${roundMetric(Math.abs(delta), 2)} mm`;
}

function safeRatio(value: number | null | undefined, divisor: number) {
  if (!value || !Number.isFinite(value) || divisor <= 0) return 0;
  return value / divisor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundMetric(value: number, digits: number) {
  return Number(value.toFixed(digits));
}
