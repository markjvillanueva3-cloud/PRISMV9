import type { HolderPackageOption } from '../api/calculatorData';
import type { SpeedFeedParams } from '../api/speedfeed';
import type {
  MachineCatalogItem,
  MachineMode,
  MaterialCatalogItem,
  SelectionOption,
  ToolCatalogItem,
} from '../data/calculatorWorkspace';
import type { CalculatorInsertOption } from './calculatorTooling';

type ToolpathLike = {
  id?: string;
  label?: string;
  path?: string;
  operationId?: string;
};

type ProgrammingLike = {
  id?: string;
  label?: string;
  vendor?: string;
};

type WorkholdingPresetLike = {
  id?: string;
  label?: string;
  detail?: string;
};

export interface CalculatorSpeedFeedContractInput {
  machineMode: MachineMode;
  machine: MachineCatalogItem;
  controllerOption?: Pick<SelectionOption, 'id' | 'label' | 'detail'> | null;
  spindleOption?: Pick<SelectionOption, 'id' | 'label' | 'detail'> | null;
  enabledControllerCapabilityIds?: string[];
  enabledMachineFeatureIds?: string[];
  enabledMachineCoolantIds?: string[];
  material: MaterialCatalogItem;
  tool: ToolCatalogItem;
  insertOption?: CalculatorInsertOption | null;
  holderPackage?: HolderPackageOption | null;
  operationId: string;
  toolpathTypeId?: string;
  toolpath?: ToolpathLike | null;
  programming?: ProgrammingLike | null;
  toolDiameterMm: number;
  docMm: number;
  wocMm: number;
  flutes: number;
  toolStickoutMm?: number | null;
  fluteLengthMm?: number | null;
  stockShape?: string;
  stockXm?: number;
  stockYm?: number;
  stockZm?: number;
  coolantId?: string;
  workholdingId?: string;
  workholdingCategoryId?: string;
  workholdingPreset?: WorkholdingPresetLike | null;
  stabilityId?: string;
  desiredRaUm?: number | null;
  finishTarget?: string;
  measuredMachineData?: CalculatorMeasuredMachineData | null;
}

export interface CalculatorMeasuredMachineData {
  guidewayType?: MachineCatalogItem['guidewayType'];
  machineAgeYears?: number | null;
  measuredPowerKw?: number | null;
  measuredMaxTorqueNm?: number | null;
  measuredNaturalFrequencyHz?: number | null;
  measuredSystemStiffnessNPerUm?: number | null;
  measuredDampingRatio?: number | null;
  measuredAxisAccelerationMps2?: number | null;
  measuredAxisJerkMps3?: number | null;
}

export interface CalculatorNormalizedSpeedFeedResult {
  rpm?: number;
  feedRate?: number;
  feedPerTooth?: number;
  cuttingSpeed?: number;
  mrr?: number;
  powerKw?: number;
  torqueNm?: number;
  toolLife?: number;
  ra?: number;
  deflectionUm?: number;
  axialDepthMm?: number;
  radialDepthMm?: number;
  confidence?: number;
  warnings: string[];
  recommendations: string[];
  safetyChecks: string[];
  limitingFactors: string[];
  formulas: string[];
  engines: string[];
  formula?: string;
  resolvedMachineLabel?: string;
  resolvedToolLabel?: string;
  resolvedHolderLabel?: string;
  resolvedMaterialLabel?: string;
  resolvedCamLabel?: string;
}

export type CalculatorSolveSource = 'orchestrate' | 'quick';

export interface CalculatorResultSafetyAssessment {
  status: 'awaiting-run' | 'release-ready' | 'verify-before-release' | 'do-not-run';
  label: string;
  heading: string;
  summary: string;
  guidance: string;
  tone: 'slate' | 'emerald' | 'amber' | 'rose';
  releaseBlocked: boolean;
  confidencePct: number;
  solveSourceLabel: string;
  signals: string[];
}

const HP_PER_KW = 1.34102209;

function safeNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function roundMetric(value: number | undefined, digits = 3) {
  if (!Number.isFinite(value)) return undefined;
  return Number(value!.toFixed(digits));
}

function normalizeToolLifeMinutes(value: number | undefined) {
  if (!Number.isFinite(value)) return undefined;
  if ((value ?? 0) >= 9999) return undefined;
  return value;
}

function positiveMetric(value: number | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value : undefined;
}

function firstPositiveMetric(...values: Array<number | undefined>) {
  return values.find((value) => positiveMetric(value) != null);
}

function sanitizeList(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function clampRatio(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value ?? 0));
}

function hasFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const CRITICAL_SAFETY_PATTERN =
  /unsafe|critical|fail|failure|collision|crash|catastrophic|exceed|exceeds|overload|not supported|breakage|tool break|pull.?out|interference|limit exceeded|thermal shock/i;

const VERIFY_SAFETY_PATTERN =
  /warning|limit|verify|monitor|watch|near|prove|check|load|stickout|deflection|runout|coolant|chip evacuation|wear|fixture|rigid/i;

export function classifyCalculatorResultSafetyPosture(
  result: CalculatorNormalizedSpeedFeedResult | null | undefined,
  context: {
    solveSource?: CalculatorSolveSource | null;
    setupCompleteness?: number;
    livePhysics?: boolean;
  } = {},
): CalculatorResultSafetyAssessment {
  const solveSourceLabel =
    context.solveSource === 'orchestrate'
      ? 'Full PRISM solve'
      : context.solveSource === 'quick'
        ? 'Quick fallback estimate'
        : 'Awaiting solve';
  const engineConfidenceRatio = clampRatio(result?.confidence);
  // Setup completeness used for confidence blending in future releases
  void context.setupCompleteness;
  const hasEngineConfidence = hasFiniteNumber(result?.confidence);
  const confidencePct = Math.round((hasEngineConfidence ? engineConfidenceRatio : 0) * 100);

  if (!context.livePhysics) {
    return {
      status: 'awaiting-run',
      label: 'Setup-first posture',
      heading: 'Dedicated process engines finish this machine family.',
      summary: 'This workspace is staging the setup and handoff posture, not releasing live spindle numbers.',
      guidance: 'Finish the setup and hand the package into the process-specific engine before release.',
      tone: 'slate',
      releaseBlocked: true,
      confidencePct,
      solveSourceLabel,
      signals: [],
    };
  }

  if (!result) {
    return {
      status: 'awaiting-run',
      label: 'Awaiting validated solve',
      heading: 'Do not release numbers until PRISM finishes a live solve.',
      summary: 'The calculator still needs a live PRISM solve before the cut can be trusted for CAM, prove-out, or machine release.',
      guidance: 'Run the solve and review the returned release posture before handing any values downstream.',
      tone: 'slate',
      releaseBlocked: true,
      confidencePct,
      solveSourceLabel,
      signals: [],
    };
  }

  const signals = sanitizeList([
    ...result.safetyChecks,
    ...result.limitingFactors,
    ...result.warnings,
  ]);
  const criticalSignals = signals.filter((entry) => CRITICAL_SAFETY_PATTERN.test(entry));
  const cautionSignals = signals.filter(
    (entry) => !criticalSignals.includes(entry) && VERIFY_SAFETY_PATTERN.test(entry),
  );
  const missingEngineConfidence = !hasEngineConfidence;
  const missingCoreOutputs =
    !hasFiniteNumber(result.rpm)
    || !hasFiniteNumber(result.feedRate)
    || !hasFiniteNumber(result.cuttingSpeed)
    || !hasFiniteNumber(result.powerKw);

  if (criticalSignals.length > 0 || missingCoreOutputs || (hasEngineConfidence && engineConfidenceRatio < 0.35)) {
    return {
      status: 'do-not-run',
      label: 'Do not run as-is',
      heading: 'Blocking safety signals were returned for this cut.',
      summary: missingCoreOutputs
        ? 'The solve is missing core spindle or load outputs, so this result is not trustworthy enough to post or cut.'
        : criticalSignals.length > 0
          ? 'PRISM flagged blocking safety issues or hard limits in the current setup. Treat the result as unsafe until those issues are resolved.'
          : 'The solve confidence is too low for a production recommendation. Resolve the setup or model gaps before release.',
      guidance: 'Do not hand these numbers to CAM, a setup sheet, or the machine. Resolve the highlighted setup, tooling, fixturing, or model issues first.',
      tone: 'rose',
      releaseBlocked: true,
      confidencePct,
      solveSourceLabel,
      signals: criticalSignals.length > 0 ? criticalSignals : signals,
    };
  }

  if (context.solveSource === 'quick' || missingEngineConfidence || engineConfidenceRatio < 0.78 || cautionSignals.length > 0) {
    return {
      status: 'verify-before-release',
      label: 'Verify before release',
      heading: context.solveSource === 'quick'
        ? 'Quick fallback numbers need human verification.'
        : missingEngineConfidence
          ? 'The solve returned numbers without an explicit confidence score.'
        : 'The cut is plausible, but it still needs operator review.',
      summary: context.solveSource === 'quick'
        ? 'The full PRISM solve did not return, so the calculator is showing a quicker advisory estimate. Treat it as a prove-out starting point only.'
        : missingEngineConfidence
          ? 'PRISM returned a usable cut state, but the engine did not supply a confidence score. Keep this in prove-out posture until solver confidence is available.'
        : 'PRISM found cautionary signals, soft limits, or a middling confidence score. Review the warning stack before you trust the cut.',
      guidance: 'Verify the machine package, tool reach, holder posture, coolant delivery, and workholding before posting or running this cut.',
      tone: 'amber',
      releaseBlocked: true,
      confidencePct,
      solveSourceLabel,
      signals: signals,
    };
  }

  return {
    status: 'release-ready',
    label: 'Release-ready with verification trail',
    heading: 'This cut cleared the current PRISM safety gate.',
    summary: 'The full PRISM solve returned stable core outputs with no blocking safety signals. Keep the warning trail with the setup, but this is the first posture that can reasonably feed CAM.',
    guidance: 'Carry the solve metadata and machine-profile context into CAM or the setup sheet so the release trail stays intact.',
    tone: 'emerald',
    releaseBlocked: false,
    confidencePct,
    solveSourceLabel,
    signals: signals,
  };
}

function signatureOf(...parts: Array<string | undefined | null>) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFirstNumber(text?: string | null) {
  if (!text) return undefined;
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? safeNumber(match[1]) : undefined;
}

function parseRpm(...parts: Array<string | undefined | null>) {
  for (const part of parts) {
    if (!part) continue;
    const match = part.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(?:rpm|rev\/min)/i);
    if (match) return safeNumber(match[1]);
  }
  return undefined;
}

function parseTorqueNm(...parts: Array<string | undefined | null>) {
  for (const part of parts) {
    if (!part) continue;
    const normalized = part.replace(/,/g, '');
    const nmMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:n\.?m|nm)/i);
    if (nmMatch) return safeNumber(nmMatch[1]);
    const ftLbMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ft[-\s]?lb|ft\.?\s*lbs?|lb[-\s]?ft|lbf[-\s]?ft)/i);
    const ftLb = ftLbMatch ? safeNumber(ftLbMatch[1]) : undefined;
    if (ftLb) return roundMetric(ftLb * 1.3558179483, 3);
  }
  return undefined;
}

function parseHardness(hardness?: string) {
  if (!hardness) return {};
  const normalized = hardness.toLowerCase();
  const value = parseFirstNumber(normalized);
  if (!value) return {};
  if (normalized.includes('hrc')) {
    return { hardness_hrc: value };
  }
  if (normalized.includes('hb') || normalized.includes('brinell')) {
    return { hardness_hb: value };
  }
  return {};
}

function normalizeIsoGroup(material?: MaterialCatalogItem | null) {
  const group = material?.isoGroup?.toUpperCase();
  return group && ['P', 'M', 'K', 'N', 'S', 'H'].includes(group) ? (group as SpeedFeedParams['iso_group']) : undefined;
}

function inferMachineType(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['machine_type'] {
  const taxonomy = input.machine.taxonomy;
  if (input.machineMode === 'lathe') {
    return taxonomy?.orientation === 'swiss' || taxonomy?.axisClass === 'swiss' ? 'swiss' : 'lathe';
  }
  if (input.machineMode !== 'mill') return undefined;
  if (taxonomy?.axisClass === '5-axis' || input.machine.machineTypeId.endsWith('_5')) return '5axis';
  if (taxonomy?.orientation === 'horizontal') return 'horizontal_mill';
  return 'vertical_mill';
}

function inferMachineRigidity(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['machine_rigidity'] {
  const taxonomy = input.machine.taxonomy;
  const guideway = input.measuredMachineData?.guidewayType ?? input.machine.guidewayType;
  const powerHp = input.machine.powerHp ?? 0;
  if (input.machineMode === 'lathe') {
    if (taxonomy?.axisClass === 'swiss') return 'medium';
    return guideway === 'linear' && powerHp < 18 ? 'medium' : 'high';
  }
  if (taxonomy?.orientation === 'horizontal') return 'high';
  if (guideway === 'box' || guideway === 'hydrostatic') return 'high';
  if (taxonomy?.axisClass === '5-axis') return powerHp >= 20 ? 'high' : 'medium';
  return 'medium';
}

function normalizeFeatureIds(values: Array<string | undefined | null>) {
  return new Set(
    values
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')),
  );
}

function inferMachineGuideway(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['machine_guideway'] {
  const guideway = input.measuredMachineData?.guidewayType ?? input.machine.guidewayType;
  return guideway === 'box' || guideway === 'linear' || guideway === 'hydrostatic'
    ? guideway
    : undefined;
}

function deriveMachineDynamics(
  input: CalculatorSpeedFeedContractInput,
  machineType: SpeedFeedParams['machine_type'],
  rigidity: SpeedFeedParams['machine_rigidity'],
) {
  const guideway = inferMachineGuideway(input);
  const measured = input.measuredMachineData;
  const featureIds = normalizeFeatureIds([
    ...(input.enabledControllerCapabilityIds ?? []),
    ...(input.enabledMachineFeatureIds ?? []),
  ]);
  const highSpeedControlEnabled =
    featureIds.has('cas')
    || featureIds.has('machining_navi')
    || featureIds.has('high_speed_mode')
    || featureIds.has('high_speed_machining')
    || featureIds.has('hpcc');

  const stiffnessByType: Record<NonNullable<SpeedFeedParams['machine_type']>, Record<NonNullable<SpeedFeedParams['machine_rigidity']>, number>> = {
    vertical_mill: { high: 60, medium: 40, low: 20 },
    horizontal_mill: { high: 100, medium: 70, low: 40 },
    '5axis': { high: 50, medium: 35, low: 20 },
    lathe: { high: 120, medium: 80, low: 50 },
    swiss: { high: 40, medium: 25, low: 15 },
    router: { high: 30, medium: 20, low: 10 },
  };
  const guidewayStiffnessMultiplier: Record<NonNullable<SpeedFeedParams['machine_guideway']>, number> = {
    box: 1.14,
    linear: 1,
    hydrostatic: 1.25,
  };
  const guidewayDampingBase: Record<NonNullable<SpeedFeedParams['machine_guideway']>, number> = {
    box: 0.05,
    linear: 0.02,
    hydrostatic: 0.08,
  };

  const normalizedMachineType = machineType ?? 'vertical_mill';
  const normalizedRigidity = rigidity ?? 'medium';
  const baseStiffness = stiffnessByType[normalizedMachineType]?.[normalizedRigidity] ?? 50;
  const guidewayMultiplier = guideway ? guidewayStiffnessMultiplier[guideway] : 1;
  const naturalFrequencyHz =
    measured?.measuredNaturalFrequencyHz
    ?? input.machine.naturalFrequencyHz
    ?? undefined;
  const frequencyBias =
    typeof naturalFrequencyHz === 'number' && Number.isFinite(naturalFrequencyHz)
      ? Math.min(1.16, Math.max(0.88, naturalFrequencyHz / 800))
      : 1;
  const derivedStiffness = roundMetric(baseStiffness * guidewayMultiplier * frequencyBias, 3);
  const derivedDamping = roundMetric(
    Math.min(
      0.12,
      (guideway ? guidewayDampingBase[guideway] : 0.03)
      + (highSpeedControlEnabled ? 0.006 : 0),
    ),
    4,
  );

  return {
    guideway,
    machineAgeYears:
      measured?.machineAgeYears != null && Number.isFinite(measured.machineAgeYears)
        ? roundMetric(measured.machineAgeYears, 3)
        : undefined,
    naturalFrequencyHz:
      typeof naturalFrequencyHz === 'number' && Number.isFinite(naturalFrequencyHz)
        ? roundMetric(naturalFrequencyHz, 3)
        : undefined,
    systemStiffnessNPerUm:
      measured?.measuredSystemStiffnessNPerUm != null && Number.isFinite(measured.measuredSystemStiffnessNPerUm)
        ? roundMetric(measured.measuredSystemStiffnessNPerUm, 3)
        : derivedStiffness,
    dampingRatio:
      measured?.measuredDampingRatio != null && Number.isFinite(measured.measuredDampingRatio)
        ? roundMetric(measured.measuredDampingRatio, 4)
        : derivedDamping,
    measuredPowerKw:
      measured?.measuredPowerKw != null && Number.isFinite(measured.measuredPowerKw)
        ? roundMetric(measured.measuredPowerKw, 3)
        : undefined,
    measuredMaxTorqueNm:
      measured?.measuredMaxTorqueNm != null && Number.isFinite(measured.measuredMaxTorqueNm)
        ? roundMetric(measured.measuredMaxTorqueNm, 3)
        : undefined,
    axisAccelerationMps2:
      measured?.measuredAxisAccelerationMps2 != null && Number.isFinite(measured.measuredAxisAccelerationMps2)
        ? roundMetric(measured.measuredAxisAccelerationMps2, 3)
        : roundMetric(input.machine.axisAccelerationMps2, 3),
    axisJerkMps3:
      measured?.measuredAxisJerkMps3 != null && Number.isFinite(measured.measuredAxisJerkMps3)
        ? roundMetric(measured.measuredAxisJerkMps3, 3)
        : roundMetric(input.machine.axisJerkMps3, 3),
  };
}

function inferSpindleTaper(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['spindle_taper'] {
  const signature = signatureOf(
    input.spindleOption?.label,
    input.spindleOption?.detail,
    input.machine.toolingLayout?.spindleConnectionLabel,
    input.machine.toolingLayout?.spindleConnectionTypeId,
    input.machine.toolingLayout?.interface,
    input.machine.toolingLayout?.interfaceId,
  );
  if (!signature) return undefined;
  if (/hsk[-\s]?a?100/.test(signature)) return 'HSK-A100';
  if (/hsk[-\s]?a?50/.test(signature)) return 'HSK-A50';
  if (/hsk[-\s]?a?63/.test(signature)) return 'HSK-A63';
  if (/hsk[-\s]?c[-\s]?40/.test(signature)) return 'HSK-C40';
  if (/hsk[-\s]?e[-\s]?40/.test(signature)) return 'HSK-E40';
  if (/iso[-\s]?20/.test(signature)) return 'ISO20';
  if (/(cat|ct)[-\s]?50|big\+.*50|50 taper/.test(signature)) return 'CAT50';
  if (/(cat|ct)[-\s]?40|big\+.*40|40 taper/.test(signature)) return 'CAT40';
  if (/bt[-\s]?50/.test(signature)) return 'BT50';
  if (/bt[-\s]?40/.test(signature)) return 'BT40';
  if (/bt[-\s]?30/.test(signature)) return 'BT30';
  return undefined;
}

function inferToolMaterial(tool: ToolCatalogItem, insertOption?: CalculatorInsertOption | null): SpeedFeedParams['tool_material'] {
  const signature = signatureOf(
    tool.toolMaterialClass,
    tool.label,
    tool.description,
    tool.coating,
    insertOption?.insertGrade,
    insertOption?.label,
    insertOption?.detail,
  );
  if (/cbn|pcbn/.test(signature)) return 'cbn';
  if (/pcd|diamond/.test(signature)) return 'pcd';
  if (/ceramic|sialon/.test(signature)) return 'ceramic';
  if (/cermet/.test(signature) || tool.toolMaterialClass === 'cermet') return 'cermet';
  if (/\bhss\b|high speed steel/.test(signature)) return 'hss';
  return 'carbide';
}

function inferCornerRadiusMm(tool: ToolCatalogItem) {
  if (typeof tool.cornerRadiusMm === 'number' && tool.cornerRadiusMm > 0) return tool.cornerRadiusMm;
  if (typeof tool.noseRadiusMm === 'number' && tool.noseRadiusMm > 0) return tool.noseRadiusMm;
  if (tool.geometryClass === 'ball-endmill' && tool.defaultDiameter > 0) {
    return roundMetric(tool.defaultDiameter / 2, 3);
  }
  return undefined;
}

function inferFluteCount(input: CalculatorSpeedFeedContractInput) {
  const signature = signatureOf(
    input.operationId,
    input.toolpath?.operationId,
    input.toolpath?.label,
    input.toolpath?.path,
    input.tool.geometryClass,
    input.tool.operation,
  );
  if (
    input.machineMode === 'lathe'
    && ['roughing-insert', 'finishing-insert', 'grooving-insert', 'threading-insert', 'boring-bar'].includes(input.tool.geometryClass ?? '')
    && !/live|mill|drill|tap|ream/.test(signature)
  ) {
    return 1;
  }
  return Math.max(1, input.flutes || input.tool.defaultFlutes || 1);
}

function inferOperation(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['operation'] {
  const signature = signatureOf(
    input.operationId,
    input.toolpath?.operationId,
    input.toolpath?.label,
    input.toolpath?.path,
    input.tool.geometryClass,
    input.tool.operation,
  );
  if (/tap/.test(signature)) return 'tapping';
  if (/thread/.test(signature) && /mill/.test(signature)) return 'thread_milling';
  if (/thread/.test(signature) && input.machineMode === 'lathe') return 'turning';
  if (/ream/.test(signature)) return 'reaming';
  if (/drill/.test(signature)) return 'drilling';
  if (/bor/.test(signature)) return 'boring';
  if (input.machineMode === 'lathe') {
    if (/live|endmill|milling head|mill/.test(signature)) return 'milling';
    return 'turning';
  }
  return 'milling';
}

function inferCutType(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['cut_type'] {
  const signature = signatureOf(
    input.operationId,
    input.toolpathTypeId,
    input.toolpath?.label,
    input.toolpath?.path,
    input.finishTarget,
  );
  if (
    input.desiredRaUm != null && input.desiredRaUm <= 1.6
    || /finish|parallel|scallop|flow|swarf|skim|fine/.test(signature)
  ) {
    return 'finishing';
  }
  if (/rough|adaptive|dynamic|pocket|slot|face/.test(signature)) {
    return 'roughing';
  }
  return 'semi_finishing';
}

function inferStrategy(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['strategy'] {
  const signature = signatureOf(input.toolpathTypeId, input.toolpath?.label, input.toolpath?.path, input.operationId);
  if (/trochoid|vortex|waveform|volumill|imachining/.test(signature)) return 'trochoidal';
  if (/adaptive|dynamic|featureflow/.test(signature)) return 'adaptive';
  if (/high speed|hsm|parallel|scallop|flow|surfaceweave|swarf|multi-axis|multiaxis/.test(signature)) return 'hsm';
  if (/high performance|hpc/.test(signature)) return 'hpc';
  if (/plunge/.test(signature)) return 'plunge';
  if (/slot/.test(signature)) return 'slot';
  return 'conventional';
}

function inferCamSystem(programming?: ProgrammingLike | null) {
  const signature = signatureOf(programming?.vendor, programming?.label, programming?.id);
  if (!signature) return undefined;
  if (/prism/.test(signature)) return 'PRISM';
  if (/mastercam/.test(signature)) return 'Mastercam';
  if (/fusion/.test(signature)) return 'Fusion 360';
  if (/\bnx\b/.test(signature)) return 'NX CAM';
  if (/hyper/.test(signature)) return 'hyperMILL';
  if (/camworks/.test(signature)) return 'CAMWorks';
  if (/esprit/.test(signature)) return 'ESPRIT';
  if (/gibbs/.test(signature)) return 'GibbsCAM';
  if (/powermill/.test(signature)) return 'PowerMill';
  if (/featurecam/.test(signature)) return 'FeatureCAM';
  if (/edgecam/.test(signature)) return 'Edgecam';
  if (/solidcam/.test(signature)) return 'SolidCAM';
  if (/worknc/.test(signature)) return 'WorkNC';
  if (/tebis/.test(signature)) return 'Tebis';
  if (/catia/.test(signature)) return 'CATIA';
  if (/manual|conversational/.test(signature)) return 'Manual Programming';
  return programming?.label ?? programming?.vendor ?? programming?.id;
}

function inferHolderType(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['holder_type'] {
  const signature = signatureOf(
    input.holderPackage?.holderStyleId,
    ...(input.holderPackage?.holderStyleIds ?? []),
    input.holderPackage?.holderType,
    input.holderPackage?.holderSubcategory,
    input.holderPackage?.label,
    input.holderPackage?.detail,
  );
  if (/shrink/.test(signature)) return 'shrink_fit';
  if (/hydraulic/.test(signature)) return 'hydraulic';
  if (/weldon|side lock|sidelock/.test(signature)) return 'Weldon';
  if (/er[-\s]?collet|collet/.test(signature)) return 'ER_collet';
  return 'milling_chuck';
}

function inferHolderTirMm(holderType?: SpeedFeedParams['holder_type']) {
  switch (holderType) {
    case 'shrink_fit':
      return 0.003;
    case 'hydraulic':
      return 0.003;
    case 'milling_chuck':
      return 0.005;
    case 'ER_collet':
      return 0.008;
    case 'Weldon':
      return 0.012;
    default:
      return undefined;
  }
}

function inferHolderBalanceG(holderType?: SpeedFeedParams['holder_type']) {
  switch (holderType) {
    case 'shrink_fit':
    case 'hydraulic':
    case 'milling_chuck':
      return 2.5;
    case 'ER_collet':
      return 6.3;
    case 'Weldon':
      return 6.3;
    default:
      return undefined;
  }
}

function inferHolderGaugeLengthMm(toolStickoutMm?: number | null, fluteLengthMm?: number | null) {
  if (!toolStickoutMm || toolStickoutMm <= 0) return undefined;
  if (!fluteLengthMm || fluteLengthMm <= 0) return roundMetric(toolStickoutMm * 0.72, 2);
  return roundMetric(Math.max(toolStickoutMm - fluteLengthMm * 0.55, 8), 2);
}

function inferWorkholdingType(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['workholding_type'] {
  const signature = signatureOf(
    input.workholdingId,
    input.workholdingCategoryId,
    input.workholdingPreset?.id,
    input.workholdingPreset?.label,
    input.workholdingPreset?.detail,
  );
  if (/vacuum/.test(signature)) return 'vacuum';
  if (/magnetic/.test(signature)) return 'magnetic';
  if (/tombstone/.test(signature)) return 'tombstone';
  if (/rotary|trunnion/.test(signature)) return 'fixture';
  if (input.machineMode === 'lathe') {
    if (/collet|guide bushing|swiss/.test(signature)) return 'collet';
    return 'chuck';
  }
  if (/fixture|plate/.test(signature)) return 'fixture';
  return 'vise';
}

function inferWorkholdingStiffness(stabilityId?: string): SpeedFeedParams['workholding_stiffness'] {
  const signature = (stabilityId ?? '').toLowerCase();
  if (/aggressive|rigid|production|index-ready/.test(signature)) return 'high';
  if (/fragile|detail|light|thin/.test(signature)) return 'low';
  return 'medium';
}

function inferCoolantType(input: CalculatorSpeedFeedContractInput): SpeedFeedParams['coolant_type'] {
  const selectedSignature = signatureOf(input.coolantId);
  if (/tsc|through[_\s-]?spindle|through[_\s-]?tool/.test(selectedSignature)) return 'through_tool';
  if (/mql/.test(selectedSignature)) return 'MQL';
  if (/mist/.test(selectedSignature)) return 'mist';
  if (/cryo/.test(selectedSignature)) return 'cryogenic';
  if (/air|through[_\s-]?air|dry/.test(selectedSignature)) return 'dry';
  if (/flood/.test(selectedSignature)) return 'flood';

  const coolantSignature = signatureOf(...(input.enabledMachineCoolantIds ?? []), input.material.idealCoolant);
  if (/tsc|through[_\s-]?spindle|through[_\s-]?tool/.test(coolantSignature)) return 'through_tool';
  if (/mql/.test(coolantSignature)) return 'MQL';
  if (/mist/.test(coolantSignature)) return 'mist';
  if (/cryo/.test(coolantSignature)) return 'cryogenic';
  if (/air|through[_\s-]?air|dry/.test(coolantSignature)) return 'dry';
  return 'flood';
}

function inferOptimizeFor(input: CalculatorSpeedFeedContractInput, cutType: SpeedFeedParams['cut_type']) {
  if (cutType === 'finishing' || (input.desiredRaUm != null && input.desiredRaUm <= 3.2)) {
    return 'surface_finish' as const;
  }
  if (cutType === 'roughing') {
    return 'productivity' as const;
  }
  return 'balanced' as const;
}

function inferEdgeRadiusMm(tool: ToolCatalogItem) {
  switch (tool.edgePrep) {
    case 'honed':
      return 0.025;
    case 'reinforced':
      return 0.04;
    case 'wiper':
      return 0.02;
    case 'sharp':
      return 0.01;
    default:
      return undefined;
  }
}

function inferPowerKw(machine: MachineCatalogItem, spindleOption?: Pick<SelectionOption, 'label' | 'detail'> | null) {
  const optionSignature = signatureOf(spindleOption?.label, spindleOption?.detail);
  const kwFromOption = optionSignature ? parseFirstNumber(optionSignature.match(/(\d+(?:\.\d+)?)\s*k[wW]/)?.[1]) : undefined;
  if (kwFromOption) return kwFromOption;
  return machine.powerHp > 0 ? roundMetric(machine.powerHp / HP_PER_KW, 3) : undefined;
}

function inferMachineName(machine: MachineCatalogItem) {
  return `${machine.manufacturer} ${machine.model}`.replace(/\s+/g, ' ').trim();
}

function packageConfidenceRatio(machine: MachineCatalogItem) {
  switch (machine.packageProvenance?.confidence) {
    case 'published':
      return 0.9;
    case 'merged':
      return 0.8;
    case 'inferred':
      return 0.65;
    case 'fallback':
      return 0.5;
    default:
      return 0.75;
  }
}

function deriveWorkpieceGeometry(input: CalculatorSpeedFeedContractInput) {
  if (input.machineMode === 'lathe') {
    const diameter = safeNumber(Math.max(input.stockYm ?? 0, input.stockZm ?? 0));
    return {
      workpiece_length_mm: roundMetric(input.stockXm, 3),
      workpiece_diameter_mm: roundMetric(diameter, 3),
      workpiece_height_mm: roundMetric(input.stockZm, 3),
    };
  }
  return {
    workpiece_length_mm: roundMetric(input.stockXm, 3),
    workpiece_width_mm: roundMetric(input.stockYm, 3),
    workpiece_height_mm: roundMetric(input.stockZm, 3),
  };
}

export function buildCalculatorSpeedFeedParams(
  input: CalculatorSpeedFeedContractInput,
): SpeedFeedParams {
  const machineType = inferMachineType(input);
  const machineRigidity = inferMachineRigidity(input);
  const spindleRpm =
    parseRpm(input.spindleOption?.label, input.spindleOption?.detail)
    ?? roundMetric(input.machine.spindleRpm, 3);
  const machineDynamics = deriveMachineDynamics(input, machineType, machineRigidity);
  const machinePowerKw = machineDynamics.measuredPowerKw ?? inferPowerKw(input.machine, input.spindleOption);
  const machineTorqueNm =
    machineDynamics.measuredMaxTorqueNm
    ?? parseTorqueNm(input.spindleOption?.label, input.spindleOption?.detail);
  const spindleTaper = inferSpindleTaper(input);
  const toolMaterial = inferToolMaterial(input.tool, input.insertOption);
  const cornerRadiusMm = inferCornerRadiusMm(input.tool);
  const operation = inferOperation(input);
  const cutType = inferCutType(input);
  const strategy = inferStrategy(input);
  const holderType = inferHolderType(input);
  const radialDepthPct =
    input.toolDiameterMm > 0 && input.wocMm > 0
      ? roundMetric((input.wocMm / input.toolDiameterMm) * 100, 3)
      : undefined;
  const toolStickoutMm = input.toolStickoutMm ?? undefined;
  const fluteLengthMm = input.fluteLengthMm ?? undefined;

  return {
    material: input.material.name,
    iso_group: normalizeIsoGroup(input.material),
    ...parseHardness(input.material.hardness),
    machine_name: inferMachineName(input.machine),
    machine: inferMachineName(input.machine),
    machine_power_kw: machinePowerKw,
    machine_max_rpm: spindleRpm,
    machine_max_torque_nm: machineTorqueNm,
    machinePackage: {
      id: input.machine.id,
      canonicalMachineId: input.machine.canonicalMachineId,
      packageId: input.machine.packageId,
      label: inferMachineName(input.machine),
      manufacturer: input.machine.manufacturer,
      model: input.machine.model,
      spindle: {
        max_rpm: spindleRpm,
        power_kw: machinePowerKw,
        power_continuous_kw: machinePowerKw,
        power: machinePowerKw,
        torque_max_nm: machineTorqueNm,
        taper: spindleTaper,
      },
      confidence: {
        overall: packageConfidenceRatio(input.machine),
        controller: packageConfidenceRatio(input.machine),
        spindle: packageConfidenceRatio(input.machine),
        envelope: packageConfidenceRatio(input.machine),
        axes: packageConfidenceRatio(input.machine),
      },
      provenance: {
        source: input.machine.packageProvenance?.source ?? 'calculator-workspace',
        confidence: input.machine.packageProvenance?.confidence ?? 'catalog',
        sourceRecordIds: input.machine.packageProvenance?.sourceRecordIds ?? [input.machine.id],
        notes: input.machine.packageProvenance?.notes ?? [],
      },
    },
    machine_rigidity: machineRigidity,
    machine_guideway: machineDynamics.guideway,
    machine_age_years: machineDynamics.machineAgeYears,
    natural_frequency_hz: machineDynamics.naturalFrequencyHz,
    system_stiffness_n_m: machineDynamics.systemStiffnessNPerUm,
    damping_ratio: machineDynamics.dampingRatio,
    machine_axis_accel_m_s2: machineDynamics.axisAccelerationMps2,
    machine_axis_jerk_m_s3: machineDynamics.axisJerkMps3,
    machine_type: machineType,
    spindle_taper: spindleTaper,
    tool_diameter_mm: roundMetric(input.toolDiameterMm, 3),
    flutes: inferFluteCount(input),
    num_flutes: inferFluteCount(input),
    tool_material: toolMaterial,
    tool_coating: input.tool.coating || undefined,
    helix_angle_deg: input.tool.helixAngleDeg,
    corner_radius_mm: cornerRadiusMm,
    flute_length_mm: roundMetric(fluteLengthMm, 3),
    tool_stickout_mm: roundMetric(toolStickoutMm, 3),
    edge_radius_mm: inferEdgeRadiusMm(input.tool),
    tool_grade: undefined,
    insert_grade: input.insertOption?.insertGrade || undefined,
    tool_series: input.tool.catalogNumber || input.tool.label,
    holder_type: holderType,
    holder_gauge_length_mm: inferHolderGaugeLengthMm(toolStickoutMm, fluteLengthMm),
    holder_tir_mm: inferHolderTirMm(holderType),
    holder_balanced_g: inferHolderBalanceG(holderType),
    operation,
    cut_type: cutType,
    strategy,
    cam_system: inferCamSystem(input.programming),
    cam_strategy: input.toolpath?.label || input.toolpath?.path || input.toolpath?.id || undefined,
    toolpath_strategy: input.toolpath?.label || input.toolpath?.id || undefined,
    axial_depth_mm: roundMetric(input.docMm, 3),
    doc_mm: roundMetric(input.docMm, 3),
    radial_depth_mm: roundMetric(input.wocMm, 3),
    woc_mm: roundMetric(input.wocMm, 3),
    radial_depth_pct: radialDepthPct,
    workholding_type: inferWorkholdingType(input),
    workholding_stiffness: inferWorkholdingStiffness(input.stabilityId),
    overhang_ratio:
      input.toolDiameterMm > 0 && toolStickoutMm != null
        ? roundMetric(toolStickoutMm / input.toolDiameterMm, 4)
        : undefined,
    coolant_type: inferCoolantType(input),
    optimize_for: inferOptimizeFor(input, cutType),
    output_detail: 'full',
    ...deriveWorkpieceGeometry(input),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapAtomicText(value: unknown) {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  if (!record) return undefined;
  if (typeof record.value === 'string') return record.value;
  return undefined;
}

function unwrapAtomicNumber(value: unknown) {
  if (typeof value === 'number') return value;
  const record = asRecord(value);
  if (!record) return undefined;
  return typeof record.value === 'number' ? record.value : undefined;
}

function readAtomicNumber(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = unwrapAtomicNumber(record[key]);
    if (value != null) return value;
  }
  return undefined;
}

function readAtomicText(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = unwrapAtomicText(record[key]);
    if (value != null) return value;
  }
  return undefined;
}

function unwrapPayload(response: unknown) {
  const record = asRecord(response);
  if (!record) return null;
  const result = asRecord(record.result) ?? record;
  return asRecord(result.value) ?? result;
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  if (Array.isArray(record._items)) return record._items;
  if (Array.isArray(record.value)) return record.value;
  return [];
}

function readStrings(value: unknown) {
  return sanitizeList(
    readArray(value).map((entry) => {
      if (typeof entry === 'string') return entry;
      const record = asRecord(entry);
      if (!record) return undefined;
      if (typeof record.message === 'string') return record.message;
      if (typeof record.note === 'string') return record.note;
      if (typeof record.label === 'string') return record.label;
      if (typeof record.constraint === 'string') return String(record.constraint);
      return undefined;
    }),
  );
}

function readLimitingFactors(value: unknown) {
  return sanitizeList(
    readArray(value).map((entry) => {
      const record = asRecord(entry);
      if (!record) return undefined;
      const parameter = typeof record.parameter === 'string' ? record.parameter : 'constraint';
      const constraint = typeof record.constraint === 'string' ? record.constraint : '';
      return constraint ? `${parameter}: ${constraint}` : parameter;
    }),
  );
}

function readSafetyChecks(value: unknown) {
  return sanitizeList(
    readArray(value).map((entry) => {
      const record = asRecord(entry);
      if (!record) return undefined;
      const name = typeof record.name === 'string' ? record.name : 'Safety check';
      const message = typeof record.message === 'string' ? record.message : '';
      return message ? `${name}: ${message}` : name;
    }),
  );
}

export function normalizeCalculatorSpeedFeedResult(
  response: unknown,
): CalculatorNormalizedSpeedFeedResult {
  const raw = unwrapPayload(response) ?? {};
  const resolvedTool = asRecord(raw.resolved_tool);
  const toolDiameterMm = firstPositiveMetric(
    readAtomicNumber(raw, 'tool_diameter_mm', 'cutter_diameter_mm', 'diameter_mm'),
    readAtomicNumber(resolvedTool ?? {}, 'tool_diameter_mm', 'cutter_diameter_mm', 'diameter_mm'),
  );
  const fluteCount = firstPositiveMetric(
    readAtomicNumber(raw, 'flutes', 'number_of_flutes', 'flute_count', 'teeth'),
    readAtomicNumber(resolvedTool ?? {}, 'flutes', 'number_of_flutes', 'flute_count', 'teeth'),
  );
  const rawCuttingSpeed = readAtomicNumber(raw, 'cutting_speed_mpm', 'cutting_speed_m_per_min', 'cutting_speed_m_min');
  const cuttingSpeedFromSfm = positiveMetric(readAtomicNumber(raw, 'sfm', 'cutting_speed_sfm')) != null
    ? roundMetric((readAtomicNumber(raw, 'sfm', 'cutting_speed_sfm') ?? 0) * 0.3048, 4)
    : undefined;
  const rawRpm = readAtomicNumber(raw, 'spindle_rpm', 'spindle_speed_rpm', 'rpm');
  const cuttingSpeedFromRpm =
    (rawRpm ?? 0) > 0 && (toolDiameterMm ?? 0) > 0
      ? roundMetric((Math.PI * (toolDiameterMm ?? 0) * (rawRpm ?? 0)) / 1000, 4)
      : undefined;
  const cuttingSpeed = (rawCuttingSpeed ?? 0) > 0
    ? rawCuttingSpeed
    : firstPositiveMetric(cuttingSpeedFromSfm, cuttingSpeedFromRpm);
  const rpmFromCuttingSpeed =
    (cuttingSpeed ?? 0) > 0 && (toolDiameterMm ?? 0) > 0
      ? roundMetric(((cuttingSpeed ?? 0) * 1000) / (Math.PI * (toolDiameterMm ?? 1)), 3)
      : undefined;
  const rpm = (rawRpm ?? 0) > 0 ? rawRpm : rpmFromCuttingSpeed;
  const rawFeedRate = readAtomicNumber(raw, 'feed_rate_mmmin', 'feed_rate_mm_min', 'feed_mm_min', 'feed_rate');
  const rawFeedPerTooth = readAtomicNumber(raw, 'feed_per_tooth_mm', 'feed_per_tooth', 'chipload_mm', 'chip_load_mm', 'fz_mm');
  const feedPerToothFromFeedRate =
    (rawFeedRate ?? 0) > 0 && (rpm ?? 0) > 0 && (fluteCount ?? 0) > 0
      ? roundMetric((rawFeedRate ?? 0) / ((rpm ?? 1) * (fluteCount ?? 1)), 5)
      : undefined;
  const feedPerTooth = (rawFeedPerTooth ?? 0) > 0 ? rawFeedPerTooth : feedPerToothFromFeedRate;
  const feedRateFromChipload =
    (rpm ?? 0) > 0 && (fluteCount ?? 0) > 0 && (feedPerTooth ?? 0) > 0
      ? roundMetric((rpm ?? 0) * (fluteCount ?? 0) * (feedPerTooth ?? 0), 3)
      : undefined;
  const feedRate = (rawFeedRate ?? 0) > 0 ? rawFeedRate : feedRateFromChipload;
  const tangentialForceN = readAtomicNumber(raw, 'tangential_force_N', 'cutting_force_N');
  const rawPowerKw = readAtomicNumber(raw, 'power_kw', 'power_kW', 'cutting_power_kw');
  const fallbackPowerKw =
    (!Number.isFinite(rawPowerKw)
      || (rawPowerKw ?? 0) <= 0)
      && (tangentialForceN ?? 0) > 0
      && (cuttingSpeed ?? 0) > 0
      ? roundMetric(((tangentialForceN ?? 0) * (cuttingSpeed ?? 0)) / 60000, 4)
      : undefined;
  const powerKw = (rawPowerKw ?? 0) > 0 ? rawPowerKw : fallbackPowerKw;
  const rawTorqueNm = readAtomicNumber(raw, 'torque_Nm', 'torque_nm');
  const fallbackTorqueNm =
    (!(rawTorqueNm ?? 0) || (rawTorqueNm ?? 0) <= 0)
      && (powerKw ?? 0) > 0
      && (rpm ?? 0) > 0
      ? roundMetric(((powerKw ?? 0) * 30000) / (Math.PI * (rpm ?? 1)), 4)
      : undefined;
  const effectiveCornerRadiusMm = readAtomicNumber(resolvedTool ?? {}, 'corner_radius_mm');
  const rawRa = readAtomicNumber(raw, 'surface_finish_Ra_um', 'surface_finish_ra_um', 'surface_finish_Ra', 'surface_finish_ra');
  const fallbackRa =
    (!(rawRa ?? 0)
      || (rawRa ?? 0) <= 0)
      && (feedPerTooth ?? 0) > 0
      && (effectiveCornerRadiusMm ?? 0) > 0
      ? roundMetric((((feedPerTooth ?? 0) ** 2) * 1000) / (32 * (effectiveCornerRadiusMm ?? 1)), 4)
      : undefined;
  const warnings = readStrings(raw.playbook_warnings);
  const limitingFactors = readLimitingFactors(raw.limiting_factors);
  const safetyChecks = readSafetyChecks(raw.safety_checks);
  const recommendations = readStrings(raw.recommendations);
  const formulas = readStrings(raw.formulas_used);
  const engines = readStrings(raw.engines_called);
  const rawToolLife = readAtomicNumber(raw, 'tool_life_min', 'tool_life_minutes');
  const toolLife = normalizeToolLifeMinutes(rawToolLife);
  const axialDepthMm = readAtomicNumber(raw, 'axial_depth_mm', 'doc_mm');
  const radialDepthMm = readAtomicNumber(raw, 'radial_depth_mm', 'woc_mm');
  const rawMrrCm3Min = readAtomicNumber(raw, 'mrr_cm3min', 'mrr_cm3_min');
  const rawMrrMm3Min = readAtomicNumber(raw, 'mrr_mm3min', 'mrr_mm3_min', 'mrr_mm3_per_min');
  const mrrFromMm3Min = (rawMrrMm3Min ?? 0) > 0 ? roundMetric((rawMrrMm3Min ?? 0) / 1000, 4) : undefined;
  const fallbackMrr =
    (axialDepthMm ?? 0) > 0 && (radialDepthMm ?? 0) > 0 && (feedRate ?? 0) > 0
      ? roundMetric(((axialDepthMm ?? 0) * (radialDepthMm ?? 0) * (feedRate ?? 0)) / 1000, 4)
      : undefined;
  const mrr = (rawMrrCm3Min ?? 0) > 0 ? rawMrrCm3Min : firstPositiveMetric(mrrFromMm3Min, fallbackMrr);

  const combinedWarnings = sanitizeList([
    ...warnings,
    ...limitingFactors,
    ...safetyChecks.filter((entry) => /fail|limit|warning|critical|unsafe/i.test(entry)),
    rawToolLife != null && rawToolLife >= 9999
      ? 'Tool life estimate exceeded the modeled range; verify wear on-machine before treating it as open-ended.'
      : undefined,
  ]);

  return {
    rpm,
    cuttingSpeed,
    feedRate,
    feedPerTooth,
    mrr,
    powerKw,
    torqueNm: (rawTorqueNm ?? 0) > 0 ? rawTorqueNm : fallbackTorqueNm,
    toolLife,
    ra: (rawRa ?? 0) > 0 ? rawRa : fallbackRa,
    deflectionUm: readAtomicNumber(raw, 'deflection_um', 'tool_deflection_um'),
    axialDepthMm,
    radialDepthMm,
    confidence: readAtomicNumber(raw, 'overall_confidence', 'confidence'),
    warnings: combinedWarnings,
    recommendations,
    safetyChecks,
    limitingFactors,
    formulas,
    engines,
    formula: formulas[0] ?? engines[0],
    resolvedMachineLabel: unwrapAtomicText(asRecord(raw.resolved_machine)?.name),
    resolvedToolLabel: readAtomicText(resolvedTool ?? {}, 'material', 'series', 'grade'),
    resolvedHolderLabel: unwrapAtomicText(asRecord(raw.resolved_holder)?.type),
    resolvedMaterialLabel: unwrapAtomicText(asRecord(raw.resolved_material)?.name),
    resolvedCamLabel: unwrapAtomicText(asRecord(raw.resolved_cam_strategy)?.strategy_name),
  };
}
