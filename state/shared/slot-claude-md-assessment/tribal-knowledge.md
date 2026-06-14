# tribal-knowledge — fleet-managed

## Current state

**Size:** ~3,800 bytes / 85 lines (CLAUDE.md). MEMORY.md ~4,100 bytes / 110 lines.

**Quality grade: PARTIAL**

The file was auto-populated 2026-06-09 by `scripts/fill-galaxy-claudemd-domain.mjs` (Ollama distillation from PATHS/MEMORY/synthesis). It has real structure and several accurate pointers but has significant problems:

- **Wrong dispatcher name in MEMORY.md (propagated into CLAUDE.md context):** MEMORY.md §Key engines cites `prism_shop_practice` as the primary dispatcher for tribal actions — this is correct. BUT MEMORY.md also omits `prism_knowledge` (knowledgeDispatcher.ts:276 — `"prism_knowledge"`) which is a co-equal dispatcher for `tribal_search`, `tribal_enrich`, `tribal_capture`, `tribal_suggest`, `tribal_stats`. The CLAUDE.md §Key engines list includes `tribal_apply` and `tribal_apply_stats` under `prism_shop_practice` (correct, verified shopPracticeDispatcher.ts:143-144) but never mentions `prism_knowledge` at all — a critical omission.

- **CLAUDE.md §Key engines lists engine names from PATHS.md (auto-keyword-matched, 93 found) without verifying ownership.** The first 12 engines listed (`AIDeepKnowledgeIntegrationEngine`, `BoxKnowledgeIntegrationEngine`, `CADDrawingKnowledgeEngine`, etc.) are from PATHS.md's keyword-match pass which explicitly warns "verify ownership" and "prune false positives." These are not the core tribal engines — those are: `TribalKnowledgeEngine.ts`, `TribalKnowledgeAdvisorEngine.ts`, `TribalRAGEngine.ts`, `TribalEnrichmentCoordinatorEngine.ts`, `TribalPlaybookEnforcementEngine.ts` (all verified in MEMORY.md §Key engines against ENGINE_DIGEST.md).

- **`state/shared/tribal-embed-index.json` noted as ~200MB** — size is advisory/unverified (not re-checked here; MEMORY.md cites it as the rerank corpus and stop-rag-index-staleness-check.mjs:27 confirms the path).

- **TOOLBELT.md §This galaxy's dispatchers:** explicitly blank — `_(owning slot lists the domain's prism_* dispatcher actions here)_`. This is a critical gap for a fleet-managed galaxy with no owner to fill it.

- **Domain-mapping gap** (cited in both CLAUDE.md and MEMORY.md): `tribal-by-domain-inject DOMAIN_MAP` is missing speed-feed/database/business domains — this is a real known bug, not stale content. Accurate.

- **The `<!-- GALAXY-CLAUDEMD-FILL:BEGIN -->` block** contains Ollama-distilled text with advisory caveats that is mostly redundant with MEMORY.md. Token waste for a per-turn inject.

- **Cross-cutting methodology stanza** (lines 59-84) is a near-verbatim copy of the fleet-wide enrichment program doctrine — not tribal-specific. Token waste.

- **TOOLBELT.md** is almost entirely generic (shared patterns, blank dispatcher section, Karpathy 5-step) — provides zero tribal-specific tool-call patterns.

---

## KEEP

From CLAUDE.md:
- `## Scope` (lines 5-6) — accurate 4-sentence scope of what this galaxy owns.
- `## Cross-galaxy edges` (lines 8-9) — accurate symmetric edge list; load-bearing for routing.
- `## Related galaxies` (lines 11-13) — knowledge-conversion Lane-A edge is accurate and specific.
- `## Tribal pointers` (lines 41-45) — the 3 `knowledge/wiki/code-tribal/tribal-bc-*.md` paths are real and exist on disk.
- `## Test commands` (lines 47-50) — accurate; `npx vitest run` is the right command.
- `## Cross-refs` (line 57) — the `[[feedback_tribal_obsidian_viz_utilization_protocol]]` and `[[reference_tribal_by_domain_inject]]` pointers are real memory files.
- `<!-- AI-SYSTEMS-STATE:BEGIN -->` block (lines 71-78) — correctly points to the live state file and galaxy-reasoning-bridge; fleet-standard, keep.
- `## Critic + keep-working contract` (lines 81-85) — pointer-only, non-duplicative, keep.

From MEMORY.md (inform the ADD section but MEMORY.md stays as-is):
- §Key engines (the MEMORY.md version, not the CLAUDE.md copy) — verified against ENGINE_DIGEST.md.
- §Standing patterns / invariants — the 4 bullets are accurate, specific, load-bearing.
- §Known assets — data paths are verified (tribal-embed-index.json confirmed by stop-rag-index-staleness-check.mjs:27).

---

## DROP

From CLAUDE.md:
- `<!-- GALAXY-CLAUDEMD-FILL:BEGIN --> ... <!-- GALAXY-CLAUDEMD-FILL:END -->` block entirely (lines 14-52) — the §Domain knowledge prose is Ollama-advisory paraphrase of MEMORY.md; the §Key engines list is the wrong (PATHS.md keyword-matched) engine list; the §High-ROI domain memories duplicate MEMORY.md §High-ROI memories verbatim. Net: ~900 bytes of redundancy, zero unique load-bearing content.
- `## Cross-cutting methodology` stanza (lines 59-84 beginning "**PC-specs + Ollama.**") — this is word-for-word the fleet-wide GALAXY-ENRICHMENT-PROGRAM doctrine, not tribal-specific. Every galaxy has it. Pointer to `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` suffices.
- The `_Domain-knowledge core auto-populated 2026-06-09 ...` footer line — artifact of the generation script, not doctrine.

From TOOLBELT.md:
- The entire `## Shared token-lean patterns` section — this is generic fleet doctrine already in global CLAUDE.md and the GALAXY-ENRICHMENT-PROGRAM spec. Token waste in a per-turn context inject.
- `## This galaxy's dispatchers: _(owning slot lists...)_` placeholder — replace with real content (see ADD).
- `## Karpathy 5-step` — already in global CLAUDE.md; duplicate.

---

## ADD (domain-specific — the heart of this assessment)

### 1. Dispatcher quick-ref (verified)

**Primary dispatchers for tribal-knowledge work:**

`prism_shop_practice` (shopPracticeDispatcher.ts) — the canonical tip store:
- `tribal_search` / `tribal_add` / `tribal_get` / `tribal_list` / `tribal_categories`
- `tribal_enrich` (modes: `enrich` | `has_knowledge` | `tribal_only` | `playbook_only` | `controller_only`)
- `tribal_enrich_check` / `tribal_enrich_tips_only` / `tribal_enrich_playbook_only` / `tribal_enrich_controller_only`
- `tribal_apply` / `tribal_apply_stats`
- `tips_add` / `tips_get`
- `playbook_advise` / `playbook_sequence` / `playbook_setup` / `playbook_antipatterns` / `playbook_lookup` / `playbook_add_rule`
- `lathe_lora_tribal_augment` / `lathe_lora_tribal_find_tips` / `lathe_lora_tribal_aug_stats` / `lathe_lora_tribal_extract` / `lathe_lora_tribal_extract_batch` / `lathe_lora_tribal_extractor_stats`

`prism_knowledge` (knowledgeDispatcher.ts:276) — co-equal for knowledge-graph queries:
- `tribal_search` / `tribal_capture` / `tribal_suggest` / `tribal_stats` / `tribal_enrich`

**Cross-domain tribal actions (NOT in shopPractice — go to owning dispatcher):**
- `mill_tribal_add` → `prism_mill` (millDispatcher.ts:710)
- `pp_tribal_apply` → `prism_pp` (ppDispatcher.ts:827)
- `rag_tribal_search` → `prism_ml` (mlDispatcher.ts:452)

### 2. Core engines (verified against MEMORY.md / ENGINE_DIGEST.md)

The 8 engines a tribal-knowledge chat touches daily:
- `TribalKnowledgeEngine.ts` — tip store core; auto-categorization built in
- `TribalKnowledgeAdvisorEngine.ts` — manufacturing parameter advisor
- `TribalRAGEngine.ts` — RAG retrieval over tribal corpus (U-LEARN-04)
- `TribalEnrichmentCoordinatorEngine.ts` — single P2P entry to fetch enriched tribal
- `TribalPlaybookEnforcementEngine.ts` — validates machining params against playbook rules
- `TribalEvolutionEngine.ts` / `TribalExplanationEngine.ts` — lifecycle + human-readable explain
- `TribalKnowledgeOutcomeBridgeEngine.ts` — connects outcomes to tribal tips (XPROC-NEURAL-CONNECT-MS0/U-CN04)

Domain consumers (emit tips, consume from this galaxy):
- `CAMTribalKnowledgeEngine.ts` / `CAMTribalRAGEngine.ts` / `CAMTribalTipLinkerEngine.ts`
- `MillTribalKnowledgeEngine.ts` / `MillTribalInjectorEngine.ts`
- `LatheTribalInjectorEngine.ts` / `LatheLoRATribalAugmentationEngine.ts` / `LatheLoRATribalExtractorEngine.ts`
- `WEDMTribalRuntimeEngine.ts` / `WEDMTribalTipLearnerEngine.ts`
- `PostProcessorTribalKnowledgeIntegrationEngine.ts` (PP-TRIBAL-INT)

### 3. Pipeline scripts (verified on disk)

| Script | Purpose |
|--------|---------|
| `.claude/hooks/tribal-by-domain-inject.mjs` | UserPromptSubmit T2; infers slot domain, surfaces top-3 in-domain hits |
| `.claude/scripts/tribal-rerank.mjs` | Embeds query via nomic-embed-text; `--domain <mill\|lathe\|wedm\|cad\|cam\|backend-dev\|general>` doubles in-domain cosine |
| `scripts/promote-tribal-to-wiki.mjs` | Auto-promotes confidence≥90 tips to `knowledge/wiki/code-tribal/` |
| `scripts/embed-cited-tips-into-tribal-index.mjs` | Embeds cited tips into the rerank corpus |
| `scripts/embed-knowledge-store-into-tribal-index.mjs` | Embeds KnowledgeDB into corpus |
| `scripts/embed-wiki-into-tribal-index.mjs` | Embeds wiki entries into corpus |
| `scripts/prune-stale-tribal-entries.mjs` | Prunes stale corpus entries |
| `scripts/lib/tribal-index-lock.mjs` | O_EXCL lock adapter for safe RMW on tribal-embed-index.json |

State files:
- `state/shared/tribal-embed-index.json` — live rerank corpus (entries not here cannot auto-inject)
- `state/shared/tribal-citation-log.jsonl` — audit trail of every injection
- `data/knowledge/` (KnowledgeDB, 58 entries) — query via `prism_data:database_search`

### 4. Domain-specific safety / invariants

- **Confidence gate is non-negotiable:** tips below 90% confidence NEVER auto-promote to wiki and NEVER auto-inject. Gate lives in `promote-tribal-to-wiki.mjs`. Do not lower the threshold without explicit operator directive.
- **Atomic lock on tribal-embed-index.json:** five embedders share this file. Always acquire `scripts/lib/tribal-index-lock.mjs` (O_EXCL primitive) before any RMW. Do NOT use `system-graph-write-lock.mjs` — TOCTOU hazard. Source: `reference_alpha_tribal_index_race_2026_05_30.md`.
- **Domain injection is first-match-wins:** `tribal-by-domain-inject` resolves domain in order mill→lathe→wedm→cad→cam→general. `tribal-rerank --domain` only boosts in-domain score, never filters. A tip not in `tribal-embed-index.json` can never auto-inject — new tips require re-embed.
- **Never inline physics constants in tip records:** tip parameters touching machining physics (kc1.1, Taylor exponents, Kienzle coefficients) must reference `mcp-server/src/physics/constants.ts`, not bake values into tip text or JSON.
- **This galaxy is a shared substrate, not a leaf.** Every galaxy emits AND consumes tribal tips. Work here has fleet-wide blast radius — test cross-galaxy consumers (mill/lathe/wedm/cam/pp) after any schema or pipeline change.

### 5. Known bugs / open threads (from verified MEMORY.md)

- **DOMAIN_MAP gap:** `tribal-by-domain-inject` has no entry for `speed-feed`, `database-expansion`, or `business` domains — oscar/juliett/hotel slots never get tribal injection despite having tips in the embed index. This is an open P1 fix candidate.
- **Tribal↔training plumbing mostly exists but is unwired** for the print→mill-program path. `TribalKnowledgeTrainingEngine.ts` and `TribalKnowledgeOutcomeBridgeEngine.ts` exist but the end-to-end pipeline from tip-capture → LoRA training is not fully closed.

### 6. What NOT to do in this domain

- Do NOT call `prism_knowledge:tribal_search` and `prism_shop_practice:tribal_search` interchangeably without checking which corpus each reads — they may surface different result sets.
- Do NOT add tips directly to `tribal-embed-index.json` without going through an embedder script — raw JSON edits will corrupt cosine geometry.
- Do NOT skip the confidence gate when distilling shop-floor tips. All raw operator statements start unverified; use `/distill-tribal` → `tribal_add` → mark confidence; promotion to wiki is a separate step.
- Do NOT use the PATHS.md engine list (93 keyword-matched) as a verified ownership list — it explicitly warns "prune false positives." Use MEMORY.md §Key engines (verified against ENGINE_DIGEST.md) as the authoritative list.
- Do NOT run multiple embedders concurrently against `tribal-embed-index.json` without the O_EXCL lock — the race condition has been observed and documented.
- Do NOT treat tribal tips as immutable facts — they evolve as the fleet learns; `TribalEvolutionEngine.ts` owns that lifecycle.

### 7. Canonical corpus / resources

- **Primary internal corpus:** `state/shared/tribal-embed-index.json` (live rerank corpus) + `data/knowledge/` (KnowledgeDB 58 entries) + `knowledge/wiki/code-tribal/` (promoted tips)
- **JM Die tribal ground truth:** `H:/PRISM/JM DIE/TRIBAL + WIKI` (cited in PATHS.md critical-resource-roots as domain-relevant)
- **Wiki domain folder:** `knowledge/wiki/tribal-knowledge/` (4 entries per PATHS.md)
- **Synthesis brain:** `knowledge/memories/patterns/tribal-knowledge_synthesis.md`
- **Sample memories:** `knowledge/memories/_legacy-root/reference_tribal_by_domain_inject.md`, `reference_alpha_tribal_index_race_2026_05_30.md`, `reference_tribal_enrichment_engine_bug.md`
- **Skill:** `/distill-tribal` (shop-knowledge → structured tip); `/shop-knowledge`

---

## IDEAL SECTION OUTLINE

```
# tribal-knowledge — Domain CLAUDE.md

## Universal-core pointer            ← one line linking to H:/prism/CLAUDE.md
## Scope                             ← what this galaxy owns (4 sentences, keep current)
## No dedicated slot                 ← fleet/golf-managed; pipeline hygiene in golf
## Cross-galaxy edges                ← all symmetric edges (keep current + expand with verified list)
## Dispatcher quick-ref              ← prism_shop_practice actions + prism_knowledge tribal actions + cross-domain tribal actions (mill/pp/ml)
## Core engines                      ← 8 daily-use engines + domain consumer list
## Pipeline scripts & state files    ← tribal-rerank / tribal-by-domain-inject / embed scripts / lock / state paths
## Confidence & safety invariants    ← 90% gate / O_EXCL lock / first-match-wins / no-inline-constants / fleet blast-radius
## Known bugs                        ← DOMAIN_MAP gap / training plumbing gap (open P1s)
## What NOT to do                    ← 6-item explicit list
## Canonical corpus                  ← internal corpus paths + JM DIE tribal + wiki folder
## Test command                      ← npx vitest run (keep current)
## AI-systems fleet state pointer    ← keep current <!-- AI-SYSTEMS-STATE --> block
## Critic + keep-working pointer     ← keep current pointer block
```

---

## UNIVERSAL-CORE POINTER

The following rules must remain available to any chat operating in this galaxy but should NOT be duplicated here — reference `H:/prism/CLAUDE.md` (the universal core):

- **R1-R15** (Karpathy discipline + agent-era rules) — especially R8 (read before write), R9 (tests verify intent), R12 (fail loud), R15 (wire everywhere)
- **Scrutiny 3-of-3 gate** — `node .claude/scripts/scrutiny-3way.mjs` protocol
- **Per-chat handoff** — `per-agent-handoff.mjs write/read` + topic naming rules
- **Commit format** — `[SCOPE]/U-ID: title`
- **Units-first safety rail** — inch vs mm from source before any geometry work
- **No-stub enforcement** — `comprehensive-build-enforce` hook
- **Duplication guard** — `duplicationGuardEngine.mustCheckBeforeCreating()` before any new engine
- **Ollama fallback ladder** — Ollama → Sonnet subagent → Opus/higher
- **RTK prefix** on all bash commands

Implementation: galaxy CLAUDE.md opens with a single line:
```
> Universal rails: `H:/prism/CLAUDE.md` (R1-R15 · scrutiny gate · handoff · commit format · units-first · no-stub · dedup guard). This file = tribal-knowledge domain doctrine only.
```
