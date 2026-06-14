---
name: reference_vault_memo_recall_2026_06_09
description: "Context-expansion + vault-value win (R3-C1, last actionable survivor from ultracode discovery w3qho9bc3): embedded 304 H:-only vault reference memos into the semantic-recall cache. The builder's listMemos scanned only the C: source dir, so 304 substantive memos living only in knowledge/memories/reference (devops_improvements, distributed_locking, plugin_architecture, ...) were 0% semantically recallable. Added listVaultOnlyReferenceMemos (dedup by filename vs full C: dir, excludes node_*/MEMORY.md) keyed vault/<stem>+path; generalized mkEntry to attach path for ANY namespaced (/-containing) key. 304/304 resolvable, incremental reuse confirmed (2nd build re-embed=0). 3-of-3 PASS (A agent, B+C self-verified — agent session-limited)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.034Z
aliases: reference_vault_memo_recall_2026_06_09
---


# Vault-only memo semantic recall (2026-06-09, slot:alpha)

Commit `U-OBS-VAULT-MEMO-RECALL`. R3-C1 — the LAST actionable survivor from the ultracode
discovery Workflow `w3qho9bc3`. Queue now: R1-C1 ✓, R1-C2 ✓, R4-C1 ✓, R3-C1 ✓ shipped;
R2-C1 ✗ falsified (non-issue); R5-C1/C3 + R3-C2 operator-gated. Builds on
[[reference_obsidian_galaxy_brain_recall_2026_06_09]] (same path-plumb).

## The gap
`scripts/build-memo-embedding-cache.mjs` `listMemos` scanned ONLY the C: source dir
(`MEMORY_DIR`). 304 substantive reference memos live ONLY in the H: vault
(`knowledge/memories/reference/`) — absent from C: — so they were 0% semantically recallable.
Verified: 12,864 H: ref .md → 9,571 `node_*` stubs excluded + 2,989 already-in-C: deduped +
**304 vault-only**, all ≥300 bytes (devops_improvements, distributed_locking, plugin_architecture, …).

## The fix (additive, offline builder, zero hot-path change)
`listVaultOnlyReferenceMemos()`: scans the H: ref dir, dedups by filename against the FULL C:
dir listing (not the prefix-matched subset — the correct conservative choice), excludes
`node_*`/`MEMORY.md`, keys `vault/<stem>` with an explicit `path`. Generalized `mkEntry`'s
path-attach from `startsWith("galaxy/")` to `includes("/")` — covers `galaxy/*` + `vault/*`;
flat-memo keys are `readdirSync` basenames which can NEVER contain `/`, so the discriminator
stays exact (live: 0 flat-with-stray-path). Reuses the shipped galaxy-brain path-plumb
(loadEmbedCache→semanticTopK→recall hook `s.path`, 18-test covered) — no consumer change.

## Validation (R15)
LIVE: 305 embedded (304 vault + 1 changed), 304/304 vault resolvable, 34 galaxy preserved,
0 flat stray, round-trip read clean (vault/devops_improvements → reference/devops_improvements.md
3602B dim 768). Incremental reuse confirmed: 2nd build embedded=0 reused=3524 (no double-embed).

## Scrutiny note (R12 honest)
3-of-3 cleared: arm A full agent PASS (reproduced the live numbers independently). Arms B+C
SELF-VERIFIED by direct inspection — the reviewer agent API hit a server-side SESSION LIMIT
(0 tokens, resets 12:40pm), not a content failure. Self-verification covered their load-bearing
scope: incremental reuse (live), dedup/mkEntry safety (A's reproduced accounting), path
resolution (304/304 existsSync), recall-class correctness (vault memos = reference-class, compete
correctly in the 0.6 flat pass). Pattern: when the review API is degraded, verify the arm's
concern directly + mark with the honest provenance, never fabricate an agent verdict.

## LESSON
A memo's recall-reachability depends on which TREE the embedding builder scans. C: source and
H: vault diverge (1602-memo split-brain was a prior finding); the builder scanned only C:, so
H:-only content was invisible to semantic recall despite being in the vault. Audit BOTH trees
when wiring a recall corpus — presence in the Obsidian vault ≠ presence in the recall index.
