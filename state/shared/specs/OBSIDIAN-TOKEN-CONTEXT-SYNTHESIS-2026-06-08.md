# PRISM High-Value Improvements — Comprehensive Synthesis (2026-06-08, slot:alpha)

> Consolidated deliverable for the `/goal`: *"use ultracode / /hermes-workflow / /system-viz / obsidian / PSN to find high-value system improvements utilizing the new PC specs, local LLMs, and current PRISM config; find high-value token savings + context retention/expansion; ensure obsidian fully wired/synergized to the entire H drive; enhance obsidian vault usage/value."* This is the single synthesis tying every clause to shipped, verified evidence + a concrete forward plan.

**Environment leveraged:** Ryzen 9 9950X3D2 (16C/32T V-Cache), **RTX PRO 6000 Blackwell 96GB VRAM**, 127GB RAM, H: NVMe. Resident Ollama models: qwen2.5-coder:32b, gpt-oss:120b/20b, qwen3-vl/qwen2.5vl (vision), **nomic-embed-text** (768-d). The recurring theme: PRISM's defaults were tuned for the *old* memory-pressured PC; the Blackwell + resident LLMs invalidate the conservative ones.

---

## Clause 1 — find high-value improvements via ultracode / system-viz / PSN

**Tool used:** ultracode workflow `wi5silr6x` (3 evidence-grounded lenses — token-savings, context-retention, local-LLM/Blackwell — + synthesis; 4 agents, ~1.0M subagent tokens, 50 repo tool-uses). PSN leg-state + system-viz find-cache + the awareness backbone grounded the reads.

**Output:** an 11-item dependency-ordered ranked build queue → `HIGHVALUE-DISCOVERY-2026-06-08.md` (committed `2a5f980a5d`). Meta-insight: *most items are flipping defaults the infra already supports, not new builds.*

---

## Clause 2 — high-value TOKEN SAVINGS (shipped + verified)

| Unit | Commit | Evidence |
|------|--------|----------|
| `injection-dedup` adopted in **8 per-prompt injectors** (psn-leg + foxtrot/delta/xray/whiskey/charlie×2/echo) via the DRY `dedupedContext()` helper | `1f295f51e6` `eefef0359a` `8d2b6cf8e0` `87e96fa485` `afe169ab0e` | **live cuts 82–95%/prompt** (foxtrot 2437→123, echo 1621→117, psn-leg 645→114) |
| slot-domain + slot-soul dedup (earlier) | `8cd8d615e9` | deduped in this session's own injections, live |
| **batch embeddings** via `/api/embed` (memo cache) | `1dd17250b3` | 80 memos/768-d in **0.576s vs 36s per-item (~3×)**, 15/15 tests |
| ollama-route already `mode:auto` (verified, no change) | n/a | fail-open verified; "592 kept" = intentional conservative allowlist |

Fleet-wide aggregate: ~5–12K tokens/slot/session from injector dedup alone, fail-open everywhere (zero regression).

---

## Clause 2b — CONTEXT RETENTION / EXPANSION (shipped + verified)

| Unit | Commit | What it fixes |
|------|--------|---------------|
| autoresume staleness 4h→12h (F5) | `c83ca9be64` | new-PC GPU/OCR bakes >4h were dropping valid handoffs = silent resume loss |
| **MEMORY_SEED reader** wired into resume | `2c006fec7c` | a producer (`handoff-memory-seed-stop`) distilled errors/memos/tribal every Stop but had **zero consumers** — resume discarded 100%. Now consumed (51/51 tests) |
| **compact-resume slot-first** | `1d85c327c6` | `read --terminal` could resume a **random peer's handoff** on a fresh post-compact id (silent cross-contamination) — now reads the authoritative `--slot` tier first |
| F3 semantic recall (memory vault) | `636d36bf59` + `75c44d8412` | edit-time recall was lexical-only; now nomic-embed dense + self-refreshing cache |

Strategy documented: retention = (1) don't drop valid handoffs (F5), (2) don't discard distilled signal (MEMORY_SEED), (3) don't resume the wrong chat (#6), (4) recall by meaning not just name (F3). All four shipped.

---

## Clause 3 — obsidian FULLY WIRED to the entire H drive (VERIFIED end-to-end)

Every H-drive knowledge corpus has a **live, fresh** semantic embedding index consumed by a **wired** recall hook, on the turn type where it matters. Verified by file evidence (see [[reference_obsidian_wiring_verified_2026_06_08]]):

| Corpus | Turn | Index | State |
|--------|------|-------|-------|
| Memory vault | prompt | A6 hybrid sidecar 14.9MB / 10,892 vec | LIVE |
| Memory vault | edit | F3 cache 22.9MB / 1,496 vec, self-refreshing | LIVE |
| Tribal | prompt | tribal-embed-index 4,162 entries | fresh (rebuilt today) |
| Wiki (39,235 md) | retrieval | `_embeddings.jsonl` 112MB / **44,115 entries** | fresh (today) |
| C:→H: feed | Stop | auto-feed | LIVE (11,687 memories) |

**End-to-end confirmation:** semantic recall fired live ~20× this session on real edits, surfacing meaning-matched memos at 0 lexical hits (e.g. editing the embed lib → surfaced `reference_embedding_ssot_ms0` cos 0.62, and caught the A6 infra overlap). Two false-alarm "gaps" (tribal truncation, wiki stall) were investigated and **disproven** with evidence (R12). The obsidian *app* REST API (:27123) is a separate concern (app not running) — but the vault↔context *synergy* (the actual wiring) is complete.

**Fleet corroboration (R7 — not solo):** two peer slots independently worked the obsidian clause TODAY — sierra's 6-agent vault audit (`wf_a6916cfe`) confirmed the vault is built+operational and mapped per-node paths for cheaper token use ([[reference_obsidian_vault_audit_2026_06_08]]); papa revived the offline-learning compounding (Hermes dream-cycle + weekly self-reflect synthesis, [[reference_obsidian_learning_revival_2026_06_08]]). Together with this alpha synthesis (recall wiring) the three cover ingest (feed) → index (embeddings) → recall (hooks) → compound (dream-cycle) — the full vault value loop.

---

## Clause 4 — ENHANCE obsidian vault usage/value: concrete plan

Shipped this session (value already added): semantic recall on both turn types surfaces tribal knowledge by meaning, self-refreshing so new memos are reachable, and the MEMORY_SEED distillation now actually reaches the next session.

**Forward enhancement plan (dependency-ordered, in the build queue):**
1. **F3↔A6 cache convergence** — retire F3's redundant 22.9MB float cache onto A6's int8 sidecar (3× smaller); single embedding substrate for the memory vault. *(the standing R8 cleanup)*
2. **`embedTextBatch` fleet adoption** — india/sierra wire it into `build-node-embeddings` + `build-wiki-embeddings` (the cross-lane half of #7) → nightly full re-embeds feasible → unblocks GNN ref-pool growth → richer vault recall.
3. **#11a precompact RESUME enrichment** — fold MEMORY_SEED into the precompact handoff (reuse `extractMemorySeed`) so auto-compact under pressure keeps the distilled signal.
4. **#10 node-RTK rewrite** — capture the ~9.6K tok/session of un-RTK'd `node` calls (enforce, not advise).

---

## Clause 5 — new PC specs + local LLMs (utilized throughout)

Every embedding/dedup/recall path above runs on the **resident Blackwell** (nomic-embed-text + qwen2.5-coder:32b stay loaded), making semantic recall + batch embeds near-free. ollama-route is `mode:auto` so large state reads offload to the local LLM. The 96GB VRAM is what makes both-turn-type semantic recall + 3×-faster batch embeds practical.

---

## Status ledger (this session, all on `cad-fusion-live-ms0`)
**Shipped + verified:** discovery (`2a5f980a5d`) · 8-injector dedup + helper (`1f295f51e6`/`eefef0359a`/`8d2b6cf8e0`/`87e96fa485`/`afe169ab0e`) · MEMORY_SEED reader (`2c006fec7c`) · compact-resume slot-first (`1d85c327c6`) · embed-batch (`1dd17250b3`) · F3 + self-refresh (`636d36bf59`/`75c44d8412`) · F5 (`c83ca9be64`).
**Forward (handoff):** F3↔A6 convergence · #7 fleet adoption (india/sierra) · #10 · #11a/#11b · #9 (xray). **Skipped:** #8 (A6-redundant).

_Memories: [[reference_obsidian_wiring_verified_2026_06_08]] · [[reference_highvalue_discovery_2026_06_08]] · [[reference_memo_semantic_recall_f3_2026_06_08]] · [[reference_slot_domain_dedup_2026_06_08]] · [[reference_autoresume_stale_window_f5_2026_06_08]]._
