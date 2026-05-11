#!/usr/bin/env node
/**
 * register-devtools-roadmap-envelopes.mjs — idempotent registrar + parser.
 *
 * Materializes the BACKEND-DEVTOOLS-RGS6 milestones (the "atomized" .md files)
 * into structured milestone-envelope JSONs in mcp-server/data/milestones/ +
 * entries in mcp-server/data/roadmap-index.json, so atomic-roadmap-emit.mjs /
 * /rgs6 can atomize / chat-split / conflict-predict / viz-bind them alongside
 * the already-registered REVENUE-ROADMAP milestones.
 *
 * THE COMBINE: revenue milestones are already in atomic-roadmap.json (585 units,
 * track:"revenue", roadmap_priority:1). Four devtools milestones already have
 * hand-curated envelopes (HOOK-SYNERGY-MS0 / HTML-COMPANION-MS0 / K2-CLOUD-MS0 /
 * OBSIDIAN-COMPOUND-MS1). This script registers the REMAINING ~12 devtools
 * milestones from their atomized .md files so the next atomic-roadmap-emit picks
 * up the full BACKEND-DEVTOOLS-RGS6 roadmap (track:"<MS-group>", roadmap_priority:0
 * → devtools-first per the operator-chosen sort).
 *
 * Source of truth: state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-2026-05-10.md
 *   YAML frontmatter (milestone:/assigned_lane:/commit_prefix:/total_units:/
 *   critical_path_role:/loop_registrations:/date:) + `## U-<id> — <title>` unit
 *   headers (a `## U-A..U-B — title` packed header is expanded to one unit per id)
 *   with indented scalar fields (pillar/tier/ai_priority_score/leverage_score/why/
 *   depends_on/blocks/parallel_with/viz_node_id/loop_schedule — inline `# comments`
 *   on those fields are stripped) and verifies_via:/micro_steps:/adversarial_cases:/
 *   variability_axis: blocks (kept as pointers, not inlined — implementer reads them
 *   from the atomized file).
 *
 * Idempotent: re-running overwrites the devtools envelopes + re-syncs the index
 * entries (matched by id), never duplicates. Pristine main-tree atomized files
 * are used; if work/rgs6-audit-v2 has v2-bind-revised versions (viz_node_id
 * remapping, doc_propagation fields), re-run this after merging that branch.
 *
 * Importable: `parseAtomized` / `parseList` / `parseTier` / `num` are exported for
 * tests; the file-writing main() runs only when the script is the entry point.
 *
 * Usage:
 *   node scripts/register-devtools-roadmap-envelopes.mjs            # register the ~12 missing
 *   node scripts/register-devtools-roadmap-envelopes.mjs --all      # also re-write the 4 already-registered (CLOBBERS hand-curated envelopes — don't)
 *   node scripts/register-devtools-roadmap-envelopes.mjs --dry-run  # parse + report, write nothing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM = "H:/prism";
const ATOMIZED_DIR = path.join(PRISM, "state/shared/specs/atomized");
const ENV_DIR = path.join(PRISM, "mcp-server/data/milestones");
const INDEX_PATH = path.join(PRISM, "mcp-server/data/roadmap-index.json");
const VERSION = "RGS6.1.0";
const CREATED_BY = "claude-0f522935 (register-devtools-roadmap-envelopes.mjs — BACKEND-DEVTOOLS-RGS6 combine)";
const TRACK_NAME = "BACKEND-DEVTOOLS-RGS6 MEGA-ROADMAP";
const PARENT_ROADMAP = "BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md";

const STD_EXIT = [
  "Implementation complete per the atomized micro_steps",
  "Tests pass: npx vitest run (real reference values / algebraic invariants — no toBeDefined() stubs)",
  "Typecheck clean: npx tsc --noEmit",
  "Dispatcher wiring verified where the unit ships an engine: import + call + action-enum + Zod schema + round-trip E2E (test invokes through the dispatcher, not only the engine singleton)",
  "verifies_via channel run + exit-signal matches the unit's expected_signal",
  "doc_propagation done (CLAUDE.md / GSD / wiki / system-viz / memories updated where the unit changes their surface)",
];
const FOUR_LOOP = ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"];

// Already-registered devtools milestones — skip unless --all (their envelopes
// are hand-curated with rich knowledge_sources / acceptance_criteria / boris_loop_gate).
const ALREADY_REGISTERED = new Set([
  "HOOK-SYNERGY-MS0", "HTML-COMPANION-MS0", "K2-CLOUD-MS0", "OBSIDIAN-COMPOUND-MS1",
]);

// ── parsing helpers (exported for tests) ─────────────────────────────────────
export const slug = (id) => String(id).toLowerCase();
export const trackOf = (msId) => msId.replace(/-MS\d+$/i, ""); // TOOL-INVENTORY-MS0 → TOOL-INVENTORY
const stripBackticks = (s) => String(s || "").replace(/`/g, "").trim();

/** Parse a list-shaped scalar value into a clean string[], dropping any trailing `# comment`.
 *  Handles `[A, B]`, `[]`, `none`, `A`, and `[A, B]  # was [C] — note` (the inline-comment case
 *  that previously corrupted depends_on/blocks). */
export function parseList(v) {
  let s = stripBackticks(v);
  const open = s.indexOf("[");
  if (open >= 0) {
    const close = s.indexOf("]", open);
    if (close >= 0) s = s.slice(open, close + 1);   // first bracketed group only — drops any trailing `# ...`
  } else {
    s = s.replace(/\s+#.*$/, "").trim();            // bare value with a trailing comment
  }
  if (!s || s === "[]" || /^(none|-|n\/?a)$/i.test(s)) return [];
  const inner = s.replace(/^\[/, "").replace(/\]$/, "");
  return inner.split(",").map((x) => x.replace(/\s+#.*$/, "").trim()).filter(Boolean);
}

export function parseTier(v) {
  const m = String(v ?? "").trim().match(/T?(\d+)/i);
  return m ? Number(m[1]) : null;
}
export function num(v) {
  const s = String(v ?? "").trim();
  if (s === "") return null;                    // absent field → null, not Number("")===0
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Expand a header id like `U-ALL07..U-ALL08` (or `U-X1..U-X3`) into the explicit id list.
 *  If the endpoints don't share an alpha prefix with numeric suffixes, falls back to
 *  one id per `..`-separated part. A plain id returns `[id]`. */
const MAX_RANGE_EXPAND = 50;          // sanity cap: a `A..B` packed header can't expand to more than this
export function expandUnitIds(rawId) {
  const id = String(rawId).trim();
  if (!id.includes("..")) return [id];
  const parts = id.split("..").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return parts.length ? parts : [id];
  const a = parts[0].match(/^(.*?)(\d+)$/);
  const b = parts[1].match(/^(.*?)(\d+)$/);
  if (a && b && a[1] === b[1]) {
    const prefix = a[1];
    const start = Number(a[2]), end = Number(b[2]);
    const width = Math.max(a[2].length, b[2].length);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start < MAX_RANGE_EXPAND) {
      const out = [];
      for (let i = start; i <= end; i++) out.push(prefix + String(i).padStart(width, "0"));
      return out;
    }
  }
  return parts;
}

const normUnitId = (id) => (String(id).startsWith("U-") ? String(id) : `U-${id}`);

// ── parse one atomized .md file ──────────────────────────────────────────────
export function parseAtomized(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

  // milestone id: first XXX-MS<n> token in fm.milestone; else from the filename
  const msId = (fm.milestone || "").match(/[A-Z0-9][A-Z0-9-]*-MS\d+/i)?.[0]
    || path.basename(filePath).match(/BACKEND-DEVTOOLS-RGS6-(.+?)-ATOMIZED/i)?.[1]?.replace(/_/g, "-")
    || null;

  // milestone title: first `# ` heading (without any `— suffix`)
  const titleM = body.match(/^#\s+(.+)$/m);
  const title = titleM ? (titleM[1].replace(/\s*—.*$/, "").trim() || titleM[1].trim()) : (msId || "untitled");

  // brief: first contiguous `> ...` blockquote
  const briefLines = [];
  for (const line of body.split("\n")) {
    if (line.startsWith(">")) briefLines.push(line.replace(/^>\s?/, ""));
    else if (briefLines.length) break;
  }
  const brief = briefLines.join(" ").trim() || `${msId} — see ${path.basename(filePath)}`;

  // units: `## <id> — <title>` headers (id = U-xxx | H<n> | K2-K<n> | a `A..B` packed range)
  const unitRe = /^##\s+(U-[A-Za-z0-9._\-]+(?:\.\.[A-Za-z0-9._\-]+)?|[HK]\d[A-Za-z0-9._\-]*(?:\.\.[A-Za-z0-9._\-]+)?|K2-K\d+[A-Za-z0-9._\-]*)\s*[—\-:]+\s*(.+?)\s*$/gm;
  const headers = [];
  let m;
  while ((m = unitRe.exec(body)) !== null) headers.push({ id: m[1].trim(), title: m[2].trim(), idx: m.index });

  const units = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const seg = body.slice(h.idx, i + 1 < headers.length ? headers[i + 1].idx : body.length);
    // scalar fields: top-of-unit `- key: value` lines, until the first verifies_via/micro_steps/... block
    const fields = {};
    for (const line of seg.split("\n")) {
      if (/^(verifies_via|micro_steps|adversarial_cases|variability_axis):/.test(line.trim())) break;
      const fm2 = line.match(/^\s*-\s+([a-zA-Z_]+):\s*(.*)$/);
      if (fm2 && !(fm2[1] in fields)) fields[fm2[1]] = fm2[2].trim();
    }
    const cleanTitle = h.title.replace(/\s+\([^)]*\bsub-unit\b[^)]*\)\s*$/i, "").trim() || h.title.trim();
    const anchor = `## ${h.id}`;
    const expandedIds = expandUnitIds(h.id);
    for (const eid of expandedIds) {
      units.push({
        id: normUnitId(eid),
        title: cleanTitle,
        pillar: fields.pillar || null,
        tier: parseTier(fields.tier) ?? 1,
        ai_priority_score: num(fields.ai_priority_score),
        leverage_score: num(fields.leverage_score),
        why: fields.why || null,
        depends_on: parseList(fields.depends_on),
        blocks: parseList(fields.blocks),
        parallel_with: parseList(fields.parallel_with),
        viz_node_id: stripBackticks((fields.viz_node_id || "").replace(/\(TBD-create\)/i, "").trim()) || null,
        viz_node_status: /TBD-create/i.test(fields.viz_node_id || "") ? "needs_creation" : "claimed",
        loop_schedule: fields.loop_schedule ? fields.loop_schedule.replace(/\s+#.*$/, "").trim() : null,
        status: "not_started",
        four_loop: FOUR_LOOP,
        exit_conditions: STD_EXIT,
        source_atomized: path.relative(PRISM, filePath).replace(/\\/g, "/"),
        atomized_anchor: anchor,
        ...(expandedIds.length > 1 ? { from_packed_header: h.id } : {}),
      });
    }
  }

  return {
    msId,
    title,
    brief,
    frontmatter: {
      assigned_lane: fm.assigned_lane || null,
      commit_prefix: fm.commit_prefix || null,
      critical_path_role: fm.critical_path_role || null,
      loop_registrations: fm.loop_registrations || null,
      date: fm.date || null,
      declared_total_units: num(fm.total_units),
    },
    units,
    sourceRel: path.relative(PRISM, filePath).replace(/\\/g, "/"),
  };
}

// ── build an envelope from a parsed milestone ───────────────────────────────
export function buildEnvelope(parsed, now) {
  const { msId, title, brief, frontmatter, units, sourceRel } = parsed;
  const milestoneTier = units.some((u) => u.tier === 0) ? 0 : (units.length ? Math.min(...units.map((u) => u.tier)) : 1);
  const sessions = Math.max(1, Math.ceil(units.length / 4));
  return {
    schemaVersion: 4,
    id: msId,
    version: VERSION,
    title,
    brief,
    parent_roadmap: PARENT_ROADMAP,
    created_at: now,
    updated_at: now,
    created_by: CREATED_BY,
    track: trackOf(msId),
    track_name: TRACK_NAME,
    roadmap_priority: 0,                       // devtools-first (operator-chosen sort: entire devtools roadmap before revenue)
    tier: milestoneTier,
    priority: milestoneTier === 0 ? "P0" : milestoneTier === 1 ? "P1" : "P2",
    status: "not_started",
    assigned_lane: frontmatter.assigned_lane,
    commit_prefix: frontmatter.commit_prefix,
    critical_path_role: frontmatter.critical_path_role,
    loop_registrations: frontmatter.loop_registrations,
    source: sourceRel,
    viz_node_id: `ghost.ms.${slug(msId)}`,
    doc_propagation: ["claude.md", "gsd", "wiki", "system-viz"],
    dependencies: [],                         // milestone-level blockedBy — devtools lanes parallelizable per mega-roadmap §0 (HOOK-SYNERGY→K2-CLOUD edge is between the 4 already-registered ones)
    blocks: [],
    rationale: brief,
    phases: [{ id: "P0", title, sessions: String(sessions), units }],
    total_units: units.length,
    declared_total_units: frontmatter.declared_total_units,
    completed_units: 0,
  };
}

// ── main (runs only when this file is the entry point) ──────────────────────
function main() {
  const opts = {};
  for (const a of process.argv.slice(2)) if (a.startsWith("--")) opts[a.slice(2)] = true;
  const NOW = new Date().toISOString();

  const files = fs.readdirSync(ATOMIZED_DIR)
    .filter((f) => /^BACKEND-DEVTOOLS-RGS6-.+-ATOMIZED-2026-05-10\.md$/i.test(f))
    .map((f) => path.join(ATOMIZED_DIR, f))
    .sort();
  if (files.length === 0) {
    console.error(`✗ no BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-*.md files in ${ATOMIZED_DIR}`);
    process.exit(1);
  }

  const written = [];
  const skipped = [];
  const indexAdds = [];

  for (const fp of files) {
    let parsed;
    try { parsed = parseAtomized(fp); }
    catch (e) { skipped.push({ file: path.basename(fp), reason: `parse error: ${e.message}` }); continue; }
    const { msId, units } = parsed;
    if (!msId) { skipped.push({ file: path.basename(fp), reason: "could not derive milestone id" }); continue; }
    if (ALREADY_REGISTERED.has(msId) && !opts.all) { skipped.push({ file: path.basename(fp), id: msId, reason: "already registered (hand-curated envelope) — skip unless --all" }); continue; }
    if (units.length === 0) { skipped.push({ file: path.basename(fp), id: msId, reason: "0 parseable units (## U-<id> headers not found — different atomized format)" }); continue; }

    const envelope = buildEnvelope(parsed, NOW);
    if (!opts["dry-run"]) fs.writeFileSync(path.join(ENV_DIR, `${msId}.json`), JSON.stringify(envelope, null, 2) + "\n");
    written.push({ id: msId, units: units.length, declared: parsed.frontmatter.declared_total_units, tier: envelope.tier, track: envelope.track, file: path.basename(fp) });
    indexAdds.push({
      id: msId, title: envelope.title, track: envelope.track, status: "not_started", tier: envelope.tier, roadmap_priority: 0,
      total_units: units.length, completed_units: 0, dependencies: [], blocks: [],
      envelope_path: `milestones/${msId}.json`,
      priority: envelope.tier === 0 ? "CRITICAL" : envelope.tier === 1 ? "HIGH" : "MEDIUM",
      sessions_p50: Math.max(2, Math.ceil(units.length / 4)),
      sessions_p90: Math.max(3, Math.ceil(units.length / 3)),
      viz_node_id: `ghost.ms.${slug(msId)}`,
      description: envelope.brief.slice(0, 280),
      source: envelope.source,
    });
  }

  // ── sync roadmap-index.json ───────────────────────────────────────────────
  let idxAdded = 0, idxUpdated = 0, idxTotal = "?";
  if (!opts["dry-run"] && indexAdds.length) {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
    const ms = index.milestones || (index.milestones = {});
    const byId = {};
    for (const [k, v] of Object.entries(ms)) if (v && v.id) byId[v.id] = k;
    let nextKey = Math.max(0, ...Object.keys(ms).filter((k) => /^\d+$/.test(k)).map(Number)) + 1;
    for (const entry of indexAdds) {
      if (byId[entry.id] != null) { ms[byId[entry.id]] = { ...ms[byId[entry.id]], ...entry }; idxUpdated++; }
      else { ms[String(nextKey)] = entry; byId[entry.id] = String(nextKey); nextKey++; idxAdded++; }
    }
    index.total_milestones = Object.keys(ms).length;
    index.updated_at = NOW;
    index._last_devtools_register = { at: NOW, by: "claude-0f522935", added: idxAdded, updated: idxUpdated, version: VERSION };
    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
    idxTotal = index.total_milestones;
  }

  // ── report ────────────────────────────────────────────────────────────────
  console.log(`\n${opts["dry-run"] ? "(DRY RUN) " : ""}register-devtools-roadmap-envelopes — BACKEND-DEVTOOLS-RGS6`);
  console.log(`scanned ${files.length} atomized files in ${path.relative(PRISM, ATOMIZED_DIR)}\n`);
  console.log(`✅ ${opts["dry-run"] ? "would write" : "wrote"} ${written.length} milestone envelopes:`);
  let totalUnits = 0;
  for (const w of written.sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id))) {
    totalUnits += w.units;
    const decl = w.declared != null && w.declared !== w.units ? `  (frontmatter declared ${w.declared})` : "";
    console.log(`   tier ${w.tier}  ${w.id.padEnd(28)} ${String(w.units).padStart(3)} units  track=${w.track}${decl}`);
  }
  console.log(`   ── ${totalUnits} devtools units across ${written.length} newly-registered milestones`);
  if (skipped.length) {
    console.log(`\n⏭  skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`   ${s.file}${s.id ? ` (${s.id})` : ""} — ${s.reason}`);
  }
  if (!opts["dry-run"]) {
    console.log(`\n✅ roadmap-index.json: ${idxAdded} added, ${idxUpdated} updated → ${idxTotal} total milestones`);
    console.log(`\nNext: node .claude/scripts/atomic-roadmap-emit.mjs --chats 6   (ai-priority-rank auto-fires; envelopes changed)`);
  } else {
    console.log(`\n(dry run — no files written; drop --dry-run to commit)`);
  }
}

// ESM main-guard: run main() only when invoked as the entry point, not when imported by a test.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
