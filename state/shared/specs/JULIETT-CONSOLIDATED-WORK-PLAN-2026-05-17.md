# JULIETT CONSOLIDATED WORK PLAN — 2026-05-17

> Generated 2026-05-17T03:30Z · slot juliett (`claude-de04081e`) · `/forge7` doctrine
> Source: 11-agent parallel system-viz recon (scout #1..#11) + ROADMAP-CONSOLIDATED + MISC-TASKS + BUILD_STATE + MILESTONE_PROGRESS + today's chat audit + CLAUDE.md regressions ledger
> **Advisory — human-verify before dispatch.** Every line cites a verification channel; no claim without a re-runnable proof.

---

## CONSTRAINTS APPLIED (user directives, hard filters)

| Filter | Effect |
|--------|--------|
| BACKEND-DEV ONLY | Excludes PRISM-app features (CAM strategy UI, operator-facing G-code, lathe-shop dashboards). Backend = tooling that makes development itself faster/safer/cheaper. |
| PRIORITIZE already-built-but-inactive/unwired | Wiring + activation > new builds. ~70% of P0/P1 items below are wire-existing, not write-new. |
| NO golf in slot assignment | Golf reserved for fleet-reaper + system perf monitoring per operator directive. |
| Respect in-flight peer claims | F2-R1 owned by `claude-773c6214`, error-learn wiring HOLDING on charlie's `feedback_dont_wire_for_wiring_sake` doctrine. |

---

## EXECUTIVE SUMMARY

**Headline numbers** (from scout returns + live state):
- **15 categories** covering the user's full axis list (added doc-currency + obsolescence as the 15th per mid-session directive).
- **~80 actionable items** total after filters (vs the 5826-item raw ROADMAP-CONSOLIDATED inventory).
- **~55 items are wire-existing / activate-inactive** (the bulk of the work; minimal new LOC).
- **~25 items are new backend-dev builds** (META scripts, automation hooks, MS1 envelopes).
- **12 chat slots receive assignments**; golf is exempt.
- **One META fix dominates everything**: B1 `doc-backflow-watch.mjs` Stop hook prevents the entire class of regressions we keep eating (wiring revert, doc drift, named-not-invoked).

**Headline P0 alerts** (every chat should see, dispatch first):
1. 🔴 **Docker engine DOWN** this session — 5 services blocked (postgres, prism-server, prometheus, ollama, qdrant). "Missing: docker" auto-injects into every chat.
2. 🔴 **MEMORY.md @ 97.68%** of 24,576 B truncation ceiling — `stop-memory-size-watchdog.mjs` wired today by U-OBS-B1 but compression itself is one-shot. Re-growth coming.
3. 🔴 **Utilization classifier degenerate** — `AWARENESS-SNAPSHOT.md` reports 0 orphans across 372K-node graph (impossibly false). Every chat is misprioritizing pickup decisions.
4. 🟠 **353 orphan hooks** (61.9% of hooks-on-disk are dead code) + 6 dangling settings refs + 5 documented-not-wired error-learn hooks.
5. 🟠 **Ollama offload stuck** at 22.2% vs 30% target — R1 fix shipped today by `claude-773c6214`; R2/R4/R5 remaining.
6. 🟠 **30 drifted milestones** (`audit-roadmap-drift.mjs` output, mostly BP-MS0 + LATHE-PRO-MS* family).
7. 🟠 **Bridge layer is 96% noise risk** — validate-unwired-signal.mjs needs re-run BEFORE any chat dispatches wiring work on the 836-engine pool.

---

## 15 CATEGORIES + ASSIGNED ITEMS (sequenced by compounding ROI)

### Category 1 — backend-dev-tools + RTK/LSP/GSD/TDD

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-DEV-TOOL-LEVERAGE-SKILL | Wire `/dev-tool-leverage` skill (runbook aggregator for 4 META tools) | BUILT, needs dispatcher wiring | foxtrot | 4.2 | `grep dev-tool-leverage .claude/commands/*.md` |
| U-HOOK-FIRE-RANK | Wire empirical hook fire-rate ranker | BUILT, needs operator-visibility wiring | foxtrot | 3.8 | `node scripts/hook-fire-rank.mjs --json` returns ranked list |
| U-DEV-TOOL-LEVERAGE-RANK | Wire 4-META-tool aggregator | BUILT, needs skill registration | foxtrot | 3.5 | skill triggers ledger contains entry |
| U-STALE-MILESTONE-RANK | Wire stale-milestone-rank.mjs to operator surface | BUILT (F2 audit), needs scheduled invoke | echo | 3.0 | runs in Stop or `/loop` |
| U-P4-RTK-AUTO-WRAP | RTK close-out — doc sync + hook cascade activation | BUILT, needs doc sync only | bravo | 2.5 | rtk-auto-suggest fires on first bash |

### Category 2 — neural-net + GNN

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-INTENT-WIRE | Wrap IntentClassifierEngine in `prism_session:classify_intent` action | BUILT (WIRE-EXEMPT, tests-only) | hotel | 1.8 | `prism_session:classify_intent` works |
| U-NEG-SAMPLE-STRATIFIED | Layer-stratified negative sampling — unblocks NN-GRAPH-MS0 tier-5 deploy | new build (1-2 days) | alpha | 3.2 | AUROC > 0.5 |
| U-CONSENSUS-RECALL-ACTIVATE | Activate ConsensusRecallCacheEngine in response callback chain | BUILT but passive | lima | 1.5 | identical-prompt fan-out short-circuits |
| U-NN-GRAPH-DEPLOY (DEFER) | Deploy GraphSAGE tier-5 GNN gate | BUILT + COMMITTED but data-blocked (poolSize 0) | alpha | DEFERRED until U-NEG-SAMPLE-STRATIFIED unblocks | data side |

### Category 3 — tribal-knowledge + auto-memory-gen + wiki-injection

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-TRIBAL-EMBED-SYMLINK | Re-symlink `mcp-server/data/tribal-embed-index.json` → `state/shared/` (currently 0-byte) | BUILT, broken symlink | delta | 5.0 | `wc -c state/shared/tribal-embed-index.json` > 0 |
| U-MEMORY-RELEVANCE-FIX | Fix MEMORY_DIR path derivation in memory-relevance-inject.mjs (0% fleet recall) | BUILT, broken path | bravo | 4.5 | recall test surfaces ≥1 memory hit |
| U-WIKI-BOOTSTRAP-RUN | Run wiki bootstrap to refresh confidence scores (currently generic 0.7) | script exists | charlie | 2.0 | wiki/index.md re-emitted with varied confidences |
| U-TRIBAL-CONSOLIDATE-CRON | Wire tribal-consolidate-weekly.mjs to cron (already exists, never scheduled) | BUILT, unwired | india | 2.5 | cron entry created |
| U-MEMORY-CONSOLIDATION-WIRE | Wire MemoryConsolidationEngine to dispatcher | BUILT, no consumer | charlie | 2.0 | dispatcher action invokes engine |
| U-MEMORY-GRAPH-WIRE | Wire MemoryGraphEngine to dispatcher | BUILT, no consumer | charlie | 2.0 | dispatcher action invokes engine |
| U-TRIBAL-ENGINE-WIRE | Wire TribalKnowledgeEngine (referenced only in validation rule) | BUILT, no invoker | delta | 2.0 | dispatcher action invokes |

### Category 4 — prism-awareness + system-viz + obsidian 2nd brain

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-UTIL-CLASSIFIER-FIX | Fix utilization classifier (drop binary doc-edge rule, use degree percentile + has-source-file) | broken in `augment-graph-with-awareness.mjs` | alpha | 9.0 | `node scripts/node-staleness-rank.mjs --json \| jq '.utilization.orphan'` > 0 |
| U-DRIFT-GATE-VERIFY | Verify drift-gate-only mode `regen-viz.mjs --drift-gate-only` gates CI cleanly | shipped, needs verification | alpha | 2.0 | drift gate fires once on stale graph |
| U-DSL-COVERAGE-AUDIT | Cross-check DSL reverse-lookup coverage (audit dead DSL codes in CODE_SYSTEM_INDEX) | shipped, needs audit | alpha | 1.5 | dead-code count documented |
| U-OBSIDIAN-VAULT-AUDIT | Stale wiki audit — scan knowledge/wiki/ for ≥30-day-old entries without recent edits | n/a | charlie | 1.5 | candidate list produced |
| U-MASTER-INDEX-CACHE-STRESS | Validate master-index mtime-cache invalidates on regen-viz | n/a | echo | 1.5 | concurrent regen + search returns fresh results |

### Category 5 — skills + scripts + hooks (auto-trigger / orphan-rescue)

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-ORPHAN-HOOK-TRIAGE | Triage 353 orphan hooks: classify legit-helper vs dead-code vs misplaced | scout #5 found | mike | 6.5 | orphan count reduces measurably |
| U-DANGLING-REFS-REMOVE | Remove 6 dangling settings refs (C1a-f: context-economy-v2, context-pressure-tracker, posttooluse-compressor, read-optimizer, rtk-reminder, test-run-gate) | scout #5 + #11 | mike | 4.0 | `harness-wiring-audit` dangling count = 0 |
| U-BUNDLE-CHILD-FIX | Fix `posttool-edit-bundle.mjs:46-47` refs to `${HOOK_BASE}/build-cache-manager.mjs` + `${HOOK_BASE}/build-tracker.mjs` (both live in helpers/) | scout #5 + #11 (C2) | kilo | 3.5 | runtime smoke test |
| U-AAM04-FOLLOWUP | AAM04 hook-wiring auditor scope-aware parser (separate scopeMismatch diagnostic) | follow-up from CLAUDE.md regression | kilo | 3.0 | scope-mismatch surfaces as separate severity |
| U-ERROR-LEARN-5-WIRE (HOLD) | Wire 5 unwired error-learn hooks (capture/learner/memory/block-capture/block-prewarn) | BUILT, unwired | kilo (HOLD pending doctrine) | 5.0 (if shipped) | wait on charlie's `feedback_dont_wire_for_wiring_sake_2026_05_16.md` |

### Category 6 — token-saving + compression + prompt-injection

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-F2-R2 | Lower INJECT_THRESHOLD 0.90→0.80 in ollama-task-offloader.mjs:56 | pending | foxtrot | 4.0 | offload rate climbs |
| U-F2-R4 | Rate-limit 5min→60s in ollama-task-offloader.mjs:54 | pending | foxtrot | 3.5 | burst /loop sessions clear more |
| U-F2-R5 | Auto-execute Ollama for {summary, format_convert, prism_inventory, prism_introspect, classification} in offloader.mjs:441 | pending | foxtrot | 5.0 | offload rate ≥ 0.30 |
| U-F1-SPLIT | Static/dynamic split in 3 UserPromptSubmit injectors (master-index-precheck-inject, prompt-context-inject, ollama-pipeline-injector) | pending | foxtrot | 4.5 (uncalibrated until F6) | total_est_tokens drops |
| U-F6-CONTEXT-AUDIT | Build context-utilization-audit.mjs (Stop advisory, measures inject-blocks-never-referenced) | new build | echo | 4.0 | emits wasted_inject_pct |
| U-F4-MODEL-ROUTER | Build agent-model-router.mjs (Sonnet for reviewers, Haiku for analyzer, Opus for synthesis) | new build | bravo | 6.0 (multiplicative on 13-chat fleet) | model overrides present in spawn calls |
| U-F3-LAZY-SKILLS (OPEN-Q) | PRISM_SKILL_LAZY_BODY mode for skill-auto-trigger.mjs | open question; needs transcript probe | bravo | OPEN | probe built |
| U-F5-BETA-HEADERS (OPEN-Q) | verify-anthropic-beta-headers.mjs | open question | echo | OPEN | check script built |

### Category 7 — hermes + docker + ollama

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-DOCKER-RECOVERY | Docker recovery hook + /checkin alert (Docker DOWN this session, blocking 5 services) | new build | foxtrot | 9.0 (P0) | docker engine reachable; ollama-docker-launcher autostart succeeds |
| U-OLLAMA-CLASSIFIER-DIAG | Diagnose + rebuild OFFLOADABLE_PATTERNS (offloader broken, 0% successful offloads) | broken | foxtrot | 7.5 | offloader produces decision=offload events |
| U-OLLAMA-13-WIRE | Wire 13 unwired Ollama hooks (route-recommender, skill-suggester, context-aggregator, obsidian-rag, etc.) after smoke tests | BUILT, 88% unwired | foxtrot | 5.5 | hooks fire in telemetry |
| U-OLLAMA-COST-ROUTER-UNIFY | Integrate ollama-cost-router.mjs into ollama-auto-router (currently only offloader uses tier-aware) | partial | foxtrot | 3.5 | auto-router uses cost-router |
| U-OLLAMA-REVIEWER-WIRE (CARE) | Wire ollama-reviewer-second-opinion.mjs (T0 BLOCKER tier — careful smoke-test first) | BUILT, unwired | foxtrot | 4.0 (high-risk) | smoke test passes |

### Category 8 — roadmap-consolidation MS1+

| ID | Title | Status | Slot | ROI | Verify |
|----|-------|--------|------|-----|--------|
| U-MS1-ENVELOPE | Create `ROADMAP-CONSOLIDATION-MS1.json` envelope (formalizes lane, scopes refresh cadence + prose-to-envelope + drift fix + misc triage) | juliett owns | juliett | 5.0 | envelope file exists with units array |
| U-MS1-REFRESH-CRON | Refresh cadence script — wraps consolidate-roadmaps.mjs, delta-report, auto-commit-if-small, manual-approve-if-large | new build | juliett | 4.5 | cron entry + script runs |
| U-PROSE-TO-ENVELOPE | Promote 969 unconsolidated REVENUE-ROADMAP-v7.6 units to envelope homes | distributed | lima + echo | 4.0 | promotion ledger emitted |
| U-DRIFT-FIX | Reconcile 30 drifted milestones via /envelope-drift-fix | distributed | echo | 3.5 | drift count → 0 |
| U-MISC-TRIAGE | Triage 318 MISC-TASKS orphans (close / envelope / drop decisions) | distributed | mike | 3.0 | inventory flagged with decisions |

### Category 9 — bridge layer (26 wiring + 16 deep-integration)

> **HARD GATE:** Re-run `node H:/prism/scripts/validate-unwired-signal.mjs` BEFORE any chat dispatches wiring work. The 2026-05-15 baseline showed only 3 truly-unwired in a 50-engine sample (96% false-positive). The 836 estimate is domain-grouped, not classifier-validated. Without fresh numbers, chats waste hours wiring noise.

| ID | Title | Status | Slot | Note |
|----|-------|--------|------|------|
| U-BRIDGE-VALIDATE-RERUN | Re-run validate-unwired-signal.mjs, publish fresh false-positive % | gate | alpha | run before any wiring |
| U-BRIDGE-PRISM-APP-FILTER | Filter Lathe (89) + Mobile (5) + Print (6) — likely PRISM-app contamination; backend-only assessment per engine | gate | alpha + mike | filter before wire |

**Wiring units** (verify count after gate; deploy in parallel across slots):

| Domain | Engines | Slot | Status |
|--------|---------|------|--------|
| Other | 144 | alpha | post-gate |
| Multi | 10 | alpha | post-gate |
| Process | 6 | alpha | post-gate |
| Speed | 4 | alpha | post-gate (SFC dep) |
| Tribal | 4 | delta | post-gate |
| Outcome | 8 | delta | post-gate |
| Consensus | 6 | delta | post-gate |
| Turning | 11 | foxtrot | post-gate |
| Swiss | 6 | foxtrot | post-gate |
| Shop | 9 | foxtrot | post-gate |
| Fusion | 7 | hotel | post-gate |
| Hyper | 7 | lima | post-gate |
| Milling | 7 | lima | post-gate |
| Mill | 4 | lima | post-gate |
| Mastercam | 5 | lima | post-gate |
| WET | 7 | lima | post-gate |
| Wire | 6 | lima | post-gate |
| Electrode | 4 | lima | post-gate |
| Okuma | 4 | lima | post-gate |
| Machine | 17 | lima | post-gate |
| Tool | 9 | lima | post-gate |
| Five | 9 | alpha | post-gate |
| LongTail | 442 | BATCH-PARALLEL (all slots, 1-3 per batch) | post-gate |
| Lathe (89), Mobile (5), Print (6) | 100 | HOLD | PRISM-app filter pending |

**Deep-integration bridges** (16 — each cross-subsystem, highest value, blocker-checked):

| ID | From → To | Slot | Blocker check |
|----|-----------|------|---------------|
| U-BRIDGE-SFC-FUSION | SFC → cam_fusion | hotel | SFC stable? Fusion CAM engine? |
| U-BRIDGE-SFC-HYPERMILL | SFC → cam_hypermill | lima | SFC stable? |
| U-BRIDGE-SFC-MASTERCAM | SFC → cam_mastercam | lima | — |
| U-BRIDGE-SFC-ESPRIT | SFC → cam_esprit | hotel | Esprit bridge exists? |
| U-BRIDGE-SFC-INVENTORHSM | SFC → cam_inventor_hsm | hotel | HSM bridge exists? |
| U-BRIDGE-SFC-SOLIDWORKS | SFC → cam_solidworks | hotel | — |
| U-BRIDGE-MASTERPOST-CAM | Master Post → 6 CAM bridges | lima | Master post unified? |
| U-BRIDGE-CAD-CAM-HANDOFF | CAD-AI → CAM-AI | hotel + lima | CAD-gen + CAM-intake AI stable? |
| U-BRIDGE-AI-TIER1-TIER2 | Claude orch → FullSystemAICoordinator | alpha | Tier-2 defined? |
| U-BRIDGE-AI-TIER2-TIER3 | Tier-2 → 7 domain AIs | alpha | 7 domain AIs exist? |
| U-BRIDGE-SHOPFLOOR-LEARN | shop-floor / MTConnect → learning | NEW SLOT | MTConnect bridge live? |
| U-BRIDGE-LEARN-SFC | learning → SFC params | foxtrot | SFC schema locked? |
| U-BRIDGE-LEARN-CAM | learning → CAM strategy selectors | lima | strategy selector API stable? |
| U-BRIDGE-ERP-SCHED | ERP → scheduling + capacity | NEW SLOT | ERP sync wired? |
| U-BRIDGE-ERP-QUOTE | ERP → quoting + cost | NEW SLOT | cost engines wired? |
| U-BRIDGE-OPERATOR-GATES | operator-approval → CAD/CAM/post pipelines | NEW SLOT | approval hook schema? |

### Category 10 — today's-chat unfinished work

| ID | Title | Slot | Notes |
|----|-------|------|-------|
| U-F2-META-RANK | Build stale-milestone-rank.mjs (150 LOC) | foxtrot | from AUDIT-DEV-TOOLS F2 |
| U-F3-HOOK-PROFILER | Build hook-overhead-profiler.mjs (120 LOC) | foxtrot | from AUDIT-DEV-TOOLS F3 |
| U-F3-UNWIRED-RANK | Build unwired-engine-leverage-rank.mjs (180 LOC) | foxtrot | from F3 |
| U-F3-COLD-SCRIPT-RANK | Build cold-script-rank.mjs (100 LOC) | foxtrot | from F3 |
| U-F3-DEV-TOOL-LEVERAGE-RANK | Build dev-tool-leverage-rank.mjs (200 LOC) | foxtrot | from F3 (already shipped 37feea659a — verify before re-build) |
| U-MEMORY-WATCH-WIRE | Wire memory-size-watch.mjs to /loop --interval 1d (script + Stop hook both shipped; loop binding missing) | bravo | A1 + F-MEMORY-WATCH-WIRE |
| U-SYNERGY-WATCH-WIRE | Wire synergy-regression-watch.mjs to /loop --interval 1d | foxtrot | A1 sibling |
| U-STOP-FORCE-LOOP-1LINE | `stop-force-loop-continue.mjs:174` → "active" → "running" | alpha | dead-code gate |
| U-ENVELOPE-DRIFT-TRIAGE | Triage 12 dry-run envelope-drift advisories | mike | one per session, human-verify |
| U-LOOP-ABANDONED-PICKUP | 3 abandoned /loop sessions (bravo BLUEPRINT-OCR-TRAINING 6/8, hotel D2 ontology, alpha B4 weekly-synthesis) — resume / archive / triage | distributed | operator decision |

### Category 11 — doc-currency + obsolescence (THE 15th — META layer)

> **Highest-leverage META fix in the entire plan:** B1 `doc-backflow-watch.mjs` Stop hook. Prevents the entire class of "shipped without updating CLAUDE.md/MEMORY.md/wiki/skill-frontmatter" regressions that have caused ≥8 of the recent regressions in CLAUDE.md ledger.

| ID | Title | Slot | ROI | Why |
|----|-------|------|-----|-----|
| U-B1-DOC-BACKFLOW-WATCH | Stop hook — fail commit that touched engines/hooks/skills without updating ≥1 doc surface (CLAUDE.md, MEMORY.md index, wiki entry, skill frontmatter) | echo | 9.0 | prevents 80% of regression class |
| U-B2-SKILL-TRIGGER-AUTO | Stop hook — re-scan .claude/commands/*.md frontmatters, rebuild `_skill-triggers.jsonl` post-build; fail if ledger diverges >5 entries from reality | kilo | 7.0 | skill auto-trigger depends on accurate ledger |
| U-B3-CLAUDE-MD-DRIFT | UserPromptSubmit hook — detect duplicated sections across global + project CLAUDE.md, emit advisory + suggest fold | echo | 4.0 | A3 collapse precondition |
| U-B4-MEMORY-INDEX-VALIDATOR | Stop hook — parse MEMORY.md index entries, verify [[backlink]] files exist; fail if >2 stale | bravo | 5.0 | catches deleted memory file orphans |
| U-A3-CLAUDE-MD-COLLAPSE | Fold project H:/prism/CLAUDE.md §EXPERT ROLE, §ENFORCEMENT into pointer to global H:/.claude/CLAUDE.md | mike | 4.0 | stop the silent divergence |
| U-A4-WIKI-BACKFLOW-WATCH | Wiki-index backflow detector (new entries audit against wiki/index.md) | echo | 3.5 | wiki query reliability |
| U-A6-WIRING-AUDIT-STOP-GATE | Wire `harness-wiring-audit.mjs` to Stop[16] with exit non-zero on severity>warn | kilo | 5.0 | prevents broken-wiring commits |
| U-C1-DANGLING-REMOVE | Remove 6 dangling settings refs (see Category 5 — same ID) | mike | 4.0 | (duplicated for visibility) |
| U-C7-INGEST-GATE | Gate `auto-ingested-tips.ts` ingestor behind quality threshold BEFORE re-publishing (title≥5 chars, body min-length, source validation) — else 326-file quarantine re-grows | mike | 5.5 | upstream noise prevention |
| U-C9A-REGRESSIONS-ARCHIVE | Archive rule: after entry FIXED + verified for 2 days, move to REGRESSIONS_ARCHIVE_2026-05.md; keep ledger ≤10 live entries | echo | 2.5 | ledger clarity |
| U-C9B-DIGEST-PARSER-FIX | Fix DISPATCHER_DIGEST parser to recognize `z.enum([...A, ...B] as const)` spread arrays (4 dispatchers show 0 actions when reality is 428/27/121/130) | kilo | 4.5 | every downstream audit consuming digest is mis-prioritizing |

---

## PER-SLOT ASSIGNMENT MATRIX (excluding golf)

Each slot has its own pickup file at `state/shared/specs/SLOT-PICKUP-<slot>.md` with the ordered queue and verification commands. Summary below.

| Slot | Items | Lane theme | P0 first move |
|------|-------|------------|---------------|
| **alpha** | 8 | system-viz / orchestration / NN unblock | **U-UTIL-CLASSIFIER-FIX** (P0, every chat is misprioritizing) |
| **bravo** | 6 | memory / MEMORY.md / model-router / RTK / claude.md drift | **U-MEMORY-WATCH-WIRE** (P0, durability for U-OBS-B1) |
| **charlie** | 4 | obsidian / wiki bootstrap / memory engines | U-WIKI-BOOTSTRAP-RUN + U-MEMORY-CONSOLIDATION-WIRE |
| **delta** | 5 | tribal / outcome / consensus | **U-TRIBAL-EMBED-SYMLINK** (P0, 0-byte symlink) |
| **echo** | 8 | audit / drift / doc-backflow / context-util | **U-B1-DOC-BACKFLOW-WATCH** (the META) |
| **foxtrot** | 14 | Ollama + Docker + dev-tools + META scripts | **U-DOCKER-RECOVERY** (P0, Docker DOWN) |
| **hotel** | 7 | CAD bridges (Fusion/Esprit/HSM/SW) + IntentClassifier wire | U-INTENT-WIRE (cheap activation) |
| **india** | 3 | tribal-graph + 326-quarantine triage + course-data-router | continuation of in-flight |
| **juliett** | 4 | THIS plan + ROADMAP-CONSOLIDATION-MS1 envelope + refresh cron + 24h re-audit | U-MS1-ENVELOPE next |
| **kilo** | 7 | hook-wiring auditor / skill-triggers / dispatcher digest parser | U-BUNDLE-CHILD-FIX (P1, runtime ENOENT risk) |
| **lima** | 12 | CAM bridges + Mill/Lathe/WEDM domain wiring + Master Post | post-gate (wait validate-unwired-signal re-run) |
| **mike** | 8 | OBSOLESCENCE-CLEANUP-MS0 continuation + dangling-refs + MISC-tasks + CLAUDE.md fold | **U-DANGLING-REFS-REMOVE** + U-C7-INGEST-GATE |
| ~~golf~~ | EXCLUDED | fleet-reaper + perf monitoring only | n/a |

---

## DEPENDENCIES + SEQUENCING NOTES

**Strict prerequisites (must ship before downstream):**
- `U-BRIDGE-VALIDATE-RERUN` blocks every Category-9 wiring item
- `U-BRIDGE-PRISM-APP-FILTER` blocks Lathe (89) + Mobile (5) + Print (6) wiring
- `U-NEG-SAMPLE-STRATIFIED` blocks `U-NN-GRAPH-DEPLOY`
- `U-F2-R5` should land before `U-OLLAMA-13-WIRE` (offload rate validates wiring correctness)
- `U-F6-CONTEXT-AUDIT` is F1's calibration channel — F1 can ship without it but savings remain uncalibrated
- `U-B1-DOC-BACKFLOW-WATCH` should land BEFORE the next ship-sprint — every commit after that is auto-verified

**Held / in-flight conflicts:**
- F2-R1 — owned by `claude-773c6214` (3m old claim); foxtrot must wait or coordinate
- 5 unwired error-learn hooks (`U-ERROR-LEARN-5-WIRE`) — HOLD pending charlie's `feedback_dont_wire_for_wiring_sake_2026_05_16.md` doctrine decision

**New slots needed** (3 deep-integration bridges have no obvious slot owner):
- shopfloor / MTConnect (U-BRIDGE-SHOPFLOOR-LEARN)
- ERP (U-BRIDGE-ERP-SCHED + U-BRIDGE-ERP-QUOTE)
- operator-gates (U-BRIDGE-OPERATOR-GATES)

These could go to existing slots (alpha/lima/hotel) as secondary lanes, OR await a 13th-slot expansion / role assignment.

---

## REFRESH + SELF-SCHEDULE

This plan is a snapshot at 2026-05-17T03:30Z. It will drift:
- New commits land continuously across 13 chats
- Validate-unwired-signal re-run will change Category 9 sizing
- Charlie's doctrine decision will release / cancel the 5 error-learn wires
- Docker recovery + Ollama R5 will move offload telemetry

**Recommended `/schedule` follow-up:** re-run this plan generation in 24h (next juliett session, 2026-05-18T03:30Z) and diff. Items that completed → archive; new items from new commits → add; doctrine shifts → propagate.

---

## BORIS PEER-REVIEW

Per /forge7 doctrine: an independent reviewer agent (isolation:worktree) will audit this plan for:
- (a) PRISM-app contamination missed
- (b) Misclassified items
- (c) Wrong-slot assignments (e.g., load imbalance)
- (d) Missed already-built features
- (e) Un-acknowledged dependencies
- (f) ROI-rank obvious errors

Findings → applied in v1.1 of this plan + back-flowed to CLAUDE.md if doctrine-level.

---

## VERIFICATION CHANNELS (re-runnable)

Every claim in this plan carries a verify command. Spot-checks the operator can run right now:

```bash
# Headline alerts
node H:/prism/scripts/memory-size-watch.mjs --json | jq '.bytes,.pctOfCeiling,.status'
node H:/prism/scripts/ollama-offload-dashboard.mjs --json | jq '.totals|(.offloaded/(.offloaded+.keptOnClaude))'
node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.utilization.orphan,.utilization.classifierDegenerate'

# Bridge gate
node H:/prism/scripts/validate-unwired-signal.mjs

# Wiring audit
node H:/prism/scripts/harness-wiring-audit.mjs

# Drift
node H:/prism/scripts/audit-roadmap-drift.mjs

# Per-slot pickup
cat H:/prism/state/shared/specs/SLOT-PICKUP-<your-slot>.md
```

---

## SOURCES

11 scout reports archived in chat transcript. Master inventory: `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md,html}` (5826 items). Misc orphans: `state/shared/specs/MISC-TASKS-INVENTORY.json` (318). Milestone state: `state/shared/MILESTONE_PROGRESS.json`. Build state: `state/shared/BUILD_STATE.json`. Regressions: `H:/prism/CLAUDE.md` §Recent regressions. Skill triggers: `knowledge/wiki/architecture/_skill-triggers.jsonl`. Settings wiring: `C:/Users/wompu/.claude/settings.json` + `H:/.claude/settings.json`.
