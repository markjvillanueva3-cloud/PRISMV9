#!/usr/bin/env node
// tier: T3
/**
 * obsidian-vault-precheck-inject.mjs -- UserPromptSubmit
 *
 * HIGH-ROI-TS2/iter1 (audit-remainder loop, 2026-05-22). Closes Finding F2
 * from OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md.
 *
 * Surfaces user-written Obsidian vault notes under knowledge/ that match keyword tokens in the
 * user prompt. The existing precheck stack covers:
 *   - master-index-precheck-inject       -> system-graph nodes
 *   - wiki-precheck-inject                -> knowledge/wiki/ entries
 *   - memory-relevance-inject             -> knowledge/memories/*
 * THIS hook fills the gap: every OTHER content-bearing dir under knowledge/ (SCAN_DIRS).
 *
 * SUBSTRATE-UTIL Gap 8 (2026-06-29, slot:sierra):
 *   - slice-b: fixed 3 dead SCAN_DIRS (now single-sourced in scripts/lib/vault-precheck-lib.mjs).
 *   - slice-a: BODY recall. Scoring was filename-only -> a prompt whose terms live in a file
 *     BODY but not its name missed. When the body-excerpt sidecar
 *     (state/shared/vault-precheck-sidecar.json, built by build-vault-precheck-sidecar.mjs)
 *     is present, this hook scores basename (strong) + excerpt (weak, body recall). Absent the
 *     sidecar it FALLS BACK to the original live basename-only walk -- never worse than before.
 *
 * Sub-token cost. Disable knob: PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE=1
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { dedupeOrMarker } from "../../scripts/lib/injection-dedup-fs.mjs";
import {
  REPO_ROOT, SCAN_TARGETS, MIN_SCORE, TOPK,
  tokenize, listFiles, scoreEntry, loadSidecar,
  sidecarStaleness, BUILDER_SCRIPT, REGEN_STAMP_PATH, REGEN_THROTTLE_MS,
} from "../../scripts/lib/vault-precheck-lib.mjs";

// All scanned buckets across both roots (knowledge/ dirs + state/shared/specs) -- for the footer.
const SCANNED_LABEL = SCAN_TARGETS.flatMap((t) => t.buckets).join(", ");

function readStdinSync() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}

/**
 * Self-maintaining sidecar freshness (SUBSTRATE-UTIL Gap 8a): when the body-excerpt sidecar is
 * absent or stale (a SCAN_DIR changed since it was built), trigger a throttled (>=1/hour),
 * DETACHED regen of build-vault-precheck-sidecar.mjs so the next prompt sees fresh body recall.
 * Folds the memory-index-sidecar-regen logic into this already-wired consumer hook (no new
 * settings.json Stop entry). Never blocks the inject (detached + unref) and never throws.
 * Knob: PRISM_VAULT_PRECHECK_REGEN_DISABLE=1.
 */
function maybeTriggerRegen() {
  if (process.env.PRISM_VAULT_PRECHECK_REGEN_DISABLE === "1") return;
  try {
    let last = 0;
    try { last = Number(fs.readFileSync(REGEN_STAMP_PATH, "utf8").trim()) || 0; } catch { /* no stamp yet */ }
    if (Date.now() - last < REGEN_THROTTLE_MS) return;
    if (!sidecarStaleness().regen) return;
    try { fs.writeFileSync(REGEN_STAMP_PATH, String(Date.now())); } catch { /* fail-soft */ }
    const child = spawn(process.execPath, [BUILDER_SCRIPT], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
  } catch { /* fail-soft: freshness maintenance never breaks the inject */ }
}

/**
 * Resolve the entry set to score: prefer the body-excerpt sidecar (body recall); fall back to a
 * live basename-only walk (excerpt:"" -> scoreEntry behaves exactly as the legacy basename-only
 * path). Returns { entries, bodyRecall }.
 */
function resolveEntries() {
  const sc = loadSidecar();
  if (sc && Array.isArray(sc.entries) && sc.entries.length > 0) {
    return { entries: sc.entries, bodyRecall: true };
  }
  const entries = [];
  for (const t of SCAN_TARGETS) {
    for (const bucket of t.buckets) {
      const dir = path.join(t.root, bucket);
      for (const file of listFiles(dir)) {
        entries.push({
          relPath: path.relative(REPO_ROOT, file).split(/[\\/]+/).join("/"),
          bucket,
          basename: path.basename(file, path.extname(file)).toLowerCase(),
          excerpt: "",
        });
      }
    }
  }
  return { entries, bodyRecall: false };
}

function main() {
  if (process.env.PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  maybeTriggerRegen(); // throttled + detached -- keeps the body-excerpt sidecar fresh, never blocks
  let stdin = {};
  try { stdin = JSON.parse(readStdinSync() || "{}"); } catch { /* pass */ }
  const prompt = String(stdin.prompt || stdin.user_prompt || "");
  const qt = tokenize(prompt);
  if (qt.length === 0) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const { entries, bodyRecall } = resolveEntries();
  const hits = [];
  for (const e of entries) {
    const s = scoreEntry(e, qt);
    if (s >= MIN_SCORE) hits.push({ path: e.relPath, bucket: e.bucket, score: s, name: e.basename });
  }
  if (hits.length === 0) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, TOPK);

  const lines = top.map((h) => `  • [${h.bucket}] **${h.name}** \`${h.path}\``).join("\n");
  const recallNote = bodyRecall ? "name+body" : "name-only";
  const block =
    `## 📂 Obsidian vault precheck -- ${top.length} note(s) match prompt (${recallNote})\n` +
    lines + "\n" +
    `_Scanned: ${SCANNED_LABEL}. master-index covers wiki+memories+graph; this fills the rest. Disable: \`PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE=1\`._`;

  // Per-session injection dedup (U-ALPHA-INJECT-DEDUP-FS): re-emit the full block only when its
  // content changes or the 5-min TTL expires; otherwise a 1-line marker. Saves ~835B/turn fleet-wide.
  const additionalContext = dedupeOrMarker(block, {
    sessionId: stdin.session_id, hookName: "obsidian-vault-precheck", root: REPO_ROOT,
  });

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }));
}

try { main(); }
catch { process.stdout.write(JSON.stringify({ continue: true })); }
