#!/usr/bin/env node
/**
 * produce-automation-gap-map.mjs — ACP-MS0 / P0-U05
 *
 * Synthesizes a gap map of PRISM's automation surface: slash commands ↔ hooks ↔ scripts ↔ dispatchers.
 * Identifies missing links, unconnected fragments, and chains that need wiring.
 *
 * Inputs (consumed; produced by other ACP-MS0 units when shipped):
 *   - state/shared/slash-commands-inventory.json   (P0-U01 — shipped 2026-05-13 commit d5f52e34d)
 *   - state/shared/HOOK_REGISTRY.json              (preexisting — H1 hook-registry-reader)
 *   - state/shared/ENGINE_WIRING_INDEX.json        (preexisting — build-engine-index.mjs)
 *   - .claude/settings.json                         (canonical hook wiring)
 *   - scripts/*.mjs                                 (raw filesystem scan — P0-U03 not yet shipped)
 *   - .claude/hooks/*.mjs                           (raw filesystem scan — P0-U02 not yet shipped)
 *
 * Outputs:
 *   - state/shared/AUTOMATION_GAP_MAP.md           (operator-readable)
 *   - state/shared/automation-gap-map.json         (schemaVersion 1, machine-readable)
 *
 * Gap classes surfaced:
 *   1. UNTRIGGERED_SKILLS — skills with `triggers:` frontmatter that no hook reads from
 *   2. HOOKS_NOT_WIRED — hooks in .claude/hooks/ that aren't referenced in settings.json
 *   3. SCRIPTS_NOT_INVOKED — scripts in scripts/ that no hook/skill/CI/cron calls
 *   4. SKILLS_WITHOUT_HOOKS — skills referenced by no hook (manual-invoke-only)
 *   5. ENGINES_UNWIRED — engines without dispatcher (carried over from ENGINE_WIRING_INDEX)
 *   6. DISPATCHERS_NO_HOOK_GATE — dispatchers with no PreToolUse hook protecting them
 *   7. BROKEN_CHAINS — multi-step automation where one step has no successor
 *   8. ORPHAN_AUTO_GEN — auto-generated files (state/shared/*.json) with no producer script
 *
 * Self-tests at bottom. Run with: node scripts/produce-automation-gap-map.mjs --self-test
 *
 * Flags:
 *   --dry-run        print summary to stderr, don't write outputs
 *   --verbose        per-gap-class detail to stderr
 *   --output-md=<p>  override markdown path
 *   --output-json=<p> override json path
 *   --self-test      run inline tests + exit
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, renameSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const PRISM_ROOT = "H:/prism";
const SLASH_INVENTORY = join(PRISM_ROOT, "state/shared/slash-commands-inventory.json");
const HOOK_REGISTRY   = join(PRISM_ROOT, "state/shared/HOOK_REGISTRY.json");
const ENGINE_WIRING   = join(PRISM_ROOT, "state/shared/ENGINE_WIRING_INDEX.json");
const SETTINGS_JSON   = join(PRISM_ROOT, "../.claude/settings.json"); // H:/.claude/settings.json
const SETTINGS_JSON_ALT = "H:/.claude/settings.json";
const HOOKS_DIR       = join(PRISM_ROOT, ".claude/hooks");
const SCRIPTS_DIR     = join(PRISM_ROOT, "scripts");
const COMMANDS_DIR    = join(PRISM_ROOT, ".claude/commands");
const OUT_MD          = join(PRISM_ROOT, "state/shared/AUTOMATION_GAP_MAP.md");
const OUT_JSON        = join(PRISM_ROOT, "state/shared/automation-gap-map.json");

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for tests)
// ────────────────────────────────────────────────────────────────────────────

export function readJsonSafe(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

export function readTextSafe(path) {
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

export function listFilesByExt(dir, ext) {
  if (!existsSync(dir)) return [];
  try { return readdirSync(dir).filter(f => f.endsWith(ext)).sort(); } catch { return []; }
}

export function atomicWrite(path, content) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/** Extract referenced hook .mjs basenames from a settings.json blob. */
export function extractWiredHookBasenames(settingsText) {
  if (!settingsText) return new Set();
  const out = new Set();
  // settings.json command strings contain "...H:/prism/.claude/hooks/<name>.mjs"
  const re = /\.claude\/hooks\/([A-Za-z0-9._-]+)\.mjs/g;
  let m;
  while ((m = re.exec(settingsText)) !== null) {
    out.add(m[1] + ".mjs");
  }
  // Also pick up bundle sub-hooks referenced inside bundle .mjs files
  return out;
}

/** Extract referenced hook basenames from any bundle .mjs file (recursively). */
export function extractBundleSubHooks(bundlePath) {
  const text = readTextSafe(bundlePath);
  if (!text) return new Set();
  const out = new Set();
  // Pattern: `${HOOK_BASE}/foo.mjs` or "../foo.mjs"
  const re = /\/(?:.claude\/)?hooks\/([A-Za-z0-9._-]+)\.mjs/g;
  let m;
  while ((m = re.exec(text)) !== null) out.add(m[1] + ".mjs");
  return out;
}

/** Extract referenced script invocations from hook + bundle + settings text. */
export function extractScriptInvocations(allText) {
  const out = new Set();
  const re = /\bscripts\/([A-Za-z0-9._-]+)\.mjs/g;
  let m;
  while ((m = re.exec(allText)) !== null) out.add(m[1] + ".mjs");
  return out;
}

/** Skills with structured triggers: frontmatter, from slash-commands-inventory.json. */
export function extractSkillsWithTriggers(inventory) {
  const out = [];
  if (!inventory || !Array.isArray(inventory.records)) return out;
  for (const rec of inventory.records) {
    if (rec && Array.isArray(rec.triggers) && rec.triggers.length > 0) out.push({ name: rec.name, source: rec.source, bucket: rec.bucket, triggers: rec.triggers });
  }
  return out;
}

/** Slot dispatchers from a dispatcher-axis pass over the wiring index. */
export function dispatcherList(wiringIndex) {
  if (!wiringIndex || !wiringIndex.engines) return [];
  const set = new Set();
  for (const info of Object.values(wiringIndex.engines)) {
    for (const d of (info.dispatchers || [])) if (d && d.dispatcher) set.add(d.dispatcher);
  }
  return [...set].sort();
}

/** Hooks that gate Edit/Write/MultiEdit/Bash tool-use (read from settings.json structure). */
export function extractGateMatchers(settingsObj) {
  if (!settingsObj || typeof settingsObj !== "object") return [];
  const out = [];
  const pre = settingsObj.hooks && settingsObj.hooks.PreToolUse;
  if (Array.isArray(pre)) {
    for (const entry of pre) {
      if (entry && entry.matcher) out.push(entry.matcher);
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Gap classifier
// ────────────────────────────────────────────────────────────────────────────

export function classifyGaps({
  slashInventory,
  hookRegistry,
  engineWiring,
  settingsJson,
  settingsText,
  hooksOnDisk,    // Array<string>: .mjs basenames in .claude/hooks/
  scriptsOnDisk,  // Array<string>: .mjs basenames in scripts/
} = {}) {
  // Defensive defaults — caller may pass partial object or undefined fields
  slashInventory = slashInventory ?? null;
  hookRegistry = hookRegistry ?? null;
  engineWiring = engineWiring ?? null;
  settingsJson = settingsJson ?? null;
  settingsText = settingsText ?? "";
  hooksOnDisk = Array.isArray(hooksOnDisk) ? hooksOnDisk : [];
  scriptsOnDisk = Array.isArray(scriptsOnDisk) ? scriptsOnDisk : [];

  const gaps = {
    UNTRIGGERED_SKILLS: [],
    HOOKS_NOT_WIRED: [],
    SCRIPTS_NOT_INVOKED: [],
    SKILLS_WITHOUT_HOOKS: [],
    ENGINES_UNWIRED: [],
    DISPATCHERS_NO_HOOK_GATE: [],
    BROKEN_CHAINS: [],
    ORPHAN_AUTO_GEN: [],
  };

  // 1. Hooks referenced in settings.json
  const wiredHookBasenames = extractWiredHookBasenames(settingsText);
  // Add sub-hooks referenced inside bundle files (bundles are wired in settings.json
  // and themselves call sub-hooks)
  for (const bn of [...wiredHookBasenames]) {
    if (bn.startsWith("bundles/") || bn.includes("bundle")) {
      const subHooks = extractBundleSubHooks(join(HOOKS_DIR, bn.replace(/^bundles\//, "bundles/")));
      for (const sh of subHooks) wiredHookBasenames.add(sh);
    }
  }
  // Also walk all .claude/hooks/bundles/*.mjs for sub-hook references regardless
  try {
    const bundlesDir = join(HOOKS_DIR, "bundles");
    if (existsSync(bundlesDir)) {
      for (const f of readdirSync(bundlesDir).filter(f => f.endsWith(".mjs"))) {
        const subs = extractBundleSubHooks(join(bundlesDir, f));
        for (const sh of subs) wiredHookBasenames.add(sh);
      }
    }
  } catch { /* skip */ }

  // 2. HOOKS_NOT_WIRED — exists on disk but not referenced
  for (const h of hooksOnDisk) {
    if (!wiredHookBasenames.has(h) && !h.startsWith("_")) {
      gaps.HOOKS_NOT_WIRED.push(h);
    }
  }

  // 3. SCRIPTS_NOT_INVOKED — exists in scripts/ but no hook/bundle/settings references it
  const scriptCallText = settingsText + "\n" + hooksOnDisk.map(h => readTextSafe(join(HOOKS_DIR, h))).join("\n");
  const invokedScripts = extractScriptInvocations(scriptCallText);
  for (const s of scriptsOnDisk) {
    if (!invokedScripts.has(s) && !s.startsWith("_")) gaps.SCRIPTS_NOT_INVOKED.push(s);
  }

  // 4. UNTRIGGERED_SKILLS — skills with structured `triggers:` frontmatter where no hook reads triggers from them
  // The skill-auto-trigger.mjs reads _skill-triggers.jsonl; ALL such skills ARE potentially triggered.
  // But many skills have legacy flat-string triggers (e.g. coverage-by-domain) that the orchestrator ignores.
  // Surface only skills WITH triggers that AREN'T in _skill-triggers.jsonl extract:
  const skillsWithTriggers = extractSkillsWithTriggers(slashInventory);
  let extractedTriggerNames = new Set();
  try {
    const jsonlPath = join(PRISM_ROOT, "knowledge/wiki/architecture/_skill-triggers.jsonl");
    if (existsSync(jsonlPath)) {
      for (const line of readFileSync(jsonlPath, "utf8").split("\n").filter(Boolean)) {
        try { const obj = JSON.parse(line); if (obj && obj.name) extractedTriggerNames.add(obj.name); } catch {}
      }
    }
  } catch { /* skip */ }
  for (const s of skillsWithTriggers) {
    if (!extractedTriggerNames.has(s.name)) gaps.UNTRIGGERED_SKILLS.push(s.name);
  }

  // 5. SKILLS_WITHOUT_HOOKS — skills with NO triggers at all (manual-invoke-only)
  if (slashInventory && Array.isArray(slashInventory.records)) {
    for (const rec of slashInventory.records) {
      if (!rec.triggers || rec.triggers.length === 0) {
        // Most legacy skills lack structured triggers; just count, don't enumerate all 600+
      }
    }
    // Surface a count rather than the full list
    const noTriggers = slashInventory.records.filter(r => !r.triggers || r.triggers.length === 0).length;
    gaps.SKILLS_WITHOUT_HOOKS.push(`__count__: ${noTriggers} of ${slashInventory.total} skills lack structured triggers (manual-invoke-only)`);
  }

  // 6. ENGINES_UNWIRED — sourced from engine wiring index
  if (engineWiring && engineWiring.engines) {
    let count = 0;
    const samples = [];
    for (const info of Object.values(engineWiring.engines)) {
      if (info && info.wired === false) {
        count++;
        if (samples.length < 10) samples.push(info.engine);
      }
    }
    gaps.ENGINES_UNWIRED.push(`__count__: ${count} engines have no dispatcher reference`);
    for (const s of samples) gaps.ENGINES_UNWIRED.push(`  e.g. ${s}`);
  }

  // 7. DISPATCHERS_NO_HOOK_GATE — informational: which dispatchers have NO PreToolUse hook
  // (Most dispatchers are MCP-only, gated by MCP-layer validation rather than hooks. This is descriptive.)
  const dispatchers = dispatcherList(engineWiring);
  const gateMatchers = extractGateMatchers(settingsJson);
  // Heuristic: if no PreToolUse matcher contains "mcp__prism" we say there's no MCP gate.
  // (Some safety hooks DO match on mcp__prism — surface only the descriptive count.)
  const mcpGateHooks = gateMatchers.filter(m => /mcp__prism|Bash/.test(String(m || ""))).length;
  gaps.DISPATCHERS_NO_HOOK_GATE.push(`__info__: ${dispatchers.length} dispatchers exist; ${mcpGateHooks} PreToolUse matchers gate MCP/Bash surface (most safety gating is at the engine layer)`);

  // 8. BROKEN_CHAINS — example: skills with `pipeline_integrations:` referring to a phase no orchestrator implements
  // (Conservative: surface as TODO since no machine-readable orchestrator catalog exists yet)
  gaps.BROKEN_CHAINS.push("__todo__: requires orchestrator catalog from P0-U02/P0-U03 — surfacing as a known follow-up rather than synthesizing");

  // 9. ORPHAN_AUTO_GEN — state/shared/*.json files with no producer script reference in scripts/ or hooks/
  // (Conservative: surface as TODO — requires comprehensive scan deferred to follow-up)
  gaps.ORPHAN_AUTO_GEN.push("__todo__: full scan deferred — would require parsing every .mjs in scripts/ for output paths; first-pass implementation tracked as P0-U05-FOLLOWUP-1");

  return gaps;
}

// ────────────────────────────────────────────────────────────────────────────
// Markdown rendering
// ────────────────────────────────────────────────────────────────────────────

export function renderMarkdown(gaps, summary) {
  const lines = [];
  lines.push("# PRISM Automation Gap Map");
  lines.push("");
  lines.push(`Generated: ${summary.generated_at}`);
  lines.push("Source unit: ACP-MS0 / P0-U05 — *Produce gap map document: missing links, unconnected fragments, chains that need wiring*");
  lines.push("");
  lines.push("> **Note on dependency chain**: this milestone's ancestor units P0-U02 (hooks inventory) and P0-U03 (scripts inventory) have not yet shipped. This gap map uses raw filesystem scans + `slash-commands-inventory.json` (P0-U01) + `HOOK_REGISTRY.json` + `ENGINE_WIRING_INDEX.json` as substitute inputs. Re-run after P0-U02/P0-U03 land for a tighter map.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Surface | Count |");
  lines.push("|---------|-------|");
  lines.push(`| Slash commands inventoried | ${summary.commands_total} |`);
  lines.push(`| Hooks on disk | ${summary.hooks_total} |`);
  lines.push(`| Scripts on disk | ${summary.scripts_total} |`);
  lines.push(`| Hooks wired in settings.json (incl. via bundles) | ${summary.hooks_wired} |`);
  lines.push(`| Scripts invoked by some hook/setting | ${summary.scripts_invoked} |`);
  lines.push(`| Engines wired | ${summary.engines_wired} |`);
  lines.push(`| Engines unwired | ${summary.engines_unwired} |`);
  lines.push("");

  const counts = {};
  for (const [k, v] of Object.entries(gaps)) {
    counts[k] = Array.isArray(v) ? v.length : 0;
  }
  lines.push("## Gap counts by class");
  lines.push("");
  lines.push("| Class | Items | Severity |");
  lines.push("|-------|-------|----------|");
  const severity = {
    HOOKS_NOT_WIRED:           "P1 — hook exists but isn't fired",
    SCRIPTS_NOT_INVOKED:       "P2 — script exists but isn't called",
    UNTRIGGERED_SKILLS:        "P1 — skill has structured triggers but orchestrator can't see it",
    SKILLS_WITHOUT_HOOKS:      "P3 — informational; many are manual-only by design",
    ENGINES_UNWIRED:           "P2 — engines need dispatcher wiring (see /wire-unwired)",
    DISPATCHERS_NO_HOOK_GATE:  "P3 — informational; gating mostly at engine layer",
    BROKEN_CHAINS:             "P2 — needs orchestrator catalog from P0-U02/U03",
    ORPHAN_AUTO_GEN:           "P3 — deferred to follow-up",
  };
  for (const k of Object.keys(gaps)) {
    lines.push(`| ${k} | ${counts[k]} | ${severity[k] || "P?"} |`);
  }
  lines.push("");

  for (const k of Object.keys(gaps)) {
    lines.push(`## ${k}`);
    lines.push("");
    lines.push(`*${severity[k] || "P?"}*`);
    lines.push("");
    const arr = gaps[k];
    if (!arr || arr.length === 0) {
      lines.push("_(none — surface clean)_");
      lines.push("");
      continue;
    }
    const MAX = 50;
    for (const item of arr.slice(0, MAX)) {
      lines.push(`- ${item}`);
    }
    if (arr.length > MAX) lines.push(`- _… and ${arr.length - MAX} more (see automation-gap-map.json for full list)_`);
    lines.push("");
  }

  lines.push("## Recommended actions");
  lines.push("");
  lines.push("Per gap class:");
  lines.push("");
  lines.push("1. **HOOKS_NOT_WIRED** → triage: live (wire them in) vs dead (move to `.claude/hooks-archive/`).");
  lines.push("2. **SCRIPTS_NOT_INVOKED** → many are one-shot bootstrappers (acceptable). Investigate scripts that look CI-callable but aren't wired.");
  lines.push("3. **UNTRIGGERED_SKILLS** → either add structured `triggers:` frontmatter so `skill-auto-trigger.mjs` picks them up, OR explicitly mark them manual-only.");
  lines.push("4. **ENGINES_UNWIRED** → run `/wire-unwired --domain=<top>` per the BATCH cadence (~6 engines/commit). 73 Lathe-unwired profiled at `state/shared/WIRE-UNWIRED-LATHE-PROPOSAL-2026-05-13.md`.");
  lines.push("");
  lines.push("## Re-generate");
  lines.push("");
  lines.push("```bash");
  lines.push("node scripts/produce-automation-gap-map.mjs");
  lines.push("```");
  lines.push("");
  lines.push("Inline self-tests: `node scripts/produce-automation-gap-map.mjs --self-test`");
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { dryRun: false, verbose: false, selfTest: false, outputMd: OUT_MD, outputJson: OUT_JSON };
  for (const a of args) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--verbose") out.verbose = true;
    else if (a === "--self-test") out.selfTest = true;
    else if (a.startsWith("--output-md=")) out.outputMd = a.slice("--output-md=".length);
    else if (a.startsWith("--output-json=")) out.outputJson = a.slice("--output-json=".length);
  }
  return out;
}

function main() {
  const flags = parseArgs(process.argv);

  if (flags.selfTest) {
    return runSelfTests();
  }

  const slashInventory = readJsonSafe(SLASH_INVENTORY);
  const hookRegistry   = readJsonSafe(HOOK_REGISTRY);
  const engineWiring   = readJsonSafe(ENGINE_WIRING);
  const settingsText   = readTextSafe(existsSync(SETTINGS_JSON_ALT) ? SETTINGS_JSON_ALT : SETTINGS_JSON);
  const settingsJson   = (() => { try { return JSON.parse(settingsText); } catch { return null; } })();
  const hooksOnDisk    = listFilesByExt(HOOKS_DIR, ".mjs");
  const scriptsOnDisk  = listFilesByExt(SCRIPTS_DIR, ".mjs");

  const gaps = classifyGaps({ slashInventory, hookRegistry, engineWiring, settingsJson, settingsText, hooksOnDisk, scriptsOnDisk });

  // Summary numbers for the report
  const wiredHookBasenames = extractWiredHookBasenames(settingsText);
  const invokedScripts = extractScriptInvocations(settingsText + "\n" + hooksOnDisk.map(h => readTextSafe(join(HOOKS_DIR, h))).join("\n"));
  let enginesWired = 0, enginesUnwired = 0;
  if (engineWiring && engineWiring.engines) {
    for (const info of Object.values(engineWiring.engines)) { if (info.wired) enginesWired++; else enginesUnwired++; }
  }
  const summary = {
    generated_at: new Date().toISOString(),
    schema_version: 1,
    commands_total: slashInventory?.total ?? 0,
    hooks_total: hooksOnDisk.length,
    scripts_total: scriptsOnDisk.length,
    hooks_wired: wiredHookBasenames.size,
    scripts_invoked: invokedScripts.size,
    engines_wired: enginesWired,
    engines_unwired: enginesUnwired,
  };

  if (flags.dryRun) {
    process.stderr.write(`DRY-RUN — would write ${flags.outputMd} + ${flags.outputJson}\n`);
    process.stderr.write(`gap counts: ${JSON.stringify(Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, v.length])))}\n`);
    return 0;
  }

  const md = renderMarkdown(gaps, summary);
  const json = { schemaVersion: 1, generated_at: summary.generated_at, summary, gaps };

  atomicWrite(flags.outputMd, md);
  atomicWrite(flags.outputJson, JSON.stringify(json, null, 2) + "\n");

  process.stderr.write(`produce-automation-gap-map: wrote ${flags.outputMd} (${md.length} chars) + ${flags.outputJson}\n`);
  process.stderr.write(`gap counts: ${JSON.stringify(Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, v.length])))}\n`);
  return 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Self-tests (inline — run with --self-test, also imported by vitest file)
// ────────────────────────────────────────────────────────────────────────────

export function runSelfTests() {
  const tests = [];
  function t(name, fn) { tests.push({ name, fn }); }

  // T1: readJsonSafe — valid JSON
  t("readJsonSafe returns parsed object for slash-commands-inventory.json", () => {
    const j = readJsonSafe(SLASH_INVENTORY);
    if (!j || typeof j !== "object") throw new Error("expected object");
    if (j.schemaVersion !== 1) throw new Error(`schemaVersion expected 1 got ${j.schemaVersion}`);
  });
  // T2: readJsonSafe — missing file
  t("readJsonSafe returns null for missing file", () => {
    const j = readJsonSafe("Z:/definitely-not-here.json");
    if (j !== null) throw new Error("expected null");
  });
  // T3: readJsonSafe — malformed JSON
  t("readJsonSafe returns null for malformed JSON", () => {
    const j = readJsonSafe(__filename);     // this script is valid JS but not JSON
    if (j !== null) throw new Error("expected null for malformed");
  });
  // T4: extractWiredHookBasenames — single match
  t("extractWiredHookBasenames captures hook from settings text", () => {
    const text = `{"hooks":{"PreToolUse":[{"matcher":"Edit","hooks":[{"command":"node H:/prism/.claude/hooks/foo-bar.mjs"}]}]}}`;
    const s = extractWiredHookBasenames(text);
    if (!s.has("foo-bar.mjs")) throw new Error("missing foo-bar.mjs");
  });
  // T5: extractWiredHookBasenames — empty string
  t("extractWiredHookBasenames returns empty set on empty string", () => {
    const s = extractWiredHookBasenames("");
    if (s.size !== 0) throw new Error(`expected 0 got ${s.size}`);
  });
  // T6: extractWiredHookBasenames — multiple
  t("extractWiredHookBasenames dedupes multiple references", () => {
    const text = "x .claude/hooks/a.mjs y .claude/hooks/a.mjs z .claude/hooks/b.mjs";
    const s = extractWiredHookBasenames(text);
    if (s.size !== 2) throw new Error(`expected 2 got ${s.size}`);
    if (!s.has("a.mjs") || !s.has("b.mjs")) throw new Error("missing entries");
  });
  // T7: extractScriptInvocations — boundary
  t("extractScriptInvocations finds scripts/ path", () => {
    const text = "node H:/prism/scripts/foo-bar.mjs --flag";
    const s = extractScriptInvocations(text);
    if (!s.has("foo-bar.mjs")) throw new Error("missing match");
  });
  // T8: extractScriptInvocations — empty
  t("extractScriptInvocations on empty text", () => {
    const s = extractScriptInvocations("");
    if (s.size !== 0) throw new Error("expected 0");
  });
  // T9: extractSkillsWithTriggers — happy path with non-empty triggers
  t("extractSkillsWithTriggers filters records", () => {
    const inv = { records: [
      { name: "with-trig", triggers: ["foo"], source: "project", bucket: "x" },
      { name: "no-trig", triggers: [], source: "user", bucket: "y" },
      { name: "no-field", source: "user", bucket: "z" },
    ] };
    const out = extractSkillsWithTriggers(inv);
    if (out.length !== 1) throw new Error(`expected 1 got ${out.length}`);
    if (out[0].name !== "with-trig") throw new Error("wrong record");
  });
  // T10: extractSkillsWithTriggers — null safety
  t("extractSkillsWithTriggers handles null/missing inventory", () => {
    if (extractSkillsWithTriggers(null).length !== 0) throw new Error("null");
    if (extractSkillsWithTriggers({}).length !== 0) throw new Error("empty");
    if (extractSkillsWithTriggers({records: "not-array"}).length !== 0) throw new Error("bad shape");
  });
  // T11: dispatcherList — null safety + dedup
  t("dispatcherList dedupes + sorts", () => {
    const wi = { engines: {
      0: { engine: "A", dispatchers: [{ dispatcher: "d2", actions: [] }, { dispatcher: "d1", actions: [] }] },
      1: { engine: "B", dispatchers: [{ dispatcher: "d1", actions: [] }] },
    } };
    const out = dispatcherList(wi);
    if (out.length !== 2) throw new Error(`expected 2 got ${out.length}`);
    if (out[0] !== "d1" || out[1] !== "d2") throw new Error(`order wrong: ${out.join(",")}`);
  });
  // T12: dispatcherList — null
  t("dispatcherList handles null", () => {
    if (dispatcherList(null).length !== 0) throw new Error("null");
    if (dispatcherList({}).length !== 0) throw new Error("empty");
  });
  // T13: extractGateMatchers — happy path
  t("extractGateMatchers reads PreToolUse matchers", () => {
    const s = { hooks: { PreToolUse: [{ matcher: "Edit" }, { matcher: "Bash" }] } };
    const out = extractGateMatchers(s);
    if (out.length !== 2 || out[0] !== "Edit" || out[1] !== "Bash") throw new Error("wrong");
  });
  // T14: extractGateMatchers — null safety
  t("extractGateMatchers handles missing structure", () => {
    if (extractGateMatchers(null).length !== 0) throw new Error("null");
    if (extractGateMatchers({}).length !== 0) throw new Error("empty");
    if (extractGateMatchers({hooks:{}}).length !== 0) throw new Error("no PreToolUse");
  });
  // T15: classifyGaps — minimal happy path
  t("classifyGaps returns all 8 gap classes as arrays", () => {
    const gaps = classifyGaps({
      slashInventory: { schemaVersion: 1, total: 0, records: [] },
      hookRegistry: null,
      engineWiring: { engines: {} },
      settingsJson: { hooks: { PreToolUse: [] } },
      settingsText: "",
      hooksOnDisk: [],
      scriptsOnDisk: [],
    });
    const expected = ["UNTRIGGERED_SKILLS", "HOOKS_NOT_WIRED", "SCRIPTS_NOT_INVOKED", "SKILLS_WITHOUT_HOOKS", "ENGINES_UNWIRED", "DISPATCHERS_NO_HOOK_GATE", "BROKEN_CHAINS", "ORPHAN_AUTO_GEN"];
    for (const k of expected) {
      if (!Array.isArray(gaps[k])) throw new Error(`${k} not an array`);
    }
  });
  // T16: classifyGaps — adversarial empty inputs
  t("classifyGaps tolerates undefined inputs", () => {
    const gaps = classifyGaps({});
    if (!gaps || typeof gaps !== "object") throw new Error("expected object");
  });
  // T17: classifyGaps — HOOKS_NOT_WIRED detection
  t("classifyGaps surfaces unwired hooks", () => {
    const gaps = classifyGaps({
      slashInventory: { total: 0, records: [] },
      engineWiring: { engines: {} },
      settingsJson: { hooks: { PreToolUse: [] } },
      settingsText: ".claude/hooks/wired.mjs",
      hooksOnDisk: ["wired.mjs", "unwired.mjs"],
      scriptsOnDisk: [],
    });
    if (!gaps.HOOKS_NOT_WIRED.includes("unwired.mjs")) throw new Error("missing unwired.mjs");
    if (gaps.HOOKS_NOT_WIRED.includes("wired.mjs")) throw new Error("wired.mjs should NOT be flagged");
  });
  // T18: classifyGaps — SCRIPTS_NOT_INVOKED
  t("classifyGaps surfaces uninvoked scripts", () => {
    const gaps = classifyGaps({
      slashInventory: { total: 0, records: [] },
      engineWiring: { engines: {} },
      settingsJson: null,
      settingsText: "node H:/prism/scripts/used.mjs",
      hooksOnDisk: [],
      scriptsOnDisk: ["used.mjs", "unused.mjs"],
    });
    if (!gaps.SCRIPTS_NOT_INVOKED.includes("unused.mjs")) throw new Error("missing unused.mjs");
  });
  // T19: classifyGaps — leading underscore exclusion
  t("classifyGaps excludes underscore-prefixed scripts (one-shot helpers)", () => {
    const gaps = classifyGaps({
      slashInventory: { total: 0, records: [] },
      engineWiring: { engines: {} },
      settingsJson: null,
      settingsText: "",
      hooksOnDisk: [],
      scriptsOnDisk: ["_helper.mjs", "real.mjs"],
    });
    if (gaps.SCRIPTS_NOT_INVOKED.includes("_helper.mjs")) throw new Error("_helper.mjs should be excluded");
    if (!gaps.SCRIPTS_NOT_INVOKED.includes("real.mjs")) throw new Error("real.mjs should be flagged");
  });
  // T20: renderMarkdown — output contains expected sections
  t("renderMarkdown produces all gap-class sections", () => {
    const gaps = { UNTRIGGERED_SKILLS: ["a"], HOOKS_NOT_WIRED: [], SCRIPTS_NOT_INVOKED: [], SKILLS_WITHOUT_HOOKS: [], ENGINES_UNWIRED: [], DISPATCHERS_NO_HOOK_GATE: [], BROKEN_CHAINS: [], ORPHAN_AUTO_GEN: [] };
    const md = renderMarkdown(gaps, { generated_at: "x", commands_total: 0, hooks_total: 0, scripts_total: 0, hooks_wired: 0, scripts_invoked: 0, engines_wired: 0, engines_unwired: 0 });
    for (const k of Object.keys(gaps)) {
      if (!md.includes(`## ${k}`)) throw new Error(`missing section ${k}`);
    }
    if (!md.includes("PRISM Automation Gap Map")) throw new Error("missing title");
  });

  // Run
  let pass = 0, fail = 0;
  for (const tst of tests) {
    try { tst.fn(); process.stdout.write(`✓ ${tst.name}\n`); pass++; }
    catch (e) { process.stdout.write(`✗ ${tst.name}\n    ${e.message}\n`); fail++; }
  }
  process.stdout.write(`\nself-tests: ${pass} pass / ${fail} fail (${tests.length} total)\n`);
  return fail === 0 ? 0 : 1;
}

const __filename = (typeof import.meta !== "undefined") ? new URL(import.meta.url).pathname.replace(/^\//, "") : "";

// Only run if invoked directly (CLI)
if (typeof import.meta !== "undefined" && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  process.exit(main());
}
