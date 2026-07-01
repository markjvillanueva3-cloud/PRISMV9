# U-OBF-F4 — Hook fire-rate audit + punch list (2026-05-18, slot bravo)

**Sources:**
- `scripts/hook-fire-rank.mjs --include-zero --json` (existing META, FORGE-AUDIT-V2/F3)
- `scripts/hook-wiring-vs-fire-categorize.mjs --json` (NEW META, this unit)
- `H:/.claude/settings.json` (canonical hook wiring — mirrored to C: by `c-to-h-mirror`)
- Full data: `state/shared/specs/U-OBF-F4-HOOK-FIRE-AUDIT-2026-05-18.json` (516 hook names, both buckets)

**Ledger window:** 435.9 hours (~18 days). Baseline at categorization: 2026-05-18T20:27:52Z.

## Headline

| Metric | Count |
|---|---|
| Unique hook paths wired in settings.json | 139 |
| Hooks that fired ≥1 in 18d (per ranker) | 10 |
| Hooks on disk that never fired | 516 |
| ↳ **WIRED but silent** (real fork-storm risk) | **136** |
| ↳ **UNWIRED on disk** (already inert, archive-only) | **380** |

## What U-OBF-F4 actually closes

The original BRAVO-TASK-QUEUE spec said:
> 526 hooks on disk; ~500/510 never fire. Dead hooks = load/scan overhead + xmalloc fork-storm risk. Run `hook-fire-rank.mjs`; if the never-fire ratio verifies, **disable** dead hooks.

**Verification surfaced a 2-bucket split the spec didn't anticipate**:

1. **WIRED-but-silent (136)** — IN settings.json so the harness LOADS+SCANS them on every matching event, but they emit zero telemetry. The actual load overhead. The actual disable target.

2. **UNWIRED-on-disk (380)** — NOT in settings.json at all. The harness never references them; disabling in settings.json is a no-op. The right action is filesystem archive (`.claude/hooks/<name>.mjs` → `.claude/hooks/_archive/2026-05-18/<name>.mjs`) per [[feedback_never_delete_only_disable]] so they stop bloating Grep / Glob / autocomplete searches.

Mass-disabling all 516 based on the ranker alone would target a 73%-noise population. U-OBF-F4 ships the categorizer + this punch list; **the actual disable pass is queued as U-OBF-F4-DISABLE** (operator-reviewed, conservative subset).

## Why U-OBF-F4-DISABLE must be operator-reviewed, NOT bulk-automated

The 18-day ledger window may not cover every event type. The 136 wired-but-silent set includes hooks that may fire RARELY-but-CRITICALLY — auto-disabling those is the silent-regression class. Sampling the wired-silent list (full list in the .json):

- `always-build-guard` — fires only on build requests. Critical when it does fire.
- `pre-compact-context-budget` — fires only on `/compact`. Critical.
- `subagent-start-context` — fires only on Agent-tool spawn. Critical for subagent context bundling.
- `auto-consensus-userprompt` — fires on specific keyword matches. May be rare in normal traffic.
- `agent-pid-tracker` — fires on a specific event class; may not have been exercised in window.

Mixed in with the above are hooks that ARE clearly dead-coded (the disable target). The categorization splits the buckets; the per-hook source review is the disable-pass.

## Conservative U-OBF-F4-DISABLE recipe (for the follow-up unit)

1. **Source-review each of the 136 wired-but-silent.** Categorize each by likely-fire frequency:
   - DEAD: source body is an unconditional no-op or matcher targets an extinct tool. → disable.
   - RARE-but-CRITICAL: rare event class not exercised in 18d (e.g., PreCompact, SessionEnd, specific keyword matchers). → KEEP wired.
   - UNKNOWN: needs source-read before classification.
2. **Disable only the DEAD subset.** Target 20-40 hooks for the first pass.
3. **For each disabled hook**: settings.json edit removes the entry (don't delete the .mjs file); add `_disabled_by: bravo, _disabled_at: 2026-05-18, _disabled_reason: "<one-line>"` to a sibling ledger `state/shared/disabled-hooks-ledger.jsonl`.
4. **Re-run the ranker monthly.** Any newly-fired hook that was in the disabled set → re-enable immediately + post-mortem.

## Archive recipe (for the 380 unwired-on-disk)

These never load — disabling settings.json doesn't apply. The action is filesystem-level:

1. Create `.claude/hooks/_archive/2026-05-18-unwired-orphans/` directory.
2. Move (NOT delete, NOT copy) each of the 380 unwired .mjs files into that archive dir.
3. Verify ripgrep + glob searches no longer surface them as candidates.
4. Document in `knowledge/wiki/lessons/hook-archive-2026-05-18.md`.

Archive recipe is also a separate operator-reviewed unit (`U-OBF-F4-ARCHIVE`); some "unwired" hooks may actually be referenced by other surfaces (skills .md, scripts/, docs) — those need to be caught before archive.

## Verification META commands

```bash
# Re-run the categorizer (deterministic against current state):
node scripts/hook-wiring-vs-fire-categorize.mjs --json | jq '.counts'
# Expected (this baseline): {totalZeroFire:516, wiredButSilent:136, unwiredOnDisk:380, totalWired:139}

# Source ranker (single source of truth on what 'zero_fire' means):
node scripts/hook-fire-rank.mjs --include-zero --json | jq '.totals'

# Confirm a candidate hook is truly silent (no fires in ledger):
grep '<hook-name>' mcp-server/data/state/hook-fire-counts.jsonl | wc -l

# Confirm a candidate hook is truly wired (in settings.json):
grep '<hook-name>' H:/.claude/settings.json | head -3
```

## Doctrine pins

- **Never delete, only disable** ([[feedback_never_delete_only_disable]]) — settings.json removal + archive only.
- **Read collaborator first (R8)** — every disable candidate gets its source-body read before the decision.
- **Fail loud (R12)** — if the disable pass kills a critical hook, the next fire that doesn't happen should be a loud regression, not a silent miss.
- **18-day window is a lower bound, not ground truth** — broaden the window (180d) for the actual U-OBF-F4-DISABLE decision pass to catch rare-fire hooks.

## Status

- **U-OBF-F4** ✓ shipped this commit: META analyzer + tests + this punch list + JSON artifact.
- **U-OBF-F4-DISABLE** ⌛ queued: source-review + conservative disable of clearly-dead subset (~20-40 hooks).
- **U-OBF-F4-ARCHIVE** ⌛ queued: filesystem archive of 380 unwired-on-disk hooks after cross-reference check.
