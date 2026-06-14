#!/usr/bin/env node
/**
 * retag-backend-dev-batch.mjs — adds `domain: backend-dev` to lesson/SE
 * wiki frontmatter that's missing it. Idempotent (skips already-tagged).
 * BACKEND-DEV-LOOP / U-TRIBAL-BACKEND-DEV-RETAG2026-05-18 (slot alpha).
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();
const TARGETS = [
  "knowledge/wiki/lessons/auto-tool-error-fork-storm.md",
  "knowledge/wiki/lessons/auto-tool-error-git-lock-contention.md",
  "knowledge/wiki/lessons/auto-type-error-tsc.md",
  "knowledge/wiki/lessons/auto-test-fail-test-fail.md",
  "knowledge/wiki/lessons/bug-findings-wiki-gate.md",
  "knowledge/wiki/lessons/claude-md-regression-log.md",
  "knowledge/wiki/lessons/complexity-fallback-cascade.md",
  "knowledge/wiki/lessons/feature-gap-audit-digest-staleness.md",
  "knowledge/wiki/lessons/git-bloat-from-lint-staged-cascade.md",
  "knowledge/wiki/lessons/missing-file-copy-back.md",
  "knowledge/wiki/lessons/regen-viz-merge-faillod.md",
  "knowledge/wiki/lessons/seed-ghost-v8-string-cap.md",
  "knowledge/wiki/lessons/sourcehash-control-byte-doc-drift.md",
];

let retagged = 0;
let alreadyTagged = 0;
let missing = 0;

for (const rel of TARGETS) {
  const abs = join(REPO, rel);
  try {
    statSync(abs);
  } catch {
    console.log(`MISSING: ${rel}`);
    missing++;
    continue;
  }
  const orig = readFileSync(abs, "utf-8");
  if (!orig.startsWith("---")) {
    console.log(`NO_FRONTMATTER: ${rel}`);
    continue;
  }
  if (/^domain:\s*backend-dev/m.test(orig.split(/^---\s*$/m)[1] || "")) {
    alreadyTagged++;
    continue;
  }
  // Inject `domain: backend-dev` line BEFORE the closing `---`.
  const lines = orig.split(/\r?\n/);
  // Find the closing `---` of the frontmatter (the SECOND `---`).
  let firstFmEnd = -1;
  let inFm = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      if (!inFm) {
        inFm = true;
      } else {
        firstFmEnd = i;
        break;
      }
    }
  }
  if (firstFmEnd < 0) {
    console.log(`UNCLOSED_FRONTMATTER: ${rel}`);
    continue;
  }
  lines.splice(firstFmEnd, 0, "domain: backend-dev");
  writeFileSync(abs, lines.join("\n"));
  retagged++;
  console.log(`RETAGGED: ${rel}`);
}

console.log(
  `\nsummary: retagged=${retagged}, alreadyTagged=${alreadyTagged}, missing=${missing}`,
);
