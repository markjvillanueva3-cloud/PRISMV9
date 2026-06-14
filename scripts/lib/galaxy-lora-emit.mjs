/**
 * galaxy-lora-emit.mjs -- turn every grounded galaxy-bridge reasoning turn into a LoRA
 * instruction-tuning pair (AI-SYNERGY-AUDIT-MS0/U-AISYN-LORA-EMIT, slot:charlie).
 *
 * Synergizes RAG + reasoning + LoRA: a reasonForGalaxy() call already produces (question,
 * grounded RAG context, grounded answer) -- exactly an Alpaca {instruction, input, output}
 * training triple. Emitting these to the per-galaxy LoRA dataset makes the reasoning bridge
 * a SELF-IMPROVING training-data generator across all 34 galaxies: the more the fleet
 * reasons over its own context, the richer the next LoRA retrain's signal. This does NOT
 * train a model (that is a GPU job) -- it grows the dataset that a retrain consumes.
 *
 * Matches the existing Alpaca schema used by scripts/vault-to-lora-dataset.mjs
 * ({id, instruction, input, output, metadata}; advisoryOnly/mustHumanVerify). Reuses the
 * fleet's redact-secrets (R8) so no secret reaches the dataset. buildLoraPair/loraPairId are
 * PURE (testable); appendLoraPair is fail-soft, append-only, id-deduped I/O.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { redactSecrets } from "./redact-secrets.mjs";

const INPUT_MAX_CHARS = 1400;
const OUTPUT_MAX_CHARS = 2400;

function sha(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
}

/** Deterministic id for a (galaxy, question) pair so re-asking does not duplicate. PURE. */
export function loraPairId(galaxy, query) {
  const q = String(query == null ? "" : query).toLowerCase().replace(/\s+/g, " ").trim();
  return `bridge::${String(galaxy)}::${sha(q)}`;
}

/**
 * Build an Alpaca LoRA pair from a grounded bridge reasoning turn. PURE.
 * instruction = the question framed for THIS galaxy; input = the retrieved RAG grounding;
 * output = the grounded answer. Both input + output are secret-redacted and length-capped.
 * @param {object} d { galaxy, query, retrieved:[{source,heading,text}], answer, model, sources }
 * @returns {object|null} the Alpaca pair, or null if there is no usable answer
 */
export function buildLoraPair(d) {
  if (!d || typeof d.galaxy !== "string" || !d.galaxy.trim()) return null;
  const galaxy = d.galaxy.trim();
  const query = String(d.query == null ? "" : d.query).trim();
  const answer = String(d.answer == null ? "" : d.answer).trim();
  if (!query || !answer) return null;

  const retrieved = Array.isArray(d.retrieved) ? d.retrieved : [];
  const inputRaw = retrieved
    .map((r) => `[${r.source || "?"}${r.heading ? " # " + r.heading : ""}] ${String(r.text || "").replace(/\s+/g, " ").trim().slice(0, 220)}`)
    .join("\n")
    .slice(0, INPUT_MAX_CHARS);

  return {
    id: loraPairId(galaxy, query),
    instruction: `Answer this question about the PRISM ${galaxy} galaxy, grounded ONLY in the provided context: ${query}`,
    input: redactSecrets(inputRaw || "(no retrieved context)"),
    output: redactSecrets(answer.slice(0, OUTPUT_MAX_CHARS)),
    metadata: {
      galaxy,
      source: "galaxy-reasoning-bridge",
      model: d.model || null,
      groundingSources: Array.isArray(d.sources) ? d.sources : [],
      advisoryOnly: true,
      mustHumanVerify: true,
    },
  };
}

/**
 * Append a pair to a per-galaxy LoRA jsonl, id-deduped. Fail-soft: never throws; returns
 * true if written, false if a duplicate or on any error. Append-only (O_APPEND-safe single
 * line) so concurrent bridge calls across the fleet do not clobber each other.
 */
export function appendLoraPair(file, pair) {
  if (!pair || !pair.id) return false;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let existing = "";
    try {
      existing = fs.readFileSync(file, "utf8");
    } catch {
      /* new file */
    }
    if (existing.includes(`"id":"${pair.id}"`)) return false; // already present
    fs.appendFileSync(file, JSON.stringify(pair) + "\n");
    return true;
  } catch {
    return false;
  }
}
