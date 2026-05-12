/**
 * MacroLibraryEngine — tests.
 * Covers: catalog parse (real macro dir + a missing dir), matchFamily (happy ×4 + negatives ×3 + adversarial ×2),
 * placeMacroTemplate (happy + idempotent + 5 failure modes + hadExistingProgram side-by-side), fanoutDryRun,
 * + a real round-trip through the prism_cad dispatcher handler for all 4 macro_* actions.
 *
 * These verify INTENT: a macro is catalogued only if its file parses; a part is matched to a macro family only
 * when the geometry/features/name actually fit (and never when a hard requirement — ID bore, counterbore, flange —
 * is missing); a template is *placed* with a DO-NOT-RUN header and never overwrites a real program; the
 * dispatcher routes macro_* params (snake_case) into the engine and returns its result.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  macroLibraryEngine, macroDir, partLibraryRoot,
  type MacroMatchInput,
} from "../engines/MacroLibraryEngine.js";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import { ACTION_CAD_SCHEMAS } from "../schemas/cadActionSchemas.js";

// ── helpers ────────────────────────────────────────────────────────────────
function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function mkPartFolder(libraryRoot: string, customer: string, pn: string, partJson?: Record<string, unknown>): string {
  const folder = path.join(libraryRoot, customer, pn);
  fs.mkdirSync(path.join(folder, "CNC PROGRAM"), { recursive: true });
  fs.mkdirSync(path.join(folder, "CAD-CAM"), { recursive: true });
  fs.writeFileSync(path.join(folder, "part.json"), JSON.stringify(partJson ?? { partNumber: pn, customer }, null, 2), "utf8");
  return folder;
}
/** Capture the prism_cad dispatcher handler so we can invoke actions through it. registerCadDispatcher
 *  calls server.tool(name, description, schema, handler) — capture the last function argument. */
function captureCadHandler(): (call: { action: string; params?: Record<string, any> }) => Promise<{ content: Array<{ type: string; text: string }> }> {
  let fn: any = null;
  registerCadDispatcher({ tool: (...args: any[]) => { for (const a of args) if (typeof a === "function") fn = a; } } as any);
  if (typeof fn !== "function") throw new Error("registerCadDispatcher did not register a handler");
  return fn;
}

/** Same as captureCadHandler but for prism_turning — proves the dual-dispatcher wiring
 *  (CLAUDE.md §ENGINE WIRING) is genuine: the engine, schemas, and case bodies are wired
 *  in BOTH dispatchers, not just one. If turningActionSchemas can't import the 4 macro
 *  schemas from cadActionSchemas, this helper will throw at module-load time. */
function captureTurningHandler(): (call: { action: string; params?: Record<string, any> }) => Promise<{ content: Array<{ type: string; text: string }> }> {
  let fn: any = null;
  registerTurningDispatcher({ tool: (...args: any[]) => { for (const a of args) if (typeof a === "function") fn = a; } } as any);
  if (typeof fn !== "function") throw new Error("registerTurningDispatcher did not register a handler");
  return fn;
}
async function dispatch(handler: any, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text;
  if (typeof text === "string") { try { return JSON.parse(text); } catch { return { _raw: text }; } }
  return r; // some error paths return an object directly
}
function hasOwn(obj: any, key: string): boolean { return Object.prototype.hasOwnProperty.call(obj, key); }

const REAL_MACRO_DIR = macroDir();
const REAL_MACROS_PRESENT = (() => {
  try { return fs.existsSync(path.join(REAL_MACRO_DIR, "BASE WAFER INSERT MACRO.min")); } catch { return false; }
})();

// ── 1. listMacros ──────────────────────────────────────────────────────────
describe("MacroLibraryEngine.listMacros", () => {
  it("returns the 4-family catalog, all Okuma-OSP, with substantive descriptions", () => {
    const { macros } = macroLibraryEngine.listMacros();
    expect(macros.map((m) => m.family).sort()).toEqual(["casing", "casing-counterbore", "top-hat-casing", "wafer-insert"]);
    expect(macros.every((m) => m.controller === "okuma_osp")).toBe(true);
    expect(macros.every((m) => /\.(min|MIN)$/.test(m.file))).toBe(true);
    expect(macros.every((m) => m.description.length > 10)).toBe(true);
  });

  it("parses each macro into a non-empty VCxxx variable map when the source files are present", () => {
    if (!REAL_MACROS_PRESENT) return; // skip gracefully when the JM macro dir isn't on this machine
    const { macros, dir } = macroLibraryEngine.listMacros();
    expect(dir).toBe(REAL_MACRO_DIR);
    const wafer = macros.find((m) => m.family === "wafer-insert")!;
    expect(wafer.available).toBe(true);
    expect(wafer.ast?.variableCount ?? 0).toBeGreaterThan(5);
    expect(wafer.ast?.programNumber ?? "").toMatch(/1001/); // O1001
    expect(Object.keys(wafer.ast?.variables ?? {}).some((v) => /^VC1\d\d$/.test(v))).toBe(true);
    expect(wafer.ast?.toolCount ?? 0).toBeGreaterThan(0);
    expect(wafer.ast?.lineCount ?? 0).toBeGreaterThan(50);
    for (const fam of ["casing", "casing-counterbore", "top-hat-casing"] as const) {
      const m = macros.find((x) => x.family === fam)!;
      expect(m.available).toBe(true);
      expect(m.ast?.variableCount ?? 0).toBeGreaterThan(0);
    }
  });

  it("reports available:false (not throw) for a macro dir with no files", () => {
    const empty = mkTmp("macrolib-empty-");
    try {
      const { macros } = macroLibraryEngine.listMacros({ dir: empty });
      expect(macros).toHaveLength(4);
      expect(macros.every((m) => m.available === false && /not found/i.test(m.error ?? "") && m.ast === undefined)).toBe(true);
    } finally { fs.rmSync(empty, { recursive: true, force: true }); }
  });

  it("getMacro returns one family's summary", () => {
    expect(macroLibraryEngine.getMacro("casing")?.family).toBe("casing");
    expect(macroLibraryEngine.getMacro("top-hat-casing")?.programNumber).toBeNull();
  });
});

// ── 2. matchFamily ─────────────────────────────────────────────────────────
describe("MacroLibraryEngine.matchFamily — happy paths", () => {
  it("wafer-insert: thin disc with an ID bore + taper + 'wafer' in the name", () => {
    const r = macroLibraryEngine.matchFamily({
      geometry: { length_mm: 5, max_od_mm: 33, bore_id_mm: 6, features: ["thru drill", "id taper"] },
      nameText: "WAFER INSERT 33MM",
    });
    expect(r.family).toBe("wafer-insert");
    expect(r.confidence === "high" || r.confidence === "medium").toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(35);
  });

  it("casing: a small bored shell named 'casing', no counterbore", () => {
    const r = macroLibraryEngine.matchFamily({
      geometry: { length_mm: 25, max_od_mm: 30, bore_id_mm: 18, features: ["face", "od turn", "cutoff"] },
      nameText: "BASIC CASING",
    });
    expect(r.family).toBe("casing");
  });

  it("casing-counterbore: a bored shell with an explicit counterbore", () => {
    const r = macroLibraryEngine.matchFamily({
      geometry: { length_mm: 25, max_od_mm: 30, bore_id_mm: 18 },
      nameText: "CASING WITH COUNTERBORE", counterborePresent: true,
    });
    expect(r.family).toBe("casing-counterbore");
  });

  it("top-hat-casing: a flanged/brimmed bored part with a counterbore", () => {
    const r = macroLibraryEngine.matchFamily({
      geometry: { length_mm: 20, max_od_mm: 40, bore_id_mm: 22 },
      nameText: "TOP HAT CASING WITH SINGLE COUNTERBORE",
      flangeStepPresent: true, counterborePresent: true,
    });
    expect(r.family).toBe("top-hat-casing");
  });
});

describe("MacroLibraryEngine.matchFamily — negatives & adversarial", () => {
  it("family:null / confidence:'none' for a solid shaft (no ID bore — every macro requires one)", () => {
    const r = macroLibraryEngine.matchFamily({ geometry: { length_mm: 120, max_od_mm: 20, features: ["thread", "groove"] }, nameText: "SHAFT 4140" });
    expect(r.family).toBeNull();
    expect(r.confidence).toBe("none");
    expect(r.reasons.join(" ")).toMatch(/no macro family is a candidate|ID bore/i);
  });

  it("family:null for a non-turning blob with no usable features", () => {
    const r = macroLibraryEngine.matchFamily({ nameText: "BRACKET PLATE WELDMENT" });
    expect(r.family).toBeNull();
    expect(r.confidence).toBe("none");
  });

  it("does NOT silently guess — a definite pick must beat the runner-up; an unbroken top-tie returns null with a tie reason", () => {
    const r = macroLibraryEngine.matchFamily({ nameText: "WAFER CASING", features: ["bore"] });
    expect(r.reasons.length).toBeGreaterThan(0);
    if (r.family === null) {
      expect(r.confidence).toBe("none");
      expect(r.reasons.join(" ")).toMatch(/tie|no macro family/i);
    } else {
      expect(r.alternatives.every((a) => a.score < r.score)).toBe(true);
    }
  });

  it("adversarial: flange + counterbore + 'top hat' → top-hat-casing (highest), with casing-counterbore among the alternatives", () => {
    const r = macroLibraryEngine.matchFamily({
      geometry: { length_mm: 18, max_od_mm: 44, bore_id_mm: 24 },
      nameText: "TOP HAT CASING COUNTERBORE", flangeStepPresent: true, counterborePresent: true,
    });
    expect(r.family).toBe("top-hat-casing");
    expect([...r.alternatives.map((a) => a.family), r.family]).toContain("casing-counterbore");
  });

  it("adversarial: counterbore present nudges away from plain 'casing' toward the counterbore variant", () => {
    const r = macroLibraryEngine.matchFamily({
      geometry: { length_mm: 25, max_od_mm: 30, bore_id_mm: 18 }, nameText: "CASING", counterborePresent: true,
    });
    expect(r.family).toBe("casing-counterbore");
  });
});

// ── 3. placeMacroTemplate ──────────────────────────────────────────────────
describe("MacroLibraryEngine.placeMacroTemplate", () => {
  let lib: string;
  beforeAll(() => { lib = mkTmp("macrolib-place-"); });
  afterAll(() => { fs.rmSync(lib, { recursive: true, force: true }); });

  it("places a labelled TEMPLATE into <part>/CNC PROGRAM/ and tags part.json (when the macro source exists)", () => {
    mkPartFolder(lib, "ACME", "60106");
    const r = macroLibraryEngine.placeMacroTemplate({ partNumber: "60106", customer: "ACME", family: "wafer-insert", libraryRoot: lib });
    if (!REAL_MACROS_PRESENT) {
      expect(r.placed).toBe(false);
      expect(r.reason).toMatch(/macro source file not found/i);
      return;
    }
    expect(r.placed).toBe(true);
    expect(r.family).toBe("wafer-insert");
    const txt = fs.readFileSync(r.templatePath!, "utf8");
    expect(txt).toMatch(/MACRO TEMPLATE — DO NOT RUN AS-IS/);
    expect(txt).toMatch(/fill the VCxxx variables/i);
    expect(txt).toMatch(/S\(x\) >= 0\.70/);
    expect(txt).toMatch(/O1001/); // wafer macro body appended after the header
    expect(path.basename(r.templatePath!)).toBe("_MACRO-TEMPLATE_BASE WAFER INSERT MACRO.min");
    const pj = JSON.parse(fs.readFileSync(path.join(lib, "ACME", "60106", "part.json"), "utf8"));
    expect(pj.macroFamily).toBe("wafer-insert");
    expect(pj.macroNeedsFill).toBe(true);
    expect(pj.macroTemplateSource).toBe("BASE WAFER INSERT MACRO.min");
  });

  it("is idempotent — placing the same template twice leaves the 2nd call 'unchanged'", () => {
    if (!REAL_MACROS_PRESENT) return;
    mkPartFolder(lib, "ACME", "60107");
    expect(macroLibraryEngine.placeMacroTemplate({ partNumber: "60107", customer: "ACME", family: "casing", libraryRoot: lib }).placed).toBe(true);
    const r2 = macroLibraryEngine.placeMacroTemplate({ partNumber: "60107", customer: "ACME", family: "casing", libraryRoot: lib });
    expect(r2.placed).toBe(true);
    expect(r2.reason).toMatch(/unchanged/i);
  });

  it("places the template ALONGSIDE an existing real program (never overwrites it)", () => {
    if (!REAL_MACROS_PRESENT) return;
    const folder = mkPartFolder(lib, "ACME", "532-23310");
    const realProg = path.join(folder, "CNC PROGRAM", "532-23310.min");
    fs.writeFileSync(realProg, "$REAL PROGRAM%\nG0 X0\nM30\n", "utf8");
    const before = fs.readFileSync(realProg, "utf8");
    const r = macroLibraryEngine.placeMacroTemplate({ partNumber: "532-23310", customer: "ACME", family: "casing-counterbore", libraryRoot: lib });
    expect(r.placed).toBe(true);
    expect(r.hadExistingProgram).toBe(true);
    expect(r.existingPrograms).toContain("532-23310.min");
    expect(fs.readFileSync(realProg, "utf8")).toBe(before);
    expect(fs.existsSync(path.join(folder, "CNC PROGRAM", "_MACRO-TEMPLATE_BASIC CASING WITH SINGLE COUNTERBORE.min"))).toBe(true);
  });

  it("resolves the family from `match` when `family` is omitted", () => {
    mkPartFolder(lib, "ACME", "WFR-200", { partNumber: "WFR-200", customer: "ACME", features: ["thru drill", "id taper"] });
    const r = macroLibraryEngine.placeMacroTemplate({
      partNumber: "WFR-200", customer: "ACME", libraryRoot: lib,
      match: { geometry: { length_mm: 4, max_od_mm: 30, bore_id_mm: 5 }, nameText: "WAFER INSERT" } as MacroMatchInput,
    });
    expect(r.family).toBe("wafer-insert");
    expect(r.placed).toBe(REAL_MACROS_PRESENT);
  });

  it("dry-run does everything except write (no template file, part.json not tagged)", () => {
    mkPartFolder(lib, "ACME", "DRY-1");
    const r = macroLibraryEngine.placeMacroTemplate({ partNumber: "DRY-1", customer: "ACME", family: "casing", libraryRoot: lib, dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.placed).toBe(false);
    expect(fs.existsSync(path.join(lib, "ACME", "DRY-1", "CNC PROGRAM", "_MACRO-TEMPLATE_BASIC-CASING.MIN"))).toBe(false);
    expect(hasOwn(JSON.parse(fs.readFileSync(path.join(lib, "ACME", "DRY-1", "part.json"), "utf8")), "macroFamily")).toBe(false);
  });

  // failure modes
  it("throws when neither family nor match is supplied", () => {
    expect(() => macroLibraryEngine.placeMacroTemplate({ partNumber: "X", libraryRoot: lib } as any)).toThrow(/family.*or.*match/i);
  });
  it("throws on an empty part number", () => {
    expect(() => macroLibraryEngine.placeMacroTemplate({ partNumber: "  ", family: "casing", libraryRoot: lib })).toThrow(/partNumber/i);
  });
  it("returns placed:false (not throw) when the part folder does not exist", () => {
    const r = macroLibraryEngine.placeMacroTemplate({ partNumber: "GHOST", customer: "NOBODY", family: "casing", libraryRoot: lib });
    expect(r.placed).toBe(false);
    expect(r.reason).toMatch(/part folder does not exist/i);
  });
  it("returns placed:false when no confident family can be matched", () => {
    mkPartFolder(lib, "ACME", "AMBIG-1");
    const r = macroLibraryEngine.placeMacroTemplate({ partNumber: "AMBIG-1", customer: "ACME", libraryRoot: lib, match: { nameText: "MYSTERY PART" } });
    expect(r.placed).toBe(false);
    expect(r.reason).toMatch(/no confident macro-family match/i);
  });
  it("returns placed:false when the macro source file is missing", () => {
    mkPartFolder(lib, "ACME", "NOSRC-1");
    const empty = mkTmp("macrolib-nosrc-");
    try {
      const r = macroLibraryEngine.placeMacroTemplate({ partNumber: "NOSRC-1", customer: "ACME", family: "casing", libraryRoot: lib, macroSourceDir: empty });
      expect(r.placed).toBe(false);
      expect(r.reason).toMatch(/macro source file not found/i);
    } finally { fs.rmSync(empty, { recursive: true, force: true }); }
  });
});

// ── 4. fanoutDryRun ────────────────────────────────────────────────────────
describe("MacroLibraryEngine.fanoutDryRun", () => {
  it("scans a small library, matches what it can, and is honest about the part.json data gap", () => {
    const lib = mkTmp("macrolib-fanout-");
    try {
      mkPartFolder(lib, "ACME", "W1", { partNumber: "W1", customer: "ACME", features: ["wafer", "insert", "thru drill"], blueprintTitles: ["WAFER INSERT"] });
      mkPartFolder(lib, "ACME", "C1", { partNumber: "C1", customer: "ACME", description: "CASING WITH COUNTERBORE", features: ["bore", "counterbore"] });
      mkPartFolder(lib, "ACME", "Z1", { partNumber: "Z1", customer: "ACME" }); // nothing useful
      const r = macroLibraryEngine.fanoutDryRun({ libraryRoot: lib });
      expect(r.libraryRoot).toBe(lib);
      expect(r.scannedPartFolders).toBe(3);
      expect(r.matched).toBeGreaterThanOrEqual(1);
      expect(r.byFamily["wafer-insert"] + r.byFamily["casing"] + r.byFamily["casing-counterbore"] + r.byFamily["top-hat-casing"]).toBe(r.matched);
      expect(r.unmatchableForLackOfData).toBeGreaterThanOrEqual(1);
      expect(r.notes.join(" ")).toMatch(/part\.json|re-read/i);
      expect(r.sample.every((s) => typeof s.partNumber === "string" && typeof s.family === "string" && typeof s.confidence === "string")).toBe(true);
    } finally { fs.rmSync(lib, { recursive: true, force: true }); }
  });

  it("returns empty (with a note) when the library root doesn't exist", () => {
    const r = macroLibraryEngine.fanoutDryRun({ libraryRoot: path.join(os.tmpdir(), "no-such-library-" + Date.now()) });
    expect(r.scannedPartFolders).toBe(0);
    expect(r.matched).toBe(0);
    expect(r.notes.join(" ")).toMatch(/not found|empty/i);
  });
});

// ── 5. prism_cad dispatcher round-trip ─────────────────────────────────────
describe("prism_cad dispatcher — macro_* round-trip", () => {
  it("the 4 macro schemas validate good input and reject bad input", () => {
    expect(ACTION_CAD_SCHEMAS["macro_library_list"].parse({})).toEqual({});
    expect(ACTION_CAD_SCHEMAS["macro_match_family"].parse({ name_text: "WAFER INSERT", features: ["bore"] })).toMatchObject({ name_text: "WAFER INSERT" });
    expect(ACTION_CAD_SCHEMAS["macro_place_template"].parse({ part_number: "60106", customer: "ACME", family: "wafer-insert" })).toMatchObject({ part_number: "60106", family: "wafer-insert" });
    expect(ACTION_CAD_SCHEMAS["macro_fanout_dry_run"].parse({ limit: 10 })).toMatchObject({ limit: 10 });
    expect(() => ACTION_CAD_SCHEMAS["macro_place_template"].parse({ part_number: "x", family: "not-a-family" })).toThrow();
    expect(() => ACTION_CAD_SCHEMAS["macro_place_template"].parse({ family: "casing" })).toThrow(); // part_number required
    expect(() => ACTION_CAD_SCHEMAS["macro_fanout_dry_run"].parse({ limit: 0 })).toThrow(); // min 1
  });

  it("macro_library_list routes through the dispatcher to the engine", async () => {
    const out = await dispatch(captureCadHandler(), "macro_library_list", {});
    expect(out.success).toBe(true);
    expect(out.data.macros.map((m: any) => m.family).sort()).toEqual(["casing", "casing-counterbore", "top-hat-casing", "wafer-insert"]);
  });

  it("macro_match_family routes through the dispatcher (snake_case params normalized)", async () => {
    const out = await dispatch(captureCadHandler(), "macro_match_family", { name_text: "WAFER INSERT", geometry: { length_mm: 4, max_od_mm: 30, bore_id_mm: 5 }, id_taper_present: true });
    expect(out.success).toBe(true);
    expect(out.data.family).toBe("wafer-insert");
  });

  it("macro_place_template routes through the dispatcher and rejects a missing part_number", async () => {
    const handler = captureCadHandler();
    const errOut = await dispatch(handler, "macro_place_template", { family: "casing" });
    expect(JSON.stringify(errOut)).toMatch(/part_number/i);
    const lib = mkTmp("macrolib-disp-");
    try {
      mkPartFolder(lib, "ACME", "60200");
      const out = await dispatch(handler, "macro_place_template", { part_number: "60200", customer: "ACME", family: "casing", library_root: lib, dry_run: true });
      expect(out.success).toBe(true);
      expect(out.data.dryRun).toBe(true);
      expect(out.data.family).toBe("casing");
    } finally { fs.rmSync(lib, { recursive: true, force: true }); }
  });

  it("macro_fanout_dry_run routes through the dispatcher", async () => {
    const lib = mkTmp("macrolib-disp-fan-");
    try {
      mkPartFolder(lib, "ACME", "W2", { partNumber: "W2", customer: "ACME", features: ["wafer", "insert"] });
      const out = await dispatch(captureCadHandler(), "macro_fanout_dry_run", { library_root: lib });
      expect(out.success).toBe(true);
      expect(out.data.scannedPartFolders).toBe(1);
    } finally { fs.rmSync(lib, { recursive: true, force: true }); }
  });
});

// ── 6. prism_turning dispatcher round-trip (dual-wiring proof — Reviewer B BLOCKER 2) ──
// CLAUDE.md §ENGINE WIRING: "Wire to ALL dispatchers that would naturally consume it … test
// acceptance criterion: round-trip E2E assertion through every wired dispatcher (not only
// the singleton)." Macros are turning-domain content so prism_turning must round-trip too.
// If turningActionSchemas can't import the 4 schemas from cadActionSchemas, every test in
// this block fails at module-load time.
describe("prism_turning dispatcher — macro_* round-trip (dual-wiring proof)", () => {
  it("the 4 macro schemas are present in TURNING_ACTION_SCHEMAS and accept/reject the same inputs as prism_cad", () => {
    expect(TURNING_ACTION_SCHEMAS["macro_library_list"].parse({})).toEqual({});
    expect(TURNING_ACTION_SCHEMAS["macro_match_family"].parse({ name_text: "WAFER INSERT", features: ["bore"] })).toMatchObject({ name_text: "WAFER INSERT" });
    expect(TURNING_ACTION_SCHEMAS["macro_place_template"].parse({ part_number: "60106", family: "wafer-insert" })).toMatchObject({ part_number: "60106", family: "wafer-insert" });
    expect(TURNING_ACTION_SCHEMAS["macro_fanout_dry_run"].parse({ limit: 10 })).toMatchObject({ limit: 10 });
    expect(() => TURNING_ACTION_SCHEMAS["macro_place_template"].parse({ family: "casing" })).toThrow(); // part_number required
    expect(() => TURNING_ACTION_SCHEMAS["macro_place_template"].parse({ part_number: "x", family: "not-a-family" })).toThrow();
    expect(() => TURNING_ACTION_SCHEMAS["macro_fanout_dry_run"].parse({ limit: 0 })).toThrow(); // min 1
  });

  it("macro_library_list routes through prism_turning to the same engine — proves the lazy import resolves", async () => {
    const out = await dispatch(captureTurningHandler(), "macro_library_list", {});
    expect(out.success).toBe(true);
    expect(out.data.macros.map((m: any) => m.family).sort()).toEqual(["casing", "casing-counterbore", "top-hat-casing", "wafer-insert"]);
  });

  it("macro_match_family routes through prism_turning with the same priority cascade as prism_cad", async () => {
    const out = await dispatch(captureTurningHandler(), "macro_match_family", { name_text: "WAFER INSERT", geometry: { length_mm: 4, max_od_mm: 30, bore_id_mm: 5 }, id_taper_present: true });
    expect(out.success).toBe(true);
    expect(out.data.family).toBe("wafer-insert");
    // counterbore-priority parity: flange+counterbore must yield top-hat-casing in BOTH dispatchers
    const cb = await dispatch(captureTurningHandler(), "macro_match_family", { name_text: "TOP HAT CASING WITH SINGLE COUNTERBORE", counterbore_present: true, flange_step_present: true });
    expect(cb.data.family).toBe("top-hat-casing");
  });

  it("macro_place_template routes through prism_turning, rejects missing part_number, succeeds on dry_run", async () => {
    const handler = captureTurningHandler();
    const errOut = await dispatch(handler, "macro_place_template", { family: "casing" });
    expect(JSON.stringify(errOut)).toMatch(/part_number/i);
    // Parity check — the dispatcherError namespace string must be prism_turning, not prism_cad
    // (catches a copy-paste bug where the turning case body forgot to update the namespace).
    expect(JSON.stringify(errOut)).toMatch(/prism_turning/);
    const lib = mkTmp("macrolib-disp-turning-");
    try {
      mkPartFolder(lib, "ACME", "60200");
      const out = await dispatch(handler, "macro_place_template", { part_number: "60200", customer: "ACME", family: "casing", library_root: lib, dry_run: true });
      expect(out.success).toBe(true);
      expect(out.data.dryRun).toBe(true);
      expect(out.data.family).toBe("casing");
    } finally { fs.rmSync(lib, { recursive: true, force: true }); }
  });

  it("macro_fanout_dry_run routes through prism_turning identically to prism_cad", async () => {
    const lib = mkTmp("macrolib-disp-turning-fan-");
    try {
      mkPartFolder(lib, "ACME", "W2", { partNumber: "W2", customer: "ACME", features: ["wafer", "insert"] });
      const out = await dispatch(captureTurningHandler(), "macro_fanout_dry_run", { library_root: lib });
      expect(out.success).toBe(true);
      expect(out.data.scannedPartFolders).toBe(1);
    } finally { fs.rmSync(lib, { recursive: true, force: true }); }
  });
});

describe("MacroLibraryEngine path helpers", () => {
  it("macroDir() and partLibraryRoot() return non-empty absolute-ish paths", () => {
    expect(macroDir().length).toBeGreaterThan(3);
    expect(partLibraryRoot().length).toBeGreaterThan(3);
  });
});
