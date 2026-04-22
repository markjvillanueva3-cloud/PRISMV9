---
name: Multi-Machine Development
description: User develops PRISM on two PCs with portable H: drive. Hook scripts live on H: for portability.
type: user
---

The user develops PRISM across two machines with a portable H: drive that moves between them.

## Machines
- **Home PC**: `wompu` (Windows 11 Home) — username `wompu`
- **Work PC**: `DIGITALSTORM-PC` (Windows 11 Home) — username `Admin.DIGITALSTORM-PC`
- **Portable Drive**: H: — contains entire PRISM repo

## Hook Portability (fixed 2026-03-30)
- Python enforcement hooks copied to `H:/prism/.claude/hooks/lib/` (portable)
- User-level settings (`~/.claude/settings.json`) on each PC must reference `H:/prism/.claude/hooks/lib/` (not machine-specific paths)
- Python command: use `python` (in PATH), NOT hardcoded executable paths
- Project-level settings (`H:/prism/.claude/settings.json`) already use `H:/prism/` paths — fully portable

**How to apply:** When setting up a new PC, copy `~/.claude/settings.json` and ensure Python hook paths point to `H:/prism/.claude/hooks/lib/` and use bare `python` command. Work PC settings still need this update.
