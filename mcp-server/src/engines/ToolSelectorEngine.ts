/**
 * ToolSelectorEngine.ts — R13-MS4: Tool Selector Extraction
 *
 * Extracted from monolith modules:
 *   - PRISM_AI_AUTO_CAM.js (operation→tool suitability map, scoring)
 *   - PRISM_CALCULATOR_RECOMMENDATION_ENGINE.js (material recognition, recommendations)
 *
 * New MCP actions: select_optimal_tool, score_tool_candidates
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type OperationType = 'face' | 'rough' | 'semi_finish' | 'finish' | 'pocket_rough' | 'drill' | 'tap' | 'chamfer' | 'slot' | 'thread' | 'bore' | 'ream';
export type ToolType = 'face_mill' | 'fly_cutter' | 'square_endmill' | 'roughing_endmill' | 'bull_endmill' | 'ball_endmill' | 'twist_drill' | 'spot_drill' | 'tap' | 'chamfer_mill' | 'countersink' | 'boring_bar' | 'reamer' | 'thread_mill';

export interface ToolCandidate {
  id?: string;
  type: ToolType | string;
  diameter: number;
  flutes?: number;
  coating?: string;
  material?: string;
  cornerRadius?: number;
  materials?: string[];  // compatible materials
  name?: string;
}

export interface OperationSpec {
  type: OperationType | string;
  geometry?: { width?: number; length?: number; depth?: number };
  tolerance?: number;
  surfaceFinish?: number;
}

export interface ToolScore {
  tool: ToolCandidate;
  score: number;
  breakdown: { baseSuitability: number; materialBonus: number; coatingBonus: number; sizeScore: number; fluteScore: number; total: number };
  suitable: boolean;
  rank: number;
}

export interface MaterialInfo {
  id: string; name: string; category: string;
  machinabilityIndex: number;
  recommendedSFM: { carbide: number };
  hardness?: number; source: string;
}

export interface ToolRecommendation {
  material: MaterialInfo;
  tool: ToolCandidate & { strategy?: string; suitability?: string; validationWarnings?: string[] };
  parameters: { rpm: number; feedRate: number; fpt: number; doc: number; woc: number; sfm: number };
  confidence: number;
  warnings: Array<{ level: string; message: string }>;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Operation → suitable tool types map */
const SUITABILITY_MAP: Record<string, string[]> = {
  face:         ['face_mill', 'fly_cutter'],
  rough:        ['square_endmill', 'roughing_endmill', 'bull_endmill'],
  semi_finish:  ['square_endmill', 'bull_endmill', 'ball_endmill'],
  finish:       ['ball_endmill', 'bull_endmill', 'square_endmill'],
  pocket_rough: ['square_endmill', 'roughing_endmill'],
  drill:        ['twist_drill', 'spot_drill'],
  tap:          ['tap'],
  chamfer:      ['chamfer_mill', 'countersink'],
  slot:         ['square_endmill', 'roughing_endmill'],
  thread:       ['thread_mill', 'tap'],
  bore:         ['boring_bar'],
  ream:         ['reamer'],
};

/** Material recognition patterns */
const MATERIAL_PATTERNS: Array<{ pattern: RegExp; category: string; sfm: number; mi: number; fpt: number }> = [
  { pattern: /aluminum|al\s*\d|6061|7075|2024/, category: 'aluminum', sfm: 800, mi: 500, fpt: 0.005 },
  { pattern: /1018|1020|1045|a36|carbon.*steel|mild.*steel/, category: 'carbon_steel', sfm: 100, mi: 100, fpt: 0.003 },
  { pattern: /304|316|stainless/, category: 'stainless', sfm: 80, mi: 45, fpt: 0.002 },
  { pattern: /4140|4340|alloy.*steel/, category: 'alloy_steel', sfm: 80, mi: 65, fpt: 0.0025 },
  { pattern: /titanium|ti-?6|ti.*6al/, category: 'titanium', sfm: 60, mi: 25, fpt: 0.002 },
  { pattern: /inconel|hastelloy|waspaloy/, category: 'superalloy', sfm: 30, mi: 15, fpt: 0.0015 },
  { pattern: /brass|bronze|copper/, category: 'copper', sfm: 400, mi: 300, fpt: 0.004 },
  { pattern: /cast.*iron|ductile|grey.*iron/, category: 'cast_iron', sfm: 100, mi: 80, fpt: 0.003 },
  { pattern: /plastic|nylon|delrin|peek|acetal/, category: 'plastic', sfm: 500, mi: 400, fpt: 0.006 },
];

/** Fallback tools when no database available */
const FALLBACK_TOOLS: Record<string, ToolCandidate> = {
  face:    { type: 'face_mill', diameter: 50, flutes: 6, name: '50mm Face Mill', material: 'carbide' },
  rough:   { type: 'square_endmill', diameter: 12, flutes: 4, name: '12mm Square End Mill', material: 'carbide', coating: 'AlTiN' },
  finish:  { type: 'ball_endmill', diameter: 6, flutes: 2, name: '6mm Ball End Mill', material: 'carbide', coating: 'AlTiN' },
  drill:   { type: 'twist_drill', diameter: 8, flutes: 2, name: '8mm Twist Drill', material: 'carbide', coating: 'TiN' },
  slot:    { type: 'square_endmill', diameter: 10, flutes: 4, name: '10mm Slot End Mill', material: 'carbide', coating: 'TiAlN' },
  chamfer: { type: 'chamfer_mill', diameter: 10, flutes: 4, name: '10mm Chamfer Mill', material: 'carbide' },
};

/** Operation multipliers for SFM */
const OPERATION_SFM_MULT: Record<string, number> = {
  rough: 0.8, semi_finish: 0.9, finish: 1.1, drill: 0.6, slot: 0.7,
  face: 1.0, chamfer: 0.9, tap: 0.3, bore: 0.9, ream: 0.5, thread: 0.4,
};

// ─── TOOL SELECTOR ENGINE ───────────────────────────────────────────────────

export class ToolSelectorEngine {

  // ── MATERIAL RECOGNITION ──────────────────────────────────────────

  /** Identify material from string, object, or hardness */
  recognizeMaterial(input: string | Record<string, any>): MaterialInfo {
    if (!input) return this.defaultMaterial();

    // Already structured
    if (typeof input === 'object') {
      if ((input as any).machinabilityIndex) return input as MaterialInfo;
      if ((input as any).hardness || (input as any).HRC) return this.inferFromHardness((input as any).hardness || (input as any).HRC);
      return this.defaultMaterial();
    }

    // String matching
    const lower = (input as string).toLowerCase();
    for (const { pattern, category, sfm, mi, fpt } of MATERIAL_PATTERNS) {
      if (pattern.test(lower)) {
        return { id: `parsed_${category}`, name: input as string, category, machinabilityIndex: mi, recommendedSFM: { carbide: sfm }, source: 'parsed' };
      }
    }
    return this.defaultMaterial();
  }

  private inferFromHardness(h: number): MaterialInfo {
    if (h < 20) return { id: 'inferred_aluminum', name: 'Inferred Aluminum', category: 'aluminum', hardness: h, machinabilityIndex: 500, recommendedSFM: { carbide: 800 }, source: 'inferred' };
    if (h < 35) return { id: 'inferred_steel', name: 'Inferred Steel', category: 'carbon_steel', hardness: h, machinabilityIndex: 100, recommendedSFM: { carbide: 100 }, source: 'inferred' };
    if (h < 50) return { id: 'inferred_tool_steel', name: 'Inferred Tool Steel', category: 'tool_steel', hardness: h, machinabilityIndex: 60, recommendedSFM: { carbide: 60 }, source: 'inferred' };
    return { id: 'inferred_hardened', name: 'Inferred Hardened Steel', category: 'hardened_steel', hardness: h, machinabilityIndex: 30, recommendedSFM: { carbide: 40 }, source: 'inferred' };
  }

  private defaultMaterial(): MaterialInfo {
    return { id: 'default_steel', name: 'General Steel', category: 'carbon_steel', machinabilityIndex: 100, recommendedSFM: { carbide: 100 }, source: 'default' };
  }

  // ── TOOL SCORING ──────────────────────────────────────────────────

  /** Check if a tool is suitable for an operation */
  isSuitable(tool: ToolCandidate, operation: OperationSpec): boolean {
    const suitableTypes = SUITABILITY_MAP[operation.type] || [];
    return suitableTypes.includes(tool.type);
  }

  /** Score a tool for a specific operation + material */
  scoreTool(tool: ToolCandidate, operation: OperationSpec, materialName: string): ToolScore {
    const material = this.recognizeMaterial(materialName);
    const suitable = this.isSuitable(tool, operation);
    let baseSuitability = suitable ? 100 : 20;

    // Material compatibility
    let materialBonus = 0;
    if (tool.materials?.some(m => materialName.toLowerCase().includes(m.toLowerCase()))) materialBonus = 50;
    else if (tool.materials?.some(m => m.toLowerCase().includes(material.category))) materialBonus = 30;

    // Coating bonus for difficult materials
    let coatingBonus = 0;
    if (tool.coating && ['stainless', 'titanium', 'superalloy', 'alloy_steel', 'tool_steel'].includes(material.category)) coatingBonus = 30;

    // Size appropriateness
    let sizeScore = 0;
    if (operation.geometry) {
      const minFeature = Math.min(operation.geometry.width || 100, operation.geometry.length || 100);
      if (tool.diameter > minFeature * 0.8) sizeScore = -40;
      else if (tool.diameter < minFeature * 0.1) sizeScore = -20;
      else sizeScore = 10;
    }

    // Flute count for material
    let fluteScore = 0;
    if (tool.flutes) {
      if (material.category === 'aluminum' && tool.flutes <= 3) fluteScore = 20;
      else if (material.category === 'aluminum' && tool.flutes > 3) fluteScore = -10;
      else if (['carbon_steel', 'alloy_steel', 'stainless'].includes(material.category) && tool.flutes >= 4) fluteScore = 20;
    }

    const total = baseSuitability + materialBonus + coatingBonus + sizeScore + fluteScore;
    return { tool, score: total, breakdown: { baseSuitability, materialBonus, coatingBonus, sizeScore, fluteScore, total }, suitable, rank: 0 };
  }

  /** Score and rank multiple tool candidates */
  scoreAndRank(candidates: ToolCandidate[], operation: OperationSpec, material: string): ToolScore[] {
    const scored = candidates.map(t => this.scoreTool(t, operation, material));
    scored.sort((a, b) => b.score - a.score);
    scored.forEach((s, i) => s.rank = i + 1);
    return scored;
  }

  // ── TOOL RECOMMENDATION ──────────────────────────────────────────

  /** Get optimal tool with cutting parameters */
  selectOptimalTool(operation: OperationSpec, materialInput: string, machine?: { maxRPM?: number }): ToolRecommendation {
    const material = this.recognizeMaterial(materialInput);

    // Get tool recommendation
    const tool = this.recommendTool(material, operation.type);

    // Calculate cutting parameters
    const sfmBase = material.recommendedSFM.carbide;
    const sfmMult = OPERATION_SFM_MULT[operation.type] || 1.0;
    let sfm = sfmBase * sfmMult;
    if (tool.coating) sfm *= 1.3;

    let rpm = Math.round((sfm * 1000) / (Math.PI * tool.diameter));
    if (machine?.maxRPM) rpm = Math.min(rpm, machine.maxRPM);
    rpm = Math.max(100, Math.min(rpm, 20000));

    // Feed per tooth
    const matPattern = MATERIAL_PATTERNS.find(p => p.category === material.category);
    let fpt = matPattern?.fpt || 0.003;
    if (tool.type === 'ball_endmill') fpt *= 0.7;
    if (operation.type === 'finish') fpt *= 0.5;

    const flutes = tool.flutes || 4;
    const feedRate = Math.round(rpm * flutes * fpt);

    // DOC/WOC
    let doc: number, woc: number;
    if (operation.type === 'rough') { doc = tool.diameter * 0.5; woc = tool.diameter * 0.6; }
    else if (operation.type === 'finish') { doc = tool.diameter * 0.1; woc = tool.diameter * 0.2; }
    else { doc = tool.diameter * 0.2; woc = tool.diameter * 0.4; }

    // Confidence
    let confidence = 0.8;
    if (material.source === 'inferred') confidence -= 0.1;
    if (material.source === 'default') confidence -= 0.2;

    // Warnings
    const warnings: Array<{ level: string; message: string }> = [];
    if (material.source === 'default') warnings.push({ level: 'info', message: 'Material not identified — using default' });
    if (machine?.maxRPM && rpm >= machine.maxRPM * 0.95) warnings.push({ level: 'warning', message: 'Speed near machine RPM limit' });
    if (material.category === 'aluminum' && (tool.flutes || 0) > 3) warnings.push({ level: 'info', message: 'Fewer flutes recommended for aluminum' });

    return {
      material,
      tool: { ...tool, suitability: 'optimal' },
      parameters: { rpm, feedRate, fpt: Math.round(fpt * 10000) / 10000, doc: Math.round(doc * 100) / 100, woc: Math.round(woc * 100) / 100, sfm: Math.round(sfm) },
      confidence: Math.max(0.3, Math.min(1.0, confidence)),
      warnings,
    };
  }

  /** Recommend a tool by material and operation */
  private recommendTool(material: MaterialInfo, opType: string): ToolCandidate {
    const cat = material.category;
    const isAluminum = cat === 'aluminum';

    if (opType === 'face') return { type: 'face_mill', diameter: 50, flutes: 6, coating: 'AlTiN', material: 'carbide', name: '50mm Face Mill' };
    if (opType === 'rough' || opType === 'pocket_rough') return { type: 'square_endmill', diameter: 16, flutes: isAluminum ? 3 : 4, coating: 'AlTiN', material: 'carbide', cornerRadius: 0.4, name: `16mm ${isAluminum ? '3-flute' : '4-flute'} End Mill` };
    if (opType === 'finish') return { type: 'ball_endmill', diameter: 6, flutes: isAluminum ? 3 : 5, coating: 'AlTiN', material: 'carbide', name: '6mm Ball Nose End Mill' };
    if (opType === 'drill') return { type: 'twist_drill', diameter: 8, flutes: 2, coating: 'TiN', material: 'carbide', name: '8mm Carbide Drill' };
    if (opType === 'slot') return { type: 'square_endmill', diameter: 10, flutes: isAluminum ? 2 : 4, coating: 'TiAlN', material: 'carbide', name: '10mm Slot End Mill' };

    // Fallback
    return FALLBACK_TOOLS[opType] || FALLBACK_TOOLS['rough'];
  }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────────────────────

export const toolSelector = new ToolSelectorEngine();

// ── ACTION DISPATCHER (for MCP wiring) ─────────────────────────────────────

export function executeToolSelectorAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case 'select_optimal_tool': {
      const opType = params.operation || params.operation_type || 'rough';
      const material = params.material || 'steel';
      const machine = params.machine;
      const operation: OperationSpec = { type: opType, geometry: params.geometry, tolerance: params.tolerance, surfaceFinish: params.surface_finish };
      return toolSelector.selectOptimalTool(operation, material, machine);
    }

    case 'score_tool_candidates': {
      const candidates = params.candidates as ToolCandidate[];
      if (!candidates?.length) return { error: 'candidates array required (each with type, diameter)' };
      const opType = params.operation || params.operation_type || 'rough';
      const material = params.material || 'steel';
      const operation: OperationSpec = { type: opType, geometry: params.geometry };
      const scored = toolSelector.scoreAndRank(candidates, operation, material);
      return { candidates: scored, total: scored.length, topTool: scored[0]?.tool?.name || scored[0]?.tool?.type, topScore: scored[0]?.score, operation: opType, material: toolSelector.recognizeMaterial(material).category };
    }

    default:
      throw new Error(`Unknown tool_selector action: ${action}`);
  }
}
