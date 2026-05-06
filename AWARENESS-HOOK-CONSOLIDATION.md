# AWARENESS-HOOK-CONSOLIDATION — Intel-Ollama-Obsidian P10-U01

Generated: 2026-05-06T19:13:02.634Z

## Summary

- **Total awareness hooks discovered:** 11
- **Keep (canonical):** 3
- **Archive (redundant):** 7
- **Unknown:** 1

## Canonical (KEEP — wire in settings.json)

- `awareness-bootstrap.mjs`
- `awareness-snapshot.mjs`
- `prism-awareness-cache.mjs`

## Redundant (ARCHIVE — move to .deprecated/, do NOT delete)

- `ai-command-awareness.mjs`
- `cross-session-awareness.mjs`
- `multi-computer-awareness.mjs`
- `multi-session-awareness.mjs`
- `prism-awareness-v2.mjs`
- `self-awareness-enforce.mjs`
- `working-set-awareness.mjs`

## Unknown (REVIEW before action)

- `stop_on_awareness_degraded.mjs`

## How to apply

This audit is **non-destructive**. To apply the migration:

1. Verify peer chats aren't actively editing canonical hooks
2. Back up `H:/prism/.claude/hooks/` before any move
3. For each entry under "Redundant" above:
   - `mv H:/prism/.claude/hooks/<name> H:/prism/.claude/hooks/.deprecated/<name>`
4. Edit `H:/.claude/settings.json` so SessionStart wires only the
   3 canonical hooks (awareness-snapshot, awareness-bootstrap,
   prism-awareness-cache)
5. Document the change in `MEMORY.md` per spec exit_condition

Re-run `node scripts/awareness-hook-audit.mjs --write` to refresh
this report after applying.
