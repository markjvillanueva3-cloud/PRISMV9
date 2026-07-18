---
name: feedback_galaxy_dirs_are_doctrine_only
description: PRISM galaxy dirs hold only CLAUDE/MEMORY/PATHS/TOOLBELT.md -- engines live FLAT; attribute by name, not by subdir
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.427Z
aliases: feedback_galaxy_dirs_are_doctrine_only
---


PRISM `mcp-server/src/engines/<galaxy>/` directories are **doctrine-only** -- they contain just `CLAUDE.md`, `MEMORY.md`, `PATHS.md`, `TOOLBELT.md`. The ~3,800 actual engine `.ts` files all live **FLAT** in `mcp-server/src/engines/*.ts`, NOT inside the galaxy subdirs.

**Why:** any audit/tool that tries to count or list "engines belonging to galaxy X" by reading `engines/<galaxy>/*.ts` gets **0 for every galaxy** -- including ai-training, the AI galaxy. This is a silent measurement bug that LOOKS plausible (the dirs exist, the read succeeds) but is wrong (verified 2026-06-10: `ls engines/ai-training/*.ts` = 0; `ls engines/*.ts` = 3,799).

**How to apply:** to attribute a flat engine to a galaxy, match the engine's normalized FIRST TOKEN (camelCase-split) against a galaxy alias map (`LatheLoRAEngine`->lathe, `CAMLoRAEngine`->cam, `QuotingDeepReasoningBridgeEngine`->quoting), gated to the known-galaxy set so non-galaxy `eng.SomeEngine` nodes don't false-match. Fleet-wide AI engines with no domain prefix (`CrossProcess*`, `Federated*`) attribute to ai-training. Expect ~30% to be legitimately unattributed (no domain prefix) -- surface that count, don't hide it.

Pairs with the cross-substrate dual-node-id lesson: a galaxy is referenced in the system-viz graph as BOTH `eng.<g>` and `ghost.galaxy.<g>` -- resolve both. See [[reference_ai_synergy_audit_ms0_2026_06_10]].
