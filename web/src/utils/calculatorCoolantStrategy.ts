import {
  COOLANT_OPTIONS,
  type CoolantOptionId,
  type MachineMode,
  type MaterialCatalogItem,
  type SelectionOption,
  type ToolCatalogItem,
} from '../data/calculatorWorkspace';

export interface CalculatorCoolantStrategyInput {
  machineMode: MachineMode;
  material?: Pick<MaterialCatalogItem, 'name' | 'group' | 'subcategoryId' | 'idealCoolant'>;
  tool?: Pick<
    ToolCatalogItem,
    'family' | 'label' | 'description' | 'geometryClass' | 'toolMaterialClass' | 'bodyType' | 'coolantThrough'
  >;
  toolpath?: {
    label: string;
    path: string;
    operationId: string;
  };
  finishTarget?: string;
  currentCoolantId?: string;
  availableCoolantOptions: Array<Pick<SelectionOption, 'id' | 'label'>>;
  toolDiameterMm?: number;
  docMm?: number;
  wocMm?: number;
}

export interface CalculatorCoolantStrategyRecommendation {
  recommendedId: CoolantOptionId;
  recommendedLabel: string;
  alignment: 'aligned' | 'tradeoff';
  materialBaseline: string;
  rationale: string;
  tradeoff: string;
  alternatives: CoolantOptionId[];
  basis: string;
}

type ToolIntent = {
  drillingLike: boolean;
  reamingLike: boolean;
  tappingLike: boolean;
  threadingLike: boolean;
  threadMillingLike: boolean;
  groovingLike: boolean;
  boringLike: boolean;
  faceMillingLike: boolean;
  roughMillingLike: boolean;
  finishingLike: boolean;
};

function coolantLabel(id: string) {
  return COOLANT_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

function dedupeCoolantIds(ids: string[]) {
  return [...new Set(ids)].filter((id): id is CoolantOptionId =>
    COOLANT_OPTIONS.some((option) => option.id === id),
  );
}

function classifyToolpathFamily(toolpath: CalculatorCoolantStrategyInput['toolpath']) {
  if (!toolpath) return 'general';
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  const operationId = toolpath.operationId;

  if (operationId === 'drilling' || signature.includes('drill') || signature.includes('ream')) return 'drilling';
  if (signature.includes('tap')) return 'threading';
  if (signature.includes('thread')) return 'threading';
  if (signature.includes('groov') || signature.includes('parting') || signature.includes('cutoff')) return 'grooving';
  if (operationId === 'boring' || signature.includes('boring')) return 'boring';
  if (
    signature.includes('adaptive')
    || signature.includes('dynamic')
    || signature.includes('rough')
    || signature.includes('high feed')
    || signature.includes('high-feed')
    || signature.includes('opti')
    || operationId === 'roughing'
    || operationId === 'turning_rough'
  ) {
    return 'roughing';
  }
  if (signature.includes('parallel') || signature.includes('flow') || signature.includes('scallop') || signature.includes('surface')) {
    return 'surface_finish';
  }
  if (operationId === 'face_milling' || signature.includes('face')) return 'face_milling';
  if (operationId === 'slot_milling' || signature.includes('slot')) return 'slotting';
  if (operationId === 'pocket_milling' || signature.includes('pocket')) return 'pocketing';
  if (operationId === 'turning_finish') return 'turning_finish';
  if (operationId === 'finishing') return 'finishing';
  return operationId || 'general';
}

function inferToolBodyType(tool: CalculatorCoolantStrategyInput['tool']) {
  if (!tool) return 'unknown';
  if (tool.bodyType) return tool.bodyType;
  switch (tool.geometryClass) {
    case 'face-mill':
    case 'roughing-insert':
    case 'finishing-insert':
    case 'grooving-insert':
    case 'threading-insert':
    case 'boring-bar':
      return 'indexable';
    default:
      return 'solid';
  }
}

function inferToolMaterial(tool: CalculatorCoolantStrategyInput['tool']) {
  if (!tool) return 'unknown';
  if (tool.toolMaterialClass) return tool.toolMaterialClass;
  const signature = `${tool.family ?? ''} ${tool.label ?? ''} ${tool.description ?? ''}`.toLowerCase();
  if (signature.includes('ceramic')) return 'ceramic';
  if (signature.includes('pcd') || signature.includes('diamond')) return 'pcd';
  if (signature.includes('cermet')) return 'cermet';
  if (signature.includes('carbide')) return 'carbide';
  return 'unknown';
}

function inferToolIntent(tool: CalculatorCoolantStrategyInput['tool']): ToolIntent {
  if (!tool) {
    return {
      drillingLike: false,
      reamingLike: false,
      tappingLike: false,
      threadingLike: false,
      threadMillingLike: false,
      groovingLike: false,
      boringLike: false,
      faceMillingLike: false,
      roughMillingLike: false,
      finishingLike: false,
    };
  }

  const signature = `${tool.family ?? ''} ${tool.label ?? ''} ${tool.description ?? ''} ${tool.geometryClass ?? ''}`.toLowerCase();
  const threadMillingLike = signature.includes('thread mill');
  const threadingLike = tool.geometryClass === 'threading-insert' || signature.includes('thread');

  return {
    drillingLike: tool.geometryClass === 'drill' || signature.includes('drill'),
    reamingLike: signature.includes('ream'),
    tappingLike: signature.includes('tap') && !threadMillingLike,
    threadingLike,
    threadMillingLike,
    groovingLike:
      tool.geometryClass === 'grooving-insert'
      || signature.includes('groov')
      || signature.includes('part-off')
      || signature.includes('parting')
      || signature.includes('cutoff'),
    boringLike: tool.geometryClass === 'boring-bar' || signature.includes('boring'),
    faceMillingLike: tool.geometryClass === 'face-mill' || signature.includes('face mill'),
    roughMillingLike:
      signature.includes('rough')
      || signature.includes('rougher')
      || signature.includes('high feed')
      || signature.includes('high-feed')
      || signature.includes('variable-flute')
      || signature.includes('shoulder mill'),
    finishingLike:
      signature.includes('finish')
      || signature.includes('ball nose')
      || signature.includes('ball-end')
      || signature.includes('wiper'),
  };
}

function pickFirstAvailable(available: CoolantOptionId[], preferred: CoolantOptionId[]) {
  return preferred.find((candidate) => available.includes(candidate));
}

function materialBaselineLabel(material: CalculatorCoolantStrategyInput['material']) {
  return material?.idealCoolant || 'process-specific';
}

export function buildCoolantStrategyRecommendation(
  input: CalculatorCoolantStrategyInput,
): CalculatorCoolantStrategyRecommendation {
  const available = dedupeCoolantIds(input.availableCoolantOptions.map((option) => option.id));
  const current = (input.currentCoolantId && available.includes(input.currentCoolantId as CoolantOptionId))
    ? (input.currentCoolantId as CoolantOptionId)
    : undefined;

  if (available.length === 0) {
    return {
      recommendedId: (input.currentCoolantId as CoolantOptionId) ?? 'flood',
      recommendedLabel: coolantLabel(input.currentCoolantId ?? 'flood'),
      alignment: 'aligned',
      materialBaseline: materialBaselineLabel(input.material),
      rationale: 'No coolant options are currently published for this machine package, so the calculator is preserving the active choice.',
      tradeoff: 'Verify the actual machine package and spindle configuration before trusting coolant-sensitive recommendations.',
      alternatives: [],
      basis: 'Machine capability data incomplete',
    };
  }

  if ((input.machineMode === 'edm' || input.machineMode === 'wire_edm') && available.includes('dielectric')) {
    return {
      recommendedId: 'dielectric',
      recommendedLabel: coolantLabel('dielectric'),
      alignment: current === 'dielectric' ? 'aligned' : 'tradeoff',
      materialBaseline: materialBaselineLabel(input.material),
      rationale: 'EDM and wire work depend on dielectric flushing rather than spindle coolant, so dielectric remains the only correct process-fluid posture here.',
      tradeoff: 'Treat flushing pressure, debris evacuation, and gap stability as the real coolant variables for this process.',
      alternatives: [],
      basis: 'Process-fluid requirement',
    };
  }

  if (input.machineMode === 'laser') {
    const laserChoice = available.includes('air') ? 'air' : available[0];
    return {
      recommendedId: laserChoice,
      recommendedLabel: coolantLabel(laserChoice),
      alignment: current === laserChoice ? 'aligned' : 'tradeoff',
      materialBaseline: materialBaselineLabel(input.material),
      rationale: 'Laser work uses assist gas and nozzle flow instead of flood coolant, so the best posture is the cleanest supported gas or air package.',
      tradeoff: 'Edge quality still depends on gas type, nozzle condition, and thickness-specific cut tuning.',
      alternatives: available.filter((id) => id !== laserChoice),
      basis: 'Assist-gas process',
    };
  }

  const family = classifyToolpathFamily(input.toolpath);
  const materialGroup = input.material?.group ?? 'steel';
  const toolBodyType = inferToolBodyType(input.tool);
  const toolMaterial = inferToolMaterial(input.tool);
  const toolIntent = inferToolIntent(input.tool);
  const radialRatio =
    input.toolDiameterMm && input.toolDiameterMm > 0 && input.wocMm != null
      ? input.wocMm / input.toolDiameterMm
      : 0;
  const axialRatio =
    input.toolDiameterMm && input.toolDiameterMm > 0 && input.docMm != null
      ? input.docMm / input.toolDiameterMm
      : 0;

  const isHighRemoval =
    input.finishTarget === 'high-removal'
    || family === 'roughing'
    || family === 'turning_rough'
    || (family === 'face_milling' && radialRatio >= 0.45)
    || radialRatio >= 0.4
    || axialRatio >= 0.75;
  const isFinishBiased =
    input.finishTarget === 'tight-finish'
    || family === 'surface_finish'
    || family === 'finishing'
    || family === 'turning_finish'
    || toolIntent.finishingLike;
  const isDrillingLike =
    family === 'drilling'
    || family === 'boring'
    || toolIntent.drillingLike
    || toolIntent.reamingLike
    || toolIntent.boringLike;
  const isTapThreadLike = toolIntent.tappingLike || (toolIntent.threadingLike && !toolIntent.threadMillingLike);
  const isThreadingLike = family === 'threading' || isTapThreadLike;
  const isGroovingLike = family === 'grooving' || toolIntent.groovingLike;
  const ferrousDryAirCandidate =
    ['steel', 'tool_steel', 'cast'].includes(materialGroup)
    && ['carbide', 'cermet', 'ceramic', 'unknown'].includes(toolMaterial)
    && (toolBodyType === 'solid' || toolBodyType === 'indexable')
    && (isHighRemoval || toolIntent.roughMillingLike || toolIntent.faceMillingLike)
    && !isFinishBiased
    && !isDrillingLike
    && !isThreadingLike;
  const heatSensitiveAlloy = ['stainless', 'superalloy', 'titanium', 'exotic_alloy'].includes(materialGroup);
  const nonferrousCleanCut = ['aluminum', 'copper'].includes(materialGroup);
  const dustyBrittleCut = ['cast', 'graphite_ceramic', 'polymer_composite'].includes(materialGroup);
  const ceramicHotCutCandidate =
    heatSensitiveAlloy
    && toolMaterial === 'ceramic'
    && isHighRemoval
    && !isDrillingLike
    && !isTapThreadLike;

  let recommended = current ?? available[0];
  let rationale = `Material guidance baseline is ${materialBaselineLabel(input.material)}.`;
  let tradeoff = 'Match the selected coolant to the actual operation, tooling, and machine capability rather than treating coolant as a generic material default.';
  let basis = `${input.material?.name ?? 'Active material'} | ${input.tool?.label ?? 'active tool'} | ${input.toolpath?.label ?? input.toolpath?.operationId ?? 'current toolpath'}`;
  const alternatives: CoolantOptionId[] = [];

  if (toolIntent.reamingLike) {
    recommended = pickFirstAvailable(available, ['flood', 'mist', 'tsc', 'through_air', 'air']) ?? recommended;
    rationale = 'Reaming usually rewards steady lubrication and chip flushing more than dry cutting, because finish size and wall quality depend on a clean, consistent cut.';
    tradeoff = 'Use air-only reaming sparingly, mainly for short cuts in free-cutting materials where liquid contamination matters more than finish control.';
    basis = `Reaming finish control | ${input.tool?.label ?? 'tooling'} | ${input.material?.name ?? 'material'}`;
  } else if (isDrillingLike) {
    recommended = pickFirstAvailable(
      available,
      input.tool?.coolantThrough || heatSensitiveAlloy
        ? ['tsc', 'flood', 'mist', 'through_air', 'air']
        : ['flood', 'tsc', 'mist', 'through_air', 'air'],
    ) ?? recommended;
    rationale = input.tool?.coolantThrough || heatSensitiveAlloy
      ? 'Drilling and deep centerline work usually benefit from through-tool or flood delivery first, because chip evacuation and heat control matter more than dry cutting efficiency.'
      : 'General drilling still wants positive evacuation and steady heat control, so flood stays ahead of dry air unless the machine lacks liquid delivery.';
    tradeoff = 'Use air-only drilling only for very light work, spot drilling, or materials that clearly favor dry chip evacuation.';
    basis = `Drilling / boring posture | ${input.tool?.label ?? 'tooling'} | ${input.material?.name ?? 'material'}`;
    alternatives.push(...available.filter((id) => id !== recommended && ['flood', 'tsc', 'mist'].includes(id)));
  } else if (isTapThreadLike) {
    recommended = pickFirstAvailable(available, ['tsc', 'flood', 'mist', 'through_air', 'air']) ?? recommended;
    rationale = 'Tapping and single-point threading usually want lubricity and temperature control more than dry evacuation, so through-spindle or flood stays ahead of air-only strategies.';
    tradeoff = 'Dry or air threading is a niche prove-out choice, not the default for productive thread quality, flank integrity, or tap life.';
    basis = `Threading / tapping posture | ${input.tool?.label ?? 'tooling'} | ${input.material?.name ?? 'material'}`;
  } else if (isGroovingLike) {
    recommended = pickFirstAvailable(available, ['tsc', 'flood', 'through_air', 'mist', 'air']) ?? recommended;
    rationale = 'Grooving and parting concentrate heat in a narrow zone and rely on chip control, so through-tool or strong flood delivery usually beats dry cutting unless the process is extremely shallow and open.';
    tradeoff = 'Air assist can still help on light grooving or cast iron work, but a liquid-first posture is safer when chip packing or insert side wear is on the table.';
    basis = `Grooving / parting control | ${input.tool?.label ?? 'tooling'} | ${input.material?.name ?? 'material'}`;
  } else if (ceramicHotCutCandidate) {
    recommended = pickFirstAvailable(available, ['through_air', 'air', 'flood', 'tsc', 'mist']) ?? recommended;
    rationale = 'Ceramic roughing in superalloys and other hot-cut materials is usually managed hot and stable, so dry or air-led cutting stays ahead of liquid coolant that can shock the edge.';
    tradeoff = recommended === 'flood' || recommended === 'tsc'
      ? 'This machine package cannot support the preferred dry or air ceramic posture, so the calculator is falling back to the best supported liquid option.'
      : 'Only move toward liquid coolant if the tooling supplier explicitly calls for it and the cut is staying thermally stable.';
    basis = `Ceramic hot-cut posture | ${input.tool?.label ?? 'tooling'} | ${input.material?.name ?? 'material'}`;
  } else if (ferrousDryAirCandidate) {
    recommended = pickFirstAvailable(available, ['through_air', 'air', 'flood', 'tsc', 'mist']) ?? recommended;
    rationale = 'Carbide roughing in steels and cast materials often runs best dry or with air assist, because it clears chips and avoids quenching a hot edge with intermittent liquid coolant.';
    tradeoff = recommended === 'flood' || recommended === 'tsc'
      ? 'This machine package cannot support a dry or air posture, so the calculator is falling back to the best supported liquid strategy.'
      : 'Switch to liquid coolant only when chip packing, deep-pocket heat load, or edge control clearly demands it.';
    basis = `Ferrous carbide roughing | ${input.toolpath?.label ?? family} | ${input.material?.name ?? 'material'}`;
    alternatives.push(...available.filter((id) => id !== recommended && ['air', 'through_air', 'flood', 'tsc'].includes(id)));
  } else if (heatSensitiveAlloy) {
    recommended = pickFirstAvailable(available, ['tsc', 'flood', 'through_air', 'mist', 'air']) ?? recommended;
    rationale = 'Stainless, titanium, superalloys, and reactive alloys punish heat and work harden quickly, so through-spindle or strong flood delivery stays ahead of dry cutting for most productive work.';
    tradeoff = 'Use air assist only for very light finishing, visibility, or when the machine lacks a proper liquid package.';
    basis = `Heat-sensitive alloy control | ${input.material?.name ?? 'material'} | ${input.toolpath?.label ?? family}`;
  } else if (nonferrousCleanCut) {
    recommended = pickFirstAvailable(
      available,
      isFinishBiased ? ['mist', 'through_air', 'air', 'flood', 'tsc'] : ['mist', 'air', 'through_air', 'flood', 'tsc'],
    ) ?? recommended;
    rationale = 'Aluminum and copper alloys usually benefit from cleaner, lighter coolant postures first, because mist or air keeps chips moving without drowning the cut or promoting edge buildup.';
    tradeoff = 'Use flood or through-spindle coolant when chip evacuation, drilling depth, or tool temperature starts to outrun a light-air posture.';
    basis = `Nonferrous chip clearing | ${input.material?.name ?? 'material'} | ${input.toolpath?.label ?? family}`;
  } else if (dustyBrittleCut) {
    recommended = pickFirstAvailable(available, ['air', 'through_air', 'mist', 'flood', 'tsc']) ?? recommended;
    rationale = 'Cast iron, graphite, ceramics, and many composite or polymer cuts usually favor dry or air-led evacuation, because keeping abrasive fines out of slurry is often better than flooding the work zone.';
    tradeoff = 'Mist can help with dust control in some polymer work, but flood is rarely the first choice unless the process explicitly needs it.';
    basis = `Dry evacuation preference | ${input.material?.name ?? 'material'} | ${input.toolpath?.label ?? family}`;
  } else if (isFinishBiased) {
    recommended = pickFirstAvailable(available, ['tsc', 'flood', 'mist', 'through_air', 'air']) ?? recommended;
    rationale = 'Finish-biased work usually rewards the most stable and repeatable coolant posture the machine supports, especially when surface and dimensional consistency matter more than raw removal rate.';
    tradeoff = 'If the finish path is light and visibility matters more than thermal control, air or mist can still be a deliberate choice.';
    basis = `Finish-biased cut | ${input.toolpath?.label ?? family} | ${input.tool?.label ?? 'tooling'}`;
  } else {
    const baseline = (input.material?.idealCoolant ?? '').toLowerCase();
    recommended = pickFirstAvailable(
      available,
      baseline.includes('high-pressure') || baseline.includes('through') || baseline.includes('tsc')
        ? ['tsc', 'flood', 'mist', 'through_air', 'air']
        : baseline.includes('mist')
          ? ['mist', 'air', 'through_air', 'flood', 'tsc']
          : baseline.includes('air') || baseline.includes('dry')
            ? ['through_air', 'air', 'mist', 'flood', 'tsc']
            : ['flood', 'tsc', 'mist', 'through_air', 'air'],
    ) ?? recommended;
    rationale = 'The setup does not trigger a stronger operation-specific coolant override, so the calculator is following the material baseline and the supported machine options.';
    tradeoff = 'Treat this as a baseline recommendation and adjust if chip packing, finish, or edge life says otherwise.';
  }

  const uniqueAlternatives = dedupeCoolantIds([
    ...alternatives,
    ...available.filter((id) => id !== recommended),
  ]).filter((id) => id !== recommended);

  return {
    recommendedId: recommended,
    recommendedLabel: coolantLabel(recommended),
    alignment: current === recommended ? 'aligned' : 'tradeoff',
    materialBaseline: materialBaselineLabel(input.material),
    rationale,
    tradeoff,
    alternatives: uniqueAlternatives.slice(0, 3),
    basis,
  };
}
