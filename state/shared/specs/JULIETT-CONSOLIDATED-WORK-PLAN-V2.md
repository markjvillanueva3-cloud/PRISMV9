# JULIETT CONSOLIDATED WORK PLAN v2 — 2026-05-17

> v1 + v1.1 scrutiny deltas applied. Sources of truth:
> - v1 master: `JULIETT-CONSOLIDATED-WORK-PLAN-2026-05-17.md`
> - v1.1 deltas: `JULIETT-PLAN-V1.1-SCRUTINY-DELTAS-2026-05-17.md`
> - Per-slot queues: `SLOT-PICKUPS-ALL.md` (needs v2 update; see Stage 7 below)
> - Operator-facing deferrals: `PRISM-APP-QUEUE.md` (sibling file, created with v2)
> - This is v2 — operator-actionable canonical.

---

## NEW DOCTRINE (user message 2026-05-17T04:10Z)

**"Activate before build."** Most of the engines, hooks, skills, scripts, and memories the plan needs **are already on disk**. Default action when a need surfaces is:

1. `node H:/prism/scripts/system-viz-query.mjs find <keyword>` — does it exist?
2. `grep -r <name> mcp-server/data/docs/ENGINE_DIGEST.md` — was it built before?
3. `cat C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md | grep <topic>` — is there prior tribal knowledge?
4. Only after 1-3 return empty: design + build new.

**Funnel-into-pipelines focus.** When you find an existing-but-cold asset, the work is usually:
- Wire it to its natural dispatcher
- Route it via an existing inject hook (skill-auto-trigger, master-index-precheck, tribal-by-domain-inject)
- Surface it in `/checkin` Step injection list
- Add its trigger keywords to the relevant skill frontmatter

This is the doctrinal answer to "constant updating and integration of new tools and features and skills and memories."

**Obsidian PRISM-OS awareness.** The Obsidian-vault knowledge layer (`knowledge/wiki/`, `knowledge/memories/`, `obsidian:*` skills, `OBSIDIAN-INTELLIGENCE-MS3`, `IdeaBlockRagEngine`, `KnowledgeDistillationEngine`, `MemoryConsolidationEngine`, `AgentOverlayEngine`, `VoiceCaptureEngine`, `Obsidian-PRISM-OS routing`) is the second brain. Every backend-dev unit should ask: "does this also belong in the vault?" If yes, write a wiki entry / memory note / canvas anchor as part of the unit, not as a follow-up.

---

## STAGES (v2 canonical order — Stage 0 first, Stage 6 last)

### STAGE 0 — Prerequisites (must ship before downstream — ~1-2 sessions)

| ID | Title | Slot | Notes |
|----|-------|------|-------|
| U-LOOP-DURABLE-INTERVAL | Windows scheduled-task wrapper for /loop intervals (mirror `install-fleet-reaper-task.ps1` S4U pattern) | bravo | Unblocks all `/loop --interval 1d` items |
| U-OLLAMA-HOOK-SMOKE-HARNESS | Fixture-driven invoker for each ollama-* hook | foxtrot | Unblocks any Ollama wire-audit |
| U-DOCKER-RCA | Log harvest + classification of why Docker daemon failed this session | foxtrot | Recovery without RCA = restart loop |
| U-DOC-SURFACE-SPEC | Class → required-doc-surfaces matrix (engine → CLAUDE.md OR wiki; hook → settings.json wiring entry; skill → frontmatter; dispatcher → DISPATCHER_DIGEST entry). Without it, B1 is theatre | echo | Unblocks B1 |
| U-STOP-CHAIN-INVENTORY | Read Stop chain slot allocation; ensure space for new hooks | kilo | 30min; can be inline in A6 |
| U-CRON-BATCH-REGISTER | One unit registers all PRISM scheduled tasks; avoids 4-slot install-task collisions | bravo | Pattern collapse |

### STAGE 1 — Cheap P0 fixes (ship in current session window)

| ID | Title | Slot | Verify |
|----|-------|------|--------|
| U-STOP-FORCE-LOOP-1LINE | `stop-force-loop-continue.mjs:174` `"active"` → `"running"` | alpha | grep reads `!== "running"` |
| U-BRIDGE-VALIDATE-RERUN | `node scripts/validate-unwired-signal.mjs` + publish fresh false-positive % | alpha | 5-min publish; **MOVE FIRST** to unblock 11 wiring slots in parallel |
| U-UTIL-CLASSIFIER-FIX | Fix degenerate utilization classifier (drop binary doc-edge rule) | alpha | `node-staleness-rank.mjs --json \| jq '.utilization.orphan'` > 0 |
| U-AWARENESS-CONTRADICTION | Reconcile AWARENESS-SNAPSHOT (12,129 orphans) vs node-staleness-rank (0 orphans/degenerate). TWO classifiers in same chat give opposite answers | alpha | unified output |
| U-TRIBAL-EMBED-SYMLINK | Re-symlink `mcp-server/data/tribal-embed-index.json` → `state/shared/` (currently 0 bytes) | delta | `wc -c state/shared/tribal-embed-index.json` > 0 |
| U-MEMORY-RELEVANCE-FIX | Fix MEMORY_DIR path derivation in `memory-relevance-inject.mjs` (0% recall) | bravo | recall test surfaces ≥1 hit |
| U-BUNDLE-CHILD-FIX | Fix `posttool-edit-bundle.mjs:46-47` refs (`build-cache-manager.mjs` + `build-tracker.mjs` live in `helpers/`) | kilo | runtime smoke test |
| U-C9B-DIGEST-PARSER-FIX | Fix DISPATCHER_DIGEST parser for `z.enum([...A, ...B] as const)` spread arrays | kilo | `high-value-additions-rank.mjs --json \| jq '.dispatchers.digestParserBroken'` → false |
| U-DANGLING-REFS-REMOVE | Remove 6 dangling settings.json refs (after golf releases CLAUDE.md/settings.json claim) | mike | `harness-wiring-audit.mjs` dangling = 0 |

### STAGE 2 — Doctrine + META layer (after Stage 0)

| ID | Title | Slot |
|----|-------|------|
| U-A6-WIRING-AUDIT-STOP-GATE (advisory mode) | Wire `harness-wiring-audit.mjs` to Stop chain as advisory (NOT blocker until AAM04 false-positive < 10%) | kilo |
| U-B1-DOC-BACKFLOW-WATCH | Fail any commit touching engines/hooks/skills without updating ≥1 doc surface per U-DOC-SURFACE-SPEC | echo |
| **U-NEW-TOOL-AUTO-WIRE** | Stop hook detects new `.claude/commands/*.md` OR `scripts/*.mjs` → auto-appends to `_skill-triggers.jsonl` + broadcasts to chat-bus. **This is the forward-feedback loop for "constant updating" the user named.** | echo |
| **U-AUTO-MEMORY-WRITE** | Stop hook detects repeated error/fix pattern (≥3× across sessions) → auto-drafts `feedback_<pattern>.md` for operator approval. **The user explicitly named "automatic memory generation".** | bravo |
| U-DOCTRINE-OBSOLESCENCE-SWEEP | `scripts/audit-stale-doctrine.mjs` — score CLAUDE.md sections/skill bodies/wiki entries/tribal canonical by last-touched + last-referenced + invocation-telemetry; quarterly archive list | echo |
| U-B4-MEMORY-INDEX-VALIDATOR | Stop hook validates MEMORY.md `[[backlinks]]` resolve | bravo |
| U-B3-CLAUDE-MD-DRIFT | Detect duplicated sections across global + project CLAUDE.md | echo |
| U-A3-CLAUDE-MD-COLLAPSE | Fold project CLAUDE.md §EXPERT ROLE + §ENFORCEMENT into pointer to global (after golf releases) | mike |
| U-A4-WIKI-BACKFLOW-WATCH | Wiki-index drift detector | echo |

### STAGE 3 — Token economy (after Stage 0 prereqs)

| ID | Title | Slot |
|----|-------|------|
| U-DOCKER-RECOVERY | After U-DOCKER-RCA names known-safe restart conditions | foxtrot |
| U-OLLAMA-CLASSIFIER-DIAG | Diagnose + rebuild OFFLOADABLE_PATTERNS (broken — 0% successful offloads) | foxtrot |
| U-F2-R2 → R4 → R5 (sequential, single foxtrot lane, no fan-out) | Lower threshold + rate-limit + auto-execute (after DIAG fixes classifier) | foxtrot |
| U-F2-R1 follow-up coordination | claude-773c6214 has active claim; F2-R1 line change in code (66aa07afa4) but chat iterating | foxtrot waits, coordinates |
| U-F1-SPLIT | Static/dynamic split in 3 UserPromptSubmit injectors | echo (solo, not paired) |
| U-MEMORY-WATCH-LOOP-BIND | After U-LOOP-DURABLE-INTERVAL ships | bravo |
| U-SYNERGY-WATCH-WIRE | Same prerequisite | bravo |
| U-F4-MODEL-ROUTER | Read existing `model-router` skill first; if gap real, 20-line patch — else KILL | bravo |

### STAGE 4 — Knowledge hygiene + cleanup

| ID | Title | Slot |
|----|-------|------|
| U-OLLAMA-WIRE-AUDIT | Per-hook 7-point doctrine check against unwired ollama-* hooks; survivors wired individually (NOT en bloc) | foxtrot |
| U-WIKI-BOOTSTRAP-RUN | Refresh wiki/index.md confidence scores (currently generic 0.7) | charlie |
| U-OBSIDIAN-VAULT-AUDIT | Stale wiki audit (≥30-day old without recent edits) | echo (moved from charlie) |
| U-TRIBAL-CONSOLIDATE-CRON | Verify reader exists FIRST; if dead, fix reader before cron | india |
| U-C7-INGEST-GATE | Gate `auto-ingested-tips.ts` ingestor behind quality threshold (title ≥5 chars, body min-length, source validation) | mike |
| U-MISC-TRIAGE | Triage 318 MISC-TASKS orphans (close / envelope / drop) | mike |
| U-ORPHAN-HOOK-TRIAGE | Classify 353 orphan hooks (legit-helper vs dead-code vs misplaced) | mike (kilo consulted) |
| U-DRIFT-FIX | Reconcile 30 drifted milestones via `/envelope-drift-fix` | echo |
| U-AWARENESS-MILESTONE-DRIFT-INVERSION | Distinct from U-DRIFT-FIX — these envelopes claim "completed" but show 0 evidence (MF-MS1, MF-MS2, ACP-MS0, HOOKS-AUTOMATION-V2-MS0, HTML-PRIMARY-MS0). Envelopes lie OR derivation broken | echo |
| U-FOLD-DEBT-CRON-VERIFY | `.newly-built-fold-debt.json` reports 0 while reality is 1348 engines without wiki entries | alpha |
| U-DSL-DEAD-CODE-AUDIT | 14 dead DSL codes (e.g., `cam-hypermill-skill-*` resolving to no dispatcher) | alpha |
| U-LOOP-ABANDONED-PICKUP | 3 abandoned /loop sessions (bravo BLUEPRINT-OCR-TRAINING 6/8, hotel D2 ontology, alpha B4 weekly-synthesis) — operator decides resume / archive / triage | juliett |
| U-L5-STUB-HEAVY-OTHER | `L5/stub_heavy Other (in 265 · out 2429)` — 265 nodes depend on a STUB | hotel |

### STAGE 5 — Conditional (only if goal-driven)

| ID | Title | Slot | Condition |
|----|-------|------|-----------|
| U-NEG-SAMPLE-STRATIFIED | Unblock NN-GRAPH-MS0 tier-5 | alpha | Answer "what user task does tier-5 GNN unblock?" first |
| U-OLLAMA-REVIEWER-WIRE | Wire as `PRISM_OLLAMA_REVIEWER_DRY_RUN=1` advisory first; promote to T0 blocker only after 1 week telemetry shows precision ≥0.9 | foxtrot | Never wire blocker day-1 |
| U-MEMORY-CONSOLIDATION-WIRE / U-MEMORY-GRAPH-WIRE / U-TRIBAL-ENGINE-WIRE | Per charlie doctrine: name a real consumer or DROP | bravo (re-routed from charlie due to delta's memoryDispatcher.ts claim) | doctrine pass required |
| U-ERROR-LEARN-5-WIRE | Check `error-pattern-promote` still wired (YOLO-25 not reverted); only ship remaining 4 if so | kilo | doctrine + cascade check |
| U-HERMES-CLARIFY | 1-line operator question: build PRISM Hermes, or use external? | juliett | open question |

### STAGE 6 — Telemetry multipliers (v1.2 if budget)

| ID | Title | Slot |
|----|-------|------|
| U-CHAT-COST-DASHBOARD | Per-chat token/$ per slot per day | bravo |
| U-HOOK-FIRE-COST | Cost of each hook's injection (tokens × fire rate × model price) | foxtrot |
| U-SKILL-INVOCATION-TELEMETRY | Which ~440 skills actually invoked per week | foxtrot |
| U-PARALLEL-TOOL-CALL-LINTER | Stop hook scans transcripts for sequential tool calls that could've been parallel | echo |
| U-COMPRESSION-QUALITY-PROBE | A/B harness for compression-without-quality-loss (user explicit ask) | foxtrot |
| U-WIKI-INJECT-EFFICACY | Telemetry pairing inject-event → response-content cross-reference (which wiki entries actually USED) | echo |
| U-PRE-COMPACT-DIGEST-QUALITY | Score auto-resume RESUME blocks for continuation accuracy | bravo |
| U-MODEL-DOWNGRADE-PROBE | For each task on Opus, retroactively assess if Sonnet/Haiku could've handled it | bravo |

### STAGE 7 — Per-slot pickup files refresh

`SLOT-PICKUPS-ALL.md` (v1) is now stale due to KILL/RESCOPE/RE-ASSIGN. Regenerate from this v2 sequence.

### STAGE 8 — PRISM-app handoff

Once Stages 1-4 clear (real backend-dev queue), operator opens `PRISM-APP-QUEUE.md` and dispatches operator-facing work (the 660 deferred items: 6 SFC bridges, MASTERPOST-CAM, CAD-CAM-HANDOFF, SHOPFLOOR-LEARN, LEARN-SFC, LEARN-CAM, ERP-SCHED, ERP-QUOTE, OPERATOR-GATES, Lathe(89), Mobile(5), Print(6), Hyper(7), Milling(7), Mill(4), Mastercam(5), WET(7), Wire(6), Electrode(4), Okuma(4), Turning(11), Swiss(6), Shop(9), Tool(9), Fusion(7), Machine(17), LongTail(442)).

---

## OBSIDIAN PRISM-OS INTEGRATION CHECKLIST (apply per unit)

Every Stage 1-6 unit should:
- [ ] Add a wiki entry under `knowledge/wiki/architecture/` if it introduces a new pattern
- [ ] Add a memory note under `knowledge/memories/{feedback,reference,project}/` if it establishes doctrine
- [ ] Update `MEMORY.md` index (per ≤200-char rule)
- [ ] Add a canvas anchor in `knowledge/PRISM-System-Map.canvas` if the unit is hot-path
- [ ] If it ships a new hook/skill/script — verify B1 / U-NEW-TOOL-AUTO-WIRE catches it

---

## ACTIVATE-BEFORE-BUILD CHECKLIST (per unit)

Before writing code for any unit:
1. `node H:/prism/scripts/system-viz-query.mjs find <unit-keyword>` — built?
2. `grep -ri <unit-keyword> mcp-server/data/docs/ENGINE_DIGEST.md` — engine exists?
3. `grep -ri <unit-keyword> .claude/commands/*.md` — skill exists?
4. `grep -ri <unit-keyword> .claude/hooks/*.mjs` — hook exists?
5. `grep -ri <unit-keyword> C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — prior tribal knowledge?
6. Only after all 5 return empty: design new. Otherwise activate existing.

---

## 5 OPEN QUESTIONS (operator decision required)

Same as v1.1 deltas — copied for completeness:

1. **Hermes** — build PRISM Hermes, or use external?
2. **Lima slot** — operator claim (currently empty in `chat-slots.json`), or distribute 12 items?
3. **PRISM-APP-QUEUE timing** — Stage 8 strict-after-Stage-4, or allow parallel?
4. **MS1 envelope** — formalize roadmap-consolidation as milestone, or treat as continuous ops?
5. **NN-GRAPH deploy goal** — what user task is unblocked? If none, defer.

---

## VERIFICATION COMMANDS (top 10)

```bash
# Always-current state
node H:/prism/.claude/helpers/chat-slots.mjs status
node H:/prism/scripts/fleet-status.mjs
node H:/prism/scripts/memory-size-watch.mjs --json | jq '.bytes,.pctOfCeiling,.status'
node H:/prism/scripts/ollama-offload-dashboard.mjs --json | jq '.totals|(.offloaded/(.offloaded+.keptOnClaude))'
node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.utilization.orphan,.utilization.classifierDegenerate'

# Stage 1 gates
node H:/prism/scripts/validate-unwired-signal.mjs   # publish false-positive %
node H:/prism/scripts/audit-roadmap-drift.mjs       # drift count
node H:/prism/scripts/harness-wiring-audit.mjs      # dangling refs + orphans

# Activate-before-build
node H:/prism/scripts/system-viz-query.mjs find <keyword>
grep -ri <keyword> mcp-server/data/docs/ENGINE_DIGEST.md
```
