import type {
  MachineCatalogItem,
  MachineMode,
  MaterialCatalogItem,
  ToolCatalogItem,
} from '../data/calculatorWorkspace';

export type UnitSystem = 'metric' | 'inch';

export interface SurfaceFinishPreset {
  id: string;
  label: string;
  shortLabel: string;
  detail: string;
  raUm: number;
}

export interface SurfaceFinishDriver {
  label: string;
  value: string;
  detail: string;
}

export interface SurfaceFinishRenderStyle {
  label: string;
  detail: string;
  accentLabel: string;
  processFamilyLabel: string;
  processFamilyDetail: string;
  referenceBasisLabel: string;
  referenceBasisDetail: string;
  materialResponseLabel: string;
  materialResponseDetail: string;
  layFamily: 'turned' | 'parallel' | 'scallop' | 'adaptive' | 'face' | 'profile' | 'axial' | 'ground';
  baseStart: string;
  baseMid: string;
  baseEnd: string;
  layAngleDeg: number;
  laySpacingPx: number;
  layThicknessPx: number;
  layOpacity: number;
  secondaryAngleDeg: number;
  secondarySpacingPx: number;
  secondaryOpacity: number;
  glossOpacity: number;
  hazeOpacity: number;
  pitOpacity: number;
  pitSizePx: number;
  highlightAngleDeg: number;
  highlightOpacity: number;
  highlightSpreadPct: number;
  shimmerOpacity: number;
  shimmerSizePx: number;
  microFacetOpacity: number;
  microFacetSizePx: number;
  chatterOpacity: number;
  chatterSpacingPx: number;
  smearOpacity: number;
  edgeShadowOpacity: number;
  imagingPromptSeed: string;
}

export interface ToolpathDefaultsLike {
  docMm: number;
  wocMm: number;
  isAbsolute: boolean;
  finishTarget: string;
}

export interface SurfaceFinishPreviewInput {
  machineMode: MachineMode;
  machine?: Pick<MachineCatalogItem, 'machineTypeId' | 'machineTypeLabel' | 'family' | 'spindleRpm' | 'model' | 'toolingLayout'>;
  material?: Pick<MaterialCatalogItem, 'id' | 'group' | 'name' | 'hardness' | 'baseSfm' | 'idealCoolant'>;
  tool?: Pick<
    ToolCatalogItem,
    | 'id'
    | 'family'
    | 'label'
    | 'description'
    | 'coating'
    | 'defaultDiameter'
    | 'defaultFlutes'
    | 'toolMaterialClass'
    | 'geometryClass'
    | 'edgePrep'
    | 'cornerRadiusMm'
    | 'noseRadiusMm'
    | 'leadAngleDeg'
    | 'helixAngleDeg'
    | 'wiperGeometry'
  >;
  toolpath?: { id: string; label: string; path: string; operationId: string };
  toolpathTypeId?: string;
  programmingLabel?: string;
  coolantId: string;
  finishTarget: string;
  desiredRaUm: number;
  toolDiameterMm: number;
  docMm: number;
  wocMm: number;
  toolStickoutMm?: number;
  fluteLengthMm?: number;
  defaults?: ToolpathDefaultsLike | null;
  toolFluteCount?: number;
  actualFeedPerToothMm?: number;
  actualFeedRateMmPerMin?: number;
  actualRpm?: number;
  actualCuttingSpeedMpm?: number;
  actualAxialDepthMm?: number;
  actualRadialDepthMm?: number;
  actualRaUm?: number;
  holderStyleId?: string;
  stabilityId?: string;
}

export interface SurfaceFinishPreview {
  targetRaUm: number;
  targetPreset: SurfaceFinishPreset;
  mappedFinishTarget: string;
  expectedRaUm: number;
  expectedMinRaUm: number;
  expectedMaxRaUm: number;
  verdict: 'ready' | 'stretch' | 'unlikely' | 'margin';
  verdictLabel: string;
  verdictDetail: string;
  requestedSurface: SurfaceFinishRenderStyle;
  predictedSurface: SurfaceFinishRenderStyle;
  textureLabel: string;
  textureDetail: string;
  textureSpacingPx: number;
  textureOpacity: number;
  glossOpacity: number;
  predictionSource: 'atlas-model' | 'live-engine-anchor' | 'live-cut-model';
  liveCalculatedRaUm?: number;
  predictionSourceLabel: string;
  predictionSourceDetail: string;
  drivers: SurfaceFinishDriver[];
}

export interface SurfaceFinishTargetComparison {
  status: 'beat' | 'on-target' | 'close' | 'miss';
  label: string;
  detail: string;
}

interface SurfaceFinishProcessArchetype {
  label: string;
  detail: string;
  layFamily: SurfaceFinishRenderStyle['layFamily'];
  layAngleDeg: number;
  secondaryAngleDeg: number;
  referenceBasisLabel: string;
  referenceBasisDetail: string;
  highlightAngleDeg: number;
  layBias: number;
  interruptionBias: number;
}

interface SurfaceFinishMaterialCharacter {
  label: string;
  detail: string;
  palette: { start: string; mid: string; end: string };
  reflectivity: number;
  smearBias: number;
  hazeBias: number;
  microFacetBias: number;
}

interface SurfaceFinishBandProfile {
  label: string;
  detail: string;
  referenceDetail: string;
  reflectivityBoost: number;
  chatterBias: number;
  hazeBias: number;
}

export const SURFACE_FINISH_PRESETS: SurfaceFinishPreset[] = [
  {
    id: 'rough-production',
    label: 'Rough production',
    shortLabel: '250 uin',
    detail: 'Open up the cut for roughing, stock removal, and non-cosmetic surfaces.',
    raUm: 6.3,
  },
  {
    id: 'general-production',
    label: 'General production',
    shortLabel: '125 uin',
    detail: 'A common machined-shop finish for everyday features and non-sealing surfaces.',
    raUm: 3.2,
  },
  {
    id: 'fine-machined',
    label: 'Fine machined',
    shortLabel: '63 uin',
    detail: 'A tighter machined finish for visible walls, fits, and more refined profiles.',
    raUm: 1.6,
  },
  {
    id: 'bearing-seat',
    label: 'Bearing / seal seat',
    shortLabel: '32 uin',
    detail: 'A common target for functional sealing, bearing seats, and tighter finish work.',
    raUm: 0.8,
  },
  {
    id: 'precision-finish',
    label: 'Precision finish',
    shortLabel: '16 uin',
    detail: 'Precision machined finish that usually needs stable tooling, coolant control, and lighter engagement.',
    raUm: 0.4,
  },
  {
    id: 'polish-ready',
    label: 'Polish ready',
    shortLabel: '8 uin',
    detail: 'Very fine machined lay that is usually a pre-polish or high-discipline finishing target.',
    raUm: 0.2,
  },
];

export const MIN_DESIRED_RA_UM = SURFACE_FINISH_PRESETS[SURFACE_FINISH_PRESETS.length - 1].raUm;
export const MAX_DESIRED_RA_UM = SURFACE_FINISH_PRESETS[0].raUm;

export function clampDesiredRaUm(value: number) {
  return clamp(value, MIN_DESIRED_RA_UM, MAX_DESIRED_RA_UM);
}

export function desiredRaForFinishTarget(finishTarget: string) {
  switch (finishTarget) {
    case 'tight-finish':
      return 0.8;
    case 'high-removal':
      return 6.3;
    case 'prove-out':
      return 1.6;
    case 'general':
    default:
      return 3.2;
  }
}

export function recommendFinishTargetForRa(raUm: number) {
  if (raUm <= 1) return 'tight-finish';
  if (raUm >= 4.5) return 'high-removal';
  return 'general';
}

export function nearestSurfaceFinishPreset(raUm: number) {
  const target = clampDesiredRaUm(raUm);
  return SURFACE_FINISH_PRESETS.reduce((closest, preset) => {
    const currentDistance = Math.abs(preset.raUm - target);
    const closestDistance = Math.abs(closest.raUm - target);
    return currentDistance < closestDistance ? preset : closest;
  }, SURFACE_FINISH_PRESETS[0]);
}

export function formatSurfaceFinish(raUm: number, unitSystem: UnitSystem, digits = 2) {
  if (unitSystem === 'inch') {
    return `${Math.round(raUm * 39.37007874)} uin Ra`;
  }
  return `${raUm.toFixed(digits)} um Ra`;
}

export function compareSurfaceFinishToTarget(actualRaUm: number, targetRaUm: number): SurfaceFinishTargetComparison {
  if (actualRaUm <= targetRaUm * 0.85) {
    return {
      status: 'beat',
      label: 'Beating target',
      detail: 'The live result is coming in finer than the requested finish, so you still have room to trade some finish for throughput if needed.',
    };
  }
  if (actualRaUm <= targetRaUm) {
    return {
      status: 'on-target',
      label: 'On target',
      detail: 'The live result is inside the requested surface-finish target.',
    };
  }
  if (actualRaUm <= targetRaUm * 1.15) {
    return {
      status: 'close',
      label: 'Very close',
      detail: 'The live result is slightly over target; a finishing pass, lighter engagement, or a sharper tool may close the gap.',
    };
  }
  return {
    status: 'miss',
    label: 'Off target',
    detail: 'The current stack is landing noticeably rougher than requested; shift the toolpath, tooling, or coolant posture before release.',
  };
}

export function getSurfaceFinishPreview(input: SurfaceFinishPreviewInput): SurfaceFinishPreview {
  const targetRaUm = clampDesiredRaUm(input.desiredRaUm);
  const targetPreset = nearestSurfaceFinishPreset(targetRaUm);
  const toolpathTypeId = input.toolpathTypeId ?? 'general';

  let modeledRaUm = baseRaForSelection(input.machineMode, toolpathTypeId, input.toolpath?.operationId);
  modeledRaUm *= toolpathMultiplier(toolpathTypeId, input.toolpath);
  modeledRaUm *= materialMultiplier(input.material);
  modeledRaUm *= coolantMultiplier(input.coolantId, input.material);
  modeledRaUm *= toolMultiplier(input.tool, toolpathTypeId);
  modeledRaUm *= machineMultiplier(input.machine, input.machineMode, toolpathTypeId);
  modeledRaUm *= programmingMultiplier(input.programmingLabel, toolpathTypeId);
  modeledRaUm *= finishTargetMultiplier(input.finishTarget);
  modeledRaUm *= engagementMultiplier(input);
  modeledRaUm *= toolReachMultiplier(input, toolpathTypeId);
  modeledRaUm *= setupStabilityMultiplier(input.stabilityId, input.holderStyleId, toolpathTypeId, input.machineMode);
  modeledRaUm *= liveCutConditionMultiplier(input, toolpathTypeId);

  const liveEngineRaUm = normalizeLiveRa(input.actualRaUm);
  const liveCalculatedRaUm = estimateLiveCutRaUm(input, toolpathTypeId);
  const threadingPath = isThreadingSurfacePath(input.toolpathTypeId ?? 'general', input.toolpath, input.tool);
  const useLiveEngineAnchor = liveEngineRaUm != null && shouldUseLiveEngineAnchor(input, threadingPath);
  const useLiveCutModel = !threadingPath && !useLiveEngineAnchor && liveCalculatedRaUm != null;
  const expectedRaUm = roundRa(clamp(
    useLiveEngineAnchor
      ? blendLiveAnchor(modeledRaUm, liveEngineRaUm!, input, liveCalculatedRaUm)
      : useLiveCutModel
        ? blendLiveCutModel(modeledRaUm, liveCalculatedRaUm!, input, toolpathTypeId)
        : modeledRaUm,
    0.12,
    12.5,
  ));

  const band = toleranceBand(toolpathTypeId, input.toolpath, input.tool);
  const expectedMinRaUm = roundRa(clamp(expectedRaUm * band.low, 0.08, 12.5));
  const expectedMaxRaUm = roundRa(clamp(expectedRaUm * band.high, expectedMinRaUm + 0.05, 16));
  const verdict = deriveVerdict(targetRaUm, expectedMinRaUm, expectedMaxRaUm, { threadingPath });
  const requestedSurface = buildRenderStyle(targetRaUm, input, 'requested');
  const predictedSurface = buildRenderStyle(expectedRaUm, input, 'predicted');

  return {
    targetRaUm,
    targetPreset,
    mappedFinishTarget: recommendFinishTargetForRa(targetRaUm),
    expectedRaUm,
    expectedMinRaUm,
    expectedMaxRaUm,
    verdict: verdict.id,
    verdictLabel: verdict.label,
    verdictDetail: verdict.detail,
    requestedSurface,
    predictedSurface,
    textureLabel: predictedSurface.label,
    textureDetail: predictedSurface.detail,
    textureSpacingPx: predictedSurface.laySpacingPx,
    textureOpacity: predictedSurface.layOpacity,
    glossOpacity: predictedSurface.glossOpacity,
    predictionSource: useLiveEngineAnchor ? 'live-engine-anchor' : useLiveCutModel ? 'live-cut-model' : 'atlas-model',
    liveCalculatedRaUm: liveEngineRaUm ?? liveCalculatedRaUm ?? undefined,
    predictionSourceLabel: useLiveEngineAnchor
      ? 'Live engine anchored'
      : useLiveCutModel
        ? 'Live cut driven'
      : threadingPath && liveEngineRaUm != null
        ? 'Thread comparator anchored'
        : 'Atlas model only',
    predictionSourceDetail: useLiveEngineAnchor
      ? 'Predicted finish is anchored to the live speed/feed engine result, then refined with holder, stability, tool geometry, and parameter-derived finish behavior from this setup.'
      : useLiveCutModel
        ? 'Predicted finish is being derived from the live cut state on this page: chip load or feed per rev, solved RPM, cutting speed, radial engagement, and the selected tool geometry are all shaping the displayed Ra.'
      : threadingPath && liveEngineRaUm != null
        ? 'Threading preview stays on the PRISM thread comparator atlas because the live speed/feed engine still solves these paths through a generic turning contract, which can overstate smooth-surface Ra on thread flanks.'
      : 'Predicted finish is using the PRISM finish atlas model because no live speed/feed surface-finish solve is available yet.',
    drivers: buildDrivers(input, expectedMinRaUm, expectedMaxRaUm, liveEngineRaUm ?? liveCalculatedRaUm),
  };
}

function baseRaForSelection(
  machineMode: MachineMode,
  toolpathTypeId: string,
  operationId: string | undefined,
) {
  if (machineMode === 'mill') {
    switch (toolpathTypeId) {
      case 'roughing':
        return 5.4;
      case 'pocketing':
        return 3.4;
      case 'slotting':
        return 4.0;
      case 'profiling':
        return 1.8;
      case 'finishing':
        return 1.0;
      case 'surface_finish':
        return 0.65;
      case 'multiaxis':
        return 0.85;
      case 'drilling':
        return 3.2;
      default:
        if (operationId === 'face_milling') return 2.0;
        return 2.6;
    }
  }

  if (machineMode === 'lathe') {
    switch (toolpathTypeId) {
      case 'turning_rough':
        return 4.2;
      case 'turning_finish':
        return 0.9;
      case 'live_milling':
        return 1.2;
      case 'grooving':
        return 2.3;
      case 'threading':
        return 1.2;
      case 'boring':
        return 1.5;
      default:
        if (operationId === 'turning_rough') return 4.2;
        if (operationId === 'turning_finish') return 0.9;
        return 2.0;
    }
  }

  return 3.2;
}

function toolpathMultiplier(
  toolpathTypeId: string,
  toolpath: SurfaceFinishPreviewInput['toolpath'],
) {
  const signature = `${toolpath?.label ?? ''} ${toolpath?.path ?? ''}`.toLowerCase();

  switch (toolpathTypeId) {
    case 'roughing':
    case 'turning_rough':
      return 1.25;
    case 'pocketing':
      return 1.08;
    case 'slotting':
      return 1.12;
    case 'profiling':
      return 0.96;
    case 'finishing':
      return 0.8;
    case 'surface_finish':
      return 0.7;
    case 'multiaxis':
      return /swarf|simultaneous|5-axis|5x/i.test(signature) ? 0.68 : 0.78;
    case 'live_milling':
      if (/drill|bore/.test(signature)) return 1.06;
      if (/finish|profile|contour/.test(signature)) return 0.9;
      return 0.98;
    case 'turning_finish':
      return 0.76;
    case 'boring':
      return 0.92;
    case 'threading':
      return 0.88;
    case 'grooving':
      return 1.05;
    default:
      return 1;
  }
}

function materialMultiplier(material: SurfaceFinishPreviewInput['material']) {
  if (!material) return 1;

  let multiplier = 1;
  switch (material.group) {
    case 'tool_steel':
      multiplier *= 1.2;
      break;
    case 'stainless':
      multiplier *= 1.14;
      break;
    case 'steel':
      multiplier *= 1;
      break;
    case 'aluminum':
      multiplier *= 0.82;
      break;
    case 'cast':
      multiplier *= 1.08;
      break;
    default:
      multiplier *= 1;
      break;
  }

  switch (material.id) {
    case 'h13':
    case 'd2':
      multiplier *= 1.14;
      break;
    case 'a2':
    case 's7':
    case 'o2':
    case '52100':
      multiplier *= 1.1;
      break;
    case '4140-ph':
    case '17-4ph':
      multiplier *= 1.06;
      break;
    case '304':
    case '316':
      multiplier *= 1.08;
      break;
    case '1018':
    case '1020':
    case '12l14':
      multiplier *= 0.88;
      break;
    default:
      break;
  }

  if (/hrc/i.test(material.hardness)) {
    multiplier *= 1.04;
  }

  if (material.baseSfm >= 350) multiplier *= 0.92;
  if (material.baseSfm <= 160) multiplier *= 1.08;

  return multiplier;
}

function coolantMultiplier(coolantId: string, material: SurfaceFinishPreviewInput['material']) {
  const ideal = material?.idealCoolant.toLowerCase() ?? '';

  switch (coolantId) {
    case 'tsc':
      return ideal.includes('tsc') || ideal.includes('through') ? 0.88 : 0.93;
    case 'through_air':
      return ideal.includes('through air') ? 0.97 : ideal.includes('air') ? 1 : 1.08;
    case 'flood':
      return ideal.includes('flood') ? 0.95 : 1;
    case 'mist':
      return ideal.includes('mist') ? 0.97 : 1.1;
    case 'air':
      return ideal.includes('air') ? 0.98 : 1.12;
    case 'dielectric':
      return 0.96;
    default:
      return 1;
  }
}

function toolMultiplier(tool: SurfaceFinishPreviewInput['tool'], toolpathTypeId: string) {
  if (!tool) return 1;

  const signature = `${tool.family} ${tool.label} ${tool.description} ${tool.coating} ${tool.geometryClass ?? ''} ${tool.edgePrep ?? ''}`.toLowerCase();
  let multiplier = 1;

  if (/finish|ball|boring|vnmg|wiper/i.test(signature)) multiplier *= 0.84;
  if (/rough|face mill|cnmg|groov|thread/i.test(signature)) multiplier *= 1.08;
  if (/live tool/i.test(signature) && toolpathTypeId === 'turning_finish') multiplier *= 1.03;
  if (/shrink-fit|hydraulic/i.test(signature)) multiplier *= 0.96;
  if (/alcrn|naco|tib2|pvd/i.test(signature)) multiplier *= 0.97;

  if (tool.geometryClass === 'face-mill' && tool.wiperGeometry) multiplier *= 0.92;
  if (tool.geometryClass === 'variable-helix-endmill') multiplier *= 0.96;
  if (tool.geometryClass === 'ball-endmill' && (toolpathTypeId === 'surface_finish' || toolpathTypeId === 'multiaxis')) multiplier *= 0.88;
  if (tool.geometryClass === 'finishing-insert') multiplier *= 0.9;
  if (tool.geometryClass === 'roughing-insert') multiplier *= 1.08;
  if (tool.geometryClass === 'grooving-insert') multiplier *= 1.06;
  if (tool.edgePrep === 'wiper') multiplier *= toolpathTypeId === 'turning_finish' || toolpathTypeId === 'finishing' ? 0.9 : 0.96;
  if (tool.edgePrep === 'sharp') multiplier *= 0.97;
  if (tool.edgePrep === 'reinforced') multiplier *= 1.04;
  if (tool.edgePrep === 'honed') multiplier *= 1.03;
  if (tool.noseRadiusMm && toolpathTypeId === 'turning_finish') {
    multiplier *= tool.noseRadiusMm >= 0.4 ? 0.94 : 1.02;
  }
  if (tool.cornerRadiusMm && (toolpathTypeId === 'finishing' || toolpathTypeId === 'surface_finish')) {
    multiplier *= tool.cornerRadiusMm <= 0.4 ? 0.97 : 1;
  }
  if (tool.helixAngleDeg && tool.geometryClass === 'variable-helix-endmill') {
    multiplier *= tool.helixAngleDeg >= 40 ? 0.97 : 1;
  }

  return multiplier;
}

function setupStabilityMultiplier(
  stabilityId: string | undefined,
  holderStyleId: string | undefined,
  toolpathTypeId: string,
  machineMode: MachineMode,
) {
  let multiplier = 1;

  switch (stabilityId) {
    case 'detail-control':
      multiplier *= toolpathTypeId === 'surface_finish' || toolpathTypeId === 'finishing' || toolpathTypeId === 'turning_finish' ? 0.9 : 0.96;
      break;
    case 'index-ready':
      multiplier *= toolpathTypeId === 'multiaxis' ? 0.92 : 0.97;
      break;
    case 'swiss-support':
      multiplier *= machineMode === 'lathe' ? 0.95 : 1;
      break;
    case 'aggressive-rigid':
      multiplier *= toolpathTypeId === 'roughing' || toolpathTypeId === 'turning_rough' ? 0.95 : 0.99;
      break;
    default:
      break;
  }

  switch (holderStyleId) {
    case 'shrink-fit':
      multiplier *= toolpathTypeId === 'surface_finish' || toolpathTypeId === 'finishing' ? 0.94 : 0.97;
      break;
    case 'hydraulic':
      multiplier *= toolpathTypeId === 'surface_finish' || toolpathTypeId === 'finishing' ? 0.95 : 0.98;
      break;
    case 'live-tooling':
      multiplier *= toolpathTypeId === 'turning_finish' ? 1.02 : 1;
      break;
    case 'quality-head':
    case 'precision-nozzle':
    case 'taper-package':
      multiplier *= 0.96;
      break;
    default:
      break;
  }

  return multiplier;
}

function liveCutConditionMultiplier(input: SurfaceFinishPreviewInput, toolpathTypeId: string) {
  let multiplier = 1;

  if (input.machineMode === 'mill' && input.actualFeedPerToothMm && input.toolDiameterMm > 0) {
    const chipRatio = input.actualFeedPerToothMm / input.toolDiameterMm;
    if (toolpathTypeId === 'surface_finish' || toolpathTypeId === 'finishing' || toolpathTypeId === 'multiaxis') {
      if (chipRatio <= 0.003) multiplier *= 0.9;
      else if (chipRatio >= 0.008) multiplier *= 1.14;
      else if (chipRatio >= 0.006) multiplier *= 1.08;
    } else if (toolpathTypeId === 'roughing' || toolpathTypeId === 'turning_rough') {
      if (chipRatio >= 0.01) multiplier *= 1.04;
    }
  }

  if (
    input.machineMode === 'lathe' &&
    input.actualFeedRateMmPerMin &&
    input.actualRpm &&
    input.actualRpm > 0 &&
    (toolpathTypeId === 'turning_finish' || toolpathTypeId === 'boring')
  ) {
    const feedPerRev = input.actualFeedRateMmPerMin / input.actualRpm;
    if (feedPerRev <= 0.08) multiplier *= 0.9;
    else if (feedPerRev >= 0.22) multiplier *= 1.18;
    else if (feedPerRev >= 0.16) multiplier *= 1.08;
    if (input.tool?.wiperGeometry && feedPerRev <= 0.18) multiplier *= 0.94;
  }

  return multiplier;
}

function estimateLiveCutRaUm(input: SurfaceFinishPreviewInput, toolpathTypeId: string) {
  if (!hasLiveCutState(input)) {
    return null;
  }
  if (input.machineMode === 'lathe') {
    return estimateLatheLiveCutRaUm(input, toolpathTypeId);
  }
  if (input.machineMode === 'mill') {
    return estimateMillLiveCutRaUm(input, toolpathTypeId);
  }
  return null;
}

function estimateMillLiveCutRaUm(input: SurfaceFinishPreviewInput, toolpathTypeId: string) {
  const feedPerToothMm = deriveFeedPerToothMm(input);
  const effectiveEdgeRadiusMm = resolveEffectiveEdgeRadiusMm(input);
  const actualRadialMm = Math.max(input.actualRadialDepthMm ?? input.wocMm, 0);
  const candidates: number[] = [];

  if (feedPerToothMm && effectiveEdgeRadiusMm) {
    let toothMarkRaUm = ((feedPerToothMm ** 2) * 1000) / (32 * Math.max(effectiveEdgeRadiusMm, 0.05));
    if (input.tool?.wiperGeometry) {
      toothMarkRaUm *= toolpathTypeId === 'roughing' || toolpathTypeId === 'slotting' ? 0.9 : 0.76;
    }
    if (toolpathTypeId === 'surface_finish' || toolpathTypeId === 'finishing' || toolpathTypeId === 'multiaxis') {
      toothMarkRaUm *= 0.92;
    }
    if (toolpathTypeId === 'roughing' || toolpathTypeId === 'slotting') {
      toothMarkRaUm *= 1.14;
    }
    candidates.push(toothMarkRaUm);
  }

  if (
    actualRadialMm > 0
    && (toolpathTypeId === 'surface_finish' || toolpathTypeId === 'multiaxis' || toolpathTypeId === 'finishing')
  ) {
    const sweepRadiusMm = resolveEffectiveSweepRadiusMm(input, effectiveEdgeRadiusMm);
    const cuspHeightMm = (actualRadialMm ** 2) / (8 * Math.max(sweepRadiusMm, 0.1));
    let cuspRaUm = cuspHeightMm * 1000 * (input.tool?.geometryClass === 'ball-endmill' ? 0.32 : 0.38);
    if (toolpathTypeId === 'multiaxis') cuspRaUm *= 0.95;
    candidates.push(cuspRaUm);
  }

  if (!candidates.length) {
    return null;
  }

  let estimateRaUm =
    candidates.length > 1
      ? Math.sqrt(candidates.reduce((sum, value) => sum + value ** 2, 0))
      : candidates[0];

  estimateRaUm *= liveCutSpeedMultiplier(input);
  estimateRaUm *= liveCutAggressionMultiplier(input, toolpathTypeId);
  estimateRaUm *= liveCutGeometryMultiplier(input, toolpathTypeId);

  return roundRa(clamp(estimateRaUm, 0.08, 16));
}

function hasLiveCutState(input: SurfaceFinishPreviewInput) {
  return (
    (input.actualFeedPerToothMm != null && input.actualFeedPerToothMm > 0)
    || (input.actualFeedRateMmPerMin != null && input.actualFeedRateMmPerMin > 0)
    || (input.actualRpm != null && input.actualRpm > 0)
    || (input.actualCuttingSpeedMpm != null && input.actualCuttingSpeedMpm > 0)
    || (input.actualAxialDepthMm != null && input.actualAxialDepthMm > 0)
    || (input.actualRadialDepthMm != null && input.actualRadialDepthMm > 0)
  );
}

function estimateLatheLiveCutRaUm(input: SurfaceFinishPreviewInput, toolpathTypeId: string) {
  const feedPerRevMm = deriveFeedPerRevMm(input);
  const effectiveEdgeRadiusMm = resolveEffectiveEdgeRadiusMm(input) ?? 0.4;
  if (!feedPerRevMm || effectiveEdgeRadiusMm <= 0) {
    return null;
  }

  let estimateRaUm = ((feedPerRevMm ** 2) * 1000) / (32 * Math.max(effectiveEdgeRadiusMm, 0.05));
  if (input.tool?.wiperGeometry && feedPerRevMm <= 0.2) {
    estimateRaUm *= 0.72;
  }
  if (toolpathTypeId === 'turning_rough' || toolpathTypeId === 'grooving') {
    estimateRaUm *= 1.15;
  } else if (toolpathTypeId === 'boring') {
    estimateRaUm *= 0.96;
  } else if (toolpathTypeId === 'threading') {
    estimateRaUm *= 1.04;
  }

  estimateRaUm *= liveCutSpeedMultiplier(input);
  estimateRaUm *= liveCutAggressionMultiplier(input, toolpathTypeId);
  estimateRaUm *= liveCutGeometryMultiplier(input, toolpathTypeId);

  return roundRa(clamp(estimateRaUm, 0.08, 16));
}

function deriveFeedPerToothMm(input: SurfaceFinishPreviewInput) {
  if (input.actualFeedPerToothMm && input.actualFeedPerToothMm > 0) {
    return input.actualFeedPerToothMm;
  }
  const fluteCount = input.toolFluteCount ?? input.tool?.defaultFlutes;
  if (
    input.machineMode !== 'mill'
    || !input.actualFeedRateMmPerMin
    || !input.actualRpm
    || input.actualRpm <= 0
    || !fluteCount
    || fluteCount <= 0
  ) {
    return null;
  }
  return input.actualFeedRateMmPerMin / (input.actualRpm * fluteCount);
}

function deriveFeedPerRevMm(input: SurfaceFinishPreviewInput) {
  if (
    input.machineMode !== 'lathe'
    || !input.actualFeedRateMmPerMin
    || !input.actualRpm
    || input.actualRpm <= 0
  ) {
    return null;
  }
  return input.actualFeedRateMmPerMin / input.actualRpm;
}

function resolveEffectiveEdgeRadiusMm(input: SurfaceFinishPreviewInput) {
  if (input.tool?.noseRadiusMm && input.tool.noseRadiusMm > 0) return input.tool.noseRadiusMm;
  if (input.tool?.cornerRadiusMm && input.tool.cornerRadiusMm > 0) return input.tool.cornerRadiusMm;
  if (input.tool?.geometryClass === 'ball-endmill') return Math.max(input.toolDiameterMm / 2, 0.2);
  if (input.tool?.geometryClass === 'face-mill') return Math.max(input.toolDiameterMm * 0.06, 0.8);
  if (input.tool?.geometryClass === 'finishing-insert') return 0.8;
  if (input.tool?.geometryClass === 'roughing-insert') return 0.4;
  return input.machineMode === 'lathe' ? 0.4 : Math.max(input.toolDiameterMm * 0.02, 0.2);
}

function resolveEffectiveSweepRadiusMm(
  input: SurfaceFinishPreviewInput,
  effectiveEdgeRadiusMm: number | null,
) {
  if (input.tool?.geometryClass === 'ball-endmill') {
    return Math.max(input.toolDiameterMm / 2, effectiveEdgeRadiusMm ?? 0.2, 0.2);
  }
  if (input.tool?.geometryClass === 'face-mill') {
    return Math.max(input.toolDiameterMm * 0.18, effectiveEdgeRadiusMm ?? 0.8, 0.6);
  }
  return Math.max((effectiveEdgeRadiusMm ?? 0.2) * 2.4, input.toolDiameterMm * 0.12, 0.2);
}

function liveCutSpeedMultiplier(input: SurfaceFinishPreviewInput) {
  const actualCuttingSpeedMpm =
    input.actualCuttingSpeedMpm && input.actualCuttingSpeedMpm > 0
      ? input.actualCuttingSpeedMpm
      : input.machineMode === 'mill' && input.actualRpm && input.actualRpm > 0 && input.toolDiameterMm > 0
        ? (Math.PI * input.toolDiameterMm * input.actualRpm) / 1000
        : null;
  const baseCuttingSpeedMpm = input.material?.baseSfm ? input.material.baseSfm * 0.3048 : null;
  if (!actualCuttingSpeedMpm || !baseCuttingSpeedMpm || baseCuttingSpeedMpm <= 0) {
    return 1;
  }
  const speedRatio = actualCuttingSpeedMpm / baseCuttingSpeedMpm;
  if (speedRatio <= 0.55) return 1.14;
  if (speedRatio <= 0.75) return 1.08;
  if (speedRatio >= 1.45) return 1.06;
  if (speedRatio >= 1.2) return 1.02;
  return 0.97;
}

function liveCutAggressionMultiplier(input: SurfaceFinishPreviewInput, toolpathTypeId: string) {
  const diameter = Math.max(input.toolDiameterMm, 0.1);
  const actualAxialMm = Math.max(input.actualAxialDepthMm ?? input.docMm, 0);
  const actualRadialMm = Math.max(input.actualRadialDepthMm ?? input.wocMm, 0);
  const axialRatio = actualAxialMm / diameter;
  const radialRatio = actualRadialMm / diameter;
  const finishingPriority =
    toolpathTypeId === 'surface_finish'
    || toolpathTypeId === 'multiaxis'
    || toolpathTypeId === 'finishing'
    || toolpathTypeId === 'turning_finish'
    || toolpathTypeId === 'boring';

  let multiplier = 1;
  if (finishingPriority) {
    if (radialRatio <= 0.08) multiplier *= 0.92;
    else if (radialRatio >= 0.35) multiplier *= 1.12;
    else if (radialRatio >= 0.22) multiplier *= 1.05;
    if (axialRatio <= 0.08) multiplier *= 0.96;
    else if (axialRatio >= 0.75) multiplier *= 1.08;
  } else {
    if (radialRatio >= 0.55) multiplier *= 1.06;
    if (axialRatio >= 1) multiplier *= 1.04;
  }
  return multiplier;
}

function liveCutGeometryMultiplier(input: SurfaceFinishPreviewInput, toolpathTypeId: string) {
  let multiplier = 1;
  const finishingPriority =
    toolpathTypeId === 'surface_finish'
    || toolpathTypeId === 'multiaxis'
    || toolpathTypeId === 'finishing'
    || toolpathTypeId === 'turning_finish'
    || toolpathTypeId === 'boring';

  if (input.tool?.edgePrep === 'sharp') multiplier *= 0.97;
  if (input.tool?.edgePrep === 'honed') multiplier *= 1.03;
  if (input.tool?.edgePrep === 'reinforced') multiplier *= 1.05;
  if (input.holderStyleId === 'shrink-fit' && finishingPriority) multiplier *= 0.97;
  if (input.holderStyleId === 'hydraulic' && finishingPriority) multiplier *= 0.98;
  if (input.stabilityId === 'detail-control') multiplier *= 0.95;
  return multiplier;
}

function normalizeLiveRa(value: number | undefined) {
  return value != null && Number.isFinite(value) ? clamp(value, 0.08, 16) : null;
}

function blendLiveAnchor(
  modeledRaUm: number,
  liveEngineRaUm: number,
  input: SurfaceFinishPreviewInput,
  liveCalculatedRaUm?: number | null,
) {
  const supportingLiveRaUm =
    liveCalculatedRaUm != null && liveCalculatedRaUm <= liveEngineRaUm * 2.25
      ? liveCalculatedRaUm
      : liveEngineRaUm;
  let blended =
    liveCalculatedRaUm != null
      ? modeledRaUm * 0.24 + supportingLiveRaUm * 0.12 + liveEngineRaUm * 0.64
      : modeledRaUm * 0.34 + liveEngineRaUm * 0.66;

  if (input.tool?.wiperGeometry && (input.toolpathTypeId === 'turning_finish' || input.toolpathTypeId === 'finishing')) {
    blended *= 0.96;
  }
  if (input.holderStyleId === 'shrink-fit' && (input.toolpathTypeId === 'surface_finish' || input.toolpathTypeId === 'finishing')) {
    blended *= 0.97;
  }
  if (input.stabilityId === 'detail-control') {
    blended *= 0.96;
  }

  return blended;
}

function blendLiveCutModel(
  modeledRaUm: number,
  liveCalculatedRaUm: number,
  input: SurfaceFinishPreviewInput,
  toolpathTypeId: string,
) {
  const finishingPriority =
    toolpathTypeId === 'surface_finish'
    || toolpathTypeId === 'multiaxis'
    || toolpathTypeId === 'finishing'
    || toolpathTypeId === 'turning_finish'
    || toolpathTypeId === 'boring';

  let blended = finishingPriority
    ? modeledRaUm * 0.36 + liveCalculatedRaUm * 0.64
    : modeledRaUm * 0.45 + liveCalculatedRaUm * 0.55;

  if (input.tool?.wiperGeometry) {
    blended *= finishingPriority ? 0.97 : 0.99;
  }
  if (input.stabilityId === 'detail-control') {
    blended *= 0.97;
  }
  return blended;
}

function machineMultiplier(
  machine: SurfaceFinishPreviewInput['machine'],
  machineMode: MachineMode,
  toolpathTypeId: string,
) {
  if (!machine) return 1;

  let multiplier = 1;
  const typeId = machine.machineTypeId.toLowerCase();

  if (machineMode === 'mill') {
    if (toolpathTypeId === 'multiaxis' && /_5\b/.test(typeId)) multiplier *= 0.88;
    if (toolpathTypeId === 'roughing' && typeId.includes('horizontal')) multiplier *= 0.92;
    if ((toolpathTypeId === 'surface_finish' || toolpathTypeId === 'finishing') && machine.spindleRpm >= 12000) multiplier *= 0.9;
    if ((toolpathTypeId === 'surface_finish' || toolpathTypeId === 'finishing') && machine.spindleRpm <= 4000) multiplier *= 1.08;
  }

  if (machineMode === 'lathe') {
    if (toolpathTypeId === 'turning_finish' && machine.toolingLayout?.liveTooling) multiplier *= 0.97;
    if (toolpathTypeId === 'live_milling' && machine.toolingLayout?.liveTooling) multiplier *= 0.96;
    if (toolpathTypeId === 'turning_rough' && typeId.includes('vtl')) multiplier *= 1.04;
  }

  return multiplier;
}

function programmingMultiplier(programmingLabel: string | undefined, toolpathTypeId: string) {
  if (!programmingLabel) return 1;

  const signature = programmingLabel.toLowerCase();
  if (/(prism|hypermill|mastercam|powermill|fusion 360|esprit)/i.test(signature)) {
    return toolpathTypeId === 'surface_finish' || toolpathTypeId === 'multiaxis' || toolpathTypeId === 'turning_finish' || toolpathTypeId === 'live_milling'
      ? 0.96
      : 1;
  }
  if (/(basic|conversational|manual)/i.test(signature)) {
    return toolpathTypeId === 'surface_finish' || toolpathTypeId === 'multiaxis' || toolpathTypeId === 'turning_finish' || toolpathTypeId === 'live_milling'
      ? 1.05
      : 1.01;
  }
  return 1;
}

function finishTargetMultiplier(finishTarget: string) {
  switch (finishTarget) {
    case 'tight-finish':
      return 0.84;
    case 'high-removal':
      return 1.2;
    case 'prove-out':
      return 1.05;
    case 'general':
    default:
      return 1;
  }
}

function engagementMultiplier(input: SurfaceFinishPreviewInput) {
  const defaults = input.defaults;
  if (!defaults) return 1;

  const defaultDoc = defaults.isAbsolute ? defaults.docMm : defaults.docMm * Math.max(input.toolDiameterMm, 0.1);
  const defaultWoc = defaults.isAbsolute ? defaults.wocMm : defaults.wocMm * Math.max(input.toolDiameterMm, 0.1);
  const docRatio = defaultDoc > 0 ? input.docMm / defaultDoc : 1;
  const wocRatio = defaultWoc > 0 ? input.wocMm / defaultWoc : 1;
  const aggression = (docRatio + wocRatio) / 2;

  if (aggression >= 1.15) {
    return 1 + Math.min((aggression - 1) * 0.18, 0.28);
  }
  if (aggression <= 0.85) {
    return 1 - Math.min((1 - aggression) * 0.14, 0.16);
  }
  return 1;
}

function toolReachMultiplier(input: SurfaceFinishPreviewInput, toolpathTypeId: string) {
  const diameter = Math.max(input.toolDiameterMm, 0.1);
  const stickoutRatio = ratioOrZero(input.toolStickoutMm, diameter);
  const fluteCoverage = ratioOrZero(input.docMm, input.fluteLengthMm);
  const finishingPriority = toolpathTypeId === 'surface_finish' || toolpathTypeId === 'multiaxis' || toolpathTypeId === 'turning_finish' || toolpathTypeId === 'live_milling';

  let multiplier = 1;

  if (stickoutRatio >= 8) multiplier *= 1.3;
  else if (stickoutRatio >= 6) multiplier *= 1.18;
  else if (stickoutRatio >= 4.8) multiplier *= 1.08;
  else if (stickoutRatio > 0 && stickoutRatio <= 3.1) multiplier *= finishingPriority ? 0.93 : 0.97;

  if (fluteCoverage >= 1.02) multiplier *= 1.22;
  else if (fluteCoverage >= 0.86) multiplier *= 1.12;
  else if (fluteCoverage > 0 && fluteCoverage <= 0.56) multiplier *= finishingPriority ? 0.92 : 0.97;

  return multiplier;
}

function isThreadingSurfacePath(
  toolpathTypeId: string,
  toolpath: SurfaceFinishPreviewInput['toolpath'],
  tool: SurfaceFinishPreviewInput['tool'],
) {
  const signature = `${toolpathTypeId} ${toolpath?.operationId ?? ''} ${toolpath?.label ?? ''} ${toolpath?.path ?? ''} ${tool?.geometryClass ?? ''} ${tool?.label ?? ''}`.toLowerCase();
  return toolpathTypeId === 'threading' || /thread/.test(signature);
}

function shouldUseLiveEngineAnchor(input: SurfaceFinishPreviewInput, threadingPath: boolean) {
  if (threadingPath) return false;
  return normalizeLiveRa(input.actualRaUm) != null;
}

function toleranceBand(
  toolpathTypeId: string,
  toolpath?: SurfaceFinishPreviewInput['toolpath'],
  tool?: SurfaceFinishPreviewInput['tool'],
) {
  if (isThreadingSurfacePath(toolpathTypeId, toolpath, tool)) {
    return { low: 0.72, high: 1.46 };
  }
  switch (toolpathTypeId) {
    case 'roughing':
    case 'turning_rough':
      return { low: 0.88, high: 1.42 };
    case 'surface_finish':
    case 'multiaxis':
    case 'turning_finish':
    case 'live_milling':
      return { low: 0.8, high: 1.2 };
    default:
      return { low: 0.84, high: 1.28 };
  }
}

function deriveVerdict(
  targetRaUm: number,
  expectedMinRaUm: number,
  expectedMaxRaUm: number,
  options?: { threadingPath?: boolean },
) {
  if (options?.threadingPath) {
    if (targetRaUm >= expectedMaxRaUm * 1.2) {
      return {
        id: 'margin' as const,
        label: 'Thread finish margin available',
        detail: 'For this thread form, the current stack is likely to beat the requested flank finish, so you can usually bias harder toward cycle time or insert life if the print allows it.',
      };
    }
    if (targetRaUm >= expectedMinRaUm * 0.96) {
      return {
        id: 'ready' as const,
        label: 'Current thread stack should hold it',
        detail: 'Threading is being judged against the thread comparator atlas instead of a smooth turned sleeve. The current machine, insert, coolant, and pass posture look credible for this flank finish.',
      };
    }
    if (targetRaUm >= expectedMinRaUm * 0.62) {
      return {
        id: 'stretch' as const,
        label: 'Possible with thread discipline',
        detail: 'The requested thread flank finish is finer than this setup naturally wants to make, but it still looks attainable with sharp insert geometry, disciplined pass scheduling, and stable pullout behavior.',
      };
    }
    return {
      id: 'unlikely' as const,
      label: 'Too fine for this thread stack',
      detail: 'This target is asking a thread form to behave more like a polished sealing surface. Reduce the finish ask or move to a sharper insert, cleaner coolant posture, and a lighter thread strategy.',
    };
  }

  if (targetRaUm >= expectedMaxRaUm * 1.18) {
    return {
      id: 'margin' as const,
      label: 'More finish than requested',
      detail: 'The current stack is likely to beat the requested finish, so you can usually bias harder toward cycle time if the print allows it.',
    };
  }
  if (targetRaUm >= expectedMinRaUm) {
    return {
      id: 'ready' as const,
      label: 'Current stack should hit it',
      detail: 'Material, machine, coolant, toolpath, and tooling are aligned closely enough that the target looks realistic without heroic adjustments.',
    };
  }
  if (targetRaUm >= expectedMinRaUm * 0.78) {
    return {
      id: 'stretch' as const,
      label: 'Possible, but disciplined',
      detail: 'You are asking for a finer finish than this setup naturally wants to make. Lighter engagement, sharper tooling, and tighter coolant control matter here.',
    };
  }
  return {
    id: 'unlikely' as const,
    label: 'Current stack is too rough',
    detail: 'This target is finer than the selected toolpath and tooling stack usually support. Switch to a finishing path, lighter engagement, or a better finishing tool before release.',
  };
}

function buildRenderStyle(
  surfaceRaUm: number,
  input: SurfaceFinishPreviewInput,
  mode: 'requested' | 'predicted',
): SurfaceFinishRenderStyle {
  const texture = describeTexture(surfaceRaUm);
  const materialCharacter = characterizeMaterial(input.material);
  const palette = materialCharacter.palette;
  const processArchetype = classifyProcessArchetype(input, mode);
  const bandProfile = describeFinishBand(surfaceRaUm);
  const roughnessRatio = normalizeRoughness(surfaceRaUm);
  const layAngleDeg = processArchetype.layAngleDeg;
  const secondaryAngleDeg = processArchetype.secondaryAngleDeg;
  const cleanlinessBoost = coolantCleanlinessBoost(input.coolantId, input.material?.idealCoolant);
  const requestedBias = mode === 'requested' ? -0.08 : 0;
  const toolpathInterrupt = toolpathInterruptBoost(input.toolpathTypeId ?? 'general');
  const laySpacingPx = clamp(
    Math.round(2 + roughnessRatio * 11 + processArchetype.layBias * 1.5),
    processArchetype.layFamily === 'scallop' ? 4 : 2,
    16,
  );
  const layThicknessPx = Number((0.8 + roughnessRatio * 1.6 + processArchetype.interruptionBias * 0.25).toFixed(1));
  const glossOpacity = roundVisual(
    clamp(
      0.54
        + materialCharacter.reflectivity
        + bandProfile.reflectivityBoost
        - roughnessRatio * 0.28
        + cleanlinessBoost
        + requestedBias / 2,
      0.14,
      0.78,
    ),
  );
  const hazeOpacity = roundVisual(
    clamp(
      0.08
        + roughnessRatio * 0.18
        + bandProfile.hazeBias
        + materialCharacter.hazeBias
        - cleanlinessBoost / 2,
      0.03,
      0.34,
    ),
  );
  const pitOpacity = roundVisual(
    clamp(
      0.015
        + roughnessRatio * 0.09
        + (toolpathInterrupt + processArchetype.interruptionBias) * 0.035
        + bandProfile.chatterBias * 0.02,
      0.01,
      0.18,
    ),
  );
  const microFacetOpacity = roundVisual(
    clamp(
      0.04
        + materialCharacter.microFacetBias
        + bandProfile.reflectivityBoost * 0.25
        + cleanlinessBoost / 2
        - roughnessRatio * 0.03,
      0.03,
      0.18,
    ),
  );
  const chatterOpacity = roundVisual(
    clamp(
      0.04
        + bandProfile.chatterBias
        + toolpathInterrupt * 0.06
        + processArchetype.interruptionBias * 0.04
        + requestedBias / 3,
      0.02,
      0.24,
    ),
  );

  return {
    label: texture.label,
    detail: texture.detail,
    accentLabel: mode === 'requested' ? 'Requested finish' : 'Predicted finish with current stack',
    processFamilyLabel: processArchetype.label,
    processFamilyDetail: processArchetype.detail,
    referenceBasisLabel: processArchetype.referenceBasisLabel,
    referenceBasisDetail: `${processArchetype.referenceBasisDetail} ${bandProfile.referenceDetail}`,
    materialResponseLabel: materialCharacter.label,
    materialResponseDetail: materialCharacter.detail,
    layFamily: processArchetype.layFamily,
    baseStart: palette.start,
    baseMid: palette.mid,
    baseEnd: palette.end,
    layAngleDeg,
    laySpacingPx,
    layThicknessPx,
    layOpacity: roundVisual(
      clamp(0.11 + roughnessRatio * 0.2 + processArchetype.layBias * 0.04 + requestedBias, 0.08, 0.44),
    ),
    secondaryAngleDeg,
    secondarySpacingPx: clamp(Math.round(6 + roughnessRatio * 10 + processArchetype.layBias * 2), 5, 18),
    secondaryOpacity: roundVisual(
      clamp((toolpathInterrupt * 0.08) + roughnessRatio * 0.08 + processArchetype.interruptionBias * 0.03 + requestedBias / 2, 0.04, 0.24),
    ),
    glossOpacity,
    hazeOpacity,
    pitOpacity,
    pitSizePx: clamp(Math.round(4 + roughnessRatio * 9 + processArchetype.interruptionBias * 2), 4, 15),
    highlightAngleDeg: processArchetype.highlightAngleDeg,
    highlightOpacity: roundVisual(clamp(glossOpacity + 0.08 + bandProfile.reflectivityBoost * 0.12, 0.16, 0.82)),
    highlightSpreadPct: clamp(Math.round(12 + (1 - roughnessRatio) * 22 + materialCharacter.reflectivity * 12), 10, 36),
    shimmerOpacity: roundVisual(clamp(glossOpacity * 0.42 + materialCharacter.reflectivity * 0.12, 0.08, 0.34)),
    shimmerSizePx: clamp(Math.round(14 + (1 - roughnessRatio) * 18), 12, 34),
    microFacetOpacity,
    microFacetSizePx: clamp(Math.round(10 + (1 - roughnessRatio) * 18), 10, 28),
    chatterOpacity,
    chatterSpacingPx: clamp(Math.round(8 + roughnessRatio * 12 + bandProfile.chatterBias * 8), 8, 24),
    smearOpacity: roundVisual(
      clamp(0.04 + materialCharacter.smearBias + (1 - roughnessRatio) * 0.04 + requestedBias / 4, 0.03, 0.18),
    ),
    edgeShadowOpacity: roundVisual(clamp(0.18 + roughnessRatio * 0.18 + processArchetype.interruptionBias * 0.05, 0.12, 0.4)),
    imagingPromptSeed: buildImagingPromptSeed(processArchetype, materialCharacter, surfaceRaUm, mode),
  };
}

function describeTexture(surfaceRaUm: number) {
  if (surfaceRaUm <= 0.2) {
    return {
      label: 'Near-polish lay',
      detail: 'Almost mirror-like sheen with only a faint directional machining signature left in the surface.',
    };
  }
  if (surfaceRaUm <= 0.4) {
    return {
      label: 'Precision blended lay',
      detail: 'Very tight, even lay with high reflectivity and barely visible feed marks.',
    };
  }
  if (surfaceRaUm <= 0.8) {
    return {
      label: 'Fine machined sheen',
      detail: 'Fine, close-spaced lay with a clear reflected band and disciplined tool marks.',
    };
  }
  if (surfaceRaUm <= 1.6) {
    return {
      label: 'Smooth machined lay',
      detail: 'Visible directional machining marks, but still controlled enough for tighter functional surfaces.',
    };
  }
  if (surfaceRaUm <= 3.2) {
    return {
      label: 'General production lay',
      detail: 'Standard machined finish with a visible lay pattern and moderate reflectivity.',
    };
  }
  return {
    label: 'Rough production lay',
    detail: 'Heavy lay, wider feed marks, and a duller surface more typical of removal-first cuts.',
  };
}

function characterizeMaterial(material: SurfaceFinishPreviewInput['material']): SurfaceFinishMaterialCharacter {
  switch (material?.group) {
    case 'stainless':
      return {
        label: 'Cool reflective stainless',
        detail: 'Stainless keeps a cooler, brighter specular band but can haze if the edge or coolant control falls off.',
        palette: { start: '#d7e2ec', mid: '#889cb2', end: '#27384c' },
        reflectivity: 0.12,
        smearBias: 0.05,
        hazeBias: 0.03,
        microFacetBias: 0.05,
      };
    case 'tool_steel':
      return {
        label: 'Dense blue-grey tool steel',
        detail: 'Tool steels stay darker and denser, with cleaner mirror bands only when the process is disciplined.',
        palette: { start: '#c0cad5', mid: '#607084', end: '#1a2735' },
        reflectivity: 0.03,
        smearBias: 0.01,
        hazeBias: 0.02,
        microFacetBias: 0.03,
      };
    case 'steel':
      return {
        label: 'Neutral production steel',
        detail: 'Plain and alloy steels carry a familiar silver-blue lay with moderate sheen and visible feed signature.',
        palette: { start: '#bcc6d1', mid: '#66778a', end: '#1d2b3a' },
        reflectivity: 0.06,
        smearBias: 0.02,
        hazeBias: 0.01,
        microFacetBias: 0.03,
      };
    case 'aluminum':
      return {
        label: 'Bright aluminum sheen',
        detail: 'Aluminum can look very bright and lively, but smear and drag become obvious when the chip evacuation is poor.',
        palette: { start: '#e6eef6', mid: '#9db2c7', end: '#365069' },
        reflectivity: 0.16,
        smearBias: 0.08,
        hazeBias: -0.01,
        microFacetBias: 0.06,
      };
    case 'cast':
      return {
        label: 'Muted porous cast surface',
        detail: 'Cast materials stay flatter and darker with less specular pop and more granular breakup.',
        palette: { start: '#a4acb7', mid: '#5e6671', end: '#1d2128' },
        reflectivity: -0.02,
        smearBias: 0,
        hazeBias: 0.05,
        microFacetBias: 0.02,
      };
    default:
      return {
        label: 'Neutral metallic response',
        detail: 'A balanced metallic tone used when the exact material behavior has not been dialed in yet.',
        palette: { start: '#c8d0db', mid: '#6f8094', end: '#223244' },
        reflectivity: 0.04,
        smearBias: 0.02,
        hazeBias: 0.01,
        microFacetBias: 0.03,
      };
  }
}

function classifyProcessArchetype(
  input: SurfaceFinishPreviewInput,
  mode: 'requested' | 'predicted',
): SurfaceFinishProcessArchetype {
  const requestedOffset = mode === 'requested' ? -4 : 0;
  const toolpathTypeId = input.toolpathTypeId ?? 'general';
  const signature = `${input.toolpath?.label ?? ''} ${input.toolpath?.path ?? ''} ${input.tool?.label ?? ''}`.toLowerCase();

  if (input.machineMode === 'lathe') {
    if (toolpathTypeId === 'live_milling') {
      return {
        label: 'Live-tool milling lay',
        detail: 'Driven-tool lathe milling should read like a milled sidewall or end face, not a pure turned sleeve.',
        layFamily: /drill|bore/.test(signature) ? 'axial' : 'profile',
        layAngleDeg: 104 + requestedOffset,
        secondaryAngleDeg: 34 + requestedOffset,
        referenceBasisLabel: 'Comparator: live-tool milled',
        referenceBasisDetail: 'Uses a live-tool mill-turn comparator character instead of a pure finish-turned lay.',
        highlightAngleDeg: 110,
        layBias: -0.02,
        interruptionBias: 0.16,
      };
    }
    if (toolpathTypeId === 'turning_finish') {
      return {
        label: 'Finish-turned lay',
        detail: 'A clean turned finish should read as even, axial feed bands with a narrow specular ribbon.',
        layFamily: 'turned',
        layAngleDeg: 0 + requestedOffset,
        secondaryAngleDeg: 90 + requestedOffset,
        referenceBasisLabel: 'Comparator: finish turned',
        referenceBasisDetail: 'Calibrated to turned comparator-style bands rather than generic brushed metal.',
        highlightAngleDeg: 8,
        layBias: -0.2,
        interruptionBias: 0.1,
      };
    }
    if (toolpathTypeId === 'turning_rough') {
      return {
        label: 'Rough-turned lay',
        detail: 'Rough turning leaves broader axial bands, heavier chatter risk, and more visible feed-step breakup.',
        layFamily: 'turned',
        layAngleDeg: 2 + requestedOffset,
        secondaryAngleDeg: 92 + requestedOffset,
        referenceBasisLabel: 'Comparator: rough turned',
        referenceBasisDetail: 'Biased toward heavier turned feed marks and a duller, more interrupted band.',
        highlightAngleDeg: 10,
        layBias: 0.35,
        interruptionBias: 0.45,
      };
    }
    if (toolpathTypeId === 'threading' || /thread/i.test(signature)) {
      return {
        label: 'Threaded flank lay',
        detail: 'Threading reads as crisp, repeating flank rhythm with sharp highlights and intentional interruption.',
        layFamily: 'axial',
        layAngleDeg: 18 + requestedOffset,
        secondaryAngleDeg: 108 + requestedOffset,
        referenceBasisLabel: 'Comparator: threaded profile',
        referenceBasisDetail: 'Visualized as a repeating flank pattern rather than a smooth turned sleeve.',
        highlightAngleDeg: 20,
        layBias: 0.2,
        interruptionBias: 0.4,
      };
    }
    return {
      label: 'Groove / bore lathe lay',
      detail: 'Grooving and boring surfaces show a controlled axial lay with more visible interruption than a pure finish turn.',
      layFamily: 'axial',
      layAngleDeg: 6 + requestedOffset,
      secondaryAngleDeg: 92 + requestedOffset,
      referenceBasisLabel: 'Comparator: bore / groove',
      referenceBasisDetail: 'Uses a bore-and-groove comparator character with moderate interruption and tighter highlight bands.',
      highlightAngleDeg: 12,
      layBias: 0.08,
      interruptionBias: 0.25,
    };
  }

  if (toolpathTypeId === 'roughing' || /adaptive|dynamic/i.test(signature)) {
    return {
      label: 'Adaptive roughing lay',
      detail: 'Adaptive roughing should read as busy, broken, low-gloss lay with visible interruption and tool engagement energy.',
      layFamily: 'adaptive',
      layAngleDeg: 98 + requestedOffset,
      secondaryAngleDeg: 34 + requestedOffset,
      referenceBasisLabel: 'Comparator: adaptive rough milled',
      referenceBasisDetail: 'Biased toward interrupted rough-milled texture instead of a clean finishing pass.',
      highlightAngleDeg: 104,
      layBias: 0.45,
      interruptionBias: 0.5,
    };
  }

  if (/face/i.test(signature) || input.toolpath?.operationId === 'face_milling') {
    return {
      label: 'Face-milled sweep',
      detail: 'Face milling should show broad sweep marks and a rolling specular band rather than tight linear striations.',
      layFamily: 'face',
      layAngleDeg: 114 + requestedOffset,
      secondaryAngleDeg: 28 + requestedOffset,
      referenceBasisLabel: 'Comparator: face milled',
      referenceBasisDetail: 'Uses broad sweep arcs and overlapping face-pass energy as the reference character.',
      highlightAngleDeg: 122,
      layBias: 0.12,
      interruptionBias: 0.18,
    };
  }

  if (toolpathTypeId === 'surface_finish' || /parallel|flow|scallop/i.test(signature)) {
    const scallopFamily = /scallop|flow/i.test(signature);
    return {
      label: scallopFamily ? 'Scallop finish lay' : 'Parallel finish lay',
      detail: scallopFamily
        ? 'Fine finishing paths leave overlapping scallop envelopes with tight reflective cadence and almost no chatter.'
        : 'Parallel finishing leaves disciplined, evenly spaced lay that should read smooth and directional.',
      layFamily: scallopFamily ? 'scallop' : 'parallel',
      layAngleDeg: scallopFamily ? 120 + requestedOffset : 104 + requestedOffset,
      secondaryAngleDeg: scallopFamily ? 44 + requestedOffset : 146 + requestedOffset,
      referenceBasisLabel: scallopFamily ? 'Comparator: scallop finished' : 'Comparator: parallel finished',
      referenceBasisDetail: scallopFamily
        ? 'Modeled on a tight scallop envelope, where the reflected band walks smoothly across the surface.'
        : 'Modeled on a disciplined finish-milled comparator with tight, even lay spacing.',
      highlightAngleDeg: scallopFamily ? 126 : 110,
      layBias: -0.18,
      interruptionBias: 0.04,
    };
  }

  if (toolpathTypeId === 'multiaxis' || /swarf|5-axis|simultaneous/i.test(signature)) {
    return {
      label: 'Multiaxis finish lay',
      detail: 'Multiaxis finishing should read smooth and continuous, with subtle directional drift instead of abrupt pattern resets.',
      layFamily: 'ground',
      layAngleDeg: 128 + requestedOffset,
      secondaryAngleDeg: 42 + requestedOffset,
      referenceBasisLabel: 'Comparator: multiaxis blended',
      referenceBasisDetail: 'Visualized as a blended multiaxis finish where the lay direction shifts softly across the surface.',
      highlightAngleDeg: 134,
      layBias: -0.1,
      interruptionBias: 0.08,
    };
  }

  if (toolpathTypeId === 'drilling' || /drill|bore/i.test(signature)) {
    return {
      label: 'Axial tool entry lay',
      detail: 'Drilling and axial entry surfaces show tighter axial rings and a narrower highlight window than wall finishing.',
      layFamily: 'axial',
      layAngleDeg: 90 + requestedOffset,
      secondaryAngleDeg: 0 + requestedOffset,
      referenceBasisLabel: 'Comparator: drilled / bored',
      referenceBasisDetail: 'Treats the surface as an axial-cut finish with more concentric discipline than a sidewall cut.',
      highlightAngleDeg: 96,
      layBias: 0,
      interruptionBias: 0.16,
    };
  }

  return {
    label: 'Profiled wall lay',
    detail: 'Profile and general finishing cuts show a balanced directional lay with moderate reflectivity and limited interruption.',
    layFamily: 'profile',
    layAngleDeg: 110 + requestedOffset,
    secondaryAngleDeg: 36 + requestedOffset,
    referenceBasisLabel: 'Comparator: profiled wall',
    referenceBasisDetail: 'Uses a general profile-finishing comparator character as the fallback visual basis.',
    highlightAngleDeg: 116,
    layBias: 0,
    interruptionBias: 0.12,
  };
}

function describeFinishBand(surfaceRaUm: number): SurfaceFinishBandProfile {
  if (surfaceRaUm <= 0.2) {
    return {
      label: 'Near-polish band',
      detail: 'Very fine machining signatures with a wide, coherent reflected band.',
      referenceDetail: 'The band is pushed toward pre-polish comparator behavior with almost no visible breakup.',
      reflectivityBoost: 0.12,
      chatterBias: -0.03,
      hazeBias: -0.02,
    };
  }
  if (surfaceRaUm <= 0.4) {
    return {
      label: 'Precision band',
      detail: 'Tight finish with visible lay only at glancing angles.',
      referenceDetail: 'This sits near a precision functional-finish comparator with tight lay spacing and controlled gloss.',
      reflectivityBoost: 0.08,
      chatterBias: -0.02,
      hazeBias: -0.01,
    };
  }
  if (surfaceRaUm <= 0.8) {
    return {
      label: 'Fine functional band',
      detail: 'Fine lay with an intentional machining signature and high surface discipline.',
      referenceDetail: 'The visual target is a fine functional machining comparator, not a cosmetic mirror.',
      reflectivityBoost: 0.05,
      chatterBias: 0,
      hazeBias: 0,
    };
  }
  if (surfaceRaUm <= 1.6) {
    return {
      label: 'Smooth production band',
      detail: 'A smooth production finish with clear, readable lay and controlled highlights.',
      referenceDetail: 'This band follows a smooth machined comparator with visible but disciplined feed signature.',
      reflectivityBoost: 0.02,
      chatterBias: 0.03,
      hazeBias: 0.02,
    };
  }
  if (surfaceRaUm <= 3.2) {
    return {
      label: 'General production band',
      detail: 'Moderate lay, visible feed stepping, and a tighter highlight window.',
      referenceDetail: 'This is calibrated to a typical general-production machined comparator window.',
      reflectivityBoost: -0.01,
      chatterBias: 0.06,
      hazeBias: 0.04,
    };
  }
  return {
    label: 'Removal-first band',
    detail: 'Heavy lay, reduced reflectivity, and visible interruption from throughput-biased cutting.',
    referenceDetail: 'The visual goal is a removal-first rough comparator rather than a refined finished surface.',
    reflectivityBoost: -0.05,
    chatterBias: 0.1,
    hazeBias: 0.06,
  };
}

function buildImagingPromptSeed(
  archetype: SurfaceFinishProcessArchetype,
  materialCharacter: SurfaceFinishMaterialCharacter,
  surfaceRaUm: number,
  mode: 'requested' | 'predicted',
) {
  return [
    `${mode === 'requested' ? 'Requested' : 'Predicted'} machining surface macro`,
    archetype.referenceBasisLabel,
    materialCharacter.label,
    `${roundRa(surfaceRaUm)} um Ra`,
    'industrial lighting',
    'macro product photography',
    'clean-room comparator reference',
  ].join(' | ');
}

function coolantCleanlinessBoost(coolantId: string, idealCoolant?: string) {
  const ideal = idealCoolant?.toLowerCase() ?? '';

  switch (coolantId) {
    case 'tsc':
      return ideal.includes('tsc') || ideal.includes('through') ? 0.08 : 0.05;
    case 'through_air':
      return ideal.includes('through air') ? 0.03 : ideal.includes('air') ? 0.01 : -0.01;
    case 'flood':
      return ideal.includes('flood') ? 0.05 : 0.03;
    case 'mist':
      return 0.01;
    case 'air':
      return -0.02;
    default:
      return 0;
  }
}

function toolpathInterruptBoost(toolpathTypeId: string) {
  switch (toolpathTypeId) {
    case 'roughing':
    case 'turning_rough':
    case 'grooving':
      return 1;
    case 'surface_finish':
    case 'turning_finish':
    case 'live_milling':
    case 'multiaxis':
      return 0.25;
    default:
      return 0.55;
  }
}

function normalizeRoughness(surfaceRaUm: number) {
  return clamp((surfaceRaUm - 0.2) / (6.3 - 0.2), 0, 1);
}

function buildDrivers(
  input: SurfaceFinishPreviewInput,
  expectedMinRaUm: number,
  expectedMaxRaUm: number,
  liveCalculatedRaUm?: number | null,
): SurfaceFinishDriver[] {
  const machineValue = input.machine?.model ?? 'Machine pending';
  const toolpathValue = input.toolpath?.label ?? 'Toolpath pending';
  const toolValue = input.tool?.label ?? 'Tool pending';
  const coolantValue = coolantLabel(input.coolantId);
  const toolEdgeDetail = input.tool
    ? [
        input.tool.geometryClass ? input.tool.geometryClass.replace(/-/g, ' ') : null,
        input.tool.edgePrep ? `${input.tool.edgePrep} edge` : null,
        input.tool.wiperGeometry ? 'wiper geometry' : null,
        input.tool.noseRadiusMm ? `${input.tool.noseRadiusMm} mm nose radius` : input.tool.cornerRadiusMm ? `${input.tool.cornerRadiusMm} mm corner radius` : null,
      ].filter(Boolean).join(' · ')
    : 'Geometry pending';
  const liveCutValue =
    input.machineMode === 'lathe' && input.actualFeedRateMmPerMin && input.actualRpm
      ? `${(input.actualFeedRateMmPerMin / input.actualRpm).toFixed(3)} mm/rev`
      : input.actualFeedPerToothMm
        ? `${input.actualFeedPerToothMm.toFixed(3)} mm/tooth`
        : 'Awaiting solve';
  const toolExtensionValue = input.toolStickoutMm
    ? `${input.toolStickoutMm.toFixed(1)} mm from holder`
    : 'Using default tool reach';
  const locValue = input.fluteLengthMm
    ? `${input.fluteLengthMm.toFixed(1)} mm flute / LOC`
    : 'Using default flute length';
  const reachRatio = ratioOrZero(input.toolStickoutMm, input.toolDiameterMm);
  const fluteCoverage = ratioOrZero(input.docMm, input.fluteLengthMm);

  return [
    {
      label: 'Machine',
      value: machineValue,
      detail: input.machine
        ? `${input.machine.machineTypeLabel} with ${input.machine.spindleRpm.toLocaleString()} RPM headroom is shaping the finish window.`
        : 'Pick the machine first so spindle stability and machine class can anchor the preview.',
    },
    {
      label: 'Material',
      value: input.material?.name ?? 'Material pending',
      detail: input.material
        ? `${input.material.hardness} and ${input.material.idealCoolant} put this stack in about a ${formatSurfaceFinish(expectedMinRaUm, 'metric')} to ${formatSurfaceFinish(expectedMaxRaUm, 'metric')} lane.`
        : 'Pick the material so the preview can account for hardness, chip control, and coolant needs.',
    },
    {
      label: 'Coolant',
      value: coolantValue,
      detail: input.material?.idealCoolant
        ? `The selected coolant is being compared against the material ideal of ${input.material.idealCoolant}.`
        : 'Coolant posture is one of the fastest ways to move the finish window.',
    },
    {
      label: 'Toolpath',
      value: toolpathValue,
      detail: `${toolpathValue} is currently driving the finish posture more than the nominal target alone.`,
    },
    {
      label: 'Tooling',
      value: toolValue,
      detail: input.tool
        ? `${input.tool.family} with ${input.tool.coating} is what the preview is assuming for edge condition and finish quality.`
        : 'Pick the actual tool so the preview can distinguish roughing from finishing hardware.',
    },
    {
      label: 'Tool edge',
      value: toolEdgeDetail,
      detail: input.tool
        ? 'Insert and cutter geometry now bias the finish view, so wiper edges, ball noses, roughing inserts, and sharp finishers no longer render like the same tool.'
        : 'Pick the actual cutter or insert so the finish atlas can factor the edge geometry in.',
    },
    {
      label: 'Tool extension',
      value: toolExtensionValue,
      detail: input.toolStickoutMm
        ? `Reach is currently about ${reachRatio.toFixed(2)}x tool diameter from the holder. Shorter extension usually buys back finish confidence fast.`
        : 'Enter the actual tool extension from the holder so finish risk can reflect the live reach instead of the default tool silhouette.',
    },
    {
      label: 'LOC posture',
      value: locValue,
      detail: input.fluteLengthMm
        ? `DOC is using about ${(fluteCoverage * 100).toFixed(0)}% of the available flute length. Keeping a little flute margin helps finish and chip evacuation.`
        : 'Enter the working flute length / LOC so finish and setup risk can react to the real cutting edge available.',
    },
    {
      label: 'Live cut state',
      value: liveCutValue,
      detail: input.actualRaUm != null
        ? `The preview is anchored to the live speed/feed solve at ${formatSurfaceFinish(input.actualRaUm, 'metric')} and then refined with holder and geometry context.`
        : liveCalculatedRaUm != null
          ? `The preview is deriving about ${formatSurfaceFinish(liveCalculatedRaUm, 'metric')} from the live cut state on the page: chip load or feed per rev, solved RPM, engagement, and the selected tool geometry are all contributing.`
        : 'Run the live speed/feed solve to let chip load and solved Ra anchor the finish prediction.',
    },
  ];
}

function coolantLabel(coolantId: string) {
  switch (coolantId) {
    case 'tsc':
      return 'Through-spindle coolant';
    case 'through_air':
      return 'Through-air';
    case 'flood':
      return 'Flood';
    case 'mist':
      return 'Mist / MQL';
    case 'air':
      return 'Air blast';
    case 'dielectric':
      return 'Dielectric';
    default:
      return coolantId;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ratioOrZero(value: number | undefined, divisor: number | undefined) {
  if (!value || !divisor || divisor <= 0) return 0;
  return value / divisor;
}

function roundRa(value: number) {
  return Number(value.toFixed(value < 1 ? 2 : 1));
}

function roundVisual(value: number) {
  return Number(value.toFixed(2));
}
