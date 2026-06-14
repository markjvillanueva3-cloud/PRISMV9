---
name: zulu-hermes-gaps-campaign-2026-05-20
description: "ZULU-HERMES-GAPS — 13-gap audit + fill campaign (slot:bravo, 2026-05-20..21). 10 code-fixes + 1 docs-complete + 2 operator-action; followed by ZULU-OMNISCIENT-MS0-PLAN scoping the 30 substrate surfaces still not wired into Zulu."
aliases: reference_zulu_hermes_gaps_campaign_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.078Z
---


# ZULU-HERMES-GAPS campaign + ZULU-OMNISCIENT-MS0 scoping

Pointer file — full detail in wiki entry `[[zulu-hermes-gap-audit-campaign]]`
(`knowledge/wiki/architecture/zulu-hermes-gap-audit-campaign.md`).

## Origin

User directive 2026-05-20: *"fill all gaps for zulu hermes capability + do deep
research on hermes and utilizing obsidian as an automated os | completed tasks
and wired"*. Ran from slot `bravo` (chat `claude-eca6e8bb`) across 2026-05-20
and 2026-05-21.

## What landed

- **13 gaps closed** — G1/G1b (PID/HWND), G2/G3/G9 (sweep-input hardening),
  G4 (operator-gate doctrine), G5 (shipDraft staging — `state/shared/specs/`
  not `.claude/commands/`), G6 (Jaccard-keyword dedup), G8 (per-slot cooldown),
  G11 (advisory hook wired), G13 (awareness `queueLength` → decision).
  10 code-fixes + 1 docs-complete + 2 operator-action.
- **Deep-research deliverable** — `state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md`
  (228 lines, commit `1251946c53`).
- **Campaign close-out** — `knowledge/wiki/architecture/zulu-hermes-gap-audit-campaign.md`.
- **Follow-on scoping** — `state/shared/specs/ZULU-OMNISCIENT-MS0-PLAN.md`
  measures 30 substrate surfaces Zulu still doesn't read (5 CRITICAL · 11 HIGH
  · 9 MEDIUM · 5 LOW) and proposes 3-phase MS0/MS1/MS2 plan.
- **First MS0 unit** — `U-ZO-MS0-01` shipped `scripts/lib/zulu-context-bundle.mjs`
  + tests (30/30 PASS, commit `3ae6e458d5`) — CLAUDE-BRIEF + PRISM-BUILD-VISION
  reader with mtime-keyed cache, path-resolved keys, R12 fail-loud on
  explicit empty/null path.
- **Autocompact desync fix** — `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 80 → 95
  (operator-noticed: fleet was compacting far more often than designed; the
  doctrine-canonical value pairs the precompact-auto-trigger SOFT 880K / HARD
  940K with the CLI's native 950K firing point).

## Why this matters

The 13-gap campaign closed *integration leaks* in the existing 4-input Zulu
decider (chat-slots PID + git dirty + handoff freshness + awareness queueLength).
It did NOT widen Zulu's read context. ZULU-OMNISCIENT-MS0-PLAN measures that
wider gap — 30 substrate surfaces the live chats see and Zulu doesn't (master
index, wiki, memories, tribal-by-domain, CLAUDE.md doctrine, CLAUDE-BRIEF +
BUILD-VISION + BUILD-CONTEXT, system-viz, ROADMAP-CONSOLIDATED, slot souls'
refuse_list, omega safety tiers, TOKEN-AWARENESS zone, scrutiny ledger, error
ledger, etc.).

The 3-phase plan: MS0 widens *inputs* (5 highest-leverage surfaces + bundle lib,
backward-compat preserved); MS1 widens *actions* (richer ADT — `suggest-pick /
handoff / fork / skill`, all still operator-gated per the G4 doctrine);
MS2 fuses into a goal-aware planner that reads BUILD-VISION + cross-fleet
bottleneck and ranks top-K SUGGESTIONS per slot with confidence.

## Lessons captured

- **Settings drift is a regression class.** Doctrine-canonical env values
  (here: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`) get silently reverted by
  unrelated edits and stay broken until the operator notices a downstream
  symptom. Auto-detection candidate: a SessionStart hook that compares
  `process.env.<knob>` against the doctrine-canonical value in CLAUDE.md
  and surfaces drift.
- **The shared-tree commit-misattribution class** (peer absorbs your work
  into their commit subject when their commit lands during your `git add`
  window) hit twice this session — `PRISM_AUTO_UNSTAGE_FOREIGN=0` + pathspec
  commit still required; content lands in HEAD even when the banner is
  wrong, so verify via `git cat-file -e HEAD:<path>` not `git log` parse.
- **Operator-gated loops are the design, not a limitation.** Section §6 of
  `HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` documents three reasons (safety
  surface, multi-tenant convergence, doctrine override) why the gate is the
  correct shape. ZULU-OMNISCIENT explicitly preserves it across MS0/MS1/MS2.
- **The per-file scrutiny gate catches real R9-integrity bugs in tests** —
  this session's arm-B reviewer found that my path-normalization test was
  tautological (reader had both keys registered, so a normalization break
  would have silently passed). The fix: register only the canonical key.

## See also

- Wiki: [[zulu-hermes-gap-audit-campaign]]
- Spec: `state/shared/specs/ZULU-HERMES-GAP-AUDIT-2026-05-20.md` (13-gap register)
- Spec: `state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` (deep-research)
- Spec: `state/shared/specs/ZULU-OMNISCIENT-MS0-PLAN.md` (follow-on plan)
- Inbox: `state/shared/RECENT-SHIPMENTS-2026-05-21.md` (golf-drain queue)
- [[hermes-zulu-integration]] — HERMES-MS0/MS1 architecture
- [[reference_zulu_awareness_ms0_2026_05_20]] — awareness MS0 backbone
- [[feedback_reflect_all_changes_post_update]] — 4-surface doctrine
