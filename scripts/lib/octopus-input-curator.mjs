// scripts/lib/octopus-input-curator.mjs
//
// U-HOC01 — octopus-input curator (pure-core).
//
// Before the octopus 7-voice fan-out fires, RAG-rerank the operator prompt
// against PSN substrate corpora (wiki + memories + tribal + skills) and
// return a shared-context markdown block to inject into EVERY voice's prompt.
// The 7 voices then disagree (or agree) over the same enriched substrate,
// not over their respective guesses about what's relevant.
//
// Pure-core: opts.rerank + opts.psnCorpora injected; caller passes a prompt
// and gets a string back. Caller is responsible for splicing the block into
// the voice prompt template + writing the record to the U-HOC02 ledger.
//
// Mirrors the renderPsnExemplars shape from skill-loop-pipeline.mjs (HRP02);
// both helpers could share a parent but the divergence in input shape
// (cluster vs raw prompt) + output formatting (skill stub vs octopus prompt)
// makes a copy-with-attribution simpler than a forced abstraction (3x rule
// not yet hit — DRY would be premature).

export const DEFAULT_TOP_K = 3;
export const DEFAULT_RERANK_FLOOR = 0.3;
export const CONTEXT_BLOCK_MAX_BYTES = 4096; // hard cap to keep voice-prompt overhead bounded

// Build the shared-context block. Returns "" when rerank/corpora absent
// (back-compat — callers can splice unconditionally).
//
// Inputs:
//   prompt: string — operator's question / directive going to the 7 voices.
//   opts.rerank: (query, candidates, topK) → [{candidate, score}]
//   opts.psnCorpora: { tribal?:string[], skills?:string[], wiki?:string[], memories?:string[] }
//   opts.topK: int (default 3)
//   opts.minScore: float (default 0.3 — RERANK_SCORE_FLOOR)
//   opts.label: string (default 'PSN context') — heading prefix
//
// Output: markdown block string OR "" if no rerank/corpora/usable hits.
export function buildSharedContext(prompt, opts = {}) {
  if (typeof prompt !== "string" || prompt.length === 0) return "";
  const rerank = typeof opts.rerank === "function" ? opts.rerank : null;
  const corpora = opts.psnCorpora && typeof opts.psnCorpora === "object" ? opts.psnCorpora : null;
  if (!rerank || !corpora) return "";
  const topK = Number.isFinite(opts.topK) && opts.topK > 0 ? Math.floor(opts.topK) : DEFAULT_TOP_K;
  const minScore = Number.isFinite(opts.minScore) ? opts.minScore : DEFAULT_RERANK_FLOOR;
  const label = typeof opts.label === "string" ? opts.label : "PSN context";

  const exemplars = collectExemplars({ prompt, rerank, corpora, topK, minScore });
  if (exemplars.legs.length === 0) return "";
  return formatContextBlock({ exemplars, label });
}

// Lower-level — returns structured exemplars instead of formatted markdown.
// Useful for the U-HOC02 ledger record (so psnExemplars field is a JSON object,
// not a stringified markdown blob).
export function collectExemplars({ prompt, rerank, corpora, topK = DEFAULT_TOP_K, minScore = DEFAULT_RERANK_FLOOR }) {
  const legs = [];
  const errors = [];
  for (const [legName, candidates] of Object.entries(corpora || {})) {
    if (!Array.isArray(candidates) || candidates.length === 0) continue;
    let results;
    try {
      results = rerank(prompt, candidates, topK);
    } catch (e) {
      errors.push({ leg: legName, error: e?.message || "rerank-error" });
      continue;
    }
    if (!Array.isArray(results) || results.length === 0) continue;
    const hits = [];
    for (const r of results) {
      const score = Number(r?.score);
      if (!Number.isFinite(score) || score < minScore) continue;
      const text = typeof r?.candidate === "string" ? r.candidate : String(r?.candidate ?? "");
      hits.push({ text, score });
    }
    if (hits.length > 0) legs.push({ name: legName, hits });
  }
  return { legs, errors };
}

function formatContextBlock({ exemplars, label }) {
  const lines = [`## ${label} (HOC01 — RAG-grounded substrate for this prompt)`];
  for (const leg of exemplars.legs) {
    lines.push(`\n### Leg: ${leg.name}`);
    for (const h of leg.hits) {
      lines.push(`- (rerank=${h.score.toFixed(2)}) ${h.text.slice(0, 240)}`);
    }
  }
  for (const e of exemplars.errors || []) {
    lines.push(`\n_(leg ${e.leg} — rerank-error: ${e.error}; voices will not see this leg's exemplars)_`);
  }
  const out = lines.join("\n") + "\n";
  if (out.length <= CONTEXT_BLOCK_MAX_BYTES) return out;
  return out.slice(0, CONTEXT_BLOCK_MAX_BYTES - 64) + "\n…(context truncated at " + CONTEXT_BLOCK_MAX_BYTES + " bytes)\n";
}

// Splice helper: insert the shared-context block into a voice prompt template.
// Convention: the block lands BEFORE the user-prompt content so voices see
// substrate first, prompt second. Idempotent — calling twice is a no-op.
export function spliceIntoVoicePrompt(voicePromptTemplate, sharedContextBlock) {
  if (typeof voicePromptTemplate !== "string") return voicePromptTemplate;
  if (typeof sharedContextBlock !== "string" || sharedContextBlock.length === 0) return voicePromptTemplate;
  if (voicePromptTemplate.includes(sharedContextBlock)) return voicePromptTemplate; // idempotent
  return sharedContextBlock + "\n" + voicePromptTemplate;
}
