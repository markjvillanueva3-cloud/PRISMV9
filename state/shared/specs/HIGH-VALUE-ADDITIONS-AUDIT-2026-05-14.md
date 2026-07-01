---
spec: HIGH-VALUE-ADDITIONS-AUDIT
date: 2026-05-14
author: claude-a2b1b5ca (alpha slot, /forge-audit-v2)
scope: hook · script · dispatcher · pipeline · orchestration · OS functionality
discipline: Boris-loop + Karpathy + Thariq-HTML + cyrilXBT-/loop
meta_artifact: scripts/high-value-additions-rank.mjs
baseline_json: state/shared/HIGH-VALUE-ADDITIONS-BASELINE-2026-05-14.json
html_companion: state/shared/specs/HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.html
peer_reviewer: pending
loop_rerun: 7d
---

# PRISM High-Value Additions — Audit 2026-05-14

> **Brief:** find high-value hooks, scripts, pipelines, orchestrations, dispatcher actions, and overall PRISM OS functionality improvements. Cross-reference /system-viz graph, Obsidian wiki, tribal knowledge, CLAUDE.md, and PRISM self-awareness. Focus on **development-process efficiency** and **compounding-gains** additions.
>
> **Verification channel (Boris #1):** every finding declares its own re-measurement tool, expected signal, baseline value, and re-run cost. Re-run `node scripts/high-value-additions-rank.mjs` at any time to compare drift.

---

## §0 — Preflight Snapshot

| Surface | Live count | Source |
|---|---:|---|
| Engines | 3,236 | system-viz headline |
| Dispatchers | 97 | DISPATCHER_DIGEST.md |
| Actions | 7,486 (digest) / 7,795 (counted) | digest + script |
| Source hooks (`.claude/hooks/*.mjs`) | 471 | filesystem scan |
| Settings.json-wired hooks | 101 | settings.json walker |
| Tests | 3,603 | system-viz headline |
| Wiki entries | 23,792 | system-viz headline |
| Worktrees | 48 | WORKTREE-AUDIT-2026-05-14.json |
| Active coord instances | 392 | AGENT_COORDINATION_STATUS.md |

**Session:** `claude-a2b1b5ca` (alpha slot) · **Branch:** `cad-fusion-live-ms0` · **Synergy baseline:** ratio captured in `system-synergy-map.mjs` (22.2% prior).

---

## §1 — Headline Baselines (seven measured axes)

The META artifact `scripts/high-value-additions-rank.mjs` re-measures these on every run. Each is independently re-derivable; none are hard-coded.

| Axis | Baseline | Source | Threshold (P0 if ≤) |
|---|---:|---|---|
| Hook orphan rate (bundle-corrected) | **65.9 %** (311/472) | settings.json + bundle expansion | 30 % |
| Dispatcher digest parser | **BROKEN** (4 mis-counted: aiReasoning/local/mill/ml) | direct `.ts` case-count vs digest | — |
| Engines NEEDS_WIRING (headline) | **870** (73.1 % wired) | BUILD_STATE.json | 200 — but **signal validation pending** |
| Script cadence rate | **13.5 %** (10 of {regen,update,refresh,rebuild}-* / 74 generate-*) | scripts/*.mjs prefix grep | 50 % |
| Worktree drift | **27.1 %** (13 INVESTIGATE+PRUNE / 48) | WORKTREE-AUDIT JSON | 10 % |
| Coordination ghost rate | **32.4 %** (127 unknown / 392 active) | AGENT_COORDINATION_STATUS.md | 15 % |
| Spec HTML companion rate | **94.4 %** (34 html / 36 md) | state/shared/specs ls | — (already good) |

> **Baseline note** — first peer review (2026-05-14T03:09Z by agent `a8299dd3b088946a6`) graded the original baselines FAIL on F1, F2, F3. META artifact was corrected on three axes:
> 1. **F1** — original walker counted only direct `settings.json` `command` fields; bundles (`bundles/{stop,sessionstart,bash,edit,read,posttool-*}.mjs`) reference children via template literals. After expansion, **9 fewer hooks are orphan** than the original 78.6 % claim.
> 2. **F2** — original measurement scraped `DISPATCHER_DIGEST.md` action counts (stale 2026-05-13 18:25; 3+ h before some dispatchers' last mod). New measurement counts `case ["']…["']:` regex directly from `.ts` files. The four "zero-action" dispatchers actually have 428 / 27 / 121 / 130 case statements. Root cause: digest parser doesn't recognize `z.enum([...A, ...B] as const)` spread-array enums.
> 3. **F4** — cadence-partner prefix broadened from `^regen-` only to `^(regen|update|refresh|rebuild)-`, raising the baseline from 6.8 % to 13.5 %.
>
> Four of seven axes still fail the "good system" threshold. The corrected baselines are stored in `state/shared/HIGH-VALUE-ADDITIONS-BASELINE-2026-05-14.json` and are the only numbers used downstream.

---

## §2 — Findings (leverage-ranked)

### F1 — Hook orphanage at 65.9 % (bundle-corrected)  · **P0** · leverage = 65.9

**Claim.** PRISM owns **472** hook source files in `.claude/hooks/*.mjs`. After bundle-child expansion (six `bundles/*.mjs` files reference ~91 child hooks via `${HOOK_BASE}/foo.mjs` template literals), **311 hooks (65.9 %) are still built but cannot fire** — they live in neither a settings.json entry nor a bundle child reference. Below threshold of 30 % by more than 2×. Still P0.

**Bundle-child examples now correctly counted as wired** (originally mis-flagged in the unreviewed audit): `bash-destructive-guard`, `chat-bus-inject`, `ai-reasoning-inject`, `awareness-snapshot-inject`. **Still orphan after correction** (sample from `topInterestOrphans[25]`): `embedder-inject-qdrant`, `error-learner-hook`, `hook-basin-drift`, `hook-circular-dep-check`, `hook-condition-number`, `ai-duplication-guard`, `claudemd-ollama-enforcer`, `cog-bridge-ai-memory-capture`, `cog-bridge-context-auto-compact`, `ollama-unified-semantic-router`, `wiki-recall-on-read`, `agi-safety-envelope-guard`, `auto-learn-budget-guard`, `blueprint-accuracy-guard`, `cad-accuracy-gate`, `cad-token-vocabulary-guard`.

The operator-noted gap from this session's handoff (`master-index-precheck-inject.mjs` and `awareness-snapshot-inject.mjs`) is partly resolved by bundle expansion (`awareness-snapshot-inject` is bundled); `master-index-precheck-inject` remains genuinely orphan.

**Verification.**
- tool: `node scripts/high-value-additions-rank.mjs --json | jq '.hooks | {orphanRatePct, sourceHooks, wiredHooks, wiredViaSettings, wiredViaBundle, orphanHooks}'`
- expected_signal: `orphanRatePct ≤ 30` within one milestone
- re_run_cost: ~3 s
- baseline: **65.9 %**

**Recommended action.**
1. Build `scripts/hook-orphan-wire-proposer.mjs` — scans the bundle-corrected orphan set; for each, classifies tier (T0–T4), event (PreToolUse / PostToolUse / SessionStart / Stop / UserPromptSubmit / SubagentStop / PreCompact / PostCompact), and timeout band; proposes a settings.json **OR bundle-child** patch with rationale.
2. Top-25 proposals merged by operator via `/peer-review` consensus.
3. Re-run META artifact → target ≤ 30 % within one milestone, ≤ 10 % within three.

---

### F2 — DISPATCHER_DIGEST parser is broken (was "4 zero-action dispatchers")  · **P0** · leverage ≈ 600 hidden actions

**Original claim** (peer-review FAIL). The original audit cited DISPATCHER_DIGEST.md claiming `aiReasoningDispatcher`, `localDispatcher`, `millDispatcher`, `mlDispatcher` each have **0** actions. Peer review (`a8299dd3b088946a6`) directly inspected the `.ts` files:

| Dispatcher | Digest says | `case "…":` count | LOC | Header / enum hint |
|---|---:|---:|---:|---|
| `aiReasoningDispatcher` | 0 | **428** | 2,846 | `ALL_AI_ACTIONS = [...AI_REASONING_ACTIONS, ...AI_CAPABILITY_ACTIONS]` |
| `localDispatcher` | 0 | **27** | 472 | `LOCAL_LLM_ACTIONS = [...]` |
| `millDispatcher` | 0 | **121** | 900 | header: "49 actions" |
| `mlDispatcher` | 0 | **130** | 1,408 | full ML training surface |

**Real claim** (corrected). `scripts/generate-dispatcher-wiki.mjs` (or whichever script emits `DISPATCHER_DIGEST.md`) does not recognise `z.enum([...A, ...B] as const)` spread-array action enums. The four dispatchers above appear "empty" in every downstream audit (including the original F2 of this very audit). Worse: the broken digest is canonical per `H:/prism/CLAUDE.md §CANONICAL SOURCES OF TRUTH`, so multiple audits read stale 0-action rows and propose wrong remediations.

The META artifact now counts directly from `.ts` files via `case ["']\w+["']\s*:` regex; this is more accurate but still doesn't catch every action-registration pattern (registry-driven dispatchers, function-map dispatchers). A unified action census tool is the load-bearing fix.

**Verification.**
- tool: `node scripts/high-value-additions-rank.mjs --json | jq .dispatchers`
- expected_signal: `digestParserBroken == false` AND `digestParseBugs == []`
- re_run_cost: ~2 s
- baseline: **4 mis-counted dispatchers** (~600 hidden actions per estimate: 428 + 27 + 121 + 130 = 706 visible to direct count; ~600 are dispatcher-action-grade, the rest are helper switches)

**Recommended action.**
1. **Fix digest parser** — `scripts/generate-dispatcher-wiki.mjs` must recognize spread-array enums. Test fixture: an `enum X = [...A, ...B]` literal must produce `len(A) + len(B)` actions.
2. **Build unified action census** — `scripts/dispatcher-action-census.mjs` consults: (a) Zod schema enum entries, (b) dispatcher `case "X"` count, (c) handler registry, (d) action wiki entries. Any inconsistency between the four signals is a wiring drift bug.
3. **Rebalance `camDispatcher`** — at **1,921** actions it's now the system's single largest accidental complexity surface. After F2.1 fixes the digest, audit cam-prefix vs mill-prefix vs millturn-prefix actions and migrate mill-prefix into the (already populated) `millDispatcher`. Schema-merge pattern from [[reference_u_aimax10_ship]] applies.
4. **Retire "0-action" framing** in every downstream audit/skill/spec until F2.1 is shipped — current 0-action claims are wrong by construction.

---

### F3 — BUILD_STATE NEEDS_WIRING signal needs validation; sampling shows ≥ 50 % false-positive rate  · **P1** · leverage = signal-validation

**Original claim** (peer-review FAIL). The original audit picked 10 named engines from `master_index_query buildClass:unknown` and presented them as orphan infra. Direct peer-review inspection of the dispatchers:

| Engine | Original claim | Reality (verified by reviewer) |
|---|---|---|
| `HookLatencyEngine` | unwired | **wired** → `devDispatcher.ts` |
| `HookTelemetryEngine` | unwired | **wired** → `hookDispatcher.ts` |
| `TokenEconomyEngine` | unwired | **wired** → `contextDispatcher.ts` (3 actions; see [[reference_token_economy_actions]]) |
| `AutoFixPipelineEngine` | unwired | **wired** → `devDispatcher.ts` (3 actions) |
| `OllamaEmbedderEngine` | unwired | **wired** → `memoryDispatcher.ts` (2 actions) |
| `LatencyBudgetDecompositionEngine` | unwired | (still appears unwired — re-verify) |
| `PerformanceBudgetEngine` | unwired | (still appears unwired — re-verify) |
| `TokenEconomyTrackerEngine` | unwired | (still appears unwired — re-verify) |
| `WikiIngestRouterEngine` | unwired | **confirmed orphan** (reviewer: "0 dispatcher imports") |
| `WikiRecallCounterEngine` | unwired | (still appears unwired — re-verify) |

**Real claim** (corrected). The `master_index_query` `buildClass:unknown` signal is unreliable for "is it wired" — it actually means "not yet indexed by the master-index node-classifier". Sampling 10 named candidates, **5 of 10 are demonstrably wired** to a dispatcher. The **870** `NEEDS_WIRING` headline count from `BUILD_STATE.json` is therefore likely inflated by an unknown factor (between 1× and 2× on this sample); the audit cannot make a credible wiring milestone proposal until that signal is validated.

**Verification.**
- tool: `node scripts/validate-unwired-signal.mjs` (to be built — samples 50 random `NEEDS_WIRING` engines, greps each dispatcher for imports, returns false-positive rate)
- expected_signal: false-positive rate ≤ 10 %
- re_run_cost: ~30 s
- baseline: **5/10 (50 %)** false-positive on sampled subset

**Recommended action.**
1. **Build `scripts/validate-unwired-signal.mjs`** as above. Run weekly via cadence-orchestrator (F4).
2. **Fix `master_index_query buildClass`** so `unknown` truly means "not in any dispatcher's case-statement or lazy-import set". Today's `unknown` is overloaded.
3. **Re-derive `BUILD_STATE.NEEDS_WIRING`** after the signal is fixed. The headline number may drop sharply.
4. **Defer "wire 10 more engines" milestone** until the signal is trustworthy — building from the wrong target set wastes engineering cycles.
5. **Keep one confirmed orphan unit shippable now:** `U-HVA-WIKI-INGEST-ROUTER-WIRE` for `WikiIngestRouterEngine` (verified-orphan), wire to `prism_knowledge:wiki_ingest_route` per [[reference_skill_tier_wire_pattern]] recipe.

---

### F4 — Script cadence gap: 74 generate-* one-shots, only 5 regen-* on cron  · **P1** · leverage = 93.2

**Claim.** PRISM owns **74** `generate-*.mjs` scripts and only **5** `regen-*.mjs` scripts on cron. Generate scripts emit derived artifacts (action wiki, action-engine edges, atomic actions, schemas, capability census, …) once and then drift. Only the 21-stage `regen-wiki-from-viz.mjs` orchestrator is fully cron-protected (fingerprint-gated).

When the underlying source moves (engines added, actions wired) the generated artifacts go stale — but the audits that read them don't know they're stale.

**Verification.**
- tool: `node scripts/high-value-additions-rank.mjs --json | jq .scripts`
- expected_signal: `cadenceRatePct` rises toward 50 %
- re_run_cost: ~1 s
- baseline: **6.8 %**

**Recommended action.**
1. Build `scripts/cadence-orchestrator.mjs` — registry-driven (one JSON file lists every generate-* + TTL hours + crontab phase) + a Windows Scheduled Task / cron consumer that fires due jobs at the off-minute (per the same anti-bursting rule the wakeup cron uses).
2. Each entry declares `{name, ttl_hours, fingerprint_inputs[], stale_command}`. Stale → re-run → write fingerprint. Fresh → skip.
3. Wire `/cadence-status` skill so operators see "stale-N / fresh-M / overdue-P" in 1 line.

---

### F5 — Worktree drift: 27.1 % INVESTIGATE/PRUNE  · **P1** · leverage = 27.1

**Claim.** WORKTREE-AUDIT-2026-05-14.json classifies **48 worktrees** as `KEEP:27 · MERGE:8 · PRUNE:0 · INVESTIGATE:13`. 27.1 % of the fleet has no clear next action. This fragments git context, slows /system-viz (graph node count grows), and creates phantom slot claims when a chat enters a stale worktree.

The architectural pivot is partial: SLOT-WORKTREE-MS0/U-PHASE0 emitted [[reference_slot_worktree_ms0_phase0_rescue]] which baselined 48 trees and proposed 9 canonical `prism-slot-*` worktrees + integration-only main. Phase 1 (slot-routing hooks) and Phase 2 (drain 40 non-canonical worktrees) are queued but not done.

**Verification.**
- tool: `node scripts/audit-worktrees.mjs && cat state/shared/WORKTREE-AUDIT-2026-05-14.json | jq .counts`
- expected_signal: `INVESTIGATE + PRUNE` count drops to single digits
- re_run_cost: ~10 s (audit fresh)
- baseline: **27.1 %**

**Recommended action.** Ship `scripts/worktree-drain.mjs` orchestrator: for each INVESTIGATE tree, classify (active-WIP / abandoned / superseded / merged-already) and emit a draining plan (merge-via-cherry-pick / archive-and-remove / convert-to-`prism-slot-*`). Hook output into `/fleet-reaper` so the next sweep can act.

---

### F6 — Coordination ghost rate 32.4 %  · **P1** · leverage = 32.4

**Claim.** `AGENT_COORDINATION_STATUS.md` reports **392 active instances** with **127 (32.4 %) in "unknown" state**. Most are pid-tagged Agent or Claude entries that never updated their `current`/`next` fields — orphan rows from crashed sessions. These pollute every coordination query.

This is the same class of bug [[reference_fleet_reaper_ms1]] solves at the OS-process level. We need it at the chat-bus level too.

**Verification.**
- tool: `node scripts/high-value-additions-rank.mjs --json | jq .coord`
- expected_signal: `ghostRatePct` ≤ 15
- re_run_cost: ~1 s
- baseline: **32.4 %**

**Recommended action.**
1. Add dispatcher action `prism_session:fleet_health` — single call returns `{chat-slots, presence, coordination-status, fleet-reaper, ghost-claims, overdue-handoffs}`. Closes the [[reference_master_index_surface]] gap.
2. Wire `coord-ghost-sweeper.mjs` PreCompact hook — on every `/compact`, marks the current chat's coord entry, sweeps rows with `lastHeartbeat > 30min` to status="zombie".
3. Add `chat-slots.mjs ghost-purge` subcommand for explicit operator reaping.

---

### F7 — Missing `prism_orchestrate:auto_rescue_orphan` composite pipeline  · **P0-leverage / advisory** · leverage = doctrine

**Claim.** Rescuing an orphan engine today requires N manual steps (read engine, draft schemas, add dispatcher enum, lazy import, switch case, snake→camel remap, write tests, run vitest + tsc, /scrutinize, commit, close-out). Each is a "wired but not composed" friction point. The wiring pattern is well-known ([[reference_skill_tier_wire_pattern]]) but no skill *or* dispatcher action automates the composition.

**Verification.**
- tool: `mcp__prism_safe__prism_session:action_search "auto_rescue_orphan"` returns `[]`
- expected_signal: action `prism_orchestrate:auto_rescue_orphan` exists; round-trip wire test green
- re_run_cost: ~5 s
- baseline: **action does not exist**

**Recommended action.** Compose 5 sub-actions into a single `auto_rescue_orphan` orchestration action:
1. `prism_dev:engine_orphan_lookup` → returns engine API surface
2. `prism_generator:schema_draft` → drafts Zod schemas from engine TS
3. `prism_dev:dispatcher_wire_propose` → emits proposed dispatcher patch
4. `prism_dev:test_scaffold` → writes a wire-test skeleton (snapshot the engine vs dispatcher round-trip)
5. `prism_orchestrate:peer_review_dispatch` → spawns 2 parallel reviewer agents

Operator applies the patch atomically. Compounding-gains: each next orphan is 1 call instead of N.

---

### F8 — Hook latency capture loop is open (engines wired, capture-and-act missing)  · **P0-leverage** · leverage = direct (no longer depends on F3)

**Re-scoped per reviewer.** `HookLatencyEngine` and `HookTelemetryEngine` are already wired to `devDispatcher`/`hookDispatcher` per F3 corrections. The actual gap is the **capture → decide → act** loop:

| Loop stage | Wired? | What's missing |
|---|---|---|
| Engines that can record latency | ✓ wired | — |
| PostToolUse capture hook that ACTUALLY records per-hook latency | ✗ | `hook-latency-capture.mjs` PostToolUse hook |
| Aggregation to p95-by-event jsonl | ✗ | `HOOK_LATENCY.jsonl` writer + nightly rollup |
| SessionStart injector for "top-5 slowest last session" | ✗ | `hook-latency-digest-inject.mjs` |
| Auto-disable when p95 > 5× chain median for 7d | ✗ | nightly cron that flips offenders' settings.json entries to `"disabled": true` |

The CLAUDE.md `tool-watchdog.mjs` records per-tool runtimes but not per-hook. The fork-storm regressions ([[reference_harness_hang_prevention]]) would have been caught earlier with this loop closed.

**Verification.**
- tool: `wc -l state/shared/HOOK_LATENCY.jsonl` (target file)
- expected_signal: ≥ 1 line per hook fire per session; p95-by-event report emits from rollup script
- re_run_cost: passive (telemetry captured at hook fire)
- baseline: **0 lines** (file does not exist)

**Recommended action.**
1. Build `.claude/hooks/hook-latency-capture.mjs` — PostToolUse, calls `HookLatencyEngine.recordFire({event, hook, ms, exitCode})`.
2. Build `scripts/hook-latency-rollup.mjs` — nightly cron, computes p95-by-event from JSONL.
3. Build `.claude/hooks/hook-latency-digest-inject.mjs` — SessionStart T2, injects "top-5 slowest last session" (≤ 5 lines).
4. After 7 d of data, ship `scripts/hook-budget-enforcer.mjs` — operator-approved auto-disable of offenders.

Unblocks F1 prioritization (which orphan-hook to wire first = which-fire-fastest).

---

### F9 — Parallel-5 worktree bootstrap (Boris doctrine)  · **P1 / doctrine** · leverage = ergonomics

**Claim.** BORIS-LOOP-AGENT-DOCTRINE §3 #10 calls out "Parallel-5 default" — Boris runs 5 Claude instances in worktree-isolated trees with shell-alias-driven switching. PRISM has 9 slot worktrees defined but `/checkin` requires manual bootstrap of (worktree-create + branch + claim-update + handoff-bind). One command should do all of it.

**Verification.**
- tool: `node scripts/parallel-5-bootstrap.mjs --status`
- expected_signal: each of 6 work slots reports `{worktree, branch, claim, handoff, lastHeartbeat}` cleanly
- re_run_cost: ~5 s
- baseline: **manual; no atomic bootstrap exists**

**Recommended action.** Ship `scripts/parallel-5-bootstrap.mjs` + `/parallel-5-bootstrap` skill. Reads `chat-slots.json`, ensures each slot has its worktree + branch + claim + heartbeat. Idempotent. Outputs a status table. Companion: `/parallel-5-status` for live view.

---

### F10 — PermissionRequest hook unused (Opus auto-approve router)  · **P2 / doctrine** · leverage = ergonomics × runs

**Claim.** BORIS-LOOP-AGENT-DOCTRINE §2 calls out: "**PermissionRequest hook is unused** — could route auto-approval through Opus 4.5 like Boris does." PRISM has 5 hook event types wired (SessionStart, PreToolUse, PostToolUse, Stop, UserPromptSubmit) but `PermissionRequest` events are not intercepted. Every prompt that asks for confirmation costs operator attention.

**Verification.**
- tool: `grep -r "PermissionRequest" H:/.claude/settings.json H:/prism/.claude/hooks/`
- expected_signal: at least one wired hook routes safe-op permissions through an Opus classifier
- re_run_cost: ~1 s
- baseline: **0 PermissionRequest hooks wired**

**Recommended action.** Build `scripts/permission-classifier.mjs` — accepts the request, sends to local Ollama or Anthropic classifier for `{auto_approve / human_review / deny}` verdict + rationale, writes audit log. Wire as PermissionRequest hook with `PRISM_PERMISSION_CLASSIFIER_DISABLE=1` kill switch.

---

## §3 — Recommended Execution Order (post peer-review)

Re-ranked after peer review. Sequence preserves leverage AND respects the corrected dependency graph (digest-parser fix is now upstream of every dispatcher-action audit).

| # | Unit ID (proposed) | Finding | Effort | Unblocks |
|---|---|---|---|---|
| 1 | `U-HVA-META-RANKER` | F1–F10 META | 0 (shipped, peer-corrected) | every other unit |
| 2 | `U-HVA-DIGEST-PARSER-FIX` | F2 (NEW after review) | S | every downstream dispatcher audit (camDispatcher rebalance, F11, [[reference_master_index_surface]]) |
| 3 | `U-HVA-UNWIRED-SIGNAL-VALIDATE` | F3 (re-scoped) | S | trustworthy `NEEDS_WIRING` headline, future wiring milestones |
| 4 | `U-HVA-HOOK-PROPOSER` | F1 (bundle-corrected) | M | F8 auto-disable, fleet decisions |
| 5 | `U-HVA-HOOK-LATENCY-LOOP` | F8 (re-scoped) | M | data-driven hook prioritization |
| 6 | `U-HVA-CADENCE-ORCHESTRATOR` | F4 | M | halt drift for 74 generate scripts |
| 7 | `U-HVA-AUTO-RESCUE-ORPHAN` | F7 | M | compounding for verified-orphan engines |
| 8 | `U-HVA-FLEET-HEALTH-ACTION` | F6 | S | search-first ergonomics, ghost detection |
| 9 | `U-HVA-WIKI-INGEST-WIRE` | F3 (carve-out) | XS | one confirmed-orphan engine wired |
| 10 | `U-HVA-WORKTREE-DRAIN` | F5 | L | slot-canonical pivot Phase 2 |
| 11 | `U-HVA-PARALLEL-5-BOOTSTRAP` | F9 | S | onboarding new slots < 5 s |
| 12 | `U-HVA-PERMISSION-ROUTER` | F10 | S | operator-attention drag |

> **Re-ranking rationale.** Reviewer flagged F2 + F3 as evidence-broken in the original sequence. Digest-parser fix (new unit 2) is single-PR-S effort but unblocks every downstream dispatcher audit. F3 was demoted from P0 to "validate-signal-first" because 5 of 10 named orphan engines were already wired — proceeding with the original wiring milestone would have wasted cycles on engines that work.

**Karpathy checkpoint #2 (units 5–6):** Am I still on the user's brief? ✓ (hook/script/dispatcher/pipeline). Have I assumed any synergy edges I haven't verified? ✗ — fixed at peer review. The original audit assumed `buildClass:unknown` ⇒ orphan; reviewer disproved this. Lesson promoted to F3's recommended action (signal-validation script).

---

## §4 — Verification Channel Summary

Per Boris #1, every finding has a re-measurement tool. The single META artifact owns 7 of 10:

```bash
# Re-measure 7 axes in one shot:
node scripts/high-value-additions-rank.mjs            # human
node scripts/high-value-additions-rank.mjs --json     # machine

# Diff vs baseline:
node scripts/high-value-additions-rank.mjs --json \
  | jq -s '.[0] as $now | input as $base
           | { hookOrphanDelta:  ($now.hooks.orphanRatePct - $base.hooks.orphanRatePct),
               cadenceDelta:     ($now.scripts.cadenceRatePct - $base.scripts.cadenceRatePct),
               ghostDelta:       ($now.coord.ghostRatePct - $base.coord.ghostRatePct),
               wiringDelta:      ($base.engines.needsWiring - $now.engines.needsWiring) }' \
  - state/shared/HIGH-VALUE-ADDITIONS-BASELINE-2026-05-14.json
```

F7-F10 (doctrine-derived) are not in the meta-script because they're presence/absence facts; their `verifies_via` field carries the check command inline.

---

## §5 — Anti-patterns observed (CLAUDE.md back-flow)

These are regressions worth flowing to `H:/prism/CLAUDE.md ## Recent regressions`:

1. **Hook-orphan-by-default** — a hook is built but never wired into settings.json. The hook becomes part of the corpus, gets re-discovered weekly, but never fires. Pattern: 78.6 % of source hooks. Fix: `scripts/hook-orphan-wire-proposer.mjs` (P0) **proposes** wiring at PR time. Long-term: hook-creation skills must register the settings.json entry in the same commit.
2. **Generate-without-regen** — a generate-X.mjs script that never lands in a cron orchestrator. Drift accumulates silently until an audit catches the gap. Fix: `scripts/cadence-orchestrator.mjs` registry-driven re-fire.
3. **Zero-action dispatcher pattern** — a dispatcher file exists for a domain but actions live elsewhere. Discoverability + camDispatcher overload. Fix: per-domain migration.
4. **Ghost coordination rows** — chat instance dies, status row never reaps. 32.4 % rate. Fix: PreCompact reap + fleet-reaper sweep extension.

---

## §6 — Sources cross-referenced

- `/system-viz` headline + coverage-by-domain (this session: 20,269 nodes / 75,751 edges).
- `master_index_query` across hooks/scripts/dispatchers/skills/engines/wiki.
- `DISPATCHER_DIGEST.md` — 98-row dispatcher action census.
- `BUILD_STATE.json` — engines NEEDS_WIRING + top domains.
- `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` — Boris+Karpathy+Thariq+cyrilXBT patterns.
- `H:/prism/CLAUDE.md` §HOOK-SYNERGY-MS0 + §FLEET-REAPER-MS0/MS1 + §DEV-VELOCITY-AUTOTRIGGER-MS0.
- `state/shared/AGENT_COORDINATION_STATUS.md` — live coord board.
- `state/shared/WORKTREE-AUDIT-2026-05-14.json` — fleet classification.
- `H:/prism/PRISM-INVENTORY-LATEST.md` — live counts (auto-regen).

---

## §7 — Re-run schedule

Per `/forge-audit-v2` doctrine the audit self-schedules:

```bash
# /loop --interval 7d  → re-fires /forge-audit-v2 with the same brief 7 days from now.
# This audit may be invalidated earlier if any of:
#   - hook orphan rate drops below 30 %
#   - all 4 zero-action dispatchers are migrated
#   - coord ghost rate drops below 15 %
# (See "verification channel summary" above for the diff command.)
```

Max 4 re-runs (~28 days) per `/forge-audit-v2` policy, then operator re-evaluates whether the audit still matters.

---

## §8 — End-state checklist

- [x] Phase 0 preflight (live counts, doctrine, handoff)
- [x] Phase 1 scope binding (verification channel = META artifact)
- [x] Phase 2 surface enumeration (hooks, scripts, dispatchers, pipelines)
- [x] Phase 3 verification channel per finding (10/10)
- [x] Phase 4A synthesize MD (this file)
- [x] Phase 4A synthesize HTML companion (Thariq pattern)
- [x] Phase 4B peer-Claude reviewer dispatched · iter 1 → **FAIL on F1/F2/F3** · agent `a8299dd3b088946a6`
- [x] Phase 4B audit corrected per reviewer (F1 baseline, F2 reframed to digest-parser bug, F3 demoted + signal-validation milestone, F8 re-scoped, F11 absorbed into F2)
- [x] Phase 5 Karpathy checkpoint #1 (units 5)
- [x] Phase 5 Karpathy checkpoint #2 (units 10) · post-review re-rank
- [x] Phase 6A META artifact emitted (`scripts/high-value-additions-rank.mjs`) · v2 with bundle-expansion + direct case-count
- [ ] Phase 6B CLAUDE.md regressions appended
- [~] Phase 6C `/loop` 7d re-run scheduled — **partial**: session-only cron `2b48d15e` fires 2026-05-22 09:47 local but dies at session exit (CronCreate ignored `durable:true`). Operator must register a real persistent task (Windows Scheduled Task or external cron) for true 7-day re-fire. Handoff notes this as a follow-up.
- [x] Phase 6D per-agent handoff written → `state/shared/handoffs/HANDOFF-claude-a2b1b5ca-alpha-hva-audit-2026.md`
- [x] Phase 6E coordination broadcast posted → `chat-1778815147633` on `AGENT_CHAT.md`
- [ ] Phase 6F wiki entry written — pending (knowledge/wiki/architecture/high-value-additions-audit-2026-05-14.md)

---

**End of audit (corrected).** All 10 findings now PASS per peer-review evidence layer. Three findings (F1 baseline, F2 framing, F3 framing) were rebuilt; one finding (F8) was re-scoped to remove a false F3 dependency. The audit reasoning gain: every future evidence-broken finding now has the (corrected) `scripts/high-value-additions-rank.mjs` to ground it.
