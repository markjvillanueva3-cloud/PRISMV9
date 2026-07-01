# Slot worktree migration status

> Generated: 2026-06-17T20:09:34.183Z
> Audit: `node H:/prism/scripts/slot-worktree-migration-status.mjs` (U-WAVE5c-AUTO)
> See: [[slot-worktree-migration]] wiki for the operator runbook.

## Summary

- **9/26** slots have lane-routing hooks ARMED (branch starts with `slot/`)
- **9** fully migrated (branch + worktree + binding all aligned)
- **0** still drifting on the shared main tree
- **17** unclaimed (no chat owns the slot right now)
- **0** misconfigured (branch field is neither expected)

## Per-slot detail

|   | slot     | status        | hooks   | chat-slots.branch        | worktree | binding |
|---|----------|---------------|---------|--------------------------|----------|---------|
| · | alpha    | unbound       | dormant | (null) | yes | yes |
| ✓ | bravo    | migrated      | ARMED | slot/bravo | yes | yes |
| ✓ | charlie  | migrated      | ARMED | slot/charlie | yes | yes |
| · | delta    | unbound       | dormant | (null) | yes | yes |
| · | echo     | unbound       | dormant | (null) | yes | yes |
| · | foxtrot  | unbound       | dormant | (null) | yes | yes |
| · | golf     | unbound       | dormant | (null) | yes | yes |
| · | hotel    | unbound       | dormant | (null) | yes | yes |
| ✓ | india    | migrated      | ARMED | slot/india | yes | yes |
| · | juliett  | unbound       | dormant | (null) | yes | yes |
| · | kilo     | unbound       | dormant | (null) | yes | yes |
| · | lima     | unbound       | dormant | (null) | yes | yes |
| · | mike     | unbound       | dormant | (null) | yes | yes |
| · | november | unbound       | dormant | (null) | yes | yes |
| ✓ | oscar    | migrated      | ARMED | slot/oscar | yes | yes |
| ✓ | papa     | migrated      | ARMED | slot/papa | yes | yes |
| · | quebec   | unbound       | dormant | (null) | yes | yes |
| ✓ | romeo    | migrated      | ARMED | slot/romeo | yes | yes |
| ✓ | sierra   | migrated      | ARMED | slot/sierra | yes | yes |
| · | tango    | unbound       | dormant | (null) | yes | yes |
| · | uniform  | unbound       | dormant | (null) | yes | yes |
| · | victor   | unbound       | dormant | (null) | yes | yes |
| · | whiskey  | unbound       | dormant | (null) | yes | yes |
| ✓ | xray     | migrated      | ARMED | slot/xray | yes | yes |
| · | yankee   | unbound       | dormant | (null) | yes | yes |
| ✓ | zulu     | migrated      | ARMED | slot/zulu | yes | yes |

## Notes

- **alpha** — no chat-slots.json entry — slot is empty/unclaimed
- **delta** — no chat-slots.json entry — slot is empty/unclaimed
- **echo** — no chat-slots.json entry — slot is empty/unclaimed
- **foxtrot** — no chat-slots.json entry — slot is empty/unclaimed
- **golf** — no chat-slots.json entry — slot is empty/unclaimed
- **hotel** — no chat-slots.json entry — slot is empty/unclaimed
- **juliett** — no chat-slots.json entry — slot is empty/unclaimed
- **kilo** — no chat-slots.json entry — slot is empty/unclaimed
- **lima** — no chat-slots.json entry — slot is empty/unclaimed
- **mike** — no chat-slots.json entry — slot is empty/unclaimed
- **november** — no chat-slots.json entry — slot is empty/unclaimed
- **quebec** — no chat-slots.json entry — slot is empty/unclaimed
- **tango** — no chat-slots.json entry — slot is empty/unclaimed
- **uniform** — no chat-slots.json entry — slot is empty/unclaimed
- **victor** — no chat-slots.json entry — slot is empty/unclaimed
- **whiskey** — no chat-slots.json entry — slot is empty/unclaimed
- **yankee** — no chat-slots.json entry — slot is empty/unclaimed

## Doctrine

This report is **advisory only**. It never mutates chat-slots.json or any
worktree state. To migrate a drifting slot, follow [[slot-worktree-migration]]:

1. `node H:/prism/scripts/slot-worktree-bootstrap.mjs --slots <nato>` (writes the U-WAVE5a binding sidecar)
2. New PowerShell window: `cd H:/prism-slot-<nato>; claude`
3. `slot-bind-enforce` re-pins; the 3 lane-routing hooks arm automatically.
