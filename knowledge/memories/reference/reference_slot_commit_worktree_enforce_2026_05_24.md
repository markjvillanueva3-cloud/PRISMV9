---
name: reference-slot-commit-worktree-enforce-2026-05-24
description: "slot-commit-worktree-enforce.mjs — PreToolUse:Bash hook that HARD-BLOCKS `git commit` when a NATO-slot-bound chat is not on its slot/<name> branch. Closes operator pain point 2026-05-24 \"I have to manually tell each chat to commit to their designated worktree.\" Default-ON, golf-exempt, bootstrap-marker escape, kill-switch."
aliases: reference_slot_commit_worktree_enforce_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.951Z
---


# slot-commit-worktree-enforce — HARD enforcement that slot chats commit from their NATO-named worktree (2026-05-24, slot bravo)

## What it closes

Operator directive 2026-05-24: *"put an enforcement for chat slots to commit to their native worktrees the same as their NATO name. I have to manually tell each chat to commit to their designated worktree, they kept trying to commit to the same worktrees."*

Concrete pain points addressed:
1. **[[reference_h8_misattribution_2026_05_20|H8 misattribution]] class** — chats in shared `H:/prism` on `cad-fusion-live-ms0` race for `.git/index.lock`; commits get absorbed under whoever wins (3 occurrences in this single bravo session alone — commits `def45306e9`, `340385c95d`, `3cca69b796` all attributed to peer subjects)
2. **Documented-active-factually-inactive** — per tribal entry [[slot-worktree-enforcement-documented-active-factually-inactive]], the existing 3 sibling enforcement hooks (`main-tree-write-block`, `worktree-commit-route`, `git-add-lane-guard`) ALL require the chat to ALREADY be on `slot/<name>` to fire. Chats in main tree silently get fail-open from every existing gate.
3. **Operator-manual-cutover treadmill** — until now, the only path was the operator typing `/checkin-<slot>` in every new chat to trigger §2c cutover.

## How it differs from existing siblings

| Hook | Trigger | What it checks |
|------|---------|---------------|
| `main-tree-write-block` | Edit/Write/MultiEdit | Slot ALREADY on slot/* + target inside main tree |
| `worktree-commit-route` | Bash:git-commit | Commit subject's SCOPE TOKEN matches a themed worktree |
| `git-add-lane-guard` | Bash:git-add | Files match the slot's lane (slot must already be on slot/*) |
| `slot-bind-enforce` | UserPromptSubmit (/checkin) | Re-claims THIS slot from a peer at /checkin time |
| **THIS HOOK** | **Bash:git-commit** | **Slot binding → current branch identity (`slot/<slot>`)** |

The new hook is the PRECONDITION that the other three silently require. It's the gate that closes the documented-active-factually-inactive gap.

## Logic (per-tier)

1. PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1 → allow (kill switch, always wins)
2. tool_name !== "Bash" → allow
3. command not parsed as `git commit` → allow (allows `git log`, `git rev-list`, etc.)
4. command contains `[BOOTSTRAP-SLOT-ENFORCE]` → allow (one-shot operator bypass for transitional commits)
5. Can't resolve session_id (input.session_id or normalize fallback) → allow (fail-soft)
6. chat-slots.json missing/unreadable → allow (fail-soft)
7. session_id not bound to any NATO slot → allow (transitional / cron / IDE)
8. slot.name === "golf" → allow (integrator role per CLAUDE.md §GOLF SLOT)
9. Live `git -C <cwd> rev-parse --abbrev-ref HEAD` !== `slot/<slotname>` → **DENY** with structured block message + 4 escape paths

## Block message contents

When the hook fires, the chat sees:
- `slot:` the NATO name
- `chatId:` the resolved id
- `commit cwd:` the directory the commit would run in
- `current branch:` what the chat is on
- `expected:` `slot/<slotname>`
- `expected tree:` `H:/prism-slot-<slotname>`
- 4 escape paths (canonical migration via /checkin-<slot>, manual cutover, one-shot bootstrap marker, permanent kill switch)
- Why-this-block-exists paragraph

## Knobs

- `PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1` — kill switch (always wins)
- `PRISM_SLOT_COMMIT_ENFORCE_VERBOSE=1` — stderr decision trace

No opt-in `ENABLE` knob: default-ON intentionally. The user explicitly asked for ENFORCEMENT. Existing siblings ship default-OFF as transitional — this one is the cleanup that moves the fleet OFF cad-fusion-live-ms0 for slot chats.

## Wiring

`C:/Users/wompu/.claude/settings.json` PreToolUse:Bash chain, inserted directly after `worktree-commit-route` (same axis, complementary check). Auto-mirrored to `H:/.claude/settings.json` by the `c-to-h-mirror` hook. Timeout 5000ms.

## Bootstrap path (one-time, for fleet migration)

Until every chat has cut over to its slot worktree:
1. Operator runs `/checkin-<slot>` in each chat → triggers §2c cutover migrating to `H:/prism-slot-<slot>` on `slot/<slot>` branch
2. For transitional commits that MUST land before cutover, include `[BOOTSTRAP-SLOT-ENFORCE]` in the commit message body
3. Each bootstrap-marker use is operator-visible in the commit log + this memory file

## Sister doctrine

- CLAUDE.md §PER-CHAT HANDOFF — slot ↔ branch convention
- CLAUDE.md §SLOT-WORKTREE-MS0 — the architecture this hook ENFORCES
- CLAUDE.md §GOLF SLOT — why golf is exempt (integrator)
- [[reference_slot_worktree_activation_2026_05_16]] — the slot-worktree shipped
- [[slot-worktree-enforcement-documented-active-factually-inactive]] (tribal) — the gap this hook closes
- [[reference_h8_misattribution_2026_05_20]] — the failure class this hook prevents
- [[feedback_conflict_fork_rule]] — the manual fallback when something can't migrate

## Files

- Hook: `.claude/hooks/slot-commit-worktree-enforce.mjs` (~180 LOC)
- Wired in: `C:/Users/wompu/.claude/settings.json` PreToolUse:Bash (auto-mirrored to H:)
- This memory: `reference_slot_commit_worktree_enforce_2026_05_24.md`

## Build session

- Slot: bravo
- ChatId: claude-ea80ce2f
- Date: 2026-05-24
- Commit: see git log (used `[BOOTSTRAP-SLOT-ENFORCE]` marker since bravo itself was on cad-fusion-live-ms0 at build time — exactly the misattribution-prone state the hook now blocks)
