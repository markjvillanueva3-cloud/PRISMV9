#!/usr/bin/env node
// tier: T2
/**
 * cross-chat-directive-detector.mjs — UserPromptSubmit hook.
 *
 * Catches the failure mode where a user types a directive INTO chat A that
 * is meant for chat B ("claude-72bb539a should fix the test", "tell the
 * other chat to revert that commit", "all chats need to stop touching that
 * file"). Chat A then either:
 *   (a) tries to act as a puppet for chat B and ends up editing files
 *       outside its lane, or
 *   (b) forwards the directive into the chat bus by hand, which is fine
 *       but slow and inconsistent
 *
 * The chat bus (state/shared/chat-bus/messages/) already exists for exactly
 * this — `prism_context` action `chat_post`. This hook surfaces a warning
 * with the right escape hatch so the user picks the bus by default.
 *
 * Behaviour:
 *   - Pattern detected → emit additionalContext warning (non-blocking).
 *     The chat still gets to respond, but the warning is in the prompt
 *     context so it can route the request through the bus.
 *   - Quoted / code-block content is stripped before matching to avoid
 *     false positives when the user is pasting log lines that mention
 *     other chats.
 *   - Self-references (the user's own session id) are explicitly skipped.
 *   - This hook NEVER blocks. False positives must remain harmless.
 *
 * Opt-out: PRISM_DIRECTIVE_WARN=0 disables the hook.
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

const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const STABLE_ID_TIMEOUT_MS = 1500;

// Directive shapes — each capture group [1] is the targeted entity so we
// can echo it back to the user in the warning.
const DIRECTIVE_PATTERNS = [
  // "claude-XXXXXXXX should/needs/must/has to ..."
  /\b(claude-[0-9a-f]{6,12})\s+(?:should|needs?\s+to|must|has\s+to|gets?\s+to)\b/gi,
  // "tell|ask|inform <claude-X|the other chat|chat X> to ..."
  /\b(?:tell|ask|inform|notify|order)\s+(?:claude-[0-9a-f]{6,12}|the\s+other\s+chat|the\s+peer\s+chat|chat\s+[0-9a-f]+|all\s+chats?|every\s+chat|peer\s+chats?|other\s+chats?)\s+to\b/gi,
  // "all chats need to ..." / "every chat should ..."
  /\b(?:all|every|the|these|those)\s+(?:other\s+)?(?:peer\s+)?chats?\s+(?:should|need\s+to|must|have\s+to|are\s+supposed\s+to)\b/gi,
];

const CODE_FENCE_RE = /(?:```[\s\S]*?```)|(?:`[^`\n]*`)/g;
const QUOTED_BLOCK_RE = /^>\s.*$/gm;

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return null;
  }
}

function emitContinue() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

function emitContinueWithContext(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext,
      },
    }),
  );
}

function ownSessionId(payload) {
  const explicit = payload?.session_id || payload?.sessionId;
  if (explicit) return `claude-${String(explicit).slice(0, 8)}`;
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

function stripCodeAndQuotes(text) {
  // Remove code fences and inline backticks first so log-line pastes don't
  // trigger the patterns. Then drop quoted-reply lines (markdown blockquote)
  // for the same reason.
  return text.replace(CODE_FENCE_RE, "").replace(QUOTED_BLOCK_RE, "");
}

function findDirectives(text, ownId) {
  const hits = [];
  for (const pattern of DIRECTIVE_PATTERNS) {
    pattern.lastIndex = 0; // reset stateful global regex
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const targeted = (match[1] || "").toLowerCase();
      // Skip self-references — telling yourself what to do is fine.
      if (targeted && ownId && targeted === ownId.toLowerCase()) continue;
      const snippetStart = Math.max(0, match.index - 30);
      const snippetEnd = Math.min(text.length, match.index + match[0].length + 30);
      hits.push({
        match: match[0],
        targeted: targeted || "(broad: all/every/peer chats)",
        snippet: text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim(),
      });
      if (hits.length >= 3) return hits; // cap output
    }
  }
  return hits;
}

function buildWarning(hits, ownId) {
  const examples = hits
    .slice(0, 3)
    .map(
      (h, i) =>
        `  ${i + 1}. "...${h.snippet}..."\n     target: ${h.targeted}`,
    )
    .join("\n");
  return [
    "CROSS-CHAT DIRECTIVE — heads up.",
    "",
    "Your prompt looks like it is directing another Claude chat to do",
    "something. This chat cannot puppet a peer chat by editing files in",
    "their worktree — that is exactly the lane-drift the rails were built",
    "to prevent (you would commit into a peer's tree, the auto-fork hook",
    "would fire, and the peer would still not see the request).",
    "",
    `Detected ${hits.length} directive-shaped phrase(s):`,
    examples,
    "",
    "The right channel for cross-chat work is the chat bus, which the peer",
    "session sees in its next UserPromptSubmit injection:",
    "",
    "  prism_context  action=chat_post",
    "    channel=general",
    `    message=\"<your request, addressed to ${hits[0].targeted}>\"`,
    "",
    `You (${ownId || "this chat"}) should respond to the human in this`,
    "chat with what THIS chat will do, and post the cross-chat ask to the",
    "bus so the peer picks it up. Do NOT edit files outside your declared",
    "scope to fulfil the directive yourself.",
    "",
    "(Set PRISM_DIRECTIVE_WARN=0 to disable this warning.)",
  ].join("\n");
}

function main() {
  if (process.env.PRISM_DIRECTIVE_WARN === "0") {
    emitContinue();
    return;
  }

  const payload = readPayload();
  if (!payload) {
    emitContinue();
    return;
  }

  // Various harness versions surface the prompt under different keys.
  const promptRaw =
    payload.user_prompt ||
    payload.prompt ||
    payload.message ||
    payload.text ||
    payload.input ||
    "";
  const promptText = typeof promptRaw === "string" ? promptRaw : String(promptRaw ?? "");
  if (!promptText.trim()) {
    emitContinue();
    return;
  }

  const ownId = ownSessionId(payload);
  const cleanText = stripCodeAndQuotes(promptText);
  const hits = findDirectives(cleanText, ownId);

  if (hits.length === 0) {
    emitContinue();
    return;
  }

  // Audit-log the warn before emitting. P5-U04 surfaces this in the handoff.
  logArbitration(
    "directive-warn",
    {
      directiveCount: hits.length,
      targets: Array.from(new Set(hits.map((h) => h.targeted))).slice(0, 5),
      sampleSnippet: hits[0].snippet.slice(0, 120),
    },
    { sessionId: ownId },
  );

  emitContinueWithContext(buildWarning(hits, ownId));
}

try {
  main();
} catch {
  emitContinue();
}
