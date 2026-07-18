#!/usr/bin/env node
/**
 * generate-quoting-awareness.mjs — custom quoting-domain awareness generator (slot:charlie galaxy).
 *
 * Produces state/shared/quoting/QUOTING-AWARENESS.md: a LIVING domain digest so every
 * charlie session auto-loads quoting context (engines/hooks/algorithms/frontend/drift/next-unit/
 * PSN-leg status) at the lowest token cost. The companion hook charlie-quoting-awareness-inject.mjs
 * injects the ## Headline block on charlie UserPromptSubmit.
 *
 * Self-updating: enumerates the real filesystem at run time (no hardcoded engine list to rot).
 * Pure-core + injected readers for testability. Defensive-default (galaxy gotcha #6) — every
 * fs read is wrapped; missing/parse-error inputs degrade to a diagnostic banner, never crash (R12).
 *
 * CLI:  node scripts/generate-quoting-awareness.mjs [--json] [--root H:/prism]
 * Knobs: PRISM_ROOT (default H:/prism)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export const DEFAULT_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SYNTH_VERSION = "1.0.0";

// ---- pure helpers ---------------------------------------------------------

/** Classify the quoting engine surface from a flat list of engine filenames. Pure. */
export function classifyEngines(names) {
  const safe = Array.isArray(names) ? names : [];
  const eng = (re) =>
    safe.filter((n) => typeof n === "string" && n.endsWith(".ts") && !n.includes(".test.") && re.test(n));
  return {
    quotePrefixed: eng(/^(Quote|Quoting)/).length,
    costPrefixed: eng(/^Cost/).length,
    neuralBridges: eng(/^Quoting(Neural|DeepReasoning)/).map((n) => n.replace(/\.ts$/, "")),
    closedLoop: eng(/^Quoting(ClosedLoop|TrainingLoop|TrainingOrchestrator|Calibration|ActiveFactor)/).map((n) => n.replace(/\.ts$/, "")),
    crossGalaxyBridges: eng(/(WEDMQuote|SpeedFeedToQuote|WizardToQuote|PrintToProgramToQuote|LatheAutoQuote|VendorQuoteToPurchase|XometryStyle)/).map((n) => n.replace(/\.ts$/, "")),
    // .ts-1 backups are a known disk-anomaly class (see ActualCostEngine.ts-1 resolution) — surface, never use.
    anomalies: safe.filter((n) => typeof n === "string" && n.endsWith(".ts-1") && /Quote|Cost/i.test(n)),
  };
}

/** Count engine files matching the broad cost/quote prefix set. Pure. */
export function countQuotingEngines(names) {
  const safe = Array.isArray(names) ? names : [];
  return safe.filter(
    (n) =>
      typeof n === "string" &&
      n.endsWith(".ts") &&
      !n.includes(".test.") &&
      /^(Quote|Quoting|Cost|Estimat|Pricing|Freight|Import|InstantQuote)/.test(n)
  ).length;
}

/** Drift-state freshness from latest-drift-alert.json text. Pure + defensive (gotcha #6). */
export function driftFreshness(driftText, nowMs, freshHours = 6) {
  if (typeof driftText !== "string" || driftText.length === 0)
    return { state: "missing", ageHours: null, fresh: false, note: "latest-drift-alert.json missing — pre-flight gate cannot verify freshness" };
  let j;
  try {
    j = JSON.parse(driftText);
  } catch {
    return { state: "parse-error", ageHours: null, fresh: false, note: "drift-alert unparseable (diagnostic banner; R12)" };
  }
  // T16: latest-drift-alert.json (buildDriftStateFile in quoting-train-drift-alert.mjs) emits the
  // timestamp under `ts_iso` and the level NESTED at `alert.level`. Read the producer keys FIRST,
  // keeping the legacy keys (generatedAt/timestamp/ts/updatedAt + top-level level) as back-compat.
  // Before this, neither producer key was read -> a valid alert showed "unknown"/"no parseable
  // timestamp", and a real "warn" would have masked as "ok" (R12: worse than unknown).
  const ts = j && (j.ts_iso || j.generatedAt || j.timestamp || j.ts || j.updatedAt);
  const t = ts ? Date.parse(ts) : NaN;
  const level = j && ((j.alert && j.alert.level) || j.level);
  if (!Number.isFinite(t)) return { state: level || "unknown", ageHours: null, fresh: false, note: "drift-alert has no parseable timestamp" };
  // raw fractional compare (gotcha #2 — never Math.round before a threshold-compare)
  const ageHours = Math.max(0, (nowMs - t) / 3_600_000);
  return { state: level || "ok", ageHours, fresh: ageHours <= freshHours, note: ageHours <= freshHours ? "fresh" : `stale (${ageHours.toFixed(1)}h > ${freshHours}h)` };
}

/** Render the compact ## Headline block (the hook injects exactly this). Pure. */
export function renderHeadline(d) {
  const a = d.engines.anomalies.length ? ` · ⚠${d.engines.anomalies.length} .ts-1 anomaly` : "";
  return [
    "## Headline",
    `- **${d.counts.engines} cost/quote engines** (${d.engines.quotePrefixed} Quote*/Quoting* + ${d.engines.costPrefixed} Cost*) · **${d.counts.hooks} cost-bridge hooks** (${d.counts.hooksWired} wired) · **${d.counts.algorithms} algorithms** · **${d.counts.frontendPages} frontend pages**${a}`,
    `- **NN/GNN (leg10):** ${d.engines.neuralBridges.join(", ") || "(none)"} · **closed-loop:** ${d.engines.closedLoop.length} engines · dispatchers: prism_business + prism_quoting`,
    `- **drift state:** ${d.drift.state} — ${d.drift.note}`,
    `- **next unit:** ${d.nextUnit}`,
    `- galaxy: \`mcp-server/src/engines/quoting/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md\` · awareness regen: \`node scripts/generate-quoting-awareness.mjs\``,
  ].join("\n");
}

/** Full markdown document. Pure. */
export function renderAwarenessMd(d) {
  return [
    "# QUOTING-AWARENESS — slot:charlie domain context (auto-generated)",
    "",
    `> Custom domain-tailored PRISM awareness for the quoting galaxy. Regenerated by \`scripts/generate-quoting-awareness.mjs\`; injected by \`charlie-quoting-awareness-inject.mjs\` (UserPromptSubmit, charlie-gated). Generated ${d.generatedAt}. Self-updating — enumerates the real filesystem.`,
    "",
    renderHeadline(d),
    "",
    "## Engine surface",
    `- Total cost/quote engines: **${d.counts.engines}** (${d.engines.quotePrefixed} Quote*/Quoting*, ${d.engines.costPrefixed} Cost*).`,
    `- NN/GNN bridges (PSN leg 10): ${d.engines.neuralBridges.map((x) => "`" + x + "`").join(", ") || "(none)"}.`,
    `- Closed-loop / training / calibration: ${d.engines.closedLoop.map((x) => "`" + x + "`").join(", ") || "(none)"}.`,
    `- Cross-galaxy bridge engines: ${d.engines.crossGalaxyBridges.map((x) => "`" + x + "`").join(", ") || "(none)"}.`,
    d.engines.anomalies.length ? `- ⚠ Disk anomalies (do NOT use — backup class, see ActualCostEngine.ts-1 resolution): ${d.engines.anomalies.map((x) => "`" + x + "`").join(", ")}.` : "- No .ts-1 disk anomalies detected.",
    "",
    "## Hooks (cost-bridge family)",
    `- ${d.counts.hooks} \`cost-bridge-on-*\` hooks on disk; **${d.counts.hooksWired} wired** in settings.json.` + (d.counts.hooks > d.counts.hooksWired ? ` ⚠ ${d.counts.hooks - d.counts.hooksWired} unwired (domain "build-standalone-wire-later" pattern, gotcha #7 — wiring is a deferred pass).` : ""),
    "",
    "## Algorithms / formulas (PSN legs 8-9)",
    `- ${d.counts.algorithms}: ${d.algorithms.map((x) => "`" + x + "`").join(", ") || "(none enumerated)"}.`,
    "",
    "## Frontend (charlie owns backend AND frontend)",
    `- ${d.counts.frontendPages} pages: ${d.frontendPages.map((x) => "`" + x + "`").join(", ") || "(none enumerated)"}.`,
    "",
    "## Drift / training gate",
    `- ${d.drift.state} — ${d.drift.note}. Pre-flight this before any baseline regen (feedback_charlie_quoting_drift_freshness).`,
    "",
    "## PSN leg status (quoting)",
    "1. Obsidian brain ✓ (13 reference_charlie_quoting_* + feedback_charlie_quoting_*) · 2. PRISM OS ✓ (charlie=quoting in CHAT-SLOT-DOMAINS) · 3. Wiki ✓ (3 bridges) · 4. Memories ✓ · 5. Tribal ✓ (slot=charlie) · 6. System-viz ✓ (30 quoting nodes incl. Quoting Suite frontend) · 7. Engines ✓ · 8. Algorithms ✓ · 9. Formulas ✓ (QuotingFormulaEngine wired) · 10. NN/GNN ✓ (QuotingNeuralReasoningBridgeEngine wired) · 11. PRISM AI ✓ (prism_business/prism_quoting + xproc_outcome_publish→india).",
    "",
    "## Next unit",
    `- ${d.nextUnit}`,
    "",
    `_generator v${SYNTH_VERSION} · root ${d.root}_`,
  ].join("\n");
}

/** Extract the ## Headline block from an awareness md (for the hook). Pure. */
export function extractHeadline(md) {
  if (typeof md !== "string") return "";
  const start = md.indexOf("## Headline");
  if (start < 0) return "";
  const after = md.indexOf("\n## ", start + 1);
  return (after < 0 ? md.slice(start) : md.slice(start, after)).trim();
}

// ---- impure shell (injectable readers for tests) --------------------------

function safeReaddir(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
function safeRead(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

/** Collect the awareness data object. Impure (fs) but every read is defensive. */
export function buildAwareness(opts = {}) {
  const root = opts.root || DEFAULT_ROOT;
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.parse(opts.nowIso || "") || nowFallback();
  const engNames = (opts.engineNames || safeReaddir(join(root, "mcp-server/src/engines")));
  const hookNames = (opts.hookNames || safeReaddir(join(root, ".claude/hooks"))).filter((n) => /^cost-bridge-on-.*\.mjs$/.test(n));
  const algoNames = (opts.algoNames || safeReaddir(join(root, "mcp-server/src/algorithms"))).filter(
    (n) => typeof n === "string" && n.endsWith(".ts") && !n.includes(".test.") && /Cost|Quote|Pric|Estimat|Economic|Bom|DigitalTwin/i.test(n)
  ).map((n) => n.replace(/\.ts$/, ""));
  const feNames = (opts.feNames || safeReaddir(join(root, "mcp-server/web/src/pages"))).filter((n) => /Quote|Quoting/i.test(n));
  const settingsText = opts.settingsText != null ? opts.settingsText : safeRead("H:/.claude/settings.json");
  const driftText = opts.driftText != null ? opts.driftText : safeRead(join(root, "state/shared/quoting/latest-drift-alert.json"));

  const engines = classifyEngines(engNames);
  // Router-aware wiring count (gotcha #7 RESOLVED 2026-05-29): the cost-bridge-on-*
  // advisory hooks are wired via the CONSOLIDATED router `cost-bridge-dispatch.mjs`
  // (one spawn runs all 16 rules in-process), NOT as individual settings.json
  // entries — so a bare `cost-bridge-on-` ref count returns 0 and falsely reports
  // "N unwired" (the cry-wolf this generator's first version emitted). If the router
  // is wired, ALL on-disk cost-bridge-on-* hooks are functionally wired; otherwise
  // fall back to the legacy per-file ref count (back-compat if wired individually).
  // See reference_charlie_slot_misidentified_golf_2026_06_09.
  const routerWired = /cost-bridge-dispatch\.mjs/.test(settingsText);
  const individualRefs = (settingsText.match(/cost-bridge-on-/g) || []).length;
  const hooksWired = routerWired ? hookNames.length : individualRefs;
  const drift = driftFreshness(driftText, nowMs);

  const data = {
    generatedAt: opts.generatedAtIso || isoFromMs(nowMs),
    root,
    engines,
    algorithms: algoNames,
    frontendPages: feNames.map((n) => n.replace(/\.tsx?$/, "")),
    drift,
    nextUnit:
      opts.nextUnit ||
      "QUOTING-SYNERGY-MS0 U-QP-ACCOUNTING-WIRE (AccountingHardeningEngine/ERP connector → real outbound revenue; the iter59 data-ceiling bottleneck)",
    counts: {
      engines: countQuotingEngines(engNames),
      hooks: hookNames.length,
      hooksWired,
      algorithms: algoNames.length,
      frontendPages: feNames.length,
    },
  };
  const md = renderAwarenessMd(data);
  return { data, md, headline: renderHeadline(data) };
}

// Date.now()/new Date() avoided at module top-level only; runtime CLI use is fine.
function nowFallback() {
  return Date.now();
}
function isoFromMs(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "unknown";
}

// ---- CLI ------------------------------------------------------------------

function main(argv) {
  const root = (argv.find((a) => a.startsWith("--root=")) || "").split("=")[1] || DEFAULT_ROOT;
  const { data, md } = buildAwareness({ root });
  if (argv.includes("--json")) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return 0;
  }
  const out = join(root, "state/shared/quoting/QUOTING-AWARENESS.md");
  try {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, md, "utf8");
    process.stdout.write(`[quoting-awareness] wrote ${out} (${data.counts.engines} engines, ${data.counts.hooks} hooks, drift=${data.drift.state})\n`);
  } catch (e) {
    process.stderr.write(`[quoting-awareness] FAILED to write ${out}: ${e && e.message}\n`);
    return 1;
  }
  return 0;
}

// run if invoked directly
const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("generate-quoting-awareness.mjs");
if (invokedDirectly) {
  process.exit(main(process.argv.slice(2)));
}
