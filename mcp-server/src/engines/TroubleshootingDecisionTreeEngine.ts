/**
 * TroubleshootingDecisionTreeEngine — Guided CNC Troubleshooting via Decision Trees
 *
 * Implements structured decision trees for diagnosing CNC machining problems.
 * Given symptoms, walks through diagnostic nodes to identify root causes and fixes.
 *
 * Actions: troubleshoot_diagnose, troubleshoot_by_symptom, troubleshoot_tree, troubleshoot_common
 */

// ============================================================================
// TYPES
// ============================================================================

/** Decision tree node structure. */
export interface TreeNode {
  id: number;
  category: string;
  symptom: string;
  question: string;
  yesNode: number | null;
  noNode: number | null;
  diagnosis?: string;
  confidence?: number;
  fixes?: string[];
}

export interface DiagnosisResult {
  rootCause: string;
  confidence: number;
  evidence: string[];
  fixes: string[];
}

export interface SymptomCause {
  name: string;
  likelihood: number;
  description: string;
  quickFixes: string[];
  deepFixes: string[];
}

export interface CommonProblem {
  name: string;
  frequency: string;
  symptoms: string[];
  quickFix: string;
  preventiveMeasure: string;
}

type Category =
  | "chatter" | "surface_finish" | "tool_breakage" | "dimensional"
  | "chip" | "coolant" | "fixture" | "program" | "alarm";

// ============================================================================
// DECISION TREE DATA — 52+ nodes across 8 categories
// ============================================================================

function buildDecisionTree(): TreeNode[] {
  return [
    // ── Chatter / Vibration (nodes 1–8) ──────────────────────────────────
    { id: 1, category: "chatter", symptom: "chatter marks, vibration noise, scalloped surface",
      question: "Are chatter marks visible on the workpiece surface?",
      yesNode: 2, noNode: 9 },
    { id: 2, category: "chatter", symptom: "chatter marks",
      question: "Is tool overhang greater than 4x diameter?",
      yesNode: 3, noNode: 4 },
    { id: 3, category: "chatter", symptom: "excessive tool overhang vibration",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Excessive tool overhang causing regenerative chatter",
      confidence: 0.88,
      fixes: ["Reduce tool overhang to <3x diameter", "Switch to stub-length tool", "Use vibration-damping holder (e.g. CoroMill 390 anti-vibration)", "Reduce depth of cut by 40%"] },
    { id: 4, category: "chatter", symptom: "engagement chatter",
      question: "Is radial engagement above 50% of cutter diameter?",
      yesNode: 5, noNode: 6 },
    { id: 5, category: "chatter", symptom: "high engagement chatter",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Excessive radial engagement exciting tool natural frequency",
      confidence: 0.82,
      fixes: ["Reduce radial depth of cut (ae) to <40% of diameter", "Use high-feed milling strategy", "Increase feed per tooth to stabilize cutting", "Consider trochoidal milling"] },
    { id: 6, category: "chatter", symptom: "RPM-related chatter",
      question: "Does chatter change significantly when RPM is adjusted ±10%?",
      yesNode: 7, noNode: 8 },
    { id: 7, category: "chatter", symptom: "stability lobe chatter",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Operating at unstable RPM per stability lobe diagram",
      confidence: 0.85,
      fixes: ["Shift RPM to nearest stable pocket (use tap test to find)", "Increase RPM by 10-15% to next stable lobe", "Reduce depth of cut to stay below stability limit", "Use variable-pitch or variable-helix end mill"] },
    { id: 8, category: "chatter", symptom: "workholding or spindle chatter",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Workholding rigidity or spindle bearing issue",
      confidence: 0.70,
      fixes: ["Check spindle bearing preload and runout", "Increase clamping force or add supports", "Use shorter gage-line toolholder", "Check for worn spindle bearings (ball-bar test)"] },

    // ── Poor Surface Finish (nodes 9–16) ─────────────────────────────────
    { id: 9, category: "surface_finish", symptom: "rough surface, poor Ra, visible feed marks",
      question: "Is the surface finish worse than expected (Ra > target)?",
      yesNode: 10, noNode: 17 },
    { id: 10, category: "surface_finish", symptom: "rough surface",
      question: "Are regular feed marks visible at consistent spacing?",
      yesNode: 11, noNode: 12 },
    { id: 11, category: "surface_finish", symptom: "feed marks on surface",
      question: "Is feed per revolution above 0.15 mm/rev for finishing?",
      yesNode: null, noNode: null,
      diagnosis: "Feed rate too high for required surface finish (Ra ≈ f²/8r)",
      confidence: 0.90,
      fixes: ["Reduce feed per rev (fz < 0.08 mm/rev for fine finish)", "Increase tool nose radius", "Use wiper insert geometry", "Apply Ra = f²/(8×r) formula to calculate required feed"] },
    { id: 12, category: "surface_finish", symptom: "irregular rough surface",
      question: "Is there material buildup on the cutting edge (BUE)?",
      yesNode: 13, noNode: 14 },
    { id: 13, category: "surface_finish", symptom: "built-up edge causing poor finish",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Built-up edge (BUE) tearing material and degrading finish",
      confidence: 0.87,
      fixes: ["Increase cutting speed by 20-30% to exceed BUE range", "Use sharper positive-rake geometry", "Apply TiAlN or DLC coating", "Increase coolant flow and concentration", "Switch to climb milling"] },
    { id: 14, category: "surface_finish", symptom: "deflection or runout finish",
      question: "Does the tool have measurable runout (>0.01 mm TIR)?",
      yesNode: 15, noNode: 16 },
    { id: 15, category: "surface_finish", symptom: "runout causing poor finish",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Tool runout causing uneven chip load and inconsistent finish",
      confidence: 0.84,
      fixes: ["Check and correct toolholder runout (<0.005 mm TIR)", "Use hydraulic or shrink-fit holder", "Replace worn collet or collet nut", "Verify spindle taper cleanliness"] },
    { id: 16, category: "surface_finish", symptom: "tool wear finish degradation",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Tool wear (flank/crater) degrading surface finish",
      confidence: 0.78,
      fixes: ["Replace insert or re-sharpen end mill", "Monitor flank wear — change at VB = 0.3 mm", "Use more wear-resistant grade or coating", "Reduce cutting speed if crater wear dominates"] },

    // ── Tool Breakage (nodes 17–23) ──────────────────────────────────────
    { id: 17, category: "tool_breakage", symptom: "broken tool, chipped edge, catastrophic failure",
      question: "Has the tool broken or chipped during cutting?",
      yesNode: 18, noNode: 24 },
    { id: 18, category: "tool_breakage", symptom: "tool breakage",
      question: "Did breakage occur at the start of cut or during entry?",
      yesNode: 19, noNode: 20 },
    { id: 19, category: "tool_breakage", symptom: "entry impact breakage",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Impact loading on entry causing edge fracture",
      confidence: 0.83,
      fixes: ["Reduce feed on entry (50% programmed feed)", "Use ramping or helical entry instead of plunge", "Switch to tougher grade (higher cobalt %)", "Add lead-in arc to reduce impact", "Verify no hard skin or scale on workpiece"] },
    { id: 20, category: "tool_breakage", symptom: "mid-cut breakage",
      question: "Is chip load per tooth above manufacturer recommendation?",
      yesNode: 21, noNode: 22 },
    { id: 21, category: "tool_breakage", symptom: "overload breakage",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Chip load exceeds tool strength — mechanical overload",
      confidence: 0.88,
      fixes: ["Reduce feed per tooth to manufacturer spec", "Reduce depth of cut (ap) or width of cut (ae)", "Verify actual number of flutes engaged", "Check for chip packing in flutes (especially deep pockets)"] },
    { id: 22, category: "tool_breakage", symptom: "thermal or inclusion breakage",
      question: "Is coolant applied intermittently or is the material known for hard inclusions?",
      yesNode: 23, noNode: null,
      diagnosis: "Thermal shock from intermittent coolant or hard material inclusions",
      confidence: 0.72,
      fixes: ["Use consistent coolant or switch to dry cutting with air blast", "For interrupted cuts, use dry machining with tough grade", "Add pre-machining pass to remove hard skin", "Use ceramic or CBN for known hard-inclusion materials"] },
    { id: 23, category: "tool_breakage", symptom: "chip packing breakage",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Chip packing in flutes causing re-cutting and overload",
      confidence: 0.76,
      fixes: ["Increase coolant pressure for better chip evacuation", "Reduce depth of cut in deep pockets", "Use fewer flutes for better chip clearance", "Program peck cycles or chip-breaking retract", "Use through-tool coolant if available"] },

    // ── Dimensional Errors (nodes 24–30) ─────────────────────────────────
    { id: 24, category: "dimensional", symptom: "oversize, undersize, taper, out-of-round",
      question: "Are finished dimensions outside tolerance?",
      yesNode: 25, noNode: 31 },
    { id: 25, category: "dimensional", symptom: "dimensional error",
      question: "Does the error increase over the production run (progressive)?",
      yesNode: 26, noNode: 27 },
    { id: 26, category: "dimensional", symptom: "progressive dimensional error",
      question: "Does the error correlate with machine warm-up time?",
      yesNode: null, noNode: null,
      diagnosis: "Thermal growth of spindle/ballscrew causing progressive drift",
      confidence: 0.85,
      fixes: ["Allow 20-30 min spindle warm-up before critical cuts", "Apply thermal compensation in CNC controller", "Use in-process probing to update offsets", "Machine critical features first while thermally stable", "Install through-spindle coolant for thermal stability"] },
    { id: 27, category: "dimensional", symptom: "sudden or constant dimensional error",
      question: "Is the error consistent in one direction (systematic)?",
      yesNode: 28, noNode: 29 },
    { id: 28, category: "dimensional", symptom: "systematic offset error",
      question: "Was the tool offset or wear compensation recently changed?",
      yesNode: null, noNode: null,
      diagnosis: "Incorrect tool offset, wear compensation, or work coordinate origin",
      confidence: 0.90,
      fixes: ["Re-measure tool length and diameter offsets", "Verify work coordinate system (G54-G59) with indicator", "Check tool wear compensation direction (+ vs -)", "Use tool presetter for accurate offset measurement"] },
    { id: 29, category: "dimensional", symptom: "taper or out-of-round error",
      question: "Is there a taper along the Z-axis or out-of-roundness?",
      yesNode: 30, noNode: null,
      diagnosis: "Tool deflection under cutting forces causing taper",
      confidence: 0.80,
      fixes: ["Reduce depth of cut and take spring pass", "Use shorter tool or larger diameter", "Apply cutter compensation with deflection estimate (δ=FL³/3EI)", "Add finish pass with light radial engagement", "Check spindle alignment and gibs"] },
    { id: 30, category: "dimensional", symptom: "backlash dimensional error",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Axis backlash or lost motion causing positioning errors",
      confidence: 0.77,
      fixes: ["Run backlash compensation test (G-code circle test)", "Adjust backlash compensation in CNC parameters", "Always approach critical dimensions from same direction", "Check and adjust ballscrew preload", "Use direct linear scales if available"] },

    // ── Chip Problems (nodes 31–36) ──────────────────────────────────────
    { id: 31, category: "chip", symptom: "long stringy chips, bird nesting, chip re-cutting",
      question: "Are chips long, stringy, or wrapping around the tool?",
      yesNode: 32, noNode: 37 },
    { id: 32, category: "chip", symptom: "stringy chips",
      question: "Is feed per tooth below 0.05 mm in steel or stainless?",
      yesNode: 33, noNode: 34 },
    { id: 33, category: "chip", symptom: "low-feed stringy chips",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Feed too low for effective chip breaking — rubbing instead of cutting",
      confidence: 0.86,
      fixes: ["Increase feed per tooth to minimum 0.08 mm (steel)", "Use chip-breaker geometry insert", "Increase depth of cut to engage chip breaker", "Adjust coolant jet to break chips at exit"] },
    { id: 34, category: "chip", symptom: "geometry-related chip problems",
      question: "Is the insert chip-breaker groove worn or wrong geometry selected?",
      yesNode: 35, noNode: 36 },
    { id: 35, category: "chip", symptom: "wrong chip breaker",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Chip breaker geometry not matched to cutting conditions",
      confidence: 0.81,
      fixes: ["Select chip breaker for current ap/f range (consult insert catalog)", "Use medium (M) geometry for general purpose", "Use light (L) geometry for finishing with low feed", "Use heavy (H) geometry for roughing with high feed"] },
    { id: 36, category: "chip", symptom: "bird nesting and re-cutting",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Poor chip evacuation — chips collecting and re-cutting",
      confidence: 0.79,
      fixes: ["Increase coolant pressure (>30 bar through-tool)", "Use air blast for aluminum", "Reduce flute count for better chip room", "Program chip-clearing retract cycles", "Use high-pressure coolant system", "Clear chip buildup from pockets with compressed air"] },

    // ── Coolant Issues (nodes 37–42) ─────────────────────────────────────
    { id: 37, category: "coolant", symptom: "foaming, odor, rust, staining, poor lubricity",
      question: "Is the coolant foaming, smelling, or causing corrosion?",
      yesNode: 38, noNode: 43 },
    { id: 38, category: "coolant", symptom: "coolant problem",
      question: "Is there visible foam on the coolant surface?",
      yesNode: 39, noNode: 40 },
    { id: 39, category: "coolant", symptom: "coolant foaming",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Coolant foaming from contamination, wrong concentration, or air entrainment",
      confidence: 0.83,
      fixes: ["Check concentration with refractometer (target 6-8%)", "Remove tramp oil with skimmer", "Check coolant return plumbing for air leaks", "Add defoamer if needed (temporary fix)", "Verify coolant is compatible with machine way oil"] },
    { id: 40, category: "coolant", symptom: "coolant odor or bacteria",
      question: "Does the coolant have a rotten-egg or rancid odor?",
      yesNode: 41, noNode: 42 },
    { id: 41, category: "coolant", symptom: "bacterial coolant contamination",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Anaerobic bacteria growth in coolant sump (Monday morning smell)",
      confidence: 0.91,
      fixes: ["Add biocide per manufacturer recommendation", "Clean sump thoroughly — drain, scrub, refill", "Maintain concentration above 5% to inhibit growth", "Remove tramp oil (bacteria food source)", "Run sump aeration on weekends", "Check pH — maintain 8.5-9.2 range"] },
    { id: 42, category: "coolant", symptom: "coolant corrosion or rust",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Coolant corrosion protection depleted — wrong type or low concentration",
      confidence: 0.80,
      fixes: ["Increase coolant concentration to manufacturer spec", "Check pH — below 8.0 indicates corrosion risk", "Verify coolant is rated for the workpiece material", "Add corrosion inhibitor package", "Ensure parts are not sitting wet overnight without protection"] },

    // ── Fixture Issues (nodes 43–47) ─────────────────────────────────────
    { id: 43, category: "fixture", symptom: "part movement, clamp marks, deformation, datum shift",
      question: "Is there evidence of part movement or fixture problems?",
      yesNode: 44, noNode: 48 },
    { id: 44, category: "fixture", symptom: "part movement in fixture",
      question: "Are there witness marks showing the part shifted during cutting?",
      yesNode: 45, noNode: 46 },
    { id: 45, category: "fixture", symptom: "inadequate clamping force",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Clamping force insufficient for cutting forces generated",
      confidence: 0.86,
      fixes: ["Increase clamping force (verify Fc < μ × Fclamp)", "Add additional clamp points", "Use soft jaws contoured to part", "Reduce cutting forces — lower ae, ap, or feed", "Consider vacuum or magnetic workholding for thin parts", "Verify hydraulic clamp pressure setting"] },
    { id: 46, category: "fixture", symptom: "part deformation from clamping",
      question: "Is the part deforming or springing when unclamped?",
      yesNode: 47, noNode: null,
      diagnosis: "Clamping-induced deformation of thin-wall or flexible part",
      confidence: 0.82,
      fixes: ["Reduce clamping force to minimum required", "Use distributed clamping (more points, less force each)", "Machine in stress-relief sequence (rough all, then finish all)", "Use wax, freeze, or adhesive fixturing for delicate parts", "Add sacrificial support material (leave stock for rigidity)"] },
    { id: 47, category: "fixture", symptom: "datum error from fixture",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Datum location error — fixture not establishing correct reference",
      confidence: 0.75,
      fixes: ["Verify 3-2-1 datum scheme is properly implemented", "Check fixture locating pins for wear", "Re-qualify fixture on CMM", "Use in-process probing to find actual datum positions", "Check for chips or debris under locators"] },

    // ── Program Issues (nodes 48–52) ─────────────────────────────────────
    { id: 48, category: "program", symptom: "gouges, crashes, wrong dimensions from program",
      question: "Are there unexpected gouges, crashes, or programmatic errors?",
      yesNode: 49, noNode: null },
    { id: 49, category: "program", symptom: "program error",
      question: "Did the tool rapid into the workpiece or fixture?",
      yesNode: 50, noNode: 51 },
    { id: 50, category: "program", symptom: "crash from safe height or rapid",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Unsafe rapid positioning — incorrect safe height or retract plane",
      confidence: 0.92,
      fixes: ["Verify G43/G44 tool length offset is active before rapid moves", "Set safe retract height above all fixtures and clamps", "Use G28 or G30 for safe intermediate positions", "Verify Z-home and G54 Z-offset are correct", "Run program in single-block mode with feedrate override at 0% first", "Use graphical verification / backplot before running"] },
    { id: 51, category: "program", symptom: "cutter compensation or offset error",
      question: "Are dimensions consistently off by the tool radius or diameter?",
      yesNode: 52, noNode: null,
      diagnosis: "Cutter radius compensation (G41/G42) error or missing",
      confidence: 0.85,
      fixes: ["Verify G41/G42 is active with correct D-offset", "Check compensation direction (G41=left, G42=right in climb)", "Ensure lead-in move is longer than cutter radius", "Verify tool diameter offset register has correct value", "Check for G40 cancel before tool change"] },
    { id: 52, category: "program", symptom: "coordinate system or WCS error",
      question: "", yesNode: null, noNode: null,
      diagnosis: "Work coordinate system (WCS) origin or rotation error",
      confidence: 0.80,
      fixes: ["Re-probe work zero with edge finder or touch probe", "Verify correct G54-G59 or G54.1 Pn is selected", "Check for leftover G68 rotation or G51 scaling", "Confirm units (G20/G21) match program intent", "Use G10 L2 to set WCS from probing results"] },
  ];
}

// ============================================================================
// COMMON PROBLEMS DATABASE
// ============================================================================

function buildCommonProblems(): Record<Category, CommonProblem[]> {
  return {
    chatter: [
      { name: "Regenerative chatter in slotting", frequency: "very common", symptoms: ["loud vibration", "scalloped surface", "tool breakage risk"], quickFix: "Reduce ae to 40% and increase RPM to nearest stable lobe", preventiveMeasure: "Use variable-helix end mills and perform tap testing" },
      { name: "Thin-wall vibration", frequency: "common", symptoms: ["poor finish on thin walls", "dimensional error", "audible buzz"], quickFix: "Add support backing or reduce depth of cut", preventiveMeasure: "Plan machining sequence to maintain wall stiffness throughout" },
      { name: "Long-reach tool vibration", frequency: "common", symptoms: ["chatter at depth", "taper on part", "rough finish"], quickFix: "Switch to anti-vibration boring bar or reduce L/D ratio", preventiveMeasure: "Use largest possible tool diameter for reach required" },
    ],
    surface_finish: [
      { name: "BUE in stainless/aluminum", frequency: "very common", symptoms: ["gummy surface", "material welding to tool", "torn finish"], quickFix: "Increase cutting speed 20-30% and apply coolant flood", preventiveMeasure: "Use polished-rake, sharp-edge geometry with appropriate coating" },
      { name: "Feed marks in face milling", frequency: "common", symptoms: ["visible scallops", "directional pattern", "Ra above target"], quickFix: "Reduce feed per tooth or add wiper flat", preventiveMeasure: "Use face mill with one wiper insert for finish passes" },
      { name: "Orange peel on hardened steel", frequency: "moderate", symptoms: ["wavey surface", "inconsistent gloss", "micro-chatter pattern"], quickFix: "Increase spindle speed and reduce feed, verify toolholder runout", preventiveMeasure: "Use CBN inserts with honed edge in dedicated finish pass" },
    ],
    tool_breakage: [
      { name: "Small end mill breakage in pockets", frequency: "very common", symptoms: ["broken tool in pocket", "chip packing", "burnt edges"], quickFix: "Reduce axial depth to 1xD max, ensure chip evacuation", preventiveMeasure: "Use peck milling or trochoidal paths, through-tool coolant" },
      { name: "Drill breakage in deep holes", frequency: "common", symptoms: ["drill snapped at flute", "squealing before break", "chips balled up"], quickFix: "Use peck cycle with full retract, reduce feed 20%", preventiveMeasure: "Use through-coolant drills, proper pilot hole, peck at 3xD intervals" },
      { name: "Insert chipping on interrupted cut", frequency: "common", symptoms: ["edge chipping", "rough entry marks", "inconsistent chip thickness"], quickFix: "Use tougher grade (more Co binder), reduce entry feed", preventiveMeasure: "Use round or negative-rake inserts for interrupted cuts" },
    ],
    dimensional: [
      { name: "Thermal drift over production run", frequency: "very common", symptoms: ["parts trending oversize/undersize", "morning vs afternoon variation", "spindle warm-up effect"], quickFix: "Run warm-up cycle, probe every 10th part to adjust offsets", preventiveMeasure: "Install thermal compensation, use in-process probing" },
      { name: "Tool deflection taper", frequency: "common", symptoms: ["taper on deep walls", "oversize at bottom", "correct at top"], quickFix: "Reduce radial depth, add spring pass, shorten tool", preventiveMeasure: "Calculate deflection (δ=FL³/3EI) and apply comp in CAM" },
      { name: "Backlash on direction reversal", frequency: "moderate", symptoms: ["witness mark at direction change", "circle test shows bump", "mismatch climb vs conventional"], quickFix: "Approach all critical dims from same direction", preventiveMeasure: "Calibrate backlash compensation, consider linear scales" },
    ],
    chip: [
      { name: "Bird nesting in turning", frequency: "very common", symptoms: ["chips wrapping around workpiece", "stringy chips", "surface scratching"], quickFix: "Increase feed to engage chip breaker, try high-pressure coolant", preventiveMeasure: "Select correct chip breaker geometry for ap/f range" },
      { name: "Chip re-cutting in pockets", frequency: "common", symptoms: ["poor finish at pocket bottom", "excessive tool wear", "burnt chips"], quickFix: "Increase coolant pressure, reduce pocket depth per pass", preventiveMeasure: "Use through-tool coolant, air blast, or vacuum chip removal" },
    ],
    coolant: [
      { name: "Monday morning stink", frequency: "very common", symptoms: ["rancid odor", "dark coolant", "skin irritation"], quickFix: "Add biocide, skim tramp oil, check concentration", preventiveMeasure: "Maintain 6-8% concentration, run weekend aeration, skim tramp oil daily" },
      { name: "Foaming causing air pockets", frequency: "common", symptoms: ["visible foam", "inconsistent cooling", "poor finish"], quickFix: "Add defoamer, remove tramp oil, check return plumbing", preventiveMeasure: "Use compatible coolant, maintain concentration, check for air leaks" },
      { name: "Corrosion on parts", frequency: "moderate", symptoms: ["rust spots", "staining after machining", "flash rust"], quickFix: "Increase concentration, apply rust preventive immediately", preventiveMeasure: "Maintain pH 8.5-9.2, apply VCI or dry parts quickly, use corrosion-inhibited coolant" },
    ],
    fixture: [
      { name: "Part lift from cutting forces", frequency: "common", symptoms: ["part shifts up", "undercut at base", "gouge marks"], quickFix: "Add top clamp or reduce upward-cutting forces", preventiveMeasure: "Analyze force direction vs clamp layout, use pull-down fixturing" },
      { name: "Thin part distortion", frequency: "common", symptoms: ["part warps when unclamped", "dimensions shift after release", "bow shape"], quickFix: "Reduce clamping force, use conformal jaws", preventiveMeasure: "Machine rough/semi/finish in stages, stress-relieve between ops" },
    ],
    program: [
      { name: "Crash from wrong tool offset", frequency: "common", symptoms: ["collision with fixture", "broken tool", "damaged spindle"], quickFix: "Verify tool offsets with single-block and feedhold", preventiveMeasure: "Use tool presetter, verify with G43 H check before running" },
      { name: "Wrong compensation direction", frequency: "moderate", symptoms: ["oversize/undersize by 2x radius", "one-sided offset error", "gouge on first move"], quickFix: "Verify G41/G42 direction matches climb/conventional choice", preventiveMeasure: "Dry-run with graphics, use canned cycles where possible" },
    ],
    alarm: [
      { name: "Servo alarm from overload", frequency: "common", symptoms: ["servo alarm", "axis fault", "machine stop mid-cut"], quickFix: "Reduce feed rate, check for chip packing or fixture interference", preventiveMeasure: "Monitor spindle/axis load in program, set adaptive feed control" },
      { name: "Overtravel alarm", frequency: "moderate", symptoms: ["axis limit alarm", "machine stops at extent", "program runs off table"], quickFix: "Verify work zero position, check program extents in graphics", preventiveMeasure: "Set soft limits in program, verify setup sheet coordinates match" },
    ],
  };
}

// ============================================================================
// SYMPTOM KEYWORD MAP (for fuzzy matching)
// ============================================================================

const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  chatter: ["chatter", "vibration", "noise", "scallop", "harmonics", "ringing", "buzz", "resonance", "shaking", "marks"],
  surface_finish: ["finish", "surface", "rough", "Ra", "orange peel", "feed marks", "scallop", "BUE", "gummy", "torn", "wavey", "gloss"],
  tool_breakage: ["break", "broken", "chip", "chipped", "fracture", "snap", "shatter", "crater", "catastrophic", "failure"],
  dimensional: ["oversize", "undersize", "taper", "out-of-round", "dimension", "tolerance", "drift", "offset", "backlash", "size", "tight", "loose"],
  chip: ["stringy", "bird nest", "nesting", "long chip", "re-cut", "chip control", "wrapping", "balling", "packing"],
  coolant: ["foam", "foaming", "odor", "smell", "rust", "corrosion", "stain", "bacteria", "concentration", "pH", "coolant"],
  fixture: ["clamp", "fixture", "movement", "shift", "deform", "datum", "workholding", "lift", "mark", "distort"],
  program: ["gouge", "crash", "collision", "offset error", "compensation", "G41", "G42", "rapid", "WCS", "coordinate", "G54"],
};

// ============================================================================
// ENGINE
// ============================================================================

export class TroubleshootingDecisionTreeEngine {
  private tree: TreeNode[];
  private commonProblems: Record<Category, CommonProblem[]>;

  constructor() {
    this.tree = buildDecisionTree();
    this.commonProblems = buildCommonProblems();
  }

  /** Main dispatcher entry point. */
  calculate(action: string, params: Record<string, any> = {}): any {
    switch (action) {
      case "troubleshoot_diagnose":
        return this.diagnose(params);
      case "troubleshoot_by_symptom":
        return this.bySymptom(params);
      case "troubleshoot_tree":
        return this.getTree();
      case "troubleshoot_common":
        return this.getCommon(params);
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  // ── troubleshoot_diagnose ──────────────────────────────────────────────

  private diagnose(params: Record<string, any>): {
    diagnosis: DiagnosisResult[];
    questionsToNarrow?: string[];
  } {
    const symptoms: string[] = params.symptoms ?? [];
    const machineType: string | undefined = params.machineType;
    const operation: string | undefined = params.operation;
    const material: string | undefined = params.material;

    if (!symptoms.length) {
      return { diagnosis: [], questionsToNarrow: ["What symptoms are you observing? (e.g., chatter, poor finish, broken tool, dimensional error)"] };
    }

    // Match symptoms to categories via fuzzy keyword overlap
    const categoryScores = this.matchSymptomCategories(symptoms);
    const results: DiagnosisResult[] = [];
    const questions: string[] = [];

    // Walk decision trees for top matching categories
    const sortedCategories = Object.entries(categoryScores)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length === 0) {
      return {
        diagnosis: [],
        questionsToNarrow: [
          "Could not match symptoms to known categories. Please describe: What does the surface look like? Is there noise or vibration? Are dimensions wrong?",
        ],
      };
    }

    for (const [category, score] of sortedCategories.slice(0, 3)) {
      // Find root nodes for this category
      const rootNodes = this.tree.filter(
        n => n.category === category && this.isRootNode(n.id)
      );

      for (const root of rootNodes) {
        const leafNodes = this.walkTree(root.id, symptoms);
        for (const leaf of leafNodes) {
          if (leaf.diagnosis) {
            let confidence = (leaf.confidence ?? 0.5) * Math.min(score / 3, 1.0);
            // Boost confidence with context clues
            if (machineType) confidence = Math.min(confidence * 1.05, 0.98);
            if (operation) confidence = Math.min(confidence * 1.05, 0.98);
            if (material) confidence = Math.min(confidence * 1.03, 0.98);

            results.push({
              rootCause: leaf.diagnosis,
              confidence: Math.round(confidence * 100) / 100,
              evidence: this.buildEvidence(leaf, symptoms, category),
              fixes: leaf.fixes ?? [],
            });
          }
        }

        // Collect questions from non-leaf nodes user hasn't answered
        const intermediateNodes = this.tree.filter(
          n => n.category === category && n.question && !n.diagnosis
        );
        for (const node of intermediateNodes.slice(0, 2)) {
          if (node.question && !questions.includes(node.question)) {
            questions.push(node.question);
          }
        }
      }
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    return {
      diagnosis: results.slice(0, 6),
      questionsToNarrow: questions.length > 0 ? questions.slice(0, 4) : undefined,
    };
  }

  // ── troubleshoot_by_symptom ────────────────────────────────────────────

  private bySymptom(params: Record<string, any>): { causes: SymptomCause[] } {
    const symptom: string = (params.symptom ?? "").toLowerCase();
    if (!symptom) {
      return { causes: [] };
    }

    const causes: SymptomCause[] = [];
    const matchedCategories = this.matchSymptomCategories([symptom]);

    for (const [category, score] of Object.entries(matchedCategories)) {
      if (score <= 0) continue;
      const leafNodes = this.tree.filter(
        n => n.category === category && n.diagnosis
      );
      for (const node of leafNodes) {
        const relevance = this.keywordOverlap(symptom, node.symptom);
        if (relevance > 0 || score >= 2) {
          causes.push({
            name: node.diagnosis!,
            likelihood: Math.min((node.confidence ?? 0.5) * (0.5 + relevance * 0.5), 1.0),
            description: `Category: ${category}. Matched from: ${node.symptom}`,
            quickFixes: (node.fixes ?? []).slice(0, 2),
            deepFixes: (node.fixes ?? []).slice(2),
          });
        }
      }
    }

    causes.sort((a, b) => b.likelihood - a.likelihood);
    return { causes: causes.slice(0, 8) };
  }

  // ── troubleshoot_tree ──────────────────────────────────────────────────

  private getTree(): {
    nodes: number;
    depth: number;
    categories: string[];
    tree: TreeNode[];
  } {
    const categories = [...new Set(this.tree.map(n => n.category))];
    const depth = this.computeMaxDepth();
    return {
      nodes: this.tree.length,
      depth,
      categories,
      tree: this.tree,
    };
  }

  // ── troubleshoot_common ────────────────────────────────────────────────

  private getCommon(params: Record<string, any>): { problems: CommonProblem[] } {
    const category = params.category as Category | undefined;
    if (category && this.commonProblems[category]) {
      return { problems: this.commonProblems[category] };
    }
    // Return all if no category specified
    const all: CommonProblem[] = [];
    for (const probs of Object.values(this.commonProblems)) {
      all.push(...probs);
    }
    return { problems: all };
  }

  // ── Helper methods ─────────────────────────────────────────────────────

  /** Fuzzy match symptoms to categories using keyword overlap. */
  private matchSymptomCategories(symptoms: string[]): Record<string, number> {
    const scores: Record<string, number> = {};
    const joined = symptoms.join(" ").toLowerCase();

    for (const [category, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (joined.includes(kw.toLowerCase())) {
          score += 1;
        }
      }
      scores[category] = score;
    }
    return scores;
  }

  /** Compute keyword overlap between two strings (0-1). */
  private keywordOverlap(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let overlap = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) overlap++;
    }
    return overlap / Math.max(wordsA.size, wordsB.size);
  }

  /** Check if a node is a root (no other node points to it). */
  private isRootNode(id: number): boolean {
    return !this.tree.some(n => n.yesNode === id || n.noNode === id);
  }

  /** Walk the tree from a node, collecting all reachable leaf diagnoses.
   *  Uses symptom-based heuristic: follow both branches if unsure. */
  private walkTree(startId: number, symptoms: string[]): TreeNode[] {
    const results: TreeNode[] = [];
    const visited = new Set<number>();
    const stack: number[] = [startId];
    const joined = symptoms.join(" ").toLowerCase();

    while (stack.length > 0) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = this.tree.find(n => n.id === id);
      if (!node) continue;

      if (node.diagnosis) {
        results.push(node);
        continue;
      }

      // Heuristic: if question keywords appear in symptoms, follow "yes"
      // Otherwise follow both paths (user hasn't answered the question)
      const questionRelevance = this.keywordOverlap(joined, node.question + " " + node.symptom);
      if (questionRelevance > 0.2) {
        // Likely yes — follow yes path primarily
        if (node.yesNode != null) stack.push(node.yesNode);
        if (node.noNode != null) stack.push(node.noNode); // still explore no path at lower priority
      } else {
        // Uncertain — explore both paths
        if (node.yesNode != null) stack.push(node.yesNode);
        if (node.noNode != null) stack.push(node.noNode);
      }
    }

    return results;
  }

  /** Build evidence strings for a diagnosis. */
  private buildEvidence(node: TreeNode, symptoms: string[], category: string): string[] {
    const evidence: string[] = [];
    evidence.push(`Matched category: ${category}`);
    evidence.push(`Tree node symptom: ${node.symptom}`);

    const matchedKeywords = (SYMPTOM_KEYWORDS[category] ?? []).filter(kw =>
      symptoms.some(s => s.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matchedKeywords.length > 0) {
      evidence.push(`Matched keywords: ${matchedKeywords.join(", ")}`);
    }
    return evidence;
  }

  /** Compute maximum depth of the decision tree. */
  private computeMaxDepth(): number {
    const rootIds = this.tree
      .filter(n => this.isRootNode(n.id))
      .map(n => n.id);

    let maxDepth = 0;
    for (const rootId of rootIds) {
      maxDepth = Math.max(maxDepth, this.depthFrom(rootId, new Set()));
    }
    return maxDepth;
  }

  /** Recursive depth computation. */
  private depthFrom(id: number, visited: Set<number>): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const node = this.tree.find(n => n.id === id);
    if (!node) return 0;

    let d = 1;
    const children: number[] = [];
    if (node.yesNode != null) children.push(node.yesNode);
    if (node.noNode != null) children.push(node.noNode);

    let maxChild = 0;
    for (const childId of children) {
      maxChild = Math.max(maxChild, this.depthFrom(childId, visited));
    }
    return d + maxChild;
  }
}

/** Singleton instance. */
export const troubleshootingDecisionTreeEngine = new TroubleshootingDecisionTreeEngine();
