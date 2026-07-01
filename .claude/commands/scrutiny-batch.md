---
name: scrutiny-batch
title: Scrutiny Batch — Parallel Per-File Reviewer Dispatch
description: Run the per-file scrutiny gate across N files in ONE parallel reviewer-agent block instead of N serial rounds. Optional loop mode re-runs after fixes until all files PASS or max iterations reached.
type: skill
model: sonnet
effort: high
context: development
allowed-tools:
  - Bash
  - Read
  - Agent

# ── PRISM auto-trigger frontmatter ──
# FORWARD-COMPAT NOTE: these fields are declarative metadata that Phase D's
# `skill-auto-trigger.mjs` orchestrator + `regen-wiki-from-viz.mjs` stage-22
# will consume (see state/shared/SKILL-AUTO-TRIGGER-PLAN.md). Until Phase D
# ships, these fields are unread — the skill is operator-invoked only. The
# `file-count-window` matcher type is a NEW shape proposed for Phase D's
# orchestrator (not yet in the plan §P3 enum {keyword, regex, file-pattern,
# tool}); Phase D will either implement it or normalize it to `keyword`.
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "scrutinize all|batch scrutiny|review all files|multi-file scrutiny"
    score: 0.85
    action: suggest
  - event: PostToolUse
    matcher:
      type: "file-count-window"   # FORWARD-COMPAT: new matcher type, Phase D
      value:
        event: "Write|Edit"
        count: ">=3"
        window_minutes: 10
    score: 0.70
    action: suggest

# ── Pipeline integrations (which orchestrators call this skill at which phase) ──
# Each entry names a target pipeline; some are slash-commands (/forge, /scrutinize,
# /handoff, /forge-audit), one is CLAUDE.md doctrine (`milestone-close-doctrine`,
# the per-file scrutiny gate's milestone-closeout requirement — there is NO
# `/milestone-close` slash command today; the integration fires when an operator
# follows the CLAUDE.md milestone close-out protocol).
pipeline_integrations:
  - pipeline: forge          # /forge, /forge2..7
    phase: P4-implement
    trigger: "after 3+ new files emitted"
    action: invoke
  - pipeline: forge          # any forge version
    phase: P6-commit
    trigger: "pre-commit check"
    action: invoke-if-uncommitted-staged
  - pipeline: milestone-close-doctrine    # CLAUDE.md doctrine, not a slash command
    phase: pre-close
    trigger: "before flipping envelope status (operator follows doctrine)"
    action: invoke
  - pipeline: scrutinize     # /scrutinize standalone
    phase: per-file
    trigger: "when >1 file in session diff"
    action: replace-serial-with-batch
  - pipeline: roadmap        # /roadmap regen
    phase: regen
    trigger: "per milestone file edited"
    action: invoke
  - pipeline: forge-audit    # /forge-audit, /forge-audit-v2
    phase: layer-5-agent-findings
    trigger: "after audit emits multi-file findings"
    action: invoke
  - pipeline: handoff        # /handoff
    phase: pre-write
    trigger: "before writing handoff if working tree dirty"
    action: invoke-with-auto-flag

# ── Loop contract ──
# IMPORTANT: the current harness `/loop` is INTERVAL-BASED (`/loop 5m /foo`)
# or model-self-paced (no interval). It does NOT read `loop_contract` frontmatter
# today. This block is forward-compat metadata for Phase D's iteration runtime.
# Under the current harness, when an operator does `/loop /scrutiny-batch --loop`,
# the operator (or Claude in the session) interprets the JSON status emitted in
# Step 6 manually and decides whether to re-invoke. The runtime does not auto-stop
# on `done_signal`. All three terminal verdicts are: ALL_PASS, NO_FILES, MAX_REACHED.
loop_contract:
  max_iterations: 3
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: all-pass         # terminal verdicts: ALL_PASS | NO_FILES | MAX_REACHED
  state_signal: scrutiny_ledger
  rollback_on_runaway: false   # advisory only — never auto-reverts code
  done_signals:
    - '{"done": true, "verdict": "ALL_PASS"}'
    - '{"done": true, "verdict": "NO_FILES"}'
    - '{"done": true, "verdict": "MAX_REACHED"}'

# ── Upstream / downstream impact (read by /forge-audit + plan tools) ──
impact:
  upstream:
    - per-file scrutiny gate (CLAUDE.md doctrine)
    - /forge P4 (implement phase)
    - /milestone close-out
    - /scrutinize standalone
    - /loop runner (when in loop mode)
  downstream:
    - mcp-server/data/state/SCRUTINY_LEDGER.json (per-file verdicts written)
    - reviewer-agent dispatch budget (consumes parallel agent slots)
    - downstream commit gating (3-of-3 still required at Stop)
  bounded: true
  reversible: true   # advisory output only; never auto-mutates code
composes_with:
  - "/forge"
  - "/milestone"
  - "/scrutiny-replay"
---
# /scrutiny-batch — Parallel Per-File Reviewer Dispatch

> **Goal:** turn the per-file scrutiny gate's serial 2-reviewers-per-file pattern into a single parallel block across N files. Cuts scrutiny wall-time roughly by `N` for N tightly-coupled files in the same session.
>
> **Doctrine reference:** the per-file scrutiny gate in `H:/prism/CLAUDE.md §PER-FILE SCRUTINY GATE` requires "2 parallel scrutiny agents AFTER each file BEFORE writing the next file." This skill is the **batch-mode escape hatch** explicitly allowed for tightly-coupled file sets (e.g. an engine + its dispatcher wiring + its test) where reviewing them together is more meaningful than reviewing each in isolation.

## When the operator should use this

- After a multi-file build in `/forge` P4 emitted ≥3 related files (the standard case)
- Before `/milestone close-out` to scrutinize every uncommitted file in one pass
- Inside `/loop` to re-verify after auto-fix cycles (`/loop /scrutiny-batch <files>` keeps running until all PASS or `max_iterations`)
- Manually after a refactor that touched 5+ files where pairwise serial scrutiny would be wasteful

## When NOT to use

- For a single file → use the standard per-file gate (2 sequential reviewers is fine)
- For a file with high P0/P1 risk on its own (e.g. a brand-new physics engine) → strict serial gate; let each file get its full attention
- For pre-commit safety hooks (those have their own scrutiny via stop-bundle)

## Usage

```
/scrutiny-batch <file1> <file2> ... <fileN>            # explicit file list
/scrutiny-batch --auto                                  # auto-detect from git status (uncommitted files in current session)
/scrutiny-batch --since <commit-sha>                    # all files changed since <sha>
/scrutiny-batch --loop                                  # iterative mode: re-run after fixes
/scrutiny-batch --loop --max=5                          # cap iterations
/scrutiny-batch --dry-run                               # show what would dispatch without invoking agents
```

## Protocol — what Claude does when invoked

### Step 0 — Resolve the file list
- If explicit files given → use those.
- If `--auto` → run `git -C H:/prism diff --name-only` (working tree) AND `git -C H:/prism diff --name-only --cached` (staged), dedupe. **Do NOT include `HEAD@{1}` reflog union** — in a multi-chat shared tree (6 concurrent chats), the reflog's "previous HEAD" is non-deterministic and may pull peer files into this chat's scrutiny batch.
- If `--since <sha>` → `git diff --name-only <sha> HEAD`.
- Filter out: `.gitignore`d files, files larger than 500KB (split separately), binary files.
- If file list is empty → emit `{"done": true, "verdict": "NO_FILES"}` and exit.
- If file list is 1 → recommend strict per-file gate instead; exit with that recommendation.
- **N>10 soft warning:** if N>10, emit a one-line warning to operator: "scrutiny-batch over 10 files dispatches 2N=20+ parallel agents; consider splitting into chunks of 5 for tighter wall-time and token-cost bounds." Proceed unless operator passes `--cap-soft` flag to abort.
- **N>20 hard prompt:** if N>20, require operator confirmation before dispatching (token-cost guardrail).

### Step 1 — Classify each file (per CLAUDE.md §PER-FILE SCRUTINY GATE Agent A table)

| File type | Agent A subagent_type |
|-----------|----------------------|
| dispatcher (`*Dispatcher.ts`, `*dispatcher*.ts`) | `wiring-review-agent` |
| test (`*.test.ts`, `*.test.mjs`) | `test-review-agent` |
| physics engine (matches `src/engines/*Physics*` or `*Kienzle*` / `*Taylor*` / `*SpecificCutting*`) | `physics-review-agent` |
| generic engine / utility (`src/engines/*`, `.claude/hooks/*`, `scripts/*`) | `code-analyzer` |
| docs / runbook / spec (`*.md`, `state/shared/*`) | `reviewer` (completeness + operator clarity) |
| UI/React (`*.tsx`) | `reviewer` (integration + UX + state mgmt) |
| settings.json / config | `reviewer` (config correctness) |
| **FALLBACK** (anything not matching above — `.json` data, `.py`, `.sql`, `.yml`, unknown extensions) | `reviewer` (generic, weighted toward intent + correctness) |

### Step 2 — Build cross-reference bundles (before dispatch)

Before dispatching, scan the file list for tightly-coupled groups that benefit from being reviewed together rather than independently:

- **Engine + test pair**: if the batch contains `src/engines/MyEngine.ts` AND `src/__tests__/MyEngine.test.ts`, bundle them so Agent A's `test-review-agent` is given BOTH paths in its prompt — it can then verify the test actually exercises the engine's real API rather than a stub.
- **Engine + dispatcher pair**: if the batch contains `src/engines/MyEngine.ts` AND a dispatcher (`*Dispatcher.ts`) that imports it, bundle so Agent A's `wiring-review-agent` sees the engine's exports + the dispatcher's import.
- **Schema + consumer pair**: if `*Schema.ts` AND a consumer that uses it appear in the same batch, bundle so the consumer reviewer can verify schema conformance.
- **All other files**: reviewed independently (one Agent A + one Agent B each).

Each bundle produces ONE pair of agents (A+B) covering all files in the bundle. Non-bundled files still get one pair each. Final dispatch count: `2 × (bundles.length + independent_files.length)`.

### Step 3 — Dispatch the reviewer agents in ONE parallel block

For each (bundle OR independent file), dispatch TWO agents in the same tool-call message:
- **Agent A (content specialist)** — type per Step 1 table; receives all paths in the bundle (or just the one independent path)
- **Agent B (independent reviewer)** — always `reviewer`, weighted toward integration / hidden coupling / convention conformance; receives the same paths

For N files grouped into B bundles + I independent files: 2×(B+I) agent dispatches **in one parallel tool block**. The Agent tool supports parallel dispatch when multiple Agent calls are in the same message.

Each agent receives:
- The absolute file path(s) — bundles pass an array of paths
- A short unit-spec or context block describing what to verify
- For bundle dispatches: explicit instruction that the files form a tightly-coupled unit and to verify their interfaces match
- Instructions to grade `PASS` or `FAIL` and flag P0/P1 issues
- An expectation that they return the verdict in a fixed format (see Step 5)

### Step 4 — Wait for all agent returns

The Agent tool blocks until all parallel dispatches complete. No additional polling needed.

**Slowest-agent dominance:** wall-time is governed by `max(t_i)` across the 2×(B+I) agents, NOT the mean. For N>5 the variance dominates and parallel speedup becomes sub-linear. Empirically, expect ~60-120s for small batches (N≤5) and ~90-180s for medium batches (N=6-10). N>10 is not recommended without splitting (see Step 0 soft-warn).

### Step 5 — Merge verdicts

For each file:
- If BOTH agents return `PASS` → file PASS
- If EITHER agent returns `FAIL` → file FAIL (record both findings)
- If an agent's dispatch failed (timeout/network) → that agent's verdict is `INCONCLUSIVE`; retry once; if still inconclusive, mark merged verdict as `INCONCLUSIVE` (not PASS, not FAIL) and surface to operator
- If verdicts disagree on severity → take the higher severity

Write merged verdicts to a **SEPARATE batch ledger** at `mcp-server/data/state/SCRUTINY_BATCH_LEDGER.json`. **Do NOT write directly to `SCRUTINY_LEDGER.json`** — that file is managed by `H:/prism/.claude/helpers/scrutiny-ledger.mjs` with a different schema (session-id-keyed, end-of-Stop 3-of-3 format) and a file-lock + atomic-rename pattern. Writing the batch shape directly would bypass the lock and risk a lost-update race with concurrent fleet writers. The two ledgers serve different purposes (batch = per-file granular; main = session aggregate); keep them separate.

Batch ledger schema:

```json
{
  "session_id": "<chat-stable-id>",
  "batch_id": "scrutiny-batch-<timestamp>",
  "timestamp": "<ISO>",
  "files": [
    {
      "path": "<absolute path>",
      "bundle_id": "<bundle id if part of a bundle, else null>",
      "agent_a_verdict": "PASS|FAIL|INCONCLUSIVE",
      "agent_b_verdict": "PASS|FAIL|INCONCLUSIVE",
      "merged": "PASS|FAIL|INCONCLUSIVE",
      "p0_issues": [],
      "p1_issues": [],
      "p2_p3_followups": []
    }
  ],
  "verdict": "ALL_PASS|SOME_FAIL|SOME_INCONCLUSIVE|NO_FILES|MAX_REACHED"
}
```

Append via atomic temp-file + rename pattern (mirror the proven `archived-skill-suggest.mjs` savePending technique to avoid lost-update races with peer chats).

### Step 6 — Surface results to operator

Print a table:
```
┌─ /scrutiny-batch ─────────────────────────────────────
│ Files reviewed: <N>   (in <B> bundles + <I> independent)
│ ALL_PASS:       <count>
│ FAIL:           <count>
│ INCONCLUSIVE:   <count>
├──────────────────────────────────────────────────────
│ <file1>   PASS          (A:PASS B:PASS)
│ <file2>   FAIL          (A:PASS B:FAIL) — P1: <summary>
│ <file3>   INCONCLUSIVE  (A:INCONCLUSIVE B:PASS) — retry recommended
│ ...
└──────────────────────────────────────────────────────
```

For each FAIL, list the P0 + P1 findings inline. For each INCONCLUSIVE, recommend re-running the skill with just that file.

### Step 7 — If `--loop` mode

- If `verdict === ALL_PASS` → emit `{"done": true, "verdict": "ALL_PASS", "iterations": <N>}` and exit.
- If `verdict === SOME_FAIL` and `iterations < max_iterations` → return to operator with findings; expect them to fix; operator's NEXT prompt triggers re-invocation by the `/loop` runtime.
- If `iterations >= max_iterations` and still SOME_FAIL → emit `{"done": true, "verdict": "MAX_REACHED", "iterations": <N>, "remaining_fail": <count>}` and stop (no rollback per `loop_contract.rollback_on_runaway: false`).

## Implementation notes

- **Parallelization cap:** Each parallel agent call costs ~60s + token budget. For N=10+ files, that's 20+ parallel agents. Use the `Agent` tool's parallelism but be aware of token cost. Recommend operator split if N>10.
- **Self-cross-check:** Before dispatching reviewers, Claude STILL does the self-cross-check step from the per-file gate (re-read against unit spec, walk every path + edge). This skill batches the agent step, not the human-equivalent step.
- **Test files special case:** If a test file references an engine being scrutinized in the same batch, Agent A's test-review-agent should be given the engine's path too so it can verify the test is exercising the real engine API.
- **Order of operations:** Reviewer agents are independent; their dispatch order doesn't matter. Merge ordering follows the input file list.
- **Failure recovery:** If a single agent dispatch throws (network/timeout), retry once. If it still fails, mark that file's verdict as `INCONCLUSIVE` (not PASS) and surface to operator.

## What this skill does NOT do

- It does NOT replace the strict per-file gate for safety-critical files (physics engines, schemas, hook files at tier T0)
- It does NOT auto-apply fixes — only surfaces verdicts + findings
- It does NOT bypass the end-of-Stop 3-of-3 gate (codex + reviewer A + reviewer B against full session diff)
- It does NOT modify code; it's purely a review orchestrator

## Examples

### Example 1 — multi-file engine build (typical /forge P4 case)

```
/scrutiny-batch \
  src/engines/MyNewEngine.ts \
  src/__tests__/MyNewEngine.test.ts \
  src/tools/dispatchers/prism_calc.ts
```

Dispatches 6 agents in parallel (3 files × 2 agents). Returns merged verdict in ~60-90s instead of ~3min serial.

### Example 2 — auto-mode after a forge session

```
/scrutiny-batch --auto
```

Resolves all uncommitted files in the working tree, dispatches per-type reviewers, reports.

### Example 3 — loop mode for fix-verify cycles

```
/loop /scrutiny-batch --auto --loop --max=3
```

Runs until all files PASS or 3 iterations. Operator fixes between iterations; loop runtime re-invokes. Used in `/forge` P5 verify phase.

## See also

- `H:/prism/CLAUDE.md` §PER-FILE SCRUTINY GATE — the doctrine this skill operationalizes
- `H:/prism/CLAUDE.md` §SCRUTINY GATE (UNIVERSAL — every chat, every Stop) — the end-of-task 3-of-3 gate this does NOT replace
- `.claude/scripts/scrutiny-3way.mjs` — the 3-of-3 driver script (separate from this skill)
- `mcp-server/data/state/SCRUTINY_LEDGER.json` — append-only ledger of all scrutiny verdicts
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` — the milestone plan this skill is part of
- `/scrutiny-replay` (sibling, Phase B.4 of DEV-VELOCITY-AUTOTRIGGER-MS0) — re-verify after auto-fix
- `/loop` — the iterative-invocation runtime this skill's `loop_contract` declares for
