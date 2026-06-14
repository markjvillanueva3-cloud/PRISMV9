# tribal-knowledge Galaxy — fleet-managed (no dedicated slot; golf owns pipeline hygiene)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = tribal-knowledge domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** operator tribal knowledge store — tip capture, embedding, rerank, domain injection, confidence-gating, wiki promotion, playbook enforcement. Fleet-level substrate: every galaxy emits AND consumes tribal tips through this galaxy's engines and dispatchers.

**EXCLUDES:** knowledge-conversion Lane-A routing logic (→ `engines/knowledge-conversion/`); academy curriculum content (→ `engines/academy/`); raw PDF/corpus storage (→ `engines/corpus-aggregation/`); mill/lathe/wedm/CAM domain physics — those galaxies OWN their tip content, this galaxy owns the *store + pipeline*.

**No dedicated slot.** Any slot may contribute; `golf` owns pipeline hygiene (embed-index health, confidence-gate audits, `DOMAIN_MAP` gap fixes). Claim work via `/pick-unit + heartbeat`; commits route to the contributing slot's worktree.

---

## §2 — Verified engines

No local `.ts` files live under `mcp-server/src/engines/tribal-knowledge/` (directory contains only galaxy-metadata files: CLAUDE.md, MEMORY.md, PATHS.md, SOUL.md, TOOLBELT.md, AWARENESS.md). All tribal engine code lives in `mcp-server/src/engines/` at the flat root level.

| Role | Engine file (verified via grep class definition) |
|------|--------------------------------------------------|
| Core tip store | `TribalKnowledgeEngine.ts` |
| Manufacturing parameter advisor | `TribalKnowledgeAdvisorEngine.ts` |
| RAG retrieval over tribal corpus | `TribalRAGEngine.ts` |
| Single P2P enrichment entry point | `TribalEnrichmentCoordinatorEngine.ts` |
| Validates params against playbook rules | `TribalPlaybookEnforcementEngine.ts` |
| Tip lifecycle (evolution over time) | `TribalEvolutionEngine.ts` |
| Human-readable tip explanation | `TribalExplanationEngine.ts` |
| Outcome→tip bridge (XPROC-NEURAL-CONNECT-MS0) | `TribalKnowledgeOutcomeBridgeEngine.ts` |
| Tip→LoRA training feed | `TribalKnowledgeTrainingEngine.ts` |

**Domain consumer engines (emit tips INTO this galaxy, verified):**
`CAMTribalKnowledgeEngine.ts` · `CAMTribalRAGEngine.ts` · `CAMTribalTipLinkerEngine.ts`
`MillTribalKnowledgeEngine.ts` · `MillTribalInjectorEngine.ts` · `MillTribalIntegrationEngine.ts`
`LatheTribalInjectorEngine.ts` · `LatheTribalIntegrationEngine.ts`
`WEDMTribalRuntimeEngine.ts` · `WEDMTribalTipLearnerEngine.ts`
`PostProcessorTribalKnowledgeIntegrationEngine.ts`

---

## §3 — Dispatcher quick-ref

**Primary: `prism_shop_practice`** (`shopPracticeDispatcher.ts` — verified line refs below)

| Action | Use |
|--------|-----|
| `tribal_search` | Search tips by keyword, material, operation, category |
| `tribal_add` | Capture a new tip (persists immediately) |
| `tribal_enrich` | Full enriched fetch; modes: `enrich` \| `has_knowledge` \| `tribal_only` \| `playbook_only` \| `controller_only` |
| `tribal_enrich_check` / `tribal_enrich_tips_only` / `tribal_enrich_playbook_only` / `tribal_enrich_controller_only` | Targeted enrich modes |
| `tribal_apply` / `tribal_apply_stats` | Apply tips to program + stats |
| `tips_add` / `tips_get` | Material-level tip store |
| `playbook_advise` / `playbook_sequence` / `playbook_setup` / `playbook_add_rule` / `playbook_antipatterns` / `playbook_lookup` | Playbook rules surface |
| `lathe_lora_tribal_augment` / `lathe_lora_tribal_find_tips` / `lathe_lora_tribal_extract` / `lathe_lora_tribal_extract_batch` / `lathe_lora_tribal_aug_stats` / `lathe_lora_tribal_extractor_stats` | LoRA tribal augmentation |

**Co-equal: `prism_knowledge`** (`knowledgeDispatcher.ts:173` — verified):
`tribal_search` · `tribal_capture` · `tribal_suggest` · `tribal_stats` · `tribal_enrich`

**Cross-domain tribal actions (verified — go to OWNING dispatcher):**
- `mill_tribal_add` → `prism_mill` (millDispatcher.ts:710)
- `pp_tribal_apply` → `prism_pp` (ppDispatcher.ts:827)
- `rag_tribal_search` → `prism_ml` (mlDispatcher.ts:452)

**MCP-down fallback:** `node scripts/distill-tribal.mjs` · `node scripts/promote-tribal-to-wiki.mjs`

---

## §4 — Canonical constants + data paths

**NEVER inline physics constants in tip records.** Tip text/JSON referencing machining physics (kc1.1, Taylor exponents, Kienzle coefficients) MUST cite `mcp-server/src/physics/constants.ts`, not bake values into the tip body.

| Store | Path | Rule |
|-------|------|------|
| Live rerank corpus (sharded) | `state/shared/tribal-embed-index.shard-*.json` + manifest | NEVER full-read; query via dispatcher. Tips absent from index cannot auto-inject. |
| Citation audit trail | `state/shared/tribal-citation-log.jsonl` | Append-only via embedder scripts |
| KnowledgeDB | `mcp-server/data/knowledge/` (58 entries) | Query via `prism_data:database_search` |
| Promoted tips | `knowledge/wiki/code-tribal/` | Written ONLY by `promote-tribal-to-wiki.mjs` (confidence ≥ 90%) |
| O_EXCL lock adapter | `scripts/lib/tribal-index-lock.mjs` | MUST acquire before any RMW on embed index |

---

## §5 — Domain gotchas / safety rails

1. **Confidence gate is non-negotiable.** Tips below 90% confidence NEVER auto-promote to wiki and NEVER auto-inject. Gate lives in `promote-tribal-to-wiki.mjs`. Do not lower this threshold without explicit operator directive.
2. **Atomic lock — five embedders share the index.** Always acquire `scripts/lib/tribal-index-lock.mjs` (O_EXCL) before any RMW on `tribal-embed-index.*`. Do NOT use `system-graph-write-lock.mjs` — TOCTOU hazard. Incident documented: `reference_alpha_tribal_index_race_2026_05_30.md`.
3. **Domain injection is first-match-wins.** `tribal-by-domain-inject` resolves domain in order mill→lathe→wedm→cad→cam→general. A tip absent from the embed index CANNOT auto-inject — new tips require re-embed via the appropriate `scripts/embed-*-into-tribal-index.mjs`.
4. **`prism_knowledge` vs `prism_shop_practice` — NOT interchangeable.** These read different underlying corpora for `tribal_search`; results may differ. Check which corpus the caller expects.
5. **Fleet blast-radius.** This galaxy is a shared substrate. A schema or pipeline change here cascades to mill/lathe/wedm/cam/pp consumers. Run cross-galaxy consumer tests after any schema or pipeline change.
6. **DOMAIN_MAP gap (open P1).** `tribal-by-domain-inject` has no entry for `speed-feed`, `database-expansion`, or `business` domains — oscar/juliett/hotel slots never receive tribal injection despite having tips in the index.

---

## §6 — What NOT to do

- NEVER write directly to `knowledge/tribal/*.md` or `knowledge/wiki/code-tribal/*.md` — use `prism_knowledge:tribal_capture slot=<nato>` then `promote-tribal-to-wiki.mjs`; direct edits are auto-overwritten by the pipeline.
- NEVER add tips directly to `tribal-embed-index.shard-*.json` via JSON edit — raw writes corrupt cosine geometry; always go through an `embed-*-into-tribal-index.mjs` script.
- NEVER skip the confidence gate when distilling shop-floor tips. Raw operator statements start unverified; path is `/distill-tribal` → `tribal_add` → mark confidence → only then promote.
- NEVER run multiple embedders concurrently against the embed index without the O_EXCL lock — the race condition is documented.
- NEVER trust the PATHS.md keyword-match engine list (93 entries) as a verified ownership list — it explicitly warns "prune false positives." Use §2 above (verified via class definition grep).
- NEVER treat tribal tips as immutable facts — `TribalEvolutionEngine.ts` owns the lifecycle; tips evolve as the fleet learns.
- NEVER inline kc1.1 / Taylor / Kienzle values into tip text — import from `mcp-server/src/physics/constants.ts`.

---

## §7 — Domain workflow / pipeline contract

```
CAPTURE  → /distill-tribal or prism_shop_practice:tribal_add (confidence=unverified)
VERIFY   → operator/SME review → update confidence field
EMBED    → scripts/embed-cited-tips-into-tribal-index.mjs (or wiki/knowledge-store variant)
INJECT   → .claude/hooks/tribal-by-domain-inject.mjs (top-3 per slot domain, UserPromptSubmit T2)
PROMOTE  → scripts/promote-tribal-to-wiki.mjs (confidence ≥ 90% only → knowledge/wiki/code-tribal/)
PRUNE    → scripts/prune-stale-tribal-entries.mjs (periodic hygiene, golf slot)
```

Rerank override: `scripts/tribal-rerank.mjs --domain <mill|lathe|wedm|cad|cam|backend-dev|general>` — boosts in-domain cosine score (does NOT filter out-of-domain).

---

## §8 — Tribal + corpus pointers

**Wiki entries (verified in wiki/code-tribal/):**
- `knowledge/wiki/code-tribal/tribal-bc-001.md` · `tribal-bc-002.md` · `tribal-bc-003.md`
- `knowledge/wiki/code-tribal/cimco-verification-tribal.md`

**JM Die tribal ground truth:** `H:/PRISM/JM DIE/` — access via `prismSelfAwarenessEngine.getJMDieCustomerPath()`. NEVER Glob the 24K-file tree directly.

**Synthesis brain:** `knowledge/memories/patterns/tribal-knowledge_synthesis.md`

**Key memory references:** `reference_tribal_by_domain_inject.md` · `reference_alpha_tribal_index_race_2026_05_30.md` · `feedback_tribal_obsidian_viz_utilization_protocol.md`

**Skills:** `/distill-tribal` (shop-knowledge → structured tip) · `/shop-knowledge`

**Tribal capture rule:** Always use `prism_knowledge:tribal_capture slot=<nato>`, never write tip files directly.

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|-----------|--------|--------|
| ↔ emit + consume | mill / lathe / wedm / cam / post-processor / all-galaxies | `prism_shop_practice:tribal_enrich` + `tribal_add` |
| ← consumes (Lane A) | knowledge-conversion | converts tips to engine/wiki nodes |
| → feeds | academy | training material source for courses |
| → stores raw corpus | corpus-aggregation | storage substrate for tip batches |
| → feeds | ai-training (india) | `TribalKnowledgeTrainingEngine.ts` → LoRA dataset |
| ← outcomes feed back | india | `TribalKnowledgeOutcomeBridgeEngine.ts` (XPROC-NEURAL-CONNECT-MS0/U-CN04) |

---

## §10 — Closed-loop integration (india)

On tip application outcomes: `xproc_outcome_publish {slot:'<nato>', domain:'tribal-knowledge', tipId, outcome}` // UNVERIFIED action name — grep knowledgeDispatcher + shopPracticeDispatcher to confirm before wiring.
Tribal capture from outcomes: `prism_knowledge:tribal_capture slot=<nato>` → feeds back into the embed pipeline. Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "tribal"
# Domain-specific scripts (no server required):
node scripts/promote-tribal-to-wiki.mjs --dry-run
node scripts/audit-tribal-coverage.mjs
node scripts/lib/tribal-index-lock.mjs  # smoke-test lock acquisition
```

---

## §12 — Known bugs / open threads

- **DOMAIN_MAP gap (P1):** `tribal-by-domain-inject` missing `speed-feed`, `database-expansion`, `business` — oscar/juliett/hotel slots get no tribal injection. Fix: add 3 domain entries to the DOMAIN_MAP in `.claude/hooks/tribal-by-domain-inject.mjs`.
- **Training pipeline not fully closed (P2):** `TribalKnowledgeTrainingEngine.ts` + `TribalKnowledgeOutcomeBridgeEngine.ts` exist but the tip-capture → LoRA training end-to-end path is unwired for the print→mill-program flow.
- **Embed index sharded (2026-06-08):** `tribal-embed-index.json` was split into `shard-000/001/002` — any script that references the monolithic path will silently read zero entries. Verify scripts use manifest + shard loader from `scripts/lib/load-tribal-index.mjs`.

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs tribal-knowledge "<question>"
```

Ollama routing for this galaxy:
- Lint / normalize a tip record, suggest cross-refs → `gpt-oss:20b`
- Embed query for rerank → `nomic-embed-text` (via `tribal-rerank.mjs`)
- Deep domain synthesis (tip conflict resolution, confidence adjudication) → `gpt-oss:120b`
- Engine/hook code summarize/explain → `qwen2.5-coder:32b`

AI-systems fleet state: `knowledge/memories/patterns/ai-systems-fleet-state.md` (regenerate: `node scripts/ai-systems-fleet-state.mjs`). Synergy: [[reference_ai_systems_fleet_state_2026_06_11]] · [[gnn-selective-deploy]] · [[psn-octopus-fleet-synergy-ms0]].
