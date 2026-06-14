## ai-training — slot:india

### Current state

**Size:** ~147 lines / ~7,800 bytes (CLAUDE.md as read 2026-06-13).
**Quality grade: GOOD**

The file is substantively correct and domain-specific. It was scaffolded by slot:alpha (2026-05-28) and has been incrementally enriched by india sessions through 2026-06-11. It avoids the most common failure modes (no big-picture PRISM milestone prose, no duplicated scrutiny-gate boilerplate). However several areas reduce its token efficiency and three items are stale or imprecise:

1. **Stale AUROC framing (line 12):** "current 0.096 heterophily" is the pre-MS2 number. MEMORY.md §Standing focus (verified 2026-06-10/13) shows the live holdout is AUROC 0.808 (selective deploy), macro-F1 0.439, Brier 0.179. The CLAUDE.md one-liner is misleading without that context.
2. **`slot/india` 4114-commits-behind note (lines 50-54):** This was true in June 2026 but is a snapshot fact, not doctrine. It bloats the file with a one-time operational note that should live in the handoff, not doctrine.
3. **Redundant "Related galaxies" block appears TWICE** (lines 70-78 and lines 109-119) — the second copy (PSN edges) supersedes the first and adds symmetric labels, but having both inflates load.
4. **`## Closed-loop integration with india` (lines 88-107) + `## Cross-cutting methodology` (lines 121-147) + `## Critic + keep-working contract`** contain generic fleet-wide doctrine (R5, R6, CAG/RAG methodology, critic discipline) that is already in the universal core. These sections add india-specific specializations on top of the generic rule — the specializations are worth keeping, but the generic framing should be a pointer.
5. **`<!-- AI-SYSTEMS-STATE:BEGIN -->` block (lines 133-140)** is a pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` — useful, but its surrounding commentary duplicates what MEMORY.md already carries verbatim. The block tag itself is fine; the surrounding prose is redundant.
6. **No explicit list of the daily-use dispatcher actions** for india. The TOOLBELT.md has them but the galaxy CLAUDE.md should at minimum name the primary dispatchers + the most-used action prefixes so a fresh session knows where to route without loading TOOLBELT first.
7. **No "what NOT to build" / duplication map** for india. The domain has ~95 LoRA engines and dozens of calibration/conformal engines; a fresh session needs a fast signal that these exist before creating new ones.

---

### KEEP

These sections are accurate, load-bearing, and india-specific — retain verbatim:

- **`## What lives here`** (lines 6-38): the 5-layer taxonomy (GNN / LoRA / RAG / Deep Reasoning / Self-improvement) with verified file references. This is the best orientation for a fresh india session. **Caveat:** update the AUROC figure on line 12 to the current live state.
- **`## Anti-patterns (india refuses)`** (lines 40-46): the 4 checkpoint/training anti-patterns are correct, domain-specific, and not in any other file. These map directly to the SOUL.md `refuses` list.
- **`## Git discipline — india commits to its own slot branch`** (lines 47-48 + 51-53): the rule itself is correct and india-specific. **DROP** the 4114-commits-behind snapshot (lines 54 only — it is a stale operational fact).
- **`## Karpathy 5-step before any code`** (lines 56-61): the NN/ML-specific instantiation (OOM on 372K-node embed, NaN gradient, race between train+eval) is genuinely india-specific. The generic 5-step is in the universal core; these ML-specific edge cases are the value. Keep as a short delta, not the full block.
- **`## Synergy — closed-loop coverage drive`** (lines 63-69): the insight that the fastest path to full-coverage GNN is labeled examples (outcome emission), not more epochs, is india doctrine and not elsewhere. Keep.
- **`## Related galaxies (PSN edges — symmetric)` second block** (lines 109-119): the symmetric PSN edge list with per-slot labels is the canonical version. Keep this one; drop the earlier plain list.
- **`## Available algorithm primitives`** (lines 115-127 of MEMORY.md, exposed via PATHS.md): the `prism_algorithm` action mapping to Transformer / LowRank / PCA / KNN / GMM / Viterbi / BeamSearch / HeterophilyAwareAggregator is verified against TOOLBELT.md and directly actionable. This or a pointer to it should be in the galaxy CLAUDE.md.
- **Wiki cross-refs** (lines 79-85): the 5 wiki links are all verified in PATHS.md. Keep.
- **`## Closed-loop integration with india` — the 4 surfaces** (lines 94-98): OutcomeFeedbackBus / NN-GRAPH lifecycle / RAG corpus / Calibration monitor are the 4 things OTHER galaxies call into india for. These are load-bearing architecture facts. Keep as a compact table; drop the surrounding scaffolding prose.

---

### DROP

Content that is either generic universal doctrine (already in main CLAUDE.md) or stale one-time snapshots:

- **`## Cross-cutting methodology`** large block (lines 121-147): the PC-specs paragraph, Loops paragraph, Obsidian vault paragraph, and Harness/LoRA/CAG/RAG paragraph are all generic fleet-wide cross-cutting doctrine defined in `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` and partially in main CLAUDE.md. The only india-specific additions are the local Ollama model choices (`gpt-oss:120b` for reasoning, `qwen2.5-coder:32b` for code) — extract just those 2 lines and drop the rest, replaced with a pointer.
- **First `## Related galaxies` block** (lines 70-78): redundant with the second (PSN-edges) block. Drop.
- **`## Critic + keep-working contract`** (lines 143-147): this is verbatim universal doctrine (R12 honesty + R6 context-not-a-stop-signal). It adds zero india-specific content. Drop and point to `main CLAUDE.md §HONESTY RULES + §R6`.
- **`<!-- AI-SYSTEMS-STATE:BEGIN -->` prose wrapper** (lines 133-140): the machine-generated comment block is fine. The 3 lines of surrounding commentary ("Live fleet AI-systems state...recall-discoverable...reasoning-bridge + CAG already consume it") duplicate what MEMORY.md §AI-systems fleet state already carries. Keep the block tag + regenerate command + wiki refs; drop the explanatory prose.
- **Stale "4114 commits behind" snapshot** (CLAUDE.md line 54): this is a one-time migration note. It belongs in the handoff, not doctrine.
- **`## Authoritative free-source corpus`** block in MEMORY.md (lines 138-143): this is auto-generated from `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` and should stay in MEMORY.md / PATHS.md, not be duplicated into the galaxy CLAUDE.md. If surfaced here it will rot.

---

### ADD (domain-specific — the heart of this assessment)

What a fresh india session critically needs and currently lacks:

#### 1. Live deploy-gate status (quick-read block)
A single always-current block showing the GNN gate metrics. Not prose — a compact table:

```
| Metric   | Gate  | Current (2026-06-06, 62-ghost holdout) | Status |
|----------|-------|----------------------------------------|--------|
| AUROC    | ≥0.78 | 0.808                                  | PASS   |
| macro-F1 | ≥0.55 | 0.439                                  | FAIL   |
| Brier    | ≤0.15 | 0.179 (calibration = dead-end)         | FAIL   |
| Selective (τ=0.7) | — | Brier 0.041, F1 1.0, 32% coverage | DEPLOY-READY |
```

Refresh command: `node scripts/nn-eval-refresh.mjs` → `state/shared/nn-graph/NN-EVAL.md`.
This is the single most-queried fact in india sessions and currently buried in MEMORY.md.

#### 2. Primary dispatcher action prefix table (verified)
India uses 4 dispatchers daily. A fresh session needs to know these WITHOUT loading TOOLBELT.md:

| Dispatcher file | MCP name | Key action prefixes for india |
|---|---|---|
| `aiReasoningDispatcher.ts` | `prism_ai` | `xproc_neural_*`, `xproc_outcome_*`, `lora_*`, `neural_*`, `consensus_*` |
| `intelligenceDispatcher.ts` | `prism_intelligence` | `xproc_neural_*`, `digital_twin_*`, `ai_orchestrate_*` |
| `outcomeDispatcher.ts` | `prism_outcome` | `capture_bus_*`, `outcome_*`, `replay_*`, `rl_bridge_*`, `drift_*` |
| `mlDispatcher.ts` | `prism_ml` | `adalora_*`, `continual_lora_*`, `fedlora_*`, `lora_compose`, `lora_gate`, `loramoe`, `olora_*` |

(Sources: verified in TOOLBELT.md §prism_* dispatcher actions + PATHS.md §Dispatchers.)

#### 3. Duplication map / "do NOT build" list
The domain has ~95 LoRA engines and a full calibration/conformal stack. A fresh india session MUST see this before creating anything:

- **LoRA stack (~95 engines):** `mcp-server/src/engines/*LoRA*.ts` — ALL per-domain cadence/drift/deployment/monitoring/ensemble engines exist. Glob FIRST.
- **Calibration/conformal stack:** `*{Calibration,Conformal,Drift,Reward}*.ts` — full pipeline shipped. GNN Brier calibration specifically is a MEASURED DEAD END — do not pursue.
- **RAG hybrid:** LIVE via `scripts/lib/hybrid-retrieval.mjs` (4-substrate RRF) + `utils/reciprocalRankFusion.ts`. Three would-be dups already reverted.
- **CAG router:** `scripts/lib/cag-router.mjs` exists. Do not rebuild.
- **Ollama co-residency tuning:** DONE (`OLLAMA_MAX_LOADED_MODELS=4`, etc.). Do not rebuild.
- **Active-learning ghost selector:** SHIPPED `f512700c56` (`scripts/lib/gnn-active-pool-select.mjs`). Do not rebuild.
- **Cross-loop lesson memory:** `handoff-memory-seed-stop.mjs` already carries episodic memory forward. Do not add per-slot learnings.md.
- Before ANY new asset: `duplicationGuardEngine.mustCheckBeforeCreating({...})` THROWS on exact duplicate.

#### 4. The 6 remaining WIRE_SAFE_DATA orphans (actionable backlog)
From MEMORY.md §NEW AXIS (bravo cross-galaxy 2026-06-11), verified:

```
IntentClassifier, PolicyExperienceLedger, TransferLearning,
TemporalReasoning, RealTimeAnomalyDetection, KnowledgeIngestion
```

Queue: `state/shared/specs/INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md`
Rule: wire DATA/stats/provenance actions only — NEVER wire NN inference through a dispatcher (R12 invariant).
`ConsensusModelPerformanceEngine` is a STUB — do NOT wire until real impl lands.

#### 5. Ollama model routing (india-specific)
- Deep reasoning + training hypotheses: `gpt-oss:120b` (65GB, fits Blackwell 96GB resident)
- Trainer / engine / test code: `qwen2.5-coder:32b`
- Trivial / classification: `qwen2.5-coder:1.5b`
- Embeddings (RAG): `nomic-embed-text`
- NEVER hardcode a retired tag: `:3b/:7b/:14b/deepseek-r1:14b` all retired 2026-06-04.
- Capability oracle (single source of truth): `OllamaCapabilityProbeEngine.getBestReasoningModel()` / `getBestChatModel()` — verified `c1b40183c1`, live-validated 2026-06-08.

#### 6. Domain-specific "what NOT to do"
Not currently present in any compact form:

- Do NOT lower the gate (AUROC < 0.78) to force full-coverage deploy. Selective deploy at τ=0.7 is correct posture.
- Do NOT train on the full graph without `positiveTypeMarginal` stratification — heterophily collapse (NN-GRAPH MS1 root cause).
- Do NOT overwrite `graphsage-checkpoint.json` directly — always write to `.candidate.json` and promote only after `runAssessment` clears all 3 gates.
- Do NOT embed the full 372K-node corpus in-memory — use the streaming JSONL reader (`build-node-embeddings.mjs`).
- Do NOT wire NN inference through any dispatcher — R12 invariant: only DATA/stats/provenance actions are dispatcher-safe.
- Do NOT report a single-seed AUROC lift — multi-seed before any AUROC claim (heterophily + link-pred AUROC on capped subgraphs is high-variance).
- Do NOT rebuild the calibration pipeline to fix the Brier gate — calibration contributes only 0.0197 of the 0.179 Brier; the fix is more labeled examples, not calibration.

#### 7. Session startup sequence (india-specific fast path)
Currently absent. A fresh india session should:

1. Read `state/shared/INDIA-CONTEXT-LEDGER.md` (ROI-ordered one-read regain, per MEMORY.md)
2. Read `state/shared/nn-graph/NN-EVAL.md` (current gate state)
3. Check `state/shared/specs/INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md` (6 open wires)
4. `node scripts/nn-graph-retrain-lifecycle.mjs --status` (cadence state)
5. Then pick tasks from the india context ledger in ROI order.

---

### IDEAL SECTION OUTLINE

Ordered sections the galaxy CLAUDE.md should have (a fresh india session needs nothing beyond this + the universal-core pointer):

```
1. # AI Training Galaxy (INDIA slot) — scope statement (3 lines)
2. ## Deploy-gate status (compact table — current AUROC/F1/Brier + refresh command)
3. ## Domain layers (5-layer taxonomy: GNN / LoRA / RAG / DeepReasoning / Self-improvement — verified paths)
4. ## Primary dispatchers + action prefixes (4-row table, verified)
5. ## Duplication map — do NOT rebuild these (bulleted, with file references)
6. ## Anti-patterns (india refuses) — domain-specific only
7. ## What NOT to do (GNN gate / calibration dead-end / heterophily / dispatcher-inference rule)
8. ## Ollama model routing (india-specific model picks)
9. ## Open backlog (6 WIRE_SAFE_DATA orphans + queue file reference)
10. ## Closed-loop surfaces (4-row table: OutcomeFeedbackBus / NN-GRAPH / RAG / Calibration)
11. ## PSN edges — related galaxies (symmetric, verified 10-slot list)
12. ## Session startup sequence (5-step fast path)
13. ## Wiki cross-refs (5 links)
14. ## Git discipline (india slot/india branch rule — doctrine only, no stale snapshots)
15. ## Universal-core pointer (one line)
```

Target size: ~120 lines / ~6KB. Current file is ~147 lines but less actionable because key facts (gate metrics, dispatcher table, orphan queue, DO-NOT-BUILD list) are buried in MEMORY.md or absent.

---

### UNIVERSAL-CORE POINTER

The following universal rules must remain available to india but should NOT be duplicated in the galaxy CLAUDE.md — a single pointer line suffices:

> **Universal rails:** `H:/prism/CLAUDE.md` — §EXPERT ROLE · §SCRUTINY GATE (3-of-3) · §PER-FILE SCRUTINY GATE · §PER-CHAT HANDOFF · §ENGINE WIRING (R15) · §HONESTY RULES (R12) · §KARPATHY DISCIPLINE (R1-R4) · §CLAUDE.md RULES 5-13 (R5-R15) · §SAFETY RAILS (units-first, no-stub, no-inline-constants) · §MCP DISPATCHERS (full list) · §MANDATORY SELF-AWARENESS (dedup gate) · §WIKI PROTOCOL · §CANONICAL SOURCES OF TRUTH.

Specifically, these sections from the current galaxy CLAUDE.md should become the pointer above and be removed from the galaxy file:
- `## Critic + keep-working contract` → universal R12 + R6
- `## Cross-cutting methodology` (PC-specs / loops / vault / harness paragraphs) → `GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + main CLAUDE.md §AI SYSTEM ROUTING
- Generic Karpathy 5-step heading → keep only the ML-specific delta (OOM / NaN / race) as a short addendum
