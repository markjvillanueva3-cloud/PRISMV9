---
title: SLASH-CMD-FIDELITY-MS0 — /checkin work-order surface
slug: slash-cmd-fidelity-ms0
type: architecture
category: harness
status: shipped
shipped_at: 2026-05-16
units: [U-SCF01, U-SCF02, U-SCF03]
deferred: [U-SCF04]
commits: [0c1c589b9, 228d3d963]
files:
  - .claude/hooks/checkin-args-surface.mjs
  - .claude/hooks/checkin-args-surface.test.mjs
  - .claude/commands/checkin.md
  - C:/Users/wompu/.claude/settings.json (UserPromptSubmit[2])
  - H:/.claude/settings.json (mirrored, byte-equal)
related:
  - feedback_checkin_args_are_primary_work_order
  - reference_checkin_autonomous_loop_2026_05_16
  - reference_settings_wiring_drift_2026_05_16
---

# SLASH-CMD-FIDELITY-MS0

Closes the user-reported bug (2026-05-16, slot bravo claude-339c8ff7):
typing `/checkin-bravo <work order>` was swallowing the trailing work
order under the heavy `/checkin` ceremony. The user got the full §Report
box back and no action on the request.

## Three-piece fix

### U-SCF01 — deterministic belt (committed `0c1c589b9`)

[`H:/prism/.claude/hooks/checkin-args-surface.mjs`](../../.claude/hooks/checkin-args-surface.mjs)
+ [test file](../../.claude/hooks/checkin-args-surface.test.mjs).

UserPromptSubmit hook (T2, pure string work, never throws). Matches
`^\s*\/checkin(?:-[a-z]+)?(?=\s|$)/i`, walks the post-command tokens,
drops recognized flags + their values, and re-surfaces whatever remains
as a `★ USER WORK ORDER (primary deliverable)` block via
`hookSpecificOutput.additionalContext`. Silent on bare `/checkin`
(non-disruptive — zero behavior change).

**Per-flag value validators** (Map<flag, predicate>): each value-consuming
flag has a known value domain, so `--slot` only consumes a NATO name,
`--roadmap` only consumes `devtools|revenue`, `--force`/`--confirmRecent`
only consume booleans, `--chatId` only consumes a `claude-*` token,
`--topic` consumes any non-flag token (deliberately loose — see U-SCF04
deferred fix).

A token that fails the flag's predicate is NOT consumed and survives as
work-order text. This solves the `--slot fix the bug` ambiguity at the
root: "fix" is not in the NATO set, so `--slot` does not eat it.

Knobs: `PRISM_CHECKIN_ARGS_SURFACE_DISABLE=1` (skip entirely).

Tests: 14 cases via `node --test`. Covers bare /checkin silence,
work-order surfacing, flag stripping, forgotten-flag-value graceful
degrade, word-boundary (`/checkindolthing` must NOT match), multi-line
first-line-only, non-string safety, oversized prompt bounded at 8000
chars.

### U-SCF02 — runbook PRIORITY-0 + compressed §Report (committed `228d3d963`)

[`H:/prism/.claude/commands/checkin.md`](../../.claude/commands/checkin.md)
(+101/-9, 612→697 lines).

**PRIORITY-0 header** between §Args and §Steps: any free text beyond
recognized flags is the PRIMARY deliverable; Steps 1-6 run as silent
preamble (but DO run their bash — they emit state needed by later
steps); print compressed §Report; then immediately act. Covers all four
cases: (a) work-order + no loop, (b) work-order + loop keyword,
(c) loop-keyword-only, (d) no work order. Explicit `--no-loop`
precedence ("always wins over a loop keyword"). Discloses the U-SCF04
deferred `--topic` validator gap with operator workaround.

**§Report compressed from a 30-line ASCII box** to a 3-line form:
status-line · WORK ORDER line · next-action line. Adds `verified=`
token (7 dimensions matching verbose-box row prefixes:
`tree,staged,drift,chat-bus,slot-cutover,loop-state,local-compute`) so
silent-clean is distinguishable from not-checked.

The verbose box is preserved as a model-gated reference. **NOT
`<details>`** — CommonMark renderers (including Claude Code CLI) do not
collapse `<details>`, and a nested ```bash code-block inside `<details>`
also closes the HTML block per CommonMark §4.6, so the box would render
unconditionally and DEFEAT the compression. The prose gate
("do NOT print this block unless ...") is model-enforced.

Box prints only on `--verbose`, `PRISM_CHECKIN_VERBOSE=1`, or 3+
actionable conditions.

**Bonus**: same commit syncs 4 stale "12-chat fleet" sites (lines 18,
102, 442, 469) to the 13-chat reality after Mike was added earlier the
same session.

### U-SCF03 — settings.json wiring + doc reflection (this commit)

Splices U-SCF01's hook into `C:/Users/wompu/.claude/settings.json`
`UserPromptSubmit[2]` (right after no-context emitters, before the
heavy injectors like skill-auto-trigger / master-index-precheck-inject),
so the `★ USER WORK ORDER` block surfaces near the TOP of the injected
context. Manually mirrored to `H:/.claude/settings.json` (byte-equal,
sha 26957a35d9a9d7ca, 35992 bytes) — the c-to-h-mirror hook does NOT
fire on Bash node-writes, per the documented mirror gap in CLAUDE.md.

Smoke-tested both surfaces:
- `/checkin-bravo continue HTML stack and fix everything` → emits the
  USER WORK ORDER block with the task verbatim, `continue:true`,
  context length 553 chars
- `/checkin` (bare) → `{"continue":true}` only, no context (zero
  behavior change for the bare path)

Doc reflection: this wiki entry + Obsidian memory
`reference_slash_cmd_fidelity_ms0_2026_05_16`. CLAUDE.md and MEMORY.md
were peer-claimed (claude-416be9ac) during this session — deferred per
the never-edit-peer-claimed-files rule.

## Deferred — U-SCF04

Tighten the `--topic` validator from "any non-flag token" to kebab-case
`^[a-z][a-z0-9-]{0,63}$`. Same root-cause structural pattern already
used for `--slot` (NATO.has) and `--roadmap` (literal whitelist).
Without this, `/checkin-bravo --topic fix the parser bug` consumes
"fix" as the topic and injects "the parser bug" as the work order,
silently corrupting one input shape. The runbook PRIORITY-0 Step 6
discloses this caveat with a workaround until U-SCF04 lands.

## Wiring path (operator reference)

```
C:/Users/wompu/.claude/settings.json
  → hooks.UserPromptSubmit[0].hooks[2]
    → "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/checkin-args-surface.mjs
      → returns {continue:true, hookSpecificOutput:{additionalContext: "★ USER WORK ORDER ..."}}
        → Claude sees the work order at the top of the injected context block
          → PRIORITY-0 doctrine in checkin.md tells the model how to respond
```

## Verification

```bash
# Hook tests
node --test H:/prism/.claude/hooks/checkin-args-surface.test.mjs

# Wiring check
grep -c 'checkin-args-surface' C:/Users/wompu/.claude/settings.json H:/.claude/settings.json
# expect: 1 each

# Smoke test
echo '{"prompt":"/checkin-bravo do the thing"}' | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/checkin-args-surface.mjs
# expect: continue:true + additionalContext with "USER WORK ORDER"
```
