/**
 * MacroLibraryEngine — catalog of the JM Die parametric lathe macros + part→family matching
 * + non-safety-critical placement of a labelled macro TEMPLATE into a part-library folder.
 *
 * WHAT THIS DOES (safe):
 *   - Catalogs the Okuma-OSP VC-variable lathe macros in `JM DIE/Macro programs/`
 *     (wafer-insert / casing / casing+counterbore / top-hat-casing), parsing each into a
 *     MacroAST via MacroProgramIntelligenceEngine so callers can see the VCxxx variable map.
 *   - Matches a part (geometry / feature keywords / part-name text) to one of those families,
 *     reusing LathePartClassifierEngine for the base classification then mapping to a macro family.
 *   - Places a *labelled reference TEMPLATE* of the matching macro into
 *     `_PART LIBRARY/<customer>/<pn>/CNC PROGRAM/_MACRO-TEMPLATE_<macro>.min` with a header that
 *     says DO NOT RUN AS-IS — fill the VCxxx vars first, then S(x)-gate + sim + operator sign-off.
 *
 * WHAT THIS DOES NOT DO (safety-critical — separate milestone MACRO-PROGRAM-PIPELINE-MS0):
 *   - It does NOT fill any VC variable from print dims.
 *   - It does NOT emit a runnable program.
 *   - It does NOT auto-run anything.
 *   That pipeline (MacroFillOrchestratorEngine + OkumaParametricProgramEngine + LatheProofCarryingEmitEngine
 *   + ShopConfigurationEngine per-machine emit) is gated at S(x) >= 0.70 + envelope + sim + operator.
 *
 * Reuse: MacroProgramIntelligenceEngine.parseOkumaMacro (AST/variable parse), LathePartClassifierEngine
 *   (base part classification), PartFolderOrganizerEngine (part-folder layout / part.json I/O — used via its
 *   getPartFolder; file copy done here directly so we never touch its program-copy path), part-library-layout.json.
 *
 * Wired to: prism_cad (sits with create_part_folder — part-library scaffolding) AND prism_turning (lathe domain).
 * Actions: macro_library_list / macro_match_family / macro_place_template / macro_fanout_dry_run.
 */

import * as fs from "fs";
import * as path from "path";
import { macroProgramIntelligenceEngine, MacroProgramIntelligenceEngine } from "./MacroProgramIntelligenceEngine.js";
import type { MacroAST } from "./MacroProgramIntelligenceEngine.js";
import { lathePartClassifierEngine } from "./LathePartClassifierEngine.js";
import type { PartGeometryInput, LathePartFamily } from "./LathePartClassifierEngine.js";

// ───────────────────────────────────────────────────────────────────────────────
// Config

/** The 4 macro families this library knows about. */
export type MacroFamily = "wafer-insert" | "casing" | "casing-counterbore" | "top-hat-casing";

/** Resolve the macro directory. Env override `PRISM_MACRO_DIR`, else the JM Die default. */
export function macroDir(): string {
  return process.env.PRISM_MACRO_DIR || path.join(jmDieRoot(), "Macro programs");
}
function jmDieRoot(): string {
  // repo-root/JM DIE — works from the built dist too (dist is repo-root/mcp-server/dist).
  if (process.env.PRISM_JM_DIE_ROOT) return process.env.PRISM_JM_DIE_ROOT;
  // __dirname under dist = .../mcp-server/dist ; under src = .../mcp-server/src/engines
  const candidates = [
    path.resolve(__dirname, "../../../JM DIE"),       // from src/engines
    path.resolve(__dirname, "../../JM DIE"),           // from dist
    path.resolve(process.cwd(), "JM DIE"),
    "H:/PRISM/JM DIE",
  ];
  for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch { /* ignore */ } }
  return candidates[0];
}
/** The part-library root (where the consolidated <customer>/<pn>/ folders live). */
export function partLibraryRoot(): string {
  if (process.env.PRISM_PART_LIBRARY_ROOT) return process.env.PRISM_PART_LIBRARY_ROOT;
  try {
    const cfgPath = path.resolve(__dirname, "../../data/state/part-library-layout.json");
    const alt = path.resolve(__dirname, "../../../mcp-server/data/state/part-library-layout.json");
    const p = fs.existsSync(cfgPath) ? cfgPath : (fs.existsSync(alt) ? alt : null);
    if (p) {
      const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
      if (cfg && typeof cfg.libraryRoot === "string" && cfg.libraryRoot) return cfg.libraryRoot;
    }
  } catch { /* ignore */ }
  return path.join(jmDieRoot(), "_PART LIBRARY");
}
const CNC_SUBDIR = "CNC PROGRAM";
const TEMPLATE_PREFIX = "_MACRO-TEMPLATE_";

interface MacroCatalogEntry {
  file: string;
  family: MacroFamily;
  programNumber: string | null;
  controller: "okuma_osp";
  description: string;
  /** Base LathePartFamily classifications that are plausible for this macro family. */
  baseFamilies: LathePartFamily[];
  /** Geometry/feature predicates that MUST hold for this macro to be a candidate. */
  requires: { boreIdPresent?: boolean; counterborePresent?: boolean; flangeStepPresent?: boolean };
  /** Predicates that, if true, boost the score (not required). */
  prefers: { thin?: boolean; hasOdTaper?: boolean; hasIdTaper?: boolean; counterborePresent?: boolean };
  /** Substrings that, found in the part's feature list / name text (case-insensitive), strongly indicate this family. */
  nameTerms: string[];
}

/** The fixed catalog — these are 4 specific files the user dropped into JM DIE/Macro programs/. */
const CATALOG: MacroCatalogEntry[] = [
  {
    file: "BASE WAFER INSERT MACRO.min", family: "wafer-insert", programNumber: "O1001", controller: "okuma_osp",
    description: "Wafer insert — OD profile (+ face chamfer/radius) + spot drill + thru drill + ID rough/finish bore with taper.",
    baseFamilies: ["disc", "spacer", "bushing", "sleeve"],
    requires: { boreIdPresent: true },
    prefers: { thin: true, hasOdTaper: true, hasIdTaper: true },
    nameTerms: ["wafer insert", "wafer", "insert", "wfr"],
  },
  {
    file: "BASIC-CASING.MIN", family: "casing", programNumber: null, controller: "okuma_osp",
    description: "Casing — face / OD turn / ID bore / drill / cutoff. A small turned shell/housing.",
    baseFamilies: ["cap", "plug", "sleeve", "bushing", "spacer", "coupling"],
    requires: { boreIdPresent: true },
    prefers: {},
    nameTerms: ["casing", "case", "housing", "shell", "body", "can"],
  },
  {
    file: "BASIC CASING WITH SINGLE COUNTERBORE.min", family: "casing-counterbore", programNumber: null, controller: "okuma_osp",
    description: "Casing + a single counterbore.",
    baseFamilies: ["cap", "plug", "sleeve", "bushing", "coupling"],
    requires: { boreIdPresent: true, counterborePresent: true },
    prefers: {},
    nameTerms: ["casing", "counterbore", "cbore", "c'bore", "c-bore"],
  },
  {
    file: "BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min", family: "top-hat-casing", programNumber: null, controller: "okuma_osp",
    description: "Top-hat casing (flanged brim on top of a body) + a single counterbore.",
    baseFamilies: ["flange", "cap", "hub"],
    requires: { boreIdPresent: true, flangeStepPresent: true },
    prefers: { counterborePresent: true },
    nameTerms: ["top hat", "tophat", "top-hat", "tophat casing", "flanged casing", "hat"],
  },
];

// ───────────────────────────────────────────────────────────────────────────────
// Public result types

export interface MacroSummary {
  file: string;
  family: MacroFamily;
  programNumber: string | null;
  controller: "okuma_osp";
  description: string;
  available: boolean;
  /** Present iff available. */
  ast?: {
    programNumber: string;
    lineCount: number;
    toolCount: number;
    operationSequence: string[];
    variableCount: number;
    /** varName -> { initialValue?, formula?, comment?, category }  (the VCxxx map) */
    variables: Record<string, { initialValue?: number; formula?: string; comment?: string; category: string }>;
    hasOptionalFeatures: boolean;
    safetyChecksPassed: boolean;
  };
  error?: string;
}

export interface MacroMatchInput {
  /** Lathe geometry — preferred; classified via LathePartClassifierEngine. */
  geometry?: PartGeometryInput;
  /** Free-form feature keywords (also taken from geometry.features if present). */
  features?: string[];
  /** Any text associated with the part (PN, description, drawing title) — die-detail names often encode the family. */
  nameText?: string;
  /** Explicit counterbore present? (overrides inference) */
  counterborePresent?: boolean;
  /** Explicit flange/brim step present? (overrides inference) */
  flangeStepPresent?: boolean;
  /** Explicit OD-taper present? */
  odTaperPresent?: boolean;
  /** Explicit ID-taper present? */
  idTaperPresent?: boolean;
}

export interface MacroMatchResult {
  family: MacroFamily | null;
  confidence: "high" | "medium" | "low" | "none";
  score: number;
  reasons: string[];
  /** Other macro families that also scored, with their scores (for transparency / ties). */
  alternatives: Array<{ family: MacroFamily; score: number }>;
  /** The base LathePartFamily the classifier picked (if geometry was supplied). */
  baseFamily?: LathePartFamily;
  baseConfidence?: number;
  macro?: MacroSummary;
}

export interface PlaceTemplateInput {
  partNumber: string;
  customer?: string;
  /** If omitted, you MUST supply enough match info via `match` so we can resolve a family. */
  family?: MacroFamily;
  match?: MacroMatchInput;
  /** Override the part-library root (tests use a temp dir). */
  libraryRoot?: string;
  /** Override the macro source dir. */
  macroSourceDir?: string;
  /** If true, do everything except write. */
  dryRun?: boolean;
}

export interface PlaceTemplateResult {
  placed: boolean;
  dryRun: boolean;
  family: MacroFamily | null;
  matchConfidence: MacroMatchResult["confidence"] | null;
  partFolder: string;
  templatePath: string | null;
  hadExistingProgram: boolean;
  existingPrograms: string[];
  partJsonUpdated: boolean;
  reason?: string;
}

export interface FanoutDryRunResult {
  libraryRoot: string;
  scannedPartFolders: number;
  partFoldersWithUsableInfo: number;
  matched: number;
  byFamily: Record<MacroFamily, number>;
  /** First N matches for spot-checking. */
  sample: Array<{ partNumber: string; customer: string; family: MacroFamily; confidence: string }>;
  /** Folders we couldn't match because part.json lacks geometry/features — the full fan-out script (phase20) re-reads prints. */
  unmatchableForLackOfData: number;
  notes: string[];
}

// ───────────────────────────────────────────────────────────────────────────────
// Engine

export class MacroLibraryEngineImpl {
  /** Catalog the macros: read each file, parse to a MacroAST, return the summary. Never throws for a missing file. */
  listMacros(opts: { dir?: string } = {}): { macros: MacroSummary[]; dir: string } {
    const dir = opts.dir || macroDir();
    const macros: MacroSummary[] = [];
    for (const entry of CATALOG) {
      const fp = path.join(dir, entry.file);
      const base: MacroSummary = {
        file: entry.file, family: entry.family, programNumber: entry.programNumber,
        controller: entry.controller, description: entry.description, available: false,
      };
      try {
        if (!fs.existsSync(fp)) { base.error = `not found at ${fp}`; macros.push(base); continue; }
        const code = fs.readFileSync(fp, "utf8");
        if (!code.trim()) { base.error = "empty file"; macros.push(base); continue; }
        const ast: MacroAST = MacroProgramIntelligenceEngine.parseOkumaMacro(code, "okuma_osp");
        const vars: Record<string, { initialValue?: number; formula?: string; comment?: string; category: string }> = {};
        for (const [name, v] of Object.entries(ast.variables || {})) {
          vars[name] = { initialValue: v.initialValue, formula: v.formula, comment: v.comment, category: String(v.category) };
        }
        base.available = true;
        base.ast = {
          programNumber: ast.programNumber || entry.programNumber || "",
          lineCount: ast.lineCount,
          toolCount: (ast.toolDefinitions || []).length,
          operationSequence: ast.operationSequence || [],
          variableCount: Object.keys(vars).length,
          variables: vars,
          hasOptionalFeatures: !!ast.hasOptionalFeatures,
          safetyChecksPassed: !!(ast.safetyChecks && (ast.safetyChecks as any).passed !== false),
        };
      } catch (e: any) {
        base.error = `parse failed: ${e?.message || String(e)}`;
      }
      macros.push(base);
    }
    return { macros, dir };
  }

  /** Get the parsed summary for one family (or null if not catalogued / unavailable). */
  getMacro(family: MacroFamily, opts: { dir?: string } = {}): MacroSummary | null {
    const { macros } = this.listMacros(opts);
    return macros.find((m) => m.family === family) || null;
  }

  /**
   * Match a part to a macro family via a PRIORITY CASCADE (the actual decision logic — a top-hat is a top-hat
   * regardless of whether it also has a counterbore; a counterbored casing beats a plain casing; etc.):
   *   1. flange/brim step present (or "top hat" in the name)        → top-hat-casing   (the only macro with a flange)
   *   2. counterbore present (or "counterbore"/"cbore" in the name) + an ID bore   → casing-counterbore
   *   3. "wafer"/"insert" in the name, OR (thin + ID bore + a taper)               → wafer-insert
   *   4. an ID bore + (a casing-family base classification OR "casing"/"case"/"housing"/"shell" in the name)  → casing
   *   5. otherwise                                                                 → null  (no confident match)
   * Reuses LathePartClassifierEngine for the base classification (a corroborating signal, not the only one).
   * `score` reflects the matched priority rank + how many distinct positive signals corroborated; `alternatives`
   * are the lower-priority families that also would have matched (transparency). `confidence`:
   *   "high"   — a name-term hit, or ≥2 distinct positive signals
   *   "medium" — exactly one signal beyond the bare cascade condition
   *   "low"    — matched on a single weak geometry inference only (the fan-out treats "low" as not-matched)
   *   "none"   — no family matched.
   */
  matchFamily(input: MacroMatchInput): MacroMatchResult {
    const featureSet = new Set<string>();
    for (const f of input.features || []) featureSet.add(String(f).toLowerCase());
    for (const f of input.geometry?.features || []) featureSet.add(String(f).toLowerCase());
    const nameText = (input.nameText || "").toLowerCase();
    const has = (kw: string) => featureSet.has(kw) || [...featureSet].some((x) => x.includes(kw)) || nameText.includes(kw);

    const boreIdPresent = (input.geometry?.bore_id_mm ?? 0) > 0 || has("bore") || has("id bore") || has("through hole") || has("thru drill") || has(" thru");
    const cboreInName = has("counterbore") || has("cbore") || has("c'bore") || has("c-bore");
    const counterborePresent = input.counterborePresent ?? cboreInName;
    const topHatInName = has("top hat") || has("tophat") || has("top-hat");
    const flangeStepPresent = input.flangeStepPresent ?? (topHatInName || has("flange") || has("brim") || has("flanged casing") || (input.geometry?.has_bolt_circle === true && (input.geometry?.bore_id_mm ?? 0) > 0));
    const odTaperPresent = input.odTaperPresent ?? (has("od taper") || has("taper") || has("chamfer") || has("cone"));
    const idTaperPresent = input.idTaperPresent ?? (has("id taper") || has("bore taper") || has("counterbore angle"));
    const waferInName = has("wafer") || has("wfr") || (has("insert") && !has("inserts"));
    const casingInName = has("casing") || has("case ") || nameText.endsWith("case") || has("housing") || has("shell") || has(" body") || has("can ");
    const thin = (() => {
      const L = input.geometry?.length_mm, D = input.geometry?.max_od_mm;
      if (L != null && D != null && D > 0) return L / D < 0.6;
      return has("wafer") || has("thin");
    })();

    let baseFamily: LathePartFamily | undefined;
    let baseConfidence: number | undefined;
    if (input.geometry) {
      try {
        const c = lathePartClassifierEngine.classify(input.geometry);
        baseFamily = c.family;
        baseConfidence = (c as { confidence?: number; score?: number }).confidence ?? (c as { score?: number }).score;
      } catch { /* classifier shouldn't hard-fail; if it does, fall back to name/feature signals */ }
    }
    const baseFitsCasing = !!baseFamily && CATALOG.find((e) => e.family === "casing")!.baseFamilies.includes(baseFamily);
    const baseFitsWafer = !!baseFamily && CATALOG.find((e) => e.family === "wafer-insert")!.baseFamilies.includes(baseFamily);

    type Cand = { family: MacroFamily; rank: 1 | 2 | 3 | 4; signals: string[]; nameHit: boolean };
    const cands: Cand[] = [];
    // Rank 1 — flange/brim → top-hat-casing
    if (flangeStepPresent) {
      const sig: string[] = [];
      if (topHatInName) sig.push('name contains "top hat"');
      if (input.flangeStepPresent || has("flange") || has("brim")) sig.push("a flange/brim step is present (the defining feature of a top-hat casing)");
      if (input.geometry?.has_bolt_circle && (input.geometry?.bore_id_mm ?? 0) > 0) sig.push("bolt circle on a bored part");
      if (counterborePresent) sig.push("plus a counterbore (a sub-feature; the macro includes one)");
      if (boreIdPresent) sig.push("has an ID bore");
      cands.push({ family: "top-hat-casing", rank: 1, signals: sig.length ? sig : ["flange/brim step inferred"], nameHit: topHatInName });
    }
    // Rank 2 — counterbore + ID bore → casing-counterbore
    if (counterborePresent && boreIdPresent) {
      const sig: string[] = [];
      if (cboreInName) sig.push('name contains "counterbore"/"cbore"');
      if (input.counterborePresent) sig.push("a counterbore is present (the defining feature of this variant)");
      if (casingInName) sig.push('name contains "casing"');
      if (baseFitsCasing) sig.push(`base classification "${baseFamily}" fits a casing`);
      cands.push({ family: "casing-counterbore", rank: 2, signals: sig.length ? sig : ["counterbore on a bored part"], nameHit: cboreInName });
    }
    // Rank 3 — wafer/insert name OR (thin + bored + taper) → wafer-insert
    if (waferInName || (thin && boreIdPresent && (odTaperPresent || idTaperPresent))) {
      const sig: string[] = [];
      if (waferInName) sig.push('name contains "wafer"/"insert"');
      if (thin) sig.push("thin part (low L/D)");
      if (boreIdPresent) sig.push("has an ID bore");
      if (odTaperPresent) sig.push("has an OD taper/chamfer");
      if (idTaperPresent) sig.push("has an ID taper");
      if (baseFitsWafer) sig.push(`base classification "${baseFamily}" fits a wafer/disc`);
      cands.push({ family: "wafer-insert", rank: 3, signals: sig, nameHit: waferInName });
    }
    // Rank 4 — bored + (casing base OR casing name) → casing
    if (boreIdPresent && (baseFitsCasing || casingInName)) {
      const sig: string[] = [];
      if (casingInName) sig.push('name contains "casing"/"housing"/"shell"');
      if (baseFitsCasing) sig.push(`base classification "${baseFamily}" fits a casing`);
      sig.push("has an ID bore");
      cands.push({ family: "casing", rank: 4, signals: sig, nameHit: casingInName });
    }

    // Disqualification reasons (for the null case).
    const disq: string[] = [];
    if (!boreIdPresent) disq.push("every macro family requires an ID bore — this part has none");
    if (!flangeStepPresent && !counterborePresent && !waferInName && !casingInName) disq.push("no family-distinguishing signal (flange / counterbore / wafer / casing name) and no fitting base classification");

    if (cands.length === 0) {
      return { family: null, confidence: "none", score: 0,
        reasons: disq.length ? disq : ["no macro family is a candidate for this part"], alternatives: [], baseFamily, baseConfidence };
    }
    cands.sort((a, b) => a.rank - b.rank); // lower rank = higher priority
    const top = cands[0];
    const alternatives = cands.slice(1).map((c) => ({ family: c.family, score: (5 - c.rank) * 25 + c.signals.length * 4 }));
    const score = (5 - top.rank) * 25 + top.signals.length * 6;
    const confidence: MacroMatchResult["confidence"] = (top.nameHit || top.signals.length >= 2) ? "high" : top.signals.length === 1 ? "medium" : "low";
    return {
      family: top.family, confidence, score, baseFamily, baseConfidence,
      reasons: [`matched "${top.family}" (priority ${top.rank}): ` + top.signals.join("; "), ...(alternatives.length ? [`also plausible: ${alternatives.map((a) => a.family).join(", ")}`] : [])],
      alternatives, macro: this.getMacro(top.family) || undefined,
    };
  }

  /**
   * Place a *labelled reference TEMPLATE* of the matching macro into the part folder's CNC PROGRAM/ dir.
   * Non-safety-critical: it's a copy of an existing macro file with a "DO NOT RUN AS-IS — fill the VCxxx
   * vars first" header. It never overwrites a real program; if one already exists it places the template alongside.
   * Idempotent (re-writing the same template content is a no-op-ish "placed: true, but unchanged").
   */
  placeMacroTemplate(input: PlaceTemplateInput): PlaceTemplateResult {
    const partNumber = String(input.partNumber || "").trim();
    if (!partNumber) throw new Error("placeMacroTemplate requires partNumber");
    const root = input.libraryRoot || partLibraryRoot();
    const srcDir = input.macroSourceDir || macroDir();

    // Resolve family.
    let family = input.family;
    let matchConf: MacroMatchResult["confidence"] | null = family ? "high" : null;
    if (!family) {
      if (!input.match) throw new Error("placeMacroTemplate: supply `family` or `match` (geometry/features/nameText) so a family can be resolved");
      const m = this.matchFamily(input.match);
      if (!m.family) {
        return { placed: false, dryRun: !!input.dryRun, family: null, matchConfidence: "none",
          partFolder: "", templatePath: null, hadExistingProgram: false, existingPrograms: [], partJsonUpdated: false,
          reason: `no confident macro-family match: ${m.reasons.join("; ")}` };
      }
      family = m.family; matchConf = m.confidence;
    }
    const cat = CATALOG.find((c) => c.family === family)!;
    const srcPath = path.join(srcDir, cat.file);
    if (!fs.existsSync(srcPath)) {
      return { placed: false, dryRun: !!input.dryRun, family, matchConfidence: matchConf,
        partFolder: "", templatePath: null, hadExistingProgram: false, existingPrograms: [], partJsonUpdated: false,
        reason: `macro source file not found: ${srcPath}` };
    }

    // Resolve the part folder. Prefer PartFolderOrganizerEngine.getPartFolder; fall back to constructing the path.
    let partFolder = "";
    try {
      // Lazy require so a missing/odd engine doesn't break the module load.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pfo = require("./PartFolderOrganizerEngine.js");
      const eng = pfo.partFolderOrganizerEngine || pfo.PartFolderOrganizerEngine;
      if (eng && typeof eng.getPartFolder === "function") {
        const r = eng.getPartFolder({ partNumber, customer: input.customer, libraryRoot: root }) ?? eng.getPartFolder(partNumber, input.customer);
        if (r && typeof r === "string") partFolder = r;
        else if (r && typeof r.path === "string") partFolder = r.path;
        else if (r && typeof r.folder === "string") partFolder = r.folder;
      }
    } catch { /* fall through to path construction */ }
    if (!partFolder) {
      const custDir = sanitizeSeg(input.customer || "_UNASSIGNED");
      partFolder = path.join(root, custDir, sanitizeSeg(partNumber));
    }
    if (!fs.existsSync(partFolder)) {
      return { placed: false, dryRun: !!input.dryRun, family, matchConfidence: matchConf,
        partFolder, templatePath: null, hadExistingProgram: false, existingPrograms: [], partJsonUpdated: false,
        reason: `part folder does not exist: ${partFolder} — create it first (prism_cad:create_part_folder)` };
    }

    const cncDir = path.join(partFolder, CNC_SUBDIR);
    // Inventory existing programs in CNC PROGRAM/ (real programs, not our templates).
    let existingPrograms: string[] = [];
    try {
      if (fs.existsSync(cncDir)) {
        existingPrograms = fs.readdirSync(cncDir).filter((f) => {
          if (f.startsWith(TEMPLATE_PREFIX) || f.startsWith("_")) return false;
          return /\.(min|nc|eia|hnc|tap|cnc|gcode|mpf|nc1|prg|txt)$/i.test(f);
        });
      }
    } catch { /* ignore */ }
    const hadExistingProgram = existingPrograms.length > 0;

    const templateName = `${TEMPLATE_PREFIX}${path.basename(cat.file)}`;
    const templatePath = path.join(cncDir, templateName);
    const macroBody = fs.readFileSync(srcPath, "utf8");
    const stamp = new Date().toISOString().slice(0, 10);
    const header =
      `(==================================================================)\n` +
      `(  MACRO TEMPLATE — DO NOT RUN AS-IS.                              )\n` +
      `(  Source macro : ${cat.file})\n` +
      `(  Family       : ${family})\n` +
      `(  Controller   : ${cat.controller.toUpperCase()})\n` +
      `(  Placed for PN: ${partNumber}${input.customer ? "  Customer: " + input.customer : ""})\n` +
      `(  Match conf   : ${matchConf})\n` +
      `(  Placed       : ${stamp}  by MacroLibraryEngine.placeMacroTemplate)\n` +
      `(  TO USE: fill the VCxxx variables from the print dims  ->  /lathe macro ${partNumber}  (or /okuma-macro / /macro-program fill).)\n` +
      `(  THEN: prism_safety:validate_physics  (S(x) >= 0.70 HARD BLOCK)  ->  sim/back-plot  ->  operator sign-off  ->  prove-out mode for first run.)\n` +
      `(  Calculated VC vars (RPMs, point depths, totals) are left as the macro's own expressions — DO NOT pre-compute.)\n` +
      `(==================================================================)\n`;
    const out = header + macroBody;

    if (input.dryRun) {
      return { placed: false, dryRun: true, family, matchConfidence: matchConf, partFolder, templatePath,
        hadExistingProgram, existingPrograms, partJsonUpdated: false,
        reason: "dry-run — would place template + tag part.json" };
    }

    // Write the template (idempotent: if it exists with identical content, skip the write).
    try { fs.mkdirSync(cncDir, { recursive: true }); } catch { /* ignore */ }
    let wrote = true;
    try {
      if (fs.existsSync(templatePath) && fs.readFileSync(templatePath, "utf8") === out) wrote = false;
      else fs.writeFileSync(templatePath, out, "utf8");
    } catch (e: any) {
      return { placed: false, dryRun: false, family, matchConfidence: matchConf, partFolder, templatePath: null,
        hadExistingProgram, existingPrograms, partJsonUpdated: false, reason: `write failed: ${e?.message || String(e)}` };
    }

    // Tag part.json.
    let partJsonUpdated = false;
    try {
      const pj = path.join(partFolder, "part.json");
      const obj = fs.existsSync(pj) ? JSON.parse(fs.readFileSync(pj, "utf8")) : { partNumber, customer: input.customer || "_UNASSIGNED" };
      obj.macroFamily = family;
      obj.macroTemplateSource = cat.file;
      obj.macroMatchConfidence = matchConf;
      obj.macroNeedsFill = true;
      obj.macroTemplatePlacedAt = new Date().toISOString();
      obj.macroNote = "Template only — VCxxx not filled. Use /lathe macro <pn> or /macro-program; then S(x)-gate + sim + operator sign-off before running.";
      fs.writeFileSync(pj, JSON.stringify(obj, null, 2), "utf8");
      partJsonUpdated = true;
    } catch { /* part.json tagging is best-effort */ }

    return { placed: true, dryRun: false, family, matchConfidence: matchConf, partFolder, templatePath,
      hadExistingProgram, existingPrograms, partJsonUpdated,
      reason: wrote ? "template placed" : "template already present (unchanged)" };
  }

  /**
   * Dry-run scan of the part library: how many part folders could be matched to a macro family from
   * whatever their part.json carries (features / dims / name). Honest about coverage — the phase18 part.json
   * mostly does NOT carry clean turning geometry, so most folders land in `unmatchableForLackOfData`;
   * the full fan-out (Docustrata/.index/phase20-macro-fanout.py, separate) re-reads the prints.
   */
  fanoutDryRun(opts: { libraryRoot?: string; limit?: number; sampleSize?: number } = {}): FanoutDryRunResult {
    const root = opts.libraryRoot || partLibraryRoot();
    const limit = opts.limit ?? Infinity;
    const sampleSize = opts.sampleSize ?? 25;
    const byFamily: Record<MacroFamily, number> = { "wafer-insert": 0, "casing": 0, "casing-counterbore": 0, "top-hat-casing": 0 };
    const sample: FanoutDryRunResult["sample"] = [];
    let scannedPartFolders = 0, withInfo = 0, matched = 0, noData = 0;
    const notes: string[] = [];

    let customers: string[] = [];
    try { customers = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => !d.startsWith("_") && fs.statSync(path.join(root, d)).isDirectory()) : []; }
    catch { customers = []; }
    if (customers.length === 0) notes.push(`part-library root not found or empty: ${root}`);

    outer: for (const cust of customers) {
      let parts: string[] = [];
      try { parts = fs.readdirSync(path.join(root, cust)).filter((d) => { try { return fs.statSync(path.join(root, cust, d)).isDirectory(); } catch { return false; } }); }
      catch { continue; }
      for (const pn of parts) {
        if (scannedPartFolders >= limit) break outer;
        scannedPartFolders++;
        const pj = path.join(root, cust, pn, "part.json");
        let obj: any = null;
        try { if (fs.existsSync(pj)) obj = JSON.parse(fs.readFileSync(pj, "utf8")); } catch { /* ignore */ }
        // Build a best-effort match input from part.json.
        const features: string[] = [];
        if (obj?.features && Array.isArray(obj.features)) for (const f of obj.features) features.push(String(f));
        if (obj?.blueprintTitles && Array.isArray(obj.blueprintTitles)) for (const t of obj.blueprintTitles) features.push(String(t));
        const nameText = [pn, obj?.partNumber, obj?.description, obj?.title, ...(obj?.blueprintTitles || [])].filter(Boolean).join(" ");
        const geometry: PartGeometryInput | undefined = obj?.geometry && typeof obj.geometry === "object" ? obj.geometry : undefined;
        const hasUsable = !!(geometry || features.length > 0 || /wafer|casing|insert|top.?hat|counterbore|cbore/i.test(nameText));
        if (!hasUsable) { noData++; continue; }
        withInfo++;
        const m = this.matchFamily({ geometry, features, nameText });
        if (m.family && m.confidence !== "none" && m.confidence !== "low") {
          matched++; byFamily[m.family]++;
          if (sample.length < sampleSize) sample.push({ partNumber: pn, customer: cust, family: m.family, confidence: m.confidence });
        } else {
          // Counted as "with info but no confident match" — not noData.
        }
      }
    }
    notes.push(`Matched only from part.json content. The phase18 part.json mostly lacks clean turning geometry → most folders are unmatchable here; the proper path is the full fan-out script (phase20) which re-reads the print OCR text.`);
    return { libraryRoot: root, scannedPartFolders, partFoldersWithUsableInfo: withInfo, matched, byFamily, sample, unmatchableForLackOfData: noData, notes };
  }
}

/** Sanitize a path segment for the folder fallback path (mirrors PartFolderOrganizerEngine's intent — illegal/control chars only, no uppercasing of the PN). */
function sanitizeSeg(s: string): string {
  let out = "";
  for (const ch of String(s)) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c === 127) continue;
    if ('<>:"/\\|?*'.includes(ch)) continue;
    out += ch;
  }
  out = out.trim().replace(/[. ]+$/g, "").slice(0, 120);
  return out || "_UNNAMED";
}

export const macroLibraryEngine = new MacroLibraryEngineImpl();
export { MacroLibraryEngineImpl as MacroLibraryEngine };
