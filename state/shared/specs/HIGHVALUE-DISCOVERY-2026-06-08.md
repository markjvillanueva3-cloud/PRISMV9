# PRISM High-Value System-Improvement Build Queue — 2026-06-08 (slot:alpha)

> Discovery deliverable for the alpha `/goal` requirement (5): *"use ultracode / system-viz / PSN to find high-value system improvements utilizing the new PC specs, local LLMs, and current PRISM config."* Produced by ultracode workflow `wi5silr6x` (3 evidence-grounded lenses — token-savings, context-retention, local-LLM/Blackwell — + synthesis; 4 agents, ~1.0M subagent tokens, 50 repo tool-uses). Advisory build queue; each item human-verifiable before build.

**Meta-theme (spans all 3 lenses):** the infrastructure is built and firing, but **conservative defaults — suggest-not-act, no-dedup, single-not-batch, concurrency=4, Claude-only — were tuned for the OLD memory-pressured PC.** The Blackwell (RTX PRO 6000 96GB) + resident local LLMs + the proven `injection-dedup` lib invalidate those assumptions. **Most of this queue is flipping defaults the infrastructure already supports, not new builds.**

This session ALREADY shipped the pattern finding #1 says to replicate: `injection-dedup` adopted in `slot-soul-inject` + `slot-domain-awareness-inject` (`8cd8d615e9`), plus F3 semantic recall (`636d36bf59`/`75c44d8412`) and F5 autoresume (`c83ca9be64`).

---

## TIER 1 — ship first (S-effort, proven-pattern or one-flag, fleet-wide)

**1. Adopt `injection-dedup.mjs` in 9 per-slot domain injectors + `psn-leg-state-inject` (10 hooks).** Lens: token-savings. Evidence: `foxtrot-mill-awareness-inject.mjs`, `whiskey-lathe-context-inject.mjs`, `delta-cad-awareness-inject.mjs`, `xray-blueprint-domain-inject.mjs`, `echo-post-domain-inject.mjs`, charlie's two, `psn-leg-state-inject.mjs:507-574` — all import the lib **0 times**; pattern proven live in `slot-soul-inject.mjs:76-89`. Value: ~5–12K tok/slot/session. Effort: S (×10 clone-don't-fork). No deps. **Direct continuation of this session's U-SLOT-DOMAIN-DEDUP.**

**2. Wire MEMORY_SEED reader into resume — built producer, ZERO consumer.** Lens: context-retention. Evidence: `MEMORY_SEED` written by `handoff-memory-seed-stop.mjs` (+ `scripts/handoff-memory-seed.mjs`) but `grep -c MEMORY_SEED session-start-auto-resume.mjs → 0`. Every Stop distills error-events+memos+tribal learnings; resume discards 100%. Effort: S — add `extractMemorySeed()` mirroring `extractResume()` (`session-start-auto-resume.mjs:206`), bounded ~2KB block after RESUME (~line 558). No deps.

**3. ~~Flip `ollama-route-pretooluse` to AUTO~~ — ALREADY DONE (discovery was WRONG, corrected 2026-06-08 slot:alpha).** The canonical config `mcp-server/data/state/ollama-route-config.json` is **already `mode:"auto"`** (flipped 2026-05-22 sierra GPU-OFFLOAD-MAXIMIZE-MS0/U2; re-pointed to resident `qwen2.5-coder:32b` 2026-06-04 alpha after the 7b model was deleted). The discovery agent read the WRONG path (`state/shared/ollama-route-config.json`, which doesn't exist) → falsely concluded NUDGE-only. The "599 fired / 592 kept" is NOT suggest-mode — it's the **deliberately-conservative `isGistSafe()` allowlist** (`U-BW-AUTO-ROUTE-ALLOWLIST`, 2026-06-03) correctly gating reads so only genuinely gist-safe large state files get summary-substituted (source code, edit-targets, reportish files stay raw). **No action: the flag is already flipped.** The remaining lever — *widening* the gist-safe allowlist — is the exact risky change the author intentionally avoided (false-positive summaries of files needing full content); it needs per-extension validation, NOT a blanket widen. Verified fail-open live: ollama-down/model-bad/small-file/source-code all → raw Read.

**4. Gate `mcp-route-suggest` doctrineSurface + take-rate footer to once-per-session.** Lens: token-savings. Evidence: hook's own comments — take-rate ~0.4% (1/284), footer rides every fire, doctrineSurface rate-limit keyed per-(session,file) so each doctrine file re-fires. Value: 3–5K tok/session (audit/hook-editing sessions). Effort: S — widen rate-limit key to per-session + gate footer via `injection-dedup` (reuses #1). Depends on #1.

## TIER 2 — high value, S/M, some dependency/validation

**5. Pin `prompt-rewriter-ollama` to a warm resident Blackwell model** (silently no-op'ing — picks "smallest available" w/ 3s budget → cold-load = silent no-op). Use existing `scripts/lib/host-aware-synthesis-model.mjs`. S. Shares Blackwell-resident with #3.

**6. Fix compact-path resume: prefer `--slot` over `--terminal`** (`session-start-auto-resume.mjs:115`). On a fresh session id, `--terminal` falls through to family/global-latest (`per-agent-handoff.mjs:803/816`) → can resume a **random peer's handoff** (silent cross-contamination) + statSyncs all 921 handoffs (scan-storm). M. Sequence after #2 (same file). **This is the "F2" lead, refined.**

**7. Batch the embedding pipeline via `/api/embed` (array)** instead of per-prompt `/api/embeddings` (`build-node-embeddings.mjs:236` p-limit=4, `build-wiki-embeddings`, `build-memory-embeddings-sidecar`, `OllamaEmbedderEngine.ts:136`). batch=128 on Blackwell cuts ~3h → minutes; unblocks GNN reference-pool growth (the tier-5 blocker). M.

## TIER 3 — medium, M, broaden-existing-substrate

**8. Add UserPromptSubmit/SessionStart arm to F3b semantic recall** (currently Edit-only; `memory-relevance-inject.mjs:31-36,246`). Reading/planning/post-compact turns get zero semantic recall. Clone the F3b stage into a prompt-keyed arm. M. Compounds #7. **Direct extension of this session's F3.**

**9. Host-class-gate concurrency + keep N VLM families resident for OCR ensemble** (`build-node-embeddings` concurrency=4 tuned for old PC; `vision-ensemble-fuse.mjs` under-uses 96GB). Gate on `detectHostClass()===Blackwell`. M. Shares host-gate w/ #7.

**10. Add `node`/`node.exe` to the RTK auto-rewrite hook (enforce, not advise)** — `pre-tool-savings-multi.mjs:135` documents bare `node` ~9.6K tok/session uncaptured; advisories ignored (0.4–0.7% take). Extend the transparent rewrite. M.

## TIER 4 — hygiene / follow-ons

**11. (a)** Enrich precompact RESUME with MEMORY_SEED + real `--state` (`precompact-handoff.mjs:342,582` writes throwaway `--state`; depends on #2). **(b)** Sweep `consolidated/*.tmp-*` orphans (`handoff-consolidate.mjs:319,326`, 6 files 6–19d old) — S startup sweep. **(c)** Make `ollama-reviewer-second-opinion.mjs` a real gpt-oss:120b scrutiny pre-pass before the 3-Claude-agent gate (largest recurring Claude spend; additive/advisory, R12-safe; depends on #3/#5).

---

## Dependency-ordered execution path

```
#1 dedup-adopt-10-hooks       (S, no deps)   ← build the injection-dedup muscle (CONTINUES this session)
#2 memory-seed-reader         (S, no deps)
#3 ollama-auto-route-flip     (S, validate)  ← SINGLE BIGGEST LEVER (~3M tokens, 11%→30%)
#4 route-suggest-dedup        (S) reuses #1
#5 prompt-rewriter-pin        (S) reuses #3 resident-model
#6 compact-resume-slot-fix    (M) after #2 (same file)
#7 embed-batch-api            (M, no deps)
#8 semantic-recall-prompt-arm (M) compounds #7 (EXTENDS this session's F3)
#9 ocr-ensemble-host-gate     (M) shares host-gate w/ #7
#10 node-rtk-rewrite          (M, no deps)
#11 precompact+tmp-sweep+review (S/M) 11a→#2, 11c→#3/#5
```

**Cleanest first ship:** #1 (proven ×10, zero risk). **Biggest lever:** #3 (one flag). **R8 note carried from this session:** before building #8, converge F3 onto A6's existing int8 sidecar (`memory-embeddings-sidecar.json`) — see [[reference_memo_semantic_recall_f3_2026_06_08]].

_Provenance: ultracode workflow `wi5silr6x` (run wf_95cca8c5-500), 2026-06-08, slot:alpha. Full transcript under the session subagents/workflows dir._
