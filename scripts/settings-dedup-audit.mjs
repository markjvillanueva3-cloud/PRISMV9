#!/usr/bin/env node
/**
 * settings-dedup-audit.mjs — comprehensive `.claude/settings.json` redundancy audit
 * HOOK-SYNERGY-MS0 / U-HOOK-AUDIT  (H1)
 *
 * Aggregates the dimensions the existing narrower audits cover (audit-hook-duplicates,
 * audit-cross-file-hooks, verify-hook-refs) PLUS the dimension they all miss:
 * **matcher-overlap dedup** — e.g. one entry with matcher "Bash" and another with
 * matcher "^Bash$" both pointing at the same script. The harness fires both, so
 * users pay token cost twice per Bash call. This is exactly the class of bug we
 * created an hour ago when wiring the codex-parity exact-match entries alongside
 * the pre-existing broad-match entries — the existing audits couldn't see it.
 *
 * Findings the audit emits (per settings file, then aggregate):
 *
 *   1. duplicate_commands   — same script wired ≥2× under the same (event, matcher)
 *   2. matcher_overlap      — same script wired under semantically-overlapping
 *                             matchers in the same event (e.g. "Bash" + "^Bash$")
 *   3. dead_refs            — settings command points at a script that doesn't exist
 *                             on disk
 *   4. cross_file_dup       — script wired in BOTH H:/.claude/settings.json AND
 *                             H:/prism/.claude/settings.json (double-fires on merge)
 *   5. bloated_chain        — event has > BLOATED_THRESHOLD hook entries
 *   6. coverage_gap         — known event has zero hooks (informational, not a defect
 *                             unless an envelope/roadmap says it should be wired)
 *
 * Outputs (always atomic-write; the .md is the canonical human-readable form):
 *   - state/shared/settings-dedup-report.json
 *   - state/shared/SETTINGS_DEDUP_REPORT.md
 *
 * Run:
 *   node scripts/settings-dedup-audit.mjs                  # default: write both files
 *   node scripts/settings-dedup-audit.mjs --print          # only print summary; don't write
 *   node scripts/settings-dedup-audit.mjs --json           # print JSON only (machine pipeline)
 *
 * Test seam: `audit(settingsFiles, fsImpl?)` is exported pure — every fs call
 * routes through the injectable.
 *
 * @module scripts/settings-dedup-audit
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_CANDIDATES_DEFAULT = [
  "H:/.claude/settings.json",
  "H:/.claude/settings.local.json",
  "H:/prism/.claude/settings.json",
  "H:/prism/.claude/settings.local.json",
];
const KNOWN_EVENTS = [
  "SessionStart", "SessionEnd",
  "PreToolUse", "PostToolUse",
  "UserPromptSubmit", "Notification",
  "Stop", "PreCompact",
  "SubagentStart", "SubagentStop",
];
const BLOATED_THRESHOLD = 25;

const OUT_JSON = "H:/prism/state/shared/settings-dedup-report.json";
const OUT_MD = "H:/prism/state/shared/SETTINGS_DEDUP_REPORT.md";
const SCHEMA_VERSION = 1;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fwd(p) { return String(p).replace(/\\/g, "/"); }

function parseCmd(command) {
  // First script-looking token in the command string (extension .mjs/.cjs/.js/.ts)
  if (typeof command !== "string") return null;
  const m = command.match(/(?:^|\s)["']?([A-Za-z]:[\\/][^\s"']+\.(?:mjs|cjs|js|ts))["']?/)
       || command.match(/["']?([^"'\s]+\.(?:mjs|cjs|js|ts))["']?/);
  if (!m) return null;
  return fwd(m[1]);
}

/**
 * Normalize a matcher string for overlap detection. Returns the canonical tool-set:
 * a sorted array of tool names. Matchers that the harness recognizes are mostly
 * regex-ish; we extract the union of tool-name tokens.
 *   "Bash"                              → ["Bash"]
 *   "^Bash$"                            → ["Bash"]
 *   "Bash|Read|Edit"                    → ["Bash", "Edit", "Read"]
 *   "^(Edit|Write|MultiEdit)$"          → ["Edit", "MultiEdit", "Write"]
 *   ""                                  → ["*"]      (empty matcher = all tools)
 *   "*"                                 → ["*"]
 *   ".*"                                → ["*"]
 *   "^mcp__prism.*" / "^mcp__prism"     → ["mcp__prism"]  (prefix match)
 * Returns null when the matcher can't be canonicalized (treat as unique).
 */
function normalizeMatcher(matcher) {
  if (matcher == null || matcher === "") return ["*"];
  const m = String(matcher);
  if (m === "*" || m === ".*") return ["*"];
  // Strip ^…$ anchors + outer parens
  let inner = m.replace(/^\^/, "").replace(/\$$/, "");
  inner = inner.replace(/^\((.+)\)$/, "$1");
  // Strip trailing ".*" (used loosely for prefix matches)
  inner = inner.replace(/\.\*$/, "");
  if (!inner) return null;
  // Pure alphanumeric / alternation of names?
  if (/^[A-Za-z_][A-Za-z0-9_]*(\|[A-Za-z_][A-Za-z0-9_]*)*$/.test(inner)) {
    return [...new Set(inner.split("|"))].sort();
  }
  // Single token followed by alnum (e.g. "mcp__prism" after stripping)
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(inner)) return [inner];
  // Heuristic last resort: extract every Tool-like token
  const tokens = inner.match(/[A-Za-z_][A-Za-z0-9_]*/g);
  if (tokens && tokens.length) return [...new Set(tokens)].sort();
  return null;
}

function readJsonSafe(p, fsImpl) {
  try {
    if (!fsImpl.existsSync(p)) return null;
    return JSON.parse(fsImpl.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function fileExistsLoose(scriptPath, fsImpl) {
  if (!scriptPath) return false;
  if (fsImpl.existsSync(scriptPath)) return true;
  // Case-insensitive Windows volume drift: try toggling drive case.
  const swapped = scriptPath.replace(/^([A-Za-z]):/, (_, d) =>
    `${d === d.toLowerCase() ? d.toUpperCase() : d.toLowerCase()}:`);
  return fsImpl.existsSync(swapped);
}

// ── Per-file analysis ────────────────────────────────────────────────────────

function analyzeFile(filePath, fsImpl) {
  const raw = readJsonSafe(filePath, fsImpl);
  if (!raw) return null;
  const hooks = raw.hooks ?? {};

  const duplicates = [];
  const matcherOverlap = [];
  const deadRefs = [];
  const bloatedChains = [];
  let totalEntries = 0;

  // Build a flat (event, matcher, script, command, blockIdx, hookIdx, disabledMarker) list per event.
  const wirings = [];
  for (const ev of Object.keys(hooks)) {
    const blocks = Array.isArray(hooks[ev]) ? hooks[ev] : [];
    let entryCount = 0;
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi] ?? {};
      const matcher = typeof block.matcher === "string" ? block.matcher : "";
      const list = Array.isArray(block.hooks) ? block.hooks : [];
      for (let hi = 0; hi < list.length; hi++) {
        const h = list[hi] ?? {};
        const cmd = typeof h.command === "string" ? h.command : "";
        const script = parseCmd(cmd);
        if (!script) continue;
        totalEntries++;
        entryCount++;
        const disabledMarker = (block._disabled_by ?? h._disabled_by) || null;
        wirings.push({
          event: ev, matcher, script, command: cmd,
          blockIdx: bi, hookIdx: hi, disabledMarker,
        });
      }
    }
    if (entryCount > BLOATED_THRESHOLD) {
      bloatedChains.push({ event: ev, entryCount, threshold: BLOATED_THRESHOLD });
    }
  }

  // 1. duplicate_commands — same (event, matcher, command) appearing ≥2×
  {
    const seen = new Map();
    for (const w of wirings) {
      const key = `${w.event}::${w.matcher}::${w.command}`;
      const prev = seen.get(key);
      if (prev) prev.push(w);
      else seen.set(key, [w]);
    }
    for (const [key, list] of seen) {
      if (list.length < 2) continue;
      duplicates.push({
        event: list[0].event,
        matcher: list[0].matcher,
        script: list[0].script,
        count: list.length,
        locations: list.map((w) => ({ blockIdx: w.blockIdx, hookIdx: w.hookIdx })),
      });
    }
  }

  // 2. matcher_overlap — same script wired under DIFFERENT matchers in same event
  //    where the normalized tool-sets intersect. Most common cause: one entry says
  //    "Bash" and another says "^Bash$" — both fire, double cost.
  {
    const byEventScript = new Map();
    for (const w of wirings) {
      const key = `${w.event}::${w.script}`;
      const lst = byEventScript.get(key) ?? [];
      lst.push(w);
      byEventScript.set(key, lst);
    }
    for (const [, list] of byEventScript) {
      if (list.length < 2) continue;
      // Only flag if the matchers DIFFER as strings but overlap as tool-sets.
      const distinctMatchers = [...new Set(list.map((w) => w.matcher))];
      if (distinctMatchers.length < 2) continue;
      const normalized = distinctMatchers.map((m) => ({ matcher: m, tools: normalizeMatcher(m) }));
      // Compare each pair for overlap
      const overlaps = [];
      for (let i = 0; i < normalized.length; i++) {
        for (let j = i + 1; j < normalized.length; j++) {
          const a = normalized[i], b = normalized[j];
          if (!a.tools || !b.tools) continue;
          if (a.tools.includes("*") || b.tools.includes("*")) {
            overlaps.push([a.matcher, b.matcher, "*"]);
            continue;
          }
          const shared = a.tools.filter((t) => b.tools.includes(t));
          if (shared.length > 0) overlaps.push([a.matcher, b.matcher, shared.join("|")]);
        }
      }
      if (overlaps.length > 0) {
        matcherOverlap.push({
          event: list[0].event,
          script: list[0].script,
          matchers: distinctMatchers,
          overlapPairs: overlaps.map(([a, b, on]) => ({ a, b, on })),
        });
      }
    }
  }

  // 3. dead_refs — script file doesn't exist on disk
  {
    const checked = new Set();
    for (const w of wirings) {
      if (checked.has(w.script)) continue;
      checked.add(w.script);
      if (!fileExistsLoose(w.script, fsImpl)) {
        deadRefs.push({ script: w.script, sampleCommand: w.command, event: w.event, matcher: w.matcher });
      }
    }
  }

  return {
    file: filePath,
    totalEntries,
    duplicates: duplicates.sort((a, b) => a.event.localeCompare(b.event) || a.matcher.localeCompare(b.matcher) || a.script.localeCompare(b.script)),
    matcherOverlap: matcherOverlap.sort((a, b) => a.event.localeCompare(b.event) || a.script.localeCompare(b.script)),
    deadRefs: deadRefs.sort((a, b) => a.script.localeCompare(b.script)),
    bloatedChains: bloatedChains.sort((a, b) => b.entryCount - a.entryCount),
    eventCounts: Object.fromEntries(
      Object.entries(hooks).map(([ev, blocks]) => [
        ev,
        (Array.isArray(blocks) ? blocks : []).reduce(
          (s, b) => s + (Array.isArray(b?.hooks) ? b.hooks.length : 0), 0,
        ),
      ]).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

// ── Cross-file analysis ──────────────────────────────────────────────────────

function analyzeCrossFile(perFile) {
  // For each (event, script) pair, count distinct settings files containing a wiring.
  const occurrences = new Map();
  for (const result of perFile) {
    const raw = readJsonSafeNoFs(result); // not used, kept simple — derive from result inputs instead
    void raw;
  }
  // Simpler: iterate per-file again via the wirings recorded in the analyse step.
  // Since analyzeFile didn't expose them, recompute here from each file's flat list.
  return [];
}
function readJsonSafeNoFs() { return null; } // stub for clarity; cross-file analysis is folded into main()

// ── Top-level audit (test seam) ──────────────────────────────────────────────

export function audit(settingsFiles = SETTINGS_CANDIDATES_DEFAULT, fsImpl = fs) {
  // De-dupe candidates by canonical path (lowercased fwd-slash).
  const seenPaths = new Set();
  const candidates = [];
  for (const c of settingsFiles) {
    const k = fwd(c).toLowerCase();
    if (seenPaths.has(k)) continue;
    seenPaths.add(k);
    candidates.push(fwd(c));
  }

  const perFile = [];
  // Flat wiring index for cross-file analysis: keyed by `${event}::${script}` → [file, …]
  const crossIndex = new Map();
  for (const filePath of candidates) {
    const result = analyzeFile(filePath, fsImpl);
    if (!result) continue;
    perFile.push(result);
    // Rebuild the per-file wirings (analyzeFile reads the raw json once; cheap to re-read).
    const raw = readJsonSafe(filePath, fsImpl);
    const hooks = raw?.hooks ?? {};
    for (const ev of Object.keys(hooks)) {
      const blocks = Array.isArray(hooks[ev]) ? hooks[ev] : [];
      for (const block of blocks) {
        const list = Array.isArray(block?.hooks) ? block.hooks : [];
        for (const h of list) {
          const script = parseCmd(h?.command);
          if (!script) continue;
          const k = `${ev}::${script}`;
          const lst = crossIndex.get(k) ?? [];
          lst.push(filePath);
          crossIndex.set(k, lst);
        }
      }
    }
  }

  // 4. cross_file_dup — same (event, script) wired in ≥2 distinct settings files
  const crossFileDup = [];
  for (const [k, files] of crossIndex) {
    const distinct = [...new Set(files)];
    if (distinct.length < 2) continue;
    const [event, script] = k.split("::");
    crossFileDup.push({ event, script, files: distinct.sort() });
  }
  crossFileDup.sort((a, b) => a.event.localeCompare(b.event) || a.script.localeCompare(b.script));

  // 6. coverage_gap — known events with zero hooks aggregated across all files
  const totalByEvent = new Map();
  for (const ev of KNOWN_EVENTS) totalByEvent.set(ev, 0);
  for (const result of perFile) {
    for (const [ev, count] of Object.entries(result.eventCounts)) {
      totalByEvent.set(ev, (totalByEvent.get(ev) ?? 0) + count);
    }
  }
  const coverageGaps = [...totalByEvent.entries()]
    .filter(([ev, count]) => KNOWN_EVENTS.includes(ev) && count === 0)
    .map(([ev]) => ({ event: ev }));

  // Aggregate counts
  const totals = {
    filesScanned: perFile.length,
    totalEntries: perFile.reduce((s, r) => s + r.totalEntries, 0),
    duplicateCount: perFile.reduce((s, r) => s + r.duplicates.length, 0),
    matcherOverlapCount: perFile.reduce((s, r) => s + r.matcherOverlap.length, 0),
    deadRefCount: perFile.reduce((s, r) => s + r.deadRefs.length, 0),
    bloatedChainCount: perFile.reduce((s, r) => s + r.bloatedChains.length, 0),
    crossFileDupCount: crossFileDup.length,
    coverageGapCount: coverageGaps.length,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    settingsFiles: candidates,
    perFile,
    crossFileDup,
    coverageGaps,
    totals,
  };
}

// ── Markdown rendering ───────────────────────────────────────────────────────

export function renderMarkdown(report) {
  const { totals, perFile, crossFileDup, coverageGaps } = report;
  const lines = [];
  lines.push(`# Settings Dedup Report`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Schema:    v${report.schemaVersion}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Dimension | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Files scanned | ${totals.filesScanned} |`);
  lines.push(`| Total wired entries | ${totals.totalEntries} |`);
  lines.push(`| Duplicate commands | **${totals.duplicateCount}** |`);
  lines.push(`| Matcher overlap | **${totals.matcherOverlapCount}** |`);
  lines.push(`| Dead refs | **${totals.deadRefCount}** |`);
  lines.push(`| Cross-file duplication | **${totals.crossFileDupCount}** |`);
  lines.push(`| Bloated chains (>25 entries) | ${totals.bloatedChainCount} |`);
  lines.push(`| Coverage gaps | ${totals.coverageGapCount} |`);
  lines.push("");

  for (const file of perFile) {
    lines.push(`## \`${file.file}\``);
    lines.push("");
    lines.push(`Entries: ${file.totalEntries}`);
    lines.push("");

    if (file.duplicates.length > 0) {
      lines.push(`### Duplicate commands (${file.duplicates.length})`);
      lines.push("");
      for (const d of file.duplicates) {
        lines.push(`- **${d.event}** \`${d.matcher || "(empty)"}\` → \`${d.script}\` × ${d.count}`);
      }
      lines.push("");
    }

    if (file.matcherOverlap.length > 0) {
      lines.push(`### Matcher overlap (${file.matcherOverlap.length}) — double-fires`);
      lines.push("");
      for (const o of file.matcherOverlap) {
        lines.push(`- **${o.event}** \`${o.script}\` wired via \`${o.matchers.join("` and `")}\``);
        for (const p of o.overlapPairs) {
          lines.push(`  - \`${p.a}\` ⋂ \`${p.b}\` on tools: ${p.on}`);
        }
      }
      lines.push("");
    }

    if (file.deadRefs.length > 0) {
      lines.push(`### Dead refs (${file.deadRefs.length})`);
      lines.push("");
      for (const d of file.deadRefs) {
        lines.push(`- ${d.event} \`${d.matcher}\` → \`${d.script}\` (file missing)`);
      }
      lines.push("");
    }

    if (file.bloatedChains.length > 0) {
      lines.push(`### Bloated chains (>${BLOATED_THRESHOLD} hooks per event)`);
      lines.push("");
      for (const b of file.bloatedChains) {
        lines.push(`- **${b.event}**: ${b.entryCount} hooks`);
      }
      lines.push("");
    }
  }

  if (crossFileDup.length > 0) {
    lines.push(`## Cross-file duplication (${crossFileDup.length})`);
    lines.push("");
    lines.push(`Scripts wired in multiple settings files — the harness merges them so each fires once per file.`);
    lines.push("");
    for (const c of crossFileDup) {
      lines.push(`- **${c.event}** \`${c.script}\``);
      for (const f of c.files) lines.push(`  - ${f}`);
    }
    lines.push("");
  }

  if (coverageGaps.length > 0) {
    lines.push(`## Coverage gaps (${coverageGaps.length})`);
    lines.push("");
    lines.push(`Known events with zero hooks across all settings files (informational):`);
    lines.push("");
    for (const g of coverageGaps) lines.push(`- ${g.event}`);
    lines.push("");
  }

  if (
    totals.duplicateCount === 0 &&
    totals.matcherOverlapCount === 0 &&
    totals.deadRefCount === 0 &&
    totals.crossFileDupCount === 0
  ) {
    lines.push(`## ✅ Clean`);
    lines.push("");
    lines.push(`No duplicates, matcher overlap, dead refs, or cross-file duplication detected.`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Atomic write (mirrors atomicWrite helper) ────────────────────────────────

function atomicWriteSync(p, data, fsImpl = fs) {
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  const dir = path.dirname(p);
  if (!fsImpl.existsSync(dir)) fsImpl.mkdirSync(dir, { recursive: true });
  fsImpl.writeFileSync(tmp, data);
  fsImpl.renameSync(tmp, p);
}

// ── Entry point ──────────────────────────────────────────────────────────────

function main(argv) {
  const args = new Set(argv.slice(2));
  const printOnly = args.has("--print");
  const jsonOnly = args.has("--json");
  const report = audit();
  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }
  if (!printOnly) {
    atomicWriteSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");
    atomicWriteSync(OUT_MD, renderMarkdown(report) + "\n");
  }
  const t = report.totals;
  const summary =
    `[settings-dedup-audit] ${t.filesScanned} file(s) · ` +
    `${t.totalEntries} entries · ` +
    `dups=${t.duplicateCount} · overlap=${t.matcherOverlapCount} · ` +
    `dead=${t.deadRefCount} · crossFile=${t.crossFileDupCount} · ` +
    `bloat=${t.bloatedChainCount} · gaps=${t.coverageGapCount}`;
  console.log(summary);
  if (!printOnly) {
    console.log(`  wrote ${OUT_JSON}`);
    console.log(`  wrote ${OUT_MD}`);
  }
  // Exit code: 0 always — this is an audit, not a gate. Callers consume the file.
  return 0;
}

const invokedAsScript = (() => {
  try {
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
    return path.resolve(self) === path.resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
})();
if (invokedAsScript) process.exit(main(process.argv));

// ── Export internal helpers for tests ────────────────────────────────────────

export { normalizeMatcher, parseCmd, analyzeFile, BLOATED_THRESHOLD };
