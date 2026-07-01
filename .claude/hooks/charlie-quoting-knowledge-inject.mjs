#!/usr/bin/env node
// tier: T2
/**
 * charlie-quoting-knowledge-inject.mjs — UserPromptSubmit hook (slot:charlie galaxy).
 *
 * "Auto-invoke" half of the compiled quoting-knowledge feature (operator 2026-05-29:
 * "compile all relevant wiki and tribal knowledge for your domain — wired, validated, auto-invoked
 * when needed"). scripts/compile-quoting-knowledge.mjs produces the consolidated digest +
 * state/shared/quoting/quoting-knowledge-index.json; THIS hook keyword-matches each charlie prompt
 * against that index and surfaces the top-K relevant compiled wiki/tribal/memory entries — so the
 * domain knowledge fires automatically when relevant, without re-scanning the 38K-file wiki.
 *
 * GATING (charlie-only, fail-CLOSED): injects only when state/shared/chat-slots.json binds the
 * charlie slot to this session. "When needed": silent unless the prompt matches a quoting topic.
 *
 * FAIL-SOFT (R12): any read/parse error → exit 0, no injection. Never blocks a prompt.
 *
 * Knobs: PRISM_QUOTING_KNOWLEDGE_INJECT_DISABLE=1 (off) · PRISM_QUOTING_KNOWLEDGE_K=N (top-K, default 3)
 *        PRISM_QUOTING_KNOWLEDGE_FILE=<path> (index override).
 */
import { readFileSync } from "node:fs";
// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): session-keyed dedup. This
// block is keyword-VARIED (lower dedup value than the static injectors), but
// repeated/similar prompts re-injecting the identical hit-set still dedup. Fail-open.
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const INDEX_FILE = process.env.PRISM_QUOTING_KNOWLEDGE_FILE || `${PRISM}/state/shared/quoting/quoting-knowledge-index.json`;
const DATA_INDEX_FILE = process.env.PRISM_QUOTING_DATA_INDEX_FILE || `${PRISM}/state/shared/quoting/quoting-data-index.json`;
const TOP_K = Math.max(1, Math.min(8, parseInt(process.env.PRISM_QUOTING_KNOWLEDGE_K || "3", 10) || 3));

async function readStdin() {
  return await new Promise((resolve) => {
    let buf = "", done = false;
    const finish = () => { if (!done) { done = true; resolve(buf); } };
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (c) => { buf += c; if (buf.length > 1_000_000) finish(); });
      process.stdin.on("end", finish);
      process.stdin.on("error", finish);
      setTimeout(finish, 2000);
    } catch { finish(); }
  });
}

/** Is THIS session bound to the charlie slot? Fail-closed. Pure given inputs. */
export function isCharlieSession(sessionId, slotsText) {
  if (typeof sessionId !== "string" || sessionId.length < 8) return false;
  let doc;
  try { doc = JSON.parse(slotsText); } catch { return false; }
  const c = doc && doc.slots && doc.slots.charlie;
  if (!c || typeof c.chatId !== "string") return false;
  const me = "claude-" + sessionId.slice(0, 8);
  return c.chatId === me || c.chatId === sessionId || c.chatId === "claude-" + sessionId;
}

/** Tokenize a prompt into lowercase words length>=4 (the retrieval keys). Pure. */
export function tokenize(prompt) {
  if (typeof prompt !== "string") return [];
  return [...new Set(prompt.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4))];
}

/** Match prompt tokens to index entries; top-K by keyword-overlap score. Pure + defensive. */
export function matchEntries(promptTokens, index, k = TOP_K) {
  const toks = Array.isArray(promptTokens) ? promptTokens.map((t) => String(t).toLowerCase()) : [];
  const entries = index && Array.isArray(index.entries) ? index.entries : [];
  if (toks.length === 0 || entries.length === 0) return [];
  const scored = entries.map((e) => {
    const kws = Array.isArray(e.keywords) ? e.keywords : [];
    let score = 0;
    for (const kw of kws) for (const t of toks) if (t.includes(kw) || kw.includes(t)) score++;
    const titleToks = String(e.title || "").toLowerCase().split(/\W+/);
    for (const tt of titleToks) if (tt.length >= 4 && toks.includes(tt)) score += 0.5;
    return { e, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.max(1, k)).map((s) => s.e);
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } }));
}

async function main() {
  if (process.env.PRISM_QUOTING_KNOWLEDGE_INJECT_DISABLE === "1") return 0;
  const raw = await readStdin();
  let parsed;
  try { parsed = JSON.parse(raw || "{}"); } catch { return 0; }
  const sessionId = parsed.session_id || "";
  const prompt = parsed.prompt || "";
  let slotsText = "";
  try { slotsText = readFileSync(SLOTS_FILE, "utf8"); } catch { return 0; }
  if (!isCharlieSession(sessionId, slotsText)) return 0;

  // Merge compiled-knowledge entries + data-file entries (both share the {entries:[{...keywords}]}
  // schema) so the SAME prompt keyword-match surfaces relevant wiki/tribal AND data files.
  let entries = [];
  try { entries = (JSON.parse(readFileSync(INDEX_FILE, "utf8")).entries) || []; } catch { /* knowledge index optional */ }
  try { entries = entries.concat((JSON.parse(readFileSync(DATA_INDEX_FILE, "utf8")).entries) || []); } catch { /* data index optional */ }
  if (entries.length === 0) return 0;
  const totalEntries = entries.length;
  const hits = matchEntries(tokenize(prompt), { entries }, TOP_K);
  if (hits.length === 0) return 0; // "when needed" — silent if nothing relevant

  const lines = hits.map((e) => `- **${e.title}** (${e.source}) — ${e.summary}  \`${e.path}\``);
  emit(
    dedupedContext("charlie-quoting-knowledge",
      "## 📚 Quoting knowledge + data (compiled, auto-invoked — charlie galaxy)\n" +
        lines.join("\n") +
        `\n\n_Top ${hits.length} of ${totalEntries} compiled quoting knowledge+data entries, keyword-matched. Digests: \`QUOTING-KNOWLEDGE.md\` + \`QUOTING-DATA-INDEX.md\` · regen: \`node scripts/compile-quoting-knowledge.mjs && node scripts/index-quoting-data-files.mjs\`. Disable: \`PRISM_QUOTING_KNOWLEDGE_INJECT_DISABLE=1\`._`,
      sessionId)
  );
  return 0;
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("charlie-quoting-knowledge-inject.mjs");
if (invokedDirectly) {
  main().then((c) => process.exit(c || 0)).catch(() => process.exit(0));
}
