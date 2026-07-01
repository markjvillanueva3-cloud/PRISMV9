#!/usr/bin/env node
/**
 * embed-missing-wiki-batch.mjs — drive the (now-fixed) wiki->tribal embedder
 * over every missing file, in chunks, on the local GPU. Closes gap #5 from
 * SYSTEM-SYNERGY-GAPMAP-2026-06-08 (wiki<->tribal coverage stuck at 83.7%).
 *
 * Reads the cross-ref audit's `missingFromTribal`, filters to files that
 * EXIST on disk and are NOT `_`-generated, then invokes
 * embed-wiki-into-tribal-index.mjs --apply per chunk with an 8GB heap
 * (the 533MB index OOMs a default heap — see
 * reference_wiki_tribal_embed_pipeline_blocked_2026_06_08).
 *
 * Idempotent: the embedder skips already-embedded files (hash match), so a
 * re-run only embeds the remainder. Run detached; it advances coverage over
 * time without holding a chat.
 *
 * Usage: node scripts/embed-missing-wiki-batch.mjs [--chunk 12] [--max 0=all] [--domain general]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "H:/prism";
const AUDIT = path.join(ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");
const EMBEDDER = path.join(ROOT, "scripts/embed-wiki-into-tribal-index.mjs");
const LOG = path.join(ROOT, "state/shared/.wiki-embed-driver.log");

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const CHUNK = Math.max(1, parseInt(arg("--chunk", "12"), 10));
const MAX = parseInt(arg("--max", "0"), 10); // 0 = all
const DOMAIN = arg("--domain", "general");

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  try { fs.appendFileSync(LOG, line); } catch { /* best-effort */ }
  process.stdout.write(line);
}

function main() {
  const audit = JSON.parse(fs.readFileSync(AUDIT, "utf8"));
  let files = (audit.missingFromTribal || [])
    .filter((p) => !path.basename(p).startsWith("_"))
    .map((p) => path.join(ROOT, "knowledge/wiki", p))
    .filter((p) => {
      try { return fs.statSync(p).size > 0; } catch { return false; }
    });
  if (MAX > 0) files = files.slice(0, MAX);

  log(`START driver: ${files.length} existing non-generated missing files, chunk=${CHUNK}, domain=${DOMAIN}`);
  let added = 0, failedChunks = 0, done = 0;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    try {
      const out = execFileSync(
        process.execPath,
        ["--max-old-space-size=8192", EMBEDDER, "--apply", "--domain", DOMAIN, ...chunk],
        { cwd: ROOT, encoding: "utf8", timeout: 300000, maxBuffer: 64 * 1024 * 1024 },
      );
      const m = out.match(/added:\s*(\d+)/);
      if (m) added += parseInt(m[1], 10);
    } catch (e) {
      // A chunk that 500s (e.g. one over-long file the clamp still can't fit, or
      // an empty-extract) fails-loud; log and continue so one bad file never
      // stalls the whole corpus. The bad files surface in the log for triage.
      failedChunks++;
      log(`CHUNK ${i}-${i + chunk.length} FAILED: ${String(e.message).slice(0, 160)}`);
    }
    done += chunk.length;
    if (done % (CHUNK * 10) === 0 || i + CHUNK >= files.length) {
      log(`progress ${done}/${files.length} · added ${added} · failedChunks ${failedChunks}`);
    }
  }
  log(`DONE: processed ${done}, added ${added}, failedChunks ${failedChunks}`);
}

main();
