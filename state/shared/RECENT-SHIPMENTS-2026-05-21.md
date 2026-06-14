# Recent shipments inbox — 2026-05-21

> **Purpose** — Pointer inventory of milestones/units shipped 2026-05-21 that do NOT
> yet have a summary section in `CLAUDE.md`. Each entry is a one-line pointer to
> where the actual detail lives (commit SHA, wiki entry, memory file). A golf-slot
> chat will batch-promote these into full CLAUDE.md sections in a follow-up sweep —
> this file is the inbox they drain, mirroring the `## Recent regressions` pattern.
>
> Add a row here whenever a new milestone ships and its summary block isn't ready
> for CLAUDE.md yet. Drain rule: a row leaves this file when its detail lands in
> CLAUDE.md proper (or when it's been determined to be CLAUDE.md-out-of-scope).
>
> _Inbox started 2026-05-21 by bravo chat `claude-eca6e8bb`._

## Regression rows (for `## Recent regressions` golf-drain)

### 2026-05-21 — CLAUDE_AUTOCOMPACT_PCT_OVERRIDE 80→95 fix + ZEBRA-OMNISCIENT-MS0 (slot:bravo)

**Row text for `## Recent regressions`:**
`- 2026-05-21 | **autocompact desync fix (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE 80→95) + ZEBRA-OMNISCIENT-MS0-PLAN spec (30 substrate surfaces measured) + U-ZO-MS0-01 CLAUDE-BRIEF+BUILD-VISION reader (30/30 tests, slot:bravo)** | observed-in: 3ae6e458d5 | fix: see commit | verify: \`git -C H:/prism show 3ae6e458d5\``

**Headline:** Operator noticed fleet was compacting far more often than designed. Root cause: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80` (was reverted from doctrine-canonical 95 on 2026-05-19 per the prior regression row `64d1793dc`, never restored). With 80, CLI native autocompact fires at ~800K tokens — *before* the `precompact-auto-trigger.mjs` SOFT 880K nudge can even warn, so the SOFT/HARD guards never get a chance to fire a clean handoff, and the TOKEN-AWARENESS sidecar's YELLOW/RED zones are measured against a 15% smaller compaction window than their calibration assumes.

**Fix:** Flipped `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 80 → 95 in `C:\Users\<u>\.claude\settings.json` line 21 (c-to-h-mirror replicated to `H:\.claude\settings.json`). The 3-stage compaction system is resynchronized:
- CLI native autocompact at 950K (95% of 1M)
- `precompact-auto-trigger.mjs` SOFT 880K nudge + HARD 940K block fire with intended ordering
- TOKEN-AWARENESS-MS0 sidecar YELLOW/RED zones read against the correct ceiling

**Also shipped this session:**
- `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md` (+ HTML twin) — advisory spec measuring **30 substrate surfaces** Zebra still doesn't read post-ZEBRA-HERMES-GAP-AUDIT (5 CRITICAL, 11 HIGH, 9 MEDIUM, 5 LOW). 16 categories the operator listing didn't name surfaced. 3-phase plan: MS0 read-side (5 surfaces + bundle lib) → MS1 action-ADT (`suggest-pick/handoff/fork/skill`, still operator-gated) → MS2 goal-aware planner. Operator-gate (G4) explicitly preserved.
- `scripts/lib/zebra-context-bundle.mjs` (~210 lines) + tests (30/30 PASS) — first MS0 unit, the CLAUDE-BRIEF + PRISM-BUILD-VISION reader with mtime-keyed cache + TTL fallback. Pure-core + injected reader (mirrors `zebra-awareness-consumer.mjs` pattern). Path-normalized cache keys (Windows mixed-separator-safe). R12 fail-loud on explicit empty/null path. Success-only cache writes. Per-file scrutiny gate cleared on both files (4 reviewer agents); 5 P1 + 4 P1 findings fixed inline.

**Class:** Settings-drift regression — a global env-var override silently degraded fleet-wide compaction cadence, with downstream impact on the brand-new TOKEN-AWARENESS-MS0 sidecar that this session shipped (no fault of the sidecar; it was calibrated for the doctrine-canonical 95%). Doctrine pointer at top of `H:/prism/CLAUDE.md` explicitly caps the value at 95-98; the 80 setting violated that.

**Files:** `C:/Users/wompu/.claude/settings.json` (line 21 flip) · `H:/.claude/settings.json` (auto-mirrored) · `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.{md,html}` · `scripts/lib/zebra-context-bundle.mjs` + `.test.mjs`

**Verify:**
- `command grep CLAUDE_AUTOCOMPACT_PCT_OVERRIDE C:/Users/wompu/.claude/settings.json` → expect `"95"`
- `cd H:/prism && node --test scripts/lib/zebra-context-bundle.test.mjs` → expect `30/30 PASS`
- `git -C H:/prism show 3ae6e458d5 --stat` → expect 2 files changed (lib + test)

### 2026-05-20 — ZEBRA-HERMES-GAP-AUDIT 13-gap closeout (slot:bravo)

**Row text for `## Recent regressions`:**
`- 2026-05-20 | **ZEBRA-HERMES-GAP-AUDIT 13-gap closeout — G1b title-HWND, G2/G3/G9 sweep-input hardening, G5 shipDraft staging, G6 Jaccard-keyword dedup, G13 awareness→decision wire, G4 operator-gate doctrine, G10/G12 operator-action surfacing (slot:bravo)** | observed-in: 4fac984675 | fix: see commit | verify: \`git -C H:/prism show 4fac984675\``

**Headline:** 13-gap audit + fill campaign on the ZEBRA orchestrator + Hermes closed-learning-loop + ZEBRA-AWARENESS integration. **10 fixed (code + tests) · 1 docs-complete · 2 operator-action** (G10 register scheduled task elevated, G12 set `chat-slots.json slots[name].zebraOptIn=true` per policy).

**Gaps closed:**
- G1/G1b (P0): `pickActionableSlots` PID/HWND field corrected + title-based HWND resolution via Win32 `EnumWindows` (resolver `scripts/lib/resolve-hwnd-by-title.mjs`, 33/33 tests)
- G2/G3/G9 (P1/P2): real `git status --porcelain` signal, `staggerAfterLine` + 90s `/compact` wait + sweep lockfile, per-slot handoff freshness scan
- G4 (P2): operator-gated loop documented as design (companion spec `HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md`)
- G5 (P1): `shipDraft` destination flipped to `state/shared/specs/SKILL-CANDIDATE-AUTOPASS-<id>.md` staging area (NOT `.claude/commands/`)
- G6 (P2): `gateCandidate` Jaccard-overlap keyword dedup vs existing skill frontmatter
- G8 (P2): per-slot 15-min action cooldown
- G11 (P1): `zebra-advisory-inject.mjs` wired into UserPromptSubmit
- G13 (P1): awareness `queueLength` feeds `planSlotAction.hasUnresolvedHandoff`

**Companion deep-research:** `state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` (228 lines, commit `1251946c53`) — synthesizes Hermes-as-runtime + Obsidian-as-substrate thesis, 8-layer Obsidian-as-OS mapping of Hermes patterns to PRISM file shapes, closed-loop leak measurement, awareness→decision wire, §6 "Why operator-gated loops are the design".

**Files:** `scripts/lib/zebra-orchestrator-lib.mjs`, `scripts/zebra-orchestrator-sweep.mjs`, `scripts/lib/zebra-orchestrator-lib.test.mjs` (+60), `scripts/lib/resolve-hwnd-by-title.mjs` + tests (33), `.claude/helpers/set-window-title.mjs`, `scripts/lib/skill-loop-pipeline.mjs` (G5/G6), `scripts/skill-loop-pipeline.test.mjs` (+51), `scripts/skill-loop-run.mjs`, `state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md`, `state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md`, `knowledge/wiki/architecture/zebra-hermes-gap-audit-campaign.md`.

**Class:** Multi-gap integration-leak fix — orchestrator backbone already shipped (`ZEBRA-ORCHESTRATOR-MS0` 7/7) and `HERMES-MS0/MS1` already shipped, but the *integration leaks* between them (wrong PID field, hard-coded git dirty, stub destinations, bogus dedup field) were never measured. The audit measured those leaks and closed them as a single coherent campaign.

**Verify:** `git -C H:/prism show 4fac984675 --stat`, then `cd H:/prism && node --test scripts/lib/zebra-orchestrator-lib.test.mjs scripts/skill-loop-pipeline.test.mjs scripts/lib/resolve-hwnd-by-title.test.mjs` → expect 144+ tests PASS.
