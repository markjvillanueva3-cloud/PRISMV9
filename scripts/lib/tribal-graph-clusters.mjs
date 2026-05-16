// Tribal knowledge graph backbone — pure clustering + classification.
// L0 atoms cluster (Jaccard) up through L3, then L4-L8 are fixed taxonomy.
// Lateral wires live in tribal-graph-embedding.mjs.

export const L1_JACCARD_THRESHOLD_DEFAULT = 0.5;
export const L2_JACCARD_THRESHOLD_DEFAULT = 0.35;
export const CLUSTER_TOPK_REP_DEFAULT = 20;
export const CLUSTER_TITLE_ITEMS = 3;
const DJB2_SEED = 5381;

// Object.freeze is shallow — inner arrays and objects remain mutable. We deep-freeze
// every taxonomy export so a rogue caller can't pollute SCHOOL_TAXONOMY.A3.keywords
// in-process and corrupt all downstream classifySchool() calls (Arm B P0, 2026-05-16).
function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
  for (const v of Object.values(obj)) deepFreeze(v);
  return Object.freeze(obj);
}

export const SCHOOL_TAXONOMY = deepFreeze({
  A1_chip_mechanics: {
    label: "Chip mechanics (Merchant / Oxley / Lee-Shaffer)",
    keywords: ["merchant", "oxley", "shear angle", "shear plane", "lee-shaffer", "lee shaffer", "piispanen", "chip thickness", "chip formation", "rake angle", "shear strain", "primary deformation"],
    discipline: "S1_subtractive_physics",
    galaxy: "G1_mfg_science",
  },
  A2_tool_life: {
    label: "Tool life (Taylor / Archard wear)",
    keywords: ["taylor equation", "vt^n", "vt =", "tool life", "extended taylor", "archard", "wear rate", "flank wear", "crater wear", "vbb", "vbmax", "wear coefficient"],
    discipline: "S1_subtractive_physics",
    galaxy: "G1_mfg_science",
  },
  A3_force_power: {
    label: "Force & power (Kienzle / Johnson-Cook)",
    keywords: ["kienzle", "kc1.1", "specific cutting force", "johnson-cook", "johnson cook", "flow stress", "cutting power", "spindle power", "spindle load", "tangential force", "feed force"],
    discipline: "S1_subtractive_physics",
    galaxy: "G1_mfg_science",
  },
  A4_dynamics: {
    label: "Cutting dynamics (Tlusty / Altintas SLD)",
    keywords: ["tlusty", "altintas", "stability lobe", "sld ", "stability diagram", "regenerative chatter", "chatter", "natural frequency", "frf", "modal analysis", "self-excited"],
    discipline: "S1_subtractive_physics",
    galaxy: "G1_mfg_science",
  },
  A5_thermal: {
    label: "Thermal (Loewen-Shaw / Trigger-Chao)",
    keywords: ["loewen-shaw", "loewen shaw", "trigger-chao", "trigger chao", "shear zone temperature", "cutting temperature", "thermal damage", "thermal expansion", "tool-chip interface temp"],
    discipline: "S1_subtractive_physics",
    galaxy: "G1_mfg_science",
  },
  A6_surface: {
    label: "Surface integrity (Brammertz / Field-Kahles)",
    keywords: ["brammertz", "field-kahles", "field kahles", "residual stress", "white layer", "recast", "surface integrity", "surface finish ra", "ra ="],
    discipline: "S1_subtractive_physics",
    galaxy: "G1_mfg_science",
  },
  A7_tribology: {
    label: "Tribology (Archard / Hertz contact)",
    keywords: ["hertz contact", "contact stress", "tribology", "friction coefficient", "boundary lubrication", "ehl", "elastohydrodynamic"],
    discipline: "S1_subtractive_physics",
    galaxy: "G1_mfg_science",
  },
  B1_spc: {
    label: "SPC (Shewhart / Nelson rules)",
    keywords: ["shewhart", "nelson rules", "control chart", "xbar-r", "xbar r", "i-mr", "imr chart", " spc "],
    discipline: "S2_quality_systems",
    galaxy: "G1_mfg_science",
  },
  B2_capability: {
    label: "Process capability (Cpk / Ppk)",
    keywords: ["cpk", "ppk", "process capability", "six sigma", "cp index"],
    discipline: "S2_quality_systems",
    galaxy: "G1_mfg_science",
  },
  B3_taguchi: {
    label: "Robust design (Taguchi)",
    keywords: ["taguchi", "signal to noise", "s/n ratio", "robust design", "orthogonal array", "doe taguchi"],
    discipline: "S2_quality_systems",
    galaxy: "G1_mfg_science",
  },
  B4_pdca: {
    label: "PDCA (Deming)",
    keywords: ["deming", "pdca cycle", "plan-do-check-act", "plan do check act"],
    discipline: "S3_mfg_systems",
    galaxy: "G2_business_ops",
  },
  B5_gdt: {
    label: "GD&T (ASME Y14.5)",
    keywords: ["gd&t", "asme y14.5", "y14.5", "geometric tolerance", "datum reference frame", "true position", "perpendicularity", "parallelism", "concentricity", "circular runout", "total runout", "profile of a surface"],
    discipline: "S2_quality_systems",
    galaxy: "G1_mfg_science",
  },
  C1_lean_tps: {
    label: "Lean / TPS (Ohno / Toyoda)",
    keywords: ["taiichi ohno", " ohno ", " tps ", "toyota production", "lean manufacturing", " jit ", "just in time", "kanban", "kaizen", " muda ", " muri ", " mura "],
    discipline: "S3_mfg_systems",
    galaxy: "G2_business_ops",
  },
  C2_toc: {
    label: "Theory of Constraints (Goldratt)",
    keywords: ["goldratt", "theory of constraints", " toc ", "drum buffer rope", "drum-buffer-rope", "bottleneck management"],
    discipline: "S3_mfg_systems",
    galaxy: "G2_business_ops",
  },
  C3_vsm: {
    label: "Value stream mapping (Womack / Jones)",
    keywords: ["womack", "value stream", " vsm ", "lean enterprise"],
    discipline: "S3_mfg_systems",
    galaxy: "G2_business_ops",
  },
  C4_industry40: {
    label: "Industry 4.0 / digital twin",
    keywords: ["industry 4.0", "industry 4", "digital twin", "mtconnect", "opc-ua", "opc ua", " iiot ", " iot "],
    discipline: "S3_mfg_systems",
    galaxy: "G2_business_ops",
  },
  C5_group_tech: {
    label: "Group technology / cellular manufacturing",
    keywords: ["group technology", "cellular manufacturing", "part family", "manufacturing cell"],
    discipline: "S3_mfg_systems",
    galaxy: "G2_business_ops",
  },
  D1_nc_theory: {
    label: "NC programming theory",
    keywords: ["g-code", " gcode", "m-code", " mcode", "nc programming", "post processor", "post-processor", "canned cycle"],
    discipline: "S4_computational",
    galaxy: "G1_mfg_science",
  },
  D2_toolpaths: {
    label: "Toolpath strategies (HSM / trochoidal / adaptive)",
    keywords: ["adaptive clearing", " hsm ", "high speed machining", "trochoidal", "waveform", "volumill", "imachining", "i-machining", "dynamic motion"],
    discipline: "S4_computational",
    galaxy: "G1_mfg_science",
  },
  D3_cad_geom: {
    label: "CAD geometry (NURBS / BREP / B-spline)",
    keywords: ["nurbs", "b-spline", "bezier", " brep ", "boundary representation", "tessellation"],
    discipline: "S4_computational",
    galaxy: "G1_mfg_science",
  },
  D4_ml: {
    label: "Machine learning / neural / LoRA",
    keywords: ["neural network", "transformer model", "attention head", " lora ", "fine-tune", "embedding model", "deep learning"],
    discipline: "S4_computational",
    galaxy: "G1_mfg_science",
  },
  D5_optimization: {
    label: "Optimization (Monte Carlo / Bayesian / GA)",
    keywords: ["monte carlo", "bayesian optimization", "genetic algorithm", "simulated annealing", "particle swarm", "gradient descent"],
    discipline: "S4_computational",
    galaxy: "G1_mfg_science",
  },
  E1_metallurgy: {
    label: "Metallurgy (Fe-C / heat-treat / microstructure)",
    keywords: ["austenitic", "martensitic", "ferritic", "pearlite", "cementite", "work hardening", "work-hardening", "heat treat", "tempering", "annealing", "quenching", "carburizing"],
    discipline: "S5_materials",
    galaxy: "G1_mfg_science",
  },
  E2_tool_materials: {
    label: "Tool materials & coatings (Carbide / PCD / CBN / TiAlN)",
    keywords: ["carbide grade", "pcd ", "polycrystalline diamond", " cbn ", "cubic boron", "ceramic insert", " tialn", " altin", " ticn", " tin ", "diamond coating", "pvd coating", "cvd coating"],
    discipline: "S5_materials",
    galaxy: "G1_mfg_science",
  },
  E3_workpiece: {
    label: "Workpiece behavior (BUE / springback / adhesion)",
    keywords: ["built-up edge", "built up edge", " bue ", "springback", "spring-back", "elastic recovery", "galling", "adhesion"],
    discipline: "S5_materials",
    galaxy: "G1_mfg_science",
  },
  F1_cost_accounting: {
    label: "Cost accounting (ABC / job-order / process)",
    keywords: ["abc costing", "job order cost", "process costing", "overhead allocation", "burden rate"],
    discipline: "S6_business",
    galaxy: "G2_business_ops",
  },
  F2_quoting: {
    label: "Quoting / estimating",
    keywords: ["quote estimate", "should-cost", "should cost", "bid preparation", "cycle time estimate"],
    discipline: "S6_business",
    galaxy: "G2_business_ops",
  },
  F3_capacity: {
    label: "Capacity planning / OEE",
    keywords: [" oee ", "overall equipment effectiveness", "capacity planning", "production scheduling"],
    discipline: "S6_business",
    galaxy: "G2_business_ops",
  },
  F4_erp: {
    label: "ERP / MRP systems",
    keywords: [" erp ", " mrp ", "quickbooks", " epicor ", " e2shop", "proshop", "jobboss"],
    discipline: "S6_business",
    galaxy: "G2_business_ops",
  },
  F5_lean_accounting: {
    label: "Lean accounting / VSM costing",
    keywords: ["lean accounting", "value stream costing", "activity based costing"],
    discipline: "S6_business",
    galaxy: "G2_business_ops",
  },
  G1_tribal_op: {
    label: "Operator wisdom (shop-floor heuristics)",
    keywords: ["operator says", "machinist tip", "shop floor", "set-and-forget", "rule of thumb"],
    discipline: "S7_experiential",
    galaxy: "G1_mfg_science",
  },
  G2_setup_tricks: {
    label: "Setup tricks (fixturing / workholding)",
    keywords: ["setup trick", "workholding trick", "fixture tip", "tap on the vise"],
    discipline: "S7_experiential",
    galaxy: "G1_mfg_science",
  },
  G3_failure_mode: {
    label: "Failure modes from real jobs",
    keywords: ["tool broke", "we crashed", "scrapped part", "rework job", "out of tolerance"],
    discipline: "S7_experiential",
    galaxy: "G1_mfg_science",
  },
  G4_anti_pattern: {
    label: "Anti-patterns (never-do)",
    keywords: ["never do", "do not", "avoid this", "anti-pattern", "common mistake"],
    discipline: "S7_experiential",
    galaxy: "G1_mfg_science",
  },
  Z_uncategorized: {
    label: "Uncategorized (no matching school)",
    keywords: [],
    discipline: "S0_unknown",
    galaxy: "G3_unknown",
  },
});


export const DOMAIN_TAXONOMY = deepFreeze({
  M_mill:          { label: "Milling",                tagHints: ["milling", "endmill", "end mill", "face mill", "pocket", "slot", "contour", "trochoidal"], opHints: ["milling", "slotting", "pocketing", "profiling", "facing", "adaptive_milling", "hsm", "roughing", "finishing", "drilling", "tapping", "thread_milling"], domainHint: ["mill", "milling"] },
  T_turn:          { label: "Turning / Lathe",        tagHints: ["turning", "lathe", "css", "od turning", "id turning", "boring", "parting", "grooving", "single-point", "swiss"], opHints: ["turning", "boring", "parting", "grooving", "threading_lathe"], domainHint: ["lathe", "turning"] },
  E_edm:           { label: "EDM",                    tagHints: ["wire-edm", "wire edm", "sinker edm", "edm taper", "h-register", "spark erosion"], opHints: ["wire_edm", "sinker_edm", "hole_drill_edm"], domainHint: ["edm", "wedm"] },
  G_grind:         { label: "Grinding",               tagHints: ["grinding", "surface grind", "cylindrical grind", "centerless", "creep feed", "wheel dressing"], opHints: ["grinding", "creep_feed_grinding", "centerless"], domainHint: ["grind"] },
  A_additive:      { label: "Additive / 3DP",         tagHints: ["fdm", " sla ", " sls ", " dmls ", " slm ", "3d printing", "additive manufacturing", "fused deposition"], opHints: ["additive", "3d_print"], domainHint: ["additive", "am"] },
  W_welding:       { label: "Welding & joining",      tagHints: [" mig ", " tig ", "friction stir", "laser weld", "electron beam weld", "brazing", "soldering"], opHints: ["welding", "brazing", "soldering"], domainHint: ["weld"] },
  S_sheet:         { label: "Sheet metal",            tagHints: ["laser cut", "plasma cut", "waterjet", "press brake", "punch press", "sheet metal"], opHints: ["laser_cutting", "plasma_cutting", "waterjet", "press_brake"], domainHint: ["sheet"] },
  C_cad:           { label: "CAD modeling & drawings", tagHints: ["solid model", " brep ", "feature tree", "drawing view", "gd&t callout"], opHints: ["cad_modeling", "drafting"], domainHint: ["cad"] },
  P_cam_post:      { label: "CAM / Post-processing",  tagHints: ["cam software", "post processor", "post-processor", "g-code generation", "toolpath generation", "fusion", "mastercam", "hypermill", "esprit", "powermill"], opHints: ["cam_strategy", "post_processing", "toolpath"], domainHint: ["cam", "cam_software"] },
  I_inspection:    { label: "Inspection / CMM",       tagHints: [" cmm ", "coordinate measuring", "in-process probe", "first article inspection", " fai "], opHints: ["probing", "inspection", "first_article"], domainHint: ["inspection", "quality_inspection"] },
  R_robotics:      { label: "Robotics / Cobots",      tagHints: ["cobot", "industrial robot", "robotic arm", "iso 10218", "iso 15066"], opHints: ["robot_machining"], domainHint: ["robotics"] },
  B_business:      { label: "Business / Operations",  tagHints: ["quoting", "scheduling", " erp ", "accounting", "payroll"], opHints: ["quoting", "scheduling", "costing"], domainHint: ["business", "shop_floor"] },
  X_unknown:       { label: "Unknown domain",         tagHints: [],                                   opHints: [],                                                    domainHint: [] },
});


export const KNOWLEDGE_TYPES = deepFreeze({
  formula:        { label: "Mathematical formula with inputs/outputs" },
  rule_of_thumb:  { label: "Heuristic / range-bound rule" },
  troubleshooting:{ label: "Symptom -> diagnosis -> fix" },
  safety:         { label: "Hard-block / must-not / hard limit" },
  procedure:      { label: "Step sequence" },
  decision_tree:  { label: "If/then routing" },
  lookup:         { label: "Table-value lookup" },
  constraint:     { label: "Limit / envelope / bound" },
  observation:    { label: "Raw experiential observation" },
  anti_pattern:   { label: "Never-do / common-mistake" },
  correction:     { label: "Corrects a misconception or wrong default" },
  heuristic:      { label: "Heuristic alias" },
  unknown:        { label: "Type not determined" },
});

const _PUNC_RX = /[^a-z0-9_:.\- ]+/g;
const _SPACE_RX = /\s+/g;

export function normalizeToken(s) {
  if (s === null || s === undefined) return "";
  return String(s).toLowerCase().replace(_PUNC_RX, " ").replace(_SPACE_RX, " ").trim();
}

export function splitComposite(cat) {
  if (!cat || typeof cat !== "string") return [];
  return cat
    .split("|")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

// Handles 3 input shapes from PRISM stores (rich engine-source, compact TRIBAL_TIP_INDEX,
// hyperMILL-extracted) and normalizes to a single canonical shape.
export function normalizeTip(raw, sourceFile = "", indexHint = null) {
  // ID resolution: `??` would let empty-string slip through (silent dedupe, Arm B P0-1).
  // Math.random would break cross-build determinism (Arm B P1-1). Plain "" separator would let
  // {title:"foo",body:"bar"} collide with {title:"foob",body:"ar"} (Arm B P0-3 separator).
  // Empty-fingerprint tips would all hash to the same value (Arm B P0-3 collision) —
  // falls through to indexHint or a module-level monotonic counter instead.
  const idRaw = raw.id ?? raw.sha256;
  const idStr = (idRaw === undefined || idRaw === null) ? "" : String(idRaw);
  const title = String(raw.title ?? raw.content?.slice(0, 80) ?? "");
  const body = String(raw.body ?? raw.content ?? raw.text ?? "");
  const srcStr = String(sourceFile);
  const fingerprint = title + "\x1f" + body + "\x1f" + srcStr;
  let id;
  if (idStr.trim().length > 0) {
    id = idStr;
  } else if (fingerprint.length > 2) {
    id = "unknown-" + _shortHash(fingerprint);
  } else if (indexHint !== null && indexHint !== undefined) {
    id = "unknown-noid-" + indexHint;
  } else {
    id = "unknown-noid-anon-" + (_anonCounter++);
  }

  // Tags: union of (tags, keywords, auto_tags), normalized + deduped
  const tagBag = new Set();
  const addTags = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const t of arr) {
      const n = normalizeToken(t);
      if (n.length > 0) tagBag.add(n);
    }
  };
  addTags(raw.tags);
  addTags(raw.keywords);
  addTags(raw.auto_tags);

  // Material groups: ISO P/M/K/N/S/H
  const matBag = new Set();
  if (Array.isArray(raw.material_groups)) {
    for (const m of raw.material_groups) {
      const n = String(m).toUpperCase().trim();
      if (/^[PMKNSH]$/.test(n)) matBag.add(n);
    }
  }

  // Operation types
  const opBag = new Set();
  if (Array.isArray(raw.operation_types)) {
    for (const o of raw.operation_types) {
      const n = normalizeToken(o);
      if (n.length > 0) opBag.add(n);
    }
  }

  // Machine ids
  const machBag = new Set();
  if (Array.isArray(raw.machine_ids)) {
    for (const m of raw.machine_ids) {
      const n = normalizeToken(m);
      if (n.length > 0) machBag.add(n);
    }
  }

  // Confidence: normalize to 0..1
  let conf = raw.confidence;
  if (typeof conf === "string") conf = Number(conf);
  if (!Number.isFinite(conf)) conf = 0.5;
  if (conf > 1) conf = conf / 100; // 95 -> 0.95
  if (conf < 0) conf = 0;
  if (conf > 1) conf = 1;

  // Usage count
  let usage = Number(raw.usage_count);
  if (!Number.isFinite(usage) || usage < 0) usage = 0;

  return Object.freeze({
    id,
    title,
    body,
    tags: Array.from(tagBag).sort(),
    material_groups: Array.from(matBag).sort(),
    operation_types: Array.from(opBag).sort(),
    machine_ids: Array.from(machBag).sort(),
    confidence: conf,
    source: String(raw.source ?? sourceFile ?? ""),
    domain: normalizeToken(raw.domain ?? ""),
    subcategory: normalizeToken(raw.subcategory ?? ""),
    knowledge_type: normalizeToken(raw.knowledge_type ?? "unknown"),
    category: String(raw.category ?? "").toLowerCase().trim(),
    usage_count: usage,
    created_at: String(raw.created_at ?? raw.createdAt ?? ""),
  });
}

// Returns 0 (not NaN) for the both-empty case so cluster code doesn't have to guard.
export function jaccard(setA, setB) {
  const a = setA instanceof Set ? setA : new Set(setA);
  const b = setB instanceof Set ? setB : new Set(setB);
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  if (union === 0) return 0;
  return inter / union;
}

// Prefixed bag (mat:/op:/mach:/cat:/sub:/kt:) prevents tag-name collisions across axes
// — e.g., "milling" the tag shouldn't match the "milling" operation_type by accident.
export function tipBag(tip) {
  const bag = new Set();
  for (const t of tip.tags) bag.add(t);
  for (const m of tip.material_groups) bag.add(`mat:${m}`);
  for (const o of tip.operation_types) bag.add(`op:${o}`);
  for (const m of tip.machine_ids) bag.add(`mach:${m}`);
  for (const c of splitComposite(tip.category)) bag.add(`cat:${c}`);
  if (tip.subcategory) bag.add(`sub:${tip.subcategory}`);
  if (tip.knowledge_type && tip.knowledge_type !== "unknown") bag.add(`kt:${tip.knowledge_type}`);
  return bag;
}

// Always returns >=1 entry (falls back to X_unknown).
export function classifyDomain(tip) {
  const out = new Set();
  const tagStr = (tip.tags.join(" ") + " " + tip.domain + " " + tip.subcategory).toLowerCase();
  for (const [code, spec] of Object.entries(DOMAIN_TAXONOMY)) {
    if (code === "X_unknown") continue;
    for (const h of spec.tagHints) {
      if (tagStr.includes(h)) { out.add(code); break; }
    }
    if (!out.has(code)) {
      for (const o of tip.operation_types) {
        if (spec.opHints.some((h) => o.includes(h))) { out.add(code); break; }
      }
    }
    if (!out.has(code)) {
      for (const dh of spec.domainHint) {
        if (tip.domain.includes(dh)) { out.add(code); break; }
      }
    }
  }
  if (out.size === 0) out.add("X_unknown");
  return Array.from(out).sort();
}

// Score = inverse of taxonomy order so earlier-listed schools win ties (physics > tribal).
export function classifySchool(tip) {
  const haystack = (tip.title + " " + tip.body + " " + tip.tags.join(" ")).toLowerCase();
  // Pad so word-boundary keywords like " jit " / " ohno " match at string edges.
  const padded = " " + haystack + " ";
  const schoolCodes = Object.keys(SCHOOL_TAXONOMY);
  let best = { code: "Z_uncategorized", score: 0, matched: null };
  for (const [code, spec] of Object.entries(SCHOOL_TAXONOMY)) {
    if (code === "Z_uncategorized") continue;
    for (const kw of spec.keywords) {
      if (padded.includes(kw)) {
        const order = schoolCodes.indexOf(code);
        const score = schoolCodes.length - order;
        if (score > best.score) {
          best = { code, score, matched: kw };
          break;
        }
      }
    }
  }
  return best;
}

// Signature extraction — required/optional/output inputs for the partial-input inference layer.
const _MATERIAL_PATTERN = /\b(304|316|4140|17-4|17 4|inconel|titanium|aluminum|al 6061|al 7075|brass|copper|carbon steel|alloy steel|stainless|tool steel|h13|d2|a2|s7)\b/i;
const _TOOL_DIA_PATTERN = /\b(1\/8"|1\/4"|3\/8"|1\/2"|3\/4"|1"|2\s*mm|3\s*mm|4\s*mm|5\s*mm|6\s*mm|8\s*mm|10\s*mm|12\s*mm|tool diameter|cutter diameter|end mill diameter)/i;
const _FLUTES_PATTERN = /\b(\d+[ -]?flute|flute count)/i;
const _SPEED_OUTPUT = /\b(sfm|surface feet per minute|rpm|spindle speed|cutting speed|m\/min)\b/i;
const _FEED_OUTPUT = /\b(ipt|ipm|mm\/min|feed per tooth|feed rate|chip load)\b/i;
const _DEPTH_OUTPUT = /\b(axial doc|radial woc|stepover|stepdown|doc|woc)\b/i;
const _COOLANT_INPUT = /\b(flood|mql|coolant|dry cutting|through-spindle|cryogenic)\b/i;
const _COATING_INPUT = /\b(tialn|altin|ticn|tin coat|diamond coat|pvd|cvd|uncoated)\b/i;
const _LD_INPUT = /\b(l\/d|stickout|overhang|length to diameter)\b/i;

export function extractSignature(tip) {
  const text = (tip.title + " " + tip.body).toLowerCase();
  const required = new Set();
  const optional = new Set();
  const output = new Set();

  if (tip.material_groups.length > 0 || _MATERIAL_PATTERN.test(text)) required.add("material");
  if (tip.operation_types.length > 0) required.add("operation");
  if (_TOOL_DIA_PATTERN.test(text)) required.add("tool_dia");

  if (_FLUTES_PATTERN.test(text)) optional.add("flute_count");
  if (_LD_INPUT.test(text)) optional.add("length_over_diameter");
  if (_COATING_INPUT.test(text)) optional.add("tool_coating");
  if (_COOLANT_INPUT.test(text)) optional.add("coolant_strategy");
  if (tip.machine_ids.length > 0) optional.add("machine_class");
  if (/workholding|fixture|vise|chuck|clamp/i.test(text)) optional.add("workholding_rigidity");

  if (_SPEED_OUTPUT.test(text)) output.add("cutting_speed");
  if (_FEED_OUTPUT.test(text)) output.add("feed_rate");
  if (_DEPTH_OUTPUT.test(text)) output.add("engagement_depths");
  if (tip.knowledge_type === "anti_pattern" || tip.knowledge_type === "safety") output.add("safety_advisory");
  if (/tool life|wear/i.test(text)) output.add("tool_life_estimate");
  if (/cost|cycle time/i.test(text)) output.add("cost_or_cycletime");
  if (/finish|ra ?=|roughness/i.test(text)) output.add("surface_finish_estimate");

  // Fall through to free-text when no specific output detected — never return empty.
  if (output.size === 0) output.add("free_text_advisory");

  return {
    required_inputs: Array.from(required).sort(),
    optional_inputs: Array.from(optional).sort(),
    output_variables: Array.from(output).sort(),
  };
}

// Greedy Jaccard clustering. Deterministic given the same input order.
// Each cluster's repBag is the top-K most-frequent tags across its members (refreshed on add).
export function clusterByJaccard(tips, opts = {}) {
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : L1_JACCARD_THRESHOLD_DEFAULT;
  const topKRep = Number.isFinite(opts.topKRep) ? opts.topKRep : CLUSTER_TOPK_REP_DEFAULT;
  const bagFn = typeof opts.bagFn === "function" ? opts.bagFn : tipBag;
  if (!Array.isArray(tips)) throw new TypeError("clusterByJaccard: tips must be an array");

  const clusters = [];
  const counts = [];

  for (let i = 0; i < tips.length; i++) {
    const tip = tips[i];
    // Isolate bagFn errors so a malformed tip mid-loop fails LOUDLY with attribution
    // instead of silently corrupting partial cluster state (Arm B P1).
    let bag;
    try {
      bag = bagFn(tip);
    } catch (e) {
      throw new Error(`clusterByJaccard: bagFn threw on tip[${i}] id=${tip?.id ?? "?"}: ${e.message}`);
    }
    if (!(bag instanceof Set)) {
      throw new TypeError(`clusterByJaccard: bagFn must return a Set, got ${typeof bag} for tip[${i}] id=${tip?.id ?? "?"}`);
    }

    // Empty-bag tips MUST become singletons — joining them to any non-empty bag
    // would inflate spurious membership (J(empty, anything) is 0 but a 0-threshold caller
    // might pick the first cluster anyway).
    if (bag.size === 0) {
      clusters.push({
        id: `cluster:L1:${clusters.length}`,
        level: 1,
        kind: "molecule",
        title: `(unstructured) ${tip.title.slice(0, 40)}`,
        members: [tip.id],
        repBag: new Set(),
      });
      counts.push(new Map());
      continue;
    }

    let bestIdx = -1;
    let bestSim = threshold;
    for (let c = 0; c < clusters.length; c++) {
      const sim = jaccard(clusters[c].repBag, bag);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = c;
      }
    }

    if (bestIdx >= 0) {
      clusters[bestIdx].members.push(tip.id);
      const cm = counts[bestIdx];
      for (const t of bag) cm.set(t, (cm.get(t) || 0) + 1);
      clusters[bestIdx].repBag = _topKAsSet(cm, topKRep);
    } else {
      const cm = new Map();
      for (const t of bag) cm.set(t, 1);
      clusters.push({
        id: `cluster:L1:${clusters.length}`,
        level: 1,
        kind: "molecule",
        title: _deriveClusterTitle(bag, tip.title),
        members: [tip.id],
        repBag: new Set(bag),
      });
      counts.push(cm);
    }
  }

  return clusters;
}

function _topKAsSet(counts, k) {
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const out = new Set();
  for (let i = 0; i < Math.min(k, sorted.length); i++) out.add(sorted[i][0]);
  return out;
}

function _deriveClusterTitle(bag, fallback) {
  // CLUSTER_TITLE_ITEMS longest tags as a human-readable title.
  const items = Array.from(bag).sort((a, b) => b.length - a.length).slice(0, CLUSTER_TITLE_ITEMS);
  if (items.length === 0) return fallback || "(unnamed cluster)";
  return items.join(" / ");
}

// Aggregate L_n -> L_(n+1) by Jaccard on representative bags. Default threshold is lower
// than L0->L1 so each ascending level merges more aggressively.
export function aggregateLevel(nodes, opts = {}) {
  if (!Array.isArray(nodes)) throw new TypeError("aggregateLevel: nodes must be an array");
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : L2_JACCARD_THRESHOLD_DEFAULT;
  const outLevel = Number.isFinite(opts.outLevel) ? opts.outLevel : (nodes[0]?.level ?? 1) + 1;
  const outKind = opts.outKind || "cell";
  const topKRep = Number.isFinite(opts.topKRep) ? opts.topKRep : CLUSTER_TOPK_REP_DEFAULT;

  const parents = [];
  const counts = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    // Surface malformed nodes (missing or non-Set repBag) loudly with index attribution
    // instead of failing mid-loop on `for (const t of n.repBag)` (Arm B P1).
    if (!n || !(n.repBag instanceof Set)) {
      throw new TypeError(`aggregateLevel: node[${i}] id=${n?.id ?? "?"} missing valid repBag (must be Set)`);
    }
    let bestIdx = -1;
    let bestSim = threshold;
    for (let p = 0; p < parents.length; p++) {
      const sim = jaccard(parents[p].repBag, n.repBag);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = p;
      }
    }
    if (bestIdx >= 0) {
      parents[bestIdx].members.push(n.id);
      const cm = counts[bestIdx];
      for (const t of n.repBag) cm.set(t, (cm.get(t) || 0) + 1);
      parents[bestIdx].repBag = _topKAsSet(cm, topKRep);
    } else {
      const cm = new Map();
      for (const t of n.repBag) cm.set(t, 1);
      parents.push({
        id: `cluster:L${outLevel}:${parents.length}`,
        level: outLevel,
        kind: outKind,
        title: _deriveClusterTitle(n.repBag, n.title),
        members: [n.id],
        repBag: new Set(n.repBag),
      });
      counts.push(cm);
    }
  }
  return parents;
}

// Dedup by id AND by body hash so cross-store duplicates with different IDs collapse.
export function dedupeTips(tips) {
  if (!Array.isArray(tips)) throw new TypeError("dedupeTips: tips must be an array");
  const seen = new Map();
  const out = [];
  for (const t of tips) {
    const key = t.id;
    if (seen.has(key)) continue;
    const bodyHash = _shortHash(t.body || t.title || t.id);
    if (seen.has(bodyHash)) continue;
    seen.set(key, true);
    seen.set(bodyHash, true);
    out.push(t);
  }
  return out;
}

// Module-level monotonic counter for empty-fingerprint tips when no indexHint is passed.
// Honest: loses cross-process determinism for tips with no content — but those tips have
// no determining content to be deterministic ABOUT, so cross-process matching is undefined.
let _anonCounter = 0;

function _shortHash(s) {
  let h = DJB2_SEED;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h | 0;
  }
  return "h:" + (h >>> 0).toString(16);
}

export const DISCIPLINE_TAXONOMY = deepFreeze({
  S1_subtractive_physics: { label: "Subtractive manufacturing physics", galaxy: "G1_mfg_science" },
  S2_quality_systems:     { label: "Quality systems & metrology",        galaxy: "G1_mfg_science" },
  S3_mfg_systems:         { label: "Manufacturing systems & lean",       galaxy: "G2_business_ops" },
  S4_computational:       { label: "Computational manufacturing",        galaxy: "G1_mfg_science" },
  S5_materials:           { label: "Materials science (mfg context)",    galaxy: "G1_mfg_science" },
  S6_business:            { label: "Business operations & finance",      galaxy: "G2_business_ops" },
  S7_experiential:        { label: "Tribal & experiential knowledge",    galaxy: "G1_mfg_science" },
  S0_unknown:             { label: "Unclassified",                       galaxy: "G3_unknown" },
});

export const GALAXY_TAXONOMY = deepFreeze({
  G1_mfg_science:   { label: "Manufacturing science (cutting / quality / computational / materials / experiential)" },
  G2_business_ops:  { label: "Business operations (lean / TOC / ERP / accounting)" },
  G3_unknown:       { label: "Unclassified galaxy" },
});

export const UNIVERSE_ID = "L8:PRISM_knowledge";

// Returns [L5_school, L6_discipline, L7_galaxy, L8_universe] chain for aggregation edges.
export function schoolChain(schoolCode) {
  const effectiveCode = SCHOOL_TAXONOMY[schoolCode] ? schoolCode : "Z_uncategorized";
  const s = SCHOOL_TAXONOMY[effectiveCode];
  const discCode = s.discipline;
  const galCode = (DISCIPLINE_TAXONOMY[discCode] || DISCIPLINE_TAXONOMY.S0_unknown).galaxy;
  return [`L5:${effectiveCode}`, `L6:${discCode}`, `L7:${galCode}`, UNIVERSE_ID];
}
