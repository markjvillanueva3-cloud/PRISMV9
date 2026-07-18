# OLLAMA-VERIFIED-OFFLOAD -- design + build blueprint (slot:alpha, 2026-06-09)

Operator ask: "utilize loop and goal slash commands with ollama llm models for
specific tasks so they're auto-used for high-value tool calls with 100% accuracy
rates; find other ways to offload tasks to ollama for free token + context."

## THE CORE INSIGHT (the whole design rests on this)
Local LLMs are NOT 100% accurate generatively. You get 100% NET accuracy only by
wrapping the offload in CODE VERIFICATION + a fail-safe fallback. The model
proposes; code disposes. Auto-fire criterion:

> Auto-offload to Ollama ONLY tasks whose output is (a) deterministic, or (b)
> cheaply verifiable by code -- and fall back to Claude/raw on verify-fail.

The 100% comes from the verifier, not the model.

## R8 / DEDUP (do NOT rebuild these)
~20 ollama hooks already exist (ollama-route-pretooluse, ollama-prism-bridge,
ask-ollama.mjs modes viz/summarize/explain/triage/ask, ollama-nav-enforce,
ollama-reviewer-second-opinion, tribal-rerank embeddings, etc). The offload
*suggestion* layer is SATURATED + NON-CONVERTING (route-pretooluse fires thousands
of times at ~15% take). The gap is NOT more advisories -- it is VERIFIED
auto-EXECUTION. Build that, don't duplicate the nudges.

## NET-NEW ASSET: scripts/lib/ollama-verified-offload.mjs
A wrapper that makes auto-fire safe:
```
verifiedOffload({ task, run, verify, fallback, model }) ->
  { result, verified:boolean, fellBack:boolean, source:'ollama'|'fallback' }
```
- `run()` calls Ollama (via ask-ollama / the bridge -- reuse, don't reimplement the
  HTTP). `verify(out)` is a PURE code check (schema-validate / enum-membership /
  exit-code / existence / sha-anchor match). On verify-fail or ollama-unreachable
  -> `fallback()` (the real Claude/raw path). NEVER returns an unverified result as
  if trusted. Fail-safe: any throw -> fallback. Pure-core + injected runner so it
  is hermetically testable (R9).
- Coordinate model selection with bravo (ModelRoutingEngine / DEFAULT_MODEL, U3-U7);
  this helper takes `model` as a param, does not own routing.

## CONSUMERS (each with its 100%-verifier)
### /loop (loop-iteration-inject.mjs / loop-state.mjs)
1. **iteration-eval-narration** (reference consumer to build FIRST): qwen reads the
   git diff + test output -> "what changed + did eval pass?". VERIFIER: the test
   EXIT CODE is ground truth; qwen only narrates. Feeds loop rule 3.
2. **next-unit pick**: gpt-oss:20b ranks `loop-state.mjs next` candidates by goal-fit.
   VERIFIER: picks from a FIXED enum of real units (can't hallucinate; worst case a
   valid-but-suboptimal real unit).
3. **drift check**: "still on the loop's goal?" VERIFIER: advisory only.

### /goal (goal-prereq-inject.mjs)
4. **goal decomposition draft**: gpt-oss:120b -> 3-7 bounded units each w/ an eval gate.
   VERIFIER: Claude + duplicationGuard + roadmap review the DRAFT before executing.
5. **eval-gate proposal**: gpt-oss:120b -> a concrete test/metric per unit. VERIFIER:
   the eval is actually written + run; doesn't compile/run -> rejected.

### Broader free-token/context offloads
6. **large-Read digest** (unblock the built-but-low-converting route-pretooluse):
   emit a sha + LINE-ANCHORED digest so Claude can verify any claim against exact
   source lines (the Read stays the fallback). Verification is what unblocks trust.
7. **commit-message draft** from diff -> qwen; Claude 1-line-reviews (diff = truth).
8. **scrutiny pre-screen** -> gpt-oss:120b first-pass before the Claude 3-of-3
   (extends ollama-reviewer-second-opinion; advisory, 3-of-3 stays authoritative).
9. **chat-bus/handoff digest** -> qwen 3-line condense (advisory; wrong = re-read).
10. **classify-into-fixed-enum** (domain tag / intent) -> embeddings; 100% by
    construction (deterministic). Expand coverage.

## BUILD ORDER (logical, R13)
1. `scripts/lib/ollama-verified-offload.mjs` + `.test.mjs` (the core; R9 real tests:
   verified-pass, verify-fail->fallback, ollama-unreachable->fallback, throw->fallback).
2. Wire consumer #1 (iteration-eval-narration) as the reference consumer -- round-trip
   through the helper, prove the exit-code verifier on a real loop tick.
3. Then #6 (large-Read line-anchored digest) -- the highest free-token lever.
4. 3-of-3 scrutiny + doc-reflect (wiki [[ollama-verified-offload]] + memory).

## CONSTRAINTS
ASCII-only; reuse ask-ollama/bridge HTTP (don't reimplement); model selection
coordinates with bravo; fail-safe everywhere (a verify/offload fault must NEVER
break the host /loop|/goal|Read -- always fall back). Wiki source for the loop
rules these serve: [[agent-loop-design-rules]].
