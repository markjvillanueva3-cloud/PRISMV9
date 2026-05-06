/**
 * audit-zany.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P8-U01.
 *
 * Walks mcp-server/src/schemas/*.ts (and any path passed via --dir=)
 * and inventories every `z.any()` occurrence with its file:line and a
 * suggested replacement category. Writes ZANY-INVENTORY.json to
 * mcp-server/data/state/ for the follow-on units (P8-U02 high-traffic
 * sweep, P8-U03 long-tail sweep).
 *
 * Classification scheme (per spec exit_condition):
 *   - "record"       — `z.record(z.string(), z.any())` and variants.
 *                      Suggested replacement: `z.record(z.string(), z.unknown())`
 *                      (preserves the bag-of-props semantics without `any`).
 *   - "object-shape" — `.catchall(z.any())` on a z.object schema.
 *                      Suggested replacement: tighten with named fields +
 *                      `.passthrough()`, or `.catchall(z.unknown())`.
 *   - "union"        — `z.array(z.any())` (heterogeneous element type).
 *                      Suggested replacement: enumerate the variants in a
 *                      `z.union([...])` or use `z.array(z.unknown())`.
 *   - "unknown"      — bare `z.any()` used as a field type. Reviewer must
 *                      look at the call site; the safe automated swap is
 *                      `z.unknown()` but the typed fix is bespoke.
 *
 * Design note: pure-function exports drive the tests; the I/O layer at
 * the bottom does the disk walk + JSON write. Same pattern as P10-U01,
 * P10-U06, P11-U08.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P8-U01
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// PURE LOGIC (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Classify a single `z.any()` site by inspecting its surrounding text.
 * `lineText` is the full source line; `column` is the 0-based offset of
 * the matched `z.any(` opening so we can look at what's immediately
 * before it.
 *
 * Returns one of: "record" | "object-shape" | "union" | "unknown".
 *
 * Heuristics (cheap, deterministic, regex-based — no AST):
 *   - "record" wins when the preceding ~64 chars contain `z.record(...,`
 *     immediately wrapping this z.any() call as its value-type argument.
 *   - "object-shape" wins when the preceding text contains `.catchall(`
 *     with no closing paren before the z.any().
 *   - "union" wins when the preceding text contains `z.array(` with no
 *     closing paren before the z.any().
 *   - Otherwise "unknown".
 */
export function classifyZAnySite(lineText, column) {
  if (typeof lineText !== "string" || typeof column !== "number") return "unknown";
  if (column < 0 || column > lineText.length) return "unknown";
  // Look back up to 64 chars from the z.any( site.
  const lookbackStart = Math.max(0, column - 64);
  const before = lineText.slice(lookbackStart, column);
  // Is there a `z.record(...,` open with no matching close before our site?
  // Cheap check: any `z.record(` occurrence whose closing `)` lies past
  // the z.any( column. We approximate with a paren-balance walk over
  // `before`.
  function unclosedCallStartsWith(prefixRegex) {
    // Walk through `before` left-to-right, track open paren depth that
    // started with prefixRegex. If we end with depth>0, we're inside that
    // call when z.any( appears.
    const re = new RegExp(prefixRegex.source, "g");
    let m;
    while ((m = re.exec(before)) !== null) {
      // From this match's open-paren onward, count balance through
      // the rest of `before`. If balance never returns to 0, this call
      // wraps z.any.
      const callStart = m.index + m[0].length - 1; // index of '('
      let depth = 1;
      for (let i = callStart + 1; i < before.length; i++) {
        const c = before[i];
        if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0) break;
        }
      }
      if (depth > 0) return true;
    }
    return false;
  }
  // record wins first because z.record(z.string(), z.any()) is the
  // overwhelmingly common pattern.
  if (unclosedCallStartsWith(/z\.record\s*\(/)) return "record";
  if (unclosedCallStartsWith(/\.catchall\s*\(/)) return "object-shape";
  if (unclosedCallStartsWith(/z\.array\s*\(/)) return "union";
  return "unknown";
}

/**
 * Suggest a replacement Zod expression for a given classification.
 * The reviewer still has to look at the site — these are mechanical
 * defaults, not always right.
 */
export function suggestReplacement(category) {
  switch (category) {
    case "record":       return "z.record(z.string(), z.unknown())";
    case "object-shape": return ".catchall(z.unknown())  // or tighten to named fields + .passthrough()";
    case "union":        return "z.array(z.unknown())  // or enumerate variants in z.union([...])";
    case "unknown":      return "z.unknown()  // review call site for typed shape";
    default:             return "z.unknown()";
  }
}

/**
 * Scan one file's source text for z.any() sites. Returns an array of
 * { line, column, lineText, category, suggestion } objects.
 */
export function scanFileForZAny(source) {
  if (typeof source !== "string" || source.length === 0) return [];
  const out = [];
  const lines = source.split(/\r?\n/);
  const re = /\bz\.any\s*\(/g;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Strip the line-comment tail so a stray "z.any()" in a `//` comment
    // doesn't become a false positive. We don't try to handle block
    // comments — that needs a real tokenizer.
    const commentIdx = stripLineCommentIndex(rawLine);
    const line = commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const col = m.index;
      const cat = classifyZAnySite(line, col);
      out.push({
        line: i + 1,
        column: col + 1,
        lineText: rawLine.trim(),
        category: cat,
        suggestion: suggestReplacement(cat),
      });
    }
  }
  return out;
}

/**
 * Find the column where a `//` line-comment begins, skipping `//`
 * occurrences that fall inside a string literal. Returns -1 if there's
 * no line comment. Keeps the scanner honest on lines like:
 *   // TYPED SUB-SCHEMAS (replacing z.any() for safety-critical validation)
 *   const url = "http://example.com"; // real comment
 */
export function stripLineCommentIndex(line) {
  if (typeof line !== "string") return -1;
  let inSingle = false, inDouble = false, inBack = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const prev = i > 0 ? line[i - 1] : "";
    if (!inSingle && !inDouble && !inBack && c === "/" && line[i + 1] === "/") return i;
    if (prev !== "\\") {
      if (!inDouble && !inBack && c === "'") inSingle = !inSingle;
      else if (!inSingle && !inBack && c === '"') inDouble = !inDouble;
      else if (!inSingle && !inDouble && c === "`") inBack = !inBack;
    }
  }
  return -1;
}

/**
 * Aggregate per-file scans into the inventory shape we'll write to disk.
 */
export function buildInventory(perFileResults) {
  const safe = Array.isArray(perFileResults) ? perFileResults : [];
  let total = 0;
  const byCategory = { "record": 0, "object-shape": 0, "union": 0, "unknown": 0 };
  const files = [];
  for (const fr of safe) {
    if (!fr || typeof fr !== "object") continue;
    if (!Array.isArray(fr.sites) || fr.sites.length === 0) continue;
    files.push(fr);
    total += fr.sites.length;
    for (const s of fr.sites) {
      if (byCategory[s.category] !== undefined) byCategory[s.category] += 1;
    }
  }
  files.sort((a, b) => (b.sites.length - a.sites.length));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      totalSites: total,
      filesAffected: files.length,
      byCategory,
    },
    files,
  };
}

// ---------------------------------------------------------------------------
// I/O LAYER
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT_DEFAULT = path.resolve(HERE, "..");
const DEFAULT_SCAN_DIR = path.join(REPO_ROOT_DEFAULT, "mcp-server/src/schemas");
const DEFAULT_OUT = path.join(REPO_ROOT_DEFAULT, "mcp-server/data/state/ZANY-INVENTORY.json");

function walkTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        stack.push(p);
      } else if (e.isFile() && p.endsWith(".ts")) {
        out.push(p);
      }
    }
  }
  return out.sort();
}

async function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const dirArg = args.find((a) => a.startsWith("--dir="));
  const outArg = args.find((a) => a.startsWith("--out="));
  const scanDir = dirArg ? dirArg.slice("--dir=".length) : DEFAULT_SCAN_DIR;
  const outPath = outArg ? outArg.slice("--out=".length) : DEFAULT_OUT;

  const files = walkTsFiles(scanDir);
  const perFile = [];
  for (const abs of files) {
    let src;
    try { src = fs.readFileSync(abs, "utf8"); } catch { continue; }
    const sites = scanFileForZAny(src);
    if (sites.length > 0) perFile.push({ file: path.relative(REPO_ROOT_DEFAULT, abs).replace(/\\/g, "/"), sites });
  }
  const inv = buildInventory(perFile);

  if (wantJson) {
    process.stdout.write(JSON.stringify(inv, null, 2));
    return 0;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(inv, null, 2) + "\n", "utf8");
  process.stdout.write(
    `wrote ${outPath} — ${inv.summary.totalSites} z.any() sites across ${inv.summary.filesAffected} files ` +
    `(record=${inv.summary.byCategory.record}, object-shape=${inv.summary.byCategory["object-shape"]}, ` +
    `union=${inv.summary.byCategory.union}, unknown=${inv.summary.byCategory.unknown})\n`
  );
  return 0;
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
