---
name: feedback-fleet-design-10-chats
description: "PRISM fleet must be designed for up to 10 concurrent chats — currently 7 slots (alpha..foxtrot + golf). Every new slot-aware design (chat-slots, write-allowlist, lane-assignment, fleet-status, hook fan-out, golf-allowlist) must scale to 10 without schema migration each time."
aliases: feedback_fleet_design_10_chats
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.425Z
---


Standing rule (2026-05-15, user directive): "remember to design for up to 10 chats". Every fleet-aware design that hard-codes the slot count or hardcodes specific NATO names must be widened to accommodate up to 10 concurrent chats.

**Why:** PRISM currently runs ~5-7 chats but the user runs more concurrent work than the fleet supports. Designs that hard-code 6 work slots + 1 hygiene (the current `alpha bravo charlie delta echo foxtrot + golf` scheme) repeatedly force schema migrations every time the cap rises. Bake 10 in from now.

**How to apply:**

1. **Slot names — NATO phonetic, 9 work + 1 hygiene:**
   - Work slots (9): `alpha · bravo · charlie · delta · echo · foxtrot · golf · hotel · india`
   - Hygiene slot (1): `juliett` (NEW name; the current `golf` slot — currently the 7th NATO — gets reused as the 7th *work* slot)
   - Total: 10 slots
   - **Migration**: existing `golf` slot = hygiene must rename to `juliett` (alias kept for back-compat 1 cycle). Update `golf-slot-write-allowlist.mjs` → `juliett-slot-write-allowlist.mjs` + symlink. Update `--golf` flag in `/checkin` → `--juliett` (alias). All docs/CLAUDE.md prose mentioning "alpha..foxtrot + golf" → "alpha..india + juliett".

2. **Scripts/configs that hard-code 6 or 7:**
   - `chat-slots.mjs` `SLOT_NAMES` array → 10 entries
   - `chat-slots.json` `schemaVersion` bump
   - `atomic-roadmap.json` `laneAssignments[]` → chat=1..9 (work) — juliett has no lane
   - `state/shared/atomic-roadmap-chat-<N>.md` → generate up to chat-9
   - `golf-slot-write-allowlist.mjs` → rename + check `slot === 'juliett'`
   - `fleet-status.mjs` dashboard → render 10 rows
   - `/six-chat-bootstrap` skill → rename `/ten-chat-bootstrap` (alias kept)
   - `/six-chat-commit-consensus` → `/ten-chat-commit-consensus` (alias kept)
   - `CLAUDE.md` §GOLF SLOT prose → §HYGIENE SLOT (juliett)
   - `feedback_conflict_fork_rule.md` references to "6 chats" → "up to 9 work chats"

3. **Don't hard-code 10 either:** the `slot-name-list` should live in ONE constant (`chat-slots.mjs SLOT_NAMES`) and everything else iterates that array. Adding an 11th slot then becomes one constant edit + schema bump, not a 30-file sweep.

4. **Backward-compat policy:** keep `golf` as an alias for `juliett` for **one cycle** (until next milestone close-out). All NEW code uses `juliett`. Hooks that read slot names must accept both during the alias window.

5. **Multi-host coexistence still per-host:** 10 slots is *per host*. Two machines can each run 10 — slot lock files are per-host (already correct).

Related memories: [[reference_fleet_reaper_ms1]] (slot-aware reaper — must handle 10), [[feedback_conflict_fork_rule]] (worktree forking is independent of slot count).
