---
source: ultracode Workflow wf_a5e7c1f0-e0e (8 agents, 2.09M subagent tokens, 12.7min)
built: 2026-06-10 by slot:zulu (claude-4b1bbdf2)
topics: [loops-harness, hermes-obsidian, cag-rag, lora-ai-systems, nn-gnn, memory-context, agentic-discipline]
verification: R12 -- synthesis agent re-verified named assets exist, LoRA=95 engines, GalaxyAdapterFactoryEngine ABSENT, heterophily=0 in production trainer
seed: 79 operator-submitted X article URLs across 894 transcripts + 7-article full-capture corpus (state/shared/articles/)
---

# Agentic Systems & Loop-Engineering Source Knowledge (operator-submitted corpus)

> Synthesis lead: PRISM master/orchestration galaxy (`mcp-server/src/engines/agent-orchestration/`). Built from 7 topic-mining memos covering every agentic/loops/hermes/obsidian/cag/rag/lora/nn/gnn article the operator (Mark) submitted. R12 throughout: claims I verified this session are marked ✓-verified; claims carried from the memos but not re-checked here are marked (memo-asserted); genuinely absent things are marked ABSENT.
>
> Verified this session: 7 full-capture articles in `state/shared/articles/` ✓; all named assets (`loop-iteration-inject.mjs`, `cag-router.mjs`, `vault-to-lora-dataset.mjs`, `hermes-dream-cycle-synth.mjs`, `fact-checker.md`, `graphsage-model.mjs`, `HeterophilyAwareAggregator.ts`) exist ✓; LoRA engines = **95** ✓; `GalaxyAdapterFactoryEngine.ts` **ABSENT** ✓; no synthesis LoRA wiki page (443 auto-gen action stubs only, zero `lora-stack.md`) ✓; heterophily refs in production trainer `graphsage-trainer.mjs` = **0** ✓.

---

## 1. The Loop-Engineering frame (Addy Osmani — the keystone)

Source: `x.com/addyosmani/status/2064127981161959567` → full capture `state/shared/articles/2026-06-10-addy-osmani-loop-engineering.md` ✓.

**Thesis shift.** Stop prompting; design the *system that prompts*. steipete: "you should be designing loops that prompt your agents." bcherny (head of Claude Code): "I don't prompt Claude anymore… My job is to write loops." The leverage point moved up one floor; the work did not get easier — it got harder and more valuable.

**The 5 building blocks + a memory spine (both Claude Code & Codex ship all 5), mapped to PRISM primitives:**

| # | Loop block | What it does | PRISM primitive (verified path) |
|---|-----------|-------------|--------------------------------|
| 1 | **Automations / schedule** | run on cadence, not on keystroke | `/loop` + ATCS state machine (`atcsDispatcher.ts`) + cron scheduled-tasks + lifecycle hooks |
| 2 | **Worktrees** | parallel isolation, no cross-contamination | SLOT-WORKTREE-MS0 — `H:/prism-slot-<nato>` on `slot/<nato>` branches |
| 3 | **Skills** | intent written down → kills cold re-derivation ("intent debt") | `.claude/commands/*.md` (~440) + `skill-auto-trigger.mjs` |
| 4 | **Plugins / connectors** | MCP into real tools | `prism_*` MCP dispatchers (calc/cam/ai/safety/dev/memory/session…) |
| 5 | **Sub-agents** | maker ≠ checker | per-file 2-arm scrutiny + 3-of-3 Stop gate (`scrutinize-before-stop.mjs`, `scrutiny-3way.mjs`) ✓ |
| 6 | **Memory on disk** | "the agent forgets, the repo doesn't" | Obsidian vault (`knowledge/memories/` + `knowledge/wiki/`) + per-chat HANDOFF + MEMORY.md |

**`/loop` vs `/goal` (the maker/checker split applied to the stop condition itself):** `/loop` re-runs on a cadence; `/goal` runs until a *verifiable* stop-condition that a **separate small model** checks. PRISM: `/loop` injects discipline via `loop-iteration-inject.mjs` ✓; `/goal` + ATCS survive `/compact`.

**The 3 failure modes that get SHARPER as the loop improves** (the load-bearing warning):
1. **Verification is still on you** — "done is a claim, not a proof." A better loop produces more output to verify, not less.
2. **Comprehension debt** — the code you didn't write but own grows faster than your understanding of it.
3. **Cognitive surrender** — you stop checking because the loop is usually right; the one time it isn't is the expensive one.

mikenevermiss's production-grade restatement adds three operational failure modes: **data quality**, **tool-call failures** (never continue silently on a failed call), **prompt scope-creep** — and the rule **keep the final action (publish/send/execute) with the human** (BCG 2025: 74% of AI pilots never scale).

---

## 2. Per-topic distilled knowledge

### 2.1 Loops + agentic-coding + harness

**Harness vs loop engineering.** Harness = the environment a single agent runs *inside* (the "factory model"). Loop engineering sits one floor above: the harness on a timer that spawns helpers and feeds itself.

**Dynamic Workflows (Anthropic / Thariq Shihipar; trigger word `ultracode`).** Claude writes and orchestrates its *own* JS multi-agent harness: isolated context windows per agent, per-agent model override, journaled resume, and **deterministic zero-token JS coordination** between agents. Fixes 3 single-context failure modes: **agentic laziness**, **self-preferential bias**, **goal drift**. 6 composable patterns: classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament, loop-until-done.

**The 6 agent-loop rules** (shann + Opik + Huryn + Martin, synthesized into `loop-iteration-inject.mjs` ✓ as the `LOOP_DISCIPLINE` const; knob `PRISM_LOOP_RULES_DISABLE=1`):
1. CLOSED-loop by default (open loop on loose standards = "slop machine").
2. Eval-gate every iteration.
3. Each pass feeds the next.
4. Self-correct the weakest part.
5. Orchestrator / specialist / subagent split with ~zero-token coordination.
6. Budget is a stop condition.

**PRISM application:** This very research task runs under the Workflow tool (Dynamic Workflows native). `ULTRACODE-SYNERGY-MS0` spec verdict: 17/28 patterns already present, PRISM ahead on orchestration. Maker/checker = the 3-of-3 scrutiny consensus (Codex + 2 independent Claude reviewers) = the article's "adversarial verification." Opik self-repairing-harness applied as `regression-lock-audit.mjs` (commit 8971770e3).

**R12 caveat:** topic strings for `tonysimons_/2059119768662065523` and `mr_r0b0t/2059026191646945515` did not extract cleanly; only the operator's surrounding `/loop /goal` prompt + downstream spec names (DREAM-RECEIPT-MS0, WEBWRIGHT-SKILL-PROMOTION-MS0) confirm they are Hermes/dream-loop themed.

### 2.2 Hermes + Obsidian

**Core thesis (cyrilXBT).** Vault stores knowledge but can't act; agent acts but forgets. Connect them: agent **READS** the vault before acting, **WRITES** outcomes back after = a closed self-learning loop. *"A second brain that never talks back is not a second brain. It is a very organized way to forget things."*

**4-layer architecture:** Vault (Obsidian markdown) → Connection (Filesystem MCP) → Intelligence (Hermes+Claude reasons across vault) → Automation (scheduler fires workflows). The vault is the *operating environment*, not just storage.

**Hermes Masterclass internals** (Nous Research; full capture `2026-06-09-hermes-agent-masterclass.md`): single `AIAgent` class, ReAct loop, **90-turn hard cap**; **SOUL.md** identity in system-prompt slot #1; **3-tier memory** (Tier-1 capped markdown `MEMORY.md`≤2200 / `USER.md`≤1375 with consolidate-at-80%; Tier-2 SQLite FTS; Tier-3 external providers with auto-prefetch); **self-evolving skills** (markdown+YAML, progressive disclosure L0/L1/L2, autonomous creation on 5+ tool-calls / error-recovery / corrections); **Curator** (inactivity-triggered stale@30d/archive@90d, never auto-deletes); **GEPA** (Genetic-Pareto offline skill optimization from execution traces — fixes self-congratulation bias, outputs PRs, $2-10/run no GPU); **cron with job-chaining via `context_from`**.

**PRISM application (all paths memo-verified to exist):** Hermes galaxy `mcp-server/src/engines/hermes-zulu/` (zulu = designated Hermes orchestrator); parallel-execution engines (`HermesFileScopePartitionerEngine`, `…ParallelFanoutPlannerEngine`, `…ParallelVerdictAggregatorEngine`, `…SelfCorrectionEngine`); memory bridge `scripts/hermes-obsidian-memory-bridge.mjs`; **nightly dream cycle** `scripts/hermes-dream-cycle-synth.mjs` ✓ (latest run 11,211 memos / 200 Jaccard connections); weekly synthesis `scripts/hermes-self-reflect-populater.mjs` + `weekly-memory-synthesis.mjs`; **GEPA-lite** `scripts/hermes-skill-gepa.mjs` (U-GEPA01, `context_from` chain wired in `jobs.json`); self-heal `obsidian-learning-revival.mjs` (fixed a 4-night offline-compounding outage). WRITE-back loop = `stop-obsidian-memory-feed.mjs`. The masterclass corpus encodes a 10-point PRISM/zulu verification checklist.

**Operator directive of record:** `InduTripat82427/status/2057017304144298383` — "make zebra the designated hermes agent. do deep research on how to synergize hermes with the prism system… I think we still have plans leftover for the original hermes" — kicked off the zulu/zebra orchestrator work.

### 2.3 CAG + RAG

**CAG vs RAG split (akshay_pachaar; Chan et al. 2024 "Don't Do RAG").** Every vector-DB hit for *static* info is wasted cost. CAG caches static knowledge in the model's KV / Anthropic prompt-cache; RAG retrieves *dynamic* data; hybrid routes static→cache, dynamic→retrieve. Claude Code hits a cited **92% prompt-cache hit-rate**. "Be selective — caching everything hits context limits."

**Techniques:** COLD/HOT/HYBRID query routing *before* retrieval fires; two-stage retrieval (cheap cosine/BM25 recall of STAGE1_K → lexical precision rerank to TOP_K — cross-encoder too heavy per-hook); **hybrid BM25 + dense + RRF (k=60)** normalizes heterogeneous score scales to a rank scalar (Anthropic Contextual Retrieval: ~35-49% fewer failed retrievals); baseline-first eval (precision@k / recall@k / MRR / mAP); embedding discipline (nomic-embed-text 768-d, int8-quantizable, never mix models in one index, cosine ≠ probability).

**4-layer agent memory (dunik_7):** sticky-note → project (instructions not history) → living memory file (lean+filtered) → consolidator/"dreaming" (write to a NEW file, review before swap). Write-time filter: *"would this change how the agent acts next time?"*

**PRISM application (all verified to exist on disk per memo):** CAG stack — `scripts/lib/cag-router.mjs` ✓ (pure-fn COLD/HOT/HYBRID, 7-entry `COLD_SOURCES`, 39 tests), `cag-router-inject.mjs`, `cag-cold-cache-anchor.mjs`, `cag-soul-cache-block.mjs`, consumer `cag-consume.mjs` (fail-OPEN). RAG stack — `embed-all-wiki.mjs`, `tribal-by-domain-inject.mjs` (two-stage), `RetrievalEvalEngine.ts` (`rag_eval_score`/`rag_eval_run`), `memory-index-search-lib.mjs` (hybrid BM25+dense+RRF, sidecar 10,892 int8 768-d vectors), `prism-hybrid.mjs` + `prism_session:hybrid_search` + `/hybrid` skill.

**R12:** of the 5 CAG/RAG seed tweets, only akshay `2056714042455343160` and dunik `2058905748579418615` trace to operator submissions; the avichawla + 3 other akshay IDs are ABSENT from transcripts/memory/wiki — research seeds, not operator-pasted.

### 2.4 LoRA + AI-systems

**Primary source:** `appscale.blog/…/llm-fine-tuning-lora-qlora-full-fine-tuning-compared-2026` (LoRA vs QLoRA vs DoRA vs Full, fetched+analyzed in india session `7bfff7a4`) + arxiv 2106.09685 (LoRA), 2005.11401 (RAG), 1603.09320 (HNSW).

**Techniques:** LoRA = freeze base, train low-rank adapters (rank r, alpha) on `target_modules`, ~0.1-1% params. QLoRA = base 4-bit nf4-quantized, dequantized per-op → fits ≤32B on one 96GB GPU (recommended PRISM path for ≤32B). DoRA/AdaLoRA/VeRA = weight-decomposed / rank-adaptive / vector-projection variants. **Promote-gate must be GENERATIVE** (exact-match / BLEU / pass@k on held-out G-code + S(x)≥0.95 safety floor + regression), **never an AUROC number**. GPU fixes the compute wall, not the data wall — adapter quality is gated by labeled-corpus growth. Local-train reality: dedicated Python 3.13 venv (torch 2.11+cu12x, bitsandbytes, Unsloth Blackwell); Ollama is inference-only.

**PRISM application:** **95 live LoRA engines** ✓ (AdaLoRA, OrthogonalLoRA, LoRAMoEGating, FederatedLoRA, ContinualLoRA, per-domain Lathe/Mill/WEDM/Sinker/Laser families). Full vault→corpus→adapter chain: `vault-to-lora-dataset.mjs` ✓ → `build-fleet-training-corpus-inventory.mjs` → `assemble-fleet-lora-corpus.mjs` (746 weighted/deduped rows) → `lora-dataset-builder.mjs --track-field galaxy` (35 per-galaxy tracks) → operator GPU fine-tune. Closed-loop: `XProcNeuralAutoFireEngine.activate()` (outcome→auto-train + EWC anti-forgetting). Routing ladder already exists (`ModelRoutingEngine.ts`, `home_blackwell`).

**Verified gaps:** **No synthesis LoRA wiki page** ✓ (443 auto-gen action-doc stubs match `lora`, zero `architecture/lora-stack.md`). `GalaxyAdapterFactoryEngine.ts` is **ABSENT** ✓ (named P0-6 keystone to collapse 67 forked per-domain LoRA engines). Variant coverage shallow (QLoRA/DoRA/PiSSA/LoftQ/LoRA+ = 0 in real code). Combined corpus `fleet-lora-combined.jsonl` = 746 rows, `training_ready:false` — data done, fine-tune run is the missing terminal step. Stale-citation: `ai-training/AI-SYSTEMS-IMPROVEMENT-ROADMAP.md` path MISSING (superseded by dated specs).

### 2.5 NN + GNN

**Academic grounding:** Zhu et al. 2020 (H2GCN), El-Yaniv & Wiener 2010 (selective prediction). **Honest finding (memo + ✓):** *no GNN article body was ever captured* — the 7 seed URLs (neural_avb, 2× _avichawla, 4× akshay) are in the operator's URL corpus but `state/shared/articles/` is **entirely loops/hermes/obsidian**. PRISM's GNN knowledge is ~100% self-generated build lessons, 0% external grounding.

**Techniques:** GraphSAGE link-prediction as a 5th wiring-inference tier (2-layer, mean aggregator, `concat(self,agg)`, **linear output** — ReLU on the final layer collapses AUROC to ~0.5). Edgeless-subgraph embedding to avoid cascade-guess leakage. **Heterophily is the root failure** — engine↔dispatcher edges connect *different* node types, so vanilla blending gives AUROC 0.096 (sub-random). Lever = **H2GCN ego/neighbor separation** + k-hop disjoint neighborhoods. **Multi-seed before any AUROC claim** (single-seed +0.118 vs seed7 −0.049). Post-hoc calibration is a measured dead end (Murphy: miscalibration only 0.0197 of 0.179 Brier). **Selective deployment is the honest win:** at `minConf=0.7` the tier abstains on 68%, defers to LLM; emitted set Brier 0.041 / macro-F1 1.0 / AUROC 0.808 = DEPLOY-READY-SELECTIVE.

**PRISM application (verified):** `graphsage-model.mjs` ✓, `nn-graph-eval.mjs` (`gradeSelectiveDeploy`), `nn-graph-calibration-analysis.mjs`, `validate-heterophily-auroc.mjs`, `HeterophilyAwareAggregator.ts` ✓ (wired `prism_algorithm:graph_heterophily_aggregate`) + pure-JS twin `heterophily-features.mjs`, `graph-node-embedding-bridge.mjs` → `node-embeddings-768d.jsonl`, hooks `nn-graph-health-inject.mjs` + `psn-leg-state-inject.mjs` (PSN leg #10). **Verified gap:** heterophily refs in the *production* trainer `graphsage-trainer.mjs` = **0** ✓ — the +0.138 H2GCN lift lives only in `validate-heterophily-auroc.mjs`, not the deploy path.

### 2.6 Memory + context engineering (the spine)

**Convergent stack — four authors, one architecture:** Identity → Knowledge → Memory/Connection → Tools → Process/Synthesis. Differences are framing, not substance.

- **Context Cascade (Bibryam #1 — PRISM is the namesake: Per-Repository Instruction & Skill Management):** layered CLAUDE.md, root=global+pointers, subdirs=local conventions, auto-loaded by directory proximity. **8 large-codebase patterns:** Context Cascade, Repo Map, Noise Filter, Symbol Lookup (LSP not text-search), Just-in-Time Skill, Scoped Skill (path-bound auto-load), Scout Subagent, Search-as-a-Tool.
- **Retrieval-first vault (Cyril):** *"organize to get things back quickly, not to put them away neatly."* 4 retrieval dimensions (Type/Time/Topic/Status); 7-folder; `YYYY-MM-DD-[TYPE]-[TOPIC].md`; Maps-of-Content at ~20 notes.
- **Literature → Permanent (Karpathy, load-bearing):** literature = *what the source said*; permanent = *what I think, own words, linked*. "You don't own knowledge until you can express it in your own words."
- **Context eng ≠ prompt eng (Khairallah, 5-layer):** value is persistent structure, not the typed words.

**PRISM application (verified to exist):** Context Cascade → 5 galactic-center sentinels `engines/{mill,lathe,wedm,quoting,business}/CLAUDE.md`. Repo Map → `{DIRECTORY,ENGINE,DISPATCHER}_DIGEST.md`. Scoped Skill → `_skill-triggers.jsonl` + the path-scoped `_skill-triggers-pathglob.jsonl` (now materialized, narrowing the pattern-6 gap). Search-as-a-Tool → `prism_session:master_index_query` + `prism_memory:semantic_search` + `prism_knowledge:search`. The PSN 11-leg map (`feedback_psn_definition.md`) is the superset subsuming all three external frameworks. Operator's self-scored coverage: Bibryam 7.5/8, Khairallah 5/5, Karpathy 4-layer at Day-0-per-slot.

### 2.7 Agentic discipline + honesty + anti-fabrication

**Already deeply ingested.** PRISM's R5-R15 doctrine is *derived from* `Mnilax/2058269663788736907` (cited in CLAUDE.md). The 0x_rody 4-layer anti-fabrication model maps 1:1 onto PRISM's enforcement:

| rody layer | PRISM enforcement (verified) |
|-----------|------------------------------|
| L1 CLAUDE.md honesty rules + "I don't know" license | §HONESTY RULES (explicitly `src: rody @0x_rody`) + R5-R15 |
| L2 verify-symbol-before-claiming, cite file:line | doctrine "verify a symbol before claiming it exists" + never-claim-absence-without-deep-search |
| L3 PostToolUse type/lint + Stop test hooks | `stop_on_failing_tests.mjs` (T0 fail-closed) |
| L4 fact-checker subagent | `.claude/agents/fact-checker.md` ✓ (VERIFIED/WRONG/UNVERIFIABLE schema) |

Other key claims: maker≠checker kills self-preferential bias; Stop hook runs the test suite as the "done" gate (rody #2 keystone → `scrutinize-before-stop.mjs` 3-of-3 ✓); CLAUDE.md must stay short (>50 lines → Claude skims; >200 → compliance collapses); facts vs judgments labeled separately. Fable-5 honesty core (verbatim): *"Ground every claim in actual files: cite file paths and line numbers. If you can't verify something, say so explicitly rather than guessing."* + "prefer 15 high-confidence findings over 50 speculative ones." Prior synthesis `reference_rody_cyril_claude_setup_articles_2026_06_08.md` concluded "PRISM already exceeds all three; the articles' weakness is manual-invoke — PRISM institutionalizes via Stop-hook enforcement."

---

## 3. Master article index

Every operator-submitted URL found across the 7 memos, its topic, and the PRISM doctrine/asset it informed. **Captured-FULL** = body saved to `state/shared/articles/`. **URL-only** = in submitted-URL corpus, body never fetched. Counts `[N]` = paste frequency where known.

| # | URL | Author / title | Topic | PRISM doctrine/asset informed | Status |
|---|-----|---------------|-------|------------------------------|--------|
| 1 | x.com/addyosmani/status/2064127981161959567 | Addy Osmani — Loop Engineering | loops | 5-blocks frame; `loop-iteration-inject.mjs`; `agent-loop-design-rules.md` | Captured-FULL ✓ |
| 2 | x.com/mikenevermiss/status/2062441790112764214 (+/article/2062436658289479680) | overnight workflows | loops | morning-review-queue gap; 3-layer arch | Captured-FULL ✓ |
| 3 | x.com/trq212/article/2061907337154367865 (+2052811…, 2052809…) | Thariq Shihipar (Anthropic) — Harness for Every Task | loops | ULTRACODE-SYNERGY-MS0; Workflow-native | Captured |
| 4 | x.com/meta_alchemist/status/2064431279383433646 | Fable-5 Repo Audit Prompt | loops + honesty | `/repo-audit` skill (GAP, not yet built) | Captured-FULL ✓ |
| 5 | x.com/Mnilax/status/2058269663788736907 `[7]` | CLAUDE.md Rules 5-13 | discipline | **R5-R15 doctrine** (CLAUDE.md cites it); `feedback_r5_thru_r12_doctrine.md` | Ingested as doctrine |
| 6 | x.com/cyrilXBT/article/2060883609935077667 | Hermes Agent Masterclass | hermes | `hermes-agent-masterclass.md`; 10-pt zulu checklist | Captured-FULL ✓ |
| 7 | x.com/cyrilXBT/article/2061290917403713538 | Obsidian+Hermes "one system" | hermes | `…one-system-FULL.md` (707 lines, 7 skill specs un-ported) | Captured-FULL ✓ |
| 8 | x.com/cyrilXBT/article/2063634505940754601 | Obsidian+Hermes one system | hermes | dream-cycle / self-reflect engines | Named seed |
| 9 | x.com/cyrilXBT/article/2058373087330959829 | retrieval-first vault | memory | `cyril_vault_retrieval_architecture` digest | Captured/seed |
| 10 | x.com/cyrilXBT/status/2056924424838815824 | Obsidian setup ("use playwright…") | hermes | original Obsidian-setup driver | Submitted |
| 11 | x.com/cyrilXBT/status/2059817560988676179 | Karpathy 4-layer second-brain | memory | `karpathy_obsidian_4layer_framework` digest | Submitted |
| 12 | x.com/InduTripat82427/status/2057017304144298383 | "original hermes" plans | hermes | zulu/zebra orchestrator kickoff directive | Submitted |
| 13 | x.com/bibryam/status/2059359166188208142 | Context Cascade (8 patterns) | memory | DOMAIN-GALAXY-DOCTRINE; 5 sentinel CLAUDE.md | Ingested (7.5/8) |
| 14 | x.com/eng_khairallah1/status/2059929190158488034 | Context eng replacing prompt eng (5-layer) | memory | `khairallah_5layer_context_engineering` (5/5) | Ingested |
| 15 | x.com/dunik_7/status/2058905748579418615 | 4-layer agent memory | cag/memory | 4-layer memory doctrine; layer-4 consolidation safety | **URL-only / UNFETCHED** (X 402) |
| 16 | x.com/akshay_pachaar/status/2056714042455343160 `[5-6]` | RAG vs CAG clearly explained | cag/rag | **cag-router.mjs** + CAG stack; `cag-router.md` | Cited (body teaser) |
| 17 | x.com/akshay_pachaar/status/2064051835636498924 `[7]` | Agent Harness Should Repair Itself (Opik) | loops/cag | `regression-lock-audit.mjs`; loop rule 2/4 | Submitted |
| 18 | x.com/0x_rody/status/2063295395434831922 `[6]` | Stop Making Stuff Up (4-layer anti-fab) | honesty | **§HONESTY RULES** + `fact-checker.md` (L1-L4) | Ingested as doctrine ✓ |
| 19 | x.com/0x_rody/status/2063928611619455268 `[3]` | Review Own Work Before Showing You | honesty | Stop-hook 3-of-3; `stop_on_failing_tests.mjs` | Ingested as doctrine |
| 20 | x.com/0xCodez/status/2062127385923776831 `[7]` | Dynamic Workflows / ultracode | loops/honesty | ULTRACODE-SYNERGY-MS0; 6 patterns | Submitted |
| 21 | x.com/TheAhmadOsman/status/2058745340895870985 `[2]` | LLM curriculum (Build→Plot→Break→Ship) | discipline/lora | per-file scrutiny ("Break"=R12) | Submitted |
| 22 | x.com/KSimback/status/2058262328496554021 | Hermes Agent Memory 7-gaps | cag/memory | memory-architecture adjacency | Submitted |
| 23 | x.com/shannholmberg/status/2055335043904492011 | what is agent looping (richest) | loops | the 6 agent-loop rules | Captured-FULL (memo) |
| 24 | x.com/RLanceMartin/status/2064397389189071163 | designing loops with Fable 5 | loops | loop rules | **Teaser-only** (login-walled) |
| 25 | x.com/IBuzovskyi/status/2064377155476193362 | 8 loops inside Hermes that compound | loops | multi-timescale loop compounding | **Teaser-only** |
| 26 | x.com/PawelHuryn/status/2064079508689358857 | Claude Dynamic Workflows ("zero is the upgrade") | loops | loop rule 5 (zero-token coord) | **Teaser-only** |
| 27 | x.com/akshay_pachaar/status/2049037299334472015 | self-repairing harness/Opik (RULER) | loops | loop rule 2 | Submitted |
| 28 | x.com/tonysimons_/status/2059119768662065523 | (Hermes/dream-loop themed) | loops/hermes | DREAM-RECEIPT-MS0 spec | Submitted (title unextracted, R12) |
| 29 | x.com/mr_r0b0t/status/2059026191646945515 | (Hermes/dream-loop themed) | loops/hermes | WEBWRIGHT-SKILL-PROMOTION-MS0 | Submitted (title unextracted, R12) |
| 30 | x.com/neural_avb/status/2061918166566195329 | @neural_avb deep-learning educator | nn/gnn | (none — body never captured) | **URL-only, ABSENT body** |
| 31 | x.com/_avichawla/status/2049037299334472015 | Avi Chawla — DDoDS | nn/gnn | (none) | **URL-only** |
| 32 | x.com/_avichawla/status/2063210446686146750 | Avi Chawla | nn/gnn / cag | (none) | **URL-only** |
| 33 | x.com/akshay_pachaar/status/2054564519280804028 `[6]` | akshay graph/embedding | nn/gnn | (none — GNN-adjacent, body uncaptured) | **URL-only** |
| 34 | x.com/akshay_pachaar/status/2058976178908885210 `[3]` | akshay ML explainer | cag/nn | (none) | **URL-only** |
| 35 | appscale.blog/…/lora-qlora-full-fine-tuning-compared-2026 | LoRA vs QLoRA vs DoRA vs Full | lora | 95-engine stack analysis; QLoRA-path doctrine | Fetched + analyzed |
| 36 | arxiv.org/abs/2106.09685 | LoRA (Hu et al.) | lora | LoRA adapter foundation | Cited |
| 37 | arxiv.org/abs/2005.11401 | RAG (Lewis et al.) | rag | RAG stack foundation | Cited |
| 38 | arxiv.org/abs/1603.09320 | HNSW (Malkov & Yashunin) | rag | embedding store index | Cited |
| 39 | apidog.com/blog/use-kimi-k2-6-free | Kimi K2.6 | ai-systems | "wire in kimi2.6" → resolved CLOUD-ONLY | Fetched |
| 40 | x.com/i/article/2056154476549931008 | (operator long-form) | lora/ai | — | **UNRECOVERABLE** (login-walled) |
| 41 | x.com/i/article/2056643638202187776 | (operator long-form) | lora/ai | — | **UNRECOVERABLE** |
| 42 | anthropic.com/engineering/effective-context-engineering-for-ai-agents | Anthropic — context engineering | memory | cited in AUDIT-TOKEN-CONTEXT-MEMORY spec | **Referenced, never captured FULL** |
| 43 | anthropic.com/engineering/equipping-agents-…-agent-skills | Anthropic — agent skills | memory | cited in same audit | **Referenced, never captured FULL** |
| 44 | artemxtech.substack.com/p/i-stopped-teaching-my-agent-who-i | Artem Zhutov — second brain learns me back | hermes/memory | self-learning-loop equiv capture | Captured (mirror) |
| 45 | dailydoseofds.com/p/hermes-agent-masterclass | Avi Chawla mirror | hermes | full-text source when cyril login-walled | Captured (mirror) |
| 46 | generativeprogrammer.com/p/how-teams-scale-claude-code-across | Bibryam full version | memory | Context Cascade full body | Captured (mirror) |
| 47 | github.com/itechmeat/open-second-brain | repo — nightly dream passes | hermes/memory | dream-pass + confidence-promotion gap | Pasted |
| 48 | github.com/Burgunthy/hermes-second-brain | repo | hermes | reference impl | Pasted |
| 49 | github.com/muratcankoylan/agent-skills-for-context-engineering | repo | memory | scoped-skill reference | Pasted |
| 50 | github.com/DeusData/codebase-memory-mcp | repo | memory | memory-MCP reference | Pasted |
| 51-55 | medium.com/…(4 overnight/harness)/ + thesequence.substack.com/p/…671 + interestingengineering.substack.com/p/the-prompt-is-still-the-work | overnight/dynamic-workflow mirrors | loops | mirrors of #2/#3 | Pasted |
| 56 | agentpedia.codes/blog/karpathy-claude-code-skills-guide | Karpathy skills guide | ai-systems | skills doctrine | Pasted (tangential) |

> **Un-ingested / genuinely ABSENT bodies (the honest backlog):** #15 dunik 4-layer (UNFETCHED, explicitly operator-requested); #24-26 RLanceMartin/IBuzovskyi/PawelHuryn (teaser-only); #30-34 the entire NN/GNN seed set (URL-only, zero body — PRISM's GNN knowledge is 100% self-derived); #40-41 operator X long-forms (unrecoverable); #42-43 Anthropic first-party context-engineering (referenced, never captured FULL).

---

## 4. Highest-ROI gaps (ranked, with concrete next actions)

1. **`/loop` eval-gate is self-reported, not enforced (the "slop machine" fix).** Loop rule 2 is currently a string the agent reports, not a real per-iteration test+scrutiny gate. **Next action:** convert `loop-state.mjs` auto-advance (`cmdTick`) to gate on actual test pass + scrutiny ledger entry before advancing; never auto-advance past an unverified iter. (X-ARTICLE-SYNERGY-AUDIT punch-list #2; owners india+golf.)

2. **CAG `cache_control` wiring — the single biggest measured cost lever.** `PromptCachingEngine.buildCachedSystem()` exists (28 tests) but the ~8 per-turn injectors don't call it — they re-emit static doctrine every turn, churning the message-level cache. **Next action:** route the 8 injectors' static blocks through `buildCachedSystem()` + move static→SessionStart (audit findings F1/F6); add CAG-skip telemetry (the 3 consumers increment *after* the skip return, so cold-hits read as 0-fire — you cannot currently *measure* the cold-hit rate). Target Claude Code's cited 92% hit-rate. This is wiring, not building (R8).

3. **H2GCN into the *production* GNN trainer (verified gap — heterophily refs in `graphsage-trainer.mjs` = 0 ✓).** The +0.138 AUROC lift lives only in `validate-heterophily-auroc.mjs`; the deploy path is heterophily-blind. **Next action:** port ego/neighbor separation into `graphsage-trainer.mjs` (BLACKWELL-AI-MS3), then GPU re-embed with H2GCN features on the live 3.13 Blackwell venv to break the embedding collapse (meanCosine 0.861). Pair with reference-pool growth (several dispatcher classes have poolSize 0). Multi-seed before any AUROC claim.

4. **Build `GalaxyAdapterFactoryEngine.ts` (ABSENT ✓) + a synthesis LoRA wiki page (ABSENT ✓) + run the staged fine-tune.** The 95-engine LoRA breadth is *forks*, not an adapter factory; the 746-row corpus is staged `training_ready:false`. **Next action:** (a) write `knowledge/wiki/architecture/lora-stack.md` documenting the vault→corpus→adapter chain (currently queryable only in memories); (b) build the factory to collapse the 67 forked per-domain engines; (c) wire a real QLoRA train path on the Blackwell GPU (QLoRA/DoRA/PiSSA/LoftQ = 0 in real code); (d) `configureStorePath()` before `XProcNeuralAutoFireEngine.activate()` so the closed-loop reward signal survives MCP restart.

5. **Port cyril's 7 Hermes skill prompts + add autonomous accumulation-counter triggers.** The 707-line `…one-system-FULL.md` contains 7 verbatim skill specs (morning-brief, inbox-processor, project-health, connection-finder, weekly-synthesis, research-converter, **thinking-partner**) — none ported to `.claude/commands/*.md`. PRISM triggers are event-based hooks, never accumulation counters (Hermes fires memory-review @10 turns, skill-review @15 tool-calls). **Next action:** port the **thinking-partner** skill first (highest-leverage: active tension/contradiction surfacing over `knowledge/memories/`); add a tool-call counter that fires `/forge-triple` at 5+ repeated tool-calls.

6. **Personal-capture inbox + webhook layer (cyril's #1 failure mode: capture friction >10s = you stop).** PRISM ingests engineering artifacts but has no friction-free personal-content capture (articles/podcasts/voice/bookmarks). **Next action:** ship `U-INBOX-LAYER` (`knowledge/memories/inbox/` staging) + `prism_intake:webhook_ingest` (Readwise/Telegram) + a daily *evening* consolidation cron (PRISM batches weekly via golf; both cyril and Hermes make it daily). Feed overnight loops into ONE morning review queue with the final action (approve/edit/flag) kept with the human.

7. **Capture the genuinely-absent bodies — close the corpus blind spots.** The NN/GNN seed set (#30-34) has zero captured body; dunik 4-layer (#15) and the two Anthropic context-engineering articles (#42-43) are referenced but never full-captured. **Next action:** use the proven `api.fxtwitter.com/<user>/status/<id>` embed workaround (validated in `reference_agentic_harness_articles_2026_06_09.md`) to capture #15 + #30-34; WebFetch the two Anthropic first-party articles into `state/shared/articles/`. This is the only way the GNN/context work gets external grounding instead of solely re-derived empirics.

8. **Operationalize Fable-5 + the honesty backstops that are documented-but-discretionary.** `2026-06-09-meta-alchemist-fable5-repo-audit-prompt.md` is captured with explicit PRISM-mapping notes but no `/repo-audit` skill wires it as a recurring fan-out; `fact-checker` invocation is discretionary (rody's named "never invoking the reviewer" anti-pattern); `stop_on_unwired_assets`/`PRISM_ALLOW_UNWIRED=1` bypass keeps the no-orphans guarantee advisory (memo-asserted; the project-`.claude/settings.json` grep was inconclusive this session — canonical settings live at C:/H: root, so treat the dormancy as **unverified-here**). **Next action:** wire Fable-5 as `/repo-audit`; add an advisory Stop-time fact-checker nudge when a session made unverified conversational claims; operator go/no-go on lifting the `PRISM_ALLOW_UNWIRED` bypass (R7 — surface, don't silently flip).