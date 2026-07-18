#!/usr/bin/env node
// tier: T0
/**
 * pre-edit-lane-guard.mjs — PreToolUse(Edit | Write | MultiEdit) lane gate.
 *
 * The hard problem this exists to solve:
 *
 *   PRISM runs ~6 concurrent Claude chats. Each chat is supposed to stay in
 *   its own worktree and edit only files that belong to its declared scope.
 *   The existing rails fire too late:
 *
 *     - chat-bus-inject.mjs is informational — it tells you a peer chat owns
 *       file X, but does not block you from editing X
 *     - commit-ownership-guard.mjs fires at COMMIT time. By then the chat has
 *       already produced an hour of work in the wrong tree, which is now an
 *       expensive merge rather than a redirect
 *     - worktree-commit-route.mjs has the right idea but only on `git commit`
 *
 *   This hook closes the gap by gating Edit/Write/MultiEdit themselves
 *   against the chat-bus claim ledger (state/shared/chat-bus/claims/*.json,
 *   the same surface chat-bus-inject reads for peer-claim signals).
 *
 * Decision rules (in order, first match wins):
 *
 *   1. Tool is not Edit/Write/MultiEdit → allow
 *   2. file_path missing or empty       → allow (fail-open)
 *   3. Target normalises to an active foreign claim path (peer sessionId,
 *      claim not yet expired) → BLOCK with structured deny + the exact
 *      `git worktree add` command the chat should run to fork its own tree
 *   4. Target matches an own-session claim → allow (silent)
 *   5. Target unclaimed → allow (silent)
 *
 * The hook fails open on every internal error — the worst-case behaviour
 * is to fall back to today's discipline (commit-time block), not to break
 * Edit. We never want this hook to be the reason a chat cannot work.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Audit log invoked sync via helper CLI; failure swallowed. P5-U04.
const ARBITRATION_HELPER_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "helpers",
  "arbitration-log.mjs",
);
const ARBITRATION_LOG_TIMEOUT_MS = 2000;
function logArbitration(kind, details, ctx) {
  try {
    if (!fs.existsSync(ARBITRATION_HELPER_PATH)) return;
    const args = [
      ARBITRATION_HELPER_PATH,
      "append",
      "--kind",
      kind,
      "--details",
      JSON.stringify(details ?? {}),
    ];
    if (ctx && ctx.sessionId) args.push("--session", ctx.sessionId);
    spawnSync(process.execPath, args, {
      timeout: ARBITRATION_LOG_TIMEOUT_MS,
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
    });
  } catch {
    // never let logging break the hook
  }
}

// Default chat-bus root mirrors chat-bus-inject.mjs. Tests can override via
// the PRISM_CHAT_BUS_CLAIMS_DIR env var to run against a hermetic tmpdir
// without touching real peer-chat state.
const CHAT_BUS_ROOT = "H:/prism/state/shared/chat-bus";
const CLAIMS_DIR = process.env.PRISM_CHAT_BUS_CLAIMS_DIR
  ? process.env.PRISM_CHAT_BUS_CLAIMS_DIR
  : path.join(CHAT_BUS_ROOT, "claims");
const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const STABLE_ID_TIMEOUT_MS = 1500;

function readStdinJson() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return null;
  }
}

function emitContinue() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

function emitBlock(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
}

function normalisePath(p) {
  if (!p) return "";
  return path.resolve(String(p)).replace(/\\/g, "/").toLowerCase();
}

function listClaimsSafe() {
  try {
    return fs.readdirSync(CLAIMS_DIR);
  } catch {
    return [];
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function ownSessionId(payload) {
  // Prefer the explicit session_id surfaced by the harness.
  const explicit = payload?.session_id || payload?.sessionId;
  if (explicit) return `claude-${String(explicit).slice(0, 8)}`;
  // Fall back to the stable-session-id helper that pins the id to Claude's PID.
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { windowsHide: true,
      timeout: STABLE_ID_TIMEOUT_MS,
      encoding: "utf-8",
    });
    const out = (r.stdout || "").trim();
    if (out.startsWith("claude-")) return out;
  } catch {
    /* fall through */
  }
  return "";
}

function inferScopeFromPath(targetPath) {
  // Pull a worktree-friendly scope token from the target file path so the
  // suggested fork branch carries enough context to be useful.
  const m = targetPath.match(/[\\/](?:src[\\/]engines|src[\\/]tools|src[\\/]hooks|src|knowledge|state|mcp-server)[\\/]/i);
  const tail = path.basename(targetPath, path.extname(targetPath));
  if (m && tail) {
    const slug = tail.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase().slice(0, 24);
    return slug || "edit";
  }
  return "edit";
}

function buildForkCommand(scope, sessionId) {
  const idTag = sessionId ? sessionId.replace(/^claude-/, "").slice(0, 6) : "fork";
  const branch = `work/${scope}-${idTag}`;
  const worktreePath = `../prism-${scope}-${idTag}`;
  return { branch, worktreePath };
}

function main() {
  const payload = readStdinJson();
  if (!payload) {
    emitContinue();
    return;
  }

  const tool = payload.tool_name || payload.toolName || "";
  if (!["Edit", "Write", "MultiEdit"].includes(tool)) {
    emitContinue();
    return;
  }

  const toolInput = payload.tool_input || payload.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || "";
  if (!filePath) {
    emitContinue();
    return;
  }

  const target = normalisePath(filePath);
  const me = ownSessionId(payload);

  const now = Date.now();
  let conflictingClaim = null;

  for (const file of listClaimsSafe()) {
    const claim = readJsonSafe(path.join(CLAIMS_DIR, file));
    if (!claim || !claim.path || !claim.sessionId) continue;

    // Skip my own claims silently — I'm allowed to edit what I claimed.
    if (me && claim.sessionId === me) continue;

    // Skip expired claims — chat-bus protocol says claims auto-release.
    const expMs = Date.parse(claim.expiresAt || "");
    if (Number.isFinite(expMs) && expMs < now) continue;

    // Compare normalised paths so /h/prism/foo and H:\prism\foo collide.
    const claimedPath = normalisePath(claim.path);
    if (claimedPath && claimedPath === target) {
      conflictingClaim = claim;
      break;
    }
  }

  if (!conflictingClaim) {
    emitContinue();
    return;
  }

  const scope = inferScopeFromPath(target);
  const { branch, worktreePath } = buildForkCommand(scope, me);
  const ageMin = conflictingClaim.acquiredAt
    ? Math.max(0, Math.round((now - Date.parse(conflictingClaim.acquiredAt)) / 60000))
    : null;
  const expiresMin = conflictingClaim.expiresAt
    ? Math.max(0, Math.round((Date.parse(conflictingClaim.expiresAt) - now) / 60000))
    : null;

  const lines = [
    `LANE GATE — peer chat owns this file. Edit blocked.`,
    ``,
    `Target file:   ${filePath}`,
    `Claimed by:    ${conflictingClaim.sessionId} on ${conflictingClaim.pcName || "?"}`,
    `Intent:        ${conflictingClaim.intent || "write"}`,
    ageMin === null ? "" : `Acquired:      ${ageMin}m ago`,
    expiresMin === null ? "" : `Expires:       in ${expiresMin}m`,
    ``,
    `WHY: another chat is actively editing this file. Editing it here will`,
    `cause a commit conflict, lane drift, or silent overwrite.`,
    ``,
    `ACTION — fork into your own tree and continue there:`,
    `  git worktree add "${worktreePath}" -b ${branch}`,
    `  cd "${worktreePath}"`,
    `  # then re-run the edit`,
    ``,
    `OR if this edit is genuinely yours and the peer's claim is stale, run`,
    `  node H:/prism/.claude/helpers/agent-coordination.mjs release-claim --path "${filePath}"`,
    `before retrying. Stale claims should be rare — verify with`,
    `  prism_context action chat_post  channel=general  message="checking who owns ${path.basename(filePath)}"`,
  ].filter(Boolean);

  // Audit-log the block before emitting, so the per-agent handoff can show
  // how often this rail fires. P5-U04.
  logArbitration(
    "lane-block",
    {
      targetFile: filePath,
      claimedBy: conflictingClaim.sessionId,
      claimedOn: conflictingClaim.pcName || "?",
      tool,
      suggestedFork: { worktreePath, branch },
    },
    { sessionId: me },
  );

  emitBlock(lines.join("\n"));
}

try {
  main();
} catch {
  // Fail open — never break Edit because of our own bug.
  emitContinue();
}
