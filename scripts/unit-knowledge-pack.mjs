#!/usr/bin/env node
/**
 * unit-knowledge-pack.mjs — per-unit knowledge surfacing for a chat slot
 *
 * BACKEND-DEV-LOOP / OLLAMA-EXPAND-MS0 follow-on.
 *
 * Closes the gap behind the operator directive 2026-05-18 charlie:
 *   "expand ollama and obsidian utilization for the purpose of developing
 *    with all relevant knowledge dedicated to the specific task and unit
 *    that a chat slot would work on in their respective task queues"
 *
 * Given a unit-id (or an active slot claim), composes a markdown knowledge
 * pack:
 *   1. Roadmap context  — milestone + title from ROADMAP-CONSOLIDATED.json.
 *   2. Master-index hits — top-K wiki/graph nodes pre-joined with their
 *      Obsidian memory entries (BM25-lite via master-index-search-lib).
 *   3. Tribal tips      — domain-filtered top-K manufacturing/dev tribal tips.
 *   4. Prior shipped    — last 50 git-log commits within the same milestone
 *      scope (`[<MILESTONE>]/U-...` subject patterns).
 *   5. Ollama bridge    — a ready-to-paste `ollama-prism-bridge.mjs` seed
 *      prompt that any chat slot can run locally to drill into the pack via
 *      the 3 read-only PRISM knowledge tools — ~0 Claude tokens for the
 *      investigation.
 *
 * Pure decision functions + injected readers — testable end-to-end without a
 * live model. Fail-soft on every missing input (the pack still surfaces what
 * it found instead of throwing).
 *
 * CLI:
 *   node scripts/unit-knowledge-pack.mjs <UNIT_ID>
 *   node scripts/unit-knowledge-pack.mjs --slot charlie
 *   node scripts/unit-knowledge-pack.mjs <UNIT_ID> --json --no-write
 *
 * Output:
 *   - stdout: rendered markdown (or JSON with --json)
 *   - file:   state/shared/unit-knowledge-packs/<unit-id>.md  (unless --no-write)
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  runMasterIndexSearch,
  runTribalSearch,
} from "./lib/master-index-search-lib.mjs";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), "..");
const ROADMAP_PATH = join(REPO_ROOT, "state", "shared", "specs", "ROADMAP-CONSOLIDATED.json");
const PACK_OUT_DIR = join(REPO_ROOT, "state", "shared", "unit-knowledge-packs");
const SLOT_CLAIMS_PATH = join(REPO_ROOT, "state", "shared", "slot-task-claims.json");

const VALID_UNIT_RE = /^[A-Z][A-Z0-9_\-]{0,63}(?:::U[-_][A-Z0-9_\-]{1,80})?$/;

/** Parse CLI argv into a normalized opts object. Pure. */
export function parseArgs(argv) {
  const opts = { unitId: null, slot: null, json: false, write: true, k: 8, tribalK: 3, gitN: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slot") opts.slot = argv[++i] ?? null;
    else if (a === "--json") opts.json = true;
    else if (a === "--no-write") opts.write = false;
    else if (a === "--k") {
      const n = parseInt(argv[++i] ?? "8", 10);
      opts.k = Math.max(1, Math.min(40, Number.isFinite(n) ? n : 8));
    }
    else if (a === "--tribal-k") {
      const n = parseInt(argv[++i] ?? "3", 10);
      opts.tribalK = Math.max(0, Math.min(20, Number.isFinite(n) ? n : 3));
    }
    else if (a === "--git-n") {
      const n = parseInt(argv[++i] ?? "30", 10);
      opts.gitN = Math.max(0, Math.min(200, Number.isFinite(n) ? n : 30));
    }
    else if (!a.startsWith("--") && !opts.unitId) opts.unitId = a;
  }
  return opts;
}

/** Resolve a slot name to its active unit-id claim. Fail-soft. */
export function resolveSlotToUnit(slot, readImpl = readFileSync) {
  if (!slot) return null;
  try {
    const j = JSON.parse(readImpl(SLOT_CLAIMS_PATH, "utf8"));
    const claim = j?.claims?.[slot];
    if (!claim || typeof claim.unitId !== "string") return null;
    return claim.unitId;
  } catch {
    return null;
  }
}

/** Look up a unit in the consolidated roadmap. Returns null if unknown. Fail-soft. */
export function lookupUnit(unitId, readImpl = readFileSync) {
  if (!unitId || typeof unitId !== "string") return null;
  let roadmap;
  try {
    roadmap = JSON.parse(readImpl(ROADMAP_PATH, "utf8"));
  } catch {
    return null;
  }
  const pools = [roadmap.pending_units, roadmap.shipped_units, roadmap.bridge_units, roadmap.unconsolidated_prose];
  // Accept both bare U-IDs and MILESTONE::U-ID composites.
  const bareUnit = unitId.includes("::") ? unitId.split("::").pop() : unitId;
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    for (const u of pool) {
      const id = u?.unit_id ?? u?.id ?? null;
      if (id === unitId || id === bareUnit) return u;
    }
  }
  return null;
}

/** Build the search-query tokens for an entry (unit + milestone + title). Pure. */
export function buildQueryTokens(unitId, unit) {
  const parts = [];
  if (unitId) parts.push(unitId.replace(/^U[-_]/, "").replace(/[_:\-]+/g, " "));
  if (unit?.milestone) parts.push(unit.milestone.replace(/[_:\-]+/g, " "));
  if (unit?.title) parts.push(unit.title);
  return parts.join(" ").trim();
}

/** Pick a tribal domain from the milestone scope. Pure heuristic. */
export function inferDomain(unit) {
  const m = (unit?.milestone || "").toUpperCase();
  if (/EDM|ELECTRODE|WEDM/.test(m)) return "wedm";
  if (/LATHE|TURNING/.test(m)) return "lathe";
  if (/MILL|CUTTING/.test(m)) return "mill";
  if (/CAD|GEOMETRY|FUSION|MASTERCAM|HYPERMILL/.test(m)) return "cad";
  if (/CAM|TOOLPATH|STRATEGY/.test(m)) return "cam";
  return null;
}

/**
 * Defensive milestone token validator — `ROADMAP-CONSOLIDATED.json` is
 * untrusted file content; a malformed milestone string (control chars,
 * shell-meta) MUST NOT reach `git --grep`. spawnSync uses an arg array so
 * there is no shell-injection vector, but a milestone with embedded NUL or
 * newline could still corrupt the argv. Reject anything that's not a
 * canonical PRISM milestone slug.
 */
const VALID_MILESTONE_RE = /^[A-Z0-9][A-Z0-9_\-]{0,80}$/;

/** Read recent git commits for a milestone scope. Fail-soft. */
export function gitCommitsForMilestone(unit, n = 30, spawnImpl = spawnSync) {
  if (!unit?.milestone) return [];
  if (typeof unit.milestone !== "string" || !VALID_MILESTONE_RE.test(unit.milestone)) return [];
  try {
    const r = spawnImpl(
      "git",
      ["log", `-n${n}`, "--oneline", "--fixed-strings", "--grep", `[${unit.milestone}]`],
      { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true },
    );
    if (!r || r.status !== 0) return [];
    return String(r.stdout || "").trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

/** Format the markdown pack from composed parts. Pure. */
export function renderPackMarkdown(pack) {
  const lines = [];
  lines.push(`# Unit Knowledge Pack — ${pack.unitId}`);
  lines.push("");
  lines.push(`**Milestone:** ${pack.unit?.milestone ?? "(unknown)"}`);
  lines.push(`**Title:** ${pack.unit?.title ?? "(no title in roadmap)"}`);
  lines.push(`**Generated:** ${pack.generatedAt}`);
  if (pack.slot) lines.push(`**Slot:** ${pack.slot}`);
  lines.push("");

  lines.push(`## 🧭 Master-index hits (${pack.masterHits.length})`);
  if (pack.masterHits.length === 0) {
    lines.push("_(no graph/wiki hits for the unit tokens)_");
  } else {
    for (const h of pack.masterHits) {
      const wikiList = (h.wiki || []).slice(0, 2).join(", ");
      const memList = (h.memory || []).slice(0, 2).join(", ");
      lines.push(`- [${h.layer || "?"}/${h.kind || h.status || "?"}] **${h.name || h.id}**`
        + (wikiList ? `\n  wiki: ${wikiList}` : "")
        + (memList ? `\n  mem: ${memList}` : ""));
    }
  }
  lines.push("");

  lines.push(`## 🧠 Tribal tips (${pack.tribalHits.length}${pack.domain ? `, domain: ${pack.domain}` : ""})`);
  if (pack.tribalHits.length === 0) {
    lines.push("_(no tribal tips matched — domain may be too narrow or unset)_");
  } else {
    for (const t of pack.tribalHits) {
      const txt = String(t.text || t.body || "").replace(/\s+/g, " ").slice(0, 180);
      lines.push(`- **${t.title || t.id}** — ${txt}`);
    }
  }
  lines.push("");

  lines.push(`## 📜 Prior commits in milestone (${pack.commits.length})`);
  if (pack.commits.length === 0) {
    lines.push("_(no `[MILESTONE]` commits found — this may be a brand-new milestone)_");
  } else {
    for (const c of pack.commits) lines.push(`- ${c}`);
  }
  lines.push("");

  lines.push("## 🐙 Ollama bridge preheat");
  lines.push("Run this LOCALLY to drill into the pack via the 3 read-only PRISM knowledge tools (~0 Claude tokens):");
  lines.push("```");
  lines.push(`node scripts/ollama-prism-bridge.mjs "${pack.bridgePrompt}" --trace`);
  lines.push("```");
  lines.push("");

  if (pack.warnings.length > 0) {
    lines.push("## ⚠ Pack composition warnings");
    for (const w of pack.warnings) lines.push(`- ${w}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Compose a knowledge pack for a unit. Pure-ish (depends on injected readers + spawn). */
export function composePack(unitId, opts = {}) {
  const {
    readImpl = readFileSync,
    spawnImpl = spawnSync,
    searchImpl = runMasterIndexSearch,
    tribalImpl = runTribalSearch,
    nowIso = new Date().toISOString(),
    slot = null,
    k = 8,
    tribalK = 3,
    gitN = 30,
  } = opts;

  const warnings = [];
  if (!unitId) {
    return {
      unitId: null,
      unit: null,
      slot,
      generatedAt: nowIso,
      masterHits: [],
      tribalHits: [],
      commits: [],
      bridgePrompt: "",
      domain: null,
      warnings: ["No unit-id resolved — pass --unit <ID> or --slot <NATO> with an active claim."],
    };
  }
  if (!VALID_UNIT_RE.test(unitId)) {
    warnings.push(`Unit id "${unitId}" does not match canonical pattern — searching anyway`);
  }

  const unit = lookupUnit(unitId, readImpl);
  if (!unit) warnings.push(`Unit "${unitId}" not found in ROADMAP-CONSOLIDATED.json — using id alone for token derivation`);

  const query = buildQueryTokens(unitId, unit);
  if (!query) warnings.push("Empty query tokens — pack will be minimal");

  let masterHits = [];
  try {
    const r = searchImpl(query, { k });
    masterHits = (r?.hits ?? r ?? []).slice(0, k);
  } catch (e) {
    warnings.push(`master-index search failed: ${e?.message || e}`);
  }

  const domain = inferDomain(unit);
  let tribalHits = [];
  if (tribalK > 0) {
    try {
      const r = tribalImpl(query, { k: tribalK, domain: domain ?? undefined });
      tribalHits = (r?.hits ?? r ?? []).slice(0, tribalK);
    } catch (e) {
      warnings.push(`tribal search failed: ${e?.message || e}`);
    }
  }

  const commits = gitCommitsForMilestone(unit, gitN, spawnImpl);
  const bridgePrompt = unit?.title
    ? `For unit ${unitId} (${unit.title}) in milestone ${unit.milestone}: explain what's already built and which engines/files I should read first.`
    : `For unit ${unitId}: explain what's already built and which engines/files I should read first.`;

  return {
    unitId,
    unit,
    slot,
    generatedAt: nowIso,
    domain,
    masterHits,
    tribalHits,
    commits,
    bridgePrompt,
    warnings,
  };
}

/** Write the pack to disk. Returns the file path. */
export function writePack(pack, outDir = PACK_OUT_DIR) {
  if (!pack?.unitId) return null;
  try { mkdirSync(outDir, { recursive: true }); } catch { /* ignore */ }
  const safeId = pack.unitId.replace(/[^A-Za-z0-9_\-]/g, "_");
  const filePath = join(outDir, `${safeId}.md`);
  writeFileSync(filePath, renderPackMarkdown(pack), "utf8");
  return filePath;
}

/** CLI entrypoint. */
export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  let unitId = opts.unitId;
  if (!unitId && opts.slot) unitId = resolveSlotToUnit(opts.slot);

  const pack = composePack(unitId, { slot: opts.slot, k: opts.k, tribalK: opts.tribalK, gitN: opts.gitN });

  let writtenTo = null;
  if (opts.write && pack.unitId) writtenTo = writePack(pack);

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ...pack, writtenTo }, null, 2) + "\n");
  } else {
    process.stdout.write(renderPackMarkdown(pack));
    if (writtenTo) process.stdout.write(`\n\n_Written to: ${writtenTo}_\n`);
  }
  return pack;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
