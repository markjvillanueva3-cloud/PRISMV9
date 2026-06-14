---
name: reference-bash-orphan-cleaner-wired-2026-05-16
description: "bash-orphan-cleaner.mjs wired as Stop hook 2026-05-16 — kills orphan bash.exe leaves from this session at every Stop, conservative peer-safe ppid ancestry"
aliases: reference_bash_orphan_cleaner_wired_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.027Z
---


# bash-orphan-cleaner.mjs wired to Stop chain

**Shipped:** 2026-05-16 slot delta claude-6d0595bf, iter40 of /loop "wire all hooks + high-ROI combos".

**Position:** Inserted at the end of the Stop chain in both `C:/Users/wompu/.claude/settings.json` and `H:/.claude/settings.json` (auto-mirrored by c-to-h-mirror), immediately after `fleet-reaper-stop` — the cleanup neighborhood. Timeout 10000ms.

**Why this hook:** Pulled from the 334-orphan-hook backlog (504 source / 179 wired = 66.3% orphan rate per `scripts/high-value-additions-rank.mjs`). User-documented symptom in the hook header: "60+ stuck bash.exe when ejecting H: drive last night". Claude Code on Windows leaks bash.exe per Bash tool call when tasks are interrupted or `run_in_background` crashes.

**Safety properties (verified pre-wire):**
- Walks ppid ancestry up MAX_ANCESTOR_DEPTH=32 to find the `claude.exe` ancestor of THIS session — peer chats run their own `claude.exe` with disjoint descendant trees, so we never touch their bash.
- Only bash.exe with NO living children (leaves only) — active background tasks like `npm run dev` keep child processes alive and are skipped.
- Only bash.exe older than ORPHAN_AGE_SECONDS=60 — protects fresh subprocesses from race kills.
- If the claude.exe ancestor cannot be located → no-op (never guess).
- Returns `{continue:true}` on every error path — smoke-tested on empty stdin.

**Disable knob:** `PRISM_BASH_CLEANUP=0`

**Composition:** Sister to [[reference_fleet_reaper|fleet-reaper]]-stop (cross-session slot reaping) + node-process-janitor (broad orphan reap) + cleanup-orchestrator. bash-orphan-cleaner fills the per-session bash.exe leaf-cleanup niche that the others don't cover.

**Lesson — lock-then-retry pattern (chat-bus file-claim discipline):**
First attempt was BLOCKED by claude-549c9f4f's chat-bus claim on `C:/Users/wompu/.claude/settings.json` (2m TTL). Per the conflict-fork rule + [[reference_slot_worktree_ms0_p1_routing_complete]], did NOT fight for the same tree. Posted coordination message to AGENT_CHAT (`chat-1778896825489`) proposing the wire location + asking for ack-or-yield. Waited the TTL. Re-checked chat-bus next turn — claim released. Retried Edit cleanly. C: → H: mirror confirmed by PostToolUse hook. The lock-then-retry pattern is the right move when a peer holds the file-claim — never bypass file-claim-guard, never edit the H: copy first (would be clobbered when peer's C: edit triggers the C:→H: mirror).

**Settings.json files are OUT of the H:/prism git tree** — no commit needed. Wiring is live the moment the Edit + mirror complete. HOOK_REGISTRY.json regen auto-queued by the post-edit hook.

Sister memory: [[reference_settings_wiring_drift_2026_05_16]] (always grep both settings.json files after any harness-config edit), [[reference_stop_advisory_wiring_cluster_2026_05_15]] (Stop advisory cluster pattern), [[reference_fleet_reaper_ms1]] (companion cleanup hook).
