---
name: session-continuity-ms0-2026-05-22
description: "SESSION-CONTINUITY-MS0 — slot-keyed handoff read makes /checkin-<nato> resume after a full terminal restart; plus 15-tab fleet launcher (pwsh 7, auto /checkin) and turn-end tab-blink"
aliases: reference_session_continuity_ms0_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.159Z
---


SESSION-CONTINUITY-MS0 (2026-05-22, slot bravo, /loop) — shipped so
`/checkin-<nato>` resumes a chat's prior context after a FULL terminal restart
(all windows closed, all-new sessions). Operator's words: "If I restart and
start all new terminals and sessions, I want to be able to use the checkin-nato
slash command and we'll pick up right where we left off."

**Root bug:** work-slot handoffs are instance-keyed
(`HANDOFF-<claude-id>-<topic>.md`). A restarted chat has a fresh session-id, so
`per-agent-handoff.mjs read --terminal <new-id>` misses every tier and falls
through to `family-latest` — returning a RANDOM peer's handoff. Only `golf` was
slot-keyed.

**Fix (4 parts, all tagged `SESSION-CONTINUITY-MS0`):**
1. `per-agent-handoff.mjs` — new `read --slot <nato>` tier resolves by the
   durable `slot:` frontmatter field (topic-prefix fallback). Authoritative:
   `no_slot_handoff`, never a peer. Tests: `per-agent-handoff.test.mjs` (5/5).
2. `psk.mjs` — `checkin` composite gained a `readSlotHandoff` 5th sub-step →
   `composite.handoff` (parallel with drift+hygiene; missing handoff never
   degrades).
3. `checkin.md` — Report surfaces `composite.handoff` RESUME.
4. Fleet launcher `H:/Tools/prism-fleet/Launch-PRISM-Fleet.ps1` → 3 windows x 5
   pwsh-7 tabs = 15 slots, each tab auto-runs `/checkin-<slot>` via the new
   `slot-tab-boot.ps1`. Tab-blink: `stop-tab-blink.mjs` Stop hook writes BEL to
   `\\.\CONOUT$`; WT `bellStyle:["window","taskbar"]`.

**Lessons:**
- PowerShell 5.1 reads a no-BOM `.ps1` as the ANSI codepage, not UTF-8. An
  em-dash (U+2014) decodes with byte `0x94` = a curly-quote that terminates a
  string literal → parse error. Keep PowerShell scripts **pure ASCII**. Known
  class — see "installer em-dash fix" in CLAUDE.md regressions.
- `claude-md-golf-only-guard` blocks non-golf chats from editing CLAUDE.md →
  non-golf chats record in `state/shared/RECENT-SHIPMENTS-<date>.md`.

**Pre-existing bug found (NOT fixed — out of scope, flagged for golf/follow-up):**
`~/.claude/settings.json` SessionStart chain — the `substrate-health-inject`
hook has a broken command path `"H:.claude\binportable-node"` (missing
slashes + space). It silently fails every SessionStart. Separate fix.

**Knob:** `PRISM_TAB_BLINK_DISABLE=1`.

**Shipped — MISATTRIBUTED:** commit `72130062c3`. The shared `H:/prism` git
index swept my 7 staged files (per-agent-handoff.mjs + .test.mjs, psk.mjs,
stop-tab-blink.mjs, checkin.md, the wiki entry, RECENT-SHIPMENTS-2026-05-22.md)
into a peer's `[MAIN] [BRIDGE-WIRING]/U-BRIDGE-WIRE-TRIBAL` commit — 7 of its 8
files (508 of 512 insertions) are this work. Peer-absorption class; see
[[reference_git_index_saturation_camx11]]. The work is fully shipped + correct;
only the commit banner is wrong (shared tree, 657 ahead of origin — history
rewrite not an option). Launcher (`H:/Tools/prism-fleet/`) + `settings.json`
wiring + WT `bellStyle` are outside the repo, on disk. Lesson reinforced: fork
to a slot worktree before staging on the shared tree.

**Follow-up — CORRECTLY BANNERED:** commit `6150dd6eb2` (`[MAIN]
[SESSION-CONTINUITY-MS0]/U-SC01`). Two 3-of-3 scrutiny fixes: (1)
`per-agent-handoff.mjs` now imports `SLOT_NAMES` from `chat-slots.mjs`
instead of a literal copy (CLAUDE.md forbids hard-coding the slot list;
`chat-slots.mjs` is main-guarded so the import has no side effects); (2)
`stop-tab-blink.mjs` rewritten to a detached, unref'd self-spawn writer
(`--emit-bel` argv branch) so the BEL write to `\\.\CONOUT$` can never
block the Stop chain. Pathspec commit (`git commit -- <2 files>`) so the
shared index could not re-absorb it. 3-of-3 PASS — arms A/B/C all PASS,
`blockCount 0`. `node --check` + 5/5 tests green. This is the one commit
that carries the correct SESSION-CONTINUITY-MS0 banner.

**Follow-up 2 — U-SC02 hardening:** commit `a1575d05ed` (`[MAIN]
[SESSION-CONTINUITY-MS0]/U-SC02: full-restart resume hardening — PRISM_BOOT_SLOT
tier`). U-SC01 made the slot-keyed READ work, but the auto-resume hook
(`session-start-auto-resume.mjs`) only fired on `compact`/`clear` SessionStart
events — a true full restart raises a `startup` event in a fresh process with
NO durable slot signal, so resume still needed a hand-typed `/checkin-<slot>`.
U-SC02 closes that SPOF: `slot-tab-boot.ps1` exports `$env:PRISM_BOOT_SLOT`
before launching claude; `session-start-auto-resume.mjs` gains a `startup`-event
branch (`getHandoffBySlot` + pure exported `buildBootResumeContext`) that reads
the env var, resolves the slot-keyed handoff via `read --slot`, and injects
the RESUME with zero operator input; `settings.json` gains a 4th SessionStart
arm (`matcher: "startup"`). Tests 43/43 (9 new `buildBootResumeContext` cases
incl. all 26 slots). Per-file scrutiny + 3-of-3 all PASS. Net: launching the
fleet via `Launch-PRISM-Fleet.ps1` auto-resumes every slot on first
SessionStart — operator never types `/checkin-<slot>` unless they want the
full audit.

Wiki: [[session-continuity-ms0]].
