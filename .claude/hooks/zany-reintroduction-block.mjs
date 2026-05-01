// zany-reintroduction-block.mjs — PreToolUse hook (INTEL-OLLAMA-OBSIDIAN-MS0/P8-U06)
//
// HARD BLOCKS Edit/Write/MultiEdit calls that would reintroduce z.any() into
// schema files under mcp-server/src/schemas/ or mcp-server/src/tools/schemas/.
// P8-U03 cleared all 184 z.any() occurrences from those directories; this hook
// keeps that invariant from regressing.
//
// Skips:
//   - Files outside the schema directories.
//   - z.any() inside comments or string literals (sanitized before regex match).
//   - Edits where old_string already contained the same number of z.any() (no
//     net reintroduction; the edit is a refactor leaving the count unchanged).

import { readFileSync as fsReadFileSync } from "node:fs";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fsReadFileSync(0, "utf-8");
  } catch { return ""; }
}

const SCHEMA_DIR_PATTERNS = [
  /[\/\\]mcp-server[\/\\]src[\/\\]schemas[\/\\]/,
  /[\/\\]mcp-server[\/\\]src[\/\\]tools[\/\\]schemas[\/\\]/,
];

const Z_ANY_PATTERN = /\bz\.any\s*\(\s*\)/g;

function isSchemaPath(filePath) {
  if (!filePath) return false;
  return SCHEMA_DIR_PATTERNS.some(p => p.test(filePath));
}

// Strip line comments, block comments, and string literals from TS source
// while preserving line breaks. Same algorithm as audit-zany.mjs.
export function stripCommentsAndStrings(source) {
  if (!source) return "";
  const out = [];
  let i = 0;
  const n = source.length;
  let inLine = false, inBlock = false;
  let inStr = null;
  while (i < n) {
    const ch = source[i];
    const nx = source[i + 1];
    if (inLine) {
      if (ch === "\n") { inLine = false; out.push("\n"); }
      else out.push(ch === "\t" ? "\t" : " ");
      i++;
      continue;
    }
    if (inBlock) {
      if (ch === "*" && nx === "/") { inBlock = false; out.push("  "); i += 2; }
      else { out.push(ch === "\n" ? "\n" : (ch === "\t" ? "\t" : " ")); i++; }
      continue;
    }
    if (inStr) {
      if (ch === "\\" && i + 1 < n) { out.push("  "); i += 2; continue; }
      if (ch === inStr) { inStr = null; out.push(" "); i++; continue; }
      out.push(ch === "\n" ? "\n" : (ch === "\t" ? "\t" : " "));
      i++;
      continue;
    }
    if (ch === "/" && nx === "/") { inLine = true; out.push("  "); i += 2; continue; }
    if (ch === "/" && nx === "*") { inBlock = true; out.push("  "); i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; out.push(" "); i++; continue; }
    out.push(ch);
    i++;
  }
  return out.join("");
}

export function countZAnyInCode(text) {
  if (!text) return 0;
  const sanitized = stripCommentsAndStrings(text);
  const matches = sanitized.match(Z_ANY_PATTERN);
  return matches ? matches.length : 0;
}

// For Edit: a "reintroduction" is when new_string contains MORE code-level
// z.any() than old_string did. A pure delete (old > new) is fine; a no-op
// (old == new count) is fine; an add (new > old) is a regression.
export function classifyEdit(oldString, newString) {
  const before = countZAnyInCode(oldString);
  const after = countZAnyInCode(newString);
  return { before, after, delta: after - before, isRegression: after > before };
}

// For Write: any code-level z.any() in the content is a regression because
// the schemas are clean (P8-U03 invariant). A Write replaces the entire file.
export function classifyWrite(content) {
  const after = countZAnyInCode(content);
  return { before: 0, after, delta: after, isRegression: after > 0 };
}

const BLOCK_HEADER =
  "╔══════════════════════════════════════════════════════════════╗\n" +
  "║        🛑 z.any() REINTRODUCTION BLOCKED                     ║\n" +
  "╠══════════════════════════════════════════════════════════════╣\n";

function blockMessage({ filePath, before, after, delta, tool }) {
  return (
    BLOCK_HEADER +
    `║ File: ${filePath}\n` +
    `║ Tool: ${tool}\n` +
    `║ z.any() count: ${before} → ${after}  (delta: +${delta})\n` +
    `║\n` +
    `║ INVARIANT: mcp-server/src/schemas/ and tools/schemas/ are\n` +
    `║ z.any()-free since INTEL-OLLAMA-OBSIDIAN-MS0/P8-U03 (commit\n` +
    `║ d33188dbc). Adding z.any() bypasses Zod validation — replace\n` +
    `║ with z.unknown() (leaf token swap) or z.record(z.string(),\n` +
    `║ z.unknown()) (record-shaped fields).\n` +
    `║\n` +
    `║ See: scripts/audit-zany.mjs and ZANY-INVENTORY.json for the\n` +
    `║ classification taxonomy used in P8-U02 and P8-U03 sweeps.\n` +
    `╚══════════════════════════════════════════════════════════════╝\n`
  );
}

async function main() {
  let input;
  try {
    const raw = readStdinSafe();
    if (!raw) { console.log(JSON.stringify({ continue: true })); return; }
    input = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ decision: "approve" }));
    return;
  }

  const tool = input.tool_name || input.tool || "";
  const toolInput = input.tool_input || input.input || {};
  const filePath = toolInput.file_path || "";

  if (!isSchemaPath(filePath)) {
    console.log(JSON.stringify({ decision: "approve" }));
    return;
  }

  if (tool === "Write") {
    const content = toolInput.content ?? "";
    const r = classifyWrite(content);
    if (r.isRegression) {
      console.log(JSON.stringify({
        decision: "block",
        reason: blockMessage({ filePath, ...r, tool }),
      }));
      return;
    }
  } else if (tool === "Edit") {
    const oldString = toolInput.old_string ?? "";
    const newString = toolInput.new_string ?? "";
    const r = classifyEdit(oldString, newString);
    if (r.isRegression) {
      console.log(JSON.stringify({
        decision: "block",
        reason: blockMessage({ filePath, ...r, tool }),
      }));
      return;
    }
  } else if (tool === "MultiEdit") {
    const edits = Array.isArray(toolInput.edits) ? toolInput.edits : [];
    let totalBefore = 0, totalAfter = 0;
    for (const e of edits) {
      const r = classifyEdit(e.old_string ?? "", e.new_string ?? "");
      totalBefore += r.before;
      totalAfter += r.after;
    }
    if (totalAfter > totalBefore) {
      console.log(JSON.stringify({
        decision: "block",
        reason: blockMessage({
          filePath, before: totalBefore, after: totalAfter,
          delta: totalAfter - totalBefore, tool,
        }),
      }));
      return;
    }
  }

  console.log(JSON.stringify({ decision: "approve" }));
}

const entry = process.argv[1];
if (entry && entry.endsWith("zany-reintroduction-block.mjs")) {
  main().catch(() => {
    console.log(JSON.stringify({ decision: "approve" }));
  });
}
