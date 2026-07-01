---
name: reference-p6-u02-hooks-wired-2026-05-20
description: P6-U02 (4 CLAUDE.md-rule hooks) wiring follow-on shipped by slot kilo — 3 new settings.json entries + verified shipped state of U-TL-U5 / U-TL-U6 (2/3 picks already complete prior session)
aliases: reference_p6_u02_hooks_wired_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.720Z
---


INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02 was build-complete since 2026-05-13 (4 hook files on disk: engine-digest-precheck, rtk-prefix-reminder, commit-format-validator, compact-interval-warning), but the unit's own ship_notes admitted "Wiring into settings.json is a 2-line operator follow-on... partial wiring is graceful." This session (slot kilo, 2026-05-20) closed that wiring debt.

**Wiring done this session:**
- `engine-digest-precheck.mjs` → C: settings.json `PreToolUse` matcher `^(Write|Edit)$`
- `commit-format-validator.mjs` → C: settings.json `PostToolUse` matcher `Bash`
- `compact-interval-warning.mjs` → C: settings.json `Stop` chain (new solo group)
- `rtk-prefix-reminder.mjs` — already wired via `.claude/hooks/bundles/bash-bundle.mjs` (verified, no action needed)

Mirror C: → H: was MANUAL (`cp ... → mv`) because the c-to-h-mirror hook only fires on Edit/Write/MultiEdit/NotebookEdit tool events; a `node -e` Bash-script JSON edit bypasses it. Watch for this whenever scripted Node edits write to a C:-rooted settings file — H: drift accrues silently if you don't either run a Write-tool edit OR a manual mirror after.

**Verified shipped (no action needed):**
- `TRAINING-LEARNING-MS0::U-TL-U5-DOMAIN-MATCHERS` — 3 matcher engines (LathePartFamilyMatcherEngine 615 LOC + MillPartFamilyMatcherEngine 577 LOC + WEDMPartFamilyMatcherEngine 559 LOC) + 163 tests + dispatcher wiring (`prism_turning:lathe_part_family_match`, `prism_cam:mill_part_family_match`, `prism_edm:wedm_part_family_match`) all on disk and wired prior session (commits 3ded2c1a5 + 3ffbe0752).
- `TRAINING-LEARNING-MS0::U-TL-U6-CONTINUOUS-LEARNING` — TrainingTemplateContinuousLearningEngine 531 LOC + 40 tests + 3 dispatcher actions (`training_ingest_lathe_outcome`/`mill`/`wedm`) all live, prior session commit 950c46d6c.

**Why the picker re-surfaced shipped units:** the `/pick-unit` picker only subtracts shipped from envelope's `completed_units` count at milestone level; per-unit `status:"complete"` does not always flow up into the `completed_units` integer when a milestone is built incrementally. TRAINING-LEARNING-MS0 itself is `completed` top-level but P6-U02 (and others under INTEL-OLLAMA-OBSIDIAN-MS0) still surface because INTEL-OLLAMA-OBSIDIAN-MS0 is `in_progress`. **The picker is not authoritative for completion — always verify on disk before re-doing.**

**Doctrine pin (reinforce):** verify the actual artifact exists before building. Three of three picks here were already on disk; building blindly would have been duplicate work. [[feedback_verify_actual_contract_not_proxy]] applies.

**Known follow-up (P3, not blocking):** `commit-format-validator.mjs`'s regex (per its own docstring: `/^(\[MAIN\]\s+)?\[SCOPE-MS#\](\/U-ID)?: title$/`) treats `[SCOPE-MS#]` and `U-ID` as literal strings — false-positives on `[MAIN] [TEST-MS0]/U-TEST: x` style. The hook fires (advisory only, exit 0, never blocks) so this is cosmetic; needs regex rewrite to character classes (`\[[A-Z0-9-]+-MS[0-9]+\]/U-[A-Z0-9]+`) but no urgency. [[reference_p6_u02_hooks_wired_2026_05_20]]

verify: `grep -c engine-digest-precheck H:/.claude/settings.json` → 1; `grep -c commit-format-validator H:/.claude/settings.json` → 1; `grep -c compact-interval-warning H:/.claude/settings.json` → 1
