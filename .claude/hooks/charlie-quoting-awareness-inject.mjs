#!/usr/bin/env node
// tier: T2
/**
 * charlie-quoting-awareness-inject.mjs — UserPromptSubmit hook (slot:charlie galaxy).
 *
 * Injects the quoting-domain awareness ## Headline (engine/hook/algorithm/frontend counts,
 * NN-bridge status, drift state, next unit) so EVERY charlie prompt auto-loads domain context
 * at the lowest token cost. Companion to scripts/generate-quoting-awareness.mjs which produces
 * the snapshot. This is the "custom prism awareness tailored to your domain" deliverable
 * (operator directive 2026-05-28) — charlie's analogue to the fleet awareness-snapshot-inject.
 *
 * GATING (charlie-only, fail-CLOSED): resolves the slot bound to this session from
 * state/shared/chat-slots.json; injects ONLY when slots.charlie.chatId === claude-<sid8>.
 * A non-charlie chat (or unresolved slot) is a silent no-op — never pollute peer chats with
 * quoting context.
 *
 * CANONICAL PATH: reads the MAIN-tree snapshot H:/prism/state/shared/quoting/QUOTING-AWARENESS.md
 * (the full-count 32-engine artifact). The slot worktree is commits-behind, so its local snapshot
 * under-counts — always prefer the canonical fleet-shared copy.
 *
 * FAIL-SOFT (R12): any read/parse error → exit 0 with no injection. An awareness inject must
 * never block or corrupt a prompt.
 *
 * Knobs: PRISM_QUOTING_AWARENESS_INJECT_DISABLE=1 (off) · PRISM_QUOTING_AWARENESS_FILE=<path> (override).
 */
import { readFileSync } from "node:fs";
// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): session-keyed dedup so the
// static quoting-awareness block isn't re-injected byte-identically every prompt.
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const SNAPSHOT = process.env.PRISM_QUOTING_AWARENESS_FILE || `${PRISM}/state/shared/quoting/QUOTING-AWARENESS.md`;

/** Read all of stdin (bounded). Returns "" on any error. */
async function readStdin() {
  return await new Promise((resolve) => {
    let buf = "";
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve(buf);
      }
    };
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (c) => {
        buf += c;
        if (buf.length > 1_000_000) finish(); // bound — never grow unbounded
      });
      process.stdin.on("end", finish);
      process.stdin.on("error", finish);
      setTimeout(finish, 2000); // never hang the prompt
    } catch {
      finish();
    }
  });
}

/** Is THIS session bound to the charlie slot? Fail-closed (false on any doubt). Pure given inputs. */
export function isCharlieSession(sessionId, slotsText) {
  if (typeof sessionId !== "string" || sessionId.length < 8) return false;
  let doc;
  try {
    doc = JSON.parse(slotsText);
  } catch {
    return false;
  }
  const charlie = doc && doc.slots && doc.slots.charlie;
  if (!charlie || typeof charlie.chatId !== "string") return false;
  const me = "claude-" + sessionId.slice(0, 8);
  // exact match OR full-uuid match (chatId is sometimes stored full) — both conservative.
  return charlie.chatId === me || charlie.chatId === sessionId || charlie.chatId === "claude-" + sessionId;
}

/** Extract the ## Headline block from the snapshot md. Pure + defensive. */
export function extractHeadline(md) {
  if (typeof md !== "string") return "";
  const start = md.indexOf("## Headline");
  if (start < 0) return "";
  const after = md.indexOf("\n## ", start + 1);
  return (after < 0 ? md.slice(start) : md.slice(start, after)).trim();
}

function emit(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
    })
  );
}

async function main() {
  if (process.env.PRISM_QUOTING_AWARENESS_INJECT_DISABLE === "1") return 0;
  const raw = await readStdin();
  let sessionId = "";
  try {
    sessionId = (JSON.parse(raw || "{}").session_id) || "";
  } catch {
    return 0; // unparseable stdin → silent no-op
  }
  let slotsText = "";
  try {
    slotsText = readFileSync(SLOTS_FILE, "utf8");
  } catch {
    return 0;
  }
  if (!isCharlieSession(sessionId, slotsText)) return 0; // not charlie → silent

  let headline = "";
  try {
    headline = extractHeadline(readFileSync(SNAPSHOT, "utf8"));
  } catch {
    return 0; // snapshot missing → silent (run scripts/generate-quoting-awareness.mjs to create)
  }
  if (!headline) return 0;

  emit(
    dedupedContext("charlie-quoting-awareness",
      "## 🧮 Quoting-domain awareness (charlie galaxy — auto-injected)\n" +
        headline +
        "\n\n_Regen: `node scripts/generate-quoting-awareness.mjs` · galaxy: `mcp-server/src/engines/quoting/`. Disable: `PRISM_QUOTING_AWARENESS_INJECT_DISABLE=1`._",
      sessionId)
  );
  return 0;
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("charlie-quoting-awareness-inject.mjs");
if (invokedDirectly) {
  main()
    .then((c) => process.exit(c || 0))
    .catch(() => process.exit(0)); // fail-soft: never throw out of a prompt hook
}
