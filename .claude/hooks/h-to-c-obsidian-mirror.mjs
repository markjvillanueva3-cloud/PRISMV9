#!/usr/bin/env node
// tier: T3
// U-GALAXY-MS1-B1 (2026-05-27, slot:alpha — sierra's territory, alpha-skeleton ship):
// HMEMV04 Obsidian bidirectional vault — H: → C: reverse-mirror per
// SCOPE-EXPANSION §Q6 #1 (cyrilXBT bidirectional vault, biggest dormant-X-article miss).
//
// PostToolUse hook that fires when a Write/Edit/MultiEdit lands under
// H:/prism/knowledge/memories/** — checks if the corresponding C: source-of-truth
// file is older (or missing) and reverse-mirrors H: → C: so the canonical
// auto-feed source stays in sync with Obsidian-side edits.
//
// Direction: C:→H: is the existing c-to-h-mirror hook (per CLAUDE.md preamble).
// This hook is the REVERSE — H:→C: — closing the bidirectional gap.
//
// Mapping convention (per feedback_auto_memory_feeds_obsidian_stophook):
//   H:/prism/knowledge/memories/<type>/<name>.md ↔ C:/Users/wompu/.claude/projects/H--PRISM/memory/<name>.md
//
// Safety:
//   - SHA-256 byte-equal skip (matches c-to-h-mirror pattern)
//   - Skip if H: mtime < C: mtime (C: is canonical when newer)
//   - Excludes: any file containing the linter-added `## Related` block at end
//     (those are Obsidian-derived enrichments — should NOT round-trip back to C:
//     because the next c-to-h-mirror pass would copy them BACK to H: + the
//     linter would re-enrich, creating an infinite mirror loop).
//   - Fail-soft: every error → silent skip + exit 0.
//
// Knobs:
//   PRISM_H_TO_C_MIRROR_DISABLE=1 — disable entirely
//   PRISM_H_TO_C_MIRROR_VERBOSE=1 — log every mirror decision

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const H_ROOT = path.join(PRISM, "knowledge/memories");
const C_ROOT = "C:/Users/wompu/.claude/projects/H--PRISM/memory";

function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }
function safeRead(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }
function sha256(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

function isHMemoryPath(filePath) {
  if (typeof filePath !== "string") return false;
  const norm = filePath.replace(/\\/g, "/");
  return norm.startsWith(H_ROOT.replace(/\\/g, "/")) && norm.endsWith(".md");
}

function deriveCPath(hPath) {
  // H:/prism/knowledge/memories/<type>/<name>.md → C:/.../memory/<name>.md
  // (Note: the C: source uses a FLAT memory/ dir; type-segregation is H: only.)
  const basename = path.basename(hPath);
  return path.join(C_ROOT, basename);
}

function stripObsidianEnrichment(content) {
  // The Obsidian-sync linter appends `## Related` blocks + sometimes augments
  // frontmatter with `aliases:` + `source:` + `synced:` fields. We strip those
  // before reverse-mirroring to prevent the C: source from accumulating
  // round-trip artifacts.
  let stripped = content;
  // Strip trailing ## Related block (and everything after)
  const relatedIdx = stripped.lastIndexOf("\n## Related");
  if (relatedIdx >= 0) stripped = stripped.slice(0, relatedIdx).trimEnd() + "\n";
  // Strip frontmatter enrichments (aliases:, source:, synced:) — they're
  // Obsidian-derived. The C: canonical frontmatter is just name/description/metadata.
  stripped = stripped.replace(/^aliases:\s*[\s\S]*?(?=\n[a-z]+:|\n---)/m, "");
  stripped = stripped.replace(/^source:\s*[^\n]+\n/m, "");
  stripped = stripped.replace(/^synced:\s*[^\n]+\n/m, "");
  return stripped;
}

async function main() {
  if (process.env.PRISM_H_TO_C_MIRROR_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let envelope;
  try { envelope = JSON.parse(stdin); } catch { envelope = {}; }

  const fp = envelope.tool_input?.file_path || envelope.tool_input?.notebook_path;
  if (!isHMemoryPath(fp)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const cPath = deriveCPath(fp);
  const hStat = safeStat(fp);
  const cStat = safeStat(cPath);
  const verbose = process.env.PRISM_H_TO_C_MIRROR_VERBOSE === "1";

  // C: newer or equal → no mirror needed (C:→H: hook will handle if C: was edited)
  if (cStat && cStat.mtimeMs >= hStat.mtimeMs) {
    if (verbose) console.error(`[h-to-c-mirror] skip (C: newer or equal): ${path.basename(fp)}`);
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const hContent = safeRead(fp);
  if (!hContent) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const stripped = stripObsidianEnrichment(hContent);

  // Byte-equal skip after enrichment-strip (round-trip already-mirrored)
  const cContent = safeRead(cPath);
  if (cContent && sha256(cContent) === sha256(stripped)) {
    if (verbose) console.error(`[h-to-c-mirror] skip (byte-equal): ${path.basename(fp)}`);
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Mirror H: → C: (creating dir if needed)
  try {
    if (!fs.existsSync(C_ROOT)) fs.mkdirSync(C_ROOT, { recursive: true });
    fs.writeFileSync(cPath, stripped, "utf8");
    if (verbose) console.error(`[h-to-c-mirror] H:→C: ${path.basename(fp)} (${stripped.length}B, enrichment stripped)`);
  } catch (e) {
    if (verbose) console.error(`[h-to-c-mirror] WRITE FAIL ${path.basename(fp)}: ${e.message}`);
    // Fail-soft — never block
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
