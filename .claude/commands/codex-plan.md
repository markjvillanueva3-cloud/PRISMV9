---
name: codex-plan
description: Plan-then-build with Codex — Codex emits a 95%-confident plan via prism_orchestrate:codex_delegate, surfaces it for approval, then Claude implements. Independent reasoning families catch errors single-family loops miss.
effort: high
maxTurns: 12
---

# /codex-plan — Plan-Then-Build with Codex (95%-Confident Plan, Claude Implements)

Wraps the openai/codex-plugin-cc plan-then-execute pattern over PRISM's
`prism_orchestrate:codex_delegate` action. Codex (GPT-5 family) emits a
plan only after it has ≥95% confidence in scope; Claude then implements
in the same session. Independent reasoning families catch errors that
single-family loops miss (per video RChO5deJ_fE).

## Args: $ARGUMENTS
- **Required**: free-form description of the task to plan.
- **Optional flags** (parsed from args, not positional):
  - `--tier=<shop_floor|production|proven_out|sim>` — safety tier; default `production` (gpt-5 / medium reasoning)
  - `--timeout=<ms>` — override delegate timeout (default 120s)
  - `--no-execute` — surface the plan only; do NOT implement (review-only)
  - `--target=<glob>` — pin plan scope to file glob (passed to Codex as context)

If `$ARGUMENTS` is empty, ask the user once for the task description and stop.

## When to use
- New engine/dispatcher/skill where scope is fuzzy and a wrong design decision is expensive.
- Refactor that touches >3 files and you want adversarial scope-narrowing.
- Safety-critical edits (Kienzle/Taylor/post-processor) where a second family must agree the plan is sound BEFORE Claude writes a line.

## When NOT to use
- Trivial fixes (typos, single-line patches) — overhead exceeds value.
- Pure exploratory questions ("how does X work?") — use direct search instead.
- Tasks whose outcome is already specified by a roadmap envelope unit — that envelope IS the plan.

## Procedure

### 1. Parse args
- Extract task description (everything not matching `--*=*` or bare flags).
- Default `tier=production` if `--tier` absent. Reject other tier values.
- Default `execute=true` unless `--no-execute` present.

### 2. Pre-flight (skip on `--no-execute`)
- `git status --short` to confirm working tree clean OR clearly-scoped (uncommitted edits won't get clobbered).
- If dirty AND `--no-execute` not set, warn the user once and ask whether to continue or stash first.

### 3. Build the plan prompt
Wrap the user's task description with explicit plan-mode instructions so Codex emits a plan instead of code:

```
You are operating in PLAN-ONLY mode for the PRISM manufacturing-intelligence
codebase.

Do NOT write code. Emit a markdown plan only.

Task: <user task description>

Required plan structure:
1. Files to create or modify — every path must be explicit and absolute-from-repo-root.
2. References — for physics constants, manufacturer data, or formulas, cite source
   (Sandvik catalogue, Kennametal handbook, ISO 13041, src/physics/constants.ts, etc.).
3. Numbered steps — at least 3 enumerated steps a builder can follow without further questions.
4. Failure modes — at least 2 ways this plan could go wrong + mitigation.
5. Confidence — single line: "Confidence: <0..100>%" with brief rationale.

If your confidence is below 95%, list clarifying questions instead of a plan.
```

If `--target=<glob>` is set, append `Scope must stay inside: <glob>` to the prompt.

### 4. Invoke Codex via prism_orchestrate
Call:

```
prism_orchestrate
  action: codex_delegate
  params:
    prompt: <plan prompt from step 3>
    tier: <parsed tier>
    timeoutMs: <parsed timeout or omit>
```

Capture the response. Treat any `error` field in the result as a hard failure
(report and stop — do NOT fall back to Claude-authored plan, that defeats the point).

### 5. Surface plan to user
Present the plan verbatim under a heading:

```
## Codex Plan (tier=<tier>)

<plan markdown from Codex>
```

Then add a one-line confidence + decision prompt:

```
Codex confidence: <X>%
Proceed with implementation? Reply "yes", "no", or specific changes.
```

### 6. Wait for user approval
- If `--no-execute` was set, stop here.
- Otherwise wait for explicit user response. Do NOT auto-implement on silence.
- Acceptable responses:
  - `yes` / `proceed` / `go` → implement as written.
  - `no` / `cancel` / `stop` → abort cleanly, no edits.
  - Anything else → treat as plan revision; re-invoke step 4 with revised prompt
    that includes "Previous plan: <plan>. User feedback: <user reply>. Emit revised plan."

### 7. Implement (Claude executes the approved plan)
Walk the numbered steps from the plan. For each step:
- Read any referenced file before editing.
- Use `Edit` for surgical changes, `Write` for new files.
- Run affected tests after each non-trivial step (the build-enforce hook will require this anyway).
- If a step turns out to be wrong on contact with the code, STOP and re-plan via step 4 with feedback — do NOT silently improvise.

### 8. Post-build review (recommended on shop_floor + production)
After implementation, optionally invoke:

```
prism_orchestrate
  action: codex_review
  params:
    tier: <same tier>
    diffSource: { kind: "uncommitted" }
```

Surface review verdict to user. Address any FAIL findings before commit.

### 9. Commit (only if user approves at end)
Commit format follows PRISM convention: `[SCOPE]/U-XX: title` per CLAUDE.md.

## Plan-quality assertion (manual validation per envelope)
Per envelope P2-U01 exit conditions, invoking this skill on the reference task
"add a stub Kienzle calc unit-test" must produce a plan whose markdown contains
ALL of:
- (a) An explicit file path under `mcp-server/src/__tests__/`.
- (b) A Kienzle reference value (kc1.1 for steel ≈ 1800 N/mm² per ISO group P, or similar) WITH citation.
- (c) ≥3 enumerated steps.
- (d) End-to-end ≤45s (delegate call + plan render).

Run this validation once after install; record output in
`state/shared/CODEX-PLAN-VALIDATION.md` for audit.

## Failure modes
- Codex CLI not installed → `codex_delegate` returns error; skill aborts. Install via P1-U01 install doc.
- Codex auth expired → same path. User runs `codex login` and retries.
- Codex returns plan with confidence <95% AND no clarifying questions → treat as malformed, re-invoke once with a stronger plan-mode prompt; if it fails again, stop and report.
- User pastes plan revision in code block formatted as new task → step 6's revision branch handles it; do NOT confuse with new `/codex-plan` invocation.
- Implementation step fails (test fails, type error) → step 7's STOP-and-replan rule applies. Never silently swap a different approach for the planned one.

## Adversarial considerations
- Codex plan with hidden malicious step (path-traversal write, off-tree file delete) → Claude's PreToolUse Edit/Write/MultiEdit hooks (lane gate, roadmap-home, file-claim-guard) intercept; honour those denies even if the plan said to do it.
- Plan emitted in non-English / corrupted format → step 5's "verbatim" surface lets the user catch it visually before approval.
- User approves a plan they didn't actually read → unavoidable; mitigated only by surfacing the plan in full (not summarised) at step 5.

## Rollback
- Skill is markdown only — `rm .claude/commands/codex-plan.md` removes it.
- No state files written by this skill itself; arbitrations land in the standard scrutiny ledger via codex_review (step 8) only.
