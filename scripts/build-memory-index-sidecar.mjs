#!/usr/bin/env node
// U-MEMORY-INDEX-SIDECAR — pre-build the memory-vault sidecar so the H7
// UserPromptSubmit hook (memory-index-precheck-inject.mjs) can hit a
// pre-parsed JSON instead of cold-scanning the ~492-file vault every prompt
// (measured at ~8.7 s — exceeded the 5 s UPS timeout, so H7 shipped UNWIRED).
//
// Reads:  H:/prism/knowledge/memories/{feedback,reference,project,user,
//         patterns,mistakes,inbox}/*.md
//         + (A3) H:/prism/mcp-server/src/engines/<galaxy>/MEMORY.md — the 34
//           per-galaxy brains, indexed under the `galaxies` namespace.
// Writes: H:/prism/state/shared/memory-index-sidecar.json  (atomic .tmp+rename)
//
// Schema: { schemaVersion, builtAt, vaultRoot, namespaces, sourceMtimeMs,
//           recordCount, records: [ {name, fileName, namespace, description,
//                                    opening} ] }
//
// sourceMtimeMs = max(stat(namespace_dir).mtimeMs) — the lib re-validates by
// comparing it to the live vault and rejects a stale sidecar (falls back to
// live scan + stderr R12 warning).
//
// Idempotent. Safe to run on a Stop hook or post-commit hook. Pure-CLI; no
// side effects beyond the atomic write.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  DEFAULT_SIDECAR_PATH,
  SIDECAR_SCHEMA_VERSION,
  DEFAULT_NAMESPACES,
  buildMemoryRecord,
  isSupersededMemory,
  supersededExclusionEnabled,
} from "./lib/memory-index-search-lib.mjs";

// U-OBF-RECALL-NS (2026-05-29 slot:alpha): namespaces now SINGLE-SOURCED from the lib
// (was a duplicated literal here — the drift made A1's lib edit silently not apply to the sidecar).
const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_MAX_BODY_BYTES = 4096;

// A3 (2026-05-29 slot:alpha): per-galaxy brains live OUTSIDE the vault, at
// mcp-server/src/engines/<galaxy>/MEMORY.md — one brain per of the 34 galaxies.
// They were absent from the recall corpus (the `galaxies` namespace held only
// the vault README), so the per-domain brains were NOT semantically reachable
// through the recall hot path that A6 just upgraded. This indexes them so the
// hybrid BM25+dense recall surfaces a galaxy brain on a domain-keyword query.
// NOTE: these files are named MEMORY.md (which the vault loop deliberately
// SKIPS) and carry the galaxy name in the DIRECTORY, not the filename — so they
// need this dedicated collector rather than a namespace entry.
const DEFAULT_GALAXY_ENGINES_ROOT = "H:/prism/mcp-server/src/engines";

// A3-ENRICHMENT (2026-05-29 slot:alpha): galaxy brains index their DOMAIN text,
// not their boilerplate header. The cascade-index brains (lathe/wedm/speed-feed)
// share a verbatim header ("# X Galaxy MEMORY.md — per-domain memory cascade
// index" + a "Master-brain link" block) — so indexing only the H1 + first
// paragraph (A3's first cut) gave them near-identical, domain-blind signal and
// they ranked >200 on domain-term queries. The DOMAIN vocabulary lives in the
// body (H2/H3 section headings, the "Filename heuristic: lathe, turning, css,
// g96, threading…" line, fenced domain rules like "G96 always paired with G50").
// `extractGalaxyDomainText` harvests that, skipping the shared template noise, so
// both BM25 (`opening`) and the dense embedding (`buildEmbedDocText` =
// name+description+opening) get real domain signal.
const GALAXY_OPENING_MAX = 700; // galaxy brains are domain HUBS — wider than the 200-char vault opening

// Lines that repeat VERBATIM (or near-so) across the galaxy brains — pure
// template/governance noise that dilutes the domain signal. Dropped from the
// indexed domain text. Two clusters: (1) the cascade-index template block, and
// (2) the generic "this is a cross-session brain" governance lead that opens
// the RICH brains and would otherwise crowd real domain terms past the cap
// (Reviewer-B P2-1: post-processor lost Haas/Okuma/Fanuc behind 6KB of such
// lead). Phrases are chosen distinctively so they never collide with domain
// vocabulary — e.g. we match "Cross-session memory"/"older entries collapse",
// NOT bare "append-only" (which is legitimate database-galaxy domain content).
const GALAXY_BOILERPLATE_RE = /(per-domain memory cascade|master-brain link|UP \(pull|DOWN \(push|MASTER-INDEX edge|Last master-sync|stop-obsidian-memory-feed|recall:\s*`?prism_memory|Status:\s*STUB|auto-loads when claude edits|cross-session (?:memory|working brain)|older entries collapse|MEMORY\.md size discipline|MASTER-BRAIN-TEMPLATE|eats its own dogfood)/i;

export function extractGalaxyDomainText(body, { maxChars = GALAXY_OPENING_MAX } = {}) {
  if (typeof body !== "string" || !body) return "";
  const out = [];
  let budget = 0;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "---" || line.startsWith("```")) continue;   // hr + code-fence markers (keep fenced CONTENT — it carries domain rules)
    if (/^#\s/.test(raw)) continue;                            // skip the H1 (it's already the description); ## / ### pass through
    if (GALAXY_BOILERPLATE_RE.test(line)) continue;            // drop the shared cascade-template boilerplate
    // Strip leading markdown markers (##, >, -, *, "1.") to keep the heading/prose text.
    const text = line.replace(/^[#>\-*\s]+/, "").replace(/^\d+\.\s*/, "").trim();
    if (!text) continue;
    out.push(text);
    budget += text.length + 1;
    if (budget >= maxChars) break;
  }
  return out.join(" ").slice(0, maxChars);
}

// Collect the per-galaxy MEMORY.md brains as `galaxies`-namespace records.
// Returns { records, maxMtimeMs, skipped }. maxMtimeMs is reported separately
// and intentionally NOT folded into the sidecar `sourceMtimeMs` — that field is
// the lib's vault-staleness oracle (compared against the vault namespace dirs
// only); polluting it with the fast-churning engines/ mtime would suppress the
// "sidecar stale" advisory that prompts a vault regen.
export function collectGalaxyBrains({
  enginesRoot = DEFAULT_GALAXY_ENGINES_ROOT,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  readdirImpl = readdirSync,
  readFileImpl = readFileSync,
  statImpl = statSync,
  existsImpl = existsSync,
} = {}) {
  const records = [];
  let maxMtimeMs = 0;
  let skipped = 0;

  if (!existsImpl(enginesRoot)) return { records, maxMtimeMs, skipped };

  let names;
  try { names = readdirImpl(enginesRoot); } catch { return { records, maxMtimeMs, skipped }; }

  for (const slug of names) {
    if (typeof slug !== "string" || !slug) continue;
    const memPath = join(enginesRoot, slug, "MEMORY.md");
    // A galaxy is any engines/ subdir that actually carries a MEMORY.md brain.
    // (No withFileTypes / isDirectory probe needed — the MEMORY.md existence
    // check IS the directory filter, and it stays trivially mockable in tests.)
    if (!existsImpl(memPath)) continue;

    try {
      const st = statImpl(memPath);
      if (st.mtimeMs > maxMtimeMs) maxMtimeMs = st.mtimeMs;
    } catch { /* mtime is observability-only — never fatal */ }

    let body;
    try { body = readFileImpl(memPath, "utf8"); }
    catch { skipped++; continue; }

    // Reuse the vault record builder for the frontmatter/opening logic, with a
    // synthetic `<slug>.md` filename so it derives name === slug (the 34 real
    // files are all literally "MEMORY.md" and would otherwise all collide on
    // name "MEMORY").
    const rec = buildMemoryRecord({ namespace: "galaxies", fileName: `${slug}.md`, body, maxBodyBytes });
    if (!rec) { skipped++; continue; }

    // Galaxy brains carry no YAML frontmatter — derive a description from the
    // leading H1 so BM25 has a strong title signal (and the dense embedding of
    // title+opening gives the semantic signal).
    let description = rec.description;
    if (!description) {
      const h1 = (body.match(/^\s*#\s+(.+?)\s*$/m) || [])[1];
      if (h1) description = h1.slice(0, 280);
    }

    // A3-ENRICHMENT: index the brain's DOMAIN text (heading texts + filename-
    // heuristic line + fenced rules), not the boilerplate first paragraph. Fall
    // back to the lib's firstParagraph opening if extraction yields nothing.
    const domainText = extractGalaxyDomainText(body) || (rec.opening || "").slice(0, GALAXY_OPENING_MAX);

    records.push({
      name: rec.name,                 // === slug, e.g. "token-optimization"
      fileName: `${slug}/MEMORY.md`,  // distinct from the galaxies/README vault note
      namespace: "galaxies",
      description: description || "",
      aliases: [],
      opening: domainText,
    });
  }

  return { records, maxMtimeMs, skipped };
}

export function buildSidecar({
  vaultRoot = DEFAULT_VAULT_ROOT,
  namespaces = DEFAULT_NAMESPACES,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  includeGalaxyBrains = true,
  galaxyEnginesRoot = DEFAULT_GALAXY_ENGINES_ROOT,
  // MEMORY-RECALL-SUPERSEDE (2026-06-01 slot:golf): drop formally-superseded
  // memories from the recall corpus so no galaxy surfaces stale doctrine as
  // current. Default from the env knob; explicit arg wins (used by tests).
  // Galaxy brains are NEVER filtered — they are the per-domain context anchors.
  excludeSuperseded = supersededExclusionEnabled(),
  readdirImpl = readdirSync,
  readFileImpl = readFileSync,
  statImpl = statSync,
  existsImpl = existsSync,
} = {}) {
  const records = [];
  let sourceMtimeMs = 0;
  let skippedFiles = 0;
  let supersededSkipped = 0;
  let galaxyBrainCount = 0;
  let galaxyMtimeMs = 0;

  for (const ns of namespaces) {
    const dir = join(vaultRoot, ns);
    if (!existsImpl(dir)) continue;
    let dirStat;
    try { dirStat = statImpl(dir); } catch { continue; }
    if (dirStat.mtimeMs > sourceMtimeMs) sourceMtimeMs = dirStat.mtimeMs;

    let names;
    try { names = readdirImpl(dir); } catch { continue; }
    for (const fileName of names) {
      if (!/\.md$/i.test(fileName)) continue;
      if (fileName === "MEMORY.md" || fileName === "MEMORY-ARCHIVE.md") continue;
      const fullPath = join(dir, fileName);

      let body;
      try { body = readFileImpl(fullPath, "utf8"); }
      catch { skippedFiles++; continue; }

      if (excludeSuperseded && isSupersededMemory(body)) { supersededSkipped++; continue; }

      const rec = buildMemoryRecord({ namespace: ns, fileName, body, maxBodyBytes });
      if (!rec) { skippedFiles++; continue; }

      records.push({
        name: rec.name,
        fileName: rec.fileName,
        namespace: rec.namespace,
        description: rec.description || "",
        // PSN-ENHANCE-MS0/U-PSN-MASTER-INDEX-ALIASES (2026-05-23): include
        // alias synonyms in the sidecar so the fast-path scorer can hit them.
        // Back-compat: older sidecars (no aliases) still load — the lib
        // defaults missing/non-array to [] and skips the W_ALIAS contribution.
        aliases: Array.isArray(rec.aliases) ? rec.aliases : [],
        opening: (rec.opening || "").slice(0, 200),
      });
    }
  }

  // A3: fold in the per-galaxy MEMORY.md brains (namespace `galaxies`).
  if (includeGalaxyBrains) {
    const g = collectGalaxyBrains({
      enginesRoot: galaxyEnginesRoot,
      maxBodyBytes,
      readdirImpl,
      readFileImpl,
      statImpl,
      existsImpl,
    });
    for (const r of g.records) records.push(r);
    galaxyBrainCount = g.records.length;
    galaxyMtimeMs = g.maxMtimeMs;
    skippedFiles += g.skipped;
  }

  records.sort((a, b) => {
    if (a.namespace !== b.namespace) return a.namespace.localeCompare(b.namespace);
    return a.name.localeCompare(b.name);
  });

  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    builtAt: new Date().toISOString(),
    vaultRoot,
    namespaces,
    sourceMtimeMs,
    recordCount: records.length,
    skippedFiles,
    // MEMORY-RECALL-SUPERSEDE observability — how many formally-superseded
    // memories were dropped from the recall corpus this build.
    supersededSkipped,
    // A3 observability — galaxyMtimeMs is intentionally NOT the staleness oracle
    // (sourceMtimeMs stays vault-only; see collectGalaxyBrains note).
    galaxyBrainCount,
    galaxyMtimeMs,
    records,
  };
}

export function writeSidecarAtomically({
  outPath = DEFAULT_SIDECAR_PATH,
  sidecar,
  writeFileImpl = writeFileSync,
  renameImpl = renameSync,
  mkdirImpl = mkdirSync,
  existsImpl = existsSync,
} = {}) {
  if (!sidecar || typeof sidecar !== "object") {
    throw new Error("writeSidecarAtomically: refusing to write empty sidecar");
  }
  const dir = dirname(outPath);
  if (!existsImpl(dir)) {
    mkdirImpl(dir, { recursive: true });
  }
  const tmpPath = `${outPath}.tmp.${process.pid}`;
  writeFileImpl(tmpPath, JSON.stringify(sidecar), "utf8");
  renameImpl(tmpPath, outPath);
  return outPath;
}

function main() {
  const args = process.argv.slice(2);
  const wantsJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");

  const start = Date.now();
  const sidecar = buildSidecar({});
  const elapsedMs = Date.now() - start;

  if (dryRun) {
    if (wantsJson) {
      process.stdout.write(JSON.stringify({
        dryRun: true,
        elapsedMs,
        recordCount: sidecar.recordCount,
        skippedFiles: sidecar.skippedFiles,
        supersededSkipped: sidecar.supersededSkipped,
        sourceMtimeMs: sidecar.sourceMtimeMs,
      }, null, 2) + "\n");
    } else {
      process.stdout.write(
        `[build-memory-index-sidecar] DRY RUN — records=${sidecar.recordCount} `
        + `skipped=${sidecar.skippedFiles} superseded=${sidecar.supersededSkipped} elapsed=${elapsedMs}ms\n`,
      );
    }
    return;
  }

  const outPath = writeSidecarAtomically({ sidecar });

  if (wantsJson) {
    process.stdout.write(JSON.stringify({
      ok: true,
      outPath,
      elapsedMs,
      recordCount: sidecar.recordCount,
      skippedFiles: sidecar.skippedFiles,
      supersededSkipped: sidecar.supersededSkipped,
      sourceMtimeMs: sidecar.sourceMtimeMs,
      schemaVersion: sidecar.schemaVersion,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `[build-memory-index-sidecar] wrote ${outPath} `
      + `records=${sidecar.recordCount} skipped=${sidecar.skippedFiles} `
      + `superseded=${sidecar.supersededSkipped} elapsed=${elapsedMs}ms\n`,
    );
  }
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  try { main(); }
  catch (err) {
    try { process.stderr.write(`[build-memory-index-sidecar] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  }
}
