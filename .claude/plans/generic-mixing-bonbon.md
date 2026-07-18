# Plan — Codex CLI as an advisory review arm for PRISM builds

## Context

PRISM gates every build at a 3-of-3 scrutiny gate: `scrutiny-3way.mjs` emits 3
Claude reviewer prompts, the chat dispatches 3 parallel Claude `Agent`
reviewers, and the Stop hook `scrutinize-before-stop.mjs` blocks until all 3
are marked PASS in `SCRUTINY_LEDGER.json`.

The user wants the OpenAI **Codex CLI** to review builds too — "on top of our
parallel agents." Codex was *previously* a gate arm but was retired 2026-05-13
because its CLI quota/network failures stalled the fleet-wide HARD-BLOCK Stop
gate. So Codex must come back as a **strictly advisory arm** that runs in
parallel with the 3 Claude agents, surfaces an independent verdict, and — on
any failure (quota, hang, offline) — degrades to `skipped`, never blocking the
gate. (`codex login status` hung 30 s during investigation — the failure mode
is live; the design must tolerate it.)

Outcome: every build that reaches the scrutiny gate also gets an independent
Codex code review, surfaced alongside the 3 Claude verdicts, with zero risk to
gate timing or the 3-of-3 contract.

## Already done this session (not part of this plan's build)

- Installed `@openai/codex` 0.130.0 (`npm i -g`).
- Created `H:\.claude\bin\codex` — extensionless Bash shim so `codex` resolves
  in the Bash tool (npm installs it to `H:\Tools\nodejs\`, not on the Bash
  PATH). Mirrors the `node`/`npm`/`npx` shim convention. Verified `codex
  --version` → `codex-cli 0.130.0`.

## Why this is safe to re-add (the old 80 KB bug cannot recur)

The retired arm piped a `git diff` to `codex exec` via stdin, capped at 80 KB —
PRISM-scale commits truncated and produced false-FAIL `diff-truncated`
blockers. The new arm uses `codex exec review --uncommitted`, where **Codex
reads the working tree itself** — no diff payload, no 80 KB cap. The
truncation class is structurally gone.

## Design — mirror the existing Ollama advisory arm

`scrutiny-3way.mjs` already has a working advisory-arm pattern:
`runOllamaPreflight()` (lines 398-483) — a non-gate reviewer surfaced in the
output JSON as `preflight`, returning `verdict:"skipped"` on any transport
failure, injectable for tests via `opts.fetchImpl`. The Codex arm mirrors it.

**Decoupling (critical):** the Codex review is slow (minutes) and can hang.
`scrutiny-3way.mjs` must NOT block emission of the 3 Claude prompts on it. So
the Codex arm is a **separate `--codex-review` subcommand** the chat runs in
parallel with the 3 `Agent` dispatches — genuinely "on top of the parallel
agents," with Codex slowness isolated to its own Bash call.

### Files to modify

**1. `H:\PRISM\.claude\scripts\scrutiny-3way.mjs`** (core change)
- New `runCodexReview(target, opts)` — exported, mirrors `runOllamaPreflight`:
  - Spawns `codex exec review` with the review scope flag derived from `target`
    (empty/`diff` → `--uncommitted`; `HEAD`/sha → `--commit <sha>`), plus
    `--skip-git-repo-check` and `-c model_reasoning_effort="medium"`, and a
    custom PROMPT (via stdin `-`) mandating the existing `VERDICT: PASS|FAIL` +
    `BLOCKER:` contract — so `parseVerdictLine` (already imported) parses it.
  - Hard timeout (reuse `REVIEW_TIMEOUT_MS`, 6 min) — child killed on timeout.
  - Graceful degrade: spawn error / non-zero exit / empty stdout / quota|429|
    network stderr → `verdict:"skipped"` (never a `fail` that reads as a real
    block). Reuses the `ENV_FAIL` marker logic already in `spawnReview`.
  - Returns `{provider:"codex-review", verdict, blockers, notes, durationMs,
    skipped, rawOutputPeek}` — same shape as the other arms.
  - Injectable `opts.spawnImpl` for hermetic tests (mirrors `opts.fetchImpl`).
- Revive the dead retired-Codex-arm code instead of adding parallel new code:
  `spawnReview()` (line 285), `CODEX_BIN`, `CODEX_ARGS`, `REVIEW_TIMEOUT_MS`
  are dead since 2026-05-13. Repurpose: `CODEX_BIN` default → `codex` (not
  `resolveNpx()`); `runCodexReview` calls `spawnReview`.
- New env knob `PRISM_SCRUTINY_CODEX` — default `on`; `off`/`0`/`false`
  disables (subcommand returns `skipped`). **Default on** per user decision.
- New `--codex-review` CLI subcommand in `main()`: runs `runCodexReview()`,
  prints the result JSON. Honors `--target` and `--session-id`.
- Normal output JSON: add `codexReviewCommand` field (the exact
  `node .claude/scripts/scrutiny-3way.mjs --codex-review ...` line) and extend
  `nextStep` to instruct the chat to run it as a 4th parallel task alongside
  the 3 `Agent` dispatches. The 3-of-3 ledger contract is **untouched**.

**2. Test file** — `H:\PRISM\.claude\scripts\test-codex-review.mjs` (new,
node:test, mirrors `test-ollama-preflight.mjs`). `runCodexReview()` via
injected fake `spawnImpl`. >=10 cases: happy PASS; FAIL + BLOCKER lines parsed;
spawn error → skipped; non-zero exit → skipped; empty stdout → skipped;
timeout → bounded; quota/`429` stderr → `ENV_FAIL` + skipped;
offline/`ECONNREFUSED` → skipped; `PRISM_SCRUTINY_CODEX=off` → skipped;
malformed/missing VERDICT → safe default; `--target HEAD` → `--commit HEAD` arg
shape. All offline (no network).

**3. `H:\PRISM\CLAUDE.md`** §SCRUTINY GATE — document the Codex advisory arm +
the parallel `--codex-review` step. CLAUDE.md is peer-locked; if a `claim_file`
check shows it locked, write a patch-sibling at
`state/shared/dashboards/patches/CLAUDE-MD-PATCH-codex-review-arm.md` per the
JULIETT patch-sibling convention instead of editing directly.

**4. `H:\PRISM\.claude\commands\scrutinize.md` + `scrutiny-gate.md`** — add the
Codex parallel step to the documented scrutiny procedure.

**5. Doc-reflection** — wiki entry
`knowledge/wiki/architecture/codex-review-arm.md`; memory
`reference_codex_review_arm_<date>.md` + `MEMORY.md` pointer.

### Reused (do NOT reimplement)

- `spawnReview()`, `parseVerdictLine` (from `scrutiny-ledger.mjs`), the
  `ENV_FAIL` marker logic, `captureDiff` target semantics — all in
  `scrutiny-3way.mjs`.
- The `runOllamaPreflight` advisory contract + its test file as the template.

## Verification

1. **Hermetic tests (offline):** `node
   H:\PRISM\.claude\scripts\test-codex-review.mjs` — all cases pass; covers
   parsing + every graceful-degrade path.
2. **Subcommand smoke (offline):** `node scrutiny-3way.mjs --codex-review` with
   `PRISM_SCRUTINY_CODEX=off` → prints `verdict:"skipped"` cleanly.
3. **Normal-path regression:** `node scrutiny-3way.mjs` still emits the 3
   Claude prompts unchanged, plus the new `codexReviewCommand` field.
4. **Online smoke (deferred — the machine is currently offline):** `node
   scrutiny-3way.mjs --codex-review` against a real diff → confirm `codex exec
   review` output parses to a real PASS/FAIL verdict; tune the prompt/parser if
   Codex wraps output. The custom VERDICT-contract prompt makes the parser
   correct-by-construction; this run is confirmation, not a blocker to shipping.
5. Per-file scrutiny (2 reviewers) after each file; 3-of-3 Stop gate at end.

## Risks

- `scrutiny-3way.mjs` is high-traffic peer real-estate (15 foreign claims
  active) — `claim_file` it before editing; fork to a sibling worktree if a
  routing hook blocks the commit.
- CLAUDE.md peer-locked — patch-sibling fallback as noted.
- Codex offline today → online verification step 4 is deferred; the arm is
  built advisory + hermetically tested so it ships correct regardless.
