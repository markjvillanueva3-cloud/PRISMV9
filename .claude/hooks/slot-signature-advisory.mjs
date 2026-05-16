#!/usr/bin/env node
// tier: T3
/**
 * slot-signature-advisory.mjs — PreToolUse:Edit|Write|MultiEdit
 * (AUTOCOMPACT-AUTONOMOUS-MS0 / U-AAM03-SLOT-SIGNATURE)
 *
 * ADVISORY-ONLY. Surfaces a warning when the file about to be edited carries a
 * per-file slot signature belonging to a DIFFERENT, still-alive chat slot than
 * this session's. NEVER blocks — always returns {continue:true}.
 *
 * Why advisory, not hard-block: `file-claim-guard` already hard-blocks
 * peer-CLAIMED files in real time via the claims registry (the authoritative
 * live signal). A per-file signature is a STALER marker; making it a hard gate
 * would lock the fleet for the many LEGITIMATE cross-slot edits — integration
 * merges in the main tree, conflict-fork resolution, dead-slot pickup, golf
 * hygiene sweeps. Operator chose advisory-warn (2026-05-16) precisely to keep
 * this zero-false-positive-lockout.
 *
 * Signature carriers (read-only — this hook never WRITES signatures; stamping
 * is a deliberately separate unit):
 *   .ts/.mjs/.js/.cjs/.jsx/.ts x/.py/.go/.rs → `// prism-slot: <slot> <iso>`
 *   .md                                      → frontmatter `prism_slot: <slot>`
 *   .json                                    → sidecar `<dir>/.<base>.slot`
 *
 * Fail-OPEN: any parse error / missing slot-state / unknown carrier → silent
 * continue. A guard that misfires on its own bug is worse than no guard.
 *
 * Exempt (multi-owner by design, never warns): CLAUDE.md, settings*.json,
 * MEMORY.md, anything under state/shared/, knowledge/wiki/, .claude/.
 *
 * Knob: PRISM_SLOT_SIGNATURE_DISABLE=1 → unconditional silent continue.
 */
import fs from "node:fs";
import path from "node:path";

const CHAT_SLOTS = "H:/prism/state/shared/chat-slots.json";
const ALIVE_MS = 10 * 60 * 1000; // a slot is "alive" if heartbeat <10min — matches fleet stale threshold
const COMMENT_EXT = new Set([".ts", ".mjs", ".js", ".cjs", ".jsx", ".tsx", ".py", ".go", ".rs"]);
const CONT = () => process.stdout.write(JSON.stringify({ continue: true }));

/** Which carrier a path uses, or null if the type has no signature convention. */
export function detectCarrier(filePath) {
  if (typeof filePath !== "string" || !filePath) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".md") return "frontmatter";
  if (ext === ".json") return "sidecar";
  if (COMMENT_EXT.has(ext)) return "comment";
  return null;
}

/**
 * Multi-owner paths that legitimately get cross-slot edits constantly —
 * warning on these would be pure noise. Normalized forward-slash compare.
 */
export function isExemptPath(filePath) {
  if (typeof filePath !== "string") return true;
  const p = filePath.replace(/\\/g, "/").toLowerCase();
  const base = p.split("/").pop() || "";
  if (base === "claude.md" || base === "memory.md") return true;
  if (/^settings(\.local|\.[\w-]+)?\.json$/.test(base)) return true;
  if (p.includes("/state/shared/")) return true;
  if (p.includes("/knowledge/wiki/")) return true;
  if (p.includes("/.claude/")) return true;          // hooks/skills/commands are fleet-shared
  if (p.includes("/handoffs/")) return true;
  return false;
}

/**
 * Extract {slot,iso} from the file's signature, or null. Pure given injected
 * fs fns (testable). Reads only the file HEAD for comment/frontmatter, and the
 * sidecar for json. Any error → null (fail-open at the call site).
 */
export function parseSignature(filePath, readFileFn, existsFn) {
  const carrier = detectCarrier(filePath);
  if (!carrier) return null;
  try {
    if (carrier === "sidecar") {
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);
      const sidecar = path.join(dir, "." + base + ".slot");
      if (!existsFn(sidecar)) return null;
      const j = JSON.parse(readFileFn(sidecar));
      if (j && typeof j.slot === "string" && j.slot) return { slot: j.slot, iso: j.iso || "" };
      return null;
    }
    if (!existsFn(filePath)) return null;
    const head = String(readFileFn(filePath)).slice(0, 2048).replace(/\r\n/g, "\n");
    if (carrier === "comment") {
      const m = head.match(/^\s*\/\/\s*prism-slot:\s*([a-z]+)(?:\s+(\S+))?\s*$/im);
      if (m) return { slot: m[1].toLowerCase(), iso: m[2] || "" };
      return null;
    }
    // frontmatter: only inside a leading --- ... --- block
    const fm = head.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) return null;
    const m = fm[1].match(/^prism_slot:\s*([a-z]+)\s*$/im);
    if (m) return { slot: m[1].toLowerCase(), iso: "" };
    return null;
  } catch {
    return null;
  }
}

/** Set of slot names whose heartbeat is within ALIVE_MS. Empty on any error. */
export function aliveSlots(slotsJsonText, now = Date.now()) {
  const out = new Set();
  try {
    const data = JSON.parse(slotsJsonText);
    const slots = data && data.slots;
    if (!slots || typeof slots !== "object") return out;
    for (const [name, st] of Object.entries(slots)) {
      if (!st || typeof st !== "object") continue;
      const hb = Date.parse(st.lastHeartbeat || st.claimedAt || "");
      if (Number.isFinite(hb) && now - hb <= ALIVE_MS) out.add(name);
    }
  } catch { /* fail-open: empty set */ }
  return out;
}

/** Resolve this session's slot name from chat-slots by stable chatId. */
export function currentSlotFor(slotsJsonText, stableId) {
  if (!stableId) return null;
  try {
    const data = JSON.parse(slotsJsonText);
    const slots = (data && data.slots) || {};
    for (const [name, st] of Object.entries(slots)) {
      if (st && st.chatId === stableId) return name;
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * The decision. Returns a warning string to surface, or null for silent.
 * Warn ONLY when: signature exists, signing slot != current slot, signing
 * slot is still alive, and the path is not exempt. Every other branch silent.
 */
export function decideWarning({ sig, currentSlot, alive, filePath }) {
  if (!sig || !sig.slot) return null;                       // no signature
  if (isExemptPath(filePath)) return null;                  // multi-owner path
  if (currentSlot && sig.slot === currentSlot) return null; // own file
  if (!alive.has(sig.slot)) return null;                    // signer dead → pickup OK
  const who = currentSlot ? `slot '${currentSlot}'` : "an unslotted chat";
  return (
    `⚠ slot-signature: \`${path.basename(filePath)}\` is signed by slot ` +
    `'${sig.slot}'${sig.iso ? ` (${sig.iso})` : ""} which is still ALIVE — you are ${who}. ` +
    `This is ADVISORY (file-claim-guard owns the hard block). If this is an ` +
    `integration merge / conflict-fork / sanctioned pickup, proceed. Otherwise ` +
    `coordinate via the chat bus before editing to avoid a silent clobber.`
  );
}

function stableIdFromSession(sessionId) {
  if (typeof sessionId !== "string" || sessionId.length < 8) return null;
  return "claude-" + sessionId.slice(0, 8);
}

function readStdin() {
  return new Promise((resolve) => {
    let d = "";
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (c) => (d += c));
      process.stdin.on("end", () => resolve(d));
      setTimeout(() => resolve(d), 1500); // never hang the tool
    } catch { resolve(""); }
  });
}

async function main() {
  if (process.env.PRISM_SLOT_SIGNATURE_DISABLE === "1") return CONT();
  let input = {};
  try { input = JSON.parse(await readStdin()); } catch { return CONT(); }

  const tool = input.tool_name || "";
  if (!/^(?:Edit|Write|MultiEdit)$/.test(tool)) return CONT();

  const ti = input.tool_input || {};
  const filePath = ti.file_path || ti.filePath || ti.path || "";
  if (!filePath) return CONT();

  let slotsText = "";
  try { slotsText = fs.readFileSync(CHAT_SLOTS, "utf8"); } catch { return CONT(); } // fail-open

  const stableId = stableIdFromSession(input.session_id);
  const currentSlot = currentSlotFor(slotsText, stableId);
  const sig = parseSignature(filePath, (p) => fs.readFileSync(p, "utf8"), (p) => fs.existsSync(p));
  const warning = decideWarning({
    sig,
    currentSlot,
    alive: aliveSlots(slotsText),
    filePath,
  });

  if (!warning) return CONT();
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: warning },
  }));
}

const invokedDirectly = (() => {
  try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("/slot-signature-advisory.mjs"); }
  catch { return true; }
})();
if (invokedDirectly) { main().catch(() => { try { CONT(); } catch { /* nothing more */ } }); }
