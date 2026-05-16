// tier: T3
/**
 * scrutiny-verdict-persist.mjs — Stop hook (T3 observer).
 *
 * Closes the Obsidian-2nd-brain Gap #2. The 3-of-3 scrutiny gate
 * (scrutinize-before-stop.mjs) records verdicts into SCRUTINY_LEDGER.json
 * keyed by session id — but that ledger is a runtime gate artifact: its
 * per-arm reviewer findings (the actual P0/P1 detail, often a load-bearing
 * safety bug) live only in truncated `notes` fields and evaporate when the
 * session ends. This hook copies the structured ledger entry for THIS
 * session into the Obsidian-synced memory vault as a permanent, queryable
 * record so future sessions (and the operator) can recall WHAT a reviewer
 * caught, not just THAT review happened.
 *
 * Distinct from stop-obsidian-memory-extract.mjs (Ollama-summarized freeform
 * learnings) — this is the STRUCTURED scrutiny verdict + per-arm blockers +
 * commit linkage. Complementary, not duplicate.
 *
 * Selection: persists only sessions whose ledger entry carries review data
 * (either the legacy selfReviewed+agentReviewed pair OR ≥1 entry in
 * `reviews`). Sessions that never ran scrutiny produce no record.
 * BOTH pass AND fail verdicts are persisted — a FAIL is a lesson.
 *
 * Idempotency: target filename is deterministic per session id; if the file
 * already exists with byte-equal content (modulo the regenerated-at line),
 * skip silently. Concurrent-peer-safe write (re-read + verify-after-rename).
 *
 * Non-blocking. Pure observer. Never refuses Stop.
 *
 * Knobs:
 *   PRISM_SCRUTINY_PERSIST_DISABLE=1  → no-op
 *   PRISM_SCRUTINY_PERSIST_DRY_RUN=1  → print target + body to stderr, no write
 *   PRISM_SCRUTINY_PERSIST_TIMEOUT_MS  default 2000
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REPO = process.env.PRISM_ROOT || "H:/prism";
const LEDGER = path.join(REPO, "mcp-server", "data", "state", "SCRUTINY_LEDGER.json");
const VAULT_DIR = path.join(REPO, "knowledge", "memories", "scrutiny");
const TIMEOUT_MS = parseInt(process.env.PRISM_SCRUTINY_PERSIST_TIMEOUT_MS || "2000", 10) || 2000;
const MAX_CONCURRENT_RETRY = 3;
const NOTE_CAP = 600;

function approve() { process.stdout.write(JSON.stringify({ continue: true })); }

function readStdinJson() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/**
 * Resolve this session's id. Stop hooks receive `{ session_id }` on stdin.
 * Fall back to env so a manual/test invocation still works. Returns null if
 * no usable id — the caller then no-ops (we can't key a record without it).
 */
export function resolveSessionId(stdin, env = process.env) {
  const fromStdin = stdin && typeof stdin.session_id === "string" ? stdin.session_id.trim() : "";
  if (fromStdin) return fromStdin;
  const fromEnv = (env.CLAUDE_SESSION_ID || env.PRISM_SESSION_ID || "").trim();
  return fromEnv || null;
}

/**
 * Decide whether a ledger entry is worth persisting. An entry counts as
 * "reviewed" if it carries the legacy self+agent pair OR any structured
 * `reviews` sub-object with at least one arm. Entries with zero review
 * signal (a bare blockCount bump, a never-scrutinized session) are skipped.
 */
export function hasReviewSignal(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.selfReviewed === true && entry.agentReviewed === true) return true;
  if (entry.opusReviewed === true || entry.claudeReviewed === true || entry.codexReviewed === true) return true;
  const reviews = entry.reviews;
  if (reviews && typeof reviews === "object" && Object.keys(reviews).length > 0) return true;
  return false;
}

function clip(s, n = NOTE_CAP) {
  if (typeof s !== "string") return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/**
 * Render any value as a YAML double-quoted flow scalar. JSON string syntax is
 * a valid subset of YAML double-quoted scalar syntax, so JSON.stringify gives
 * us correct escaping of `"`, `\`, and — critically — newlines (→ \n), which
 * is what prevents an untrusted value (sessionId, notes) from closing the
 * frontmatter block with an embedded `\n---\n`. ALWAYS use this for any
 * frontmatter value derived from ledger / session input.
 */
function yamlScalar(v) {
  return JSON.stringify(v == null ? "" : String(v));
}

/**
 * Strip CR/LF + backticks from a value destined for a single-line body
 * context (inline code span, table cell). Newlines would break table rows;
 * backticks would break the inline code span.
 */
function inlineSafe(s) {
  return String(s == null ? "" : s).replace(/[\r\n`]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Wrap untrusted multi-line text in a fenced code block whose fence is
 * GUARANTEED longer than any backtick run inside the content (CommonMark:
 * an info-string-free fence of N backticks is closed only by ≥N backticks
 * at line start, and content may freely contain <N). This makes it
 * impossible for pasted reviewer notes containing ``` to escape the fence.
 */
function fencedBlock(text) {
  const body = typeof text === "string" && text.length ? text : "(none)";
  let maxRun = 0;
  for (const m of body.matchAll(/`+/g)) maxRun = Math.max(maxRun, m[0].length);
  const fence = "`".repeat(Math.max(3, maxRun + 1));
  return `${fence}\n${body}\n${fence}`;
}

/**
 * Stable content hash over the SEMANTIC inputs (not the rendered markdown).
 * Idempotency compares this hash, so a re-run with identical ledger data is
 * a no-op even though the regenerated-at timestamp differs — and a real
 * verdict change always produces a different hash. Immune to the
 * "marker text embedded in notes" false-equal class.
 */
function contentHash(sessionId, entry, commitSha) {
  const sig = JSON.stringify({
    s: String(sessionId),
    r: entry && entry.recordedAt,
    n: entry && entry.notes,
    b: entry && entry.blockCount,
    sr: entry && entry.selfReviewed,
    ar: entry && entry.agentReviewed,
    o: entry && entry.opusReviewed,
    c: entry && entry.claudeReviewed,
    x: entry && entry.codexReviewed,
    rv: entry && entry.reviews,
    g: commitSha || "",
  });
  return crypto.createHash("sha256").update(sig).digest("hex").slice(0, 16);
}

function shortId(sessionId) {
  // Hyphenated UUID → first segment; otherwise first 12 safe chars.
  const seg = String(sessionId).split("-")[0];
  const base = (seg && seg.length >= 6) ? seg : String(sessionId);
  return base.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "session";
}

function headCommit() {
  try {
    // %x1f = ASCII unit-separator between fields — cannot appear in a
    // short-sha and is vanishingly unlikely in a subject. indexOf-split
    // separates them correctly (the prior no-separator format + split made
    // sha a single char and folded the rest of the sha into the subject).
    const out = execFileSync("git", ["-C", REPO, "log", "-1", "--format=%h%x1f%s"], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const sep = out.indexOf("\x1f");
    if (sep < 0) return { sha: out.trim(), subject: "" };
    return { sha: out.slice(0, sep).trim(), subject: out.slice(sep + 1).trim() };
  } catch { return { sha: "", subject: "" }; }
}

/**
 * Build the structured markdown record for a ledger entry. `nowIso` is
 * injectable for deterministic tests. Returns the full file content.
 */
// A date-shaped (YYYY-MM-DD) string or null. Used for the frontmatter `name`
// slug so a non-ISO recordedAt can't leak "(unknown)" into the slug.
function dateSlug(recordedAt, nowIso) {
  const s = typeof recordedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(recordedAt)
    ? recordedAt : nowIso;
  return String(s).slice(0, 10);
}

export function formatRecord(sessionId, entry, commit, nowIso) {
  const sid = shortId(sessionId);
  const recordedAt = typeof entry.recordedAt === "string" ? entry.recordedAt : "(unknown)";
  const dslug = dateSlug(recordedAt, nowIso);
  const slug = `scrutiny-${sid}-${dslug}`;
  const reviews = (entry.reviews && typeof entry.reviews === "object") ? entry.reviews : {};
  const arms = ["opus", "claude", "codex", "analyst"].filter((a) => reviews[a]);
  const sha = commit && typeof commit.sha === "string" ? commit.sha : "";
  const subj = commit && typeof commit.subject === "string" ? commit.subject : "";

  // Verdict roll-up: an arm is PASS only if its verdict says so.
  const verdictOf = (a) => {
    const v = reviews[a] && typeof reviews[a].verdict === "string" ? reviews[a].verdict.toLowerCase() : "";
    return v.includes("pass") ? "PASS" : v.includes("fail") ? "FAIL" : (v || "—");
  };
  const armRows = arms.length
    ? arms.map((a) => `| ${a} | ${verdictOf(a)} | ${inlineSafe(clip(reviews[a].blockers || "—", 120))} |`).join("\n")
    : "| (legacy) | self+agent | no structured per-arm data |";

  // Clearance roll-up mirrors the 3-of-3 gate's own logic:
  //   1. structured per-arm reviews present → ALL must PASS
  //   2. else structured boolean flags (the --mark-opus/--mark-claude/
  //      --mark-analyst path documented in CLAUDE.md) → all three true
  //   3. else legacy self+agent pair → both true
  const cleared = arms.length
    ? arms.every((a) => verdictOf(a) === "PASS")
    : (entry.opusReviewed === true && entry.claudeReviewed === true && entry.codexReviewed === true)
      || (entry.selfReviewed === true && entry.agentReviewed === true);

  // Idempotency key over SEMANTIC inputs (not rendered markdown) — see
  // contentHash(). Embedded as a marker line; writeWithGuard compares ONLY
  // this line, so a re-run with identical ledger data is a no-op even though
  // the human regenerated-at differs, and embedded marker-looking text in
  // notes cannot cause a false content-equal.
  const chash = contentHash(sessionId, entry, sha);

  const descBody = `Scrutiny verdict for session ${shortId(sessionId)}. ${cleared ? "CLEARED (all arms PASS)" : "NOT cleared / has FAIL — see per-arm blockers"}. Linked commit ${sha || "(none)"}. ${clip(entry.notes || "", 180)}`;

  const lines = [
    "---",
    `name: ${slug}`,
    // yamlScalar(JSON.stringify) → newlines escaped to \n; an embedded
    // "\n---\n" in any input can no longer close the frontmatter block.
    `description: ${yamlScalar(descBody)}`,
    "metadata:",
    "source: prism-memory",
    `synced: ${nowIso}`,
    `aliases: ${slug}`,
    `session_id: ${yamlScalar(sessionId)}`,
    `recorded_at: ${yamlScalar(recordedAt)}`,
    `cleared: ${cleared}`,
    `linked_commit: ${yamlScalar(sha)}`,
    "---",
    "",
    `# Scrutiny verdict — session ${sid}`,
    "",
    `**Session:** \`${inlineSafe(sessionId)}\`  ·  **Recorded:** ${inlineSafe(recordedAt)}  ·  **Cleared:** ${cleared ? "✅ yes (all arms PASS)" : "❌ no (FAIL or incomplete)"}`,
    `**Linked HEAD commit:** \`${inlineSafe(sha) || "(none)"}\`${subj ? ` — ${inlineSafe(clip(subj, 120))}` : ""}`,
    `**Block attempts before clearance:** ${Number.isFinite(entry.blockCount) ? entry.blockCount : "(n/a)"}`,
    "",
    "## 3-of-3 arm verdicts",
    "",
    "| Arm | Verdict | Blockers (clipped) |",
    "|-----|---------|--------------------|",
    armRows,
    "",
    "## Ledger notes",
    "",
    fencedBlock(clip(entry.notes || "(none)", NOTE_CAP)),
    "",
  ];

  // Per-arm long-form notes (the load-bearing reviewer detail).
  if (arms.length) {
    lines.push("## Per-arm reviewer notes");
    lines.push("");
    for (const a of arms) {
      const r = reviews[a] || {};
      lines.push(`### ${a} — ${verdictOf(a)}`);
      if (r.recordedAt) lines.push(`_recorded ${inlineSafe(r.recordedAt)}_`);
      lines.push("");
      lines.push(fencedBlock(clip(r.notes || "(no notes)", NOTE_CAP)));
      lines.push("");
    }
  }

  // Idempotency marker FIRST (line-anchored, machine-read), then the
  // human-readable regenerated-at (cosmetic, ignored by the comparator).
  lines.push(`<!-- content-hash: ${chash} -->`);
  lines.push(`<!-- regenerated-at: ${nowIso} -->`);
  lines.push("");
  return lines.join("\n");
}

/**
 * Extract the content-hash marker for idempotency comparison. Anchored to a
 * full line (`^...$` with the m flag) so marker-looking text embedded inside
 * reviewer notes (which are inside fenced blocks, never at line-start as a
 * bare comment) cannot be mistaken for THE marker. Returns null if absent.
 */
export function extractContentHash(content) {
  const m = String(content).match(/^<!-- content-hash: ([0-9a-f]+) -->$/m);
  return m ? m[1] : null;
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
 * Concurrent-peer-safe write. Two Stop hooks (different chats) can fire at
 * the same instant; each targets a DIFFERENT session-keyed filename so true
 * collision is rare, but the verify-after-rename retry closes the window
 * where a shared FS hiccup truncates the write.
 */
export function writeWithGuard(filePath, content) {
  const targetHash = extractContentHash(content);
  let attempts = 0;
  while (attempts < MAX_CONCURRENT_RETRY) {
    attempts++;
    if (fs.existsSync(filePath)) {
      let cur = "";
      try { cur = fs.readFileSync(filePath, "utf8"); } catch { cur = ""; }
      // Idempotent skip ONLY when both sides carry a hash and they match.
      // A missing/null hash never compares equal (falls through to write).
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

export function loadEntry(sessionId, ledgerPath = LEDGER) {
  let raw;
  try { raw = fs.readFileSync(ledgerPath, "utf8"); }
  catch { return null; }
  let j;
  try { j = JSON.parse(raw); }
  catch { return null; }
  const entries = j && typeof j === "object" ? j.entries : null;
  if (!entries || typeof entries !== "object") return null;
  return Object.prototype.hasOwnProperty.call(entries, sessionId) ? entries[sessionId] : null;
}

function main() {
  if (String(process.env.PRISM_SCRUTINY_PERSIST_DISABLE ?? "") === "1") return approve();
  const dryRun = String(process.env.PRISM_SCRUTINY_PERSIST_DRY_RUN ?? "") === "1";

  const stdin = readStdinJson();
  const sessionId = resolveSessionId(stdin);
  if (!sessionId) return approve();

  const entry = loadEntry(sessionId);
  if (!entry) return approve();
  if (!hasReviewSignal(entry)) return approve();

  const commit = headCommit();
  const nowIso = new Date().toISOString();
  const body = formatRecord(sessionId, entry, commit, nowIso);

  const fname = `scrutiny-${shortId(sessionId)}-${(typeof entry.recordedAt === "string" ? entry.recordedAt : nowIso).slice(0, 10)}.md`;
  const target = path.join(VAULT_DIR, fname);

  if (dryRun) {
    process.stderr.write(`[scrutiny-verdict-persist DRY-RUN] → ${target}\n${body}\n`);
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
