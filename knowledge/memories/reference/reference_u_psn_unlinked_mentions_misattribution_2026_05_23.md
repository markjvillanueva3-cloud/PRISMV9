---
name: reference-u-psn-unlinked-mentions-misattribution-2026-05-23
description: "2026-05-23 sierra /loop iter2 — U-PSN-UNLINKED-MENTIONS scanner shipped but commit message swept into alpha's 092ed84bfc (peer-commit-storm misattribution recurrence)"
aliases: reference_u_psn_unlinked_mentions_misattribution_2026_05_23
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-09T14:54:11.019Z
---


## Shipped (files in git, misattributed)
Files now tracked at commit `092ed84bfc` (titled `[TOKEN-SAVINGS-EXPAND]/U-PSN-E3-DEFER-TELEM (slot:alpha gap-E3)`):

- `scripts/lib/unlinked-mentions-scan.mjs` — pure scanner library (21/21 node:test pass).
- `scripts/lib/unlinked-mentions-scan.test.mjs` — 21 cases.
- `scripts/find-unlinked-mentions.mjs` — CLI runner over memory + wiki.
- `.claude/commands/unlinked-mentions.md` — `/unlinked-mentions` skill.
- `state/shared/UNLINKED-MENTIONS.md` (189K) — first-run report.
- `.gitignore` += `state/shared/UNLINKED-MENTIONS.json` (96.8MB output kept local).

## First-run signal
- 37,489 notes scanned.
- 37,487 hosts with ≥1 mention.
- **397,517 candidate mentions** — top hosts: `zulu-orchestrator.md` (149), `obsidian-vault-flow.md` (140), `machining-tactics-thread-manufacturing-decision.md` (139), `fleet-reaper.md` (138), `jsonl-ledger-conventions.md` (137).

## What the scanner does (cyrilXBT pattern)
From cyrilXBT 2026-05-22 X article "How to Link Notes Together in Obsidian and Why It Changes Everything":
- Scans memory + wiki bodies for bare references to known note-slug names not wrapped in `[[…]]`.
- Filters self-refs, already-linked spans, fenced/inline code, markdown URLs.
- Longest-name-wins regex (multi-token slug beats single-token prefix), 4-char min, word-boundary both sides.
- Advisory only — every candidate needs operator review (bare-name matches CAN be coincidental).

## Why misattribution happened (R12 fail-loud)
Peer slot alpha committed `[TOKEN-SAVINGS-EXPAND]/U-PSN-E3-DEFER-TELEM` while sierra's `rtk git add` had staged its own files in the shared `H:/prism` tree. Alpha's commit included BOTH its own + sierra's staged files. Sierra's follow-up `rtk git commit -m …` failed on `index.lock`. By the time the lock cleared, the files were already in alpha's commit — sierra's commit message never landed.

Same class as `feedback_token_savings_iter22_misattribution_2026_05_22` and `feedback_psn_shop_wire_misattribution_2026_05_22`. Multi-chat shared-tree commits race for `index.lock` and the loser's staged files get swept into the winner's commit subject.

**Doctrine:** verify commit attribution after every `rtk git commit` in a multi-chat shared-tree run. The fix is the slot-worktree migration (per [[reference_slot_worktree_activation_2026_05_16]]) — once sierra is on `slot/sierra` branch in `H:/prism-slot-sierra`, there's no shared `index.lock` to race for.

## PSN legs connected
Memory vault → Wiki → System Viz graph density. Closes 1 of 6 cyrilXBT-pattern gaps from his 2026-05-22 linking article.

## Closes
`PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS`.
