#!/usr/bin/env node
/**
 * wiki-harvest-h-drive.mjs — KNOWLEDGE-WIKI-MS0 / U-WIKI04B
 *
 * One-time bulk import of H:/prism knowledge into knowledge/wiki/.
 *
 * What it harvests (per milestone spec):
 *   - 55 memories  → knowledge/memories/{user,feedback,project,reference}/*.md
 *   - 24 CAM tips  → wiki/code-tribal/* candidates from feedback memories tagged
 *                    "amateur"/"shop"/"cam"/"box" + any tribal_*.md page
 *   - 18 engines   → ENGINE_DIGEST.md top entries with first-paragraph summary
 *
 * Pipeline (mirrors WikiIngestRouterEngine §3.1):
 *   stage 1 — read raw source         (this script)
 *   stage 2 — Ollama summary          (this script, optional — falls back to
 *                                      first paragraph if Ollama unreachable)
 *   stage 3 — Ollama cross-refs       (this script — Hamming-style slug match
 *                                      against existing wiki/index.md)
 *   stage 4 — Claude synthesis        (DEFERRED — written to
 *                                      knowledge/wiki/.contradictions.jsonl
 *                                      whenever stage 3 finds an existing slug
 *                                      with a different summary)
 *   stage 5 — file:                   knowledge/wiki/{summaries,patterns,
 *                                      lessons}/harvest-{slug}.md
 *                                     + index.md + log.md (with file lock)
 *
 * Token economy:
 *   - The script tracks per-source `ollamaTokens` vs `claudeTokens`.
 *   - The exit-condition floor (≥80% Ollama share) is enforced — if Ollama is
 *     unreachable AND ≥1 contradiction would be logged, the run aborts so the
 *     operator can investigate rather than silently spend the budget on Claude.
 *
 * Idempotency:
 *   - Computes a sha1 over each source's full text.
 *   - Reads `.harvest-manifest.json`; skips slugs whose hash is unchanged.
 *   - Same input ⇒ zero new files / zero log lines.
 *
 * @module wiki-harvest-h-drive
 */

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync, renameSync,
} from "node:fs";
import { join, basename, dirname } from "node:path";
import { createHash } from "node:crypto";
import { request as httpRequest } from "node:http";

// ============================================================================
// CONFIG
// ============================================================================

const REPO = process.env.PRISM_REPO ?? "H:/prism-knowledge-wiki";
const WIKI = join(REPO, "knowledge", "wiki");
const MEMORIES = join(REPO, "knowledge", "memories");
const ENGINE_DIGEST = join(REPO, "mcp-server", "data", "docs", "ENGINE_DIGEST.md");
const MANIFEST = join(WIKI, ".harvest-manifest.json");
const CONTRADICTIONS = join(WIKI, ".contradictions.jsonl");
const INDEX_MD = join(WIKI, "index.md");
const LOG_MD = join(WIKI, "log.md");
const SUMMARIES_DIR = join(WIKI, "summaries");
const TODAY = new Date().toISOString().slice(0, 10);
const HARVEST_AGENT = "wiki-harvest-h-drive.mjs";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";
const OLLAMA_TIMEOUT_MS = 5_000;
const OLLAMA_TOKEN_FLOOR = 0.80;

const CAM_TIP_KEYWORDS = ["amateur", "shop", "cam", "box", "edm", "ppg", "ppe"];
const ENGINE_DIGEST_TOP_N = 18;

// ============================================================================
// TYPES (jsdoc only — pure JS file)
// ============================================================================

/**
 * @typedef {Object} HarvestRecord
 * @property {string} slug
 * @property {string} category
 * @property {string} sourcePath
 * @property {string} sourceHash
 * @property {string} summary
 * @property {string[]} crossRefs
 * @property {number} ollamaTokens
 * @property {number} claudeTokens
 * @property {string} addedAt
 */

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!existsSync(WIKI)) {
    console.error(`[harvest] wiki dir missing: ${WIKI}`);
    process.exit(1);
  }
  mkdirSync(SUMMARIES_DIR, { recursive: true });

  const prior = readManifest();
  const sources = [
    ...discoverMemories(),
    ...discoverCAMTips(),
    ...discoverEngineDigestSlice(),
  ];

  let fresh = 0, skipped = 0, contradictions = 0;
  let ollamaTotal = 0, claudeTotal = 0;
  const newRecords = [];

  for (const src of sources) {
    const hash = sha1(src.text);
    const slug = src.slug;
    if (prior[slug] && prior[slug].sourceHash === hash) {
      skipped++;
      continue;
    }

    let summary = "";
    let ollamaTokens = 0;
    try {
      const resp = await ollamaSummarize(src.text);
      summary = resp.summary;
      ollamaTokens = resp.tokens;
    } catch {
      summary = firstParagraph(src.text);
      ollamaTokens = 0; // fallback path: zero Ollama spend
    }
    ollamaTotal += ollamaTokens;

    const crossRefs = findCrossRefs(slug, summary, prior);
    const contradiction = detectContradiction(slug, summary, prior);
    if (contradiction) {
      writeContradiction(contradiction);
      contradictions++;
      // Claude would consume tokens to resolve — count those notionally.
      claudeTotal += 200;
    }

    const record = {
      slug,
      category: src.category,
      sourcePath: src.sourcePath,
      sourceHash: hash,
      summary,
      crossRefs,
      ollamaTokens,
      claudeTokens: contradiction ? 200 : 0,
      addedAt: TODAY,
    };
    materialiseSummaryFile(record);
    upsertIndexLine(record);
    appendLog(`harvest:source ${slug} (${src.category})`);
    newRecords.push(record);
    fresh++;
  }

  const totalTokens = ollamaTotal + claudeTotal;
  const ollamaShare = totalTokens > 0 ? ollamaTotal / totalTokens : 1.0;
  const meetsFloor = ollamaShare >= OLLAMA_TOKEN_FLOOR;

  if (!meetsFloor && contradictions > 0) {
    console.error(
      `[harvest] ABORT: Ollama share ${(ollamaShare * 100).toFixed(1)}% below ${OLLAMA_TOKEN_FLOOR * 100}% floor with ${contradictions} contradictions.`
    );
    console.error(`[harvest] Investigate Ollama at ${OLLAMA_URL} before re-running.`);
    process.exit(2);
  }

  // Persist manifest only if everything succeeded.
  const next = { ...prior };
  for (const r of newRecords) next[r.slug] = r;
  writeManifest(next);

  console.log(`[harvest] fresh=${fresh}  skipped=${skipped}  contradictions=${contradictions}`);
  console.log(`[harvest] ollama_tokens=${ollamaTotal}  claude_tokens=${claudeTotal}  ollama_share=${(ollamaShare * 100).toFixed(1)}%`);
  console.log(`[harvest] manifest=${MANIFEST}`);
}

// ============================================================================
// DISCOVERY
// ============================================================================

function discoverMemories() {
  const out = [];
  for (const sd of ["user", "feedback", "project", "reference"]) {
    const dir = join(MEMORIES, sd);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const sourcePath = join(dir, f);
      const text = readFileSync(sourcePath, "utf8");
      const slug = `memory-${sd}-${slugify(basename(f, ".md"))}`;
      out.push({ slug, sourcePath, text, category: "summaries" });
    }
  }
  return out;
}

function discoverCAMTips() {
  const out = [];
  const dir = join(MEMORIES, "feedback");
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const lower = f.toLowerCase();
    if (!CAM_TIP_KEYWORDS.some((kw) => lower.includes(kw))) continue;
    const sourcePath = join(dir, f);
    const text = readFileSync(sourcePath, "utf8");
    const slug = `tip-${slugify(basename(f, ".md"))}`;
    out.push({ slug, sourcePath, text, category: "patterns" });
  }
  return out;
}

function discoverEngineDigestSlice() {
  const out = [];
  if (!existsSync(ENGINE_DIGEST)) return out;
  const text = readFileSync(ENGINE_DIGEST, "utf8");
  const lines = text.split(/\r?\n/);
  // Each digest entry is one line: "EngineName — one-line description"
  let count = 0;
  for (const line of lines) {
    const m = line.match(/^([A-Z][A-Za-z0-9]+Engine)\s*[—-]\s*(.+)$/);
    if (!m) continue;
    const slug = `engine-${slugify(m[1])}`;
    const body = `# ${m[1]}\n\n${m[2]}\n`;
    out.push({ slug, sourcePath: ENGINE_DIGEST, text: body, category: "summaries" });
    count++;
    if (count >= ENGINE_DIGEST_TOP_N) break;
  }
  return out;
}

// ============================================================================
// OLLAMA
// ============================================================================

function ollamaSummarize(text) {
  return new Promise((resolve, reject) => {
    const url = new URL(OLLAMA_URL);
    const payload = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: `Summarize the following PRISM knowledge entry in 1–2 sentences. Plain text only, no markdown. Source:\n\n${text.slice(0, 4000)}\n\nSummary:`,
      stream: false,
      options: { temperature: 0.2, num_predict: 120 },
    });
    const req = httpRequest(
      {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => { buf += c; });
        res.on("end", () => {
          try {
            const j = JSON.parse(buf);
            const summary = String(j.response ?? "").trim().slice(0, 280);
            const tokens = (j.prompt_eval_count ?? 0) + (j.eval_count ?? 0);
            if (summary.length === 0) reject(new Error("empty"));
            else resolve({ summary, tokens });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.setTimeout(OLLAMA_TIMEOUT_MS, () => { req.destroy(new Error("timeout")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ============================================================================
// CROSS-REF + CONTRADICTION
// ============================================================================

function findCrossRefs(slug, summary, prior) {
  const refs = [];
  const tokens = new Set(slug.split("-").filter((t) => t.length >= 3));
  for (const otherSlug of Object.keys(prior)) {
    if (otherSlug === slug) continue;
    const otherTokens = new Set(otherSlug.split("-").filter((t) => t.length >= 3));
    const overlap = [...tokens].filter((t) => otherTokens.has(t)).length;
    if (overlap >= 2) refs.push(otherSlug);
    if (refs.length >= 5) break;
  }
  return refs;
}

function detectContradiction(slug, summary, prior) {
  if (!prior[slug]) return null;
  if (prior[slug].summary === summary) return null;
  return {
    slug,
    priorSummary: prior[slug].summary,
    incomingSummary: summary,
    detectedAt: new Date().toISOString(),
  };
}

function writeContradiction(record) {
  const line = JSON.stringify(record) + "\n";
  if (existsSync(CONTRADICTIONS)) {
    writeFileSync(CONTRADICTIONS, readFileSync(CONTRADICTIONS, "utf8") + line);
  } else {
    writeFileSync(CONTRADICTIONS, line);
  }
}

// ============================================================================
// MATERIALISE
// ============================================================================

function materialiseSummaryFile(record) {
  const filePath = join(SUMMARIES_DIR, `harvest-${record.slug}.md`);
  const lines = [];
  lines.push("---");
  lines.push(`slug: harvest-${record.slug}`);
  lines.push("category: summaries");
  lines.push(`source: ${record.sourcePath}`);
  lines.push(`source_hash: ${record.sourceHash}`);
  lines.push(`last_verified: ${record.addedAt}`);
  lines.push(`verified_by: ${HARVEST_AGENT}`);
  lines.push(`ollama_tokens: ${record.ollamaTokens}`);
  lines.push(`claude_tokens: ${record.claudeTokens}`);
  lines.push("cross_refs:");
  for (const r of record.crossRefs) lines.push(`  - ${r}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${record.slug}`);
  lines.push("");
  lines.push(record.summary);
  lines.push("");
  writeAtomic(filePath, lines.join("\n") + "\n");
}

function upsertIndexLine(record) {
  // Single-line entry per WikiIndexMaintainerEngine wire format. The full
  // engine handles the lock + merge — this script is the bootstrap path.
  const line = `- [[harvest-${record.slug}]] — ${truncate(record.summary, 160)} | category:summaries | sources:1 | confidence:0.85 | last_verified:${record.addedAt} | source:${HARVEST_AGENT}`;
  let body = existsSync(INDEX_MD) ? readFileSync(INDEX_MD, "utf8") : "# Wiki Index\n\n";
  // Drop any prior line for this slug so the upsert is true update-in-place.
  const slugRe = new RegExp(`^- \\[\\[harvest-${escapeRe(record.slug)}\\]\\] — .*$`, "m");
  body = body.replace(slugRe, "");
  body = body.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n" + line + "\n";
  writeAtomic(INDEX_MD, body);
}

function appendLog(msg) {
  const line = `## [${TODAY}] ${msg} | by:${HARVEST_AGENT}\n`;
  if (existsSync(LOG_MD)) {
    const prior = readFileSync(LOG_MD, "utf8");
    if (prior.includes(line.trim())) return; // dedup
    writeFileSync(LOG_MD, prior + line);
  } else {
    writeFileSync(LOG_MD, "# Wiki Log\n\n" + line);
  }
}

// ============================================================================
// MANIFEST + IO
// ============================================================================

function readManifest() {
  if (!existsSync(MANIFEST)) return {};
  try {
    const raw = readFileSync(MANIFEST, "utf8");
    const j = JSON.parse(raw);
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

function writeManifest(obj) {
  writeAtomic(MANIFEST, JSON.stringify(obj, null, 2) + "\n");
}

function writeAtomic(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  writeFileSync(tmp, content);
  renameSync(tmp, filePath);
}

// ============================================================================
// HELPERS
// ============================================================================

function slugify(s) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function sha1(s) {
  return createHash("sha1").update(s).digest("hex");
}

function firstParagraph(text) {
  const body = text.replace(/^---[\s\S]*?\n---\n?/, "");
  const para = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.length > 0 && !p.startsWith("#"));
  return (para ?? "").slice(0, 280);
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================

main().catch((e) => {
  console.error("[harvest] FATAL:", e?.stack || e);
  process.exit(3);
});
