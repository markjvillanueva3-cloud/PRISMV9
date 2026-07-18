#!/usr/bin/env node
/*
 * cad-completion-reconcile.mjs -- agent-FREE, re-runnable reconciliation of the CAD-COMPLETION
 * roadmap UNITS against git + disk reality (PA2, slot:delta 2026-06-26, U-DELTA-COMPLETION-ROADMAP).
 *
 * COMPLEMENTS (does NOT duplicate, R8) cad-gen-coverage-meter.mjs:
 *   - coverage-meter  -> measures generation OP-CATEGORY coverage % (capability breadth).
 *   - THIS            -> reconciles the named completion UNITS (shipped/pending) + the terminal
 *                        train+test+print-gen GATES (T1/T2/T3) against git(all branches) + disk.
 *
 * Deterministic (R5): git-grep + file-existence + rev-count. NO agents -> no rate limit, cron-safe.
 * Pure subprocess calls carry windowsHide:true (2026-06-23 console-window regression class).
 *
 * Usage:
 *   node scripts/cad-completion-reconcile.mjs            # reconcile -> console + JSON/MD
 *   node scripts/cad-completion-reconcile.mjs --json     # JSON to stdout only
 *   node scripts/cad-completion-reconcile.mjs --no-write # do not write the artifacts
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const ENGINES = path.join(ROOT, "mcp-server", "src", "engines");
const OUT_JSON = path.join(ROOT, "state", "shared", "specs", "CAD-COMPLETION-STATUS.json");
const OUT_MD = path.join(ROOT, "state", "shared", "specs", "CAD-COMPLETION-STATUS.md");
const TRUNK = "cad-fusion-live-ms0";
const SLOT_BRANCH = "slot/delta";
const GIT_TIMEOUT_MS = 30000;
const MAX_SCAN = 20000;

/*
 * Canonical CAD-completion unit table -- mirrors CAD-COMPLETION-ROADMAP-2026-06-26.md section 3.
 * detect.type: 'git' (commit on any branch) | 'engine' (engine file exists) |
 *              'merge' (slot/delta ahead of trunk) | 'artifact' (a probe file exists).
 * op:true => operator-gated (excluded from auto critical-path-next).
 */
export const UNITS = [
  // Phase A -- UNBLOCK
  { id: "U-MERGE-SLOT-DELTA", phase: "A", gate: null, op: true, title: "merge 410-commit slot/delta to trunk (operator-gated)", detect: { type: "merge" } },
  { id: "U-CAD-NURBS-STEP-EMIT", phase: "A", gate: null, title: "headless NURBS STEP emit (post-merge)", detect: { type: "git", grep: "U-CAD-NURBS-STEP-EMIT" } },
  // Phase B -- TRAIN + TEST (the named goal)
  { id: "U-CAD-LEARN-LOOP-CLOSE", phase: "B", gate: null, title: "fix-ledger -> retrain -> xproc_outcome_publish(india)", detect: { type: "git", grep: "U-CAD-LEARN-LOOP-CLOSE" } },
  // T1 stays EXISTENCE-based (binary .safetensors/adapter dir -- no JSON to content-gate). Its non-dry-run
  // genuineness contract belongs to the train-run driver (U-CAD-REAL-TRAIN-RUN, not yet built): that unit
  // should emit a run-manifest JSON ({dryRun:false, pairs>=646}) + add a `contentGate` probe here. Until
  // then T1 remains gameable by a stray adapter file -- documented, NOT silently closed (R12).
  { id: "U-CAD-REAL-TRAIN-RUN", phase: "B", gate: "T1", title: "real (non-dry-run) QLoRA adapter trained on >=646 pairs", detect: { type: "artifact", probes: [{ dir: "state/shared/lora/adapters", frag: "cad", ext: "" }, { dir: "state/shared/cad-ai-models", frag: "", ext: ".safetensors" }] } },
  { id: "U-CAD-VALIDATION-50-RUN", phase: "B", gate: "T2", title: "validation-50 run with recorded dim-pass-rate", detect: { type: "artifact", probes: [{ dir: "state/shared/specs", frag: "cad-train-test-result", ext: ".json", contentGate: { type: "genuine-run" } }, { dir: "state/shared/specs", frag: "cad-validation-50", ext: ".json", contentGate: { type: "genuine-run" } }] } },
  { id: "U-CAD-PRINTGEN-E2E", phase: "B", gate: "T3", title: "print to CAD to regen dim-by-dim >=95% on >=10 JM parts", detect: { type: "artifact", probes: [{ dir: "state/shared/specs", frag: "cad-printgen-e2e", ext: ".json", contentGate: { type: "genuine-run" } }] } },
  // Phase C -- CAPABILITY BREADTH (engine-existence)
  { id: "U-CAD-SKETCH-SUBTRACT", phase: "C", gate: null, title: "cut/pocket/groove (foundational)", detect: { type: "engine", file: "CADSubtractiveFeatureEngine.ts" } },
  // NOTE 2026-06-26 (slot:delta): boolean was closed by COMPOSING existing engines (CADBooleanEngine
  // = GeometryEngine.boolean estimate + BooleanKernelEngine real CSG), wired at cad_boolean
  // (cadDispatcher U-CAD-BOOLEAN-WIRE 03e270285f), NOT a net-new "CADBooleanFeatureEngine". The detector
  // pointed at that never-built filename -> false NEEDS_BUILDING. Point it at the real composer engine.
  { id: "U-CAD-BOOLEAN", phase: "C", gate: null, title: "boolean combine/intersect/subtract (foundational)", detect: { type: "engine", file: "CADBooleanEngine.ts" } },
  { id: "U-CAD-PATTERNS", phase: "C", gate: null, title: "linear/circular/mirror patterns", detect: { type: "engine", file: "CADPatternEngine.ts" } },
  { id: "U-CAD-REF-GEOM", phase: "C", gate: null, title: "datum planes/axes/coord-systems", detect: { type: "engine", file: "CADReferenceGeometryEngine.ts" } },
  { id: "U-CAD-DIE-DESIGN", phase: "C", gate: null, title: "strip/blank/draw/springback (JM-critical)", detect: { type: "engine", file: "CADDieDesignEngine.ts" } },
  { id: "U-CAD-SHEET-METAL", phase: "C", gate: null, title: "flange/bend/hem/flat-pattern", detect: { type: "engine", file: "CADSheetMetalEngine.ts" } },
  { id: "U-CAD-2D-DRAWING-GEN", phase: "C", gate: null, title: "model to orthographic 2D drawing (feeds T3)", detect: { type: "engine", file: "CAD2DDrawingEngine.ts" } },
  { id: "U-CAD-WELDMENTS", phase: "C", gate: null, title: "members/gusset/weld-bead/cut-list", detect: { type: "engine", file: "CADWeldmentEngine.ts" } },
  // Phase D -- THROUGHPUT
  { id: "U-CAD-OLLAMA-OFFLOAD", phase: "D", gate: null, title: "Ollama offload 9pct to 30pct (pre-warm + queue)", detect: { type: "git", grep: "U-CAD-OLLAMA-OFFLOAD" } },
  { id: "U-CAD-SCALE-COMPLEX", phase: "D", gate: null, title: "10-50 interdependent features/assemblies (final clear)", detect: { type: "git", grep: "U-CAD-SCALE-COMPLEX" } },
  // Part-A harness
  { id: "PA1-FANOUT-GATE-MAX", phase: "PA", gate: null, op: true, title: "raise fleet fanout-gate cap for parallel hermes bursts (operator/golf)", detect: { type: "git", grep: "FANOUT-GATE-MAX|FANOUT-GATE-CAP" } },
  { id: "PA2-CAD-RECON-CRON", phase: "PA", gate: null, title: "durable cron re-runs THIS reconciliation", detect: { type: "artifact", probes: [{ dir: "scripts", frag: "cad-completion-reconcile", ext: ".mjs" }] } },
  { id: "PA3-HERMES-CAD-BUILDER", phase: "PA", gate: null, title: "hermes/octopus CAD unit-builder harness (zebra)", detect: { type: "git", grep: "HERMES-CAD-BUILDER" } },
  { id: "PA4-VIZ-CAD-GRAPH-UPDATE", phase: "PA", gate: null, title: "feed CAD-completion state into system-viz graphs (sierra)", detect: { type: "git", grep: "VIZ-CAD-GRAPH" } },
];

// ---- bounded file finder -----------------------------------------------------------------------

/* Returns the absolute PATH of the first file under absDir (recursive, bounded) matching frag (filename
 * substring, case-insensitive) AND ext (suffix; "" = any), or null. Missing dir -> null (fail-soft).
 * Returns the path (not just a bool) so a content-aware gate can read the matched file. */
export function findMatch(absDir, frag, ext) {
  const wantFrag = (frag || "").toLowerCase();
  const wantExt = (ext || "").toLowerCase();
  const stack = [absDir];
  let scanned = 0;
  while (stack.length && scanned < MAX_SCAN) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      scanned++;
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && e.name !== ".git" && e.name !== "dist") stack.push(path.join(dir, e.name));
        continue;
      }
      const name = e.name.toLowerCase();
      if ((!wantFrag || name.includes(wantFrag)) && (!wantExt || name.endsWith(wantExt))) return path.join(dir, e.name);
    }
  }
  return null;
}

/* Back-compat boolean form (existence only). */
export function findFile(absDir, frag, ext) {
  return findMatch(absDir, frag, ext) !== null;
}

// ---- content-aware artifact gate (U-CAD-RECONCILE-CONTENT-AWARE, slot:delta 2026-06-28) ----------
// The prior artifactExists flipped a GATE (T1/T2/T3) PENDING->SHIPPED on mere file EXISTENCE -- any JSON
// (even {}) named cad-validation-50-*.json satisfied T2, so CAD-DRAW-MAX-MS1 was falsely "complete" off a
// 12-case STUB run. Fix: gate-bearing artifact probes carry a contentGate; the file must not just exist
// but PROVE the gate was genuinely met. See reference_cad_t2_gate_gameable_2026_06_27 +
// state/shared/specs/U-VALIDATION-50-LIVE-RUN-BUILD-SPEC.md (the honest-output JSON contract).

/**
 * Pure: is a parsed artifact a GENUINE gate-worthy run (vs a gameable stub/mock/empty {})? The content
 * contract is the U-VALIDATION-50-LIVE-RUN honest-output JSON: a gate is met ONLY by a LIVE-orchestrator,
 * FULL-corpus run whose RECORDED accuracy meets its RECORDED gate -- recomputed from the raw numbers (we do
 * NOT trust a self-declared `passedGate` boolean, which a gamed artifact could set true). Field shape per
 * spec: `orchestrator` (top-level), `corpus.isFull` (nested), `accuracy`+`gate` (top-level). Conservative:
 * any missing/wrong field -> false (the SAFE direction -- a gate under-claims, never over-claims).
 */
export function genuineGateArtifact(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  if (obj.orchestrator !== "live") return false;                 // stub/mock are MODELED, not a real seat measurement
  if (!obj.corpus || obj.corpus.isFull !== true) return false;   // ran a subset (e.g. 12 of 50) -> ALL-means-ALL
  const acc = typeof obj.accuracy === "number" ? obj.accuracy : NaN;
  const gate = typeof obj.gate === "number" ? obj.gate : NaN;
  if (!Number.isFinite(acc) || !Number.isFinite(gate)) return false;
  return acc >= gate;                                            // recompute the pass from raw numbers
}

/* Pure: is ONE probe satisfied? No contentGate -> mere existence (back-compat: PA2 cron, where the file
 * IS the deliverable). contentGate {type:"genuine-run"} -> the matched file must parse as JSON AND pass
 * genuineGateArtifact; read/parse failure -> NOT satisfied (the {}-named-stub bug now correctly -> PENDING).
 * findMatchImpl/readFileImpl are injectable for hermetic tests (R9). */
export function probeSatisfied(probe, { findMatchImpl = findMatch, readFileImpl = (p) => fs.readFileSync(p, "utf8") } = {}) {
  const match = findMatchImpl(path.join(ROOT, probe.dir), probe.frag, probe.ext);
  if (!match) return false;
  if (!probe.contentGate) return true; // existence-only (no gate declared)
  if (probe.contentGate.type === "genuine-run") {
    let obj = null;
    try { obj = JSON.parse(readFileImpl(match)); } catch { return false; }
    return genuineGateArtifact(obj);
  }
  return true; // unknown gate type -> never STRICTER than documented (fail-open to existence)
}

export function artifactSatisfied(probes, impls = {}) {
  return (probes || []).some((p) => probeSatisfied(p, impls));
}

// ---- pure detectors (injectable for hermetic tests, R9) ----------------------------------------

/**
 * Keep only `git log --format=%H<TAB>%s` lines whose SUBJECT (text after the tab) matches `pattern`,
 * i.e. a real deliverable commit (`[SCOPE]/U-ID: title`). A reconcile/status/roadmap commit lists every
 * unit id in its BODY ("next=U-...", "U-... PENDING") -> a plain `--grep` (which matches the whole
 * message) counted those mentions as deliverables -> false SHIPPED (e.g. U-CAD-NURBS-STEP-EMIT
 * self-matched the reconcile commit). Returns `<sha10> <subject>` lines (default-case reads token[0] as
 * the evidence sha). Pure + exported for R9 regression tests. (slot:delta 2026-06-26, 3-of-3 reviewer-B catch)
 * @param {string} rawLog - newline-joined `%H\t%s` lines from git
 * @param {string} pattern - the unit-id grep pattern (may be an ERE alternation, e.g. "A|B")
 * @returns {string} subject-matching `<sha10> <subject>` lines, trimmed
 */
export function filterSubjectMatches(rawLog, pattern) {
  let re = null;
  try { re = new RegExp(pattern); } catch { re = null; }
  const subjectHit = (subject) => (re ? re.test(subject) : subject.includes(pattern));
  return (rawLog || "")
    .split("\n").filter(Boolean)
    .filter((line) => subjectHit(line.split("\t")[1] || ""))
    .map((line) => { const [h, s] = line.split("\t"); return `${(h || "").slice(0, 10)} ${s || ""}`; })
    .join("\n").trim();
}

export function realDetectors() {
  const git = (args) => {
    try { return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8", windowsHide: true, timeout: GIT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"] }); }
    catch { return ""; }
  };
  return {
    // Require the unit id in the commit SUBJECT (not the body) -- see filterSubjectMatches. --grep is a
    // cheap body-level prefilter; the subject test is the load-bearing precision gate. (slot:delta 2026-06-26)
    gitGrep: (pattern) => filterSubjectMatches(git(["log", "--all", "-E", "--grep", pattern, "--format=%H%x09%s"]), pattern),
    engineExists: (file) => fs.existsSync(path.join(ENGINES, file)),
    aheadCount: () => {
      const out = git(["rev-list", "--count", `${TRUNK}..${SLOT_BRANCH}`]).trim();
      const n = Number.parseInt(out, 10);
      return Number.isFinite(n) ? n : 0;
    },
    artifactExists: (probes) => artifactSatisfied(probes), // content-aware: gate-bearing probes carry a contentGate
  };
}

// ---- reconciliation ----------------------------------------------------------------------------

export function classifyUnit(unit, det) {
  const d = unit.detect;
  switch (d.type) {
    case "merge": {
      const ahead = det.aheadCount();
      return ahead > 0
        ? { state: "PENDING", evidence: `slot/delta ${ahead} commits ahead of trunk` }
        : { state: "SHIPPED", evidence: "merged (0 commits ahead)" };
    }
    case "engine":
      return det.engineExists(d.file)
        ? { state: "SHIPPED", evidence: `engine ${d.file} on disk` }
        : { state: "PENDING", evidence: `engine ${d.file} NEEDS_BUILDING` };
    case "artifact":
      return det.artifactExists(d.probes)
        ? { state: "SHIPPED", evidence: `artifact present (${d.probes[0].dir})` }
        : { state: "PENDING", evidence: `no artifact in ${d.probes.map((p) => p.dir).join(" | ")}` };
    default: {
      const log = (det.gitGrep(d.grep) || "").trim();
      const sha = log ? log.split("\n")[0].trim().split(/\s+/)[0] : null;
      return sha ? { state: "SHIPPED", evidence: `commit ${sha}` } : { state: "PENDING", evidence: `no commit matching /${d.grep}/` };
    }
  }
}

export function reconcile(units, det) {
  const results = units.map((u) => ({ ...u, ...classifyUnit(u, det) }));
  const shipped = results.filter((r) => r.state === "SHIPPED").length;
  const gates = { T1: null, T2: null, T3: null };
  for (const r of results) if (r.gate) gates[r.gate] = r.state;
  const next = results.find((r) => !r.op && r.state === "PENDING" && (r.phase === "A" || r.phase === "B"));
  const terminalDone = gates.T1 === "SHIPPED" && gates.T2 === "SHIPPED" && gates.T3 === "SHIPPED";
  return { results, shipped, total: results.length, gates, criticalNext: next ? next.id : null, terminalDone };
}

export function renderMarkdown(rec, stamp) {
  const mark = (s) => (s === "SHIPPED" ? "[x]" : s === "PENDING" ? "[ ]" : "-");
  const gate = (s) => (s === "SHIPPED" ? "PASS" : s === "PENDING" ? "PEND" : "-");
  const lines = [];
  lines.push("<!-- AUTO-GENERATED by scripts/cad-completion-reconcile.mjs -- do not hand-edit; re-run to refresh. -->");
  lines.push("# CAD-COMPLETION-STATUS -- git+disk reconciliation");
  lines.push(`\n_Generated ${stamp}. Companion: CAD-COMPLETION-ROADMAP-2026-06-26.md (the plan) + CAD-GEN-COVERAGE-METER.md (op-pct)._\n`);
  lines.push(`**Units shipped: ${rec.shipped}/${rec.total}**  |  **Terminal gates** -- T1(train) ${gate(rec.gates.T1)} / T2(val-50) ${gate(rec.gates.T2)} / T3(print-gen) ${gate(rec.gates.T3)}  |  **Terminal milestone: ${rec.terminalDone ? "DONE" : "OPEN"}**`);
  lines.push(`\n**Critical-path next PENDING unit:** \`${rec.criticalNext || "(none -- only operator-gated / done remain)"}\`\n`);
  lines.push("| state | unit | phase | gate | evidence |");
  lines.push("|---|---|---|---|---|");
  for (const r of rec.results) lines.push(`| ${mark(r.state)} ${r.state} | \`${r.id}\` | ${r.phase} | ${r.gate || "-"} | ${r.evidence} |`);
  lines.push("\n_op-gated PENDING units (U-MERGE-SLOT-DELTA, PA1) are OPERATOR-GATED -- not auto-buildable; critical-path-next excludes them._");
  return lines.join("\n") + "\n";
}

// ---- main --------------------------------------------------------------------------------------

function isMain() {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}

if (isMain()) {
  const args = new Set(process.argv.slice(2));
  const stamp = new Date().toISOString();
  const rec = reconcile(UNITS, realDetectors());
  if (args.has("--json")) {
    process.stdout.write(JSON.stringify({ generated: stamp, ...rec }, null, 2) + "\n");
  } else {
    if (!args.has("--no-write")) {
      fs.writeFileSync(OUT_JSON, JSON.stringify({ generated: stamp, ...rec }, null, 2));
      fs.writeFileSync(OUT_MD, renderMarkdown(rec, stamp));
    }
    process.stdout.write(`CAD-COMPLETION-RECONCILE: ${rec.shipped}/${rec.total} units shipped | T1 ${rec.gates.T1} / T2 ${rec.gates.T2} / T3 ${rec.gates.T3} | next=${rec.criticalNext}\n`);
    if (!args.has("--no-write")) process.stdout.write(`wrote ${path.relative(ROOT, OUT_JSON)} + .md\n`);
  }
}
