#!/usr/bin/env node
/**
 * fix-hookify-frontmatter.mjs
 *
 * Converts malformed `.claude/hookify.*.local.md` rule files (which start with a
 * markdown `# Hookify Rule:` heading and loose `type:/event:/skill:` lines) into
 * the well-formed YAML-frontmatter schema the hookify plugin's config_loader.py
 * actually parses (file MUST start with `---`).
 *
 * Root cause (verified against the plugin source):
 *   plugins/.../hookify/core/config_loader.py
 *     - extract_frontmatter(): returns {} unless content.startswith('---')
 *       -> "Warning: <f> missing YAML frontmatter (must start with ---)"
 *     - load_rule_file(): open(path,'r') with NO encoding= -> on Windows the
 *       cp1252 codec crashes on any byte >= 0x80 (em-dash, emoji)
 *       -> "Error: Malformed rule file <f>: 'charmap' codec can't decode byte ..."
 *
 * Fix strategy (data files only — never the plugin cache):
 *   1. Emit a real `---` frontmatter block with the fields the parser reads
 *      (name/enabled/event/pattern/action), matching the 121 already-correct files.
 *   2. ASCII-transliterate the entire output so the cp1252 reader can never crash.
 *
 * Idempotent: files already starting with `---` are left untouched (unless they
 * still carry non-ASCII, in which case --ascii-only re-sanitizes them in place).
 *
 * Usage:
 *   node scripts/fix-hookify-frontmatter.mjs --dry            # report only
 *   node scripts/fix-hookify-frontmatter.mjs --one <file>     # convert one file, print result
 *   node scripts/fix-hookify-frontmatter.mjs --apply          # convert all malformed + sanitize all
 */
import fs from "node:fs";
import path from "node:path";

const CLAUDE_DIR = path.resolve("H:/prism/.claude");
const GLOB_PREFIX = "hookify.";
const GLOB_SUFFIX = ".local.md";

// --- ASCII transliteration: map common UTF-8 punctuation/symbols to ASCII so the
// cp1252 reader in config_loader.py never throws. Anything still non-ASCII after
// this map is replaced with '?' as a last resort (logged).
const TRANSLIT = new Map([
  ["—", "-"],   // em dash —
  ["–", "-"],   // en dash –
  ["‘", "'"],   // ‘
  ["’", "'"],   // ’
  ["“", '"'],   // “
  ["”", '"'],   // ”
  ["…", "..."], // …
  [" ", " "],   // nbsp
  ["→", "->"],  // →
  ["←", "<-"],  // ←
  ["•", "*"],   // •
  ["×", "x"],   // ×
  ["✅", "[ok]"],
  ["⚠", "[!]"], // ⚠
  ["️", ""],    // emoji variation selector
  ["❌", "[x]"],
  ["\u{1F6A8}", "[!]"], // 🚨
  ["Ø", "dia"], // Ø diameter symbol
  ["µ", "u"],   // µ micro (cp1252 0xB5)
  ["°", "deg"], // ° degree
  ["±", "+/-"], // ± plus-minus
]);

function toAscii(s) {
  let out = "";
  let replaced = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) { out += ch; continue; }
    if (TRANSLIT.has(ch)) { out += TRANSLIT.get(ch); continue; }
    out += "?";
    replaced++;
  }
  return { out, replaced };
}

function nameFromFile(file) {
  // hookify.<name>.local.md -> <name>
  const base = path.basename(file);
  return base.slice(GLOB_PREFIX.length, base.length - GLOB_SUFFIX.length);
}

// Map the legacy `type:` (autofire|warn|block) -> hookify `action`
function mapAction(type) {
  return type === "block" ? "block" : "warn";
}

// Map the legacy `event:` -> hookify `event`. The parser only gives a meaningful
// match field for 'bash' (command) and 'file' (new_text); everything else -> content.
function mapEvent(legacyEvent, tool, hasCommandCond) {
  const e = (legacyEvent || "").trim();
  if (e === "UserMessage") return "prompt";
  if (e === "PreToolUse") {
    if (/bash/i.test(tool || "") || hasCommandCond) return "bash";
    if (/edit|write/i.test(tool || "")) return "file";
    return "all";
  }
  return "all"; // PostToolUse, SessionStart, unknown
}

// Pull a usable regex out of the loose body. We look at `## Condition`, `## detect`,
// `## pattern` sections. Prefer an explicit /regex/ or "regex" token; otherwise null.
function extractPattern(body) {
  // explicit /.../ form
  const slash = body.match(/`\/(.+?)\/[a-z]*`/);
  if (slash) return slash[1];
  const slashNoTick = body.match(/(?:^|\s)\/((?:[^\/\n]|\\\/){2,})\/[a-z]*(?:\s|$)/m);
  if (slashNoTick) return slashNoTick[1];
  // `matches "..."` form (first quoted token)
  const cond = body.match(/##\s*Condition[\s\S]*?$/im);
  const scope = cond ? cond[0] : body;
  const q = scope.match(/(?:matches|contains|equals)\s+"([^"]+)"/i);
  if (q) return q[1];
  return null;
}

// Extract the human message: prefer `## Message` section, else first prose para.
function extractMessage(body) {
  const m = body.match(/##\s*Message\s*\n([\s\S]*?)(?:\n##\s|\s*$)/i);
  if (m) return m[1].trim();
  // fall back: strip headings, take remaining prose
  return body
    .replace(/^#.*$/gm, "")
    .replace(/^type:.*$/gm, "")
    .replace(/^event:.*$/gm, "")
    .replace(/^skill:.*$/gm, "")
    .replace(/^tool:.*$/gm, "")
    .trim();
}

function parseLegacyHeader(content) {
  const get = (k) => {
    const m = content.match(new RegExp("^" + k + ":\\s*(.+)$", "im"));
    return m ? m[1].trim() : null;
  };
  return {
    type: get("type"),
    event: get("event"),
    skill: get("skill"),
    tool: get("tool"),
  };
}

function convert(file, content) {
  const name = nameFromFile(file);
  const hdr = parseLegacyHeader(content);
  const hasCommandCond = /command\s+(matches|contains|equals)/i.test(content);
  const action = mapAction(hdr.type);
  const event = mapEvent(hdr.event, hdr.tool, hasCommandCond);
  const pattern = extractPattern(content);
  const message = extractMessage(content);

  const fm = ["---", `name: ${name}`, "enabled: true", `event: ${event}`];
  if (pattern) {
    // quote to be safe; escape embedded double quotes
    fm.push(`pattern: "${pattern.replace(/"/g, '\\"')}"`);
  }
  fm.push(`action: ${action}`);
  if (hdr.tool && (event === "bash" || event === "file")) {
    fm.push(`tool_matcher: ${hdr.tool.split(",")[0].trim()}`);
  }
  fm.push("---", "");

  const out = fm.join("\n") + (message ? message + "\n" : "");
  const { out: ascii, replaced } = toAscii(out);
  return { ascii, replaced, hadPattern: !!pattern };
}

function listFiles() {
  return fs
    .readdirSync(CLAUDE_DIR)
    .filter((f) => f.startsWith(GLOB_PREFIX) && f.endsWith(GLOB_SUFFIX))
    .map((f) => path.join(CLAUDE_DIR, f));
}

function isWellFormed(content) {
  return content.startsWith("---");
}

function hasNonAscii(s) {
  for (const ch of s) if (ch.codePointAt(0) >= 0x80) return true;
  return false;
}

const args = process.argv.slice(2);
const mode = args[0] || "--dry";

if (mode === "--one") {
  const f = args[1];
  const content = fs.readFileSync(f, "utf8");
  const { ascii, replaced, hadPattern } = convert(f, content);
  process.stdout.write(`--- CONVERTED (${path.basename(f)}, pattern=${hadPattern}, lossyChars=${replaced}) ---\n`);
  process.stdout.write(ascii);
  process.exit(0);
}

const files = listFiles();
let malformed = 0, sanitizeOnly = 0, lossy = 0;
const actions = [];

for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  if (!isWellFormed(content)) {
    const { ascii, replaced } = convert(f, content);
    malformed++;
    if (replaced) lossy += replaced;
    actions.push({ f, kind: "convert", ascii, replaced });
  } else if (hasNonAscii(content)) {
    // well-formed but cp1252-unsafe -> sanitize body in place
    const { out, replaced } = toAscii(content);
    sanitizeOnly++;
    if (replaced) lossy += replaced;
    actions.push({ f, kind: "sanitize", ascii: out, replaced });
  }
}

console.log(`hookify files total: ${files.length}`);
console.log(`  to CONVERT (missing frontmatter): ${malformed}`);
console.log(`  to SANITIZE (well-formed but non-ASCII): ${sanitizeOnly}`);
console.log(`  lossy '?' replacements (should be 0): ${lossy}`);

if (mode === "--apply") {
  const backupDir = path.join(CLAUDE_DIR, ".hookify-backup-" + Date.now());
  fs.mkdirSync(backupDir, { recursive: true });
  for (const a of actions) {
    fs.copyFileSync(a.f, path.join(backupDir, path.basename(a.f)));
    fs.writeFileSync(a.f, a.ascii, "latin1"); // write as single-byte; content is ASCII so latin1==utf8 bytes
  }
  console.log(`APPLIED. Backup of ${actions.length} originals -> ${backupDir}`);
} else {
  console.log("(dry run — pass --apply to write; --one <file> to preview a single conversion)");
}
