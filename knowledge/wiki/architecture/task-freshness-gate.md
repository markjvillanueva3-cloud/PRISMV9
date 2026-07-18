---
name: task-freshness-gate
type: architecture
domain: fleet-discipline
created: 2026-05-18
slot: foxtrot
tags: [pretooluse-hook, doctrine-r13, slot-task-claim, staleness, bash-bundle, fail-open]
---

# TASK-FRESHNESS-GATE-MS0 — R13 enforcement

## Why

A task's ground truth is its generation timestamp. PRISM gated this for only two
narrow surfaces before (goal-complete-gate ≤2h CLOSE-OUT-CANDIDATES; scrutiny
5-min session ledger). Units picked from a `pending` envelope generated days ago
may already be shipped (silent close-out debt), rescoped by a peer audit, or
collide with just-landed work. R13 makes the check deterministic at the moment a
chat commits to a unit: `slot-task-claim.mjs claim --unit <MS::U-ID>`.

User directive (2026-05-17): *"make a clause that you check the date of when
tasks where generated so you compare to whats new to see if we need to make
adjustments to build"* → AskUserQuestion → **doctrine + hard PreToolUse gate**
over all 4 task surfaces.

## Architecture

**Pure core** `.claude/helpers/task-freshness.mjs` — all readers injectable
(`readJson/statFile/readText/gitLog/readChatBus/now`); fail-open contract (never
throws to caller; classify/read return `unknown`/`null`; the GATE owns the
block). Exports: `classifyTaskSource` · `readGenerationTimestamp` ·
`countActivitySince` · `decideFreshness` · `ackPath` · `acknowledgmentValid` ·
`writeAcknowledgment` · `evaluate`. CLI: `eval --unit X` / `ack --chatId C
--unit X [--ttl-min N]`.

**4 surfaces + their authoritative gen timestamp** (verified vs live data):
| surface | field | trusted? |
|---|---|---|
| envelope `mcp-server/data/milestones/<MS>.json` | `created_at` (+ unit row `status`/`completed_at`) | yes |
| audit-spec (`source_audit`, path-contained) | in-file `generatedAt` / filename `YYYY-MM-DD` / mtime | yes |
| inventory (ROADMAP-CONSOLIDATED / MISC-TASKS / slot-task-queues) | `generatedAt` | yes |
| handoff `HANDOFF-*.md` | frontmatter `written_at` | yes |
| (fallback) git-first-touch | `git log --diff-filter=A` | yes |
| (last resort) file mtime | — | **no — untrusted anchor** |

**decideFreshness — 7 ordered branches** (every stale branch forces a re-check):
(a) unit envelope row `status:completed|done|shipped|closed` → `already-shipped`
(strongest, no commit math); (e) gen unresolved + activity → `gen-unknown-*`;
(b) gen in the future → `gen-in-future`; (c) untrusted anchor (file-mtime/none)
→ `gen-anchor-untrusted`; (d) git unavailable → `freshness-unprovable`
(R12 — never silent-pass a freshness it couldn't compute); (f) age > staleHrs →
`stale-by-age`; (g) age>1h ∧ commits≥peerTrig → `stale-by-activity`; else
`fresh`.

**Hook** `.claude/hooks/task-freshness-gate.mjs` — runs INSIDE
`.claude/hooks/bundles/bash-bundle.mjs` as a `BASH_HOOKS[]` entry (between
commit-ownership-guard and worktree-commit-route). The bundle itself is wired
in `H:/.claude/settings.json` (PreToolUse `^Bash$` matcher, ~line 640) — so
**no per-hook settings.json entry**. To verify wiring:
`grep -n task-freshness-gate H:/prism/.claude/hooks/bundles/bash-bundle.mjs`
(NOT `.claude/hooks/*.mjs` — the bundle lives in the `bundles/` subdir; a
non-recursive grep there will wrongly conclude the gate is unwired).
- Kill-switch first (zero IO) → readStdin → JSON → **fast-path: not a real
  claim invocation → allow** (IO-free, fork-storm-safe; fires on every Bash).
- `isRealClaimInvocation` = `stripQuoted(cmd)` then CLAIM_RE — a quoted mention
  inside echo/grep/JSON is NOT a claim; a bare `node …/slot-task-claim.mjs
  claim` IS. `flag()`/`unquote()` normalise quoted `--unit "MS::U"`.
- Malformed `--unit` (mismatched quotes / non-canonical) → **fail-CLOSED block**
  (the only residual quote-evasion is closed; hard gate can't be quote-skipped).
- Own active claim (this chatId holds a non-expired `slot-task-claims.json`
  entry for the unit) → silent allow (mid-/loop heartbeat not re-gated).
- `--ack-stale` token / `PRISM_TASK_FRESHNESS_BYPASS=1` → write 30-min ack
  stamp + JSONL audit → allow.
- Stale + no valid stamp → `{decision:"block",reason}` (structured re-check
  protocol). **Exit 0 always** — a bundled sub-hook signals block via stdout
  JSON only; `process.exit(2)` risks the Windows pipe-truncation silent-bypass
  class (hook-runner reads `parsed.decision`, re-derives outward exit-2 itself).
- Fail-open absolute: every throw / missing envelope / git timeout →
  `emit({})` allow + JSONL error log. The gate's own bug never blocks a claim.

## Knobs

`PRISM_TASK_FRESHNESS_GATE_DISABLE=1` (full off) ·
`PRISM_TASK_FRESHNESS_STALE_HRS` (24) ·
`PRISM_TASK_FRESHNESS_PEER_COMMITS_TRIGGER` (5) ·
`PRISM_TASK_FRESHNESS_ACK_TTL_MIN` (30) ·
`PRISM_TASK_FRESHNESS_BYPASS=1` (one-shot, audited) ·
`PRISM_TASK_FRESHNESS_GIT_TIMEOUT_MS` (hook bounds to 3500 for the 5000ms
bundle entry) · `PRISM_TASK_FRESHNESS_VERBOSE=1` (telemetry JSONL).

## Tests

`scripts/__tests__/task-freshness.test.mjs` — 36 `node:test`: hermetic
(injected readers) across all 8 exports + 7 decideFreshness branches +
boundary (strict-`>` 24h, inclusive-`>=` 5-commits) + ack roundtrip/expiry +
a `::→__` fail-on-revert oracle + the fork-storm pair (untrusted anchor must
NOT spawn `--since`; trusted anchor MUST — proves the guard's two-sidedness) +
**2 real-data E2E** (live FEATURE-GAP-AUDIT-MS0.json completed unit →
`already-shipped`; non-existent unit → fail-open) per the RGS-MS1 lesson
(pure-core + injected-readers MUST ship ≥1 real-data E2E).

## Operator notes (read if you hit a block)

- **`--ack-stale` is a synthetic token, not a real `slot-task-claim.mjs`
  flag.** It is parsed ONLY by this gate (`flag(cmd,"ack-stale")`).
  `slot-task-claim.mjs` ignores unknown args, so appending `--ack-stale` to
  the exact same `... claim --slot X --unit Y --chatId Z` command is safe —
  the claim still works and the gate writes a 30-min ack stamp. Within that
  TTL the same claim re-runs silently (the `/loop` won't re-prompt) — that's
  expected, not a bug.
- **A missing block does NOT prove the unit is fresh.** The gate is
  fail-open by design: any internal error (unparseable envelope, git timeout,
  helper import failure) → silent allow + a JSONL error-log line, never a
  block. So "the gate didn't stop me" means *either* fresh *or* the gate
  could not evaluate. For a hard guarantee, read the verdict explicitly:
  `node .claude/helpers/task-freshness.mjs eval --unit <MS::U-ID>`.
- **Own active claim → silent allow.** If your chatId already holds a
  non-expired `slot-task-claims.json` entry for the unit (mid-`/loop`
  heartbeat), the gate does not re-evaluate — you are provably past the
  decision point. Don't panic when a unit you're actively building stops
  prompting.
- **Kill switch:** `PRISM_TASK_FRESHNESS_GATE_DISABLE=1` (fleet-wide off).
  One-shot audited bypass: `PRISM_TASK_FRESHNESS_BYPASS=1 <claim cmd>`.

## Known residual (P3, deferred)

Escaped/nested-quote command strings (`"\"…\""`) can leave claim text exposed
after the naive 3-regex `stripQuoted` → false-BLOCK. Fails **safe** (toward
block, recoverable via `--ack-stale`), never toward silent-allow. Realistic
fleet commands (plain `git commit -m "…"`, `grep`, `echo`) are handled because
CLAIM_RE requires the literal `slot-task-claim` token — a different `--unit`
script is never gated. Decided P3 by both per-file reviewers round-3.

## Lessons

- A bundled PreToolUse sub-hook signals block via **stdout JSON only**; exit-2
  in the write-callback is a silent-bypass vector under the Windows
  pipe-truncation race. (Reviewer A missed this round-2; B caught it — the
  2-reviewer gate earned its keep.)
- Quote-stripping is the robust discriminator between a real invocation and a
  quoted mention; pair it with value-`unquote()` + a fail-CLOSED canonical-id
  check so the hard gate is not quote-evadable.
- Live-wiring a claim-gate makes it gate your own verification shell — verify
  via stdin **file fixtures** (the actual contract, not a proxy).
