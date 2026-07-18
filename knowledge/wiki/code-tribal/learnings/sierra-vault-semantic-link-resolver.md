---
title: SIERRA-VAULT-OPS/U-VAULT-SEMANTIC-LINK-RESOLVER
slot: sierra
galaxy: system-viz
commit: 546704bfe9
date: 2026-06-24
tags: [obsidian-vault, wikilinks, ollama, memory-safety, reaper, regression, anti-poison]
---

# Memory-safe Ollama broken-wikilink resolver + the self-caused reaper health issue

**Commit `546704bfe9`** — `[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-SEMANTIC-LINK-RESOLVER`.

## What shipped
`scripts/wiki-link-semantic-resolve.mjs` (+ `.test.mjs`, 14/14): the net-new SEMANTIC
DECISION + EXECUTION layer over the two existing PURE string-distance link tools
(`fix-broken-wikilinks.mjs`, `wiki-broken-link-propose-fix.mjs`) — neither of which decides,
runs Ollama, or resolves. It resolves the vault's 26,165 broken `[[wikilinks]]` to an EXISTING
note only, with three guards:
1. **Levenshtein pre-filter** → candidate set of existing notes (reuses the existing tool's helpers).
2. **token-coverage precision guard** (`tokenCoverageOk`): every significant token (len≥3) of the
   broken link must appear in the candidate. Rejects dropped-qualifier false matches
   (`cad-knowledge-index→knowledgeindex`, `prism_telemetry→telemetry`), keeps
   `telemetry-engine→telemetryengine`.
3. **anti-poison** (`validateResolution`): the Ollama pick is accepted ONLY if it is an exact member
   of the pre-validated candidate set → invention is impossible.

Ollama (local `gpt-oss:20b`, $0) is routed through `ask-ollama.mjs` so each call is **recorded as
`executedOffloads`** — the tool drives real off-Claude execution (the live `executedOffloads:0`
adoption gap). Dry-run by default; `--apply` is capped + `.bak` backup; resumable cursor for a cron.

## The regression I caused (and golf reaped) — the real lesson
The FIRST build pass of `runDecide` computed `buildCandidateSet` (Levenshtein over ~40K existing
slugs) for **ALL ~24K broken links BEFORE applying the cap** → ~**1e9 edit-distance ops**, and
retained all ~39K file bodies in memory (`files.map(readFileSync)`). That node process pegged a CPU
core and held large memory → looked like a runaway → **first run exited 255 (reaped)**. My
`node --max-old-space-size=8192` retry made it WORSE: on Windows `--max-old-space-size` is a COMMIT
RESERVATION (see [[windows-commit-reservation-hook-heap]]) that pressures the 26-chat fleet. Golf's
reaper / fleet-memory-monitor cleaned up the orphan; the operator flagged the PC-health issue.

**Fix:** STREAM the walk (read→extract→discard each body, GC-eligible — no corpus retention) and run
the expensive per-item Levenshtein ONLY for the `cap`-sized batch. Now 11–125s, exit 0, **default
heap**, no memory spike (84GB free, 0 orphan procs after).

## Generalizable rules
- **Apply the cap/cursor BEFORE the expensive per-item work, never after.** "Compute over the whole
  population, then slice" is an O(N×M) trap that masquerades as a hang and gets reaped.
- **Stream a corpus walk; never hold all bodies in memory** when one-file-at-a-time suffices.
- **On Windows, never use `--max-old-space-size` to "fix" a hang** — it reserves commit and harms the
  fleet. Diagnose the algorithm instead.
- **Green unit tests of PURE functions do not prove the SHELL is safe** — validate the live run's
  wall-time + memory, not just the assertions. The defect here was ordering, untouched by any test.
- **existing-note-only prevents INVENTION, not WRONG matches** — add a token-coverage guard for
  precision; keep apply gated (advisory dry-run) until precision is proven on live data.

Related: [[windows-commit-reservation-hook-heap]] · [[reference_sierra_resolver_memory_safe_2026_06_24]] ·
[[fleet-reaper]] · [[fleet-memory-monitor]]
