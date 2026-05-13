// tier: T3
/**
 * cad-token-vocabulary-guard.mjs — CADCAM-DAGI-MS0/U-DAGI01 guard hook
 *
 * PostToolUse(Write|Edit) hook that checks edits to the CAD token vocabulary
 * and the CADTokenRepresentationEngine for invariants required by the
 * neural-tokenization stack:
 *
 *   1. Vocabulary file must remain a well-formed JSON object with the expected
 *      top-level fields (schemaVersion, version, tokens[], categories{}).
 *   2. Every special token (PAD, BOS, EOS, SEP, MASK, UNK) must be present.
 *   3. Token array must be monotonic — id i at index i — so that
 *      tokenById() stays O(1) and stable across sessions.
 *   4. Size may only grow — shrinking the vocabulary would invalidate any
 *      previously-produced token sequence. Blocks shrink operations.
 *
 * Violations are emitted as HARD warnings via stderr + telemetry JSON; an
 * explicit EXIT 2 blocks the write only for invariant-breaking changes.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const VOCAB_REL = "mcp-server/src/data/cad-token-vocabulary.json";
const ENGINE_REL = "mcp-server/src/engines/CADTokenRepresentationEngine.ts";
const REQUIRED_SPECIALS = ["PAD", "BOS", "EOS", "SEP", "MASK", "UNK"];

function log(level, msg) {
  const line = `[cad-token-vocabulary-guard] ${level}: ${msg}`;
  (level === "ERROR" ? process.stderr : process.stdout).write(line + "\n");
}

function safeReadJson(abs) {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    return { __parseError: e.message };
  }
}

export default async function cadTokenVocabularyGuard({ tool, input, result }) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) return;
  if (result?.error) return;

  const target = input?.file_path || input?.path || "";
  if (!target) return;
  const normalized = target.replace(/\\/g, "/");

  const touchesVocab = normalized.endsWith(VOCAB_REL) || normalized.includes("cad-token-vocabulary.json");
  const touchesEngine = normalized.endsWith(ENGINE_REL) || normalized.includes("CADTokenRepresentationEngine.ts");
  if (!touchesVocab && !touchesEngine) return;

  const cwd = process.cwd();
  const vocabAbs = path.join(cwd, VOCAB_REL);
  const vocab = safeReadJson(vocabAbs);

  if (vocab.__parseError) {
    log("ERROR", `vocabulary JSON parse failed: ${vocab.__parseError}`);
    process.exitCode = 2;
    return;
  }

  const errors = [];
  if (typeof vocab.schemaVersion !== "number") errors.push("missing schemaVersion (number)");
  if (typeof vocab.version !== "string") errors.push("missing version (string)");
  if (!Array.isArray(vocab.tokens)) errors.push("tokens[] missing or not array");
  if (!vocab.categories || typeof vocab.categories !== "object") errors.push("categories{} missing");

  if (Array.isArray(vocab.tokens)) {
    const names = new Set(vocab.tokens.map((t) => t?.name));
    for (const sp of REQUIRED_SPECIALS) {
      if (!names.has(sp)) errors.push(`special token missing: ${sp}`);
    }

    vocab.tokens.forEach((t, i) => {
      if (!t || typeof t.id !== "number" || t.id !== i) {
        errors.push(`token at index ${i} violates monotonic id invariant (id=${t?.id})`);
      }
    });
  }

  // Shrink-guard: persist last known size in telemetry dir.
  const telemetryDir = path.join(cwd, "mcp-server/data/state");
  const sizeFile = path.join(telemetryDir, ".cad-token-vocab-size");
  try {
    const prev = fs.existsSync(sizeFile) ? parseInt(fs.readFileSync(sizeFile, "utf8"), 10) : 0;
    const curr = Array.isArray(vocab.tokens) ? vocab.tokens.length : 0;
    if (curr < prev) {
      errors.push(`vocabulary shrunk (${prev} -> ${curr}) — would invalidate existing token sequences`);
    }
    if (curr >= prev) fs.writeFileSync(sizeFile, String(curr));
  } catch {
    // telemetry write failure must not block the build
  }

  if (errors.length > 0) {
    for (const e of errors) log("ERROR", e);
    process.exitCode = 2;
    return;
  }

  log("INFO", `ok — ${vocab.tokens.length} tokens, all ${REQUIRED_SPECIALS.length} specials present`);
}
