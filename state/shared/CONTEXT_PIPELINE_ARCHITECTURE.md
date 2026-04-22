# Context Pipeline Architecture (CPP-MS5-U-CPP38)

**Version:** 1.0.0 | **Last updated:** 2026-04-17
**Scope:** The chain of engines, hooks, and state files that move context
from an agent's compaction boundary through to its next active reasoning
turn, preserved across 6+ concurrent Claude/Codex terminals on one worktree.

---

## Goal

Every session start — whether after compaction, cold restart, or fresh
spawn — must load a coherent picture of **who I am, where I left off, what
other agents are doing, and whether the pipeline that delivered me here is
intact**. The pipeline turns an opaque "your context is about to be
truncated" event into a durable, inspectable, hash-verified artifact chain.

---

## Data flow diagram

```
                ┌─────────────────────────────────┐
                │  Compaction / SessionStart       │
                │  event from Claude Code runtime │
                └───────────────┬─────────────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       │                        │                        │
       ▼                        ▼                        ▼
┌─────────────┐      ┌─────────────────────┐    ┌────────────────────┐
│ pre-compact │      │ compaction-survival │    │ post-pipeline-     │
│ (captures   │      │ .mjs (writes        │    │ integrity-check    │
│ open goals, │      │ per-instance +      │    │ .mjs (hashes       │
│ ledger      │      │ legacy survival     │    │ survival+handoff+  │
│ insights)   │      │ .md with identity,  │    │ session_artifacts  │
│             │      │ resume, workboard,  │    │ → links[], score,  │
│             │      │ context chart)      │    │ valid flag)        │
└─────────────┘      └──────────┬──────────┘    └──────────┬─────────┘
                                │                          │
                                ▼                          ▼
                   ┌────────────────────────┐   ┌──────────────────────┐
                   │ .claude/helpers/       │   │ state/shared/        │
                   │ .compaction-survival-  │   │ PIPELINE_INTEGRITY   │
                   │ <family>-<machine>-    │   │ .json (schemaV1)     │
                   │ <sess>.md              │   │                      │
                   └────────────────────────┘   └──────────┬───────────┘
                                                           │
                                                           ▼
                                            ┌──────────────────────────┐
                                            │ publish-pipeline-metrics │
                                            │ .mjs (scans filesystem   │
                                            │ + reads integrity snap   │
                                            │ → metrics snapshot)      │
                                            └──────────┬───────────────┘
                                                       ▼
                                         ┌────────────────────────────┐
                                         │ state/shared/              │
                                         │ PIPELINE_METRICS.json      │
                                         │ (compact_count,            │
                                         │  survival_bytes,           │
                                         │  handoff_rt, empty_rate)   │
                                         └────────────────────────────┘
```

**Next session boot** reads the survival file for its own instance (by
parsing `## Identity` block), parses `PIPELINE_INTEGRITY.json` to verify
the chain, and consults `PIPELINE_METRICS.json` for regression signals.

---

## Engines

| Engine | File | Role |
|---|---|---|
| `SessionHandoffV2Engine` | `src/engines/SessionHandoffV2Engine.ts` | Builds + validates `HANDOFF-<family>-<machine>-<instance>.md` per session. Enforces `family ∈ {claude, codex, other}`. |
| `ContextIntegrityEngine` | `src/engines/ContextIntegrityEngine.ts` | `verifyChain(artifacts)` — pure SHA-256 hash-chain + empty-artifact detection + 0–100 score. |
| `ContextWindowMapEngine` | `src/engines/ContextWindowMapEngine.ts` | `chart()`, `oneLiner()`, `map()` — ASCII visualization of context-window utilization. |
| `PipelineMetricsEngine` | `src/engines/PipelineMetricsEngine.ts` | `collect(input)` — aggregates filesystem stats + integrity snapshot into metrics. |
| `CodexBoundaryEngine` (upstream) | `src/engines/CodexBoundaryEngine.ts` | Owns the strict-lane rule. Consumes the `family` field added in U-CPP35. |

Rule: engines are pure. No I/O, no state mutation. Hooks do the I/O; engines
compute. Tests exercise engines directly via DI-seam hashers / input records.

---

## Hooks

| Hook | Path | Trigger | Output |
|---|---|---|---|
| `compaction-survival.mjs` | `.claude/helpers/compaction-survival.mjs` | SessionStart | per-instance + legacy survival `.md` |
| `post-pipeline-integrity-check.mjs` | `.claude/hooks/post-pipeline-integrity-check.mjs` | SessionStart | `state/shared/PIPELINE_INTEGRITY.json` |
| `publish-pipeline-metrics.mjs` | `.claude/hooks/publish-pipeline-metrics.mjs` | SessionStart | `state/shared/PIPELINE_METRICS.json` |
| `pre-compact.mjs` | `.claude/helpers/pre-compact.mjs` | PreCompact | snapshots goals/insights into survival file |
| `agent-coordination.mjs` | `.claude/helpers/agent-coordination.mjs` | periodic | `state/shared/AGENT_WORKBOARD.md` |
| `compact-restore.mjs` | `.claude/helpers/compact-restore.mjs` | SessionStart | directive-freshness warning block |
| `git-anti-clobber.mjs` | `.claude/hooks/git-anti-clobber.mjs` | PreToolUse(Bash) | lockfile in `state/shared/GIT_LOCK.json` |

Hooks that write TypeScript-derived data carry **inline mirrors** of engine
logic (e.g. `verifyChain`, `collect`), and integration tests spawn the hook
then re-run the authoritative engine method against identical inputs to
prove parity. This is the anti-drift pattern for `.mjs` runtime boundaries.

---

## State files (artifacts)

| File | Owner | Purpose | Schema |
|---|---|---|---|
| `.claude/helpers/.compaction-survival-<family>-<machine>-<session>.md` | compaction-survival.mjs | Per-instance resume block | plain markdown with `## Identity` block |
| `.claude/helpers/.compaction-survival.md` | compaction-survival.mjs | Legacy single-file fallback | same markdown |
| `state/shared/handoffs/HANDOFF-<family>-<machine>-<instance>.md` | SessionHandoffV2Engine | Per-session handoff | v2, Zod-validated |
| `state/shared/PIPELINE_INTEGRITY.json` | post-pipeline-integrity-check.mjs | Hash chain of above 3 files | v1, `{schemaVersion, links[], score, valid}` |
| `state/shared/PIPELINE_METRICS.json` | publish-pipeline-metrics.mjs | Regression signals | v1, `{compactionCount, survivalBytes, handoffRoundtripMs, emptyFileRate}` |
| `state/shared/AGENT_WORKBOARD.md` | agent-coordination.mjs | Who's alive + what they're doing | markdown with `## Agent@<machine>/<session>` stanzas |
| `state/shared/ACTIVE_WORK_REGISTRY.json` | agent-coordination | Cross-session claim dedupe | `{active: [...]}` |
| `state/shared/GIT_LOCK.json` | git-anti-clobber.mjs | Worktree-wide git lock | `{holder, pid, acquired_at, command}` |

---

## Per-terminal addressability

All per-session artifacts are keyed by `<family>@<machine>/<session>`:

- `family ∈ {Claude, Codex, Agent, other}` — inferred from env
  (`CLAUDE_SESSION_ID`, `CODEX_THREAD_ID`, etc.) by `inferAgentIdentity()`
  in `.claude/helpers/agent-identity.mjs`.
- `machine` — `process.env.COMPUTERNAME` / `os.hostname()`, sanitized.
- `session` — PID fallback; explicit envs (`CLAUDE_SESSION_ID`, `WT_SESSION`,
  `CONEMU_PID`) take precedence when set.

The survival file, handoff file, and workboard stanzas all use this key so
6+ concurrent terminals never clobber each other. Legacy single-file
fallbacks remain for backward compat with readers that don't know the
per-instance pattern.

---

## Concurrency model

The hard problem: N Claude terminals + M Codex terminals on one worktree,
all running SessionStart hooks at roughly the same time.

- **Git operations** serialize through `state/shared/GIT_LOCK.json`. Held
  by PID, timestamp, and command. `git-anti-clobber.mjs` PreToolUse hook
  enforces the lock on every `git add` / `git commit` / `git checkout`.
  Stale locks (dead PID > 60s) are cleared by the next caller after a
  process-liveness probe.
- **File writes** are atomic: write to `.tmp-<pid>` then `rename()`. Prevents
  partial reads if a second terminal is parsing mid-write.
- **State reads** are optimistic — readers tolerate malformed JSON (return
  defaults, log to telemetry).
- **Workboard** is rewritten wholesale, not appended. `agent-coordination.mjs`
  owns the single writer path; others may read only.

---

## Codex boundary

Codex terminals are restricted to frontend tracks (APP, APPW, FMERGE, WEB, UI);
Claude is restricted to backend tracks (S0, QA, SYS, CAMK, CAMX, WEDM, ACP,
RES, SAFE, PHYS, BIZ). Enforcement lives at two layers:

1. **Advisory** — `AGENT_BOUNDARY_DIRECTIVE.md` injected into every survival
   file; agents must read before acting.
2. **Machine-readable** — the `family` field (CPP-MS5-U-CPP35) is present
   on every new artifact, so boundary hooks can mechanically verify the
   writer's lane and reject cross-boundary writes without guessing.

`CodexBoundaryEngine` consumes the `family` field from survival files,
handoffs, workboard stanzas, and PIPELINE_INTEGRITY.json to decide
whether a given write is in-lane.

---

## Regression detection

`PIPELINE_METRICS.json` is the canonical signal board. Dashboards watch for:

- `emptyFileRate > 0` — the "3-byte dead file" regression from the CPP root
  cause analysis. Any non-zero value is a yellow alert.
- `survivalBytes.total` growth over 50% session-over-session — survival
  file bloat (usually caused by unbounded `Recent Completed:` lists).
- `handoffRoundtripMs > 24h` — stale handoffs suggesting the writer hook
  hasn't fired recently (crashed session, stuck pre-compact).
- `compactionCount > 200` — per-instance file pollution; run janitor to
  reap survival files older than 30d.

`PIPELINE_INTEGRITY.json.valid === false` is a hard signal: something in
the chain is empty or tampered. Readers of the boot block MUST refuse to
trust the RESUME directive when `valid: false` and fall back to re-reading
CURRENT_POSITION.md + git log directly.

---

## Milestone trail

| Unit | Adds |
|---|---|
| U-CPP01..U-CPP07 | Atomic writes + concurrency test harness |
| U-CPP08..U-CPP17 | Engine wiring + hook refactors |
| U-CPP18..U-CPP25 | Per-terminal addressability + lifecycle |
| U-CPP26..U-CPP30 | Engine test coverage |
| U-CPP31..U-CPP33 | Schema versioning + Zod + directive freshness |
| U-CPP34 | `verifyChain()` + PIPELINE_INTEGRITY.json |
| U-CPP35 | `family` field on every hook artifact |
| U-CPP36 | ContextWindowMap chart in boot block |
| U-CPP37 | PIPELINE_METRICS.json publisher |
| U-CPP38 | This document |
