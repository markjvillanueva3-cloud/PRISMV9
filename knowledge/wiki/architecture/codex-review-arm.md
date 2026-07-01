---
title: Codex CLI advisory review arm
category: architecture
last_verified: 2026-05-18
author: claude-317fb800
source: scrutiny-3way.mjs runCodexReview() — 2026-05-18 slot lima
---

# Codex CLI Advisory Review Arm

The OpenAI Codex CLI reviews PRISM builds at the scrutiny gate, alongside the
three parallel Claude reviewer agents — **advisory only**, never able to block.

## What it is

`runCodexReview(target, opts)` in `.claude/scripts/scrutiny-3way.mjs` spawns
`codex exec review` against the working tree (or a commit), parses a
`VERDICT: PASS|FAIL` line, and returns a verdict in the same shape as the
Ollama pre-flight arm. It is invoked via the `--codex-review` CLI subcommand,
which the chat runs in parallel with the three Claude `Agent` reviewers.

## Why advisory, not a gate arm

Codex *was* a gate arm until 2026-05-13 — retired because its CLI
quota / network / trust-dir failures stalled the fleet-wide HARD-BLOCK Stop
gate. The new arm is structurally incapable of that:

- It **never marks the 3-of-3 ledger** (`SCRUTINY_LEDGER.json`). The strict
  3-of-3 Claude-agent contract is untouched; `scrutinize-before-stop.mjs`
  needs no change.
- Every failure — spawn error, non-zero exit, empty output, timeout,
  quota / `429` / auth / network / `EPIPE` — resolves to `verdict:"skipped"`,
  never `"fail"`. A Codex outage degrades silently.
- A hard timeout (`PRISM_SCRUTINY_CODEX_TIMEOUT_MS`, default 6 min) kills the
  child. The Codex Bash call is decoupled from the emission of the three
  Claude prompts, so Codex slowness never delays the gate.

The old 80 KB diff-truncation false-FAIL class is also gone: `codex exec
review` reads the working tree itself — no diff is piped, so there is no
payload cap.

## Usage

`scrutiny-3way.mjs`'s normal output now carries a `codexReviewCommand` field
and a `nextStep` line. The chat runs that command via Bash in parallel with
dispatching the 3 Claude agents:

```
node .claude/scripts/scrutiny-3way.mjs --codex-review --session-id <id>
```

Output: `{ provider:"codex-review", verdict, blockers, notes, skipped }`. The
chat folds the verdict into its summary; it does not touch the ledger.

## Knobs

| Env | Default | Effect |
|-----|---------|--------|
| `PRISM_SCRUTINY_CODEX` | `on` | `off`/`0`/`false`/`no` disables the arm |
| `PRISM_SCRUTINY_CODEX_TIMEOUT_MS` | `360000` | hard-kill timeout (ms) |
| `PRISM_SCRUTINY_CODEX_EFFORT` | `medium` | `codex` model reasoning effort |
| `PRISM_CODEX_BIN` | resolved | override the `codex` binary path |

## Setup (one-time)

- `npm install -g @openai/codex` — installs the Codex CLI.
- `H:\.claude\bin\codex` — a Bash-tool shim (npm installs `codex` into the Node
  prefix `H:\Tools\nodejs\`, which is not on the Bash PATH). See
  [[missing-file-copy-back]].
- `codex login` — Codex auth (`~/.codex/auth.json`). Required for the arm to
  produce a real verdict; without it the arm degrades to `skipped`.

## Security

`target` (a commit-ish, when `--codex-review --target <X>` is used) is
validated against the shared `VALID_TARGET_RE` allowlist (`/^[A-Za-z0-9._/-]+$/`)
before it reaches the `codex` argv or the emitted `codexReviewCommand` string —
the same guard `captureDiff()` applies to its `git show` argv. An unsafe target
is rejected (→ `skipped`) before any spawn.

## Tests

`.claude/scripts/test-codex-review.mjs` — 21 hermetic cases via an injected
`spawnImpl` fake child (offline; no real `codex`, no network). Covers happy
pass/fail, 9 failure modes → skipped, the disabled arm, target-injection
rejection, the stderr-only env-fail classification regression guard, and the
`.cmd`/`shell:true` seam.

## Files

- `.claude/scripts/scrutiny-3way.mjs` — `runCodexReview()`, the `--codex-review`
  subcommand, `resolveCodex()`, the `CODEX_*` constants, and the
  `codexReviewCommand` output field.
- `.claude/scripts/test-codex-review.mjs` — hermetic test suite.

## Related

- [[missing-file-copy-back]] — the `codex` Bash shim and the copy-back doctrine.
- `runOllamaPreflight` (same file) — the advisory-arm pattern this mirrors.
