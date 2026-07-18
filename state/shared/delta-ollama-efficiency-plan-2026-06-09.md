<!-- delta Ollama-efficiency plan — workflow wf_28042811-3c4, bounded-3, 4 lenses + synth, 2026-06-09 -->

I'll produce the operator-facing plan now. I have all four lens reports and have resolved disagreements in favor of the adversarial/safety lens (lens 4).

# Delta CAD — Ollama Local-LLM Efficiency Plan

**Slot:** delta (CAD galaxy) · **Date:** 2026-06-09 · **Standing directive:** `feedback_utilize_ollama_for_efficiency` · **Fleet offload rate now:** ~6.8% (target ≥30%) · **Posture:** default-deny on geometry; offload only mechanical text.

---

## 1. TL;DR — the 5 highest-ROI Ollama routings for delta

1. **Fix the dead archetype-labeler** — `cad-ollama-archetype-label.mjs:14` pins a RETIRED tag (`qwen2.5-coder:7b`); it silently no-ops and Claude hand-classifies instead. Repoint to `qwen2.5-coder:32b` via `resolveSynthesisModel()`. **~95% savings on every part Claude currently classifies.** (Drop-in, do this first.)
2. **Offload context-regain / transcript synthesis** — route each per-digest summarize to `ask-ollama.mjs summarize`, leave only the final fuse for Claude. **~85%** + dodges the rate-limit that killed workflow `wf_66199e81-28f`.
3. **Narrate print-vs-CAD compares locally** — pipe the deterministic compare JSON through `ask-ollama.mjs explain`; Claude keeps the PASS/FAIL judgment. **~70%** of the narration turn.
4. **Gloss wiki/tribal feature nodes via Ollama** — clone `summarize-all-scripts-via-ollama.mjs`; Ollama owns ≥70% of per-node prose (WIKI PROTOCOL). **~80%.**
5. **Route large CAD-doc/wiki reads to `/route-to-obsidian`** — any cad wiki/memory entry ≥500 lines summarized locally instead of read into context. **~3-10K tokens/read.**

> **All five are mechanical text ops. ZERO touch geometry, units, tolerances, fits, or collision margins** — those stay Claude-only (see §5).

---

## 2. Available local models (verified live `/api/tags` 2026-06-09)

| Model tag | Size | Best-for | Delta use |
|-----------|------|----------|-----------|
| `gpt-oss:120b` | 65.4 GB | Top synthesis/reasoning brain (120B MoE, ~134 tok/s) | Galaxy roll-ups, multi-digest fusion, large CAD-doc digests (`search_synthesis`→`best` tier) |
| `qwen2.5-coder:32b` | 19.9 GB | **DEFAULT floor** — explain/classify/validate/docstring | Archetype-label, code-explain, feature-node gloss, compare-narrate |
| `gpt-oss:20b` | 13.8 GB | Speed tier (~185 tok/s, fastest) | Fast classify/route, hook routing (grep_index/mcp_route) |
| `qwen3-vl:8b-instruct` | 6.1 GB | Vision OCR (instruct, no CoT) | Blueprint/print dimension **extraction** (read-only first pass) |
| `qwen3-vl:8b` | 6.1 GB | Vision + reasoning | OCR ensemble diversity |
| `qwen2.5vl:7b` | 6.0 GB | Vision OCR (the leading-dot/truncation fixes built against it) | OCR ensemble member |
| `llama3.2-vision:11b` | 7.8 GB | Larger vision family | OCR ensemble (≥2-agree consensus) |
| `moondream:1.8b` | 1.7 GB | Tiny fast vision (low ctx) | Quick image triage |
| `qwen2.5-coder:1.5b` | 1.0 GB | `cheap` tier | Trivial classify/format/inventory dump |
| `nomic-embed-text:latest` | 0.27 GB | Embeddings | CAD-RAG chunk embed (not generation) |

> **STALE-DOC FLAG (R12):** the wiki `local-llm-routing...md:18-19` and `/ollama-architecture-plan` still name `qwen2.5-coder:14b` + `deepseek-r1:14b` — **both deleted from this host.** Never target a 3b/7b/14b coder tag. Code routing is current; docs are not. **18 files in slot/delta still reference retired tags** — the cad one is delta-owned (item A1); the rest go to golf.

---

## 3. Reuse map — existing PRISM surfaces (DO NOT rebuild)

| Surface | How delta calls it |
|---------|-------------------|
| **`scripts/ask-ollama.mjs`** (primary lever) | `node scripts/ask-ollama.mjs {summarize\|explain\|triage\|ask} <file-or-query> [--json --synth]` — heavy input processed in subprocess, only compact answer returns |
| **`scripts/ollama-prism-bridge.mjs`** | `node scripts/ollama-prism-bridge.mjs "where is <X> computed in cad galaxy?" --trace` — multi-step "where/how" investigations at ~0 Claude tokens |
| **`scripts/lib/host-aware-synthesis-model.mjs`** | `import { resolveSynthesisModel }` → `resolveSynthesisModel({fallback:"qwen2.5-coder:32b"})`. **NEVER hardcode a tag — call this** (guarantees an installed model, fail-soft) |
| **`.claude/hooks/lib/ollama-cost-router.mjs`** | `import { routeModelForTask }` — the real "model-router" (the skill name has no command file; it resolves to this lib) |
| **`callLocalModel(model, prompt, opts)`** in `ask-ollama.mjs:510` | Use this (not raw `fetch`) — gives Docker-Models fallback for free |
| **`/route-to-obsidian` skill** | `node scripts/ask-ollama.mjs summarize knowledge/wiki/.../X.md --json` — large CAD wiki entries; auto-surfaced by `wiki-read-offload-advisory` PreToolUse |
| **`/ollama-*` skills (9)** + `/ask-local` + `/ollama-bridge` | `/ollama-explain <cad code>`, `/ask-local <file>`, `/ollama-bridge` |
| **`prism_dev:ollama_hook_query`** | MCP action → `OllamaHookBridgeEngine`, `hookType` ∈ {code_explain, pattern_match, validation, ...} |
| **`scripts/ollama-offload-dashboard.mjs`** | `node scripts/ollama-offload-dashboard.mjs [--json]` — telemetry; verify savings |
| **`scripts/lib/ollama-vision-extract-lib.mjs`** | Already `qwen3-vl:8b`; OCR extraction (item C5 needs a durable runner) |

> Nothing new needs building for Tier 1. The routing fabric exists and auto-fires (`ollama-pipeline-injector`, `ollama-task-offloader` are passive).

---

## 4. Routing plan by tier

### Tier 1 — route NOW (drop-in, existing surface)

| Delta task | Model | Invocation | ~Token savings | Guardrail |
|------------|-------|------------|----------------|-----------|
| **Code-explain** of delta `.mjs`/engine walkthroughs | `qwen2.5-coder:32b` | `/ollama-explain <file>` or `ask-ollama.mjs explain <file>` | ~90% | None needed (explaining has no correctness stake) |
| **Large CAD wiki/memory read** (≥500 lines) | `qwen2.5-coder:32b` | `/route-to-obsidian` → `ask-ollama.mjs summarize <md> --json` | 3-10K/read | Summary is reference-only, not a geometry source |
| **Build/test log diff-summary + error-triage** | `gpt-oss:20b` | `ask-ollama.mjs triage <build-dump>` (+ RTK already strips logs) | ~85% | None — pure classify |
| **Doc-reflection / digest** (CLAUDE.md, MEMORY.md, handoff drafts) | `qwen2.5-coder:32b` | `ask-ollama.mjs summarize <file>` | ~85% | Claude verifies "left" list is honest (R12), resolves contradictions |
| **Commit-message draft** from diff | `gpt-oss:20b` | `ask-ollama.mjs explain <diff>` | <1K but high-freq | Claude scans for over-claim (R12) before commit |
| **Tribal-tip extraction** from session text | `qwen2.5-coder:32b` | `ask-ollama.mjs ask` / `/ollama-extract` | ~75% | Claude reviews **safety-relevant** tips before they're trusted |
| **"Where/how does X wire" CAD-graph investigation** | `qwen2.5-coder:32b` | `ollama-prism-bridge.mjs "<q>" --trace` | ~0 Claude tokens | Read-only tools; verify wiring claim before acting |
| **Print-vs-CAD compare NARRATION** (after deterministic diff) | `qwen2.5-coder:32b` | `ask-ollama.mjs explain <compare.json>` | ~70% of turn | **Claude keeps PASS/FAIL gate** + "is this radius safety-relevant?" judgment |

### Tier 2 — small wire (build/wire, dependency-ordered)

**Order matters: A1 first (it's the cheapest and unblocks classification), then B-items.**

| # | What to wire | Dependency order | Acceptance test |
|---|-------------|------------------|-----------------|
| **A1** | `cad-ollama-archetype-label.mjs:14` — swap `OLLAMA_MODEL="qwen2.5-coder:7b"` → `resolveSynthesisModel({fallback:"qwen2.5-coder:32b"})`; replace raw `fetch` with `callLocalModel()` | **FIRST** (no deps) | Run on a known part; assert a non-empty archetype label returns (today it silently no-ops on the dead tag). ~95% savings/part. |
| **B3** | Per-node wiki/tribal **gloss** — clone `summarize-all-scripts-via-ollama.mjs`, feed feature records from `cad-feature-wiki-seed.mjs`/`cad-feature-vocabulary-expand.mjs` | after A1 (reuses callLocalModel path) | 115+ nodes glossed; spot-check 5 glosses read sensibly; Claude keeps cross-ref synthesis. ~80%. |
| **B2** | Add opt-in `--narrate` to `cad-corpus-print-compare.mjs` that shells `ask-ollama.mjs explain <result.json>` | after A1 | `--narrate` emits prose; PASS/FAIL still computed by the deterministic diff, NOT the narration. ~70%. |
| **B4** | Context-regain loop: `transcript-digest.mjs` output → `ask-ollama.mjs summarize` per digest, **≤3 concurrency**, Claude fuses summaries | after A1 | 26 digests summarized locally, no rate-limit; final briefing fused from ~26 short summaries. ~85%. |

### Tier 3 — defer / risky

- **C5 — Durable corpus OCR runner** over `ollama-vision-extract-lib.mjs` (resumable cursor, per-print stream-append per the `265e8a6e41` multipage fix). Biggest single lever (~99% of per-print OCR spend over JM's 7,794-drawing corpus) **but requires a build** (durable scheduled-task runner + resume cursor). The lib + multipage fix exist; the orchestration doesn't. **Defer until Tier 1-2 land.** When built: VLM output is **draft-only**, re-parsed by the hardened deterministic parser (leading-dot/`+`/truncation), never trusted raw.
- **Corpus bulk label/embed (#14/#15)** — Ollama-suitable but produces **weak labels** (size+name proxy). Fine as training-set bulk; **dangerous if any downstream gate treats them as ground truth.** Run as durable bg job only, never feeding a quality gate.
- **Feature recognition as second opinion (#7)** — *bounded* use only: Ollama proposes a label, accepted **only if it agrees** with `CADFeatureRecognitionEngine`; disagreement surfaces ambiguity to operator. Never the committer. Defer until the ensemble-corroboration wiring is built and tested.

---

## 5. RED LINES + GUARDRAILS (non-negotiable — adversarial lens governs)

### RED LINES — NEVER route to Ollama (no guardrail makes these safe)

An **Ollama-generated value is treated identically to an inline-hardcoded value** — which means the existing delta soul refuses + `stop_on_inlined_constants` + `units-guard` already forbid it.

1. **ISO 286 fit / tolerance deviation values** — table lookup, not judgment. Ollama plausibly hallucinates `0.018` for `0.025`. → `ToleranceDB.json` (260 entries) via `prism_data:database_search`. (Soul refuse: `inline-iso286-fit-values`.)
2. **STEP/IGES unit (inch/mm) disambiguation** — **25.4× scale error**. Units come from a deterministic token (`CONVERSION_BASED_UNIT 0.0254` / `SI_UNIT(.MILLI.,.METRE.)` / `G20`/`G21`) via `units-guard.mjs` (`requireUnits` THROWS on ambiguity). Never "infer units" with an LLM.
3. **BREP/B-Rep topology validation + geometric mutation** — formal properties (manifold-ness, Euler-Poincaré) verified by `CADKernelEngine`/`BRepTessellatorEngine`, never narrated.
4. **Collision / clearance margins feeding `prism_safety` S(x)** — "the one place where a wrong geometry constant becomes a machine crash" (§5#8). Delta tier S(x)≥0.98. Entire safety gate stays on Claude/deterministic code.
5. **Physics/material constants** in any margin-feeding geometry (kc1.1, E/I) — an Ollama-emitted value IS an inlined constant; `stop_on_inlined_constants.mjs` blocks it.
6. **GD&T/PMI tolerance VALUES** trusted as ground truth from a drawing — soul refuses *dropping* PMI; equally refuse *fabricating* it. (Soul refuse: `dropping-pmi-data-on-import`.)
7. **Feature-recognition DECISION that selects a CAM strategy** — auto-committing an Ollama label institutionalizes the silent fallback the soul refuses (`silent-feature-recognition-fallback`). Never auto-commit.

### GUARDRAILS — bounded use (verify-before-trust, never auto-trusted)

1. **OCR → candidate dimensions, read-only.** Every Ollama-extracted dim string is re-parsed by the hardened deterministic regex + checked against `units-guard` (and `ToleranceDB` if a fit code is present). The LLM produces *a string to verify*, never a trusted number. (The leading-dot/`+`/truncation regressions prove even deterministic parsers silently dropped whole prints — an LLM is *less* reliable, so it must round-trip through the hardened parser, never bypass it.)
2. **Confidence ≥0.85, fail-closed.** Any Ollama-assisted value below threshold is **discarded, not used** — surfaced for human confirm, never silently defaulted. No `confidence:0.5` stub-defaults reaching downstream. PMI reported as "N of M parsed", never heuristic-filled to 100%.
3. **All safety gates stay on Claude + code.** S(x), units-guard, collision margins, the 100% accuracy gate (`CADAccuracyValidatorEngine`) — Ollama is **pre-gate only**; it may enter as a labeled draft, never clear a gate.
4. **Feature recognition = ensemble second-opinion**, accepted only on agreement with the deterministic recognizer; disagreement surfaces ambiguity.
5. **Human-confirm** below threshold OR on any safety-relevant field (margin/fit/unit/S(x) input).
6. **Mechanical text ops only** — summarize/explain/docstring/classify/diff-summary/triage. **This is where the offload ratio grows — not on the geometry surface.**

---

## 6. Concrete first step

**Do item A1 — fix the silently-dead archetype labeler.** It is the only delta-owned cad script that calls an LLM, and it's pointed at a retired model tag, so it cold-fails to a no-op and Claude hand-classifies instead.

**File:** `H:/prism-slot-delta/scripts/cad-ollama-archetype-label.mjs:14`

**Change:**
- Replace the hardcoded `const OLLAMA_MODEL = "qwen2.5-coder:7b"` with a resolver call: `import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs"` then `const OLLAMA_MODEL = resolveSynthesisModel({ fallback: "qwen2.5-coder:32b" });`
- Swap the raw `/api/generate` `fetch` (lines 46-51) for `callLocalModel(OLLAMA_MODEL, prompt, {...})` imported from `ask-ollama.mjs` (gives Docker-Models fallback for free).

**Verify command:**
```bash
rtk node H:/prism-slot-delta/scripts/cad-ollama-archetype-label.mjs <a-known-part> && \
  node H:/prism/scripts/ollama-offload-dashboard.mjs --json
```
Assert: a non-empty archetype label returns (today it silently returns nothing on the dead tag), and the dashboard `offloaded` counter increments.

**Est. session-token savings:** archetype classification is ~95% offloadable and runs **per part** on every regen pass. For a typical multi-part delta session this restores the entire classification band (the largest mechanical-text burn delta currently keeps on Claude) — on the order of **a few hundred to ~2K Claude tokens per part classified**, recurring across the corpus, while the dead path costs Claude tokens for **zero** value today.

**Guardrail on A1:** archetype labeling is a *descriptive* classification, NOT a geometry-emit or parameter-selection decision — the actual parametric generation (EJOT loft radius, −0.003" electrode offset, archetype-match-before-scale) stays Claude-only per §5. A1 only restores the label string; it does not let Ollama choose geometry.