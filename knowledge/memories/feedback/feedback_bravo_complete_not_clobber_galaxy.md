---
name: feedback_bravo_complete_not_clobber_galaxy
description: A galaxy may already be scaffolded (alpha pre-builds it) — glob the dir first and SUPERSET, never rebuild
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.415Z
aliases: feedback_bravo_complete_not_clobber_galaxy
---


Before building a per-slot galaxy, glob `mcp-server/src/engines/<galaxy>/` FIRST.

**Why:** alpha scaffolds many galaxies' CLAUDE.md + MEMORY.md ahead of the owning slot ("Bravo will own this file going forward"). Rebuilding from scratch clobbers alpha's good content (R8 violation) and loses the PSN edges + closed-loop wiring already written.

**How to apply:** If CLAUDE.md/MEMORY.md exist, read them fully, preserve every good section, ADD the missing pieces (master-brain-link header, PATHS, TOOLBELT, corrections), and write the result as a SUPERSET in your slot worktree. A superset beats a clobber on the golf merge. The galaxy was "incomplete, not missing" — that's the common case. See [[reference_bravo_galaxy_buildout_2026_05_28]].
