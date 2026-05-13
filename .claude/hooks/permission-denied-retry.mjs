#!/usr/bin/env node
// tier: T3
/**
 * permission-denied-retry.mjs — PostToolUse classifier for denied / failed tool calls.
 *
 * U-HKA03 of HOOKS-AUTOMATION-V2-MS0.
 *
 * WHY: many tool failures are *cheaply recoverable* — "you must Read the file
 * before Edit", `EISDIR` on a Read, output-too-large floods, a shell-quoting
 * slip, a Write into a missing dir, a write under C:\ that belongs on H:.
 * The harness in use can't auto-retry a tool from a hook, so this hook does the
 * next best thing: it classifies the failure and surfaces a *concrete* corrected
 * call as `additionalContext` so the model fixes it on the next turn instead of
 * thrashing. It is the "PermissionDenied{retry:true}" pattern realised on the
 * surface the harness actually exposes (PostToolUse tool_response inspection).
 *
 * Safety rails (mirrors the spec's failure_modes):
 *   - classify-fail / unknown error  → say nothing about retrying (safe default)
 *   - retry-storm                    → cap at RETRY_CAP suggestions per (session,
 *                                       call); after that, tell the model to stop
 *                                       retrying and escalate / change approach
 *   - peer-claimed file              → explicitly DON'T suggest a retry
 *
 * NOTE: a *hook* denial (permissionDecision:"deny") does not produce a PostToolUse
 * event, so this hook can't see those. It catches the *tool-executed-then-failed*
 * case. If/when the harness exposes a `PermissionDenied` event, wire this there too
 * (its `classifyDenial` is the reusable piece) — left as a follow-up rather than
 * registered under an event key the running harness may reject.
 *
 * @hook PostToolUse:* (registered under the matchers that actually fail in practice:
 *        Bash | Read | Edit | Write | MultiEdit)
 *
 * Env: PRISM_RETRY_CLASSIFY=0 → disable.  PRISM_RETRY_CLASSIFY_CACHE_DIR → override.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const RETRY_CAP = 2;                 // suggest a corrected call at most this many times per (session, call)
const CACHE_TTL_MS = 30 * 60 * 1000; // forget per-call retry counts older than this
const TAIL_MAX = 4000;               // chars of error text to scan (bound the work)

// ── error-text extraction ─────────────────────────────────────────────────────

// Bash stdout routinely *contains* error-looking strings benignly (logs, grep
// hits, test fixture text). So for Bash we deliberately ignore stdout/output and
// only look at stderr/error — and even then we require a non-zero exit (or, if the
// exit code isn't available, a strong failure signature). For every other tool the
// tool_response *is* the tool's own outcome, so any error field is meaningful.
const BASH_ERR_FIELDS = ["error", "stderr"];
const OTHER_ERR_FIELDS = ["error", "stderr", "message", "output", "stdout", "text", "reason"];
const STRONG_BASH_FAILURE_RX =
  /\b(fatal|exception|traceback|panic|unhandledrejection|command not found|no such file|cannot find|permission denied|access is denied|unexpected token|syntax error|parsererror|eacces|enoent|eisdir|eaddrinuse|erofs|ebusy|the term .* is not recognized)\b/i;

/** Pull a single error-ish string out of a PostToolUse tool_response of unknown shape. */
export function extractErrorText(toolResponse, toolName = "") {
  if (toolResponse == null) return "";
  if (typeof toolResponse === "string") return toolName === "Bash" ? "" : toolResponse.slice(0, TAIL_MAX);
  if (typeof toolResponse !== "object") return toolName === "Bash" ? "" : String(toolResponse).slice(0, TAIL_MAX);
  const fields = toolName === "Bash" ? BASH_ERR_FIELDS : OTHER_ERR_FIELDS;
  const parts = [];
  for (const k of fields) {
    const v = toolResponse[k];
    if (typeof v === "string" && v) parts.push(v);
  }
  if (toolName !== "Bash" && Array.isArray(toolResponse.content)) {
    for (const c of toolResponse.content) {
      if (c && typeof c.text === "string") parts.push(c.text);
    }
  }
  // a tool_response that *is* an error object with no string fields
  if (parts.length === 0 && (toolResponse.is_error || toolResponse.isError) && toolName !== "Bash") {
    try { parts.push(JSON.stringify(toolResponse)); } catch { /* ignore */ }
  }
  return parts.join("\n").slice(0, TAIL_MAX);
}

function bashExitCode(toolResponse) {
  if (!toolResponse || typeof toolResponse !== "object") return undefined;
  for (const k of ["exitCode", "exit_code", "code", "returnCode"]) {
    if (Number.isFinite(toolResponse[k])) return toolResponse[k];
  }
  return undefined;
}

/** Heuristic: does this look like a *failure* at all? (clean runs say nothing) */
export function looksLikeFailure(toolName, errorText, toolResponse) {
  if (toolName === "Bash") {
    const ec = bashExitCode(toolResponse);
    if (Number.isFinite(ec)) return ec !== 0;                 // exit 0 ⇒ success, full stop — ignore whatever it printed
    return !!errorText && STRONG_BASH_FAILURE_RX.test(errorText); // no exit code ⇒ need a real signature in stderr
  }
  if (!errorText) {
    return !!(toolResponse && (toolResponse.is_error || toolResponse.isError));
  }
  return true; // other tools: the error field IS the failure
}

// ── classifier (pure, exported) ───────────────────────────────────────────────

const RX = {
  editNotRead: /\b(has not been read|read the file.*before|must read the file|file has not been read yet|read it first)\b/i,
  editStale: /\b(string to replace not found|old_string.*not.*(found|unique)|appears.*multiple times|not unique enough|found multiple|no match found for)\b/i,
  cDriveWrite: /\b(c.?drive write|stop_on_c_drive|c:\\\\users\\\\wompu|writing to c:\b)/i,
  shellQuoting: /\b(syntax error|unexpected token|unterminated|bad substitution|eof while looking for matching|parse error near|unexpected end of file|the term .* is not recognized|missing|ParserError)\b/i,
  oversized: /\b(too large|exceeds.*(limit|maximum)|output.*truncat|file too big|2000 lines|maximum.*(size|length)|response.*too large|content.*too long|output exceeds)\b/i,
  dirRead: /\b(is a directory|eisdir|illegal operation on a directory|cannot read.*directory)\b/i,
  notFound: /\b(no such file|enoent|does not exist|file not found|cannot find.*file|path does not exist)\b/i,
  peerClaimed: /\b(file.?claim|claimed by|peer.*own|owned by.*chat|file-claim-guard|another chat is editing|work.?claim)\b/i,
  permission: /\b(permission denied|eacces|operation not permitted|access is denied|not permitted|read-only file system|erofs|locked|ebusy)\b/i,
};

/**
 * @param {{toolName:string, toolInput:object, errorText:string}} p
 * @returns {{category:string, retryable:boolean, hint:string, adjustedInput:object|null}}
 */
export function classifyDenial({ toolName = "", toolInput = {}, errorText = "" }) {
  const t = toolName;
  const isEdit = t === "Edit" || t === "Write" || t === "MultiEdit" || t === "NotebookEdit";
  const fp = toolInput && typeof toolInput.file_path === "string" ? toolInput.file_path : "";
  if (!errorText) return { category: "ok", retryable: false, hint: "", adjustedInput: null };

  // order matters: most-specific / most-actionable first
  if (RX.peerClaimed.test(errorText)) {
    return {
      category: "peer-claimed", retryable: false, adjustedInput: null,
      hint: `${fp || "That file"} is claimed by another chat. Do NOT retry — post a 'proposing' message on the chat bus (agent-coordination.mjs) or pick a different file. Forcing it is the silent-overwrite bug class.`,
    };
  }
  if (isEdit && RX.editNotRead.test(errorText)) {
    return {
      category: "edit-not-read", retryable: true, adjustedInput: null,
      hint: `${t} requires the file to have been Read this session first. Do: Read("${fp || "<file>"}"), then re-issue this ${t} unchanged.`,
    };
  }
  if (isEdit && RX.editStale.test(errorText)) {
    return {
      category: "edit-stale", retryable: true, adjustedInput: null,
      hint: `Edit didn't match: the file changed since you read it, the old_string's whitespace/anchor is off, or it isn't unique. Fix: re-Read("${fp || "<file>"}"), copy the EXACT current text into old_string, add more surrounding lines for uniqueness, or use replace_all:true if you really mean every occurrence.`,
    };
  }
  // C:\ write that should be on H: — only suggest the remap for non-config paths
  const cDrivePath = /^c:[\\/]+users[\\/]+wompu[\\/]+(?!\.claude[\\/]+settings)/i.test(fp);
  if ((t === "Write" || t === "Edit") && (RX.cDriveWrite.test(errorText) || cDrivePath) && cDrivePath) {
    const remapped = fp.replace(/^c:[\\/]+users[\\/]+wompu[\\/]+/i, "H:/").replace(/^c:[\\/]+users[\\/]+wompu[\\/]+\.claude[\\/]+/i, "H:/.claude/");
    return {
      category: "c-drive-write", retryable: true,
      adjustedInput: remapped !== fp ? { ...toolInput, file_path: remapped } : null,
      hint: `Writes under C:\\Users\\wompu\\ are blocked (source-of-truth is H:\\). ${remapped !== fp ? `Suggested: ${t} with file_path="${remapped}".` : "Re-target the path onto H:\\."} (The one sanctioned C: write is ~/.claude/settings.json, which the c-to-h-mirror hook propagates.)`,
    };
  }
  if (RX.dirRead.test(errorText) && t === "Read") {
    return {
      category: "dir-read", retryable: false, adjustedInput: null,
      hint: `"${fp || "that path"}" is a directory — use Glob("${(fp || ".").replace(/[\\/]+$/, "")}/**") or LS, not Read.`,
    };
  }
  if (RX.oversized.test(errorText)) {
    if (t === "Read") {
      return {
        category: "oversized", retryable: true,
        adjustedInput: { ...toolInput, offset: 1, limit: 500 },
        hint: `File/output too large for one Read. Retry with offset/limit (e.g. offset:1, limit:500), or Grep the file first to jump straight to the relevant lines.`,
      };
    }
    if (t === "Write" || t === "Edit" || t === "MultiEdit") {
      return {
        category: "oversized", retryable: true, adjustedInput: null,
        hint: `Content too large for one ${t}. Split it: write a smaller base file, then append the rest with successive Edits (or a MultiEdit), instead of one giant payload.`,
      };
    }
    return {
      category: "oversized", retryable: true, adjustedInput: null,
      hint: `Output too large. Re-run with the output narrowed: pipe through head/tail/grep, add quiet flags, or prefix the command with \`rtk\` to compress it.`,
    };
  }
  if (RX.notFound.test(errorText)) {
    if (t === "Write") {
      return {
        category: "file-not-found", retryable: true, adjustedInput: null,
        hint: `Parent directory of "${fp || "the target"}" may not exist — the Write tool creates files but not directories. Bash: \`mkdir -p\` the parent, then re-run the Write.`,
      };
    }
    return {
      category: "file-not-found", retryable: false, adjustedInput: null,
      hint: `"${fp || "That path"}" doesn't exist — check spelling/case, or Glob for it (it may live under a different directory or one of the sibling worktrees).`,
    };
  }
  if (t === "Bash" && RX.shellQuoting.test(errorText)) {
    return {
      category: "shell-quoting", retryable: true, adjustedInput: null,
      hint: `Shell syntax/quoting error. Single-quote literal strings; for multi-line content use a here-doc; escape $ \\\` \\\\ inside double quotes. This harness runs PowerShell — \`&&\`/\`||\` chains, ternary \`?:\`, and \`??\` don't work; use \`;\` + \`if ($?) { ... }\` instead.`,
    };
  }
  if (RX.permission.test(errorText)) {
    return {
      category: "permission", retryable: false, adjustedInput: null,
      hint: `Permission denied / path not writable — the file may be read-only, locked by another process, or outside the allowed roots. Investigate (lock owner, ACLs, correct path) rather than blindly retrying.`,
    };
  }
  // recognised-as-failure but unclassified → say nothing about retrying (safe default)
  return { category: "unknown", retryable: false, hint: "", adjustedInput: null };
}

// ── retry-cap bookkeeping (IO, exported for tests) ────────────────────────────

function findRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return start;
}
export function cacheDir(env = process.env) {
  return env.PRISM_RETRY_CLASSIFY_CACHE_DIR || path.join(findRoot(), ".claude", "cache");
}
function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
export function cachePath(sid, env = process.env) {
  return path.join(cacheDir(env), `retry-classify-${safeSid(sid)}.json`);
}
export function callHash(toolName, toolInput) {
  const norm = (v) => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      const o = {};
      for (const k of Object.keys(v).sort()) o[k] = norm(v[k]);
      return o;
    }
    return v;
  };
  return crypto.createHash("sha1").update(JSON.stringify({ t: toolName, i: norm(toolInput ?? {}) })).digest("hex").slice(0, 16);
}
function loadCounts(file, now) {
  try {
    const obj = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!obj || typeof obj !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === "object" && Number.isFinite(v.lastAt) && now - v.lastAt < CACHE_TTL_MS) out[k] = v;
    }
    return out;
  } catch { return {}; }
}
function saveCounts(file, counts) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(counts));
    fs.renameSync(tmp, file);
  } catch { /* ignore */ }
}

/**
 * Decide what (if anything) to surface, given a classification and how many times
 * we've already nudged this exact call.
 * @returns {{action:"silent"|"hint"|"stop", message:string, newCount:number, category:string}}
 */
export function decideRetry(classification, priorCount) {
  const { category, retryable, hint, adjustedInput } = classification;
  if (category === "ok") return { action: "silent", message: "", newCount: priorCount, category };
  if (!retryable) {
    // a one-shot informative hint for non-retryable failures (but only the first time)
    if (hint && priorCount === 0) return { action: "hint", message: hint, newCount: 1, category };
    return { action: "silent", message: "", newCount: priorCount, category };
  }
  if (priorCount >= RETRY_CAP) {
    if (priorCount === RETRY_CAP) {
      return {
        action: "stop", newCount: priorCount + 1, category,
        message: `This call has already been corrected ${RETRY_CAP}× and is still failing (${category}). Stop retrying it — step back, re-read the relevant code, try a fundamentally different approach, or ask the user.`,
      };
    }
    return { action: "silent", message: "", newCount: priorCount, category };
  }
  let msg = `↻ retry hint (${category}): ${hint}`;
  if (adjustedInput) {
    let preview;
    try { preview = JSON.stringify(adjustedInput); } catch { preview = "<unprintable>"; }
    if (preview.length > 400) preview = preview.slice(0, 397) + "...";
    msg += `\n  Suggested corrected call input: ${preview}`;
  }
  return { action: "hint", message: msg, newCount: priorCount + 1, category };
}

// ── glue ──────────────────────────────────────────────────────────────────────

export function runClassifier({ stdin, env = process.env, now = Date.now() }) {
  if (String(env.PRISM_RETRY_CLASSIFY ?? "") === "0") return { action: "silent", message: "", category: "disabled" };
  const toolName = stdin?.tool_name || "";
  const toolInput = stdin?.tool_input || {};
  const toolResponse = stdin?.tool_response;
  const errorText = extractErrorText(toolResponse, toolName);
  if (!looksLikeFailure(toolName, errorText, toolResponse)) return { action: "silent", message: "", category: "ok" };

  const classification = classifyDenial({ toolName, toolInput, errorText });
  const sid = stdin?.session_id;
  const file = cachePath(sid, env);
  const counts = loadCounts(file, now);
  const h = callHash(toolName, toolInput);
  const prior = counts[h]?.count ?? 0;
  const decision = decideRetry(classification, prior);
  if (decision.newCount !== prior || decision.action !== "silent") {
    counts[h] = { count: decision.newCount, category: decision.category, lastAt: now };
    saveCounts(file, counts);
  }
  return { ...decision, toolName, errorTextLen: errorText.length };
}

function telemetry(env, rec) {
  try {
    const f = path.join(cacheDir(env), "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "permission-denied-retry", t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}

function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch { stdin = null; }

  let res;
  try { res = runClassifier({ stdin }); }
  catch { return process.stdout.write(JSON.stringify({ continue: true })); }

  if (res.action === "silent") return process.stdout.write(JSON.stringify({ continue: true }));

  telemetry(process.env, { event: res.action, category: res.category, tool: res.toolName, session: stdin?.session_id ?? null });
  return process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: res.message },
  }));
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("permission-denied-retry.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
