/**
 * PRISM MCP Server — Intent Decomposition Engine (R8-MS0)
 *
 * Takes natural-language manufacturing queries and produces an execution plan:
 * an ordered list of MCP actions with dependency links and data-flow mappings.
 *
 * Entity extraction is rule-based (no LLM needed at runtime):
 *   - Material patterns: "4140", "Inconel 718", "stainless", "aluminum"
 *   - Tool patterns: "half inch endmill", "3-flute", "bull nose"
 *   - Machine patterns: "Haas VF-2", "DMU 50", "five-axis"
 *   - Operation patterns: "rough out", "drill and tap", "finish"
 *   - Constraint patterns: "surface finish matters", "aerospace", "prototype"
 *
 * The plan is topologically sorted so upstream data feeds downstream steps.
 *
 * @module IntentDecompositionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedEntities {
  material?: string;
  material_raw?: string;           // Original text matched
  machine?: string;
  machine_raw?: string;
  tool?: string;
  tool_diameter_mm?: number;
  tool_flutes?: number;
  tool_type?: string;              // endmill, drill, tap, etc.
  operation?: string;
  feature?: {
    type: string;                  // pocket, slot, hole, contour, face
    depth_mm?: number;
    width_mm?: number;
    tolerance_mm?: number;
  };
  constraints?: {
    surface_finish?: string;       // "matters", "Ra ≤ 1.6", etc.
    application?: string;          // aerospace, medical, automotive
    batch_size?: number;
    optimize_for?: string;         // cost, speed, quality
    tolerance_mm?: number;
  };
  units?: 'metric' | 'imperial';
}

export interface ExecutionStep {
  id: string;
  action: string;                  // "prism_data.material_get", etc.
  inputs: Record<string, any>;
  depends_on: string[];
  output_mapping: {
    field: string;
    target_step: string;
    target_input: string;
  }[];
  required: boolean;
  estimated_tokens: number;
  description: string;             // Human-readable step description
}

export type Persona = 'machinist' | 'programmer' | 'manager' | 'unknown';

export interface IntentDecomposition {
  entities: ExtractedEntities;
  plan: ExecutionStep[];
  persona: Persona;
  confidence: number;
  ambiguities: string[];           // Questions that would improve accuracy
  raw_query: string;
  safety: { score: number; warnings: string[] };
}

// ============================================================================
// MATERIAL PATTERNS
// ============================================================================

interface MaterialMatch { name: string; iso_group: string; }

const MATERIAL_PATTERNS: [RegExp, MaterialMatch][] = [
  // Steel — P group
  [/\b(?:aisi\s*)?(?:10)?18\b/i,            { name: 'AISI 1018', iso_group: 'P' }],
  [/\b(?:aisi\s*)?(?:10)?20\b/i,            { name: 'AISI 1020', iso_group: 'P' }],
  [/\b(?:aisi\s*)?(?:10)?45\b/i,            { name: 'AISI 1045', iso_group: 'P' }],
  [/\b(?:aisi\s*)?4130\b/i,                 { name: 'AISI 4130', iso_group: 'P' }],
  [/\b(?:aisi\s*)?4140\b/i,                 { name: 'AISI 4140', iso_group: 'P' }],
  [/\b(?:aisi\s*)?4340\b/i,                 { name: 'AISI 4340', iso_group: 'P' }],
  [/\bmild\s*steel\b/i,                     { name: 'AISI 1018', iso_group: 'P' }],
  [/\bcarbon\s*steel\b/i,                   { name: 'AISI 1045', iso_group: 'P' }],
  [/\bforty[\s-]*one[\s-]*forty\b/i,        { name: 'AISI 4140', iso_group: 'P' }],
  // Stainless — M group
  [/\b304(?:\s*(?:ss|stainless))?\b/i,      { name: '304 Stainless', iso_group: 'M' }],
  [/\b316(?:L)?(?:\s*(?:ss|stainless))?\b/i, { name: '316L Stainless', iso_group: 'M' }],
  [/\b17[\s-]*4\s*PH\b/i,                   { name: '17-4PH Stainless', iso_group: 'M' }],
  [/\bduplex\s*(?:2205)?\b/i,               { name: 'Duplex 2205', iso_group: 'M' }],
  // Cast iron — K group
  [/\bgray\s*iron\b/i,                      { name: 'GG25 Gray Iron', iso_group: 'K' }],
  [/\bductile\s*iron\b/i,                   { name: 'GGG50 Ductile Iron', iso_group: 'K' }],
  [/\bcast\s*iron\b/i,                      { name: 'GG25 Gray Iron', iso_group: 'K' }],
  // Aluminum — N group
  [/\b6061(?:[\s-]*T6)?\b/i,                { name: '6061-T6', iso_group: 'N' }],
  [/\b7075(?:[\s-]*T6)?\b/i,                { name: '7075-T6', iso_group: 'N' }],
  [/\b2024\b/i,                              { name: '2024-T3', iso_group: 'N' }],
  // Superalloys — S group
  [/\binconel[\s-]*718\b/i,                  { name: 'Inconel 718', iso_group: 'S' }],
  [/\binconel[\s-]*625\b/i,                  { name: 'Inconel 625', iso_group: 'S' }],
  [/\bti[\s-]*6al[\s-]*4v\b/i,              { name: 'Ti-6Al-4V', iso_group: 'S' }],
  [/\btitanium\b/i,                          { name: 'Ti-6Al-4V', iso_group: 'S' }],
  [/\bhastelloy\b/i,                         { name: 'Hastelloy C-276', iso_group: 'S' }],
  // Hardened — H group
  [/\bD2(?:\s*tool\s*steel)?\b/i,            { name: 'D2 Tool Steel', iso_group: 'H' }],
  [/\bH13\b/i,                               { name: 'H13 Tool Steel', iso_group: 'H' }],
  [/\bA2\b/i,                                { name: 'A2 Tool Steel', iso_group: 'H' }],
  [/\bM2\b/i,                                { name: 'M2 HSS', iso_group: 'H' }],
  // Generic patterns (lower priority — checked last)
  [/\bstainless\b/i,                         { name: '304 Stainless', iso_group: 'M' }],
  [/\baluminum\b/i,                          { name: '6061-T6', iso_group: 'N' }],
  [/\baluminium\b/i,                         { name: '6061-T6', iso_group: 'N' }],
  [/\binconel\b/i,                           { name: 'Inconel 718', iso_group: 'S' }],
  [/\bsteel\b/i,                             { name: 'AISI 4140', iso_group: 'P' }],
];

// ============================================================================
// TOOL PATTERNS
// ============================================================================

interface ToolMatch { type: string; diameter_mm?: number; flutes?: number; }

function extractTool(query: string): ToolMatch | null {
  let type = 'endmill';
  let diameter_mm: number | undefined;
  let flutes: number | undefined;

  // Tool type — check specific patterns first (ball nose before endmill)
  if (/\bball[\s-]*nose/i.test(query)) type = 'ball_nose';
  else if (/\bbull[\s-]*nose/i.test(query)) type = 'corner_radius';
  else if (/\bface\s*mill/i.test(query)) type = 'face_mill';
  else if (/\bthread\s*mill/i.test(query)) type = 'thread_mill';
  else if (/\bend\s*mill/i.test(query)) type = 'endmill';
  else if (/\bdrill(?:s|ing)?\b/i.test(query)) type = 'drill';
  else if (/\btap(?:s|ping)?\b/i.test(query)) type = 'tap';
  else if (/\breamer/i.test(query)) type = 'reamer';
  else if (/\bboring\s*bar/i.test(query)) type = 'boring_bar';
  else if (/\binsert/i.test(query)) type = 'insert';
  else if (/\bchamfer/i.test(query)) type = 'chamfer_tool';
  else if (/\bmilling\b/i.test(query)) type = 'endmill';
  else if (/\bturning\b/i.test(query)) type = 'insert';
  else if (!/\b(?:tool|cutter|bit)\b/i.test(query)) return null;

  // Diameter — imperial fractions
  const fracMatch = query.match(/(\d+)?\s*[\/]?\s*(\d+)\s*[\/]\s*(\d+)\s*(?:inch|in|")/i);
  if (fracMatch) {
    const whole = fracMatch[1] ? parseInt(fracMatch[1]) : 0;
    diameter_mm = (whole + parseInt(fracMatch[2]) / parseInt(fracMatch[3])) * 25.4;
  }
  // "half inch" pattern
  if (!diameter_mm && /half\s*(?:inch|in|")/i.test(query)) diameter_mm = 12.7;
  if (!diameter_mm && /quarter\s*(?:inch|in|")/i.test(query)) diameter_mm = 6.35;
  if (!diameter_mm && /three[\s-]*quarter/i.test(query)) diameter_mm = 19.05;

  // Diameter — decimal imperial
  if (!diameter_mm) {
    const decMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:inch|in|")\s*(?:diameter|dia|Ø)?/i);
    if (decMatch) diameter_mm = parseFloat(decMatch[1]) * 25.4;
  }
  // Diameter — metric
  if (!diameter_mm) {
    const mmMatch = query.match(/(?:Ø|diameter|dia)\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i)
      || query.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:diameter|dia|endmill|drill|tool)/i);
    if (mmMatch) diameter_mm = parseFloat(mmMatch[1]);
  }

  // Flutes
  const fluteMatch = query.match(/(\d+)[\s-]*(?:flute|fl)\b/i)
    || query.match(/(?:two|three|four|five|six)-?\s*flute/i);
  if (fluteMatch) {
    const text = fluteMatch[0].toLowerCase();
    if (/two|2/.test(text)) flutes = 2;
    else if (/three|3/.test(text)) flutes = 3;
    else if (/four|4/.test(text)) flutes = 4;
    else if (/five|5/.test(text)) flutes = 5;
    else if (/six|6/.test(text)) flutes = 6;
  }

  return { type, diameter_mm, flutes };
}

// ============================================================================
// MACHINE PATTERNS
// ============================================================================

const MACHINE_PATTERNS: [RegExp, string][] = [
  [/\bhaas\s*vf[\s-]*(\d+)/i,      'Haas VF-$1'],
  [/\bhaas\s*st[\s-]*(\d+)/i,      'Haas ST-$1'],
  [/\bhaas\s*umc[\s-]*(\d+)/i,     'Haas UMC-$1'],
  [/\bdmu[\s-]*(\d+)/i,            'DMG Mori DMU $1'],
  [/\bmazak/i,                     'Mazak'],
  [/\bokuma/i,                     'Okuma'],
  [/\bdoosan/i,                    'Doosan'],
  [/\bmori\s*seiki/i,              'DMG Mori'],
  [/\bmakino/i,                    'Makino'],
  [/\bhermle/i,                    'Hermle'],
  [/\bgrob/i,                      'Grob'],
  [/\bhurco/i,                     'Hurco'],
  [/\btormach/i,                   'Tormach'],
  [/\bbrother/i,                   'Brother'],
  [/\brobodrill/i,                 'Fanuc Robodrill'],
];

function extractMachine(query: string): string | null {
  for (const [pattern, name] of MACHINE_PATTERNS) {
    const m = query.match(pattern);
    if (m) {
      // Replace capture groups
      let result = name;
      for (let i = 1; i < m.length; i++) {
        result = result.replace(`$${i}`, m[i]);
      }
      return result;
    }
  }
  // Generic patterns
  if (/five[\s-]*axis|5[\s-]*axis/i.test(query)) return '5-axis CNC';
  if (/three[\s-]*axis|3[\s-]*axis/i.test(query)) return '3-axis CNC';
  if (/\blathe\b/i.test(query)) return 'CNC Lathe';
  if (/\bmill\b/i.test(query) && !/\bend\s*mill/i.test(query)) return 'CNC Mill';
  return null;
}

// ============================================================================
// OPERATION PATTERNS
// ============================================================================

function extractOperation(query: string): string | null {
  if (/\btrochoidal\b/i.test(query)) return 'trochoidal_milling';
  if (/\brough(?:ing|ed|s)?\s*(?:out)?\b/i.test(query)) return 'roughing';
  if (/\bhog(?:ging)?\s*(?:it\s*)?out\b/i.test(query)) return 'roughing';
  if (/\bfinish(?:ing|ed)?\b/i.test(query)) return 'finishing';
  if (/\bclean\s*(?:ing\s*)?up\b/i.test(query)) return 'finishing';
  if (/\bsemi[\s-]*finish/i.test(query)) return 'semi-finishing';
  if (/\bdrill\s*(?:and|&)\s*tap/i.test(query)) return 'drill_and_tap';
  if (/\bthread(?:ing)?\b/i.test(query)) return 'threading';
  if (/\btap(?:ping)?\b/i.test(query)) return 'tapping';
  if (/\bdrill(?:ing)?\b/i.test(query)) return 'drilling';
  if (/\bboring\b/i.test(query)) return 'boring';
  if (/\bfac(?:e|ing)\b/i.test(query)) return 'facing';
  if (/\bturn(?:ing)?\b/i.test(query)) return 'turning';
  if (/\bgrind(?:ing)?\b/i.test(query)) return 'grinding';
  if (/\bprofile\b/i.test(query)) return 'contouring';
  if (/\bcontour(?:ing)?\b/i.test(query)) return 'contouring';
  if (/\bslot(?:ting)?\b/i.test(query)) return 'slotting';
  if (/\bpocket(?:ing)?\b/i.test(query)) return 'pocketing';
  if (/\bplunge\b/i.test(query)) return 'plunge_milling';
  if (/\btrochoidal\b/i.test(query)) return 'trochoidal_milling';
  if (/\bparting\b/i.test(query)) return 'parting';
  if (/\bgrooving\b/i.test(query)) return 'grooving';
  if (/\breaming\b/i.test(query)) return 'reaming';
  return null;
}

// ============================================================================
// FEATURE PATTERNS
// ============================================================================

function extractFeature(query: string): ExtractedEntities['feature'] | undefined {
  let type: string | undefined;
  if (/\bpocket\b/i.test(query)) type = 'pocket';
  else if (/\bslot\b/i.test(query)) type = 'slot';
  else if (/\bhole\b/i.test(query)) type = 'hole';
  else if (/\bface\b/i.test(query)) type = 'face';
  else if (/\bcontour\b/i.test(query)) type = 'contour';
  else if (/\brib\b/i.test(query)) type = 'rib';
  else if (/\bwall\b/i.test(query)) type = 'wall';
  else if (/\bgroove\b/i.test(query)) type = 'groove';
  if (!type) return undefined;

  let depth_mm: number | undefined;
  // Depth — imperial (handles "4-inch deep", "4 inch deep", "depth of 4 inches")
  const depthIn = query.match(/(\d+(?:\.\d+)?)[\s-]*(?:inch|in|")\s*(?:deep|depth)/i)
    || query.match(/(?:deep|depth)\s*(?:of\s*)?(\d+(?:\.\d+)?)[\s-]*(?:inch|in|")/i);
  if (depthIn) depth_mm = parseFloat(depthIn[1]) * 25.4;
  // Depth — metric
  if (!depth_mm) {
    const depthMm = query.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:deep|depth)/i)
      || query.match(/(?:deep|depth)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*mm/i);
    if (depthMm) depth_mm = parseFloat(depthMm[1]);
  }

  return { type, depth_mm };
}

// ============================================================================
// CONSTRAINT PATTERNS
// ============================================================================

function extractConstraints(query: string): ExtractedEntities['constraints'] | undefined {
  const constraints: ExtractedEntities['constraints'] = {};
  let found = false;

  if (/surface\s*finish\s*matters/i.test(query) || /good\s*finish/i.test(query)) {
    constraints.surface_finish = 'Ra ≤ 1.6';
    found = true;
  }
  const raMatch = query.match(/Ra\s*[≤<]?\s*(\d+(?:\.\d+)?)/i);
  if (raMatch) { constraints.surface_finish = `Ra ≤ ${raMatch[1]}`; found = true; }

  if (/\baerospace\b/i.test(query) || /\bturbine\b/i.test(query)) {
    constraints.application = 'aerospace';
    found = true;
  }
  if (/\bmedical\b/i.test(query) || /\bimplant\b/i.test(query)) {
    constraints.application = 'medical';
    found = true;
  }
  if (/\bautomotive\b/i.test(query)) { constraints.application = 'automotive'; found = true; }

  const batchMatch = query.match(/(?:batch|quantity|qty|run)\s*(?:of\s*)?(\d+)/i);
  if (batchMatch) { constraints.batch_size = parseInt(batchMatch[1]); found = true; }
  if (/\bprototype\b/i.test(query)) { constraints.batch_size = 1; found = true; }
  if (/\bproduction\s*run\b/i.test(query) && !constraints.batch_size) {
    constraints.batch_size = 100;
    found = true;
  }

  if (/\bcheap\b/i.test(query) || /\blow\s*cost\b/i.test(query)) {
    constraints.optimize_for = 'cost';
    found = true;
  }
  if (/\bfast\b/i.test(query) || /\bquick\b/i.test(query) || /\bhurry\b/i.test(query)) {
    constraints.optimize_for = 'speed';
    found = true;
  }

  const tolMatch = query.match(/(?:tolerance|tol)\s*(?:of\s*)?[±]?\s*(\d+(?:\.\d+)?)\s*(mm|thou|")/i);
  if (tolMatch) {
    let tol = parseFloat(tolMatch[1]);
    if (tolMatch[2] === 'thou' || tolMatch[2] === '"') tol *= 0.0254;
    constraints.tolerance_mm = tol;
    found = true;
  }
  if (/tight\s*tolerance/i.test(query)) { constraints.tolerance_mm = 0.025; found = true; }

  return found ? constraints : undefined;
}

// ============================================================================
// UNIT DETECTION
// ============================================================================

function detectUnits(query: string): 'metric' | 'imperial' | undefined {
  const imperialScore = (query.match(/inch|in\b|"|thou|ipm|sfm|hp\b|ft\b/gi) || []).length;
  const metricScore = (query.match(/mm\b|µm|m\/min|kw\b|cm\b/gi) || []).length;
  if (imperialScore > metricScore) return 'imperial';
  if (metricScore > imperialScore) return 'metric';
  return undefined;
}

// ============================================================================
// PERSONA DETECTION
// ============================================================================

function detectPersona(query: string): Persona {
  // Machinist indicators: colloquial language, specific machines, shop talk
  const machinistScore =
    (/\bhog\b|\brough\s*out\b|\bmy\s+(?:haas|mazak|lathe)\b|\bfavorite\b|\bset\s*up\b/i.test(query) ? 2 : 0) +
    (/speed.*feed|rpm|ipm|sfm|chip\s*load/i.test(query) ? 1 : 0) +
    (/what\s*(?:speed|feed|rpm)/i.test(query) ? 2 : 0);

  // Programmer indicators: CAM terms, G-code, toolpath strategy
  const programmerScore =
    (/toolpath|cam\b|g[\s-]*code|feeds?\s*and\s*speeds?|stepover|stepdown|scallop/i.test(query) ? 2 : 0) +
    (/trochoidal|adaptive|hsm\b|high[\s-]*speed/i.test(query) ? 1 : 0) +
    (/\bcad\b|\bnx\b|\bmastercam\b|\bfusion\b|\bsolidworks\b|\bhypermill\b/i.test(query) ? 2 : 0);

  // Manager indicators: cost, time, ROI, schedule
  const managerScore =
    (/\bcost\b|\bprice\b|\bbudget\b|\broi\b|\binvestment\b/i.test(query) ? 2 : 0) +
    (/\bschedule\b|\bdeadline\b|\bdue\s*date\b|\bcapacity\b|\bthroughput\b/i.test(query) ? 2 : 0) +
    (/how\s*(?:much|long)|estimate/i.test(query) ? 1 : 0);

  const max = Math.max(machinistScore, programmerScore, managerScore);
  if (max === 0) return 'unknown';
  if (machinistScore === max) return 'machinist';
  if (programmerScore === max) return 'programmer';
  return 'manager';
}

// ============================================================================
// PLAN GENERATION
// ============================================================================

function generatePlan(entities: ExtractedEntities): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  let stepId = 0;

  const nextId = () => `step_${++stepId}`;

  // Step 1: Material lookup (if material identified)
  if (entities.material) {
    const id = nextId();
    steps.push({
      id,
      action: 'prism_data.material_get',
      inputs: { name: entities.material },
      depends_on: [],
      output_mapping: [
        { field: 'kc1_1', target_step: '', target_input: 'material_kc1_1' },
        { field: 'mc', target_step: '', target_input: 'material_mc' },
      ],
      required: true,
      estimated_tokens: 200,
      description: `Look up ${entities.material} properties`,
    });
  }

  // Step 2: Machine lookup (if machine identified)
  if (entities.machine) {
    const id = nextId();
    steps.push({
      id,
      action: 'prism_data.machine_get',
      inputs: { name: entities.machine },
      depends_on: [],
      output_mapping: [
        { field: 'max_rpm', target_step: '', target_input: 'machine_max_rpm' },
        { field: 'max_power_kw', target_step: '', target_input: 'machine_power_kw' },
      ],
      required: false,
      estimated_tokens: 200,
      description: `Look up ${entities.machine} capabilities`,
    });
  }

  // Step 3: Tool lookup/recommendation (if tool identified)
  if (entities.tool_type) {
    const id = nextId();
    const toolInputs: Record<string, any> = { type: entities.tool_type };
    if (entities.tool_diameter_mm) toolInputs.diameter_mm = entities.tool_diameter_mm;
    if (entities.tool_flutes) toolInputs.flutes = entities.tool_flutes;

    steps.push({
      id,
      action: 'prism_data.tool_search',
      inputs: toolInputs,
      depends_on: [],
      output_mapping: [],
      required: false,
      estimated_tokens: 300,
      description: `Find ${entities.tool_type}${entities.tool_diameter_mm ? ` Ø${entities.tool_diameter_mm.toFixed(1)}mm` : ''}`,
    });
  }

  // Step 4: Speed/feed calculation (requires material, benefits from tool)
  if (entities.material || entities.operation) {
    const id = nextId();
    const deps = steps.filter((s) => s.action.includes('material_get')).map((s) => s.id);
    const sfInputs: Record<string, any> = {};
    if (entities.material) sfInputs.material = entities.material;
    if (entities.operation) sfInputs.operation = entities.operation;
    if (entities.tool_diameter_mm) sfInputs.diameter_mm = entities.tool_diameter_mm;
    if (entities.tool_flutes) sfInputs.flutes = entities.tool_flutes;

    steps.push({
      id,
      action: 'prism_calc.speed_feed',
      inputs: sfInputs,
      depends_on: deps,
      output_mapping: [
        { field: 'recommended_vc', target_step: '', target_input: 'cutting_speed' },
        { field: 'recommended_fz', target_step: '', target_input: 'feed_per_tooth' },
      ],
      required: true,
      estimated_tokens: 300,
      description: `Calculate cutting parameters for ${entities.operation ?? 'machining'} ${entities.material ?? ''}`,
    });

    // Wire material output mapping
    const matStep = steps.find((s) => s.action.includes('material_get'));
    if (matStep) {
      matStep.output_mapping = matStep.output_mapping.map((m) => ({
        ...m,
        target_step: m.target_step || id,
      }));
    }
  }

  // Step 5: Toolpath strategy (if feature identified)
  if (entities.feature || entities.operation) {
    const id = nextId();
    const deps = steps.filter((s) => s.action.includes('speed_feed')).map((s) => s.id);
    const tpInputs: Record<string, any> = {};
    if (entities.feature?.type) tpInputs.feature_type = entities.feature.type;
    if (entities.operation) tpInputs.operation = entities.operation;
    if (entities.material) tpInputs.material = entities.material;
    if (entities.feature?.depth_mm) tpInputs.depth_mm = entities.feature.depth_mm;

    steps.push({
      id,
      action: 'prism_toolpath.strategy_select',
      inputs: tpInputs,
      depends_on: deps,
      output_mapping: [],
      required: false,
      estimated_tokens: 400,
      description: `Select toolpath strategy for ${entities.feature?.type ?? entities.operation ?? 'operation'}`,
    });
  }

  // Step 6: Surface integrity check (if surface constraints or aerospace)
  if (entities.constraints?.surface_finish || entities.constraints?.application === 'aerospace') {
    const id = nextId();
    const deps = steps.filter((s) => s.action.includes('speed_feed')).map((s) => s.id);

    steps.push({
      id,
      action: 'prism_calc.surface_finish',
      inputs: {
        material: entities.material,
        operation: entities.operation,
        tool_diameter_mm: entities.tool_diameter_mm,
      },
      depends_on: deps,
      output_mapping: [],
      required: entities.constraints?.application === 'aerospace',
      estimated_tokens: 300,
      description: 'Predict surface finish (Ra, Rz)',
    });
  }

  // Step 7: Chatter stability check (if machine is known)
  if (entities.machine && entities.material) {
    const id = nextId();
    const deps = steps.filter((s) =>
      s.action.includes('speed_feed') || s.action.includes('machine_get')
    ).map((s) => s.id);

    steps.push({
      id,
      action: 'prism_calc.stability',
      inputs: {
        material: entities.material,
        machine: entities.machine,
        diameter_mm: entities.tool_diameter_mm,
      },
      depends_on: deps,
      output_mapping: [],
      required: false,
      estimated_tokens: 400,
      description: 'Check chatter stability',
    });
  }

  // Step 8: Process cost estimate (if enough data)
  if (entities.material && (entities.operation || entities.feature)) {
    const id = nextId();
    const deps = steps.filter((s) => s.action.includes('speed_feed')).map((s) => s.id);

    steps.push({
      id,
      action: 'prism_intelligence.process_cost',
      inputs: {
        material: entities.material,
        operation: entities.operation,
        dimensions: entities.feature ? { depth: entities.feature.depth_mm } : undefined,
      },
      depends_on: deps,
      output_mapping: [],
      required: false,
      estimated_tokens: 400,
      description: 'Estimate process cost',
    });
  }

  return steps;
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

function computeConfidence(entities: ExtractedEntities): number {
  let score = 0.2; // Base for having any query
  if (entities.material) score += 0.25;
  if (entities.machine) score += 0.10;
  if (entities.tool_type) score += 0.15;
  if (entities.operation) score += 0.15;
  if (entities.feature) score += 0.10;
  if (entities.tool_diameter_mm) score += 0.05;
  return Math.min(1.0, +score.toFixed(2));
}

function generateAmbiguities(entities: ExtractedEntities): string[] {
  const ambiguities: string[] = [];
  if (!entities.material) ambiguities.push('What material are you cutting?');
  if (!entities.machine) ambiguities.push('What machine are you using?');
  if (!entities.tool_type && !entities.operation) {
    ambiguities.push('What operation (roughing, finishing, drilling)?');
  }
  return ambiguities.slice(0, 3); // Max 3 questions
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function decomposeIntent(query: string): IntentDecomposition {
  const entities: ExtractedEntities = {};

  // Extract material
  for (const [pattern, match] of MATERIAL_PATTERNS) {
    if (pattern.test(query)) {
      entities.material = match.name;
      entities.material_raw = query.match(pattern)?.[0];
      break;
    }
  }

  // Extract tool
  const toolMatch = extractTool(query);
  if (toolMatch) {
    entities.tool_type = toolMatch.type;
    entities.tool = toolMatch.type;
    if (toolMatch.diameter_mm) entities.tool_diameter_mm = +toolMatch.diameter_mm.toFixed(2);
    if (toolMatch.flutes) entities.tool_flutes = toolMatch.flutes;
  }

  // Extract machine
  entities.machine = extractMachine(query) ?? undefined;
  if (entities.machine) {
    const mMatch = query.match(new RegExp(entities.machine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    entities.machine_raw = mMatch?.[0] ?? entities.machine;
  }

  // Extract operation
  entities.operation = extractOperation(query) ?? undefined;

  // Extract feature
  entities.feature = extractFeature(query);

  // Extract constraints
  entities.constraints = extractConstraints(query);

  // Detect units
  entities.units = detectUnits(query);

  // Detect persona
  const persona = detectPersona(query);

  // Generate execution plan
  const plan = generatePlan(entities);

  // Compute confidence
  const confidence = computeConfidence(entities);

  // Generate ambiguities
  const ambiguities = generateAmbiguities(entities);

  // Safety assessment
  const warnings: string[] = [];
  if (entities.constraints?.application === 'aerospace' && !entities.constraints?.surface_finish) {
    warnings.push('Aerospace application detected but no surface finish requirement specified — defaulting to Ra ≤ 1.6µm');
  }
  if (!entities.material) warnings.push('No material identified — parameter accuracy will be limited');

  return {
    entities,
    plan,
    persona,
    confidence,
    ambiguities,
    raw_query: query,
    safety: { score: confidence >= 0.5 ? 0.90 : 0.70, warnings },
  };
}

// ============================================================================
// DISPATCHER ENTRY POINT
// ============================================================================

const ACTIONS: Record<string, (params: Record<string, any>) => any> = {
  decompose_intent: (params) => decomposeIntent(params.query ?? ''),
};

export function intentEngine(action: string, params: Record<string, any>): any {
  const fn = ACTIONS[action];
  if (!fn) {
    return { error: `Unknown intent_engine action: ${action}`, valid_actions: Object.keys(ACTIONS) };
  }
  return fn(params);
}
