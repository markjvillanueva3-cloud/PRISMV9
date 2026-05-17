# SLOT PICKUPS — 12-chat queue from JULIETT-CONSOLIDATED-WORK-PLAN-2026-05-17

> Grep your NATO slot name (e.g. `## SLOT: ALPHA`) to find your queue. Items in priority order. P0 first. Full plan: `state/shared/specs/JULIETT-CONSOLIDATED-WORK-PLAN-2026-05-17.md`.
> Each item has an ID, verify command, and rough activation cost. Skip items where a peer holds an active file claim — coordinate via chat-bus.
> **Bridge-layer items (Category 9) are gated on `node H:/prism/scripts/validate-unwired-signal.mjs` re-run.** No wiring until fresh false-positive % published.

---

## SLOT: ALPHA
Lane: system-viz / orchestration / NN unblock / loop-fix

1. **P0 — U-UTIL-CLASSIFIER-FIX** — fix degenerate utilization classifier (every chat misprioritizing on 0-orphan false signal). Files: `scripts/augment-graph-with-awareness.mjs` + `scripts/regen-viz.mjs`. Verify: `node scripts/node-staleness-rank.mjs --json | jq '.utilization.orphan,.utilization.classifierDegenerate'` → >0 AND false.
2. **P0 — U-STOP-FORCE-LOOP-1LINE** — `stop-force-loop-continue.mjs:174` `"active"` → `"running"`. Verify: `grep 'loop.status' .claude/hooks/stop-force-loop-continue.mjs` reads `!== "running"`.
3. **U-BRIDGE-VALIDATE-RERUN** — gate for all Category 9 work: `node scripts/validate-unwired-signal.mjs`; publish fresh false-positive %. Verify: report exists with timestamp >2026-05-17.
4. **U-DRIFT-GATE-VERIFY** — confirm `regen-viz.mjs --drift-gate-only` gates CI cleanly.
5. **U-DSL-COVERAGE-AUDIT** — audit dead DSL codes in CODE_SYSTEM_INDEX.
6. **U-NEG-SAMPLE-STRATIFIED** (NN unblock) — layer-stratified negative sampling, unblocks NN-GRAPH-MS0 tier-5. Verify: AUROC > 0.5.
7. **U-BRIDGE-AI-TIER1-TIER2** + **U-BRIDGE-AI-TIER2-TIER3** (deep-integration) — orchestration tier wiring; blocker check first.
8. **Category 9 wiring** post-gate: Other (144), Multi (10), Process (6), Speed (4), Five (9). LongTail batch parallel.

---

## SLOT: BRAVO
Lane: memory / MEMORY.md / model-router / RTK / claude.md drift

1. **P0 — U-MEMORY-WATCH-WIRE** — wire `scripts/memory-size-watch.mjs` to `/loop --interval 1d` (Stop hook is wired by U-OBS-B1; loop binding missing, compression durability incomplete). Verify: scheduled task exists; memory-size advisory fires daily.
2. **U-MEMORY-RELEVANCE-FIX** — fix MEMORY_DIR path derivation in `memory-relevance-inject.mjs` (currently 0% fleet recall — audit commit 2a5b60cfd4 fix didn't land). Verify: recall test surfaces ≥1 hit.
3. **U-F4-MODEL-ROUTER** — build `scripts/lib/agent-model-router.mjs` (Sonnet for reviewers, Haiku for analyzer, Opus for synthesis). Hard cap `PRISM_REVIEWER_MAX_PARALLEL=3`. Verify: model overrides present in Agent spawn calls.
4. **U-B4-MEMORY-INDEX-VALIDATOR** — Stop hook validates MEMORY.md `[[backlink]]` files exist; fail if >2 stale. Verify: hook fires + ledger entry.
5. **U-P4-RTK-AUTO-WRAP** — RTK doc-sync + hook cascade activation.
6. **U-C8-CHECKIN-AUDIT** — grep CLAUDE.md + wiki for pre-slot-worktree `/checkin` references; clarify deprecation.

---

## SLOT: CHARLIE
Lane: obsidian / wiki bootstrap / memory engines / doctrine (in-flight)

1. **CONTINUE IN-FLIGHT** — `feedback_dont_wire_for_wiring_sake_2026_05_16.md` doctrine completion. Blocks U-ERROR-LEARN-5-WIRE; ship doctrine before kilo wires more.
2. **U-WIKI-BOOTSTRAP-RUN** — refresh wiki/index.md confidence scores (currently generic 0.7).
3. **U-MEMORY-CONSOLIDATION-WIRE** — wire `MemoryConsolidationEngine` to dispatcher.
4. **U-MEMORY-GRAPH-WIRE** — wire `MemoryGraphEngine` to dispatcher.
5. **U-OBSIDIAN-VAULT-AUDIT** — stale wiki audit (≥30-day-old entries without recent edits).

---

## SLOT: DELTA
Lane: tribal / outcome / consensus / Outcome bridges

1. **P0 — U-TRIBAL-EMBED-SYMLINK** — re-symlink `mcp-server/data/tribal-embed-index.json` → `state/shared/` (currently 0 bytes; tribal-by-domain-inject silently no-ops). Verify: `wc -c state/shared/tribal-embed-index.json` > 0.
2. **U-TRIBAL-ENGINE-WIRE** — wire `TribalKnowledgeEngine` (referenced only in validation rule, no invoker).
3. **Category 9 post-gate** — Tribal (4), Outcome (8), Consensus (6) domain wiring.
4. **U-COURSE-TRIBAL-PIPELINE-GATE** — coordinate with mike on C7 ingest gate (course-to-tribal-tips quality pre-publish).

---

## SLOT: ECHO
Lane: audit / drift / doc-backflow / context-util / regressions archival

1. **P0 — U-B1-DOC-BACKFLOW-WATCH** — Stop hook fails any commit touching engines/hooks/skills without updating ≥1 doc surface (CLAUDE.md / MEMORY.md index / wiki entry / skill frontmatter). **Highest-leverage META fix in the entire plan.** Prevents 80% of recurring regression class. Verify: synthetic commit without doc touch is blocked.
2. **U-F6-CONTEXT-AUDIT** — build `scripts/context-utilization-audit.mjs` (measures inject-blocks-never-referenced; calibration channel for F1).
3. **U-DRIFT-FIX** — reconcile 30 drifted milestones via `/envelope-drift-fix`. Verify: `node scripts/audit-roadmap-drift.mjs --json | jq '.drifted | length'` < 5.
4. **U-A4-WIKI-BACKFLOW-WATCH** — wiki-index drift detector.
5. **U-A6-WIRING-AUDIT-STOP-GATE** — wire `harness-wiring-audit.mjs` to Stop[16] with exit non-zero on severity>warn.
6. **U-C9A-REGRESSIONS-ARCHIVE** — establish archival rule for FIXED ledger entries (>2 days verified → `REGRESSIONS_ARCHIVE_2026-05.md`).
7. **U-B3-CLAUDE-MD-DRIFT** — UserPromptSubmit advisory for duplicated sections across global + project CLAUDE.md.
8. **U-MASTER-INDEX-CACHE-STRESS** — validate master-index mtime-cache invalidates on `regen-viz` runs.
9. (later) **U-FORGE-AUDIT-OMNISCIENT** — upgrade /forge-audit to conductor pattern (~1000 LOC, 7 files). Deferred unless echo has bandwidth after the above.

---

## SLOT: FOXTROT
Lane: Ollama / Docker / dev-tools / META scripts (HEAVIEST QUEUE — 14 items)

1. **P0 — U-DOCKER-RECOVERY** — Docker engine DOWN this session, blocks 5 services + auto-injects "Missing: docker" into every chat. Build PostToolUse / cron-style recovery + /checkin alert. Verify: docker engine reachable; `ollama-docker-launcher` autostart succeeds.
2. **U-OLLAMA-CLASSIFIER-DIAG** — diagnose + rebuild `OFFLOADABLE_PATTERNS` regex (telemetry shows 5 consecutive `decision=keep, cat=unknown`; offloader fires but routes 0% to local). Verify: `node scripts/ollama-offload-dashboard.mjs` shows `decision=offload` events.
3. **COORDINATE** — F2-R1 owned by `claude-773c6214` (3m claim at last check); coordinate before R2/R4/R5.
4. **U-F2-R5** — auto-execute Ollama for `{summary, format_convert, prism_inventory, prism_introspect, classification}` in `ollama-task-offloader.mjs:441`.
5. **U-F2-R2** — lower `INJECT_THRESHOLD` 0.90 → 0.80 in `:56`.
6. **U-F2-R4** — rate-limit 5min → 60s in `:54`.
7. **U-SYNERGY-WATCH-WIRE** — wire `scripts/synergy-regression-watch.mjs` to `/loop --interval 1d`.
8. **U-DEV-TOOL-LEVERAGE-SKILL** — wire `/dev-tool-leverage` skill (runbook aggregator).
9. **U-HOOK-FIRE-RANK** — wire empirical hook fire-rate ranker (operator visibility).
10. **U-F2-META-RANK** — build `stale-milestone-rank.mjs` (150 LOC; F2 from AUDIT-DEV-TOOLS).
11. **U-F3-HOOK-PROFILER** — build `hook-overhead-profiler.mjs` (120 LOC).
12. **U-F3-UNWIRED-RANK** — build `unwired-engine-leverage-rank.mjs` (180 LOC).
13. **U-F3-COLD-SCRIPT-RANK** — build `cold-script-rank.mjs` (100 LOC).
14. **U-OLLAMA-13-WIRE** — wire 13 unwired Ollama hooks (route-recommender, skill-suggester, context-aggregator, obsidian-rag, etc.) AFTER smoke tests. **CARE:** U-OLLAMA-REVIEWER-WIRE is T0 BLOCKER tier — smoke test first.
15. **U-F1-SPLIT** — static/dynamic split in 3 injectors (paired with echo's F6).
16. **Category 9 post-gate** — Turning (11), Swiss (6), Shop (9). Plus U-BRIDGE-LEARN-SFC after gate + SFC stability check.

---

## SLOT: HOTEL
Lane: CAD bridges / IntentClassifier / Voice-capture continuation

1. **CONTINUE IN-FLIGHT** — voice-capture / Whisper work (per chat-bus claude-a2b1b5ca activity).
2. **U-INTENT-WIRE** — wrap `IntentClassifierEngine` in `prism_session:classify_intent` action (BUILT, WIRE-EXEMPT, 1 day).
3. **U-BRIDGE-SFC-FUSION** (deep-integration) — SFC → Fusion 360 toolpath. Blocker check: SFC stable? Fusion CAM engine ready?
4. **U-BRIDGE-SFC-ESPRIT** — SFC → Esprit. Blocker: Esprit bridge exists?
5. **U-BRIDGE-SFC-INVENTORHSM** — SFC → Inventor HSM.
6. **U-BRIDGE-SFC-SOLIDWORKS** — SFC → SolidWorks CAM.
7. **U-BRIDGE-CAD-CAM-HANDOFF** (joint with lima) — CAD-AI → CAM-AI autonomous handoff.
8. **Category 9 post-gate** — Fusion (7) domain wiring.

---

## SLOT: INDIA
Lane: tribal-graph / 326-quarantine triage / course-data-router

1. **CONTINUE IN-FLIGHT** — course-data-router work (claude-41db1b82 active claims).
2. **TRIBAL-GRAPH-MS0 continuation** — content mining ADVISORY queue (never auto-build).
3. **U-TRIBAL-CONSOLIDATE-CRON** — wire `tribal-consolidate-weekly.mjs` to cron.
4. **326-quarantine triage** — partner with mike on `U-C7-INGEST-GATE`; decide individual re-curate vs bulk-delete-after-grace.

---

## SLOT: JULIETT
Lane: roadmap-consolidation MS1 (this chat — operator already chose this lane)

1. **U-MS1-ENVELOPE** — create `mcp-server/data/milestones/ROADMAP-CONSOLIDATION-MS1.json` formalizing the lane (refresh cadence + prose-to-envelope + drift fix + misc triage scopes).
2. **U-MS1-REFRESH-CRON** — wrapper around `consolidate-roadmaps.mjs` (6h cadence, delta-report, auto-commit-if-small / approve-if-large).
3. **24h re-audit schedule** — `/schedule` or `/loop --interval 1d` rerun of THIS plan generation; diff against shipped commits.
4. **Boris peer-review (PENDING)** — spawn reviewer agent on the plan; apply findings → plan v1.1.

---

## SLOT: KILO
Lane: hook-wiring auditor / skill-triggers / dispatcher digest parser

1. **U-BUNDLE-CHILD-FIX** — fix `posttool-edit-bundle.mjs:46-47` refs (`${HOOK_BASE}/build-cache-manager.mjs` + `${HOOK_BASE}/build-tracker.mjs` both live in `helpers/`). Verify: runtime smoke test passes.
2. **U-B2-SKILL-TRIGGER-AUTO** — Stop hook auto-invoke of `extract-skill-triggers.mjs` post-build; fail if ledger diverges >5 entries from reality.
3. **U-AAM04-FOLLOWUP** — scope-aware parser (separate `scopeMismatch` diagnostic). Verify: scope-mismatches surface as their own severity.
4. **U-A6-WIRING-AUDIT-STOP-GATE** — wire `harness-wiring-audit.mjs` to Stop[16] with exit non-zero on severity>warn. (Pair with echo if echo claims first.)
5. **U-C9B-DIGEST-PARSER-FIX** — fix DISPATCHER_DIGEST parser to read `z.enum([...A, ...B] as const)` spread arrays (4 dispatchers wrongly show 0 actions). Verify: `node scripts/high-value-additions-rank.mjs --json | jq '.dispatchers.digestParserBroken'` → false.
6. **U-ERROR-LEARN-5-WIRE (HOLD)** — 5 unwired error-learn hooks. **DO NOT proceed until charlie's `feedback_dont_wire_for_wiring_sake_2026_05_16.md` doctrine ships.**
7. Coordinate with mike on **U-ORPHAN-HOOK-TRIAGE** (353 orphan hooks).

---

## SLOT: LIMA
Lane: CAM bridges / Mill/Lathe/WEDM domain wiring / Master Post (HEAVIEST WIRING — 12 items, all post-gate)

1. **U-BRIDGE-SFC-HYPERMILL** — SFC → hyperMILL cycle params.
2. **U-BRIDGE-SFC-MASTERCAM** — SFC → Mastercam operation params.
3. **U-BRIDGE-MASTERPOST-CAM** — Master Post → all 6 CAM bridges. Blocker: Master post unified? Which CAM post-gen engines wired?
4. **U-BRIDGE-LEARN-CAM** — learning → CAM strategy selectors. Blocker: strategy selector API stable?
5. **U-BRIDGE-CAD-CAM-HANDOFF** (joint with hotel) — autonomous CAD → CAM flow.
6. **U-PROSE-TO-ENVELOPE** (partial) — promote domain-specific REVENUE-ROADMAP-v7.6 prose units to envelope homes (split with echo).
7. **U-CONSENSUS-RECALL-ACTIVATE** — activate `ConsensusRecallCacheEngine` in response callback chain.
8. **Category 9 post-gate** — Hyper (7), Milling (7), Mill (4), Mastercam (5), WET (7), Wire (6), Electrode (4), Okuma (4), Machine (17), Tool (9). PRISM-app filter on Lathe (89) before any wiring.

---

## SLOT: MIKE
Lane: OBSOLESCENCE-CLEANUP-MS0 continuation / dangling-refs / MISC-tasks / doc cleanup

1. **P0 — U-DANGLING-REFS-REMOVE** — remove 6 dangling settings.json refs (`context-economy-v2`, `context-pressure-tracker`, `posttooluse-compressor`, `read-optimizer`, `rtk-reminder`, `test-run-gate`). Verify: `node scripts/harness-wiring-audit.mjs | jq '.dangling | length'` = 0.
2. **U-C7-INGEST-GATE** — gate `auto-ingested-tips.ts` ingestor behind quality threshold (title ≥ 5 chars, body min-length, source validation) BEFORE re-publishing. Else 326-file quarantine re-grows. Verify: next ingest run rejects malformed tips.
3. **U-A3-CLAUDE-MD-COLLAPSE** — fold project `H:/prism/CLAUDE.md` §EXPERT ROLE + §ENFORCEMENT into pointer to global `H:/.claude/CLAUDE.md`. Stop the silent divergence.
4. **U-MISC-TRIAGE** — triage 318 MISC-TASKS orphans (close / envelope / drop decisions in batches).
5. **U-ORPHAN-HOOK-TRIAGE** (paired with kilo) — classify 353 orphan hooks: legit-helper vs dead-code vs misplaced.
6. **U-ENVELOPE-DRIFT-TRIAGE** — work the 12 dry-run envelope-drift advisories (1 per session, human-verify each).
7. **U-BRIDGE-PRISM-APP-FILTER** (paired with alpha) — per-engine assessment for Lathe (89), Mobile (5), Print (6) before any wiring.
8. Coordinate with delta on tribal-ingest gate; coordinate with kilo on orphan-hook reclassification.

---

## ~~SLOT: GOLF~~ — EXCLUDED PER OPERATOR DIRECTIVE
Golf is reserved for fleet-reaper + system performance monitoring only. Do not assign work here.

---

## CROSS-SLOT COORDINATION SUMMARY

| Coordination | Slots | Item |
|--------------|-------|------|
| Validate-unwired-signal gate | alpha + all wiring slots | block Category 9 until re-run |
| Doctrine decision (wire-on-need vs wire-by-default) | charlie blocks kilo | U-ERROR-LEARN-5-WIRE held |
| F2-R1 already owned by claude-773c6214 | foxtrot waits | check chat-bus before next R-* |
| F1 paired with F6 | foxtrot + echo | calibration channel |
| Bundle child refs | kilo + helpers move | C2 fix |
| Orphan hook triage | kilo + mike | shared 353 pool |
| Tribal ingest gate | delta + mike + india | C7 ingest gate + 326 quarantine triage |
| CAD-CAM handoff | hotel + lima | bridge joint |
| Prose-to-envelope | echo + lima | distributed 969 units |

---

## VERIFICATION QUICK LIST

```bash
# Pickup
cat H:/prism/state/shared/specs/SLOT-PICKUPS-ALL.md | grep -A 50 "## SLOT: $(echo $YOUR_SLOT | tr a-z A-Z)"

# Headline alerts (any slot)
node H:/prism/scripts/memory-size-watch.mjs --json | jq '.bytes,.pctOfCeiling,.status'
node H:/prism/scripts/ollama-offload-dashboard.mjs --json | jq '.totals|(.offloaded/(.offloaded+.keptOnClaude))'
node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.utilization.orphan'

# Pre-bridge gate
node H:/prism/scripts/validate-unwired-signal.mjs

# Wiring + drift
node H:/prism/scripts/harness-wiring-audit.mjs
node H:/prism/scripts/audit-roadmap-drift.mjs
```
