---
name: feedback-tango-complete-not-clobber
description: before building a galaxy, glob the galaxy dir first — complete an existing scaffold, never overwrite good content
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.446Z
aliases: feedback_tango_complete_not_clobber
---


Alpha (and other lead slots) pre-scaffold partial galaxies for idle slots. Before a slot builds its own galaxy it MUST `Glob mcp-server/src/engines/<galaxy>/` first — the discovery galaxy already had a solid alpha-authored CLAUDE.md + MEMORY.md stub (2026-05-28) that just needed completion (PATHS/TOOLBELT/master-brain-header/memories/wiki/tribal/skill), not a rewrite.

**Why:** clobbering an existing scaffold throws away correct domain content and breaks any cross-refs already pointing at it. The buildout protocol's own VERIFICATION GATE assumes complete-not-recreate.

**How to apply:** glob the galaxy dir FIRST. If CLAUDE.md/MEMORY.md exist, READ them, preserve the accurate parts, and ADD the missing artifacts + the `## Master-brain link` header. Only rewrite a section that is wrong or generic-stub. Sister rule: [[feedback_bravo_complete_not_clobber_galaxy]].
