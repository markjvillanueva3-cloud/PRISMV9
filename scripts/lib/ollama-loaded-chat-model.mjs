// tier: T4
// ollama-loaded-chat-model.mjs (slot:alpha 2026-06-19, TOKEN-EFFICIENCY-INJECT)
//
// Pick the best ALREADY-LOADED chat-capable Ollama model from an /api/ps model list, for
// hooks/scripts that must stay inside a tight wall-clock budget and therefore must NOT trigger
// a cold-load. This is DISTINCT from resolveSynthesisModel (host-aware-synthesis-model.mjs),
// which picks the best INSTALLED model (via the cost-router) and tolerates a ~minutes cold-load.
//
// WHY: prompt-rewriter-ollama.mjs#pickModel classified loaded models with an inline regex
// /chat|coder|llama|mistral|phi|gemma|qwen/i that (a) did NOT recognize the gpt-oss / deepseek
// text families -- so a loaded gpt-oss:120b (currently the warm model on the Blackwell host) was
// rejected as "no-model" and the rewriter silently died -- and (b) would WRONGLY return a
// VISION-language model (qwen2.5vl, qwen3-vl, llama3.2-vision all match /qwen/ or /llama/) for an
// /api/chat call, yielding a broken/garbage rewrite. This module recognizes the local text-gen
// families AND excludes vision/embedding models, and scans ALL loaded models (not just [0]).
//
// PURE: no I/O, no throw. The caller fetches /api/ps and injects the name list, so this is unit-
// testable against the real installed-model names without a GPU or Ollama.

// Text-generation (chat-capable) model families resident on the PRISM host. Kept broad on the
// family token (a version/size suffix never changes the family's chat-capability).
const CHAT_FAMILY_RE =
  /(?:coder|codestral|llama|mistral|mixtral|phi|gemma|qwen|gpt-oss|deepseek|command-?r|starcoder|\byi\b|granite)/i;
// NOTE (scrutiny P2, deferred): the bare community "chat" token (openchat/neural-chat) was
// intentionally NOT re-added -- a wildcard `chat` would re-admit a hypothetical `*-chat-vision`
// model. Add named families here if any get installed; under-recognition only costs an optional
// rewrite (raw prompt still reaches the model), never a broken prompt.

// Non-chat model classes that must NEVER be handed to /api/chat: vision-language models
// (the "vl"/"vision"/"llava"/"moondream" markers) and embedding/rerank models. Checked BEFORE
// CHAT_FAMILY_RE so a vision model whose family token also matches chat (qwen2.5vl -> "qwen",
// llama3.2-vision -> "llama") is still correctly excluded. Verified against the live 17-model
// install set in the companion test.
const NON_CHAT_RE =
  /(?:\dvl|-vl|\bvl\b|vision|llava|moondream|embed|nomic|rerank|\bbge\b)/i;

/**
 * True iff `name` is a local text-generation (chat) model -- a recognized chat family AND not a
 * vision/embedding model. Exclusion wins over inclusion.
 * @param {string} name
 * @returns {boolean}
 */
export function isChatCapable(name) {
  const n = String(name == null ? "" : name);
  if (!n) return false;
  if (NON_CHAT_RE.test(n)) return false;
  return CHAT_FAMILY_RE.test(n);
}

/**
 * Choose the best already-loaded chat-capable model.
 *   1. the first entry of `preference` (ordered, best-first) that is BOTH loaded AND chat-capable;
 *   2. (non-strict only) else the first loaded model that is chat-capable (vision/embed excluded);
 *   3. else null -- only non-chat (or in strict mode, only non-preferred) models are loaded, so the
 *      caller must skip (never cold-load here).
 *
 * `opts.strict` (default false) drops step 2. A quality-sensitive offload consumer (ask-ollama)
 * passes strict:true: if NO preference member is resident it returns null so the caller falls
 * through to its best-INSTALLED resolver and accepts a cold-load -- which is better than running a
 * heavy summarize/explain on whatever arbitrary (possibly tiny, e.g. a 1.5b coder) chat model
 * happens to be warm. A trivial-task consumer (the prompt rewriter) keeps strict:false: ANY loaded
 * chat model is good enough there and a cold-load is never worth it. Same exclusion-first capability
 * gate either way, so a vision model is never returned.
 * @param {string[]} loadedNames  model names from /api/ps (`name` or `model` field)
 * @param {string[]} [preference] caller's ordered best-first preference list
 * @param {{strict?: boolean}} [opts] strict:true skips the any-loaded-chat-model fallback (step 2)
 * @returns {string|null}
 */
export function pickLoadedChatModel(loadedNames, preference = [], opts = {}) {
  const strict = !!(opts && opts.strict);
  const loaded = (Array.isArray(loadedNames) ? loadedNames : []).filter(Boolean).map(String);
  if (!loaded.length) return null;
  const loadedSet = new Set(loaded);
  for (const want of Array.isArray(preference) ? preference : []) {
    if (loadedSet.has(want) && isChatCapable(want)) return want;
  }
  if (strict) return null;
  for (const n of loaded) {
    if (isChatCapable(n)) return n;
  }
  return null;
}
