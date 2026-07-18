---
name: reference_scrutiny_risk_tier_2026_06_14
description: "Stop scrutiny gate is now risk-tiered (pure-docs diffs auto-skip the 2-of-2 reviewer gate) + the stale 3-of-3 remnants were aligned to the real 2-of-2 policy (a dead hasRecentScrutiny fallback was fixed). slot:india 2026-06-14."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.151Z
aliases: reference_scrutiny_risk_tier_2026_06_14
---


# Scrutiny gate risk-tiering + 2-of-2 drift fix (slot:india 2026-06-14)

Operator: *"fine tune our 3 review process. update and make it more logical and efficient. I think sometimes we run reviews when we really dont need to so we waste time and tokens."* Commit `10678a9ca2` on `slot/india` (`.claude/hooks/scrutinize-before-stop.mjs` + new test).

## What shipped
- **Risk-tier SKIP** in `scrutinize-before-stop.mjs` (the Stop gate, T0, MINIMAL_ALLOWLIST). New exported pure fns `isLowRiskFile(f)` + `isDocsOnlyDiff(files)`: a Stop is SKIPPED (continue + auditable `additionalContext` note, never silent) ONLY when EVERY meaningful changed file is **pure documentation** (`.md/.markdown/.txt/.rst`), excluding `.claude/` control-plane (`HIGH_RISK_PATH_RE`) and any `CLAUDE.md` doctrine (`DOCTRINE_BASENAME_RE`). Conservative default-deny allowlist; FAIL-SAFE (classifier throw / empty / non-array -> full review); disable with `PRISM_SCRUTINY_RISK_TIER=off`.
- **ALL structured data is reviewed** (`.json/.jsonl/.csv` — configs, registries, manifests, schemas, roadmap-index, and LoRA/RAG **training corpora** under `mcp-server/data/`). The first design treated data-under-data-roots as inert; the **code-analyzer reviewer caught that as a P1 false-skip** (a wrong-dim / schema-drift training jsonl could ship unreviewed — exactly india's bug class). Fix = remove the data tier entirely (docs-only). Strict-subset, mutation-proven (reintroducing the tier trips 6/6 tests).

## Doc-drift finding (real regression, fixed in the same commit)
The gate has been **2-of-2** (Claude reviewer A + B) since 2026-05-20 — `isCleared()` in `scrutiny-ledger.mjs:376-397` dropped Codex (arm C) to advisory. But `scrutinize-before-stop.mjs::hasRecentScrutiny` still `AND`ed `codexReviewed` into its `strict3of3` — and the 2-of-2 mark flow NEVER sets `codexReviewed` — so the **cross-ID clearance fallback was DEAD** (always false). On session-id drift the chat would re-block to the ceiling. Aligned to `strict2of2 = armBOk && opusReviewed` (mirrors `isCleared`). Also rewrote `buildBlockMessage` + the file header from the stale "3-of-3 / Codex required" to the real 2-of-2 (Codex/Ollama/analyst = advisory, non-blocking). The live "3 review process" = 2 blocking Claude reviewers + advisory Codex/Ollama/analyst arms — NOT 3-of-3.

## Verification
12/12 reference-path tests (`.claude/hooks/__tests__/scrutinize-before-stop.risktier.test.mjs`; adversarial: schema .json, `.claude` skill .md, doctrine CLAUDE.md, mixed docs+code, LoRA training jsonl, empty/null). Live-validated vs the working tree (15-file mixed diff -> `docsOnly=false`, will not skip). Adversarial 2-reviewer + 1 re-verify (A: FAIL on P1 -> fixed -> PASS; B: PASS). Recorded 2-of-2 ledger marks.

## Open follow-ups (NOT india's lane)
- **golf-only (root `H:/prism/CLAUDE.md`)**: risk-tier the **per-file 2-reviewer doctrine** (2 reviewers high-risk / 1 moderate fix / 0 docs-data), and correct the stale "3-of-3" prose in §SCRUTINY GATE + §PER-FILE SCRUTINY GATE to 2-of-2.
- Fleet propagation: lands for other slots on `slot/india` merge (single shared Stop gate).

[[reference_corpus_rag_pipeline_2026_06_13]] · [[feedback_always_update_wiki_on_bug_finding]]
