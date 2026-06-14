---
name: reference_codex_review_arm_2026_05_18
description: "Codex CLI added as an advisory review arm in scrutiny-3way.mjs — runs alongside the 3 Claude agents at the build scrutiny gate, never blocks."
aliases: reference_codex_review_arm_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.068Z
---


2026-05-18 (slot lima, claude-317fb800) — added the **Codex CLI as an advisory review arm** for PRISM builds, on top of the three parallel Claude reviewer agents. User ask: "i just want codex to act as a reviewer for our builds on top of our parallel agents."

- `runCodexReview(target, opts)` + a `--codex-review` CLI subcommand in `.claude/scripts/scrutiny-3way.mjs`. Spawns `codex exec review`, parses `VERDICT: PASS|FAIL`, mirrors the existing `runOllamaPreflight` advisory-arm contract. The chat runs the emitted `codexReviewCommand` via Bash in parallel with the 3 Claude `Agent` reviewers.
- **Advisory only** — never marks the 3-of-3 ledger (`SCRUTINY_LEDGER.json`); `scrutinize-before-stop.mjs` is untouched. Every Codex failure (spawn / non-zero exit / empty / timeout / quota / `429` / auth / offline / `EPIPE`) → `verdict:"skipped"`, never `"fail"`. Codex was retired as a *gate* arm 2026-05-13 for stalling the gate; advisory + hard timeout + decoupled-from-prompt-emission makes that recurrence structurally impossible. The old 80 KB diff-truncation false-FAIL class is also gone — `codex review` reads the working tree itself, no piped diff.
- Setup: `npm i -g @openai/codex` (0.130.0) + `H:\.claude\bin\codex` Bash shim (see [[feedback_missing_file_copy_back]]) + `codex login` for `~/.codex/auth.json`. Knob `PRISM_SCRUTINY_CODEX=off` disables (default on, per user).
- Tests: `.claude/scripts/test-codex-review.mjs` — 21 hermetic cases (injected `spawnImpl`, fully offline).
- Reviewer-caught P0: `target` reached the `codex` argv unvalidated — fixed with a shared `VALID_TARGET_RE` allowlist used by `captureDiff` + `runCodexReview` + `codexReviewCommand` so the consumers cannot drift. Lesson: an advisory arm still spawns a process with caller-influenced argv — "advisory" excuses *blocking*, not *injection*.

Wiki: [[codex-review-arm]]. Files: `scrutiny-3way.mjs`, `test-codex-review.mjs`.
