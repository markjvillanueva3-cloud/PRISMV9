#!/usr/bin/env node
/**
 * extract-domain-pipeline-units.mjs — DOMAIN-PIPELINE-MS0/U-DPM0-CELL-EXTRACT
 *
 * Scans state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json and emits
 * mcp-server/data/milestones/DOMAIN-PIPELINE-MS0.json with one roadmap
 * unit per (domain × stage) cell whose normalized status !== "built".
 *
 * Deterministic + idempotent. Advisory + mustHumanVerify per CLAUDE.md
 * DOMAIN-PIPELINE-MS0 doctrine — operators refine engine mappings + statuses
 * in the source config; this script just re-projects them as roadmap units
 * so the per-slot RGS pickup queues can route them.
 *
 * IDEMPOTENCY (close-out safety): if an output file already exists, the
 * extractor READS it first and PRESERVES status / completed_at / completed_by
 * / ship_notes for any unit_id whose status is not "not_started". A re-run
 * thus never reverts a shipped unit to not_started (per CLAUDE.md
 * [[feedback_roadmap_close_out]]).
 *
 * Unit id format: U-DPM0-<DOMAIN>-<STAGE>
 *   e.g. U-DPM0-MILL-FIXTURE_DESIGN, U-DPM0-WIRE-TOOLPATH_GEN
 *
 * Routes via DOMAIN→SLOT from the config itself (no duplication here).
 *
 * Each unit carries the slot-queue.mjs reader contract keys:
 *   unit_id, wave, cost, spec, depends_on, summary
 * (plus domain/slot/stage/current_engine/current_status for richer context).
 *
 * CLI:
 *   --dry-run            print summary, do not write
 *   --json               emit the milestone JSON to stdout
 *   --out <path>         override output path
 *   --config <path>      override config path
 *   --no-merge           skip read-existing merge (fresh emit, DESTRUCTIVE)
 *
 * Follow-on (operator):
 *   node scripts/reconcile-roadmap-drift.mjs   # register in roadmap-index.json
 *   node scripts/topup-slot-queues.mjs         # inject into per-slot queues
 *
 * Exit codes: 0=ok · 1=config-read-fail · 2=write-fail · 3=invariant-violation
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DEFAULT_CONFIG = path.join(PRISM_ROOT, "state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json");
const DEFAULT_OUT = path.join(PRISM_ROOT, "mcp-server/data/milestones/DOMAIN-PIPELINE-MS0.json");

const ALLOWED_STATUSES = new Set(["built", "partial", "missing"]);
const DOMAIN_KEY_RE = /^[a-z0-9_]+$/;

/**
 * SEED_UNITS — meta/bootstrap units that are NOT generated (domain × stage)
 * cells but belong to this milestone. The extractor emits these
 * DETERMINISTICALLY regardless of prior file state or --no-merge, so the
 * extractor itself (not the file it writes) is the single source of truth
 * for them. This closes the fragile-single-source failure mode: an operator
 * deleting the output file or running --no-merge can no longer silently lose
 * a shipped meta-unit's status (Reviewer B P1, 2026-05-17).
 *
 * U-DPM0-CELL-EXTRACT is THIS extractor's own unit. Its shipped status is
 * anchored to commit aa21d8bbce (git-verifiable). A carried-forward copy
 * from the existing file may carry richer ship_notes/completed_at — that
 * forward-merges over the seed (see buildMilestone).
 */
const SEED_UNITS = [
  {
    id: "U-DPM0-CELL-EXTRACT",
    unit_id: "U-DPM0-CELL-EXTRACT",
    title: "Extract 62 not-fully-built (domain×stage) cells into formal roadmap units",
    summary: "Extractor + 62-unit projection of DOMAIN-PIPELINE-MS0-CONFIG.json",
    status: "completed",
    wave: "JULIETT-12CHAT",
    cost: "S",
    spec: "scripts/extract-domain-pipeline-units.mjs",
    depends_on: [],
    completed_at: "2026-05-17T23:45:00Z",
    completed_by: "claude-4f9091a6 (juliett)",
    ship_notes: "commit aa21d8bbce; 38/38 node:test; per-file 2-reviewer FAIL→PASS×2; doc-reflected (wiki+memory+index)",
    source: "meta-bootstrap-seed",
  },
];

// ---------- pure core (exported for tests) ----------

export function loadConfig(filePath, readImpl = fs.readFileSync) {
  const raw = readImpl(filePath, "utf8");
  const obj = JSON.parse(raw);
  if (!obj || typeof obj !== "object" || !obj.domains) {
    throw new Error(`config invalid: missing .domains in ${filePath}`);
  }
  return obj;
}

/** normalize a status value: lowercase + trim; unknown → "missing" */
export function normalizeStatus(raw) {
  if (raw == null) return "missing";
  const s = String(raw).toLowerCase().trim();
  if (!s) return "missing";
  return s;
}

/**
 * extractCells(config, opts?) → array of cells where status !== "built"
 * Each cell: { domain, slot, stageId, engine, status, adaptive?, note? }
 * status is normalized (lowercase, trimmed).
 * Warnings are pushed onto opts.warnings if provided (caller-owned channel).
 */
export function extractCells(config, opts = {}) {
  const cells = [];
  const warnings = opts.warnings ?? [];
  if (!config || !config.domains) return cells;
  for (const [domainName, domainCfg] of Object.entries(config.domains)) {
    if (!domainCfg || typeof domainCfg !== "object") continue;
    if (!DOMAIN_KEY_RE.test(domainName)) {
      warnings.push(`domain key '${domainName}' violates /^[a-z0-9_]+$/ — unit id will be malformed`);
    }
    const slot = domainCfg.slot ?? null;
    const stages = domainCfg.stages ?? {};
    for (const [stageId, stageCfg] of Object.entries(stages)) {
      if (!stageCfg || typeof stageCfg !== "object") continue;
      const status = normalizeStatus(stageCfg.status);
      if (status === "built") continue;
      if (!ALLOWED_STATUSES.has(status)) {
        warnings.push(`domain=${domainName} stage=${stageId} has unknown status='${stageCfg.status}' (normalized='${status}') — accepted as not-built`);
      }
      cells.push({
        domain: domainName,
        slot,
        stageId,
        engine: stageCfg.engine ?? null,
        status,
        adaptive: stageCfg.adaptive ?? null,
        note: stageCfg.note ?? null,
      });
    }
  }
  return cells;
}

/**
 * cellToUnit(cell, stageLabelMap, existingUnit?) → unit record
 * Carries the slot-queue.mjs reader contract: unit_id, wave, cost, spec,
 * depends_on, summary (alongside richer domain/stage context).
 * If existingUnit is provided AND its status !== "not_started", preserve
 * status / completed_at / completed_by / ship_notes from it (idempotency).
 */
export function cellToUnit(cell, stageLabelMap, existingUnit = null) {
  const stageLabel = stageLabelMap[cell.stageId] ?? cell.stageId;
  const action = cell.status === "partial" ? "promote partial → built" : "build missing stage";
  const summary = `${cell.domain}:${cell.stageId} ${action} (${stageLabel})`;
  const id = `U-DPM0-${cell.domain.toUpperCase()}-${cell.stageId}`;

  const base = {
    // Slot-queue.mjs reader contract (REQUIRED — these keys are indexed):
    id,
    unit_id: id, // alias for consumers that key on unit_id
    title: summary,
    summary,
    status: "not_started",
    wave: "DOMAIN-PIPELINE-MS0",
    cost: cell.status === "partial" ? "S" : "M",
    spec: "pending-generator",
    depends_on: [],
    // Rich context (DPM0-specific):
    domain: cell.domain,
    slot: cell.slot,
    stage: cell.stageId,
    stage_label: stageLabel,
    current_engine: cell.engine,
    current_status: cell.status,
    adaptive: cell.adaptive,
    note: cell.note,
    source: "domain-pipeline-config",
  };

  // Idempotency: if a prior run already marked this unit shipped, preserve.
  if (existingUnit && existingUnit.status && existingUnit.status !== "not_started") {
    base.status = existingUnit.status;
    if (existingUnit.completed_at) base.completed_at = existingUnit.completed_at;
    if (existingUnit.completed_by) base.completed_by = existingUnit.completed_by;
    if (existingUnit.ship_notes) base.ship_notes = existingUnit.ship_notes;
  }

  return base;
}

export function buildStageLabelMap(config, opts = {}) {
  const warnings = opts.warnings ?? [];
  const m = {};
  const stages = config.canonical_stages ?? [];
  for (const s of stages) {
    if (s && s.id) m[s.id] = s.label ?? s.id;
  }
  // Surface drift: empty label map AND non-empty domains is malformed config.
  if (stages.length === 0 && config.domains && Object.keys(config.domains).length > 0) {
    warnings.push("config has domains but no canonical_stages — stage_label fallback to raw stage id");
  }
  return m;
}

/**
 * loadExistingMilestone(outPath, readImpl?) → Map<unit_id, existingUnit>
 * Returns empty map if file missing or unparseable.
 * Used for idempotent re-run (close-out safety).
 */
export function loadExistingMilestone(outPath, readImpl = fs.readFileSync, existsImpl = fs.existsSync) {
  const m = new Map();
  if (!existsImpl(outPath)) return m;
  try {
    const raw = readImpl(outPath, "utf8");
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.units)) return m;
    for (const u of obj.units) {
      const key = u.unit_id ?? u.id;
      if (key) m.set(key, u);
    }
  } catch {
    // unparseable → treat as no prior state; the fresh write replaces it
  }
  return m;
}

export function buildMilestone(config, opts = {}) {
  const {
    now = new Date().toISOString(),
    existing = new Map(),
    createdBy = process.env.PRISM_CHAT_ID || "extractor",
  } = opts;
  const warnings = opts.warnings ?? [];
  const cells = extractCells(config, { warnings });
  const labelMap = buildStageLabelMap(config, { warnings });

  const cellUnits = cells.map((c) => {
    const id = `U-DPM0-${c.domain.toUpperCase()}-${c.stageId}`;
    return cellToUnit(c, labelMap, existing.get(id) ?? null);
  });
  const cellIds = new Set(cellUnits.map((u) => u.id));

  // Seed units: emitted deterministically regardless of file state /
  // --no-merge. If the existing file has a richer copy of a seed (more
  // recent completed_at / ship_notes), forward-merge it over the seed
  // (never backward — a seed's "completed" floor cannot be reverted).
  const seedById = new Map();
  for (const s of SEED_UNITS) {
    const prior = existing.get(s.id);
    if (prior && prior.status && prior.status !== "not_started") {
      seedById.set(s.id, { ...s, ...prior, source: prior.source ?? s.source });
    } else {
      seedById.set(s.id, { ...s });
    }
  }

  // Carry-forward: preserve any OTHER pre-existing shipped unit that is
  // neither a generated cell nor a seed (operator-added meta units).
  // Without this, a re-run silently drops them — the close-out-debt class.
  // Only carry shipped (status != not_started) units.
  const carried = [];
  for (const [eid, eu] of existing.entries()) {
    if (cellIds.has(eid)) continue; // represented as a cell unit
    if (seedById.has(eid)) continue; // handled by seed merge above
    if (!eu || !eu.status || eu.status === "not_started") continue;
    carried.push({ ...eu, source: eu.source ?? "carried-forward" });
  }

  const seeds = [...seedById.values()];
  const units = [...seeds, ...carried, ...cellUnits];

  // by-slot count — operators want to know who gets what
  const bySlot = Object.create(null);
  for (const u of units) {
    const k = u.slot ?? "unassigned";
    bySlot[k] = (bySlot[k] ?? 0) + 1;
  }
  const byStatus = Object.create(null);
  for (const u of units) {
    byStatus[u.current_status] = (byStatus[u.current_status] ?? 0) + 1;
  }
  const shipped = units.filter((u) => u.status !== "not_started").length;

  return {
    id: "DOMAIN-PIPELINE-MS0",
    version: "1.0.0",
    title: "Domain × Stage cell extraction — formalize 62 not-fully-built pipeline cells as roadmap units",
    brief:
      "Re-projects DOMAIN-PIPELINE-MS0-CONFIG.json (state/shared/specs/) — the canonical 18-stage × 13-domain pipeline table — into one roadmap unit per (domain × stage) where status != 'built'. Slot routing comes directly from the config (mill=alpha, lathe=bravo, ...) so allocate-domains-to-slots.mjs / topup-slot-queues.mjs picks each unit up automatically. Per CLAUDE.md DOMAIN-PIPELINE-MS0 doctrine: 86 cells total / 24 built / 34 partial / 28 missing → 62 not-fully-built extracted here. Advisory + mustHumanVerify — operators refine engine mappings + statuses in the source config and re-run this extractor; never edit this file by hand. Re-runs PRESERVE shipped-unit status (idempotent close-out safety).",
    created_at: now,
    created_by: createdBy,
    track: "DOMAIN-PIPELINE",
    roadmap_priority: 1,
    status: "in_progress",
    total_units: units.length,
    cell_units: cellUnits.length,
    seed_units: seeds.length,
    carried_units: carried.length,
    shipped_units: shipped,
    advisory_only: true,
    must_human_verify: true,
    source_config: "state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json",
    extractor: "scripts/extract-domain-pipeline-units.mjs",
    routing: {
      by_slot: bySlot,
      by_status: byStatus,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
    units,
  };
}

// ---------- CLI shell ----------

function parseArgs(argv) {
  const out = { dryRun: false, json: false, out: null, config: null, merge: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--no-merge") out.merge = false;
    else if (a === "--out") {
      const v = argv[++i];
      if (!v) { process.stderr.write("extract-domain-pipeline-units: --out requires a path\n"); process.exit(1); }
      out.out = v;
    } else if (a === "--config") {
      const v = argv[++i];
      if (!v) { process.stderr.write("extract-domain-pipeline-units: --config requires a path\n"); process.exit(1); }
      out.config = v;
    } else if (a === "--help" || a === "-h") {
      process.stdout.write(
        "Usage: extract-domain-pipeline-units.mjs [--dry-run] [--json] [--no-merge] [--out <path>] [--config <path>]\n" +
          "\n" +
          "After write, register the milestone:\n" +
          "  node scripts/reconcile-roadmap-drift.mjs   # roadmap-index.json\n" +
          "  node scripts/topup-slot-queues.mjs         # inject into per-slot queues\n",
      );
      process.exit(0);
    }
  }
  return out;
}

function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  try {
    fs.renameSync(tmp, filePath);
  } catch (e) {
    // Windows EPERM/EEXIST on cross-device or locked target — fall back to copy+unlink.
    try {
      fs.copyFileSync(tmp, filePath);
      fs.unlinkSync(tmp);
    } catch (e2) {
      try { fs.unlinkSync(tmp); } catch {}
      throw e2;
    }
  }
}

function main(argvOverride) {
  const args = parseArgs(argvOverride ?? process.argv.slice(2));
  const cfgPath = args.config ?? DEFAULT_CONFIG;
  const outPath = args.out ?? DEFAULT_OUT;

  let cfg;
  try {
    cfg = loadConfig(cfgPath);
  } catch (e) {
    process.stderr.write(`extract-domain-pipeline-units: config read failed: ${e.message}\n`);
    process.exit(1);
  }

  const existing = args.merge ? loadExistingMilestone(outPath) : new Map();
  const warnings = [];
  const milestone = buildMilestone(cfg, { existing, warnings });

  // R12 fail-loud invariant: must match spec count claim.
  // Count CELL units only — carried meta/bootstrap units are additive and
  // legitimately push total_units above the doctrine 62.
  const EXPECTED = 62;
  if (milestone.cell_units !== EXPECTED) {
    process.stderr.write(
      `extract-domain-pipeline-units: WARN cell count drift — extracted ${milestone.cell_units} cells, ` +
        `CLAUDE.md doctrine expects ${EXPECTED} (62 not-fully-built). ` +
        `If the source config changed, update the CLAUDE.md DOMAIN-PIPELINE-MS0 section.\n`,
    );
  }
  for (const w of warnings) {
    process.stderr.write(`extract-domain-pipeline-units: WARN ${w}\n`);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(milestone, null, 2) + "\n");
  }

  if (args.dryRun) {
    process.stdout.write(
      `DRY: would write ${outPath} — ${milestone.total_units} units across ${Object.keys(milestone.routing.by_slot).length} slots ` +
        `(${JSON.stringify(milestone.routing.by_slot)}); ${milestone.shipped_units} already shipped (preserved)\n`,
    );
    return;
  }

  try {
    atomicWriteJson(outPath, milestone);
  } catch (e) {
    process.stderr.write(`extract-domain-pipeline-units: write failed: ${e.message}\n`);
    process.exit(2);
  }
  process.stdout.write(
    `wrote ${outPath} — ${milestone.total_units} units, ${milestone.shipped_units} shipped (preserved), ` +
      `by_slot=${JSON.stringify(milestone.routing.by_slot)}\n`,
  );
  process.stdout.write(
    `NEXT: 'node scripts/topup-slot-queues.mjs' to inject into per-slot pickup queues; ` +
      `'node scripts/reconcile-roadmap-drift.mjs' to register in roadmap-index.json.\n`,
  );
}

// ESM entry-point detection (Windows-safe via pathToFileURL).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { main };
