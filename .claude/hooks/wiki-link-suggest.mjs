#!/usr/bin/env node
// tier: T3
/**
 * wiki-link-suggest.mjs — PostToolUse hook for memory/wiki writes
 *
 * Closes the "no connection layer" gap surfaced by the cyrilXBT audit
 * and quantitatively measured in U-VIZ-VAULT (781 broken [[refs]] / 124
 * resolved = 84% of all wiki-links don't connect to a real entry).
 *
 * Flow:
 *   1. Detect Write/Edit on a memory or wiki .md file.
 *   2. Build a candidate-target catalog from filename stems under
 *      H:/prism/knowledge/memories/ and H:/prism/knowledge/wiki/.
 *   3. Ask local Ollama to pick 3-5 entries from the catalog that the
 *      current body should link to. Skip entries already linked.
 *   4. Insert the suggestions into a `## Related` section at the bottom
 *      of the file (creating the section if missing). Idempotent: only
 *      adds links not already present in the body.
 *
 * Why a hook (not /weekly-synthesis batch): linking compounds — every new
 * memory should add edges to the graph immediately, so cross-chat recall
 * benefits within the same session. Cost is one short Ollama call per
 * memory write, gated to local infra, with a strict timeout.
 *
 * Disable: env PRISM_WIKILINK_SUGGEST=0
 * Tune: env OLLAMA_LINK_MODEL (default qwen2.5-coder:32b),
 *       PRISM_WIKILINK_MAX_SUGGESTIONS (default 5),
 *       PRISM_WIKILINK_MIN_BODY_CHARS (default 200 — skip tiny notes)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const MEMORY_DIR_PATTERN = /[\\/]\.claude[\\/]projects[\\/][^\\/]*[\\/]memory[\\/]/i;
const VAULT_MEMORY_PATTERN = /[\\/]knowledge[\\/]memories[\\/]/i;
const VAULT_WIKI_PATTERN = /[\\/]knowledge[\\/]wiki[\\/]/i;

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_LINK_MODEL ?? "qwen2.5-coder:32b";
const TIMEOUT_MS = 5_000;
const MAX_SUGGESTIONS = Number.parseInt(process.env.PRISM_WIKILINK_MAX_SUGGESTIONS ?? "5", 10);
const MIN_BODY_CHARS = Number.parseInt(process.env.PRISM_WIKILINK_MIN_BODY_CHARS ?? "200", 10);
const CATALOG_CAP = 200; // truncate catalog so prompt fits — Ollama context-friendly

const VAULT_ROOTS = [
  "H:/prism/knowledge/memories",
  "H:/prism/knowledge/wiki",
];

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    return JSON.parse(buf.toString("utf8"));
  } catch { return null; }
}

function emitContinue(msg) {
  const out = { continue: true };
  if (msg) {
    out.hookSpecificOutput = { hookEventName: "PostToolUse", additionalContext: `wiki-link-suggest: ${msg}` };
  }
  console.log(JSON.stringify(out));
}

function collectStems(root) {
  const out = [];
  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(basename(e.name, ".md"));
      }
    }
  }
  walk(root);
  return out;
}

function existingLinks(body) {
  const re = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g;
  const set = new Set();
  let m;
  while ((m = re.exec(body)) !== null) set.add(m[1].trim().toLowerCase());
  return set;
}

// Heuristic fallback when Ollama is unreachable / GPU-OOM / model fails to load.
// Strategy: find catalog entries whose stem (lowercased, underscore-split) appears
// as a multi-word substring in the body. Conservative — only matches when the
// candidate's full topic phrase shows up. Avoids garbage "the" -> [[the_X]] links.
function suggestLinksHeuristic(body, filename, catalog, alreadyLinked) {
  const bodyLower = body.toLowerCase();
  const selfStem = basename(filename, ".md").toLowerCase();
  const scored = [];
  for (const stem of catalog) {
    const lower = stem.toLowerCase();
    if (alreadyLinked.has(lower) || lower === selfStem) continue;
    // Tokenize the stem: split on _ - and require ≥2 tokens for matching to avoid noise
    const tokens = lower.split(/[_\-.]+/).filter((t) => t.length >= 4);
    if (tokens.length < 2) continue;
    // Score: count of tokens present in the body (must hit ALL tokens of length ≥4)
    const allHit = tokens.every((t) => bodyLower.includes(t));
    if (!allHit) continue;
    // Prefer longer multi-token stems (they're more specific)
    scored.push({ stem, score: tokens.length });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_SUGGESTIONS).map((s) => s.stem);
}

async function suggestLinks(body, filename, catalog, alreadyLinked) {
  // Trim body for prompt — frontmatter stripped, ~2 KB cap
  const trimmed = body.replace(/^---\n[\s\S]*?\n---\n/, "").slice(0, 2_000);
  const candidates = catalog
    .filter((s) => !alreadyLinked.has(s.toLowerCase()))
    .filter((s) => basename(filename, ".md") !== s) // never self-link
    .slice(0, CATALOG_CAP);
  if (candidates.length === 0) return { links: [], reason: "no-candidates" };

  const prompt =
    `You are linking a knowledge-vault note to other related entries.\n` +
    `Pick up to ${MAX_SUGGESTIONS} entries from the catalog that this note SHOULD reference, based on topic overlap.\n` +
    `Only pick entries that are clearly related — do NOT force connections. If <${MAX_SUGGESTIONS} are clearly relevant, return fewer.\n` +
    `Output ONLY the entry names, one per line, NO commentary, NO formatting, NO [[brackets]].\n` +
    `If nothing in the catalog is clearly relevant, output the single word: NONE\n\n` +
    `Catalog (existing vault entries):\n${candidates.map((c) => `- ${c}`).join("\n")}\n\n` +
    `Note filename: ${filename}\n\n` +
    `Note body:\n${trimmed}\n\n` +
    `Related entries (one name per line):`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt, stream: false,
        options: { temperature: 0.2, num_predict: 80 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { links: [], reason: `HTTP ${res.status}` };
    const json = await res.json();
    const raw = String(json?.response ?? "").trim();
    if (/^NONE$/im.test(raw)) return { links: [], reason: "ollama-none" };

    // Parse: split lines, strip bullets/brackets/whitespace, validate against catalog
    const candidatesLower = new Set(candidates.map((c) => c.toLowerCase()));
    const picked = [];
    for (const line of raw.split(/\r?\n/)) {
      let cleaned = line.trim()
        .replace(/^[-*•\d.)\s]+/, "")
        .replace(/\[\[/g, "").replace(/\]\]/g, "")
        .replace(/^\s*"|"\s*$/g, "")
        .trim();
      if (!cleaned) continue;
      if (candidatesLower.has(cleaned.toLowerCase())) {
        // Find the original case-preserving entry from catalog
        const original = candidates.find((c) => c.toLowerCase() === cleaned.toLowerCase());
        if (original && !picked.includes(original)) picked.push(original);
      }
      if (picked.length >= MAX_SUGGESTIONS) break;
    }
    return { links: picked, reason: picked.length === 0 ? "no-valid-matches" : null };
  } catch (e) {
    clearTimeout(timer);
    return { links: [], reason: e?.name === "AbortError" ? "timeout" : (e?.message ?? String(e)) };
  }
}

function injectRelated(body, links) {
  if (links.length === 0) return body;
  const linkLines = links.map((l) => `- [[${l}]]`).join("\n");
  // If a `## Related` section already exists, append new links there (only ones not already in body)
  const relatedRe = /(^|\n)## Related\s*\n([\s\S]*?)(\n##\s|$)/;
  const m = body.match(relatedRe);
  if (m) {
    const existing = m[2];
    const newLines = links
      .filter((l) => !existing.toLowerCase().includes(`[[${l.toLowerCase()}]]`))
      .map((l) => `- [[${l}]]`);
    if (newLines.length === 0) return body;
    const updated = `${m[1]}## Related\n${existing.trimEnd()}\n${newLines.join("\n")}\n${m[3] === "" ? "" : m[3]}`;
    return body.replace(relatedRe, updated);
  }
  // No section — append at end (single trailing newline)
  const trailing = body.endsWith("\n") ? "" : "\n";
  return `${body}${trailing}\n## Related\n${linkLines}\n`;
}

async function main() {
  if (process.env.PRISM_WIKILINK_SUGGEST === "0") return emitContinue(null);

  const input = readStdin();
  if (!input) return emitContinue(null);

  const tool = input.tool_name ?? input.toolName ?? "";
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) return emitContinue(null);

  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.filePath ?? "").replace(/\\/g, "/");
  if (!filePath || !filePath.endsWith(".md")) return emitContinue(null);

  // Only act on memory or vault writes
  const isMemory = MEMORY_DIR_PATTERN.test(filePath.replace(/\//g, "\\"));
  const isVaultMemory = VAULT_MEMORY_PATTERN.test(filePath);
  const isVaultWiki = VAULT_WIKI_PATTERN.test(filePath);
  if (!isMemory && !isVaultMemory && !isVaultWiki) return emitContinue(null);

  if (!existsSync(filePath)) return emitContinue("file-missing");

  let content;
  try { content = readFileSync(filePath, "utf8"); }
  catch (e) { return emitContinue(`read-fail (${e?.message ?? e})`); }

  if (content.length < MIN_BODY_CHARS) return emitContinue(`skip-short (${content.length} chars)`);

  const filename = basename(filePath);
  const linked = existingLinks(content);

  // Build catalog from both vault roots
  const catalog = [];
  for (const root of VAULT_ROOTS) {
    catalog.push(...collectStems(root));
  }
  // Dedupe (case-insensitive)
  const seen = new Set();
  const dedup = [];
  for (const s of catalog) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(s);
  }

  let result = await suggestLinks(content, filename, dedup, linked);
  let usedHeuristic = false;
  // If Ollama failed for non-semantic reasons (HTTP error, timeout, OOM),
  // fall back to the deterministic heuristic so the unit still adds value.
  if (result.links.length === 0 && result.reason && result.reason !== "ollama-none") {
    const heuristicLinks = suggestLinksHeuristic(content, filename, dedup, linked);
    if (heuristicLinks.length > 0) {
      result = { links: heuristicLinks, reason: null };
      usedHeuristic = true;
    }
  }
  if (result.links.length === 0) {
    return emitContinue(`no-suggestions (${result.reason ?? "?"})`);
  }

  const updated = injectRelated(content, result.links);
  if (updated === content) {
    return emitContinue("idempotent (links already present)");
  }
  try {
    writeFileSync(filePath, updated, "utf8");
  } catch (e) {
    return emitContinue(`write-fail (${e?.message ?? e})`);
  }

  emitContinue(`added ${result.links.length} link(s): ${result.links.slice(0, 3).join(", ")}${result.links.length > 3 ? "…" : ""}`);
}

main().catch((e) => {
  process.stderr.write(`wiki-link-suggest error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
});
