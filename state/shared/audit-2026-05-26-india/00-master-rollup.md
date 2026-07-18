# India substrate audit — master rollup (2026-05-26)

8 parallel agents audited PRISM's AI/NN/GNN/LoRA/RAG/CAG/deep-learn/deep-reason/pipeline-gen/system-loop-self-train/system-viz/PSN/Obsidian/wiki/memory/awareness/bridges/synergy substrate. Findings classified by P-tier with article-incorporation mapping.

## Karpathy R12 — fail-loud findings (in confidence order)

| # | Area | Finding | Severity | Audit |
|---|---|---|---|---|
| 1 | /system-viz | **Regen dead 62h, banner shows 2.2h via mtime of corrupted 542MB partial-write.** V8 SIGABRT at merge-augmentations (496MB graph + 54 generators ≥ 4GB heap). Fleet warming on a stale corrupted graph | **P0** | 07 |
| 2 | Obsidian | **Memory-feed Stop hook dead 20.6 days** (`obsidian-memory-sync-hook.log` mtime 2026-05-05). Doctrine says "auto-feeds every Stop" — false | **P0** | 07 |
| 3 | Deep-reason | **`meta-learning-trigger.mjs` DISABLED in settings.json** (commented since 2026-05-10). `META_LEARNING_LEDGER.jsonl` = 338 bytes. `dev-outcomes.jsonl` = 587KB never fed back. Layer-4 closed loop broken | **P0** | 04 |
| 4 | RAG/CAG | **PromptCachingEngine (28 tests, AGENT-MS5 U-AGT19) wired to `prism_dev` MCP but to ZERO `.claude/hooks/*.mjs`.** AUDIT-2026-05-16 F1 unbridged — the static doctrine churn is between built engine and live hook chain | **P0** | 03 |
| 5 | LoRA | **245 LoRA dispatcher actions exist; runtime is empty.** Zero adapters ever entered shadow→canary→active. WEDM `samples:0, deployed:false`. CAM-AI-TRAINING-MS0 corpus (3,766 tuples shipped 5/26 kilo) has NO consumer wired | **P0** | 02 |
| 6 | System-loop | **KIP shipped 2026-05-17 — outcome ledger empty.** `kip-*.jsonl` doesn't exist. `recordOutcome` is the closing function and nothing records. All 5 autopilot commits are *building* autopilot, none autonomously committed by it | **P0** | 06 |
| 7 | Awareness | **AWARENESS-SNAPSHOT 2 days stale + conflicts with BUILD_STATE.** Inject says "593 NEEDS_WIRING" (5/24), BUILD_STATE.json says "148" (today 05:50). Every chat warms up with 4× wrong numbers | **P1** | 08 |
| 8 | Bridges | **42 bridge units all `status:unknown` in ROADMAP-CONSOLIDATED** despite 50 BRIDGE-* commits in git (6 SFC deep-integration shipped — Fusion / hyperMILL / InventorHSM / SolidWorks). Consolidator never resolves against git | **P1** | 08 |
| 9 | Pipeline-gen | **18-stage print-to-part pipeline defined ONLY in wiki**, not in code. No `STAGES` constant in `mcp-server/src/`. Per-domain `rgs-pipeline-rules-{mill,lathe,wedm,cam,cad}.mjs` files DON'T EXIST — only monolith | **P1** | 05 |
| 10 | NN/GNN | **NN-EVAL.json frozen at AUROC 0.0961 (2026-05-16).** Live 768d retrain (2026-05-25T20:56) measured 0.6129 — promotion-gate-pending, but eval surface is misleading | **P1** | 01 |
| 11 | LoRA | **`lora_drift_check_all_clear` returns "clear" vacuously** — `CAM_ML_DRIFT_LOG.jsonl` has 1 line (15 samples, 2026-04-21). `CAMFeedbackLoopEngine.recordOutcome` doesn't emit `lora_drift_record` — coordinator has nothing to detect | **P1** | 02 |
| 12 | Deep-reason | **26 silent R12-violation stubs** in `aiReasoningDispatcher.ts`: pattern `(engine as any).method?.(params) ?? { note: "method not callable" }` — fake-success envelopes. Worst: `chain_executor_execute`, `inference_chain_run` | **P1** | 04 |
| 13 | Synergy | **Cross-slot consolidation gap.** 25 work slots run `/loop` independently — no consolidator drains per-slot loop-state into one cleaner fleet memory. Each slot learns at 1/25 rate | **P1** | 08 |
| 14 | RGS | **RGS sidecar 8.2% coverage** — 363 plans vs documented 4,404. `degraded` flag present, 31.6h stale | **P1** | 05 |
| 15 | PSN | **PSN leg-state NOT persisted** — `state/shared/psn/` has only `cad-action-nodes.jsonl`. `psn-leg-state-inject` recomputes 6 legs per UserPromptSubmit from raw stat calls (no cache) | **P2** | 07 |
| 16 | Wiki | **4,136 broken links** (4.2%) — mostly `_legacy-root/` migration debris + 3 dead pointers in `_index/MEMORY.md` itself | **P2** | 07 |
| 17 | Wiki | **38+ leaked `.tmp` files** reveal atomic-write race in tribal-embed/system-viz writer | **P2** | 07 |
| 18 | Awareness | **120 silent close-out candidates** clean-able with `close-out-milestone.mjs` — envelopes claim `not_started`, git says `completed_real` | **P2** | 08 |
| 19 | RaBitQ | **R12 violation** — `embeddings_rabitq_{build,search,status}` advertised in tool descriptions but zero matches in any dispatcher. Only `QuantizationProfileEngine.ts` (profile selector) exists | **P2** | 03 |
| 20 | CLAUDE.md | **Stale claim** — `U-NN-TRAINER-EXPORT-RESTORE` cited as "P0 follow-up" but is actually CLOSED (exports present at `scripts/lib/graphsage-trainer.mjs` L141/L204; 4 successful retrains since 2026-05-22 prove it) | **P3** | 01 |

## Article incorporation map — dunik_7 (4-layer memory) × akshay_pachaar (RAG/CAG)

### Layer 1 (Sticky note) — present ✓
User CLAUDE.md + project CLAUDE.md set preferences. No gap.

### Layer 2 (Project) — present ✓ but **incomplete handoff bridging**
Per-chat handoff system + chat-slots covers the "Projects persist instructions, not history" trap. India's history bridge works.

### Layer 3 (Living memory file) — **MULTIPLE GAPS**
- Auto-feed dead 20.6 days (Audit 07) → Layer 3 not auto-replenishing
- `MEMORY.md` 24KB hard ceiling already hit (compress saved 134B today) → bloat already at the wall
- No write-time filter ("would this change behavior next time?") at the auto-feed callsite → article 1 mistake #3 active

### Layer 4 (Consolidator / "dreaming") — **MULTIPLE BROKEN LOOPS**
- meta-learning-trigger DISABLED (Audit 04) — Layer 4 hook physically commented out
- KIP zero-recording (Audit 06) — consolidator has no outcomes to consume
- NightlyLearner cron NOT scheduled (Audit 06) — dreaming process never runs
- No NEW-file + review-gate on existing consolidators → article 1 mistake #4 risk

### CAG (cold/hot split + cache hit-rate) — **ENGINE BUILT, NOT WIRED**
- PromptCachingEngine exists (28 tests, AGENT-MS5 U-AGT19) — engine layer ✓
- Zero hook callsites — wiring gap = Audit 03 finding #1
- No cache-hit telemetry sidecar (F6 open) — magnitude uncalibrated
- 8 injectors classified: 1 pure-cold (slot-soul, easy win), 5 mixed, 2 pure-hot

## Cross-references
- Origin audit (juliett 2026-05-16): `audit-token-context-memory-2026-05-16` F1+F6 open
- Today's article synthesis (india 2026-05-26): `article-synthesis-memory-cag-2026-05-26`
- Reference memory: `reference_articles_memory_cag_2026_05_26`
