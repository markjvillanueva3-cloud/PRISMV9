// audit-zany.mjs - INTEL-OLLAMA-OBSIDIAN-MS0/P8-U01
// Scans Zod schema directories for z.any() occurrences, classifies each by
// surrounding context, and emits ZANY-INVENTORY.json for downstream P8-U02/U03 work.

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const SCAN_DIRS = [
  "mcp-server/src/schemas",
  "mcp-server/src/tools/schemas",
];
const OUTPUT_PATH = "mcp-server/data/state/ZANY-INVENTORY.json";

const Z_ANY_PATTERN = /\bz\.any\s*\(\s*\)/g;
const FIELD_PATTERN = /^\s*(?:["']?)([a-zA-Z_$][a-zA-Z0-9_$]*)(?:["']?)\s*:/;
const RECORD_NAME_HINTS = /^(metadata|config|details|payload|extras|attributes|context|options|params|properties|tags|env|headers)$/i;
const UNKNOWN_NAME_HINTS = /^(value|data|input|output|result|response|body|content|raw|extra|error|cause|item)$/i;

// suggestedReplacement is ALWAYS a token-level swap for `z.any()`.
// Downstream P8-U02..U06 work can substitute it in place; the surrounding
// wrapper (z.array/z.record/etc.) is preserved.
//
// Only `bare_metadata_record` is a structural promotion: bare `metadata: z.any()`
// becomes `metadata: z.record(z.string(), z.unknown())`. Manual review still required.
const CLASSIFICATIONS = {
  inner_array:           { suggestedReplacement: "z.unknown()", note: "Inside z.array(...) — token swap yields z.array(z.unknown())" },
  inner_record_value:    { suggestedReplacement: "z.unknown()", note: "Inside z.record(z.string(), ...) — token swap yields z.record(z.string(), z.unknown())" },
  inner_union_member:    { suggestedReplacement: "z.unknown()", note: "Inside z.union([...]) — review whether unknown is the right member type" },
  bare_metadata_record:  { suggestedReplacement: "z.record(z.string(), z.unknown())", note: "Bare z.any() with field name suggesting a hash/map — structural promotion to record" },
  bare_unknown_value:    { suggestedReplacement: "z.unknown()", note: "Bare z.any() with field name suggesting an opaque value" },
  bare_optional:         { suggestedReplacement: "z.unknown()", note: "Bare z.any().optional() — token swap yields z.unknown().optional()" },
  bare_default:          { suggestedReplacement: "z.unknown()", note: "Bare z.any() with no field-name hint — safest default" },
};

export function listTsFiles(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (err) {
    if (err.code === "ENOENT") return out;
    throw err;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      out = out.concat(listTsFiles(full));
    } else if (s.isFile() && full.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

// Strip line/block comments + double-quoted strings + single-quoted strings + backticks
// so z.any() inside text is ignored. Keeps line offsets intact.
export function stripCommentsAndStrings(source) {
  const out = [];
  let i = 0;
  const n = source.length;
  let inLine = false;
  let inBlock = false;
  let inStr = null; // null | '"' | "'" | "`"
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

function classifyOccurrence(originalLines, sanitizedLines, lineIndex, columnIndex, matchLength) {
  const sanitizedLine = sanitizedLines[lineIndex] || "";
  const originalLine = originalLines[lineIndex] || "";

  // Look at the prefix on this line up to the match column to detect array/record/union wrappers.
  const prefix = sanitizedLine.slice(0, columnIndex);
  // Also peek a couple lines back to catch multi-line wrappers like:
  //   z.array(
  //     z.any()
  //   )
  const lookback = sanitizedLines.slice(Math.max(0, lineIndex - 3), lineIndex).join("\n") + "\n" + prefix;

  // Drop completed inner parens to avoid counting siblings: keep only the unbalanced trailing context.
  // Cheap approach: find last unmatched `(` from the right and read its preceding token.
  const tail = lookback;
  let depth = 0;
  let openParenCharIdx = -1;
  for (let i = tail.length - 1; i >= 0; i--) {
    const c = tail[i];
    if (c === ")") depth++;
    else if (c === "(") {
      if (depth === 0) { openParenCharIdx = i; break; }
      depth--;
    }
  }
  let wrapperToken = "";
  if (openParenCharIdx > 0) {
    const before = tail.slice(0, openParenCharIdx);
    const tokenMatch = before.match(/(z\.[a-zA-Z]+)\s*$/);
    if (tokenMatch) wrapperToken = tokenMatch[1];
  }

  // Detect .optional() etc. AFTER the match (slice from match END, not match start)
  const afterMatch = sanitizedLine.slice(columnIndex + matchLength);
  const isOptionalChained = /^\s*\.optional\s*\(\s*\)/.test(afterMatch);

  const fieldMatch = originalLine.match(FIELD_PATTERN);
  const fieldName = fieldMatch ? fieldMatch[1] : null;

  // Classification distinguishes wrapper context from structural promotion.
  // Inner-* cases are token swaps inside an existing wrapper.
  // bare_metadata_record is the only case where the suggested replacement
  // changes the field's shape (z.any() → z.record(z.string(), z.unknown())).
  let classification;
  if (wrapperToken === "z.array") classification = "inner_array";
  else if (wrapperToken === "z.record") classification = "inner_record_value";
  else if (wrapperToken === "z.union") classification = "inner_union_member";
  else if (fieldName && RECORD_NAME_HINTS.test(fieldName)) classification = "bare_metadata_record";
  else if (fieldName && UNKNOWN_NAME_HINTS.test(fieldName)) classification = "bare_unknown_value";
  else if (isOptionalChained) classification = "bare_optional";
  else classification = "bare_default";

  // wrapperToken is informational ONLY when classification is inner_*; clear noise
  // for bare_* cases (the unbalanced-paren walker may have grabbed an enclosing
  // z.object that has no relevance to the leaf z.any() replacement).
  const reportedWrapper = classification.startsWith("inner_") ? wrapperToken : null;
  return { classification, fieldName, wrapperToken: reportedWrapper, isOptionalChained };
}

export function auditFile(absPath, repoRoot = REPO_ROOT) {
  const source = readFileSync(absPath, "utf8");
  const sanitized = stripCommentsAndStrings(source);
  const originalLines = source.split(/\r?\n/);
  const sanitizedLines = sanitized.split(/\r?\n/);
  const occurrences = [];
  for (let i = 0; i < sanitizedLines.length; i++) {
    const sLine = sanitizedLines[i];
    Z_ANY_PATTERN.lastIndex = 0;
    let m;
    while ((m = Z_ANY_PATTERN.exec(sLine)) !== null) {
      const col = m.index;
      const { classification, fieldName, wrapperToken, isOptionalChained } =
        classifyOccurrence(originalLines, sanitizedLines, i, col, m[0].length);
      const ctxStart = Math.max(0, i - 3);
      const ctxEnd = Math.min(originalLines.length, i + 4);
      occurrences.push({
        file: relative(repoRoot, absPath).replace(/\\/g, "/"),
        line: i + 1,
        column: col + 1,
        fieldName,
        wrapperToken,
        isOptionalChained,
        classification,
        suggestedReplacement: CLASSIFICATIONS[classification].suggestedReplacement,
        replacementNote: CLASSIFICATIONS[classification].note,
        context: originalLines.slice(ctxStart, ctxEnd),
        contextStartLine: ctxStart + 1,
      });
    }
  }
  return occurrences;
}

export function auditAll(scanDirs = SCAN_DIRS, repoRoot = REPO_ROOT) {
  const inventory = [];
  for (const rel of scanDirs) {
    const abs = join(repoRoot, rel);
    const files = listTsFiles(abs);
    for (const f of files) {
      inventory.push(...auditFile(f, repoRoot));
    }
  }
  const byFile = {};
  const byClassification = {};
  for (const o of inventory) {
    byFile[o.file] = (byFile[o.file] || 0) + 1;
    byClassification[o.classification] = (byClassification[o.classification] || 0) + 1;
  }
  return {
    schemaVersion: "1.0.0",
    generated: new Date().toISOString(),
    source: "INTEL-OLLAMA-OBSIDIAN-MS0/P8-U01",
    directories_scanned: scanDirs,
    totalOccurrences: inventory.length,
    fileCount: Object.keys(byFile).length,
    byClassification,
    byFile: Object.entries(byFile)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count),
    inventory,
  };
}

function main() {
  const result = auditAll();
  const outAbs = join(REPO_ROOT, OUTPUT_PATH);
  writeFileSync(outAbs, JSON.stringify(result, null, 2) + "\n");
  process.stdout.write(
    `audit-zany: ${result.totalOccurrences} occurrences across ${result.fileCount} files\n` +
      `  by classification: ${JSON.stringify(result.byClassification)}\n` +
      `  written to: ${OUTPUT_PATH}\n`,
  );
}

const entry = process.argv[1];
if (entry && (
    import.meta.url === `file://${entry.replace(/\\/g, "/")}` ||
    entry.endsWith("audit-zany.mjs")
  )) {
  main();
}
