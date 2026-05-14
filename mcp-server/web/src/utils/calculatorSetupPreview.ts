import type { HolderPackageOption } from '../api/calculatorData';
import type { CalculatorCoolantStrategyRecommendation } from './calculatorCoolantStrategy';
import type { MachineCatalogItem, MachineMode, MaterialCatalogItem, SelectionOption, ToolCatalogItem } from '../data/calculatorWorkspace';

export type SetupPreviewZone = 'spindle' | 'holder' | 'tool' | 'cut';
export type SetupPreviewSeverity = 'ready' | 'watch' | 'fail';

export interface SetupPreviewRisk {
  id: string;
  title: string;
  detail: string;
  severity: SetupPreviewSeverity;
  zone: SetupPreviewZone;
}

export interface CalculatorSetupPreviewDimensions {
  machineMode: MachineMode;
  orientation: 'vertical' | 'horizontal';
  interfaceLabel: string;
  holderLabel: string;
  toolLabel: string;
  spindleHousingDiameterMm: number;
  spindleHousingLengthMm: number;
  spindleGaugeDiameterMm: number;
  spindleGaugeLengthMm: number;
  holderGaugeDiameterMm: number;
  holderGaugeLengthMm: number;
  holderBodyDiameterMm: number;
  holderBodyLengthMm: number;
  toolShankDiameterMm: number;
  toolCutDiameterMm: number;
  toolStickoutMm: number;
  fluteLengthMm: number;
  workpieceWidthMm: number;
  workpieceDepthMm: number;
  engagementDocMm: number;
  engagementWocMm: number;
}

export interface CalculatorSetupPreviewModel {
  isComplete: boolean;
  severity: SetupPreviewSeverity;
  statusLabel: string;
  summary: string;
  interfaceFamily: string;
  machineSummary: string;
  holderSummary: string;
  toolSummary: string;
  metrics: {
    reachRatio: number;
    docToDiameterRatio: number;
    wocToDiameterRatio: number;
    liveRpmPercent?: number;
  };
  risks: SetupPreviewRisk[];
  zoneSeverity: Record<SetupPreviewZone, SetupPreviewSeverity>;
  dimensions: CalculatorSetupPreviewDimensions;
}

export interface CalculatorSetupPreviewInput {
  machineMode: MachineMode;
  machine?: MachineCatalogItem | null;
  spindleOption?: Pick<SelectionOption, 'label'> | null;
  holderPackage?: HolderPackageOption | null;
  tool?: ToolCatalogItem | null;
  material?: MaterialCatalogItem | null;
  toolpath?: {
    label: string;
    path: string;
    operationId: string;
  } | null;
  toolDiameterMm: number;
  docMm: number;
  wocMm: number;
  stockXMm?: number;
  stockYMm?: number;
  stockZMm?: number;
  toolStickoutMmOverride?: number;
  fluteLengthMmOverride?: number;
  coolantId?: string;
  coolantRecommendation?: CalculatorCoolantStrategyRecommendation | null;
  liveRpm?: number;
  warnings?: string[];
}

type InterfaceProfile = {
  family: string;
  label: string;
  housingDiameterMm: number;
  housingLengthMm: number;
  gaugeDiameterMm: number;
  gaugeLengthMm: number;
  holderGaugeDiameterMm: number;
  holderGaugeLengthMm: number;
};

const DEFAULT_INTERFACE_PROFILE: InterfaceProfile = {
  family: 'generic',
  label: 'Machine-standard taper',
  housingDiameterMm: 165,
  housingLengthMm: 124,
  gaugeDiameterMm: 58,
  gaugeLengthMm: 54,
  holderGaugeDiameterMm: 54,
  holderGaugeLengthMm: 68,
};

const INTERFACE_PROFILE_MAP: Record<string, InterfaceProfile> = {
  iso20: {
    family: 'iso20',
    label: 'ISO20',
    housingDiameterMm: 96,
    housingLengthMm: 88,
    gaugeDiameterMm: 28,
    gaugeLengthMm: 34,
    holderGaugeDiameterMm: 25,
    holderGaugeLengthMm: 48,
  },
  bt30: {
    family: 'bt30',
    label: 'BT30 / Big Plus 30',
    housingDiameterMm: 140,
    housingLengthMm: 112,
    gaugeDiameterMm: 40,
    gaugeLengthMm: 46,
    holderGaugeDiameterMm: 38,
    holderGaugeLengthMm: 58,
  },
  cat40: {
    family: 'cat40',
    label: 'CAT40 / Big Plus 40',
    housingDiameterMm: 176,
    housingLengthMm: 132,
    gaugeDiameterMm: 54,
    gaugeLengthMm: 56,
    holderGaugeDiameterMm: 50,
    holderGaugeLengthMm: 74,
  },
  cat50: {
    family: 'cat50',
    label: 'CAT50 / Big Plus 50',
    housingDiameterMm: 208,
    housingLengthMm: 150,
    gaugeDiameterMm: 71,
    gaugeLengthMm: 72,
    holderGaugeDiameterMm: 68,
    holderGaugeLengthMm: 86,
  },
  hsk63: {
    family: 'hsk63',
    label: 'HSK63A',
    housingDiameterMm: 154,
    housingLengthMm: 114,
    gaugeDiameterMm: 64,
    gaugeLengthMm: 34,
    holderGaugeDiameterMm: 61,
    holderGaugeLengthMm: 58,
  },
  hsk40: {
    family: 'hsk40',
    label: 'HSK-C40',
    housingDiameterMm: 120,
    housingLengthMm: 96,
    gaugeDiameterMm: 40,
    gaugeLengthMm: 26,
    holderGaugeDiameterMm: 38,
    holderGaugeLengthMm: 52,
  },
  hsk100: {
    family: 'hsk100',
    label: 'HSK100A',
    housingDiameterMm: 214,
    housingLengthMm: 150,
    gaugeDiameterMm: 100,
    gaugeLengthMm: 44,
    holderGaugeDiameterMm: 96,
    holderGaugeLengthMm: 72,
  },
  capto_c6: {
    family: 'capto-c6',
    label: 'Capto C6',
    housingDiameterMm: 150,
    housingLengthMm: 118,
    gaugeDiameterMm: 64,
    gaugeLengthMm: 48,
    holderGaugeDiameterMm: 63,
    holderGaugeLengthMm: 64,
  },
  capto_c8: {
    family: 'capto-c8',
    label: 'Capto C8',
    housingDiameterMm: 188,
    housingLengthMm: 136,
    gaugeDiameterMm: 80,
    gaugeLengthMm: 56,
    holderGaugeDiameterMm: 79,
    holderGaugeLengthMm: 74,
  },
  vdi40: {
    family: 'vdi40',
    label: 'VDI40',
    housingDiameterMm: 122,
    housingLengthMm: 104,
    gaugeDiameterMm: 40,
    gaugeLengthMm: 80,
    holderGaugeDiameterMm: 40,
    holderGaugeLengthMm: 92,
  },
  vdi50: {
    family: 'vdi50',
    label: 'VDI50',
    housingDiameterMm: 146,
    housingLengthMm: 116,
    gaugeDiameterMm: 50,
    gaugeLengthMm: 88,
    holderGaugeDiameterMm: 50,
    holderGaugeLengthMm: 98,
  },
  bmt65: {
    family: 'bmt65',
    label: 'BMT65',
    housingDiameterMm: 144,
    housingLengthMm: 112,
    gaugeDiameterMm: 65,
    gaugeLengthMm: 28,
    holderGaugeDiameterMm: 64,
    holderGaugeLengthMm: 58,
  },
};

function severityRank(severity: SetupPreviewSeverity) {
  switch (severity) {
    case 'fail':
      return 2;
    case 'watch':
      return 1;
    case 'ready':
    default:
      return 0;
  }
}

function maxSeverity(...values: SetupPreviewSeverity[]) {
  return values.reduce<SetupPreviewSeverity>((current, value) => (
    severityRank(value) > severityRank(current) ? value : current
  ), 'ready');
}

function roundMetric(value: number, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

function safeRatio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function interfaceSignature(...parts: Array<string | null | undefined>) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeInterfaceFamily(input?: string | null) {
  const text = input?.toLowerCase() ?? '';
  if (!text) return '';
  if (/(cat|bt|ct)[ -]?40|big[ +]?plus.*40|40 taper/.test(text)) return 'cat40';
  if (/(cat|bt|ct)[ -]?50|big[ +]?plus.*50|50 taper/.test(text)) return 'cat50';
  if (/iso[ -]?20/.test(text)) return 'iso20';
  if (/(bt|big[ +]?plus)[ -]?30|30 taper/.test(text)) return 'bt30';
  if (/hsk[ -]?[ce][ -]?40/.test(text) || /hsk[ -]?40/.test(text)) return 'hsk40';
  if (/hsk[ -]?63/.test(text)) return 'hsk63';
  if (/hsk[ -]?100/.test(text)) return 'hsk100';
  if (/capto.*c6|c6 capto/.test(text)) return 'capto_c6';
  if (/capto.*c8|c8 capto/.test(text)) return 'capto_c8';
  if (/vdi[ -]?40/.test(text)) return 'vdi40';
  if (/vdi[ -]?50/.test(text)) return 'vdi50';
  if (/bmt[ -]?65/.test(text)) return 'bmt65';
  return '';
}

function resolveInterfaceProfile(input: CalculatorSetupPreviewInput) {
  const signature = interfaceSignature(
    input.spindleOption?.label,
    input.machine?.toolingLayout?.spindleConnectionLabel,
    input.machine?.toolingLayout?.interface,
    input.holderPackage?.spindleInterface,
    input.holderPackage?.toolInterface,
  );
  const family = normalizeInterfaceFamily(signature);
  return INTERFACE_PROFILE_MAP[family] ?? DEFAULT_INTERFACE_PROFILE;
}

function holderGeometrySignature(holderPackage?: HolderPackageOption | null) {
  return `${holderPackage?.label ?? ''} ${holderPackage?.detail ?? ''} ${holderPackage?.holderType ?? ''} ${holderPackage?.holderSubcategory ?? ''}`.toLowerCase();
}

function toolGeometrySignature(tool?: ToolCatalogItem | null) {
  return `${tool?.label ?? ''} ${tool?.family ?? ''} ${tool?.description ?? ''} ${tool?.geometryClass ?? ''}`.toLowerCase();
}

function isLiveToolTurningSignature(signature: string) {
  return [
    'live tool',
    'live-tool',
    'live tooling',
    'live-tooling',
    'live milling',
    'mill-turn',
    'mill/turn',
    'driven tool',
    'driven-tool',
    'c/y',
    'c-axis',
    'y-axis',
    'milling head',
    'cross milling',
  ].some((keyword) => signature.includes(keyword));
}

function toolpathFamily(
  toolpath: CalculatorSetupPreviewInput['toolpath'],
  tool?: ToolCatalogItem | null,
) {
  const signature = `${toolpath?.label ?? ''} ${toolpath?.path ?? ''} ${toolGeometrySignature(tool)}`.toLowerCase();
  if (!toolpath && !tool) return 'general';
  if (signature.includes('drill') || signature.includes('ream')) return 'drilling';
  if (signature.includes('tap') || signature.includes('thread')) return 'threading';
  if (signature.includes('groov') || signature.includes('parting') || signature.includes('cutoff')) return 'grooving';
  if (signature.includes('boring')) return 'boring';
  if (toolpath?.operationId === 'turning_finish' && isLiveToolTurningSignature(signature)) return 'live_milling';
  if (signature.includes('parallel') || signature.includes('flow') || signature.includes('scallop') || signature.includes('surface')) {
    return 'surface_finish';
  }
  if (signature.includes('face')) return 'face_milling';
  if (signature.includes('adaptive') || signature.includes('dynamic') || signature.includes('rough') || signature.includes('high feed')) {
    return 'roughing';
  }
  if (toolpath?.operationId === 'turning_finish') return 'turning_finish';
  if (toolpath?.operationId === 'turning_rough') return 'turning_rough';
  return toolpath?.operationId ?? 'general';
}

function buildHolderDimensions(
  input: CalculatorSetupPreviewInput,
  interfaceProfile: InterfaceProfile,
) {
  const signature = holderGeometrySignature(input.holderPackage);
  const toolDiameter = Math.max(input.toolDiameterMm || input.tool?.defaultDiameter || 12, 4);
  let bodyDiameter = Math.max(interfaceProfile.holderGaugeDiameterMm * 0.92, toolDiameter * 1.75);
  let bodyLength = 84;

  if (signature.includes('shell')) {
    bodyDiameter = Math.max(interfaceProfile.holderGaugeDiameterMm * 1.08, toolDiameter * 0.9);
    bodyLength = 62;
  } else if (signature.includes('hydraulic')) {
    bodyDiameter = Math.max(interfaceProfile.holderGaugeDiameterMm * 0.92, toolDiameter * 1.9);
    bodyLength = 96;
  } else if (signature.includes('shrink')) {
    bodyDiameter = Math.max(interfaceProfile.holderGaugeDiameterMm * 0.84, toolDiameter * 1.55);
    bodyLength = 102;
  } else if (signature.includes('collet') || signature.includes('er')) {
    bodyDiameter = Math.max(interfaceProfile.holderGaugeDiameterMm * 0.9, toolDiameter * 1.65);
    bodyLength = 92;
  } else if (signature.includes('boring')) {
    bodyDiameter = Math.max(interfaceProfile.holderGaugeDiameterMm * 0.82, toolDiameter * 2.2);
    bodyLength = 112;
  } else if (signature.includes('live')) {
    bodyDiameter = Math.max(interfaceProfile.holderGaugeDiameterMm, toolDiameter * 2.2);
    bodyLength = 104;
  }

  return {
    holderGaugeDiameterMm: interfaceProfile.holderGaugeDiameterMm,
    holderGaugeLengthMm: interfaceProfile.holderGaugeLengthMm,
    holderBodyDiameterMm: roundMetric(bodyDiameter, 1),
    holderBodyLengthMm: roundMetric(bodyLength, 1),
  };
}

function buildToolDimensions(input: CalculatorSetupPreviewInput) {
  const tool = input.tool;
  const diameter = Math.max(input.toolDiameterMm || tool?.defaultDiameter || 12, 2);
  const signature = toolGeometrySignature(tool);
  const geometry = tool?.geometryClass;
  const publishedFluteLength = Number.isFinite(tool?.fluteLengthMm) && (tool?.fluteLengthMm ?? 0) > 0
    ? (tool?.fluteLengthMm as number)
    : undefined;
  const publishedOverallLength = Number.isFinite(tool?.overallLengthMm) && (tool?.overallLengthMm ?? 0) > 0
    ? (tool?.overallLengthMm as number)
    : undefined;
  const compactFluteFloor =
    diameter <= 3 ? 6 :
    diameter <= 6 ? 8 :
    diameter <= 10 ? 12 :
    18;
  const compactClearanceFloor =
    diameter <= 3 ? 4 :
    diameter <= 6 ? 6 :
    diameter <= 10 ? 10 :
    16;
  let fluteLength = publishedFluteLength ?? Math.max(diameter * 2.2, compactFluteFloor);
  let stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 1.8, compactClearanceFloor));
  let shankDiameter = diameter;

  if (geometry === 'face-mill') {
    fluteLength = publishedFluteLength ?? Math.max(Math.min(diameter * 0.28, 22), 10);
    stickout = publishedOverallLength ?? Math.max(diameter * 0.55, 38);
    shankDiameter = Math.max(diameter * 0.52, 22);
  } else if (geometry === 'ball-endmill') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 2.6, diameter <= 6 ? 8 : 20);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 2.2, diameter <= 6 ? 8 : 24));
  } else if (geometry === 'drill') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 5, diameter <= 6 ? 18 : 32);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 2.5, diameter <= 6 ? 12 : 24));
    shankDiameter = Math.max(diameter, diameter * 0.94);
  } else if (geometry === 'tap' || geometry === 'reamer') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 4.4, diameter <= 6 ? 14 : 24);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 2.2, diameter <= 6 ? 10 : 22));
  } else if (geometry === 'boring-bar') {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 2.4, 18);
    stickout = publishedOverallLength ?? (fluteLength + Math.max(diameter * 5, 60));
    shankDiameter = Math.max(diameter * 1.6, 20);
  } else if (
    geometry === 'roughing-insert'
    || geometry === 'finishing-insert'
    || geometry === 'grooving-insert'
    || geometry === 'threading-insert'
    || signature.includes('turning insert')
  ) {
    fluteLength = publishedFluteLength ?? Math.max(diameter * 0.65, 8);
    stickout = publishedOverallLength ?? Math.max(diameter * 1.8, 28);
    shankDiameter = Math.max(diameter * 1.3, 16);
  } else if (signature.includes('long reach') || signature.includes('extended')) {
    if (!publishedOverallLength) stickout *= 1.22;
  }

  if (Number.isFinite(input.fluteLengthMmOverride) && (input.fluteLengthMmOverride ?? 0) > 0) {
    fluteLength = Math.max(input.fluteLengthMmOverride ?? fluteLength, diameter * 0.35);
  }
  if (Number.isFinite(input.toolStickoutMmOverride) && (input.toolStickoutMmOverride ?? 0) > 0) {
    stickout = Math.max(input.toolStickoutMmOverride ?? stickout, fluteLength + Math.max(diameter * 0.25, 2));
  }

  return {
    toolShankDiameterMm: roundMetric(Math.max(shankDiameter, Math.min(diameter * 1.12, diameter + 8)), 1),
    toolCutDiameterMm: roundMetric(diameter, 1),
    fluteLengthMm: roundMetric(fluteLength, 1),
    toolStickoutMm: roundMetric(stickout, 1),
  };
}

function workpieceDimensions(input: CalculatorSetupPreviewInput, toolDimensions: ReturnType<typeof buildToolDimensions>) {
  const baseWidth = Math.max(input.stockXMm || 0, input.stockYMm || 0, toolDimensions.toolCutDiameterMm * 4.5, 70);
  const baseDepth = Math.max(input.stockZMm || 0, toolDimensions.toolCutDiameterMm * 1.6, 34);
  return {
    width: roundMetric(baseWidth, 1),
    depth: roundMetric(baseDepth, 1),
  };
}

function addRisk(
  risks: SetupPreviewRisk[],
  severity: SetupPreviewSeverity,
  zone: SetupPreviewZone,
  id: string,
  title: string,
  detail: string,
) {
  risks.push({ id, title, detail, severity, zone });
}

function warningSeverity(message: string): SetupPreviewSeverity {
  const normalized = message.toLowerCase();
  if (
    /(collision|interference|limit|overload|stall|impossible|exceed|unsupported|not support|tool break|crash|too much)/.test(
      normalized,
    )
  ) {
    return 'fail';
  }
  return 'watch';
}

export function buildCalculatorSetupPreview(input: CalculatorSetupPreviewInput): CalculatorSetupPreviewModel {
  const interfaceProfile = resolveInterfaceProfile(input);
  const holder = buildHolderDimensions(input, interfaceProfile);
  const tool = buildToolDimensions(input);
  const workpiece = workpieceDimensions(input, tool);
  const toolpathKind = toolpathFamily(input.toolpath, input.tool);
  const materialGroup = input.material?.group ?? 'steel';
  const reachRatio = safeRatio(tool.toolStickoutMm, tool.toolCutDiameterMm);
  const docToDiameterRatio = safeRatio(input.docMm, tool.toolCutDiameterMm);
  const wocToDiameterRatio = safeRatio(input.wocMm, tool.toolCutDiameterMm);
  const risks: SetupPreviewRisk[] = [];

  const machineInterfaceFamily = normalizeInterfaceFamily(
    interfaceSignature(
      input.spindleOption?.label,
      input.machine?.toolingLayout?.spindleConnectionLabel,
      input.machine?.toolingLayout?.interface,
    ),
  );
  const holderInterfaceFamily = normalizeInterfaceFamily(
    interfaceSignature(input.holderPackage?.spindleInterface, input.holderPackage?.toolInterface),
  );
  const toolInterfaceFamily = normalizeInterfaceFamily(input.tool?.holderInterface);

  if (machineInterfaceFamily && holderInterfaceFamily && machineInterfaceFamily !== holderInterfaceFamily) {
    addRisk(
      risks,
      'fail',
      'holder',
      'holder-interface-mismatch',
      'Holder does not match spindle taper',
      `The selected holder advertises ${input.holderPackage?.spindleInterface ?? holderInterfaceFamily}, but the active machine package looks like ${interfaceProfile.label}.`,
    );
  }

  if (toolInterfaceFamily && holderInterfaceFamily && toolInterfaceFamily !== holderInterfaceFamily) {
    addRisk(
      risks,
      'fail',
      'tool',
      'tool-interface-mismatch',
      'Tool and holder interfaces conflict',
      `The tool expects ${input.tool?.holderInterface}, while the holder is published as ${input.holderPackage?.toolInterface ?? input.holderPackage?.spindleInterface ?? 'machine-standard'}.`,
    );
  }

  let watchReachRatio = 6;
  let failReachRatio = 8;
  if (materialGroup === 'tool_steel' || materialGroup === 'superalloy' || input.material?.isoGroup === 'H') {
    watchReachRatio -= 0.75;
    failReachRatio -= 0.75;
  }
  if (toolpathKind === 'surface_finish' || toolpathKind === 'turning_finish') {
    watchReachRatio -= 0.5;
    failReachRatio -= 0.5;
  }
  if (reachRatio >= failReachRatio) {
    addRisk(
      risks,
      'fail',
      'tool',
      'tool-stickout-fail',
      'Tool stickout is too aggressive',
      `Stickout is ${roundMetric(reachRatio, 1)}× tool diameter, which is high for ${input.material?.name ?? 'this setup'} and likely to deflect or chatter.`,
    );
  } else if (reachRatio >= watchReachRatio) {
    addRisk(
      risks,
      'watch',
      'tool',
      'tool-stickout-watch',
      'Stickout needs a rigidity check',
      `Stickout is ${roundMetric(reachRatio, 1)}× tool diameter. Verify holder reach, gauge line, and workholding rigidity before trusting finish or load.`,
    );
  }

  const toolMaxApMm = input.tool?.maxApMm;
  if (toolMaxApMm && input.docMm > toolMaxApMm * 1.05) {
    addRisk(
      risks,
      'fail',
      'cut',
      'axial-ap-fail',
      'DOC exceeds the published tool envelope',
      `Axial DOC is ${roundMetric(input.docMm, 2)} mm while the tool body is rated around ${roundMetric(toolMaxApMm, 2)} mm.`,
    );
  } else if (toolMaxApMm && input.docMm > toolMaxApMm * 0.9) {
    addRisk(
      risks,
      'watch',
      'cut',
      'axial-ap-watch',
      'DOC is near the tool limit',
      `Axial DOC is ${roundMetric(input.docMm, 2)} mm against an estimated ${roundMetric(toolMaxApMm, 2)} mm tool body limit.`,
    );
  } else if (toolpathKind === 'surface_finish' && docToDiameterRatio > 0.4) {
    addRisk(
      risks,
      'fail',
      'cut',
      'finish-doc-fail',
      'Finish DOC is too deep',
      `This finish-biased path is running ${roundMetric(docToDiameterRatio, 2)}×D axially, which is likely to wipe out the finish assumption.`,
    );
  } else if ((toolpathKind === 'surface_finish' || toolpathKind === 'turning_finish') && docToDiameterRatio > 0.22) {
    addRisk(
      risks,
      'watch',
      'cut',
      'finish-doc-watch',
      'Finish DOC looks heavy',
      `Axial DOC is ${roundMetric(docToDiameterRatio, 2)}×D. Double-check whether this should still be treated as a finishing pass.`,
    );
  }

  if (toolpathKind === 'surface_finish' && wocToDiameterRatio > 0.16) {
    addRisk(
      risks,
      'fail',
      'cut',
      'finish-woc-fail',
      'Finish stepover is too wide',
      `Radial engagement is ${roundMetric(wocToDiameterRatio, 2)}×D, which is high for a finish-biased surface pass.`,
    );
  } else if (toolpathKind === 'surface_finish' && wocToDiameterRatio > 0.1) {
    addRisk(
      risks,
      'watch',
      'cut',
      'finish-woc-watch',
      'Finish stepover needs review',
      `Radial engagement is ${roundMetric(wocToDiameterRatio, 2)}×D. A finer stepover would better match the finish intent.`,
    );
  } else if (toolpathKind === 'roughing' && input.tool?.geometryClass !== 'face-mill' && wocToDiameterRatio > 0.55) {
    addRisk(
      risks,
      'fail',
      'cut',
      'roughing-woc-fail',
      'Roughing engagement is too high',
      `Radial engagement is ${roundMetric(wocToDiameterRatio, 2)}×D, which is aggressive for this cutter family and likely to spike load.`,
    );
  } else if (toolpathKind === 'roughing' && input.tool?.geometryClass !== 'face-mill' && wocToDiameterRatio > 0.38) {
    addRisk(
      risks,
      'watch',
      'cut',
      'roughing-woc-watch',
      'Roughing engagement is heavy',
      `Radial engagement is ${roundMetric(wocToDiameterRatio, 2)}×D. Confirm the machine, holder, and workholding can carry that cut.`,
    );
  }

  const liveRpm = input.liveRpm;
  if (input.tool?.maxRpm && input.tool.maxRpm > 0 && liveRpm) {
    const utilization = safeRatio(liveRpm, input.tool.maxRpm);
    if (utilization > 1.02) {
      addRisk(
        risks,
        'fail',
        'spindle',
        'tool-rpm-fail',
        'Tool RPM exceeds the published ceiling',
        `Live spindle speed is ${roundMetric(liveRpm, 0)} RPM against a published ${input.tool.maxRpm.toLocaleString()} RPM tool limit.`,
      );
    } else if (utilization > 0.92) {
      addRisk(
        risks,
        'watch',
        'spindle',
        'tool-rpm-watch',
        'Tool RPM is close to its ceiling',
        `Live spindle speed is ${roundMetric(liveRpm, 0)} RPM against a published ${input.tool.maxRpm.toLocaleString()} RPM limit.`,
      );
    }
  }

  const holderMaxRpm = input.holderPackage?.maxRpm;
  const spindleDemandRpm = liveRpm ?? input.machine?.spindleRpm ?? undefined;
  if (holderMaxRpm && spindleDemandRpm && spindleDemandRpm > holderMaxRpm * 1.02) {
    addRisk(
      risks,
      'watch',
      'holder',
      'holder-rpm-watch',
      'Holder package is the RPM bottleneck',
      `The holder package is published near ${holderMaxRpm.toLocaleString()} RPM, which is lower than the active spindle demand of ${roundMetric(spindleDemandRpm, 0).toLocaleString()} RPM.`,
    );
  }

  if (input.coolantRecommendation?.alignment === 'tradeoff') {
    const severity =
      toolpathKind === 'drilling'
      || toolpathKind === 'threading'
      || toolpathKind === 'boring'
      || materialGroup === 'stainless'
      || materialGroup === 'superalloy'
      || materialGroup === 'titanium'
        ? 'fail'
        : 'watch';
    addRisk(
      risks,
      severity,
      'cut',
      'coolant-tradeoff',
      'Coolant posture is off the recommended strategy',
      input.coolantRecommendation.rationale,
    );
  }

  if (
    input.machineMode === 'mill'
    && input.tool?.requiresLiveTooling
    && input.machine?.toolingLayout?.liveTooling === false
  ) {
    addRisk(
      risks,
      'fail',
      'spindle',
      'machine-live-tooling-mismatch',
      'Machine package does not support the active tooling posture',
      'The selected tool requires a live tooling posture that is not published on the active machine package.',
    );
  }

  if (
    input.machineMode === 'mill'
    && /swarf|5-axis|multiaxis|simultaneous/i.test(`${input.toolpath?.label ?? ''} ${input.toolpath?.path ?? ''}`)
    && !/(5|trt)/i.test(input.machine?.axes ?? '')
  ) {
    addRisk(
      risks,
      'fail',
      'spindle',
      'axis-capability-mismatch',
      'Machine axis package does not match the selected toolpath',
      `The toolpath looks multiaxis, but the active machine is published as ${input.machine?.axes ?? 'axis package pending'}.`,
    );
  }

  input.warnings?.slice(0, 3).forEach((warning, index) => {
    addRisk(
      risks,
      warningSeverity(warning),
      /holder|interface|gauge/i.test(warning) ? 'holder' : /rpm|spindle|power|torque/i.test(warning) ? 'spindle' : 'cut',
      `live-warning-${index}`,
      index === 0 ? 'Live solver warning' : 'Additional live warning',
      warning,
    );
  });

  const zoneSeverity: Record<SetupPreviewZone, SetupPreviewSeverity> = {
    spindle: 'ready',
    holder: 'ready',
    tool: 'ready',
    cut: 'ready',
  };
  for (const risk of risks) {
    zoneSeverity[risk.zone] = maxSeverity(zoneSeverity[risk.zone], risk.severity);
  }

  const severity = risks.reduce<SetupPreviewSeverity>((current, risk) => maxSeverity(current, risk.severity), 'ready');
  const isComplete = Boolean(input.machine && input.tool && input.holderPackage);
  const summary =
    !isComplete
      ? 'Select a machine, holder, and tool to generate a live setup preview.'
      : severity === 'fail'
        ? `${risks.filter((risk) => risk.severity === 'fail').length} likely failure point${risks.filter((risk) => risk.severity === 'fail').length === 1 ? '' : 's'} highlighted in red.`
        : severity === 'watch'
          ? `${risks.length} setup watchpoint${risks.length === 1 ? '' : 's'} highlighted before release.`
          : 'Spindle, holder, tool, and cut posture look aligned for the current setup.';

  return {
    isComplete,
    severity,
    statusLabel:
      !isComplete
        ? 'Awaiting setup'
        : severity === 'fail'
          ? 'High failure risk'
          : severity === 'watch'
            ? 'Watch setup'
            : 'Setup aligned',
    summary,
    interfaceFamily: interfaceProfile.label,
    machineSummary: input.machine ? `${input.machine.manufacturer} ${input.machine.model}` : 'Machine pending',
    holderSummary: input.holderPackage?.label ?? 'Holder pending',
    toolSummary: input.tool?.label ?? 'Tool pending',
    metrics: {
      reachRatio: roundMetric(reachRatio, 1),
      docToDiameterRatio: roundMetric(docToDiameterRatio, 2),
      wocToDiameterRatio: roundMetric(wocToDiameterRatio, 2),
      liveRpmPercent: liveRpm && input.tool?.maxRpm ? roundMetric(safeRatio(liveRpm, input.tool.maxRpm) * 100, 0) : undefined,
    },
    risks,
    zoneSeverity,
    dimensions: {
      machineMode: input.machineMode,
      orientation: input.machineMode === 'lathe' ? 'horizontal' : 'vertical',
      interfaceLabel: interfaceProfile.label,
      holderLabel: input.holderPackage?.label ?? 'Machine-standard holder',
      toolLabel: input.tool?.label ?? 'Tool pending',
      spindleHousingDiameterMm: interfaceProfile.housingDiameterMm,
      spindleHousingLengthMm: interfaceProfile.housingLengthMm,
      spindleGaugeDiameterMm: interfaceProfile.gaugeDiameterMm,
      spindleGaugeLengthMm: interfaceProfile.gaugeLengthMm,
      holderGaugeDiameterMm: holder.holderGaugeDiameterMm,
      holderGaugeLengthMm: holder.holderGaugeLengthMm,
      holderBodyDiameterMm: holder.holderBodyDiameterMm,
      holderBodyLengthMm: holder.holderBodyLengthMm,
      toolShankDiameterMm: tool.toolShankDiameterMm,
      toolCutDiameterMm: tool.toolCutDiameterMm,
      toolStickoutMm: tool.toolStickoutMm,
      fluteLengthMm: tool.fluteLengthMm,
      workpieceWidthMm: workpiece.width,
      workpieceDepthMm: workpiece.depth,
      engagementDocMm: roundMetric(Math.max(input.docMm, 0.2), 2),
      engagementWocMm: roundMetric(Math.max(input.wocMm, Math.min(tool.toolCutDiameterMm * 0.08, 1)), 2),
    },
  };
}
