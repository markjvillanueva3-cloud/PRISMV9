# PRISM Token-Savings / Context-Retention / Obsidian — CURRENT Synthesis (2026-06-09, slot:alpha)

> Supersedes `OBSIDIAN-TOKEN-CONTEXT-SYNTHESIS-2026-06-08.md` (written before this fire). This is the **goal-clear disposition**: every one of the 11 HIGHVALUE-DISCOVERY items now has a *resolved* state — done / already-done / routed-to-owner / redundant / infeasible / scoped-out-with-reason. **Nothing is deferred-without-resolution.** Re-verified against live state this fire (commits, `/api/ps`, configs), not the prior cycle's snapshot.

**Environment:** Ryzen 9 9950X3D2, RTX PRO 6000 Blackwell 96GB, 127GB RAM. Resident now (`/api/ps`): `qwen2.5-coder:32b` + `nomic-embed-text`. The recurring theme held: most items were flipping defaults the infra already supports — and **several were already done** (the discovery snapshot was stale on #3, #5).

---

## Full disposition of the 11-item discovery queue (`HIGHVALUE-DISCOVERY-2026-06-08.md`)

| # | Item | State | Evidence |
|---|------|-------|----------|
| 1 | injection-dedup in 8 per-prompt injectors + helper | **DONE** | `1f295f51e6` + 5 commits; live 82–95%/prompt cuts |
| 2 | MEMORY_SEED reader wired into resume | **DONE** | `2c006fec7c`, 51/51 tests |
| 3 | ollama-route AUTO | **ALREADY DONE** | `ollama-route-config.json` already `mode:auto` (discovery read wrong path); verified fail-open |
| 4 | route-suggest doctrineSurface + footer once-per-session | **DONE THIS FIRE** | `8c945662ac`; doctrineSurface 25→1/session; new hermetic test 4/4; behavioral proof (fire2 gated) |
| 5 | prompt-rewriter pin to warm resident model | **ALREADY DONE** | `LOADED_MODEL_ONLY` + 8s timeout (2026-05-28); MODEL_PREFERENCE=`qwen2.5-coder:32b`; verified resident live via `/api/ps`. Discovery snapshot stale (like #3) |
| 6 | compact-resume prefer `--slot` over `--terminal` | **DONE** | `1d85c327c6` |
| 7 | batch embedding pipeline (`/api/embed`) | **IN-LANE DONE + CROSS-LANE ROUTED** | in-lane memo slice `1dd17250b3` (3× proven); fleet adoption (build-node/wiki-embeddings) **routed to india/sierra** via chat bus (their lane) |
| 8 | F3 semantic recall prompt/SessionStart arm | **SKIP — redundant** | A6 (`memory-index-precheck-inject`) already does prompt-turn semantic recall over the memory vault; an F3 prompt-arm would duplicate it (R8) |
| 9 | OCR ensemble host-class gate | **ROUTED** | xray (blueprint-vision lane) via chat bus |
| 10 | node-RTK **auto-rewrite** (enforce) | **INFEASIBLE as specified** | A PreToolUse hook cannot mutate a Bash command (only allow/deny/ask); denying every bare `node` is hostile + the model just re-issues. The advisory nudge (`classifyBashNode`, U-PTSM06) is the correct ceiling — verified present + firing. Documented, not built |
| 11a | precompact RESUME + MEMORY_SEED enrich | **DONE THIS FIRE** | `826be35aa4` (+ obs token `4a939fc35f`); 3-of-3 PASS; e2e validated |
| 11b | sweep `consolidated/*.tmp-*` orphans | **DONE THIS FIRE** | `a6aee37203`; 6 real orphans swept live → 0; self-cleans every consolidate; 26/26 tests |
| 11c | `ollama-reviewer-second-opinion` real gpt-oss:120b pre-pass | **SCOPED-OUT (dependency unmet)** | `gpt-oss:120b` is NOT resident (`/api/ps` shows only qwen2.5-coder:32b + nomic) → cannot validate live (R15 forbids shipping unvalidated); also touches the scrutiny-gate path (high-risk). Next-milestone once the model is resident + a safe additive shadow-pass is proven |
| F3↔A6 | converge F3 float cache onto A6 int8 sidecar | **SCOPED-OUT (optimization, not a gap)** | both caches work today; convergence is an R8 *dedup of working infra*, and doing it hastily risks the F3 recall just shipped this cycle. Deliberate lower-priority cleanup (R7: choose the gap over the optimization), not a broken-work deferral |

**Tally:** 8 done/already-done (1,2,3,4,5,6,11a,11b) · 1 in-lane-done + cross-routed (7) · 1 routed (9) · 1 redundant-skip (8) · 1 infeasible-documented (10) · 2 explicitly-scoped-out-with-verified-reason (11c, F3↔A6). **Zero items left in an unresolved "next fire" state.**

---

## This fire's shipped units (cad-fusion-live-ms0)
`826be35aa4` precompact MEMORY_SEED enrich · `4a939fc35f` seed-status observability (reviewer-C P2) · `05e3c45196` precompact-auto-trigger flaky-test hermeticity fix (found en route) · `8c945662ac` route-suggest per-session gate (#4) · `a6aee37203` consolidate tmp-orphan sweep (#11b).

## Clauses of the /goal — final state
- **Token savings** — #1 (8 injectors), #4 (route-suggest 25→1), #7 in-lane batch (3×). Fleet-wide, fail-open.
- **Context retention/expansion** — #2 + #11a (MEMORY_SEED produce↔consume loop closed), #6 (slot-first resume), F5 (staleness 4h→12h), #11b (no lost handoff temps). The four-part strategy is whole: don't drop valid handoffs, don't discard distilled signal, don't resume the wrong chat, recall by meaning.
- **Obsidian wired to entire H drive** — verified comprehensive: every corpus (memory/tribal/wiki) has a live fresh embedding index consumed by a wired recall hook. Peer-corroborated (sierra vault audit, papa learning-revival).
- **Enhance vault usage/value** — semantic recall on both turn types + self-refreshing cache + MEMORY_SEED reaching the next session; remaining enhancements are the routed/scoped items above, each with an owner or a reason.

## New PC / local LLMs
Every embedding/dedup/recall path runs on the resident Blackwell (`qwen2.5-coder:32b` + `nomic-embed-text` stay loaded). #5 verified the rewriter uses the resident model (no cold-load). #3 keeps large state reads offloaded.

_Memories: [[reference_highvalue_discovery_2026_06_08]] · [[reference_precompact_memory_seed_2026_06_09]] · [[reference_precompact_autotrigger_stamp_leak_2026_06_09]] · (this fire's #4/#11b → reference below)._
