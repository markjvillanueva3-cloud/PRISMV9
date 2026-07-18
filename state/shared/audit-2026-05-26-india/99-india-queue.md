# India task queue — proposed (2026-05-26)

Article-incorporable units derived from the 8-audit master rollup. Each unit cites which audit finding it closes, which article it incorporates, and a smallest-scope first-cut definition. **Advisory only — operator picks**.

## Selection logic

- **P0** = broken closed-loop or operationally-dead system the fleet currently depends on
- **P1** = high-leverage system-wide gap (substrate-wide impact)
- **P2** = cleanup, debt drainage, follow-ups
- Ordered within each tier by smallest-scope-first

---

## P0 (4 units) — close the broken loops

### U-OBSIDIAN-FEED-RESURRECT
**Closes:** Audit 07 #2 (feed dead 20.6 days) · **Article:** dunik Layer-3 auto-replenish + Layer-4 dreaming target

`stop-obsidian-memory-feed.mjs` doctrine says auto-feeds every Stop. Live evidence (`obsidian-memory-sync-hook.log` mtime 2026-05-05) proves it has been silent for 3 weeks. Either the hook is unwired in settings.json, throws silently, or skips its own throttle.

Smallest scope:
1. Read `.claude/hooks/stop-obsidian-memory-feed.mjs` end-to-end
2. Verify wiring in BOTH `C:/Users/wompu/.claude/settings.json` and `H:/.claude/settings.json` (Stop chain)
3. Run it manually with verbose; capture exit code + log path
4. Add a liveness probe (`state/shared/obsidian-feed-liveness.json` mtime stamp on every successful copy)
5. Wire a Stop-hook gate that surfaces if liveness > 6h stale
6. **Article-1 safety rule: writes to `<file>.new.md` first; never in-place** — verify or add

### U-VIZ-REGEN-HEAP-FIX
**Closes:** Audit 07 #1 (regen dead 62h, banner shows 2.2h via mtime of corrupted partial-write) · **Article:** dunik Layer-3 — discoverability of the substrate the fleet reads from is itself dependent on a healthy graph

Smallest scope:
1. Read `regen-viz.mjs` + `scripts/lib/merge-augmentations.mjs` head
2. Identify the in-memory hot spot (54 generators × 496MB graph in one V8 process)
3. Stream-merge: iterate generators, append-write to a temp JSON, never hold the full graph in heap
4. Banner should read `state/shared/system-viz/.last-successful-regen.json` (touch-on-success), not `system-graph.json` mtime — fixes false-positive
5. Restart durable regen task

### U-META-LEARNING-WIRE
**Closes:** Audit 04 #1 (meta-learning-trigger.mjs DISABLED, Layer-4 closed loop broken) · **Article:** dunik Layer-4 dreaming — direct map. KIP outcome recorder (P0 below) is the input; meta-learning is the consolidator

Smallest scope:
1. Grep `meta-learning-trigger` in `H:/.claude/settings.json` and `C:/Users/wompu/.claude/settings.json`
2. Read the commented-out hook entry; understand why it was disabled
3. Re-enable with the article-1 safety rule: NEW-file output (`META_LEARNING_LEDGER.new.jsonl`) + review-gate (operator promotes after diff)
4. Run once manually; verify `META_LEARNING_LEDGER.jsonl` grows past 338 bytes

### U-CAG-01-soul-to-sessionstart
**Closes:** Audit 03 highest-ROI cold candidate · **Article:** akshay CAG cold/hot split — cheapest first win

`slot-soul-inject` is pure-cold (frozen per slot, ~400 tokens × every prompt). It's currently the cheapest substrate-wide token saving in PRISM. The engine to wrap it (`PromptCachingEngine.buildCachedSystem()` / `wrapSystemPrompt()`) is built + 28-test verified.

Smallest scope:
1. Add a one-time SessionStart injection that routes `slot-soul-inject` content through `PromptCachingEngine.buildCachedSystem()`
2. Suppress the UserPromptSubmit `slot-soul-inject` on subsequent prompts (knob already exists: `PRISM_SLOT_SOUL_INJECT_DISABLE=1`)
3. Measure delta with `scripts/audit-hook-stack-cost.mjs` baseline diff
4. If win > 200 tokens/prompt, extend to `slot-context-bundle-inject` (also pure-cold per slot)

---

## P1 (6 units) — high-leverage substrate fixes

### U-KIP-OUTCOME-RECORDER
**Closes:** Audit 06 #1 (KIP outcome ledger empty) · **Article:** dunik Layer-4 input feed

KIP shipped 2026-05-17 with `plan→inject→recordOutcome` cycle but `kip-*.jsonl` / `knowledge-injection*.jsonl` don't exist. Wire `recordOutcome` callsites to actually append. Without this, U-META-LEARNING-WIRE has nothing to consume.

### U-CAG-02-telemetry-channel
**Closes:** Audit 03 + AUDIT-2026-05-16 F6 · **Article:** akshay 92% cache-hit-rate measurement

`PromptCachingEngine.getStats()` already tracks hit_rate internally. Surface as atomic-write sidecar (`state/shared/dashboards/prompt-cache-stats.jsonl`) via the same per-PID-temp+rename pattern as TOKEN-SAVINGS-PIVOT. Required to make F1's number commitable.

### U-CAG-03-static-slice-extract
**Closes:** Audit 03 + AUDIT-2026-05-16 F1 mid-slice · **Article:** akshay cold/hot split

Carve cold portions (graph dump, BM25 vocab, leaf-index head) of `master-index-precheck-inject` + `wiki-precheck-inject` into SessionStart cached blocks. Keep per-prompt rerank hot. Estimated ~800→~80 tok/prompt × every hot prompt × every chat × every session.

### U-LORA-MASTER-CORPUS-TRAINER
**Closes:** Audit 02 #3 (CAM-AI-TRAINING-MS0 3,766 tuples, NO trainer wired) · **Article:** akshay CAG = bake-in static, then retrieve dynamic — LoRA fine-tune is the bake-in step

Wire a real trainer to the CAM-AI MASTER corpus (`cam-master-split-summary.json` 3,206/560 stratified). 8 per-track adapters (cam_roughing, cam_finishing, cam_engraving, cam_drilling, cam_chamfer, cam_milling_3d, cam_threading, cam_facing). Each adapter emits NEW-file shadow tier first; promotion gate is operator-driven.

### U-NN-EVAL-REFRESH
**Closes:** Audit 01 #2 (NN-EVAL frozen at AUROC 0.0961, candidate at 0.6129) · **Article:** akshay metric measurement; dunik R12 — surface the real number

Emit `latest-candidate.json` sidecar (touch-on-retrain) with most-recent candidate metrics. SessionStart banner reads sidecar, not stale `NN-EVAL.json`. CLAUDE.md NN-GRAPH paragraph also needs back-edit (false-positive on `U-NN-PREDICTOR-EMBED-WIRE`).

### U-BRIDGE-STATUS-RESOLVER
**Closes:** Audit 08 #3 (42 bridge units all `status:unknown` despite 50 git commits) · **Article:** dunik Layer-3 lean — bridges are forever "remaining" because the consolidator has no signal

In `consolidate-roadmaps.mjs`, add a git-log scan (`BRIDGE-*` commit prefix → status `completed_real`) before emitting ROADMAP-CONSOLIDATED. Auto-resolves the 6 SFC deep-integration shipments + 37 wiring batches.

---

## P2 (5 units) — cleanup + debt drainage

### U-AWARENESS-SNAPSHOT-CRON
**Closes:** Audit 08 #1 (snapshot 2 days stale, conflicts with BUILD_STATE)

Durable Windows task triggered on `BUILD_STATE.json` mtime change. ~3s regen.

### U-LORA-DRIFT-MONITOR-REAL
**Closes:** Audit 02 #2 (`lora_drift_check_all_clear` vacuously clear)

`CAMFeedbackLoopEngine.recordOutcome` emits `lora_drift_record`. Coordinator sees real samples.

### U-FLEET-LEARNING-CONSOLIDATOR
**Closes:** Audit 08 #4 (cross-slot 1/25 learning rate) · **Article:** dunik Layer-4 dreaming — "consolidates patterns across many sessions"

Golf cron drains per-slot loop-state into `FLEET-PATTERNS.json`. Read at next `/checkin`. Each slot starts with the prior 24h fleet-wide pattern set.

### U-WIKI-LINK-CLEAN-LEGACY-ROOT
**Closes:** Audit 07 #4 (4,136 broken links, mostly `_legacy-root/` debris)

One-time pass: rewrite broken `_legacy-root/` pointers + delete 3 dead pointers in `_index/MEMORY.md`. Drops fleet-wide warn banner.

### U-DEEP-REASON-STUB-AUDIT
**Closes:** Audit 04 #2 (26 R12-violation stubs in aiReasoningDispatcher)

Classify the 26 stubs: (a) genuinely unimplementable → delete from dispatcher; (b) just-missing-binding → wire; (c) speculative → tag `// R12-EXEMPT: speculative` with rationale. No silent fake-success envelopes.

---

## Pickup order recommendation for india

Per the user's "fully system training" framing + Karpathy R3 (surgical, smallest-scope-first):

1. **U-CAG-01-soul-to-sessionstart** — 1-2 hour scope, immediate measurable win, validates the PromptCachingEngine wiring pattern. Foundation for U-CAG-02 + U-CAG-03.
2. **U-OBSIDIAN-FEED-RESURRECT** — Layer-3 auto-feed restoration. Blocks fleet-wide brain growth otherwise.
3. **U-META-LEARNING-WIRE** + **U-KIP-OUTCOME-RECORDER** (paired) — close Layer-4 dreaming loop end-to-end. Together they make "system loop self-training" actually self-train.
4. **U-VIZ-REGEN-HEAP-FIX** — fleet discoverability. Probably needs subagent with isolation:worktree for the streaming-merge refactor.
5. After P0s shipped: P1s in listed order.

## Notes

- Every unit emits a NEW-file artifact first (Article 1 mistake #4 prevention).
- Every unit ships its own ≤200-word wiki entry (per `feedback_reflect_all_changes_post_update`).
- F1/F6 will be considered closed by U-CAG-01+02+03 trio (with `audit-token-context-memory-2026-05-16` updated to mark them).
- The 20 R12-violation findings in master rollup are the audit's evidence base — every cited finding has a file path + a line number trail in the per-audit reports.
