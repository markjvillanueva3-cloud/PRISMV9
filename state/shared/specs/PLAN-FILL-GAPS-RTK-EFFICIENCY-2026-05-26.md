# Plan — Fill All Gaps + Improve RTK Efficiency
## 2026-05-26 · slot:alpha (`claude-625e0262`) · /goal /loop continuation

> **Operator directive (verbatim):** "devise a plan to fill all gaps and improve rtk efficiency"
> **Source-of-gaps:** `state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md` (16-item punch list)

This plan covers (A) the 16-item punch list from the forge-audit spec and (B) a dedicated
RTK-efficiency sub-plan since RTK is the single live high-volume savings surface (467k saved /
53.7% hit-rate) and the operator emphasized it.

## Pre-flight — git operations stalled this session

5+ commit attempts hung past 60s each. The slot-commit-enforce hook was disabled mid-session via
`PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1` in settings.json env, but env vars are read by Claude Code at
**startup** — mid-session change won't propagate to active hook subprocesses. The 4 in-flight
files (spec Phase 7 addition + generator + tests + regen-viz wiring + merge-augmentations splice)
are on disk but not committed. On next session restart the env knob takes effect, AND/OR the
`[BOOTSTRAP-SLOT-ENFORCE]` subject-line bypass will work cleanly.

**U-FIX-0 (P0, blocker for this whole plan):** Land the pending commit before any further work
on this plan. One-line: `git -C H:/prism commit -m "[MAIN] [BOOTSTRAP-SLOT-ENFORCE] ..."`.

---

## Part A — RTK-efficiency sub-plan (operator-prioritized)

RTK ledger snapshot:
- 934 hits / 806 miss = **53.7% hit-rate** · 467k saved (the working high-volume case)
- BUT archive shows **65% "no hook installed" passthrough** per lima 5/17 F1 — `rtk init -g` not run
- `rtk-adoption-measure` ledger: **0 / 2,469 hit-rate** (pattern broken or signal-dead)
- `rtk-savings-daily.json` shows daily granular data exists

### 4 RTK-axis units (in dependency order)

| # | Unit | Why needed | Depends on | Blocks |
|---|---|---|---|---|
| **RTK-1** | **U-RTK-HOOK-INSTALL** | 65% of bash calls pass through unfiltered. The 60-90% reduction RTK advertises only fires when the hook is wired in `~/.claude/settings.json` PreToolUse:Bash. Each unfiltered call leaks ~500-3000 tokens. | `rtk init -g` must run with write access to `~/.claude/settings.json`. | RTK-2 (telemetry meaningless without filter), RTK-4 (ledger repair). |
| **RTK-2** | **U-RTK-ADOPTION-LEDGER-REPAIR** | `rtk-adoption-measure` shows 0/2,469 hits — either pattern matcher broke (RTK output format changed) OR the ledger is recording the wrong axis. Without working adoption signal, we can't measure RTK-1's impact. | RTK-1 (need real hook fires to measure). | RTK-3 (can't tune what we can't measure). |
| **RTK-3** | **U-RTK-PATH-COVERAGE-EXPAND** | RTK currently covers `git`, `gh`, `npm`, `vitest`, `tsc`, `docker`, `grep`, `cat`, `head`, `tail`, `find`, `wc` per the wrapper. Audit which **other** verbose commands are top callers in this session's transcripts (likely: `node`, `python`, `psql`, `prisma`, `pnpm`, `tsx`). Each expansion = additive savings. | RTK-2 (measure-first, expand-second). | none. |
| **RTK-4** | **U-RTK-PROMPT-INJECT-VS-CALL-COUNT** | RTK is currently invoked by Claude (per CLAUDE.md doctrine pointer); fleet-wide call rate is ~5/2,160 = 0.2% take per route-suggest-stats. The PROMPT side could be optimized: rewrite the inject from "prefer `rtk <cmd>`" to a one-line PostToolUse auto-rewrite suggestion. Bigger leverage than asking Claude to remember. | RTK-1 first. | none. |

### RTK acceptance criteria

| Metric | Now | Target |
|---|---|---|
| `rtk-archive.jsonl` "No hook installed" rate | 65% | <5% (RTK-1 closes) |
| `rtk-adoption-measure` hit-rate | 0% | ≥30% (RTK-2 closes) |
| RTK wrapper command coverage | ~14 commands | ≥25 commands (RTK-3 closes) |
| Operator-facing RTK reminder noise | per-prompt nudge | per-tool-use nudge (RTK-4 closes) |

### RTK testing protocol

1. Run `rtk gain` after 24h with each unit landed — savings delta must be measurable.
2. Compare ledger `byCommand` distribution before/after RTK-3 expansion.
3. Diff `state/shared/dashboards/rtk-savings-daily.json` week-over-week.

---

## Part B — 16-item punch-list fill plan

Grouped by P0 (5 items, must-ship-first), P1 (7 items, parallelizable), P2 (4 items, opportunistic).

### Phase B0 — P0 cluster (ship sequentially in this order)

| # | Unit | Why needed | Depends on | Blocks |
|---|---|---|---|---|
| **P0-1** | **U-OLLAMA-DAEMON-REVIVE** | Live Ollama 100% skip rate, 50/50 timeouts. `/api/chat` dead. Largest projected savings surface delivers zero. Cascades to ~5 dependent hooks. | NIM GPU contention cleanup (`nim-gpu-capacity-ceiling` memory). Possibly: `ollama stop && ollama serve` after killing NIM endpoints. | Every Ollama-family hook (P0-1a ollama-auto-router, ollama-task-offloader, prompt-rewriter-ollama, ollama-pipeline-injector, ollama-prewarm-on-pipeline). Also P0-2 acceptance (memory pressure feeds GPU oversubscription). |
| **P0-2** | **U-MEMORY-MD-AUTO-PRUNE** | MEMORY.md at 24,421/24,576B = 99.4% ceiling. Auto-injected at every SessionStart for every chat. One memo addition will truncate the recall surface fleet-wide. | `scripts/memory-size-watch.mjs` exists but only advises — needs Stop-hook wiring to call `/memory-prune` at ≥90%. | Cross-session recall quality. (Wide blocker — affects every chat's first-prompt context.) |
| **P0-3** | **U-CACHE-BREAKPOINT-SWEEPER** | 8+ UserPromptSubmit injectors fire static doctrine every turn. Anthropic prompt-caching: any change at level N invalidates downstream cache. Estimated 30+ user msgs/session × 8 injectors × ~600B static = message-cache churn 24×/turn. | Audit each of the 8 injectors (master-index-precheck-inject, wiki-precheck-inject, prompt-context-inject, memory-relevance, tribal-by-domain-inject, ollama-pipeline-injector, comprehensive-build-enforce, discipline-expert) to separate static from dynamic content. Move static portions to SessionStart inject. | All per-turn token cost. (Highest-leverage P0 — invisible drag every turn.) |
| **P0-4** | **U-AGENT-TEAM-COST-CAP** | aicosts.ai 887k tok/min case study. Anthropic doc: agent-teams ~7× standard sessions. Per-file scrutiny + 3-of-3 Stop gates spawn reviewers at parent model = Opus pricing. PRISM hit 25-agent rate-limit 5/17. | Helper `scripts/lib/agent-model-router.mjs` keyed on `(subagent_type, complexity)` → `{model, maxParallel}`. Hard cap `PRISM_REVIEWER_MAX_PARALLEL=3`. | Reviewer cost — surfaced every per-file scrutiny + every 3-of-3 gate fire. |
| **P0-5** | **U-MCP-ROUTE-TAKE-RATE-FIX** | TSP shipped suggestions but live take-rate 5/2,160 = 0.2%. TSP iter4 R12 finding: suggestions are STRUCTURALLY unactionable because the sibling pre-fetch hooks (pre-bash/grep/read/write graph-inject) ALREADY inject the top-K data the nudged dispatcher would return. "Taking the route" = no-op duplicate fetch. | Re-examine each of the 7 mapped classifiers in `mcp-route-suggest.mjs`. For each: either (a) the nudge IS structurally actionable → log why operator skips · or (b) it isn't → suppress that classifier. | RTK telemetry framing — if take-rate is gameable to ≥30%, sets pattern for inject-take-rate-pairing (P1-3). |

### Phase B1 — P1 cluster (parallelizable across slots after P0)

| # | Unit | Why needed | Depends on | Blocks |
|---|---|---|---|---|
| **P1-1** | **U-SEMANTIC-CACHE-FOR-PROMPTS** | TDS article: semantic cache 68.8% API-call reduction for repeated prompts. PRISM already uses Ollama nomic-embed-text for tribal indexer — same embedder applies. | P0-1 (Ollama alive). Embedder accessible. New engine: `SemanticCacheEngine` with cosine-similar lookup, operator-confirm gate. | none. |
| **P1-2** | **U-LAZY-SKILL-BODY** | All 440 SKILL.md bodies loaded eagerly at SessionStart. Anthropic Agent Skills: stage-1 metadata always, stage-2 body on-trigger. Est. 10-30k tok/session if 50% stay collapsed. | Add `PRISM_SKILL_LAZY_BODY=1` mode to `skill-auto-trigger.mjs` — inline body only on keyword-match. Probe transcript byte-length before/after. | none. |
| **P1-3** | **U-CLAUDE-MD-EXTRACT-TO-SKILLS** | CLAUDE.md at 610 lines / 74KB. Anthropic guide: ≤200 lines. Extract milestone sections (JULIETT-12CHAT-ALLOCATION-MS0, RGS-TOOL-AUTOINVOKE-MS0/MS1, OBSIDIAN-INTELLIGENCE-MS3, OLLAMA-PIPELINE-MS0, FLEET-REAPER-MS0/MS1, etc.) to `.claude/commands/milestones/<ms>.md`. | None — pure file-shuffle + replace milestone block with a pointer line. | Cleaner CLAUDE.md → faster every SessionStart context-prefix build. |
| **P1-4** | **U-TARGETED-COMPACT-DOCTRINE** | Anthropic: `/compact Focus on <X>` is operator-targeted compaction — keeps relevant context, drops the rest. PRISM uses auto-compact only. | Doc-only: add a `/compact-focus` skill pointer to CLAUDE.md tone-and-style + handoff that survives focused compact. | none. |
| **P1-5** | **U-HOOK-ZERO-FIRE-PRUNE** | 513 / 523 hooks zero-fire in 17-day window = 98.1% wired-but-unmatched. Pure overhead. | Per-hook audit: (a) why was it wired, (b) when did it last fire, (c) is the trigger pattern still valid. For 100+ candidates, set `hooks:[]` + `_disabled_by` per [[feedback_never_delete_only_disable]]. | none directly, but each disable cuts startup time. |
| **P1-6** | **U-SKILL-TRIGGER-COVERAGE-PUSH** | Only 16% of 440 skills have auto-trigger frontmatter. P1-2 (lazy body) can't help if there are no triggers. Push to ≥80%. | Skill-by-skill: read body, write top-3 trigger keywords. Heavy human-loop OR Ollama-driven (P0-1 dep). | Realizes P1-2's leverage. |
| **P1-7** | **U-INJECT-TAKE-RATE-PAIRING** | 6+ inject hooks have NO PostToolUse take-rate counterpart. Without measurement we can't audit underutilization. Model on `mcp-route-takeup.mjs`. | Per-inject: define what counts as "take" (e.g. master-index-precheck-inject "take" = subsequent prism_session:master_index_query call). | none. |
| **P1-8** | **U-OLLAMA-FAMILY-HEALTHCHECK-WRAPPER** | 5 Ollama-family hooks (auto-router, task-offloader, prompt-rewriter, pipeline-injector, prewarm) all hang independently when daemon dead. Single PreSessionStart liveness probe + graceful-degrade flag would short-circuit all 5 in one place. | P0-1 first OR concurrent (the wrapper itself doesn't depend on Ollama being alive — it just degrades faster when it isn't). | Removes the 5 cascading dead hooks from the cost profile. |

### Phase B2 — P2 cluster (opportunistic, low-blast)

| # | Unit | Why needed | Depends on | Blocks |
|---|---|---|---|---|
| **P2-1** | **U-PRE-TOOL-SAVINGS-CONVERT** | `pre-tool-savings-multi`: 0 hits / 114 nudges. Either deprecate or fix conversion. | Audit what the nudge points operators at. | none. |
| **P2-2** | **U-RTK-ADOPTION-LEDGER-REPAIR** | (Same as RTK-2 above — listed in both clusters.) | RTK-1. | RTK-3. |
| **P2-3** | **U-SKILL-TAKE-RATE-LEDGER** | 7+ skills (token-budget, token-dashboard, model-router, smart, ref-first, slim, context-audit) have no take-rate telemetry. Can't audit underutilization without it. | Lightweight skill-invocation logging hook. | none. |
| **P2-4** | **U-MCP-DEFERRED-LOAD-PROBE** | Anthropic costs doc says MCP tools deferred-by-default. PRISM has 7,715 actions × 97 dispatchers — verify the deferred-load posture. | Read MCP server startup logs. Probe context-byte deltas with/without dispatcher unload. | none. |

---

## Part C — Recommended sequencing

```
WEEK 1 (P0 ship — sequential):
  Day 1   P0-1 Ollama revive       → unblocks 5 Ollama hooks + P1-1 + P1-6
  Day 1   P0-2 MEMORY auto-prune   → wide blocker, ship in parallel with P0-1
  Day 2   P0-3 cache-breakpoint    → highest leverage per-turn savings
  Day 3   P0-4 agent cost cap      → caps subagent explosion class
  Day 3   P0-5 mcp-route fix       → either ship or suppress; doesn't block
  Day 4   RTK-1 hook install       → 65% → <5% passthrough
  Day 4   RTK-2 adoption repair    → unblocks RTK-3+RTK-4

WEEK 2 (P1 ship — parallel across slots):
  alpha:    P1-3 CLAUDE.md extract (file-shuffle)
  echo:     P1-2 lazy skill body + P1-6 trigger coverage push (Ollama-paired)
  bravo:    P1-1 semantic cache (needs Ollama alive)
  delta:    P1-5 hook zero-fire prune (audit-heavy)
  foxtrot:  P1-7 inject-take-rate pairing (6 hooks)
  golf:     P1-8 Ollama healthcheck wrapper (integrator role)
  india:    P1-4 targeted-compact doctrine (small)
  RTK-3 + RTK-4 in any open slot

WEEK 3 (P2 cluster + measurement):
  P2 items as time permits.
  Re-run forge-audit-token-context — measure deltas vs 2026-05-26 baseline.
  Roll the punch list forward — close items, surface new gaps.
```

---

## Part D — Verification protocol (per Boris #1)

Every unit lands with a re-runnable verification channel. Template:

```bash
# Re-measure baseline post-ship:
node scripts/token-savings-rank.mjs --json | jq '<unit-specific-key>'

# Compare to pre-ship snapshot:
node scripts/token-savings-history.jsonl.diff.mjs --baseline 2026-05-26 --after <date>
```

**Acceptance gates:**
- Each unit ships with ≥3 vitest cases on the pure-core lib
- Each new hook has a take-rate counter (no inject without measurement going forward)
- Each P0 closure must hold ≥7 days before reclassifying as closed

---

## Part E — Roadmap registration

The 16 punch-list units (12 from spec Phase 5 + 4 from Phase 7 + RTK-1..4 = 20 total minus
duplicate U-RTK-ADOPTION-LEDGER-REPAIR which appears in both = 19 unique) need entry in
`mcp-server/data/roadmap-index.json` so:
- `/pick-unit` can route them by slot
- `/system-viz` ghost.priority_queue surfaces them in the priority-queue roost
- MILESTONE_PROGRESS tracks shipped-vs-pending counts

**U-ROADMAP-REGISTER-FORGE-AUDIT-2026-05-26 (P1/S):** add a `TOKEN-CONTEXT-FORGE-AUDIT-MS0` milestone envelope at `mcp-server/data/milestones/TOKEN-CONTEXT-FORGE-AUDIT-MS0.json` containing all 19 units + their (why/depends-on/blocks/effort) metadata from this plan. Once registered, this audit is no longer a one-shot spec — it's a normal trackable milestone.

---

## Part F — How to know the plan is "done"

This plan itself is just the enumeration. "Done" for the plan = the milestone envelope landed in
roadmap-index + first 5 P0 units have shipped commits + post-ship re-measurement run.

The audit cycle repeats every ~2 weeks until the live-baseline numbers move:
- MEMORY.md ≤ 22,000B (currently 24,421)
- Ollama offload ≥ 30% (currently 5%)
- CLAUDE.md ≤ 200 lines (currently 610)
- mcp-route-suggest take-rate ≥ 30% (currently 0.2%)
- rtk-archive "no hook" rate < 5% (currently 65%)
- Hook zero-fire rate < 60% (currently 98.1%)
- 6 inject hooks have take-rate counters (currently 0)

When 5+ of those clear, the audit cycle promotes from P0 to maintenance cadence.
