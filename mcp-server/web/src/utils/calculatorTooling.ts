import type {
  MachineCatalogItem,
  MaterialCatalogItem,
  ToolCatalogItem,
} from '../data/calculatorWorkspace';

export type ToolBodyFilter = 'all' | 'solid' | 'indexable';

export interface CalculatorToolpathDescriptor {
  label: string;
  path: string;
  operationId: string;
}

export interface CalculatorInsertOption {
  id: string;
  label: string;
  detail: string;
  insertType: string;
  insertGrade: string;
  recommendationScore: number;
  recommendationReason: string;
  recommended: boolean;
  priceUsd?: number;
}

function escapeKeywordRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function signatureMatchesKeyword(signature: string, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return false;

  const pattern = normalizedKeyword
    .split(/\s+/)
    .map(escapeKeywordRegExp)
    .join('\\s+');

  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, 'i').test(signature);
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

function classifyToolpathFamily(toolpath: CalculatorToolpathDescriptor) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();

  if (signature.includes('thread')) return 'threading';
  if (/\btap(ping)?\b|rigid tap/.test(signature)) return 'threading';
  if (toolpath.operationId === 'drilling') return 'drilling';
  if (signature.includes('drill') || signature.includes('ream')) return 'drilling';
  if (toolpath.operationId === 'turning_rough') return 'turning_rough';
  if (toolpath.operationId === 'turning_finish') {
    if (isLiveToolTurningSignature(signature)) return 'live_milling';
    if (signature.includes('thread')) return 'threading';
    if (signature.includes('groov') || signature.includes('parting')) return 'grooving';
    return 'turning_finish';
  }
  if (signature.includes('groov') || signature.includes('parting')) return 'grooving';
  if (toolpath.operationId === 'boring' || signature.includes('boring')) return 'boring';
  if (toolpath.operationId === 'wire_skims' || signature.includes('skim')) return 'skim';
  if (toolpath.operationId === 'wire_profile') return 'wire_profile';
  if (toolpath.operationId === 'burn_roughing') return 'burn_roughing';
  if (toolpath.operationId === 'burn_finishing') return 'burn_finishing';
  if (toolpath.operationId === 'laser_cut') return signature.includes('nest') ? 'laser_nesting' : 'laser_profile';
  if (toolpath.operationId === 'laser_edge') return signature.includes('mark') ? 'marking' : 'laser_quality';
  if (toolpath.operationId === 'abrasive_cut') return signature.includes('pierce') ? 'piercing' : 'abrasive_contour';
  if (toolpath.operationId === 'taper_control') return signature.includes('bevel') ? 'bevel' : 'taper_control';
  if (signature.includes('engrav') || signature.includes('scribe') || signature.includes('serial') || signature.includes('mark')) {
    return 'engraving';
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
    return 'multiaxis';
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
    return 'surface_finish';
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
    return 'roughing';
  }
  if (toolpath.operationId === 'pocket_milling' || signature.includes('pocket') || signature.includes('helical bore')) return 'pocketing';
  if (toolpath.operationId === 'slot_milling' || signature.includes('slot')) return 'slotting';
  if (toolpath.operationId === 'shoulder_milling' || signature.includes('contour') || signature.includes('profile')) {
    return 'profiling';
  }
  if (toolpath.operationId === 'finishing') return 'finishing';

  return toolpath.operationId;
}

function toolSignature(tool: Pick<ToolCatalogItem, 'label' | 'description' | 'catalogNumber' | 'insertType'> & { family?: string }) {
  return [
    tool.family,
    tool.label,
    tool.description,
    tool.catalogNumber,
    tool.insertType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function familyAllowsToolpath(
  tool: Pick<
    ToolCatalogItem,
    'geometryClass' | 'operation' | 'label' | 'description' | 'catalogNumber' | 'insertType'
  >,
  familyId: string,
  toolpath: CalculatorToolpathDescriptor,
) {
  const signature = toolSignature(tool);
  const pathSignature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  const isExplicitTapPath = /\btap(ping)?\b|rigid tap|tap cycle/.test(pathSignature);

  switch (tool.geometryClass) {
    case 'face-mill':
      return familyId === 'face_milling'
        || toolpath.operationId === 'face_milling'
        || (familyId === 'roughing' && /high feed|face/.test(pathSignature));
    case 'variable-helix-endmill':
      return ['roughing', 'pocketing', 'profiling'].includes(familyId)
        || ['roughing', 'pocket_milling', 'shoulder_milling'].includes(toolpath.operationId);
    case 'square-endmill':
      if (familyId === 'engraving') {
        return /engrave|scribe|mark/.test(signature);
      }
      return ['roughing', 'pocketing', 'slotting', 'profiling', 'finishing', 'face_milling'].includes(familyId)
        || ['roughing', 'pocket_milling', 'slot_milling', 'shoulder_milling', 'finishing', 'face_milling'].includes(toolpath.operationId)
        || signature.includes('thread mill') && familyId === 'threading';
    case 'ball-endmill':
      return ['surface_finish', 'multiaxis', 'finishing'].includes(familyId)
        || toolpath.operationId === 'finishing';
    case 'chamfer':
      return toolpath.operationId === 'chamfer_milling' || familyId === 'finishing' || familyId === 'engraving';
    case 'drill':
      return familyId === 'drilling' || toolpath.operationId === 'drilling' || familyId === 'boring';
    case 'tap':
      return isExplicitTapPath || toolpath.operationId === 'threading';
    case 'reamer':
      return familyId === 'drilling' || familyId === 'boring' || signature.includes('ream');
    case 'roughing-insert':
      return familyId === 'turning_rough' || toolpath.operationId === 'turning_rough';
    case 'finishing-insert':
      return familyId === 'turning_finish' || toolpath.operationId === 'turning_finish';
    case 'grooving-insert':
      return familyId === 'grooving' || toolpath.operationId === 'grooving';
    case 'threading-insert':
      return familyId === 'threading' || toolpath.operationId === 'threading';
    case 'boring-bar':
      return familyId === 'boring'
        || toolpath.operationId === 'boring'
        || familyId === 'turning_finish';
    case 'live-tool-endmill':
      return ['profiling', 'slotting', 'pocketing', 'finishing', 'surface_finish', 'multiaxis', 'live_milling', 'threading', 'drilling'].includes(familyId);
    case 'wire':
      return familyId === 'wire_profile' || familyId === 'skim';
    case 'electrode':
      return familyId === 'burn_roughing' || familyId === 'burn_finishing';
    case 'beam':
      return familyId === 'laser_profile' || familyId === 'laser_quality' || familyId === 'marking' || familyId === 'laser_nesting';
    case 'stream':
      return familyId === 'abrasive_contour' || familyId === 'piercing' || familyId === 'taper_control' || familyId === 'bevel';
    default:
      return true;
  }
}

export function inferToolBodyType(
  tool: Pick<
    ToolCatalogItem,
    'bodyType' | 'geometryClass' | 'insertType' | 'insertCount' | 'family' | 'label' | 'description' | 'catalogNumber'
  >,
): Exclude<ToolBodyFilter, 'all'> {
  if (tool.bodyType) return tool.bodyType;
  if (tool.insertType || (tool.insertCount ?? 0) > 0) return 'indexable';

  switch (tool.geometryClass) {
    case 'face-mill':
    case 'roughing-insert':
    case 'finishing-insert':
    case 'grooving-insert':
    case 'threading-insert':
    case 'boring-bar':
      return 'indexable';
    case 'drill': {
      const signature = toolSignature(tool);
      return signature.includes('indexable') || signature.includes('u-drill') ? 'indexable' : 'solid';
    }
    default:
      return /indexable|insert\b/.test(toolSignature(tool)) ? 'indexable' : 'solid';
  }
}

export function scoreToolForToolpath(
  tool: Pick<
    ToolCatalogItem,
    | 'bodyType'
    | 'catalogNumber'
    | 'centerCutting'
    | 'description'
    | 'edgePrep'
    | 'family'
    | 'geometryClass'
    | 'insertCount'
    | 'insertType'
    | 'label'
    | 'operation'
    | 'supportedOperations'
    | 'toolpathKeywords'
    | 'variableHelix'
    | 'wiperGeometry'
  >,
  toolpath: CalculatorToolpathDescriptor,
) {
  const familyId = classifyToolpathFamily(toolpath);
  if (!familyAllowsToolpath(tool, familyId, toolpath)) {
    return 0;
  }

  const supportedOperations = tool.supportedOperations?.length ? tool.supportedOperations : [tool.operation];
  const signature = `${toolpath.label} ${toolpath.path} ${familyId}`.toLowerCase();
  const toolSig = toolSignature(tool);
  let score = 2;

  if (supportedOperations.includes(toolpath.operationId)) {
    score += 4;
  }
  if (tool.operation === toolpath.operationId) {
    score += 2;
  }
  if (tool.toolpathKeywords?.some((keyword) => signatureMatchesKeyword(signature, keyword))) {
    score += 6;
  }

  switch (tool.geometryClass) {
    case 'face-mill':
      score += familyId === 'face_milling' ? 10 : 0;
      if (familyId === 'roughing' && /high feed/.test(signature)) score += 8;
      if (tool.wiperGeometry) score += 2;
      break;
    case 'variable-helix-endmill':
      score += familyId === 'roughing' ? 10 : familyId === 'pocketing' ? 7 : 3;
      if (tool.variableHelix) score += 2;
      break;
    case 'square-endmill':
      if (familyId === 'engraving') {
        score += /engrave|scribe|mark/.test(toolSig) ? 14 : 0;
        break;
      }
      score += ['slotting', 'profiling', 'pocketing', 'finishing', 'face_milling'].includes(familyId) ? 8 : 5;
      if (familyId === 'slotting' && tool.centerCutting) score += 2;
      break;
    case 'ball-endmill':
      score += familyId === 'multiaxis' ? 11 : familyId === 'surface_finish' ? 10 : 6;
      break;
    case 'chamfer':
      if (familyId === 'engraving') {
        score += /engrave|scribe|mark/.test(toolSig) ? 16 : 14;
      } else {
        score += toolpath.operationId === 'chamfer_milling' ? 12 : 0;
      }
      break;
    case 'drill':
      score += familyId === 'drilling' ? 10 : familyId === 'boring' ? 4 : 0;
      break;
    case 'tap':
      score += familyId === 'threading' ? 12 : 0;
      break;
    case 'reamer':
      score += familyId === 'drilling' || familyId === 'boring' ? 9 : 0;
      break;
    case 'roughing-insert':
      score += familyId === 'turning_rough' ? 12 : 0;
      break;
    case 'finishing-insert':
      score += familyId === 'turning_finish' ? 12 : 0;
      if (tool.wiperGeometry || tool.edgePrep === 'wiper') score += 2;
      break;
    case 'grooving-insert':
      score += familyId === 'grooving' ? 12 : 0;
      break;
    case 'threading-insert':
      score += familyId === 'threading' ? 12 : 0;
      break;
    case 'boring-bar':
      score += familyId === 'boring' ? 12 : familyId === 'turning_finish' ? 4 : 0;
      break;
    case 'live-tool-endmill':
      score += ['profiling', 'slotting', 'pocketing', 'finishing', 'surface_finish', 'multiaxis', 'live_milling'].includes(familyId) ? 9 : 0;
      break;
    default:
      break;
  }

  return Math.max(score, 0);
}

export function toolSupportsToolpath(
  tool: Pick<
    ToolCatalogItem,
    | 'bodyType'
    | 'catalogNumber'
    | 'centerCutting'
    | 'description'
    | 'edgePrep'
    | 'family'
    | 'geometryClass'
    | 'insertCount'
    | 'insertType'
    | 'label'
    | 'operation'
    | 'supportedOperations'
    | 'toolpathKeywords'
    | 'variableHelix'
    | 'wiperGeometry'
  >,
  toolpath: CalculatorToolpathDescriptor,
) {
  return scoreToolForToolpath(tool, toolpath) > 0;
}

export function selectPreferredToolForToolpath<
  T extends Pick<
    ToolCatalogItem,
    | 'id'
    | 'bodyType'
    | 'catalogNumber'
    | 'centerCutting'
    | 'description'
    | 'edgePrep'
    | 'family'
    | 'geometryClass'
    | 'insertCount'
    | 'insertType'
    | 'label'
    | 'operation'
    | 'supportedOperations'
    | 'toolpathKeywords'
    | 'variableHelix'
    | 'wiperGeometry'
  >,
>(
  tools: T[],
  toolpath: CalculatorToolpathDescriptor | undefined,
) {
  if (!toolpath) return undefined;

  return tools
    .map((tool) => ({ tool, score: scoreToolForToolpath(tool, toolpath) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.tool;
}

function materialIsoGroup(material: Pick<MaterialCatalogItem, 'group'> | undefined) {
  switch (material?.group) {
    case 'stainless':
      return 'M';
    case 'cast':
    case 'cast_iron':
      return 'K';
    case 'aluminum':
    case 'nonferrous':
    case 'plastic':
      return 'N';
    case 'superalloy':
    case 'titanium':
      return 'S';
    case 'tool_steel':
      return 'H';
    case 'steel':
    default:
      return 'P';
  }
}

function parseInsertGrade(grade: string) {
  const normalized = grade.trim().toUpperCase();
  const iso = normalized.match(/^([PMKNSH])/i)?.[1] ?? '';
  const gradeNumber = Number(normalized.match(/(\d{1,2})/)?.[1] ?? Number.NaN);
  return {
    iso,
    gradeNumber: Number.isFinite(gradeNumber) ? gradeNumber : null,
    normalized,
  };
}

function gradeFinishBias(toolpathFamily: string) {
  return ['surface_finish', 'finishing', 'turning_finish', 'threading'].includes(toolpathFamily);
}

function gradeRoughBias(toolpathFamily: string) {
  return ['roughing', 'face_milling', 'pocketing', 'turning_rough', 'grooving', 'drilling'].includes(toolpathFamily);
}

function buildFallbackInsertType(tool: Pick<ToolCatalogItem, 'geometryClass' | 'label' | 'catalogNumber'>) {
  const catalogMatch = `${tool.catalogNumber ?? ''} ${tool.label}`.toUpperCase().match(/\b([A-Z]{4}\d{4,6}[A-Z0-9-]*)\b/);
  if (catalogMatch?.[1]) return catalogMatch[1];

  switch (tool.geometryClass) {
    case 'face-mill':
      return 'Face mill insert family';
    case 'roughing-insert':
      return 'OD roughing insert family';
    case 'finishing-insert':
      return 'OD finishing insert family';
    case 'grooving-insert':
      return 'Grooving insert family';
    case 'threading-insert':
      return 'Threading insert family';
    case 'boring-bar':
      return 'Boring insert family';
    case 'drill':
      return 'Indexable drill insert family';
    default:
      return 'Insert family';
  }
}

function buildFallbackGrades(material: Pick<MaterialCatalogItem, 'group'> | undefined, toolpathFamily: string) {
  const iso = materialIsoGroup(material);
  if (gradeFinishBias(toolpathFamily)) return [`${iso}15`, `${iso}25`];
  if (gradeRoughBias(toolpathFamily)) return [`${iso}25`, `${iso}35`];
  return [`${iso}25`];
}

function machineSupportNote(
  tool: Pick<ToolCatalogItem, 'coolantThrough'>,
  machine: Pick<MachineCatalogItem, 'coolantOptionIds'> | undefined,
) {
  if (!tool.coolantThrough) return '';
  if (machine?.coolantOptionIds?.includes('tsc')) return 'Machine can support through-coolant use';
  if (machine?.coolantOptionIds?.includes('through_air')) return 'Machine can support through-air assist';
  return '';
}

export function buildInsertOptionsForTool(args: {
  tool: Pick<
    ToolCatalogItem,
    | 'bodyType'
    | 'catalogNumber'
    | 'coolantThrough'
    | 'description'
    | 'family'
    | 'geometryClass'
    | 'insertCount'
    | 'insertGrades'
    | 'insertPriceUsd'
    | 'insertType'
    | 'label'
    | 'wiperGeometry'
  >;
  material?: Pick<MaterialCatalogItem, 'group' | 'name'>;
  toolpath?: CalculatorToolpathDescriptor;
  machine?: Pick<MachineCatalogItem, 'coolantOptionIds'>;
}): CalculatorInsertOption[] {
  const bodyType = inferToolBodyType(args.tool);
  if (bodyType !== 'indexable') return [];

  const toolpathFamily = args.toolpath ? classifyToolpathFamily(args.toolpath) : args.tool.geometryClass ?? 'roughing';
  const insertType = args.tool.insertType?.trim() || buildFallbackInsertType(args.tool);
  const grades = (args.tool.insertGrades?.length ? args.tool.insertGrades : buildFallbackGrades(args.material, toolpathFamily))
    .map((grade) => grade.trim().toUpperCase())
    .filter(Boolean);
  const targetIso = materialIsoGroup(args.material);

  const options = grades.map((grade) => {
    const parsedGrade = parseInsertGrade(grade);
    let recommendationScore = 2;
    const reasons: string[] = [];

    if (parsedGrade.iso === targetIso) {
      recommendationScore += 10;
      reasons.push(`${parsedGrade.iso}-grade matches the selected material family`);
    } else if (targetIso === 'H' && ['P', 'S'].includes(parsedGrade.iso)) {
      recommendationScore += 2;
      reasons.push('closest published grade family for hardened work');
    } else if (parsedGrade.iso) {
      recommendationScore -= 1;
    }

    if (gradeFinishBias(toolpathFamily)) {
      if ((parsedGrade.gradeNumber ?? 99) <= 15) {
        recommendationScore += 4;
        reasons.push('leaner grade for finish quality and lower edge force');
      } else if ((parsedGrade.gradeNumber ?? 99) <= 25) {
        recommendationScore += 2;
      }
      if (args.tool.wiperGeometry) {
        recommendationScore += 1;
        reasons.push('pairs well with wiper-capable finish geometry');
      }
    }

    if (gradeRoughBias(toolpathFamily)) {
      if ((parsedGrade.gradeNumber ?? 0) >= 25) {
        recommendationScore += 4;
        reasons.push('tougher grade for roughing load and interrupted cut risk');
      } else if ((parsedGrade.gradeNumber ?? 0) >= 20) {
        recommendationScore += 2;
      }
    }

    const supportNote = machineSupportNote(args.tool, args.machine);
    if (supportNote) {
      recommendationScore += 1;
      reasons.push(supportNote);
    }

    return {
      id: `${insertType}__${grade}`,
      label: `${insertType} · ${grade}`,
      detail: `${grade} · ${reasons[0] ?? 'Published insert grade'}${args.tool.insertCount ? ` · ${args.tool.insertCount} pockets` : ''}`,
      insertType,
      insertGrade: grade,
      recommendationScore,
      recommendationReason: reasons.join(' · ') || 'Published insert grade for this holder family',
      recommended: false as boolean,
      priceUsd: args.tool.insertPriceUsd,
    } satisfies CalculatorInsertOption;
  });

  const sorted = options.sort((left, right) => right.recommendationScore - left.recommendationScore || left.label.localeCompare(right.label));
  if (sorted[0]) {
    sorted[0] = { ...sorted[0], recommended: true };
  }
  return sorted;
}
