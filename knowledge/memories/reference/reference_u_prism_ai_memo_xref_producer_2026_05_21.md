---
name: reference_u_prism_ai_memo_xref_producer_2026_05_21
description: 2026-05-21 echo /loop iter 13. PRISM-AI engine <-> memo cross-reference audit producer; 7 engines x 863 memos walked; 42.9% strict coverage; 4 blind-spot engines. Producer-only ship — consumer + viz deferred to iter 14 + 15 (mirrors iter-7 wiki-tribal pattern). Commit 70097b964d.
aliases: reference_u_prism_ai_memo_xref_producer_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.018Z
---


# U-GOAL-SYNERGY-AI-MEMO-XREF-PRODUCER — substrate-13 producer

**Commit:** `70097b964d` (cad-fusion-live-ms0, slot:echo)
**Loop state:** iter 13/20 of `/goal synergize ...` loop, status=ok

## What it does

New substrate for the /goal synergy loop: **which PRISM AI engines are referenced in the operator's memory vault?** Engines with zero memo coverage are knowledge-vault blind spots — no notes about that engine's decisions, failure modes, or invocation patterns.

The producer walks:
- `mcp-server/src/engines/PRISM*Engine.ts` (7 files: SelfAwareness, CreativeReasoning, NeuralKnowledgeSynthesis, UnifiedOrchestrator, LoRAAdapter, VerificationPlugin, ContextInjector)
- `knowledge/memories/**/*.md` (863 memos)

For each engine, reports BOTH a strict match count (full class name `PRISMCreativeReasoningEngine`) AND a lenient case-folded stem match count (`CreativeReasoning` lowercased). Both signals are exposed because they answer different operator questions — strict = "explicit class reference", lenient = "any topical mention".

## First run numbers

```
engines=7 memos=863 missing=4 coverage=42.9%
  PRISMContextInjectorEngine: strict=1 lenient=1
  PRISMCreativeReasoningEngine: strict=0 lenient=3
  PRISMLoRAAdapterEngine: strict=0 lenient=0
  PRISMNeuralKnowledgeSynthesisEngine: strict=0 lenient=0
  PRISMSelfAwarenessEngine: strict=6 lenient=13
  PRISMUnifiedOrchestratorEngine: strict=1 lenient=1
  PRISMVerificationPluginEngine: strict=0 lenient=0
```

**3 of 7 engines have strict memo references; 4 are blind spots.** SelfAwareness is the operator's mental model anchor (6/13 — heaviest cited engine in vault); LoRAAdapter + NeuralKnowledgeSynthesis + VerificationPlugin have **zero references at any level** — true vault blind spots. CreativeReasoning has 3 lenient mentions but no explicit class reference, suggesting the operator thinks about it topically but doesn't cite the API directly.

## Producer-only ship (deferred consumer + viz)

This is producer-only by design — same pattern as iter-7's wiki-tribal producer (consumer shipped in iter-8, viz in iter-9). Iter 14 will add the SessionStart digest; iter 15 will add the `/system-viz` roost and register the substrate in iter-12's `SUBSTRATE_TO_ROOST` so the meta-roost (`ghost.substrate_health`) compounds it automatically without graph-schema work.

Schema deliberately mirrors iter-7 + iter-10 audit shape so future consumer/viz can splice without contract drift:

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "...",
  "stats": { "engineCount": 7, "memoCount": 863, "missing": 4, "coverage": 0.4286 },
  "engines": [{ "name": "...", "strictCount": N, "lenientCount": M, "sampleMemos": [...] }],
  "missingFromMemos": ["PRISMLoRAAdapterEngine", ...]
}
```

## Files

- `scripts/prism-ai-memo-cross-ref-audit.mjs` (new, ~210 LOC)
- `scripts/prism-ai-memo-cross-ref-audit.test.mjs` (new, **18 tests PASS** incl 73s real-data E2E)

## P1 lessons compounded forward (all absorbed at construction)

| Lesson | Origin | How applied here |
|---|---|---|
| Path normalization with forward slashes | iter-7 | `path.relative(root, full).replace(/\\/g, "/")` for cross-machine stable memo paths |
| Empty-stem guard | (new this iter) | `lenientNeedle.length > 0` check — without it, a hypothetical `PRISMEngine` input would strip to `""` and match every memo via empty-substring |
| Case-normalization hazard | iter-11 | strict = case-sensitive class match; lenient = explicit `.toLowerCase()` on BOTH needle and haystack — no kebab/camel-case drift |
| Sample cap + missing cap | iter-6/9 | `SAMPLE_MEMO_CAP = 5`, `MAX_MISSING = 50` as named constants |
| Fail-soft on null/missing | iter-7 / iter-9 / iter-11 | every pure function returns empty audit shape rather than throwing |
| Deterministic output | iter-7 / iter-10 | engines sorted asc; missingFromMemos preserves engine input order |

## Test surprise → real-data validation

One test caught me: `r.lenient = 2` (not 3) because the lenient counter increments **once per memo containing the stem**, not once per occurrence within a memo. My initial expectation was wrong; the implementation was correct. Fixed the test to assert the correct semantics + documented it in a code comment. Caught the misconception on first run — exactly the kind of latent-mismatch bug per-iter scrutiny is supposed to catch.

## Next-session pickup

- **Iter 14** — SessionStart consumer for `state/shared/.prism-ai-memo-cross-ref-audit.json` (mirror iter-8's wiki-tribal-coverage-inject.mjs shape)
- **Iter 15** — `/system-viz` roost + register `aiMemoXref` in `SUBSTRATE_TO_ROOST` (mirror iter-9's generate-wiki-tribal-features.mjs)
- **Iter 16** — NN/GNN feedback consumer (coordinate with `claude-dbba2d72` lane first via chat-bus)
- **Iter 17** — handoff hygiene cross-check (memory → wiki backlink completeness, inverse of iter-7)
