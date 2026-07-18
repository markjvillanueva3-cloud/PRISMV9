#!/usr/bin/env node
/**
 * hermes-vault-digest.mjs -- Hermes + Obsidian vault COMBO.
 *
 * Synthesizes the most-recent PRISM knowledge-vault notes (optionally filtered by --query) through
 * Hermes (xAI Grok, via `ask-hermes summarize -`) and writes the digest back into the vault's
 * `knowledge/hermes-outputs/` lane. Two utilizations rise at once:
 *   - Hermes: the synthesis runs through `ask-hermes`, which RECORDS the offload telemetry -> the
 *     MEASURED hermes utilization (reconcile-zulu-ledger gradeHermesUtilization) actually moves.
 *   - Obsidian vault: a fresh synthesized digest lands in the vault (searchable + auto-fed on Stop).
 * It spends ZERO Claude tokens (Grok does the synthesis) and needs neither the Nous desktop app nor
 * the :3100 stack -- only the :8645 proxy that ask-hermes already targets. Cron-wireable for a
 * recurring "vault brief" (the PRISM-side analog of the Nous-Hermes daily-shop-brief).
 *
 * CLI: node scripts/hermes-vault-digest.mjs [--query <q>] [--count N] [--dry]
 *   --query   focus the digest + filter source notes by filename substring (default: recent across all)
 *   --count   how many notes to synthesize (default 8)
 *   --dry     assemble + print the plan, do NOT call Hermes or write (for inspection/tests)
 *
 * Karpathy: CLASSIFY=gather+transform+persist; EDGE CASES=no-notes, query-no-match, hermes-down,
 *   huge-note (cap), empty-answer; FAILURE MODES=never partial-write (write only on a real answer).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = "H:/prism";
const MEM_DIRS = ["knowledge/memories/reference", "knowledge/memories/feedback", "knowledge/memories/patterns"];
const OUT_DIR = join(ROOT, "knowledge/hermes-outputs/research");
const ASK_HERMES = join(ROOT, "scripts/ask-hermes.mjs");

/** kebab-case a query into a safe filename slug. Pure. */
export function slugify(q) {
  const s = String(q || "recent").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return s || "recent";
}

/** Keep notes whose PATH (filename) mentions the query (case-insensitive). Pure. Empty query -> all.
 *  Filename-only (not body) so we never read 19k bodies just to filter. */
export function filterByQuery(notes, query) {
  if (!query || !String(query).trim()) return notes;
  const q = String(query).toLowerCase();
  return notes.filter((nt) => String(nt.path).toLowerCase().includes(q));
}

/** The N most-recent notes by mtimeMs (desc). Pure. */
export function selectNotes(notes, n) {
  return [...notes].sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, Math.max(1, Number(n) || 1));
}

/** Assemble the stdin payload for `ask-hermes summarize -`. Pure. Caps each note so the prompt
 *  stays bounded; a focus line steers the synthesis toward the query. */
export function buildDigestInput(notes, query, perNoteCap = 1200) {
  const focus = query && String(query).trim()
    ? `Synthesize the following PRISM knowledge-vault notes into a focused, de-duplicated digest about: ${query}. Lead with the key decisions/findings, then open threads.`
    : `Synthesize the following recent PRISM knowledge-vault notes into a concise digest: key themes, decisions, and open threads. De-duplicate.`;
  const body = notes
    .map((nt, i) => `--- NOTE ${i + 1}: ${nt.path} ---\n${String(nt.body || "").slice(0, perNoteCap)}`)
    .join("\n\n");
  return `${focus}\n\n${body}\n`;
}

/** Output path for a digest. Pure. */
export function digestOutputPath(slug, ts, outDir = OUT_DIR) {
  return join(outDir, `vault-digest-${slug}-${ts}.md`);
}

/** Frontmatter per the HERMES-APP write contract: source:hermes (NOT prism-memory, which the Stop
 *  feed reserves) so the 3-min auto-feed never clobbers a Hermes output. Pure. */
export function digestFrontmatter({ query, count, ts }) {
  return [
    "---",
    "source: hermes",
    "type: hermes-output",
    `created: ${ts}`,
    `query: ${query && String(query).trim() ? query : "(recent)"}`,
    `notes: ${count}`,
    "tags: [hermes, vault-digest]",
    "---",
    "",
  ].join("\n");
}

/** Strip ask-hermes/ask-ollama telemetry footer lines so the digest body is clean. Pure. */
export function stripFooter(text) {
  return String(text || "")
    .split("\n")
    .filter((l) => !/^\s*(↓|->)?\s*(ollama-offload|hermes-offload|ask-hermes):/i.test(l))
    .join("\n")
    .trim();
}

/** List metadata (path + mtime) for every .md note across the memory dirs -- NO body read (cheap). */
function gatherMeta() {
  const out = [];
  for (const rel of MEM_DIRS) {
    const dir = join(ROOT, rel);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const p = join(dir, f);
      try { out.push({ path: `${rel}/${f}`, abs: p, mtimeMs: statSync(p).mtimeMs }); } catch { /* skip unreadable */ }
    }
  }
  return out;
}

function parseArgs(argv) {
  const a = { query: "", count: 8, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--query") a.query = argv[++i] || "";
    else if (argv[i] === "--count") a.count = Number(argv[++i]) || 8;
    else if (argv[i] === "--dry") a.dry = true;
  }
  return a;
}

export async function main(argv = process.argv.slice(2)) {
  const { query, count, dry } = parseArgs(argv);
  const meta = filterByQuery(gatherMeta(), query);
  if (meta.length === 0) {
    process.stderr.write(`[hermes-vault-digest] no vault notes match query "${query}" -- nothing to digest.\n`);
    process.exit(2);
  }
  const selected = selectNotes(meta, count).map((nt) => ({ ...nt, body: safeRead(nt.abs) }));
  const input = buildDigestInput(selected, query);
  // Deterministic-ish timestamp for the filename (filesystem-safe).
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = digestOutputPath(slugify(query), ts);

  if (dry) {
    process.stdout.write(JSON.stringify({ matched: meta.length, selected: selected.map((s) => s.path), inputChars: input.length, outPath }, null, 2) + "\n");
    return;
  }

  // Hermes synthesis via ask-hermes (records the hermes telemetry -> measured utilization up).
  // --no-fallback: this tool exists to raise HERMES utilization + stamps `source:hermes`, so it must
  // NOT silently degrade to Ollama on a :8645-down condition (that would mislabel the digest AND bump
  // ollama, not hermes). No fallback => Hermes-down fails loud below (exit non-zero) -> no write.
  const res = spawnSync(process.execPath, [ASK_HERMES, "summarize", "-", "--no-fallback", "--timeout", "120000"], {
    input, encoding: "utf8", timeout: 150000, windowsHide: true,
  });
  if (res.status !== 0 || !res.stdout || !res.stdout.trim()) {
    process.stderr.write(`[hermes-vault-digest] ask-hermes failed (status ${res.status}) -- is the Hermes :8645 proxy up? (no Ollama fallback by design) ${String(res.stderr || "").slice(0, 300)}\n`);
    process.exit(1);
  }
  const digest = stripFooter(res.stdout);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, digestFrontmatter({ query, count: selected.length, ts }) + digest + "\n");
  process.stdout.write(`[hermes-vault-digest] wrote ${outPath} (${selected.length} notes -> ${digest.length} chars, $0 Claude)\n`);
}

function safeRead(p) {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    process.stderr.write(`[hermes-vault-digest] fatal: ${String(e && e.stack || e)}\n`);
    process.exit(1);
  });
}
