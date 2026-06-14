#!/usr/bin/env node
/**
 * slim-claude-md-injection.mjs (U-ALPHA-CLAUDEMD-SLIM, operator directive 2026-06-11: "optimize the
 * 200k token injection, make it more efficient")
 *
 * The project CLAUDE.md (auto-injected into EVERY chat turn AND every subagent prompt fleet-wide) is
 * 811 lines / 163KB, of which ~308 are append-only DATED log lines (`- YYYY-MM-DD | ... | observed-in:
 * <sha> | verify: git show <sha>`) -- pure history, NOT doctrine, costing ~22K tokens per injection.
 * Two blocks:
 *   (1) a HEADERLESS raw commit log wedged between the CANONICAL SOURCES table and PER-FILE SCRUTINY
 *       GATE (no active writer -- stale accumulation; pure `git log`, zero in-context value);
 *   (2) the `## Recent regressions` section (has root-cause LESSONS -- keep the most-recent N inline,
 *       archive the rest).
 *
 * This moves the bulk to non-injected archive files under state/shared/, leaving pointers, with HARD
 * SAFEGUARDS: only DATED log lines are ever moved (never a `## ` doctrine header or prose); the set of
 * `## ` section headers must be IDENTICAL before/after (fail-loud if any doctrine section would be
 * lost -- R12); atomic write; .bak backup. Dry-run by default; --apply to write.
 *
 * USAGE: node scripts/slim-claude-md-injection.mjs [--apply] [--keep-regressions N]
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const KEEP = (() => { const i = process.argv.indexOf("--keep-regressions"); return i >= 0 ? parseInt(process.argv[i + 1], 10) || 15 : 15; })();
const CLAUDE_MD = "H:/prism/CLAUDE.md";
const COMMIT_ARCHIVE = "H:/prism/state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md";
const REGR_ARCHIVE = "H:/prism/state/shared/RECENT-REGRESSIONS-ARCHIVE.md";
const REGR_HEADER = "## Recent regressions";

const DATED = /^- \d{4}-\d{2}-\d{2} \|/;          // a dated log line
const isHeader = (l) => /^#{1,6} /.test(l);
const headerSet = (lines) => lines.filter(isHeader).join("\n");

function main() {
  const orig = readFileSync(CLAUDE_MD, "utf8");
  const lines = orig.split(/\r?\n/);
  const headersBefore = headerSet(lines);

  // Locate the Recent-regressions section span [regrStart, regrEnd) -- header line .. next header/EOF.
  let regrStart = lines.findIndex((l) => l.trim() === REGR_HEADER);
  let regrEnd = lines.length;
  if (regrStart >= 0) {
    for (let i = regrStart + 1; i < lines.length; i++) { if (isHeader(lines[i])) { regrEnd = i; break; } }
  }

  // Block #1 = dated lines OUTSIDE the regressions section (the headerless stale commit log).
  const inRegr = (i) => regrStart >= 0 && i > regrStart && i < regrEnd;
  const block1Idx = lines.map((l, i) => (DATED.test(l) && !inRegr(i) ? i : -1)).filter((i) => i >= 0);

  // Regressions dated lines (newest-first as stored: regression-auto-write inserts at TOP).
  const regrIdx = regrStart >= 0 ? lines.map((l, i) => (inRegr(i) && DATED.test(l) ? i : -1)).filter((i) => i >= 0) : [];
  const regrKeep = new Set(regrIdx.slice(0, KEEP));         // keep most-recent N inline
  const regrArchiveIdx = regrIdx.slice(KEEP);              // archive the rest

  // --- build archives ---
  const commitArchiveLines = block1Idx.map((i) => lines[i]);
  const regrArchiveLines = regrArchiveIdx.map((i) => lines[i]);

  // --- rebuild CLAUDE.md: drop block1 (replace contiguous run with a pointer) + drop archived regressions ---
  const drop = new Set([...block1Idx, ...regrArchiveIdx]);
  const out = [];
  let block1PointerEmitted = false;
  for (let i = 0; i < lines.length; i++) {
    if (drop.has(i)) {
      // Emit the block-1 pointer ONCE, at the position of the first block-1 line.
      if (block1Idx.length && i === block1Idx[0] && !block1PointerEmitted) {
        out.push(`> _Recent-commits log moved to [\`state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md\`](state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md) (token-injection slim, U-ALPHA-CLAUDEMD-SLIM 2026-06-11) -- it was a raw \`git log\` with no doctrine value. Full history: \`git log\`._`);
        block1PointerEmitted = true;
      }
      // Emit the regressions-archive pointer ONCE, at the first archived regression line.
      if (regrArchiveIdx.length && i === regrArchiveIdx[0]) {
        out.push(`- _Older regressions (pre most-recent ${KEEP}) archived to [\`state/shared/RECENT-REGRESSIONS-ARCHIVE.md\`](state/shared/RECENT-REGRESSIONS-ARCHIVE.md) -- token-injection slim. They remain searchable + the lessons live in the wiki._`);
      }
      continue;
    }
    out.push(lines[i]);
  }
  const next = out.join("\n");

  // --- HARD SAFEGUARD (R12): no doctrine `## ` header may be lost ---
  const headersAfter = headerSet(out);
  if (headersBefore !== headersAfter) {
    console.error("FATAL: section-header set changed -- refusing to write (a doctrine section would be lost).");
    const before = headersBefore.split("\n"), after = new Set(headersAfter.split("\n"));
    console.error("MISSING:", before.filter((h) => !after.has(h)).join(" | ") || "(none)");
    process.exit(1);
  }
  // SAFEGUARD: every moved line must be a dated log line (never prose/headers).
  const moved = [...commitArchiveLines, ...regrArchiveLines];
  const bad = moved.filter((l) => !DATED.test(l));
  if (bad.length) { console.error("FATAL: non-dated line in move set:", bad[0]); process.exit(1); }

  const report = {
    apply: APPLY,
    block1_commitlog_lines: block1Idx.length,
    regressions_total: regrIdx.length,
    regressions_kept_inline: Math.min(KEEP, regrIdx.length),
    regressions_archived: regrArchiveIdx.length,
    bytes_before: Buffer.byteLength(orig),
    bytes_after: Buffer.byteLength(next),
    bytes_saved: Buffer.byteLength(orig) - Buffer.byteLength(next),
    pct_saved: +(100 * (Buffer.byteLength(orig) - Buffer.byteLength(next)) / Buffer.byteLength(orig)).toFixed(1),
    est_tokens_saved: Math.round((Buffer.byteLength(orig) - Buffer.byteLength(next)) / 3.5),
  };

  if (!APPLY) { console.log(JSON.stringify({ ...report, note: "DRY-RUN (pass --apply to write)" }, null, 2)); return; }

  // --- atomic write + backup + archives (append-mode so re-runs accrete history) ---
  writeFileSync(CLAUDE_MD + ".bak-slim", orig);
  const ts = "2026-06-11";
  const archHeader = (title) => `# ${title}\n> Externalized from CLAUDE.md by slim-claude-md-injection.mjs (U-ALPHA-CLAUDEMD-SLIM) to cut the fleet-wide token injection. Append-only.\n\n`;
  writeFileSync(COMMIT_ARCHIVE, (existsSync(COMMIT_ARCHIVE) ? readFileSync(COMMIT_ARCHIVE, "utf8") + "\n" : archHeader("CLAUDE.md recent-commits log archive")) + `\n## migrated ${ts}\n` + commitArchiveLines.join("\n") + "\n");
  if (regrArchiveLines.length) writeFileSync(REGR_ARCHIVE, (existsSync(REGR_ARCHIVE) ? readFileSync(REGR_ARCHIVE, "utf8") + "\n" : archHeader("CLAUDE.md Recent-regressions archive")) + `\n## migrated ${ts}\n` + regrArchiveLines.join("\n") + "\n");
  const tmp = CLAUDE_MD + ".tmp-slim";
  writeFileSync(tmp, next);
  renameSync(tmp, CLAUDE_MD);
  console.log(JSON.stringify({ ...report, wrote: CLAUDE_MD, backup: CLAUDE_MD + ".bak-slim", archives: [COMMIT_ARCHIVE, regrArchiveLines.length ? REGR_ARCHIVE : null].filter(Boolean) }, null, 2));
}

main();
