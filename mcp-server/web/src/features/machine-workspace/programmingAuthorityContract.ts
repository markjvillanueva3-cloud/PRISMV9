import type {
  MachineCatalogItem,
  MachineMode,
  ProgrammingEnvironmentOption,
  ProgrammingToolpathOption,
  SelectionOption,
} from '../../data/calculatorWorkspace';

type ProgrammingEnvironmentLike = {
  id: string;
  mode: MachineMode;
  kind: 'manual' | 'cam' | 'nesting';
  toolpaths: ProgrammingToolpathOption[];
};

type ProgrammingMachineProfile = Pick<MachineCatalogItem, 'machineTypeId' | 'toolingLayout'>;

export type ToolpathTypeOption = {
  id: string;
  label: string;
  count: number;
};

export type ProgrammingSelectionState = {
  licenseTierId: string;
  toolpathTypeId: string;
  toolpathId: string;
};

export type ProgrammingSelectionContext = ProgrammingSelectionState & {
  licenseOptions: SelectionOption[];
  licensedToolpathOptions: ProgrammingToolpathOption[];
  toolpathTypes: ToolpathTypeOption[];
  selectedToolpathType: ToolpathTypeOption | undefined;
  filteredToolpathOptions: ProgrammingToolpathOption[];
  selectedToolpath: ProgrammingToolpathOption | undefined;
};

export type ToolpathDefaults = {
  docMm: number;
  wocMm: number;
  isAbsolute: boolean;
  entryStyle: string;
  finishTarget: string;
};

function labelForGenericOperation(operationId: string) {
  switch (operationId) {
    case 'roughing':
      return 'Roughing';
    case 'pocket_milling':
      return 'Pocketing';
    case 'shoulder_milling':
      return 'Contouring / profiling';
    case 'slot_milling':
      return 'Slotting';
    case 'finishing':
      return 'Finishing';
    case 'face_milling':
      return 'Face milling';
    case 'drilling':
      return 'Drilling';
    case 'threading':
      return 'Threading';
    case 'engraving':
      return 'Chamfer / engraving';
    default:
      return operationId.replace(/_/g, ' ');
  }
}

export function licenseOptionsFor(
  programming:
    | {
        id: string;
        mode: MachineMode;
        kind: 'manual' | 'cam' | 'nesting';
      }
    | undefined,
): SelectionOption[] {
  if (!programming) {
    return [{ id: 'full', label: 'Full access', detail: 'Show the full package catalog.' }];
  }

  if (programming.kind === 'manual') {
    return [{ id: 'manual-core', label: 'Manual workflow', detail: 'Use the full hand-coded / process-planning set.' }];
  }

  switch (programming.mode) {
    case 'mill':
      return [
        { id: 'core-2d', label: 'Core 2D seat', detail: '2D milling, contour, pocketing, and drilling basics.' },
        { id: 'advanced-3d', label: 'Advanced 3D seat', detail: 'Adds adaptive, 3D roughing, and full 3D finishing.' },
        { id: 'multiaxis', label: 'Multiaxis seat', detail: 'Includes simultaneous multiaxis, swarf, and specialty paths.' },
      ];
    case 'lathe':
      return [
        { id: 'turning-core', label: 'Turning core', detail: 'Standard rough, finish, groove, and drill/bore turning paths.' },
        { id: 'live-tooling', label: 'Live-tooling seat', detail: 'Adds driven-tool and mill-turn operations.' },
        { id: 'swiss-sync', label: 'Swiss / sync seat', detail: 'Includes synchronized Swiss and multi-channel flows.' },
      ];
    case 'wire_edm':
      return [
        { id: 'profile-core', label: 'Profile core', detail: 'Standard 2-axis / profile wire cutting.' },
        { id: 'taper-skim', label: 'Taper + skim', detail: 'Adds taper and skim-pass workflows.' },
        { id: 'full-wire', label: 'Full wire seat', detail: 'Includes slug retention, tabbing, and the full wire set.' },
      ];
    case 'edm':
      return [
        { id: 'burn-core', label: 'Burn core', detail: 'Primary cavity rough/finish burn workflows.' },
        { id: 'orbit-detail', label: 'Orbit + detail', detail: 'Adds orbit, detail, and wear-comp style workflows.' },
      ];
    case 'laser':
      return [
        { id: 'cut-core', label: 'Cut core', detail: 'Contour and basic sheet-cut workflows.' },
        { id: 'quality-nesting', label: 'Quality + nesting', detail: 'Adds edge-quality, microjoint, and nest-optimization paths.' },
      ];
    case 'waterjet':
      return [
        { id: 'cut-core', label: 'Cut core', detail: 'Standard abrasive contour cutting.' },
        { id: 'quality-taper', label: 'Quality + taper', detail: 'Adds taper, bevel, and advanced pierce strategy paths.' },
      ];
    default:
      return [{ id: 'full', label: 'Full access', detail: 'Show the full package catalog.' }];
  }
}

export function classifyToolpathType(toolpath: { label: string; path: string; operationId: string }) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  const isLiveToolTurningPath = [
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
    'thread mill',
    'circle mill',
    'helical bore',
    'planar mill',
  ].some((keyword) => signature.includes(keyword));
  const isSwissTurningPath = [
    'swiss',
    'guide bushing',
    'guide-bushing',
    'sliding head',
    'sliding-head',
  ].some((keyword) => signature.includes(keyword));

  if (signature.includes('thread') || /\btap(ping)?\b|rigid tap/.test(signature)) {
    return { id: 'threading', label: 'Threading' };
  }
  if (toolpath.operationId === 'drilling' || signature.includes('drill') || /ream/.test(signature)) {
    return { id: 'drilling', label: 'Drilling / holemaking' };
  }
  if (signature.includes('groov') || signature.includes('parting')) {
    return { id: 'grooving', label: 'Grooving / parting' };
  }
  if (toolpath.operationId === 'boring' || signature.includes('boring')) {
    return { id: 'boring', label: 'Boring' };
  }
  if (isSwissTurningPath) {
    return { id: 'swiss_sync', label: 'Swiss / synchronized turning' };
  }
  if (toolpath.operationId === 'turning_rough') {
    return { id: 'turning_rough', label: 'Rough turning' };
  }
  if (toolpath.operationId === 'turning_finish') {
    return isLiveToolTurningPath
      ? { id: 'live_milling', label: 'Live-tool milling' }
      : { id: 'turning_finish', label: 'Finish turning' };
  }
  if (toolpath.operationId === 'wire_skims' || signature.includes('skim')) {
    return { id: 'skim', label: 'Skim / finish passes' };
  }
  if (toolpath.operationId === 'wire_profile') {
    return { id: 'wire_profile', label: 'Profile cutting' };
  }
  if (toolpath.operationId === 'burn_roughing') {
    return { id: 'burn_roughing', label: 'Rough burning' };
  }
  if (toolpath.operationId === 'burn_finishing') {
    return { id: 'burn_finishing', label: 'Finish burning' };
  }
  if (toolpath.operationId === 'laser_cut') {
    return signature.includes('flyline') || signature.includes('common-line') || signature.includes('nest')
      ? { id: 'laser_nesting', label: 'Nesting / throughput' }
      : { id: 'laser_profile', label: 'Profile cutting' };
  }
  if (toolpath.operationId === 'laser_edge') {
    return signature.includes('mark') || signature.includes('etch')
      ? { id: 'marking', label: 'Marking / etching' }
      : { id: 'laser_quality', label: 'Quality / edge control' };
  }
  if (toolpath.operationId === 'abrasive_cut') {
    return signature.includes('pierce')
      ? { id: 'piercing', label: 'Piercing / entry control' }
      : { id: 'abrasive_contour', label: 'Contour cutting' };
  }
  if (toolpath.operationId === 'taper_control') {
    return signature.includes('bevel')
      ? { id: 'bevel', label: 'Bevel cutting' }
      : { id: 'taper_control', label: 'Taper / bevel control' };
  }
  if (
    signature.includes('swarf')
    || signature.includes('5x')
    || signature.includes('multi-axis')
    || signature.includes('simultaneous')
    || signature.includes('drive curve')
    || signature.includes('sweeping')
    || signature.includes('flank')
    || signature.includes('blade')
    || signature.includes('turbine')
    || signature.includes('port machining')
  ) {
    return { id: 'multiaxis', label: 'Multi-axis finishing' };
  }
  if (
    signature.includes('parallel')
    || signature.includes('flow')
    || signature.includes('scallop')
    || signature.includes('z-level')
    || signature.includes('waterline')
    || signature.includes('constant z')
    || signature.includes('constant-z')
    || signature.includes('geodesic')
    || signature.includes('isocurve')
    || signature.includes('blend')
    || signature.includes('morph')
    || signature.includes('barrel')
    || signature.includes('lens')
    || signature.includes('pencil')
    || signature.includes('corner finishing')
    || signature.includes('rest / corner')
    || signature.includes('rest finish')
    || signature.includes('equidistant')
    || signature.includes('constant cusp')
    || signature.includes('flow line')
    || signature.includes('radial')
    || signature.includes('hybrid')
    || signature.includes('shape offset')
    || signature.includes('offset finishing')
    || signature.includes('rest finishing')
    || signature.includes('rest milling')
    || signature.includes('optimized finishing')
    || signature.includes('global finishing')
    || signature.includes('planar mill')
    || signature.includes('planar')
    || signature.includes('z constant')
    || signature.includes('uv milling')
    || signature.includes('isoparametric')
    || signature.includes('multi-surface')
    || signature.includes('multi surface')
  ) {
    return { id: 'surface_finish', label: 'Surface finishing' };
  }
  if (
    signature.includes('adaptive')
    || signature.includes('dynamic')
    || signature.includes('rough')
    || signature.includes('opti')
    || signature.includes('cavity')
    || signature.includes('imachining')
    || signature.includes('vortex')
    || signature.includes('waveform')
    || signature.includes('volumill')
    || signature.includes('high feed')
    || signature.includes('plunge')
    || signature.includes('trochoid')
    || signature.includes('spiral rough')
    || signature.includes('raster')
    || signature.includes('core rough')
    || signature.includes('rest rough')
    || signature.includes('area clearance')
    || signature.includes('high speed area clearance')
    || signature.includes('z level rough')
    || signature.includes('z-level rough')
    || signature.includes('adaptive milling')
    || signature.includes('wave roughing')
    || signature.includes('truemill')
    || signature.includes('high-performance roughing')
    || signature.includes('high performance roughing')
    || signature.includes('hfc roughing')
  ) {
    return { id: 'roughing', label: 'Roughing' };
  }
  if (toolpath.operationId === 'pocket_milling' || signature.includes('pocket')) {
    return { id: 'pocketing', label: 'Pocketing' };
  }
  if (toolpath.operationId === 'slot_milling' || signature.includes('slot')) {
    return { id: 'slotting', label: 'Slotting' };
  }
  if (toolpath.operationId === 'shoulder_milling' || signature.includes('contour') || signature.includes('profile')) {
    return { id: 'profiling', label: 'Contouring / profiling' };
  }
  if (signature.includes('chamfer') || signature.includes('deburr') || signature.includes('engrave')) {
    return { id: 'engraving', label: 'Chamfer / engraving' };
  }
  if (toolpath.operationId === 'finishing') {
    return { id: 'finishing', label: 'Finishing' };
  }

  return { id: toolpath.operationId, label: labelForGenericOperation(toolpath.operationId) };
}

export function filterToolpathsForLicense(
  programming:
    | {
        mode: MachineMode;
        kind: 'manual' | 'cam' | 'nesting';
      }
    | undefined,
  toolpaths: ProgrammingToolpathOption[],
  licenseTierId: string,
  machine?: ProgrammingMachineProfile | undefined,
) {
  if (!programming || programming.kind === 'manual') {
    return toolpaths;
  }

  const machineTypeId = machine?.machineTypeId ?? '';
  const millAxisCapability = programming.mode === 'mill'
    ? machineTypeId.includes('_5')
      ? 5
      : machineTypeId.includes('_4')
        ? 4
        : 3
    : 0;

  return toolpaths.filter((toolpath) => {
    const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
    const isFiveAxisOnly = /swarf|simultaneous|5-axis|5 axis|drive curve|sweeping|flank|blade|turbine|port machining|impeller|geodesic/i.test(signature);
    const isFourAxisIndexed = /4-axis|4 axis|4th axis|rotary|index(?:ed|ing)?|wrap(?:ped)?|cylindrical/i.test(signature);
    const isMultiAxis = isFiveAxisOnly || isFourAxisIndexed || /multi-axis|variable contour|bevel/i.test(signature);
    const isAdvancedMill = /dynamic|adaptive|optirough|maxx|z-level|parallel|scallop|flow|streamline|3d|imachining|vortex|waveform|volumill|equidistant|constant cusp|radial|hybrid|offset finishing|shape offset|optimized finishing|global finishing|area clearance|truemill|high performance roughing|high-performance roughing|hfc roughing|isoparametric|z constant|uv milling|thread mill|helical bore|deep drilling|spot drill|rest milling|rest finishing/i.test(signature);
    const isMillTurnSignature = /live tool|live-tool|live tooling|live-tooling|live milling|mill-turn|mill\/turn|driven tool|driven-tool|c\/y|c-axis|y-axis|milling head|cross milling|secondary spindle|sub spindle|sub-spindle|sync manager|synchroni[sz]ed|handoff|pickoff|thread mill|circle mill|helical bore|planar mill/i.test(signature);
    const isSwissSignature = /swiss|guide bushing|sliding head/i.test(signature);
    const isWireAdvanced = /taper|skim|slug|tab/i.test(signature);
    const isEdmAdvanced = /orbit|detail|wear/i.test(signature);
    const isLaserAdvanced = /quality|common line|flyline|microtab|microjoint|mark/i.test(signature);
    const isWaterjetAdvanced = /quality|taper|dynamic|bevel|pierce/i.test(signature);
    const hasLiveToolingCapability =
      Boolean(machine?.toolingLayout?.liveTooling)
      || Boolean(machine?.toolingLayout?.millingHeadLabel)
      || (machine?.toolingLayout?.liveRpm ?? 0) > 0;
    const hasSwissCapability =
      machine?.machineTypeId === 'lathe_swiss'
      || machine?.toolingLayout?.kind === 'gang';

    switch (programming.mode) {
      case 'mill':
        if (licenseTierId === 'core-2d') return !isAdvancedMill && !isMultiAxis;
        if (licenseTierId === 'advanced-3d') return !isMultiAxis;
        if (millAxisCapability <= 3) return !isMultiAxis;
        if (millAxisCapability === 4) return !isFiveAxisOnly;
        return true;
      case 'lathe':
        if (isMillTurnSignature && !hasLiveToolingCapability) return false;
        if (isSwissSignature && !hasSwissCapability) return false;
        if (licenseTierId === 'turning-core') return !isMillTurnSignature && !isSwissSignature;
        if (licenseTierId === 'live-tooling') return !isSwissSignature;
        return true;
      case 'wire_edm':
        if (licenseTierId === 'profile-core') return !isWireAdvanced;
        if (licenseTierId === 'taper-skim') return !/slug|tab/i.test(signature);
        return true;
      case 'edm':
        if (licenseTierId === 'burn-core') return !isEdmAdvanced;
        return true;
      case 'laser':
        if (licenseTierId === 'cut-core') return !isLaserAdvanced;
        return true;
      case 'waterjet':
        if (licenseTierId === 'cut-core') return !isWaterjetAdvanced;
        return true;
      default:
        return true;
    }
  });
}

export function buildToolpathTypeOptions(
  toolpaths: Array<{ label: string; path: string; operationId: string; summary?: string }>,
): ToolpathTypeOption[] {
  const map = new Map<string, ToolpathTypeOption>();

  toolpaths.forEach((toolpath) => {
    const type = classifyToolpathType(toolpath);
    const current = map.get(type.id);
    if (current) {
      current.count += 1;
      return;
    }

    map.set(type.id, { ...type, count: 1 });
  });

  if (toolpaths.length === 0) {
    return [];
  }

  return [
    { id: 'all', label: 'All licensed toolpaths', count: toolpaths.length },
    ...Array.from(map.values()),
  ];
}

export function resolveProgrammingSelectionState({
  programming,
  machine,
  requestedLicenseTierId,
  requestedToolpathTypeId,
  requestedToolpathId,
}: {
  programming: ProgrammingEnvironmentLike | undefined;
  machine?: ProgrammingMachineProfile | undefined;
  requestedLicenseTierId: string;
  requestedToolpathTypeId: string;
  requestedToolpathId: string;
}): ProgrammingSelectionState {
  const licenseOptions = licenseOptionsFor(programming);
  const licenseTierId = licenseOptions.some((item) => item.id === requestedLicenseTierId)
    ? requestedLicenseTierId
    : (licenseOptions[licenseOptions.length - 1]?.id ?? 'full');
  const licensedToolpathOptions = filterToolpathsForLicense(programming, programming?.toolpaths ?? [], licenseTierId, machine);
  const toolpathTypes = buildToolpathTypeOptions(licensedToolpathOptions);
  const toolpathTypeId = toolpathTypes.some((item) => item.id === requestedToolpathTypeId)
    ? requestedToolpathTypeId
    : (toolpathTypes[0]?.id ?? '');
  const filteredToolpathOptions = toolpathTypeId === 'all'
    ? licensedToolpathOptions
    : licensedToolpathOptions.filter((toolpath) => classifyToolpathType(toolpath).id === toolpathTypeId);
  const toolpathId = filteredToolpathOptions.some((item) => item.id === requestedToolpathId)
    ? requestedToolpathId
    : (filteredToolpathOptions[0]?.id ?? licensedToolpathOptions[0]?.id ?? '');

  return {
    licenseTierId,
    toolpathTypeId,
    toolpathId,
  };
}

export function buildProgrammingSelectionContext({
  programming,
  machine,
  requestedLicenseTierId,
  requestedToolpathTypeId,
  requestedToolpathId,
}: {
  programming: ProgrammingEnvironmentLike | undefined;
  machine?: ProgrammingMachineProfile | undefined;
  requestedLicenseTierId: string;
  requestedToolpathTypeId: string;
  requestedToolpathId: string;
}): ProgrammingSelectionContext {
  const licenseOptions = licenseOptionsFor(programming);
  const selection = resolveProgrammingSelectionState({
    programming,
    machine,
    requestedLicenseTierId,
    requestedToolpathTypeId,
    requestedToolpathId,
  });
  const licensedToolpathOptions = filterToolpathsForLicense(
    programming,
    programming?.toolpaths ?? [],
    selection.licenseTierId,
    machine,
  );
  const toolpathTypes = buildToolpathTypeOptions(licensedToolpathOptions);
  const selectedToolpathType = toolpathTypes.find((item) => item.id === selection.toolpathTypeId) ?? toolpathTypes[0];
  const filteredToolpathOptions = selection.toolpathTypeId === 'all'
    ? licensedToolpathOptions
    : licensedToolpathOptions.filter((toolpath) => classifyToolpathType(toolpath).id === selection.toolpathTypeId);
  const selectedToolpath =
    filteredToolpathOptions.find((toolpath) => toolpath.id === selection.toolpathId)
    ?? licensedToolpathOptions.find((toolpath) => toolpath.id === selection.toolpathId)
    ?? filteredToolpathOptions[0]
    ?? licensedToolpathOptions[0];

  return {
    ...selection,
    licenseOptions,
    licensedToolpathOptions,
    toolpathTypes,
    selectedToolpathType,
    filteredToolpathOptions,
    selectedToolpath,
  };
}

export function getToolpathDefaults(
  toolpath: { id: string; label: string; path: string; operationId: string } | undefined,
  machineMode: MachineMode,
): ToolpathDefaults | null {
  if (!toolpath) return null;
  const sig = `${toolpath.label} ${toolpath.path}`.toLowerCase();

  if (machineMode === 'mill') {
    if (/high feed/.test(sig)) {
      return { docMm: 0.18, wocMm: 0.65, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'high-removal' };
    }
    if (/plunge/.test(sig)) {
      return { docMm: 1.6, wocMm: 0.18, isAbsolute: false, entryStyle: 'safe-approach', finishTarget: 'high-removal' };
    }
    if (/trochoid|helical bore/.test(sig)) {
      return { docMm: 1.0, wocMm: 0.12, isAbsolute: false, entryStyle: 'helix-ramp', finishTarget: 'general' };
    }
    if (/thread mill/.test(sig)) {
      return { docMm: 1.0, wocMm: 0.08, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
    }
    if (/\btap(ping)?\b|rigid tap/.test(sig)) {
      return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'safe-approach', finishTarget: 'general' };
    }
    if (/ream/.test(sig)) {
      return { docMm: 0.25, wocMm: 0.05, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
    }
    if (/chamfer|deburr|engrave/.test(sig)) {
      return { docMm: 0.2, wocMm: 0.08, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
    }
    if (/peck|deep[ -]?hole|deep drilling|spot drill/.test(sig)) {
      return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'roughing') {
      if (/dynamic|adaptive|adaptive milling|imachining|profit\s*mill|waveform|wave roughing|volumill|vortex|truemill|maxx\s*rough|high speed area clearance|high[- ]performance roughing|hfc roughing/i.test(sig)) {
        return { docMm: 2.0, wocMm: 0.10, isAbsolute: false, entryStyle: 'helix-ramp', finishTarget: 'high-removal' };
      }
      return { docMm: 1.0, wocMm: 0.50, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'high-removal' };
    }
    if (toolpath.operationId === 'pocket_milling') {
      return { docMm: 1.0, wocMm: 0.60, isAbsolute: false, entryStyle: 'helix-ramp', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'slot_milling') {
      return { docMm: 0.5, wocMm: 1.0, isAbsolute: false, entryStyle: 'helix-ramp', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'shoulder_milling') {
      return { docMm: 1.0, wocMm: 0.05, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
    }
    if (toolpath.operationId === 'finishing') {
      if (/swarf|variable contour|multi-axis|5-axis|5x|simultaneous|drive curve|sweeping|flank|blade|turbine|port machining/i.test(sig)) {
        return { docMm: 0.8, wocMm: 0.10, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      if (/z-level|zlevel|waterline|constant z|constant-z|steep/i.test(sig)) {
        return { docMm: 0.5, wocMm: 0.15, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      if (/barrel|lens|maxx\s*finish/i.test(sig)) {
        return { docMm: 0.4, wocMm: 0.30, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      if (/parallel|flow|flow line|scallop|geodesic|isocurve|blend|morph|pencil|corner|rest|equidistant|constant cusp|radial|hybrid|shape offset|offset finishing|optimized finishing|global finishing|planar|z constant|uv milling|isoparametric|multi-surface|multi surface/i.test(sig)) {
        return { docMm: 0.3, wocMm: 0.12, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      return { docMm: 0.3, wocMm: 0.20, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
    }
    if (toolpath.operationId === 'face_milling') {
      return { docMm: 0.3, wocMm: 0.80, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'drilling') {
      return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
  }

  if (machineMode === 'lathe') {
    if ([
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
      'thread mill',
      'circle mill',
      'helical bore',
      'planar mill',
    ].some((keyword) => sig.includes(keyword))) {
      if (toolpath.operationId === 'drilling' || /drill|ream|\btap(ping)?\b/.test(sig)) {
        return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
      }
      if (/thread mill/.test(sig)) {
        return { docMm: 0.35, wocMm: 0.1, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      if (/circle mill|helical bore|planar mill|face mill|pocket/.test(sig)) {
        return { docMm: 0.75, wocMm: 0.2, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
      }
      if (/finish|blend|profile|contour/.test(sig)) {
        return { docMm: 0.5, wocMm: 0.1, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      return { docMm: 0.75, wocMm: 0.2, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'drilling') {
      return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'turning_rough') {
      if (/profit|adaptive|i\s*turn/i.test(sig)) {
        return { docMm: 3.0, wocMm: 0.8, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'high-removal' };
      }
      return { docMm: 2.5, wocMm: 0.6, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'high-removal' };
    }
    if (toolpath.operationId === 'turning_finish') {
      if (/thread/i.test(sig)) {
        return { docMm: 0.15, wocMm: 0.1, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'tight-finish' };
      }
      return { docMm: 0.3, wocMm: 0.15, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'tight-finish' };
    }
    if (toolpath.operationId === 'grooving') {
      return { docMm: 3.0, wocMm: 3.0, isAbsolute: true, entryStyle: 'chip-break', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'boring') {
      if (/finish bore|finish boring|wave finish/i.test(sig)) {
        return { docMm: 0.4, wocMm: 0.18, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'tight-finish' };
      }
      if (/rough bore|rough boring/.test(sig)) {
        return { docMm: 2.0, wocMm: 0.5, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'high-removal' };
      }
      return { docMm: 1.5, wocMm: 0.4, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'general' };
    }
    if (/ream|peck|deep[ -]?hole|deep drilling|spot drill/.test(sig)) {
      return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
  }

  if (machineMode === 'wire_edm') {
    if (toolpath.operationId === 'wire_profile') {
      return /taper|4-axis|ruled/i.test(sig)
        ? { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'slug-control', finishTarget: 'tight-finish' }
        : { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'wire_skims') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'finish-skim', finishTarget: 'tight-finish' };
    }
  }

  if (machineMode === 'edm') {
    if (toolpath.operationId === 'burn_roughing') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'heavy-flush', finishTarget: 'high-removal' };
    }
    if (toolpath.operationId === 'burn_finishing') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'fine-detail', finishTarget: 'tight-finish' };
    }
  }

  if (machineMode === 'laser') {
    if (toolpath.operationId === 'laser_cut') {
      return /common.line|flyline|nest/i.test(sig)
        ? { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'nested-throughput', finishTarget: 'general' }
        : { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'laser_edge') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'clean-edge', finishTarget: 'tight-finish' };
    }
  }

  if (machineMode === 'waterjet') {
    if (toolpath.operationId === 'taper_control') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'taper-control', finishTarget: 'tight-finish' };
    }
    if (toolpath.operationId === 'abrasive_cut') {
      return /pierce/i.test(sig)
        ? { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'pierce-safe', finishTarget: 'general' }
        : { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'general' };
    }
  }

  return null;
}
