// tier: T3
/**
 * error-fix-vault-bridge.mjs — Stop hook (T3 observer).
 *
 * Closes the Obsidian-2nd-brain Gap #4. The test-fail → edit → test-pass
 * RESOLUTION-CYCLE detection is already implemented (error-pattern-memory.mjs
 * pairs a Bash-error with the subsequent Edit/Write fix into
 * mcp-server/data/state/error-memory.json `fixes{}`; error-recovery-memory.mjs
 * + error-pattern-learner.mjs do the same into other JSON/JSONL stores).
 * Building a 5th detector would be a hard duplication (CLAUDE.md R8 /
 * duplicationGuardEngine). This hook does NOT detect — it COMPOSES: it reads
 * the already-paired fixes and persists the durable ones into the
 * Obsidian-synced memory vault as human-readable, queryable markdown so the
 * resolutions survive past the runtime JSON blob (which is capped + rotated).
 *
 * Same architecture as Gap #1 (regression-auto-write) and Gap #2
 * (scrutiny-verdict-persist): an existing in-repo JSON ledger → idempotent
 * Obsidian markdown bridge. Reuses Gap #2's scrutiny-passed safety helpers
 * (yamlScalar / contentHash / fencedBlock / writeWithGuard) so it
 * inherits the YAML-injection + fence-escape + idempotency defenses.
 *
 * Distinct from memory-mirror-to-vault.mjs (mirrors files Claude EXPLICITLY
 * writes into the C: memory dir) and unified-ledger-mirror.mjs (mirrors error
 * CAPTURES to a JSONL ledger via MCP). Neither synthesizes a markdown LEARNING
 * from the error→fix pair store. Complementary, not duplicate.
 *
 * Selection: a fix is persisted only when it carries a meaningful code
 * signature (the bare "code modification" placeholder is excluded unless it
 * repeated ≥2×, i.e. a real hotspot) AND successCount ≥ PRISM_ERROR_FIX_VAULT_
 * MIN_SUCCESS. One rolling file per UTC day, regenerated from all of that
 * day's fixes each Stop; content-hash idempotency makes an unchanged day a
 * no-op.
 *
 * Non-blocking. Pure observer. Never refuses Stop.
 *
 * Knobs:
 *   PRISM_ERROR_FIX_VAULT_DISABLE=1     → no-op
 *   PRISM_ERROR_FIX_VAULT_DRY_RUN=1     → print target + body to stderr, no write
 *   PRISM_ERROR_FIX_VAULT_TIMEOUT_MS    default 2000 (git head-commit lookup)
 *   PRISM_ERROR_FIX_VAULT_MIN_SUCCESS   default 1 (min successCount to persist)
 *   PRISM_ERROR_FIX_VAULT_MAX           default 60 (cap records per day file)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REPO = process.env.PRISM_ROOT || "H:/prism";
const ERROR_MEMORY = path.join(REPO, "mcp-server", "data", "state", "error-memory.json");
const VAULT_DIR = path.join(REPO, "knowledge", "memories", "error-fixes");
const TIMEOUT_MS = parseInt(process.env.PRISM_ERROR_FIX_VAULT_TIMEOUT_MS || "2000", 10) || 2000;
const MIN_SUCCESS = (() => {
  const n = parseInt(process.env.PRISM_ERROR_FIX_VAULT_MIN_SUCCESS || "1", 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
})();
const MAX_RECORDS = (() => {
  const n = parseInt(process.env.PRISM_ERROR_FIX_VAULT_MAX || "60", 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
})();
const MAX_CONCURRENT_RETRY = 3;
const FIELD_CAP = 240;
// The literal placeholder error-pattern-memory writes when extractCodeSignature
// returns null. On its own it carries no learning value — excluded unless the
// same placeholder fix recurred (successCount ≥ 2), which signals a real hotspot.
const PLACEHOLDER_FIX = "code modification";
// Reserved keys that must never be treated as fix entries when iterating an
// untrusted JSON-parsed map (prototype-pollution / __proto__ walk guard).
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Exactly-once, never-throw. A broken stdout pipe (harness closed it before
// the hook wrote) must NOT propagate EPIPE out of main()/the isMain catch —
// the non-blocking contract is "every path emits {continue:true} or stays
// silent", never a non-zero exit that could be read as a Stop refusal.
let _approved = false;
function approve() {
  if (_approved) return;
  _approved = true;
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* dead pipe — nothing to do */ }
}

function readStdinJson() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/**
 * Render any value as a YAML double-quoted flow scalar. JSON string syntax is
 * a valid subset of YAML double-quoted scalar syntax, so JSON.stringify gives
 * correct escaping of `"`, `\`, and newlines (→ \n) — which prevents an
 * untrusted value (an error message lifted verbatim from a fix key) from
 * closing the frontmatter block with an embedded `\n---\n`. ALWAYS use this
 * for any frontmatter value derived from the error-memory store.
 */
function yamlScalar(v) {
  return JSON.stringify(v == null ? "" : String(v));
}

/**
 * Strip CR/LF + backticks for single-line body contexts, and escape the
 * markdown table-cell delimiter `|` (an attacker-influenced error type/code/
 * file/fix containing `|` would otherwise corrupt the rendered table's column
 * structure — cosmetic, but the raw byte still belongs in the cell).
 */
function inlineSafe(s) {
  return String(s == null ? "" : s)
    .replace(/[\r\n`]/g, " ")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s, n = FIELD_CAP) {
  if (typeof s !== "string") return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/**
 * Wrap untrusted multi-line text in a fenced code block whose fence is
 * GUARANTEED longer than any backtick run inside (CommonMark): pasted ``` in
 * an error message or fix signature cannot escape the wrapper.
 */
function fencedBlock(text) {
  const body = typeof text === "string" && text.length ? text : "(none)";
  let maxRun = 0;
  for (const m of body.matchAll(/`+/g)) maxRun = Math.max(maxRun, m[0].length);
  const fence = "`".repeat(Math.max(3, maxRun + 1));
  return `${fence}\n${body}\n${fence}`;
}

function headCommit() {
  try {
    // %x1f = ASCII unit-separator — cannot appear in a short-sha and is
    // vanishingly unlikely in a subject; indexOf-split separates correctly.
    const out = execFileSync("git", ["-C", REPO, "log", "-1", "--format=%h%x1f%s"], { windowsHide: true,
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const sep = out.indexOf("\x1f");
    if (sep < 0) return { sha: out.trim(), subject: "" };
    return { sha: out.slice(0, sep).trim(), subject: out.slice(sep + 1).trim() };
  } catch { return { sha: "", subject: "" }; }
}

/**
 * Load + normalize the error→fix pairs from error-memory.json. Returns an
 * array of {key, errorType, errorCode, errorMsg, fix, file, timestamp,
 * successCount}. Tolerant of a missing/corrupt file (→ []). Prototype-
 * pollution-safe: reserved keys are skipped, the map is read via own-keys.
 */
export function loadFixPairs(memoryPath = ERROR_MEMORY) {
  let raw;
  try { raw = fs.readFileSync(memoryPath, "utf8"); }
  catch { return []; }
  let j;
  try { j = JSON.parse(raw); }
  catch { return []; }
  const fixes = j && typeof j === "object" ? j.fixes : null;
  if (!fixes || typeof fixes !== "object") return [];
  const out = [];
  for (const key of Object.keys(fixes)) {
    if (RESERVED_KEYS.has(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(fixes, key)) continue;
    const v = fixes[key];
    if (!v || typeof v !== "object") continue;
    // fixKey shape from error-pattern-memory.generateFixKey:
    //   `${type}:${code}:${message.slice(0,50)}`
    const firstColon = key.indexOf(":");
    const secondColon = firstColon >= 0 ? key.indexOf(":", firstColon + 1) : -1;
    const errorType = firstColon >= 0 ? key.slice(0, firstColon) : "(unknown)";
    const errorCode = secondColon >= 0 ? key.slice(firstColon + 1, secondColon) : "(unknown)";
    const errorMsg = secondColon >= 0 ? key.slice(secondColon + 1) : key;
    const successCount = Number.isFinite(v.successCount) ? v.successCount : 1;
    out.push({
      key,
      errorType: String(errorType),
      errorCode: String(errorCode),
      errorMsg: String(errorMsg),
      fix: typeof v.fix === "string" ? v.fix : "",
      file: typeof v.file === "string" ? v.file : "unknown",
      timestamp: typeof v.timestamp === "string" ? v.timestamp : "",
      successCount,
    });
  }
  return out;
}

/**
 * Selection rule. A pair is persisted only when:
 *   - it has a non-empty fix signature, AND
 *   - successCount ≥ MIN_SUCCESS, AND
 *   - the fix is a real signature OR (it is the bare placeholder but recurred
 *     ≥2× — a hotspot worth recording).
 * Exported for direct test.
 */
export function isDurable(pair, minSuccess = MIN_SUCCESS) {
  if (!pair || typeof pair !== "object") return false;
  const fix = typeof pair.fix === "string" ? pair.fix.trim() : "";
  if (!fix) return false;
  const sc = Number.isFinite(pair.successCount) ? pair.successCount : 1;
  if (sc < minSuccess) return false;
  if (fix === PLACEHOLDER_FIX) return sc >= 2;
  return true;
}

/**
 * Stable content hash over the SEMANTIC set of persisted pairs (not the
 * rendered markdown). A re-run with the identical day-set is a no-op even
 * though the regenerated-at differs; any new/changed fix flips the hash.
 */
function contentHash(daySlug, pairs, commitSha) {
  const sig = JSON.stringify({
    d: daySlug,
    g: commitSha || "",
    p: pairs.map((p) => [p.key, p.fix, p.file, p.successCount, p.timestamp]),
  });
  return crypto.createHash("sha256").update(sig).digest("hex").slice(0, 16);
}

/**
 * Return the LAST line-anchored content-hash marker. The legitimate marker is
 * always appended at EOF (after the fenced detail blocks, whose content is
 * clip()-collapsed so a hostile errorMsg cannot place a *later* marker). Using
 * the last match — not the first — closes the embedded-marker-first ambiguity
 * where a crafted error message containing `<!-- content-hash: X -->` inside a
 * fence could otherwise be mistaken for THE marker and cause a false
 * idempotent-skip (a real fix silently never persisted).
 */
export function extractContentHash(content) {
  let last = null;
  for (const m of String(content).matchAll(/^<!-- content-hash: ([0-9a-f]+) -->$/gm)) last = m[1];
  return last;
}

/**
 * Build the day's markdown record. `nowIso` injectable for deterministic
 * tests. `pairs` must already be the filtered+sorted+capped set for `daySlug`.
 */
export function formatRecord(daySlug, pairs, commit, nowIso) {
  const sha = commit && typeof commit.sha === "string" ? commit.sha : "";
  const subj = commit && typeof commit.subject === "string" ? commit.subject : "";
  const slug = `error-fixes-${daySlug}`;
  const chash = contentHash(daySlug, pairs, sha);

  const descBody = `Resolved error→fix pairs captured ${daySlug} (${pairs.length} durable). Bridged from error-memory.json by the Gap #4 Obsidian observer. Linked HEAD ${sha || "(none)"}.`;

  const lines = [
    "---",
    // slug is structurally `error-fixes-YYYY-MM-DD` in production (daySlug ←
    // toISOString); yamlScalar-wrap anyway so an exported-API caller passing a
    // hostile daySlug cannot forge frontmatter — defense-in-depth symmetry
    // with the description/day/linked_commit fields.
    `name: ${yamlScalar(slug)}`,
    `description: ${yamlScalar(descBody)}`,
    "metadata:",
    "source: prism-memory",
    `synced: ${yamlScalar(nowIso)}`,
    `aliases: ${yamlScalar(slug)}`,
    `day: ${yamlScalar(daySlug)}`,
    `pair_count: ${pairs.length}`,
    `linked_commit: ${yamlScalar(sha)}`,
    "---",
    "",
    `# Error → fix learnings — ${daySlug}`,
    "",
    `**${pairs.length}** durable resolution${pairs.length === 1 ? "" : "s"} captured this day  ·  **Linked HEAD:** \`${inlineSafe(sha) || "(none)"}\`${subj ? ` — ${inlineSafe(clip(subj, 100))}` : ""}`,
    "",
    "_Auto-bridged from `mcp-server/data/state/error-memory.json` `fixes{}` (the error→fix pairs `error-pattern-memory.mjs` already detects). Not a new detector — the Obsidian-2nd-brain persistence layer._",
    "",
    "| Error (type:code) | Fixed-by signature | File | ✓× | When |",
    "|-------------------|--------------------|------|----|------|",
  ];
  for (const p of pairs) {
    const errCol = inlineSafe(clip(`${p.errorType}:${p.errorCode}`, 48));
    const fixCol = inlineSafe(clip(p.fix, 80));
    const fileCol = inlineSafe(clip(p.file, 40));
    const whenCol = inlineSafe(p.timestamp ? p.timestamp.slice(0, 19).replace("T", " ") : "—");
    lines.push(`| ${errCol} | ${fixCol} | ${fileCol} | ${p.successCount} | ${whenCol} |`);
  }
  lines.push("");
  lines.push("## Detail");
  lines.push("");
  for (const p of pairs) {
    lines.push(`### \`${inlineSafe(clip(`${p.errorType}:${p.errorCode}`, 60))}\` → ${inlineSafe(clip(p.file, 50))}`);
    lines.push(`_resolved by_ \`${inlineSafe(clip(p.fix, 100))}\` _·_ _worked ${p.successCount}×_${p.timestamp ? ` _·_ _${inlineSafe(p.timestamp)}_` : ""}`);
    lines.push("");
    lines.push("Error message:");
    lines.push(fencedBlock(clip(p.errorMsg, FIELD_CAP)));
    lines.push("");
  }
  lines.push(`<!-- content-hash: ${chash} -->`);
  lines.push(`<!-- regenerated-at: ${nowIso} -->`);
  lines.push("");
  return lines.join("\n");
}

function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, content, "utf8");
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}

/**
 * Concurrent-peer-safe write with content-hash idempotent skip. A missing or
 * null hash on either side never compares equal (falls through to write).
 */
export function writeWithGuard(filePath, content) {
  const targetHash = extractContentHash(content);
  let attempts = 0;
  while (attempts < MAX_CONCURRENT_RETRY) {
    attempts++;
    if (fs.existsSync(filePath)) {
      let cur = "";
      try { cur = fs.readFileSync(filePath, "utf8"); } catch { cur = ""; }
      if (cur && targetHash && extractContentHash(cur) === targetHash) {
        return { ok: true, skipped: "content_equal", attempts };
      }
    }
    atomicWrite(filePath, content);
    let verify = "";
    try { verify = fs.readFileSync(filePath, "utf8"); } catch { verify = ""; }
    if (targetHash && extractContentHash(verify) === targetHash) return { ok: true, attempts };
  }
  return { ok: false, reason: "max_retries_exceeded", attempts };
}

/**
 * Select the durable pairs whose timestamp falls on `daySlug`, sorted
 * deterministically (newest first, then key) and capped at MAX_RECORDS.
 * Exported for direct test.
 */
export function selectForDay(pairs, daySlug, minSuccess = MIN_SUCCESS, cap = MAX_RECORDS) {
  // A pair is attributed to `daySlug` ONLY by a real date-shaped timestamp.
  // An empty/invalid timestamp is EXCLUDED — never silently re-dated to
  // "today", which (under per-UTC-day keying) would re-emit the same fix into
  // every day's file it is ever seen on and misdate the learning. Surfacing
  // less beats silently corrupting the historical record.
  const kept = pairs
    .filter((p) => isDurable(p, minSuccess))
    .filter((p) => typeof p.timestamp === "string"
      && /^\d{4}-\d{2}-\d{2}/.test(p.timestamp)
      && p.timestamp.slice(0, 10) === daySlug);
  kept.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? 1 : -1;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  return kept.slice(0, cap);
}

function main() {
  if (String(process.env.PRISM_ERROR_FIX_VAULT_DISABLE ?? "") === "1") return approve();
  const dryRun = String(process.env.PRISM_ERROR_FIX_VAULT_DRY_RUN ?? "") === "1";

  // Stop hooks receive {session_id,...}; we don't key on it (the record is
  // per-UTC-day, multi-session) but reading stdin keeps the contract clean.
  readStdinJson();

  const nowIso = new Date().toISOString();
  const daySlug = nowIso.slice(0, 10);

  const pairs = loadFixPairs();
  if (pairs.length === 0) return approve();

  const selected = selectForDay(pairs, daySlug);
  if (selected.length === 0) return approve();

  const commit = headCommit();
  const body = formatRecord(daySlug, selected, commit, nowIso);
  const target = path.join(VAULT_DIR, `error-fixes-${daySlug}.md`);

  if (dryRun) {
    process.stderr.write(`[error-fix-vault-bridge DRY-RUN] → ${target}\n${body}\n`);
    return approve();
  }

  try {
    if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
    writeWithGuard(target, body);
  } catch { /* FS locked/unwritable — skip silently per non-blocking contract */ }

  return approve();
}

const isMain = typeof process.argv[1] === "string"
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try { main(); }
  catch { approve(); }
}
