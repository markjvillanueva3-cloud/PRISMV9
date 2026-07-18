#!/usr/bin/env node
// scripts/fleet-phd-continuity.mjs
// FLEET-PHD-CONTINUITY (U-PHD-DRIVER, slot:zulu, 2026-06-27)
// Read-mostly campaign-progress driver for the 16 FLEET-PHD-BUILDOUT domain plans.
// It actuates NOTHING (no SendKeys, no plan writes, no task registration) -- it OBSERVES:
// parses the 16 plans, joins live signals (task health, galaxy-dir commits, deepening-
// artifact mtime, loop tick), classifies each domain advancing|stalled|blocked|done, and
// writes a JSON + MD dashboard + a throttled chat-bus nudge. Composes existing tooling
// (fleet-task-health-watch --json, git log, the per-galaxy synthesis artifacts); fail-soft
// per source so a slow/absent signal never crashes the run. Spec:
// state/shared/specs/FLEET-PHD-CONTINUITY-2026-06-27.md
//
// Usage: node scripts/fleet-phd-continuity.mjs [--json|--md-only|--dry-run|--no-chatbus]
import { readFileSync, writeFileSync, statSync, existsSync, readdirSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { parsePlan } from "./lib/phd-plan-parse.mjs";
import { classifyDomain } from "./lib/phd-stall-classify.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const PLANS_DIR = join(ROOT, "state", "shared", "domain-plans");
const DASH_DIR = join(ROOT, "state", "shared", "dashboards");
const SYNTH_DIR = join(ROOT, "knowledge", "memories", "patterns");
const CHATBUS = join(ROOT, "state", "shared", "AGENT_CHAT.md");
const JSON_OUT = join(DASH_DIR, "FLEET-PHD-CONTINUITY.json");
const MD_OUT = join(DASH_DIR, "FLEET-PHD-CONTINUITY.md");
const THROTTLE_SIDECAR = join(DASH_DIR, ".phd-continuity-chatbus.json");
const SCHEMA = "1.0.0";
const HOUR_MS = 3.6e6;

const ENV = process.env;
const num = (k, d) => {
  const v = parseFloat(ENV[k]);
  return Number.isFinite(v) ? v : d;
};
const OPTS = {
  noProgressHrs: num("PRISM_PHD_STALL_NOPROGRESS_HRS", 72),
  artifactMult: num("PRISM_PHD_STALL_ARTIFACT_MULT", 2),
  loopTickHrs: num("PRISM_PHD_LOOPTICK_HRS", 24),
};
const CADENCE_HRS = num("PRISM_PHD_CADENCE_HRS", 72);
const CHATBUS_THROTTLE_HRS = num("PRISM_PHD_CHATBUS_THROTTLE_HRS", 6);
const TASKHEALTH_TIMEOUT_MS = num("PRISM_PHD_TASKHEALTH_TIMEOUT_MS", 25000);
// The fleet-task-health audit appends a full-task-list row here every run (cron + Stop
// hook), so we READ it instead of spawning the probe -- the probe holds a singleton lock
// that the running cron contends, which can hang a fresh spawn. Spawn is the fallback only.
const TASKHEALTH_HISTORY = join(ROOT, "state", "shared", "fleet-task-health-history.jsonl");
const TASKHEALTH_MAX_AGE_MIN = num("PRISM_PHD_TASKHEALTH_MAX_AGE_MIN", 90);

// Per-slot named deepening task for the task-health join (else fall back to Galaxy Mine).
// VERIFIED against live `fleet-task-health-watch --json classified[]` (2026-06-27): each name
// below is registered. charlie's "PRISM Quoting Pipeline" is NOT registered -> charlie falls
// back to its live "PRISM Galaxy Mine (quoting)". xray's OCR loop is HEALTHY (not elevation-
// blocked as an earlier second-hand spec claimed), so no elevation hardcode.
const DOMAIN_TASK = {
  xray: { name: "PRISM OCR Training Loop" },
  delta: { name: "PRISM CAD Gen Loop" },
  india: { name: "PRISM NN-Graph Retrain" },
  oscar: { name: "PRISM SFC Variability Batch Mill" },
  kilo: { name: "PRISM CAM Tool Library Regen" },
  zulu: { name: "PRISM Zulu Build Loop" }, // hermes-zulu deepens via the build loop, not a galaxy mine
  sierra: { name: "PRISM System-Viz Re-walk Daily" }, // system-viz deepens via the daily re-walk
  // frontend-app has 0 AI engines + no galaxy-mine task by design -- it deepens via per-slot
  // /loop page-build (the Kienzle rollout) whose commits land in mcp-server/web/, NOT the engine
  // galaxyDir. loopDeepened => never flagged cron-dead for a (correctly) absent mine task.
  quebec: { name: null, loopDeepened: true, commitDir: "mcp-server/web" },
};
// Statuses (normalized) that mean a continuity loop is genuinely broken (not expected-disabled).
const BROKEN_TASK = new Set(["stale", "failing", "never-ran"]);

const nowMs = () => Date.now();
const hoursSince = (ms) => (ms == null ? null : (nowMs() - ms) / HOUR_MS);

/** Build a name -> {status, lastRunTime} map from a per-task array. */
function taskMapFrom(tasks) {
  const map = new Map();
  for (const t of tasks || []) {
    if (t && t.name) map.set(t.name, { status: String(t.status || "unknown"), lastRunTime: t.lastRunTime || null });
  }
  return map;
}

/** Fast path: read the last full-task-list row from the audit history (no spawn, no lock). */
function readTaskHealthFromHistory() {
  try {
    if (!existsSync(TASKHEALTH_HISTORY)) return null;
    const ageMin = (nowMs() - statSync(TASKHEALTH_HISTORY).mtimeMs) / 60000;
    if (ageMin > TASKHEALTH_MAX_AGE_MIN) return null; // too stale -> let the spawn fallback try
    const txt = readFileSync(TASKHEALTH_HISTORY, "utf8").trim();
    if (!txt) return null;
    const lines = txt.split("\n");
    const last = JSON.parse(lines[lines.length - 1]);
    const tasks = Array.isArray(last.tasks) ? last.tasks : Array.isArray(last.classified) ? last.classified : [];
    const map = taskMapFrom(tasks);
    return map.size ? { map, ok: true, source: "history", ageMin: Math.round(ageMin) } : null;
  } catch {
    return null;
  }
}

/**
 * Fallback: spawn fleet-task-health-watch --once --json (SIGKILL-capped so it can never
 * hang on the singleton lock). The script EXITS 1 when level=warn (degraded present), so the
 * JSON arrives via `e.stdout`. Per-task list is top-level `classified[]` (or `row.tasks`).
 */
function readTaskHealthSpawn() {
  const args = [join(ROOT, "scripts", "fleet-task-health-watch.mjs"), "--once", "--json"];
  const exec = {
    cwd: ROOT,
    timeout: TASKHEALTH_TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: 96 * 1024 * 1024,
    encoding: "utf8",
    windowsHide: true,
  };
  let out = "";
  try {
    out = execFileSync("node", args, exec);
  } catch (e) {
    out = e && e.stdout ? String(e.stdout) : "";
    if (!out) return { map: new Map(), ok: false, error: (e && e.message) || "spawn-failed" };
  }
  try {
    const start = out.indexOf("{");
    const parsed = JSON.parse(start >= 0 ? out.slice(start) : out);
    const rows = Array.isArray(parsed.classified)
      ? parsed.classified
      : parsed.row && Array.isArray(parsed.row.tasks)
        ? parsed.row.tasks
        : [];
    const map = taskMapFrom(rows);
    return { map, ok: map.size > 0, source: "spawn" };
  } catch (e) {
    return { map: new Map(), ok: false, error: (e && e.message) || "parse-failed" };
  }
}

/** Task-health: prefer the fresh audit-history row; spawn only if history is stale/absent. */
function readTaskHealth() {
  return readTaskHealthFromHistory() || readTaskHealthSpawn();
}

/** Map a fleet-task-health status string into the classify vocabulary. */
function normalizeHealth(s) {
  const x = String(s || "").toLowerCase();
  if (x.includes("stale")) return "stale";
  if (x.includes("fail") || x.includes("error") || x.includes("critical")) return "failing";
  if (x.includes("disabled")) return "disabled";
  if (x.includes("never")) return "never-ran";
  if (x.includes("healthy") || x === "ok" || x === "ran" || x.includes("pressure")) return "healthy";
  return "unknown";
}

/**
 * Count commits touching galaxyDir since sinceIso (fail-soft 0). On the shared tree EVERY
 * slot commits, so when `slot` is given we scope to the OWNING slot's commits (`slot:<slot>`
 * in the subject) -- otherwise a peer's [MAIN-FORCE] catch-up sweep touching this engine dir
 * would mask a dead deepening loop as "advancing" (the false-negative direction).
 */
function gitCommitCount(galaxyDir, sinceIso, slot) {
  try {
    const args = ["-C", ROOT, "log", "--oneline", `--since=${sinceIso}`];
    if (slot) args.push(`--grep=slot:${slot}`);
    args.push("--", galaxyDir);
    const out = execFileSync("git", args, { encoding: "utf8", timeout: 25000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
    return out.split("\n").filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

/** The per-galaxy deepening artifact (synthesis md); mtime is the freshness signal. */
function artifactFor(galaxy) {
  const path = join(SYNTH_DIR, `${galaxy}_synthesis.md`);
  if (existsSync(path)) {
    try {
      return { present: true, ageHrs: hoursSince(statSync(path).mtimeMs), path };
    } catch {
      /* fall through */
    }
  }
  return { present: false, ageHrs: null, path };
}

/** Best-effort last loop-tick age for a slot (null if no loop-state on disk). */
function loopTickHrsFor(slot) {
  const dir = join(ROOT, "state", "shared", "loop-state");
  if (!existsSync(dir)) return null;
  try {
    let newest = null;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      if (!f.includes(slot)) continue;
      const m = statSync(join(dir, f)).mtimeMs;
      if (newest == null || m > newest) newest = m;
    }
    return hoursSince(newest);
  } catch {
    return null;
  }
}

function buildDomain(text, taskHealth, sinceIso) {
  const plan = parsePlan(text);
  if (!plan.slot) return null;
  const spec = DOMAIN_TASK[plan.slot];
  // A loop-deepened domain's activity may live outside its engine galaxyDir (e.g. quebec works
  // in mcp-server/web/, not engines/frontend-app/) -- count commits in its real work dir.
  const commitDir = (spec && spec.commitDir) || plan.galaxyDir;
  const commits72h = commitDir ? gitCommitCount(commitDir, sinceIso, plan.slot) : 0;
  const art = plan.galaxy ? artifactFor(plan.galaxy) : { present: false, ageHrs: null, path: null };

  const taskName = spec ? spec.name : plan.galaxy ? `PRISM Galaxy Mine (${plan.galaxy})` : null;
  let taskStatus = null;
  if (taskName && taskHealth.map.has(taskName)) {
    taskStatus = normalizeHealth(taskHealth.map.get(taskName).status);
  } else if (taskName && taskHealth.ok) {
    // probe enumerated all registered tasks and this one is absent -> genuinely spec-only
    taskStatus = "spec-only";
  } else {
    taskStatus = null; // probe unavailable -> unknown (classify treats as no signal)
  }

  const joins = {
    taskName,
    taskStatus,
    artifactPresent: art.present,
    artifactAgeHrs: art.ageHrs,
    cadenceHrs: CADENCE_HRS,
    commits72h,
    commitDir, // the dir actually counted (web/ for quebec) -- so the reason label is honest
    loopTickHrs: loopTickHrsFor(plan.slot),
    loopDeepened: !!(spec && spec.loopDeepened),
  };
  const v = classifyDomain(plan, joins, OPTS);
  return {
    slot: plan.slot,
    galaxy: plan.galaxy,
    planStatus: plan.status,
    galaxyDir: plan.galaxyDir,
    task: taskName,
    taskStatus: taskStatus || "unknown",
    artifactPath: art.path ? art.path.replace(ROOT + "\\", "").replace(ROOT + "/", "") : null,
    artifactAgeHrs: art.ageHrs != null ? Math.round(art.ageHrs) : null,
    commits72h,
    loopTickHrs: joins.loopTickHrs != null ? Math.round(joins.loopTickHrs) : null,
    acceptanceTargets: plan.acceptanceTargets,
    status: v.status,
    reason: v.reason,
    nextAction: v.nextAction,
    acceptance: v.acceptance,
  };
}

function summarize(domains) {
  const s = { advancing: 0, stalled: 0, blocked: 0, done: 0 };
  for (const d of domains) {
    if (d.status.startsWith("stalled")) s.stalled += 1;
    else if (d.status.startsWith("blocked")) s.blocked += 1;
    else if (d.status === "done") s.done += 1;
    else if (d.status === "advancing") s.advancing += 1;
  }
  return s;
}

function staleLoopsFrom(taskHealth) {
  const out = [];
  if (!taskHealth.ok) return out;
  for (const [name, row] of taskHealth.map) {
    const st = normalizeHealth(row.status);
    if (BROKEN_TASK.has(st)) out.push({ task: name, status: st, lastRunTime: row.lastRunTime });
  }
  return out.sort((a, b) => a.task.localeCompare(b.task));
}

function buildModel(domains, taskHealth) {
  const staleLoops = staleLoopsFrom(taskHealth);
  const repairs = [];
  for (const sl of staleLoops) {
    repairs.push(`operator: re-kick "${sl.task}" (Start-ScheduledTask, or install-fleet-phd-continuity-task.ps1 -RekickStale)`);
  }
  for (const d of domains.filter((x) => x.status === "blocked:elevation")) {
    repairs.push(`operator: re-register "${d.task}" from an elevated shell (unblocks ${d.slot} deepening)`);
  }
  return {
    schemaVersion: SCHEMA,
    generatedAt: new Date().toISOString(),
    taskHealthAvailable: taskHealth.ok,
    summary: summarize(domains),
    staleLoops,
    repairs,
    domains: domains.sort((a, b) => a.slot.localeCompare(b.slot)),
  };
}

function renderMd(model) {
  const L = [];
  L.push("# FLEET-PHD-BUILDOUT - Campaign Continuity Dashboard");
  L.push("");
  L.push(`> Generated ${model.generatedAt} by \`scripts/fleet-phd-continuity.mjs\` (read-only observer).`);
  L.push(`> Task-health probe: ${model.taskHealthAvailable ? "live" : "UNAVAILABLE (statuses shown as unknown)"}.`);
  L.push("");
  const s = model.summary;
  L.push(`**Summary:** advancing ${s.advancing} | stalled ${s.stalled} | blocked ${s.blocked} | done ${s.done} (of ${model.domains.length})`);
  L.push("");
  if (model.repairs.length) {
    L.push("## Operator repairs (one-time)");
    for (const r of model.repairs) L.push(`- ${r}`);
    L.push("");
  }
  if (model.staleLoops.length) {
    L.push("## Stale continuity loops");
    for (const sl of model.staleLoops) L.push(`- **${sl.task}** = ${sl.status} (last run ${sl.lastRunTime || "?"})`);
    L.push("");
  }
  L.push("## Per-domain");
  L.push("");
  L.push("| Slot | Galaxy | Status | Plan | Task / health | Commits 72h | Next action |");
  L.push("|------|--------|--------|------|---------------|-------------|-------------|");
  for (const d of model.domains) {
    L.push(
      `| ${d.slot} | ${d.galaxy} | ${d.status} | ${d.planStatus} | ${d.task || "-"} / ${d.taskStatus} | ${d.commits72h} | ${d.nextAction} |`
    );
  }
  L.push("");
  L.push("_Disable chat-bus posts: `--no-chatbus`. Knobs: `PRISM_PHD_STALL_*`, `PRISM_PHD_CADENCE_HRS`, `PRISM_PHD_CHATBUS_THROTTLE_HRS`._");
  return L.join("\n") + "\n";
}

function readJsonSafe(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

/** Append one chat-bus line per NEWLY-stalled domain, throttled per slot. Fail-soft. */
function postChatbus(model) {
  const prior = readJsonSafe(JSON_OUT, { domains: [] });
  const priorStatus = new Map((prior.domains || []).map((d) => [d.slot, d.status]));
  const throttle = readJsonSafe(THROTTLE_SIDECAR, {});
  const now = nowMs();
  const lines = [];
  for (const d of model.domains) {
    const isStalled = d.status.startsWith("stalled");
    const was = priorStatus.get(d.slot);
    const newlyStalled = isStalled && was !== d.status; // transition (incl first-seen)
    if (!newlyStalled) continue;
    const last = throttle[d.slot] || 0;
    if (now - last < CHATBUS_THROTTLE_HRS * HOUR_MS) continue;
    lines.push(`[FLEET-PHD] ${d.slot}/${d.galaxy} ${d.status}: ${d.reason} -> ${d.nextAction}`);
    throttle[d.slot] = now;
  }
  if (!lines.length) return 0;
  try {
    appendFileSync(CHATBUS, "\n" + lines.join("\n") + "\n", "utf8");
    writeFileSync(THROTTLE_SIDECAR, JSON.stringify(throttle, null, 2), "utf8");
  } catch {
    /* advisory only */
  }
  return lines.length;
}

export function run(argv = []) {
  const flags = new Set(argv);
  const dryRun = flags.has("--dry-run");
  const mdOnly = flags.has("--md-only");
  const noChatbus = flags.has("--no-chatbus") || dryRun || mdOnly;

  const sinceIso = new Date(nowMs() - OPTS.noProgressHrs * HOUR_MS).toISOString();
  const taskHealth = readTaskHealth();

  let files = [];
  try {
    files = readdirSync(PLANS_DIR).filter((f) => /^DOMAIN-PLAN-.*\.md$/.test(f));
  } catch (e) {
    console.error(`[phd-continuity] cannot read plans dir ${PLANS_DIR}: ${e && e.message}`);
    return { ok: false, error: "no-plans-dir" };
  }
  const domains = [];
  for (const f of files) {
    const built = buildDomain(readFileSync(join(PLANS_DIR, f), "utf8"), taskHealth, sinceIso);
    if (built) domains.push(built);
  }
  const model = buildModel(domains, taskHealth);

  if (!dryRun) {
    if (!mdOnly) writeFileSync(JSON_OUT, JSON.stringify(model, null, 2), "utf8");
    writeFileSync(MD_OUT, renderMd(model), "utf8");
  }
  const posted = noChatbus ? 0 : postChatbus(model);

  return { ok: true, model, posted, dryRun };
}

function main() {
  const argv = process.argv.slice(2);
  const res = run(argv);
  if (!res.ok) {
    process.exitCode = 1;
    return;
  }
  if (argv.includes("--md-only")) {
    process.stdout.write(renderMd(res.model));
  } else {
    const m = res.model;
    process.stdout.write(
      JSON.stringify(
        { schemaVersion: m.schemaVersion, generatedAt: m.generatedAt, taskHealthAvailable: m.taskHealthAvailable, summary: m.summary, staleLoops: m.staleLoops, repairs: m.repairs, posted: res.posted, dryRun: res.dryRun, domains: m.domains.map((d) => ({ slot: d.slot, galaxy: d.galaxy, status: d.status, nextAction: d.nextAction })) },
        null,
        2
      ) + "\n"
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
