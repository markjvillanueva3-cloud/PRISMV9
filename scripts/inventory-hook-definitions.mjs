#!/usr/bin/env node
/**
 * inventory-hook-definitions.mjs — ACP-MS0/P0-U02
 *
 * Inventories every Claude Code hook (existing + CCM planned) and maps each
 * to an automation-lifecycle stage. Emits two artifacts:
 *
 *   state/shared/HOOK_DEFINITIONS_INVENTORY.md   (human-readable, per-stage)
 *   state/shared/hook-definitions-inventory.json (machine-readable, schemaVersion 1)
 *
 * Why: ACP-MS0 ("Existing Automation Census & Gap Map") needs a canonical
 * lifecycle view of hooks before P0-U04 can detect partial chains. The H1
 * hook registry (state/shared/HOOK_REGISTRY.json) carries raw events but
 * doesn't tell you "which hooks fire during prompt-ingestion vs subagent
 * lifecycle vs session-teardown". This script layers that map on top.
 *
 * Sources:
 *   - state/shared/HOOK_REGISTRY.json (existing hooks; built by U-H1)
 *   - mcp-server/data/milestones/*.json forge_triple.protective_hook +
 *     feature_cascade.new_hooks (CCM planned hooks)
 *
 * Pure (no side effects until main() runs I/O). Exports pure helpers
 * (mapEventToStage, classifyHook, mergePlannedHooks, buildHookRecord,
 *  renderMarkdown, STAGES_DISPLAY_ORDER) for vitest.
 *
 * Self-test: `node scripts/inventory-hook-definitions.mjs --self-test`
 * CLI:       `node scripts/inventory-hook-definitions.mjs [--no-write] [--json]`
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = "H:/prism";
const HOOK_REGISTRY_PATH = path.join(REPO_ROOT, "state", "shared", "HOOK_REGISTRY.json");
const MILESTONES_DIR = path.join(REPO_ROOT, "mcp-server", "data", "milestones");
const OUT_MD_PATH = path.join(REPO_ROOT, "state", "shared", "HOOK_DEFINITIONS_INVENTORY.md");
const OUT_JSON_PATH = path.join(REPO_ROOT, "state", "shared", "hook-definitions-inventory.json");

// ─── Lifecycle stage taxonomy ────────────────────────────────────────────────
// Maps Claude Code hook events → high-level automation-lifecycle stages.
// Order matters in display: bootstrap → ingest → guard → observe → subagent → teardown → handoff → unknown.
//
// Rationale per stage — what its members do:
//   session-bootstrap:   SessionStart — context load, digest inject, env probe
//   prompt-ingestion:    UserPromptSubmit — classify intent, inject relevant
//                        skills/wiki/inventory, route prompt
//   pre-action-gate:     PreToolUse — validate the tool call before it runs
//                        (block dangerous bash, dedup engine creation, claim
//                        files, enforce role)
//   post-action-observe: PostToolUse — telemetry / linting / read-cache after
//                        a tool ran (write-only side effects)
//   subagent-lifecycle:  SubagentStart + SubagentStop — verify deliverables
//                        + push context
//   session-teardown:    Stop — scrutiny gate, handoff, unwired-asset block,
//                        always-build guard
//   context-handoff:     PreCompact — capture state before context compaction
//   unknown:             hook source file present but never wired to any event
//                        (orphaned source) → review periodically

export const STAGES_DISPLAY_ORDER = [
  "session-bootstrap",
  "prompt-ingestion",
  "pre-action-gate",
  "post-action-observe",
  "subagent-lifecycle",
  "session-teardown",
  "context-handoff",
  "infrastructure",
  "unknown",
];

export const STAGE_DESCRIPTIONS = {
  "session-bootstrap":   "SessionStart — context load, digest inject, env probe.",
  "prompt-ingestion":    "UserPromptSubmit — classify intent, inject context, route prompt.",
  "pre-action-gate":     "PreToolUse — validate the tool call before it runs (block, advise, claim).",
  "post-action-observe": "PostToolUse — telemetry / linting / read-cache after a tool ran.",
  "subagent-lifecycle":  "SubagentStart + SubagentStop — push context, verify deliverables.",
  "session-teardown":    "Stop — scrutiny gate, handoff, unwired-asset block.",
  "context-handoff":     "PreCompact — capture state before context compaction.",
  "infrastructure":      "Bundle hosts, envelopes, profiling shims — wrapped by other hooks but not directly wired (intentional).",
  "unknown":             "Hook file present but never wired to any event (orphaned source — review periodically).",
};

// Lifecycle-stage precedence for `primary_stage` selection when a hook fires
// across multiple events. Gates win (PreToolUse, Stop), then specific moments
// (PreCompact, SubagentStop), then context injection (SessionStart, prompt),
// then passive observers (PostToolUse). Without this, `primary_stage` would
// be HOOK_REGISTRY.json event-array-order-dependent — silently unstable
// across `build-hook-registry.mjs` regenerations. (Per P1.1 review.)
const STAGE_PRECEDENCE = [
  "pre-action-gate",
  "session-teardown",
  "context-handoff",
  "subagent-lifecycle",
  "session-bootstrap",
  "prompt-ingestion",
  "post-action-observe",
  "infrastructure",
  "unknown",
];
const STAGE_PRECEDENCE_INDEX = Object.fromEntries(STAGE_PRECEDENCE.map((s, i) => [s, i]));

// Map Claude Code event → lifecycle stage. Pure.
export function mapEventToStage(event) {
  switch (event) {
    case "SessionStart":     return "session-bootstrap";
    case "UserPromptSubmit": return "prompt-ingestion";
    case "PreToolUse":       return "pre-action-gate";
    case "PostToolUse":      return "post-action-observe";
    case "SubagentStart":
    case "SubagentStop":     return "subagent-lifecycle";
    case "Stop":             return "session-teardown";
    case "PreCompact":       return "context-handoff";
    default:                 return "unknown";
  }
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Detect whether a hook record represents shared infrastructure (bundle host,
 * envelope shim, or other intentionally-unwired wrapper) rather than a real
 * orphan. These hooks have empty `events` because they are invoked indirectly
 * by other hooks via `viaBundle` markers. Pure.
 */
export function isInfrastructureHook(hook) {
  if (!hook || typeof hook !== "object") return false;
  if (typeof hook.id === "string" && hook.id.startsWith("_")) return true;
  if (typeof hook.id === "string" && /-bundle$/.test(hook.id)) return true;
  if (Array.isArray(hook.events)) {
    for (const ev of hook.events) {
      if (ev && typeof ev === "object" && typeof ev.viaBundle === "string" && ev.viaBundle) return true;
    }
  }
  return false;
}

/**
 * Classify a hook record (from HOOK_REGISTRY.json) into a lifecycle stage.
 * A hook can fire on multiple events — we use the event SET plus a
 * `STAGE_PRECEDENCE` ranking to pick a deterministic `primary_stage` that
 * doesn't depend on `events[]` array order. Gates rank above observers so
 * a hook wired to (PreToolUse, PostToolUse) is reported as `pre-action-gate`
 * regardless of which event the registry lists first.
 *   - Hooks wired to zero events: `primary_stage = "infrastructure"` if the
 *     hook is a bundle host / `_envelope` shim, else `"unknown"`.
 *   - Multi-event fan-out: every stage lands in `all_stages` for downstream
 *     consumers; `primary_stage` is the precedence winner.
 * Pure. Never throws on malformed input.
 *
 * Input shape:  { id, events: [{event, viaBundle?, ...}, ...] }
 * Output shape: { primary_stage, all_stages: string[], event_count }
 */
export function classifyHook(hook) {
  if (!hook || typeof hook !== "object" || !Array.isArray(hook.events)) {
    return { primary_stage: "unknown", all_stages: ["unknown"], event_count: 0 };
  }
  if (hook.events.length === 0) {
    if (isInfrastructureHook(hook)) {
      return { primary_stage: "infrastructure", all_stages: ["infrastructure"], event_count: 0 };
    }
    return { primary_stage: "unknown", all_stages: ["unknown"], event_count: 0 };
  }
  // Deduplicate stages across events (a hook can wire (PreToolUse, Edit) +
  // (PreToolUse, Bash) and we only care about the stage once).
  const stages = [];
  const seen = new Set();
  for (const ev of hook.events) {
    if (!ev || typeof ev !== "object" || typeof ev.event !== "string") continue;
    const st = mapEventToStage(ev.event);
    if (!seen.has(st)) {
      seen.add(st);
      stages.push(st);
    }
  }
  if (stages.length === 0) {
    if (isInfrastructureHook(hook)) {
      return { primary_stage: "infrastructure", all_stages: ["infrastructure"], event_count: 0 };
    }
    return { primary_stage: "unknown", all_stages: ["unknown"], event_count: 0 };
  }
  // Pick the precedence-winning stage as primary (gates beat observers).
  let primary = stages[0];
  let primaryRank = STAGE_PRECEDENCE_INDEX[primary] ?? Number.MAX_SAFE_INTEGER;
  for (let i = 1; i < stages.length; i++) {
    const rank = STAGE_PRECEDENCE_INDEX[stages[i]] ?? Number.MAX_SAFE_INTEGER;
    if (rank < primaryRank) {
      primary = stages[i];
      primaryRank = rank;
    }
  }
  return { primary_stage: primary, all_stages: stages, event_count: hook.events.length };
}

/**
 * Build a normalized hook record from a HOOK_REGISTRY entry.
 * Adds: `primary_stage`, `all_stages`, `kind = "existing"`.
 */
export function buildHookRecord(registryEntry) {
  const cls = classifyHook(registryEntry);
  // Deduplicate event names across multiple registrations (user+project layers)
  const eventNames = [];
  const seen = new Set();
  for (const ev of registryEntry.events || []) {
    if (ev && typeof ev.event === "string" && !seen.has(ev.event)) {
      seen.add(ev.event);
      eventNames.push(ev.event);
    }
  }
  return {
    kind: "existing",
    id: registryEntry.id,
    file: registryEntry.file,
    wired: Boolean(registryEntry.wired),
    disabled: Boolean(registryEntry.disabled),
    description: typeof registryEntry.description === "string" ? registryEntry.description : "",
    description_inferred: Boolean(registryEntry.descriptionInferred),
    tier: registryEntry.tier || null,
    events: eventNames,
    registration_count: cls.event_count,
    size_bytes: typeof registryEntry.sizeBytes === "number" ? registryEntry.sizeBytes : 0,
    lines: typeof registryEntry.lines === "number" ? registryEntry.lines : 0,
    primary_stage: cls.primary_stage,
    all_stages: cls.all_stages,
    declared_by: null,  // populated only for planned records
  };
}

/**
 * Read milestone envelopes and extract planned hooks from forge_triple +
 * feature_cascade.new_hooks. Returns one record per (milestone, hook) tuple.
 * Deduplicates planned hooks by hook-name (each unique name = one planned
 * record, with `declared_by` listing every milestone that declares it).
 * Pure (caller-supplied milestone data). For convenience, `readPlannedHooks`
 * wraps this with disk I/O.
 */
export function extractPlannedHooks(milestoneRecords) {
  const byName = new Map();
  for (const { id, envelope } of milestoneRecords) {
    if (!envelope || typeof envelope !== "object") continue;
    const names = new Set();
    if (envelope.forge_triple && typeof envelope.forge_triple.protective_hook === "string") {
      const v = envelope.forge_triple.protective_hook.trim();
      if (v) names.add(v);
    }
    if (envelope.feature_cascade && Array.isArray(envelope.feature_cascade.new_hooks)) {
      for (const h of envelope.feature_cascade.new_hooks) {
        // Accept string form (canonical) and object form (richer envelopes
        // use `{name, file, built_in}` — see SCENARIO-TEST-MS0.json). Silent
        // drop would make the hook invisible to P0-U04 partial-chain detection.
        const name = typeof h === "string"
          ? h
          : (h && typeof h === "object" ? (h.name || h.hook || h.id) : null);
        if (typeof name === "string" && name.trim()) names.add(name.trim());
      }
    }
    const milestoneStatus = typeof envelope.status === "string" ? envelope.status : "unknown";
    for (const name of names) {
      if (!byName.has(name)) {
        byName.set(name, {
          kind: "planned",
          id: name,
          file: null,
          wired: false,
          disabled: false,
          description: "Planned (declared by milestone envelope; not yet on disk)",
          description_inferred: true,
          tier: null,
          events: [],
          registration_count: 0,
          size_bytes: 0,
          lines: 0,
          primary_stage: inferPlannedStage(name),
          all_stages: [inferPlannedStage(name)],
          declared_by: [],
        });
      }
      const rec = byName.get(name);
      rec.declared_by.push({ milestone: id, status: milestoneStatus });
    }
  }
  return [...byName.values()];
}

/**
 * Guess the lifecycle stage of a planned hook from its name. Conservative —
 * any `*-gate` is treated as a pre-action-gate (the dominant pattern in PRISM),
 * `*-precompact` → context-handoff, `*-stop` → session-teardown, etc.
 * Pure. Default: "unknown".
 */
export function inferPlannedStage(name) {
  if (typeof name !== "string") return "unknown";
  const n = name.toLowerCase();
  if (/precompact$|^precompact-/.test(n)) return "context-handoff";
  if (/(^|-)stop(-|$)|teardown/.test(n)) return "session-teardown";
  if (/(^|-)sessionstart(-|$)|^session-bootstrap/.test(n)) return "session-bootstrap";
  if (/(^|-)userpromptsubmit(-|$)|prompt-ingest/.test(n)) return "prompt-ingestion";
  if (/subagent/.test(n)) return "subagent-lifecycle";
  if (/posttool|post-tool|on-write|on-edit/.test(n)) return "post-action-observe";
  // Default for ACP milestone gates + most named hooks → pre-action-gate
  if (/gate$|^pre-|guard$|enforce-/.test(n)) return "pre-action-gate";
  return "unknown";
}

/**
 * Merge planned hooks against existing records. A planned hook whose name
 * matches an existing hook ID is dropped from `planned_only` and instead the
 * existing record gets a `declared_by` field with the milestone declarations.
 * Mutates the matching `existingRecords` entries in place — callers MUST NOT
 * re-use the same `existingRecords` array across two merge calls.
 * Returns { existing, planned_only, declared_existing_count }.
 */
export function mergePlannedHooks(existingRecords, plannedRecords) {
  const existingById = new Map();
  for (const r of existingRecords) existingById.set(r.id, r);
  const plannedOnly = [];
  let declaredExisting = 0;
  for (const p of plannedRecords) {
    if (existingById.has(p.id)) {
      const existing = existingById.get(p.id);
      // Clone the array to prevent leakage between caller's planned list and
      // the existing record (the planned record is built fresh per run, but
      // a test fixture could reuse it).
      existing.declared_by = Array.isArray(p.declared_by) ? [...p.declared_by] : [];
      declaredExisting++;
    } else {
      plannedOnly.push(p);
    }
  }
  return {
    existing: [...existingById.values()],
    planned_only: plannedOnly,
    declared_existing_count: declaredExisting,
  };
}

/**
 * Group records by primary_stage. Stages without records still get an empty
 * entry, so downstream consumers can iterate `STAGES_DISPLAY_ORDER` safely.
 */
export function groupByStage(records) {
  const grouped = {};
  for (const s of STAGES_DISPLAY_ORDER) grouped[s] = [];
  for (const r of records) {
    const s = r.primary_stage || "unknown";
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(r);
  }
  for (const s of Object.keys(grouped)) {
    grouped[s].sort((a, b) => a.id.localeCompare(b.id));
  }
  return grouped;
}

/**
 * Render the inventory as Markdown.
 */
export function renderMarkdown(allRecords, stats, generatedAt) {
  const grouped = groupByStage(allRecords);
  const lines = [];
  lines.push(`# Hook Definitions Inventory — by automation lifecycle stage`);
  lines.push("");
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Source:** \`node scripts/inventory-hook-definitions.mjs\` (ACP-MS0/P0-U02)`);
  lines.push("");
  lines.push(`**Existing hook files:** ${stats.existing_total}`);
  lines.push(`  · wired: ${stats.existing_wired}`);
  lines.push(`  · orphaned (file present but never registered): ${stats.existing_orphaned}`);
  lines.push(`  · disabled: ${stats.existing_disabled}`);
  lines.push("");
  lines.push(`**Planned hooks** (CCM declarations in milestone envelopes that have no source file yet): ${stats.planned_only_total}`);
  lines.push(`**Planned-and-already-built** (declaration matches an existing hook ID): ${stats.declared_existing_count}`);
  lines.push("");
  lines.push("## Stage totals");
  lines.push("");
  lines.push("| Stage | Existing | Planned-only | Total | Description |");
  lines.push("|-------|----------|--------------|-------|-------------|");
  for (const s of STAGES_DISPLAY_ORDER) {
    const items = grouped[s] || [];
    const existing = items.filter((r) => r.kind === "existing").length;
    const planned = items.filter((r) => r.kind === "planned").length;
    lines.push(`| ${s} | ${existing} | ${planned} | ${existing + planned} | ${STAGE_DESCRIPTIONS[s] || ""} |`);
  }
  lines.push("");
  // Per-stage detail
  for (const s of STAGES_DISPLAY_ORDER) {
    const items = grouped[s] || [];
    if (items.length === 0) continue;
    lines.push(`## ${s} (${items.length})`);
    lines.push("");
    lines.push(`> ${STAGE_DESCRIPTIONS[s] || ""}`);
    lines.push("");
    lines.push("| Hook | Kind | Wired | Tier | Events | Description |");
    lines.push("|------|------|-------|------|--------|-------------|");
    for (const r of items) {
      const id = mdCellEscape(r.id);
      const wired = r.kind === "planned" ? "planned" : (r.wired ? "yes" : "no");
      const tier = mdCellEscape(r.tier || "—");
      const events = ((r.events || []).map((e) => mdCellEscape(e))).join(", ") || "—";
      const desc = mdCellEscape((r.description || "").slice(0, 140));
      lines.push(`| \`${id}\` | ${r.kind} | ${wired} | ${tier} | ${events} | ${desc} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Disk I/O (thin wrappers around pure helpers) ───────────────────────────

function readHookRegistry(p = HOOK_REGISTRY_PATH) {
  if (!fs.existsSync(p)) {
    throw new Error(`HOOK_REGISTRY.json missing at ${p} — regenerate via \`node scripts/build-hook-registry.mjs\``);
  }
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.hooks)) {
    throw new Error(`HOOK_REGISTRY.json shape invalid (no .hooks array) at ${p}`);
  }
  return parsed;
}

export function readPlannedHooks(dir = MILESTONES_DIR) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const records = [];
  for (const f of files) {
    let envelope;
    try {
      envelope = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch {
      continue;
    }
    const id = envelope.id || f.replace(/\.json$/, "");
    records.push({ id, envelope });
  }
  return extractPlannedHooks(records);
}

// ─── Main I/O ────────────────────────────────────────────────────────────────

async function main(argv) {
  const args = parseArgs(argv);

  const registry = readHookRegistry();
  const existingRecords = registry.hooks.map(buildHookRecord);
  const plannedRecords = readPlannedHooks();
  const merged = mergePlannedHooks(existingRecords, plannedRecords);

  const allRecords = [...merged.existing, ...merged.planned_only];

  const stats = {
    existing_total: merged.existing.length,
    existing_wired: merged.existing.filter((r) => r.wired).length,
    existing_orphaned: merged.existing.filter((r) => !r.wired).length,
    existing_disabled: merged.existing.filter((r) => r.disabled).length,
    planned_only_total: merged.planned_only.length,
    declared_existing_count: merged.declared_existing_count,
  };

  const generatedAt = new Date().toISOString();
  const grouped = groupByStage(allRecords);
  const out = {
    schemaVersion: 1,
    generated_at: generatedAt,
    source: {
      hook_registry: path.relative(REPO_ROOT, HOOK_REGISTRY_PATH).replace(/\\/g, "/"),
      milestones_dir: path.relative(REPO_ROOT, MILESTONES_DIR).replace(/\\/g, "/"),
    },
    stages: STAGES_DISPLAY_ORDER,
    stage_descriptions: STAGE_DESCRIPTIONS,
    stage_counts: Object.fromEntries(
      STAGES_DISPLAY_ORDER.map((s) => [
        s,
        {
          existing: (grouped[s] || []).filter((r) => r.kind === "existing").length,
          planned: (grouped[s] || []).filter((r) => r.kind === "planned").length,
          total: (grouped[s] || []).length,
        },
      ])
    ),
    summary: stats,
    existing: merged.existing.sort((a, b) => a.id.localeCompare(b.id)),
    planned_only: merged.planned_only.sort((a, b) => a.id.localeCompare(b.id)),
  };

  const md = renderMarkdown(allRecords, stats, generatedAt);

  if (args.json) {
    process.stdout.write(JSON.stringify(out, null, 2));
    return 0;
  }
  if (args.noWrite) {
    process.stdout.write(`(preview) would write ${OUT_MD_PATH} and ${OUT_JSON_PATH}\n`);
    process.stdout.write(`existing=${stats.existing_total}  planned=${stats.planned_only_total}\n`);
    return 0;
  }
  atomicWrite(OUT_JSON_PATH, JSON.stringify(out, null, 2));
  atomicWrite(OUT_MD_PATH, md);
  process.stdout.write(
    `inventory: wrote ${OUT_MD_PATH} and ${OUT_JSON_PATH}\n` +
    `  existing=${stats.existing_total}  wired=${stats.existing_wired}  orphaned=${stats.existing_orphaned}\n` +
    `  planned-only=${stats.planned_only_total}  declared-existing=${stats.declared_existing_count}\n`
  );
  // Top stages by total
  const top = Object.entries(out.stage_counts).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  process.stdout.write(`  top stages: ${top.map(([s, c]) => `${s}=${c.total}`).join(", ")}\n`);
  return 0;
}

/**
 * Escape characters that break Markdown table cells. `|` is the cell delimiter
 * and `` ` `` can mis-pair backticks. Strips literal newlines (replace with
 * space) since markdown tables are single-line per row. Pure.
 */
export function mdCellEscape(s) {
  if (s == null) return "";
  return String(s)
    .replace(/\|/g, "\\|")
    .replace(/`/g, "\\`")
    .replace(/[\r\n]+/g, " ");
}

function atomicWrite(p, content) {
  const tmp = `${p}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, content + (content.endsWith("\n") ? "" : "\n"));
  try {
    fs.renameSync(tmp, p);
  } catch (err) {
    // Clean up the tmp file so we don't leak orphans (Windows EBUSY/EPERM
    // when another process holds the target file).
    try { fs.unlinkSync(tmp); } catch { /* tmp already gone */ }
    throw err;
  }
}

function parseArgs(argv) {
  const out = { noWrite: false, json: false, help: false, selfTest: false };
  for (const a of argv) {
    if (a === "--no-write") out.noWrite = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--self-test") out.selfTest = true;
  }
  return out;
}

// ─── Self-test (inline assertions) ───────────────────────────────────────────

function runSelfTest() {
  let pass = 0, fail = 0;
  function check(name, cond) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else      { fail++; console.log(`  ✗ ${name}`); }
  }

  // ── mapEventToStage ──
  check("mapEventToStage: SessionStart → session-bootstrap", mapEventToStage("SessionStart") === "session-bootstrap");
  check("mapEventToStage: UserPromptSubmit → prompt-ingestion", mapEventToStage("UserPromptSubmit") === "prompt-ingestion");
  check("mapEventToStage: PreToolUse → pre-action-gate", mapEventToStage("PreToolUse") === "pre-action-gate");
  check("mapEventToStage: PostToolUse → post-action-observe", mapEventToStage("PostToolUse") === "post-action-observe");
  check("mapEventToStage: SubagentStart → subagent-lifecycle", mapEventToStage("SubagentStart") === "subagent-lifecycle");
  check("mapEventToStage: SubagentStop → subagent-lifecycle", mapEventToStage("SubagentStop") === "subagent-lifecycle");
  check("mapEventToStage: Stop → session-teardown", mapEventToStage("Stop") === "session-teardown");
  check("mapEventToStage: PreCompact → context-handoff", mapEventToStage("PreCompact") === "context-handoff");
  check("mapEventToStage: garbage → unknown", mapEventToStage("zzz") === "unknown");
  check("mapEventToStage: undefined → unknown", mapEventToStage(undefined) === "unknown");

  // ── classifyHook ──
  {
    // Happy: single event
    const r = classifyHook({ id: "h1", events: [{ event: "PreToolUse", matcher: "Bash" }] });
    check("classifyHook: single PreToolUse → pre-action-gate", r.primary_stage === "pre-action-gate" && r.all_stages.length === 1);
  }
  {
    // Happy: 2 layers of same event (user+project) → 1 stage, event_count=2
    const r = classifyHook({
      id: "h2",
      events: [
        { event: "PreToolUse", matcher: "Edit", layer: "user" },
        { event: "PreToolUse", matcher: "Edit", layer: "project" },
      ],
    });
    check("classifyHook: dual-layer same event → 1 stage", r.all_stages.length === 1 && r.event_count === 2);
  }
  {
    // Fan-out: hook wired to multiple distinct events
    const r = classifyHook({
      id: "h3",
      events: [
        { event: "PreToolUse" },
        { event: "PostToolUse" },
      ],
    });
    check("classifyHook: fan-out across events → 2 stages",
      r.all_stages.includes("pre-action-gate") && r.all_stages.includes("post-action-observe"));
  }
  {
    // PRECEDENCE: PostToolUse listed first, but PreToolUse should win primary
    // (P1.1 fix — primary_stage must not depend on events[] array order).
    const r = classifyHook({
      id: "auto-lint-post-edit",
      events: [
        { event: "PostToolUse" },
        { event: "PostToolUse" },
        { event: "PreToolUse" },
        { event: "PreToolUse" },
      ],
    });
    check("classifyHook: precedence — PreToolUse beats PostToolUse for primary regardless of order",
      r.primary_stage === "pre-action-gate" &&
      r.all_stages.includes("post-action-observe"));
  }
  {
    // PRECEDENCE: Stop > SessionStart
    const r = classifyHook({
      id: "h",
      events: [{ event: "SessionStart" }, { event: "Stop" }],
    });
    check("classifyHook: precedence — Stop beats SessionStart for primary",
      r.primary_stage === "session-teardown");
  }
  {
    // Empty events on a regular hook → unknown
    const r = classifyHook({ id: "orphan", events: [] });
    check("classifyHook: empty events on regular hook → unknown", r.primary_stage === "unknown" && r.event_count === 0);
  }
  {
    // INFRASTRUCTURE: _envelope-style shim → "infrastructure" not "unknown"
    const r = classifyHook({ id: "_envelope", events: [] });
    check("classifyHook: _envelope shim → infrastructure", r.primary_stage === "infrastructure");
  }
  {
    // INFRASTRUCTURE: *-bundle hosts → "infrastructure" not "unknown"
    const r = classifyHook({ id: "edit-bundle", events: [] });
    check("classifyHook: edit-bundle host → infrastructure", r.primary_stage === "infrastructure");
  }
  {
    // Adversarial: null / non-object
    check("classifyHook: null → unknown", classifyHook(null).primary_stage === "unknown");
    check("classifyHook: missing events → unknown", classifyHook({ id: "x" }).primary_stage === "unknown");
    check("classifyHook: malformed event entry → skipped",
      classifyHook({ id: "x", events: [null, undefined, { event: "Stop" }] }).primary_stage === "session-teardown");
  }

  // ── isInfrastructureHook ──
  check("isInfrastructureHook: _-prefix → true", isInfrastructureHook({ id: "_envelope" }) === true);
  check("isInfrastructureHook: -bundle suffix → true", isInfrastructureHook({ id: "posttool-edit-bundle" }) === true);
  check("isInfrastructureHook: viaBundle event → true",
    isInfrastructureHook({ id: "auto-lint", events: [{ event: "PostToolUse", viaBundle: "posttool-edit-bundle" }] }) === true);
  check("isInfrastructureHook: plain hook → false", isInfrastructureHook({ id: "agent-boundary-guard", events: [{ event: "PreToolUse" }] }) === false);
  check("isInfrastructureHook: null → false", isInfrastructureHook(null) === false);

  // ── mdCellEscape ──
  check("mdCellEscape: pipe escaped", mdCellEscape("foo | bar") === "foo \\| bar");
  check("mdCellEscape: backtick escaped", mdCellEscape("has `tick`") === "has \\`tick\\`");
  check("mdCellEscape: newline → space", mdCellEscape("line\nbreak") === "line break");
  check("mdCellEscape: null → empty string", mdCellEscape(null) === "");
  check("mdCellEscape: undefined → empty string", mdCellEscape(undefined) === "");

  // ── inferPlannedStage ──
  check("inferPlannedStage: acp-ms0-gate → pre-action-gate", inferPlannedStage("acp-ms0-gate") === "pre-action-gate");
  check("inferPlannedStage: foo-precompact → context-handoff", inferPlannedStage("foo-precompact") === "context-handoff");
  check("inferPlannedStage: stop-on-x → session-teardown", inferPlannedStage("stop-on-x") === "session-teardown");
  check("inferPlannedStage: subagent-verify → subagent-lifecycle", inferPlannedStage("subagent-verify") === "subagent-lifecycle");
  check("inferPlannedStage: posttool-bar → post-action-observe", inferPlannedStage("posttool-bar") === "post-action-observe");
  check("inferPlannedStage: prompt-ingest-foo → prompt-ingestion", inferPlannedStage("prompt-ingest-foo") === "prompt-ingestion");
  check("inferPlannedStage: random-name → unknown", inferPlannedStage("random-name") === "unknown");

  // ── buildHookRecord ──
  {
    const entry = {
      id: "test-hook",
      file: ".claude/hooks/test-hook.mjs",
      wired: true,
      disabled: false,
      events: [
        { event: "PreToolUse", matcher: "Edit", layer: "user" },
        { event: "PreToolUse", matcher: "Edit", layer: "project" },
      ],
      description: "A test hook",
      descriptionInferred: false,
      tier: "T1",
      sizeBytes: 100,
      lines: 50,
    };
    const rec = buildHookRecord(entry);
    check("buildHookRecord: kind=existing", rec.kind === "existing");
    check("buildHookRecord: id preserved", rec.id === "test-hook");
    check("buildHookRecord: wired=true", rec.wired === true);
    check("buildHookRecord: event names deduplicated", rec.events.length === 1 && rec.events[0] === "PreToolUse");
    check("buildHookRecord: registration_count=2", rec.registration_count === 2);
    check("buildHookRecord: primary_stage=pre-action-gate", rec.primary_stage === "pre-action-gate");
    check("buildHookRecord: declared_by=null until planned merge", rec.declared_by === null);
  }
  {
    // Orphaned (zero events)
    const rec = buildHookRecord({
      id: "orphan",
      file: ".claude/hooks/orphan.mjs",
      wired: false,
      events: [],
      sizeBytes: 50,
      lines: 10,
    });
    check("buildHookRecord: orphan → primary_stage=unknown", rec.primary_stage === "unknown");
    check("buildHookRecord: orphan → wired=false", rec.wired === false);
  }

  // ── extractPlannedHooks ──
  {
    const milestones = [
      {
        id: "A-MS0",
        envelope: {
          forge_triple: { protective_hook: "a-ms0-gate" },
          feature_cascade: { new_hooks: ["a-ms0-gate", "extra-helper"] },
          status: "not_started",
        },
      },
      {
        id: "B-MS0",
        envelope: {
          forge_triple: { protective_hook: "a-ms0-gate" }, // duplicate across milestones
          status: "in_progress",
        },
      },
    ];
    const planned = extractPlannedHooks(milestones);
    check("extractPlannedHooks: dedup by name → 2 unique", planned.length === 2);
    const gate = planned.find((p) => p.id === "a-ms0-gate");
    check("extractPlannedHooks: cross-milestone declared_by collected",
      gate && gate.declared_by.length === 2 &&
      gate.declared_by.map((d) => d.milestone).sort().join(",") === "A-MS0,B-MS0");
    check("extractPlannedHooks: kind=planned", gate && gate.kind === "planned");
    check("extractPlannedHooks: primary_stage inferred (gate → pre-action-gate)",
      gate && gate.primary_stage === "pre-action-gate");
  }
  {
    // Failure modes
    check("extractPlannedHooks: empty array → []", extractPlannedHooks([]).length === 0);
    check("extractPlannedHooks: malformed envelope skipped",
      extractPlannedHooks([{ id: "X", envelope: null }]).length === 0);
  }
  {
    // Object-shape new_hooks entries (P1.3 fix — SCENARIO-TEST-MS0 form)
    const m = [{
      id: "ST-MS0",
      envelope: {
        feature_cascade: {
          new_hooks: [
            { name: "obj-hook", file: ".claude/hooks/obj-hook.mjs", built_in: "U-X1" },
            { hook: "obj-hook-alt" },
            { id: "obj-hook-by-id" },
            "string-form",
            null,             // adversarial — must skip
            { /* no name */ }, // adversarial — must skip
          ],
        },
        status: "not_started",
      },
    }];
    const planned = extractPlannedHooks(m);
    const names = planned.map((p) => p.id).sort();
    check("extractPlannedHooks: accepts object form {name}", names.includes("obj-hook"));
    check("extractPlannedHooks: accepts object form {hook}", names.includes("obj-hook-alt"));
    check("extractPlannedHooks: accepts object form {id}", names.includes("obj-hook-by-id"));
    check("extractPlannedHooks: accepts string form alongside objects", names.includes("string-form"));
    check("extractPlannedHooks: rejects null/empty-object entries",
      names.length === 4 && !names.includes(null) && !names.includes(""));
  }
  {
    // Empty / whitespace protective_hook (P2-B fix)
    const m = [{ id: "X", envelope: { forge_triple: { protective_hook: "   " }, status: "in_progress" } }];
    check("extractPlannedHooks: whitespace-only protective_hook skipped",
      extractPlannedHooks(m).length === 0);
  }
  {
    // Non-string status (P2.4 fix — defensive coerce)
    const m = [{ id: "X", envelope: { forge_triple: { protective_hook: "test-gate" }, status: { current: "weird" } } }];
    const planned = extractPlannedHooks(m);
    check("extractPlannedHooks: non-string status → 'unknown'",
      planned.length === 1 && planned[0].declared_by[0].status === "unknown");
  }

  // ── mergePlannedHooks ──
  {
    const existing = [
      buildHookRecord({ id: "live-hook", file: "f", wired: true, events: [{ event: "Stop" }] }),
    ];
    const planned = [
      { kind: "planned", id: "live-hook", declared_by: [{ milestone: "M1", status: "completed" }],
        primary_stage: "session-teardown", all_stages: ["session-teardown"], events: [], wired: false,
        disabled: false, description: "", description_inferred: true, tier: null, file: null,
        registration_count: 0, size_bytes: 0, lines: 0 },
      { kind: "planned", id: "future-hook", declared_by: [{ milestone: "M2", status: "not_started" }],
        primary_stage: "pre-action-gate", all_stages: ["pre-action-gate"], events: [], wired: false,
        disabled: false, description: "", description_inferred: true, tier: null, file: null,
        registration_count: 0, size_bytes: 0, lines: 0 },
    ];
    const merged = mergePlannedHooks(existing, planned);
    check("mergePlannedHooks: declared-existing count=1", merged.declared_existing_count === 1);
    check("mergePlannedHooks: planned_only.length=1", merged.planned_only.length === 1);
    check("mergePlannedHooks: existing[0].declared_by populated",
      Array.isArray(merged.existing[0].declared_by) && merged.existing[0].declared_by[0].milestone === "M1");
    check("mergePlannedHooks: future-hook in planned_only",
      merged.planned_only[0].id === "future-hook");
    // P1.5 fix — verify the declared_by array is a fresh copy (mutating
    // planned[].declared_by must not bleed into existing[].declared_by)
    planned[0].declared_by.push({ milestone: "POISON", status: "x" });
    check("mergePlannedHooks: declared_by is a copy (no leakage from planned input)",
      merged.existing[0].declared_by.length === 1 &&
      merged.existing[0].declared_by[0].milestone === "M1");
  }

  // ── groupByStage ──
  {
    const recs = [
      { id: "a", primary_stage: "pre-action-gate", kind: "existing" },
      { id: "b", primary_stage: "session-teardown", kind: "existing" },
      { id: "c", primary_stage: "pre-action-gate", kind: "planned" },
    ];
    const g = groupByStage(recs);
    check("groupByStage: 2 in pre-action-gate", g["pre-action-gate"].length === 2);
    check("groupByStage: 1 in session-teardown", g["session-teardown"].length === 1);
    check("groupByStage: sorted alpha", g["pre-action-gate"][0].id === "a" && g["pre-action-gate"][1].id === "c");
    check("groupByStage: every stage key present", STAGES_DISPLAY_ORDER.every((s) => Array.isArray(g[s])));
  }

  // ── renderMarkdown ──
  {
    const recs = [
      { kind: "existing", id: "alpha", file: ".claude/hooks/alpha.mjs", wired: true, disabled: false,
        description: "alpha hook", tier: "T0", events: ["PreToolUse"], primary_stage: "pre-action-gate",
        all_stages: ["pre-action-gate"], registration_count: 1, size_bytes: 100, lines: 10, declared_by: null,
        description_inferred: false },
      { kind: "planned", id: "beta-gate", file: null, wired: false, disabled: false,
        description: "planned", tier: null, events: [], primary_stage: "pre-action-gate",
        all_stages: ["pre-action-gate"], registration_count: 0, size_bytes: 0, lines: 0,
        declared_by: [{ milestone: "M1", status: "not_started" }], description_inferred: true },
    ];
    const stats = { existing_total: 1, existing_wired: 1, existing_orphaned: 0, existing_disabled: 0,
                    planned_only_total: 1, declared_existing_count: 0 };
    const md = renderMarkdown(recs, stats, "2026-01-01T00:00:00Z");
    check("renderMarkdown: has title", md.includes("# Hook Definitions Inventory"));
    check("renderMarkdown: has stage totals", md.includes("## Stage totals"));
    check("renderMarkdown: alpha row present", md.includes("`alpha`"));
    check("renderMarkdown: beta-gate row present", md.includes("`beta-gate`"));
    check("renderMarkdown: pipes escaped (no raw pipes inside cell text)",
      !md.includes("|alpha|") || md.includes("`alpha`"));
    check("renderMarkdown: existing-wired count rendered", md.includes("wired: 1"));
    check("renderMarkdown: planned-only count rendered", md.includes("Planned hooks") && md.includes("1"));
  }
  {
    // P1-A coverage — actually verify a `|` inside description gets escaped.
    const recs = [{
      kind: "existing", id: "ev-hook", file: ".claude/hooks/ev-hook.mjs", wired: true, disabled: false,
      description: "foo | bar", tier: "T1", events: ["PreToolUse"], primary_stage: "pre-action-gate",
      all_stages: ["pre-action-gate"], registration_count: 1, size_bytes: 0, lines: 0, declared_by: null,
      description_inferred: false,
    }];
    const md = renderMarkdown(recs, { existing_total: 1, existing_wired: 1, existing_orphaned: 0,
                                       existing_disabled: 0, planned_only_total: 0, declared_existing_count: 0 },
                              "2026-01-01T00:00:00Z");
    check("renderMarkdown: description pipe escaped to \\|", md.includes("foo \\| bar"));
    check("renderMarkdown: raw 'foo | bar' substring absent", !md.includes("foo | bar"));
  }

  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  return fail === 0;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const herePath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath && invokedPath === herePath) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`inventory-hook-definitions.mjs — ACP-MS0/P0-U02

Usage:
  node scripts/inventory-hook-definitions.mjs              # write inventory
  node scripts/inventory-hook-definitions.mjs --no-write   # preview
  node scripts/inventory-hook-definitions.mjs --json       # machine-readable to stdout
  node scripts/inventory-hook-definitions.mjs --self-test  # run inline assertions
`);
    process.exit(0);
  }
  if (argv.includes("--self-test")) {
    process.exit(runSelfTest() ? 0 : 3);
  }
  main(argv).then((code) => process.exit(code || 0)).catch((err) => {
    process.stderr.write(`inventory-hook-definitions: ${err.stack || err}\n`);
    process.exit(1);
  });
}
