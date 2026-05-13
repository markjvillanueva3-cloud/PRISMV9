#!/usr/bin/env node
// tier: T1
/**
 * engine-digest-precheck.mjs — PreToolUse Write/Edit (P6-U02).
 *
 * Warns before creating a new engine whose name is similar to an existing
 * engine in `mcp-server/data/docs/ENGINE_DIGEST.md`. Soft gate — emits a
 * suggestion via systemMessage, never blocks.
 *
 * Triggers when:
 *   - Tool is Write or Edit
 *   - target file_path matches src/engines/*Engine.ts
 *   - target file does NOT already exist on disk (i.e. CREATE, not modify)
 *
 * Fuzzy match uses Jaccard similarity over normalized tokens; threshold
 * `SIMILARITY_THRESHOLD` (default 0.6) — anything above emits a hint.
 *
 * Disable: PRISM_ENGINE_DIGEST_PRECHECK=0
 */

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const ENABLED = process.env.PRISM_ENGINE_DIGEST_PRECHECK !== "0";
const DIGEST_PATH = "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md";
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.PRISM_ENGINE_DIGEST_THRESHOLD ?? "0.6",
);
const MAX_MATCHES = 5;

/**
 * Tokenize an engine name into lowercase word segments. CamelCase splits
 * on capital boundaries; underscores split on _. Strips "Engine" suffix
 * since every engine name ends with it.
 * @param {string} name
 * @returns {Set<string>}
 */
export function tokenize(name) {
  if (typeof name !== "string" || name.length === 0) return new Set();
  const base = name
    .replace(/\.ts$/i, "")
    .replace(/Engine$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim();
  const parts = base.split(/\s+/).filter((p) => p.length >= 2);
  return new Set(parts);
}

/**
 * Jaccard similarity over two token sets — |A∩B| / |A∪B|.
 * Returns 0 for empty input.
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @returns {number} similarity in [0, 1]
 */
export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Find existing engines from ENGINE_DIGEST.md whose name is most similar
 * to the proposed name. Returns top-K matches with similarity ≥ threshold.
 * @param {string} proposedName basename without .ts
 * @param {string} digestText raw digest markdown content
 * @param {number} threshold minimum similarity
 * @param {number} limit max matches returned
 * @returns {Array<{name: string, similarity: number}>}
 */
export function findSimilarEngines(proposedName, digestText, threshold, limit) {
  if (typeof digestText !== "string" || digestText.length === 0) return [];
  const proposedTokens = tokenize(proposedName);
  if (proposedTokens.size === 0) return [];
  const hits = [];
  // Digest format: each engine appears as a heading or bullet with the name.
  // We extract any PascalCase identifier ending in "Engine".
  const ENGINE_NAME_RE = /\b([A-Z][A-Za-z0-9]*Engine)\b/g;
  const seen = new Set();
  let match;
  while ((match = ENGINE_NAME_RE.exec(digestText)) !== null) {
    const name = match[1];
    if (name === proposedName) continue;  // skip self
    if (seen.has(name)) continue;
    seen.add(name);
    const sim = jaccard(proposedTokens, tokenize(name));
    if (sim >= threshold) hits.push({ name, similarity: sim });
  }
  hits.sort((a, b) => b.similarity - a.similarity);
  return hits.slice(0, limit);
}

function passthrough() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

if (process.env.PRISM_ENGINE_DIGEST_PRECHECK_AS_LIB === "1") {
  // Library mode for tests — no I/O.
} else if (!ENABLED) {
  passthrough();
  process.exit(0);
} else {
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { passthrough(); process.exit(0); }

  const toolName = String(input?.tool_name || "");
  if (toolName !== "Write" && toolName !== "Edit") {
    passthrough();
    process.exit(0);
  }

  // Normalize Windows backslashes so the regex matches both
  // /h/prism/.../src/engines/X.ts AND H:\prism\...\src\engines\X.ts.
  const filePath = String(input?.tool_input?.file_path || "").replace(/\\/g, "/");
  // Only fire on engine files
  if (!/\/src\/engines\/[A-Za-z0-9_-]+Engine\.ts$/.test(filePath)) {
    passthrough();
    process.exit(0);
  }
  // Only fire for CREATE (target file doesn't already exist)
  if (existsSync(filePath)) {
    passthrough();
    process.exit(0);
  }

  const proposedName = basename(filePath).replace(/\.ts$/, "");

  let digestText = "";
  try { digestText = readFileSync(DIGEST_PATH, "utf8"); } catch { /* no digest */ }
  if (digestText.length === 0) {
    passthrough();
    process.exit(0);
  }

  const matches = findSimilarEngines(
    proposedName,
    digestText,
    SIMILARITY_THRESHOLD,
    MAX_MATCHES,
  );

  if (matches.length === 0) {
    passthrough();
    process.exit(0);
  }

  const lines = matches
    .map((m) => `  • ${m.name} (similarity ${m.similarity.toFixed(2)})`)
    .join("\n");

  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage:
      `[engine-digest-precheck] Proposing to create ${proposedName}. ` +
      `${matches.length} similar engine(s) exist in ENGINE_DIGEST.md — ` +
      `consider extending one before creating new:\n${lines}\n` +
      `(disable: PRISM_ENGINE_DIGEST_PRECHECK=0; threshold: PRISM_ENGINE_DIGEST_THRESHOLD)`,
  }));
}
