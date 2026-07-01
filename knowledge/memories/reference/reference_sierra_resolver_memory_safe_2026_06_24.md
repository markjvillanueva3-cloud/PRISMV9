---
name: reference_sierra_resolver_memory_safe_2026_06_24
description: "Sierra 2026-06-24: shipped wiki-link-semantic-resolve.mjs (Ollama anti-poison broken-wikilink resolver, commit 546704bfe9) AND the self-caused PC-health regression that golf reaped + the fix. ROOT CAUSE of the health issue: a build script that computes O(N_broken x N_existing)~1e9 Levenshtein ops BEFORE applying its cap, plus retaining ~39K file bodies in memory, looks like a runaway node proc -> reaped (exit 255); --max-old-space-size 'fix' made it worse on Windows (commit reservation). FIX: stream the walk + run the expensive per-item work ONLY for the capped batch."
type: reference
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.199Z
aliases: reference_sierra_resolver_memory_safe_2026_06_24
---


# Sierra: memory-safe Ollama wikilink resolver + self-caused health regression (2026-06-24)

Operator `/checkin-sierra /goal /loop`: maximize system-viz/obsidian/ollama/octopus
UTILIZATION+synergy. Live state showed the fleet pathology three times over (built-but-not-executed):
ollama `executedOffloads:0`, octopus dormant, both broken-link tools never run. Built the synergy
keystone: an Ollama-executing vault-link resolver. Mid-build I CAUSED a PC-health issue that golf
reaped — recorded here so it never recurs.

## SHIPPED: scripts/wiki-link-semantic-resolve.mjs (commit 546704bfe9, 14/14 tests)
Net-new SEMANTIC DECISION+EXECUTION layer over the two existing PURE string-distance tools
(`fix-broken-wikilinks.mjs` = case-variant classifier; `wiki-broken-link-propose-fix.mjs` =
Levenshtein proposer) — neither decides, runs Ollama, or resolves. Resolves the 26,165 broken
`[[wikilinks]]` to an EXISTING note only:
- Levenshtein pre-filter → candidate set of existing notes.
- **token-coverage precision guard** (`tokenCoverageOk`): every significant token (len≥3) of the
  broken link must be a substring of the candidate's concatenated form. Rejects dropped-qualifier
  false matches (`cad-knowledge-index→knowledgeindex` drops "cad"; `prism_telemetry→telemetry`
  drops "prism"), keeps `telemetry-engine→telemetryengine`. **Found by LIVE validation** — without
  it precision was 1/3; with it 1/1 on the same population.
- Ollama (local gpt-oss:20b, $0, routed via `ask-ollama.mjs` → **recorded as executedOffloads**)
  picks ONE candidate or NONE.
- **ANTI-POISON** (`validateResolution`): the pick is accepted ONLY if it is an exact member of the
  pre-validated candidate set → invention is IMPOSSIBLE (the central poison caution from prior
  sierra sessions). Note: existing-note-only prevents INVENTION, not WRONG-existing-note matches —
  that is what the token-coverage guard adds. Still DRY-RUN by default (advisory); `--apply` is
  capped + `.bak` backup; resumable cursor lets a cron chip at the 26K set.
- Live proof: 1 correct resolution, 0 wrong, 0 invented, 3 recorded Ollama executions
  (`byHook.ask-ollama` offloaded:3, tokensSaved 491). The tool DRIVES real off-Claude execution —
  the synergy lever the operator asked for.

## HEALTH REGRESSION I CAUSED (R12, golf cleaned it up)
First build pass of `runDecide`: computed `buildCandidateSet` (Levenshtein over ~40K existing
slugs) for ALL ~24K broken links BEFORE applying the cap → ~**1e9 edit-distance ops**, AND built
`fileContents = files.map(readFileSync)` retaining ~39K file bodies in memory. Result: a CPU-pegged,
memory-heavy node process that looked like a runaway → **first run exited 255 (reaped)**; my
`node --max-old-space-size=8192` retry made it WORSE (on Windows `--max-old-space-size` is a COMMIT
RESERVATION — [[windows-commit-reservation-hook-heap]]). Golf's reaper/fleet-memory-monitor cleaned
up the orphan; the operator flagged it.

**FIX:** STREAM the walk (read→extract→discard each file body, GC-eligible; no 39K retention) and
run the expensive per-item Levenshtein ONLY for the `cap`-sized batch (cap×40K, not 24K×40K). Every
evaluated link is cursor-recorded for forward progress. Default model dropped 32B→gpt-oss:20b. Now
11–125s, exit 0, **default heap**, no spike (verified: 84GB free, 0 orphan procs after).

## LESSON (general, fleet-wide)
A batch/loop script must apply its CAP/cursor BEFORE the expensive per-item work, never after —
"compute candidates for the whole population then slice" is an O(N×M) trap that masquerades as a
hang and gets reaped. And never hold the whole corpus in memory when a streaming walk suffices.
On Windows, never reach for `--max-old-space-size` to "fix" a hang — it reserves commit and
pressures the 26-chat fleet. Unit tests of the PURE functions will pass while the SHELL ORDERING is
the defect — validate the live run's wall-time + memory, not just green tests.

Related: [[reference_sierra_octopus_localonly_and_synergy_state_2026_06_23]] ·
[[reference_sierra_open_threads_context_map_2026_06_10]] · [[windows-commit-reservation-hook-heap]] ·
[[feedback_build_for_blackwell_hardware]] · [[feedback_synergy_definition]]
