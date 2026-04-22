# PRISM Shared Index Surfaces

Generated: 2026-03-27T23:52:50.392Z

## Purpose

These are the canonical index and digest surfaces both Claude and Codex should prefer before broad repo sweeps when they need orientation, navigation, or low-token discovery.

## Preferred Order

1. Shared directives, handoff, and current position
2. Compact/system indexes and digests
3. Targeted file reads
4. Broad search only when the indexed surfaces are insufficient

## Indexed Surfaces

- `master_index_compact` [inventory] priority 1 — present — `C:\PRISM\mcp-server\data\docs\MASTER_INDEX_COMPACT.md`
  Fast compact system inventory for broad PRISM orientation before deep repo search.
- `master_index` [inventory] priority 2 — present — `C:\PRISM\mcp-server\data\docs\MASTER_INDEX.md`
  Expanded master system inventory when the compact version is insufficient.
- `directory_digest` [navigation] priority 1 — present — `C:\PRISM\mcp-server\data\docs\DIRECTORY_DIGEST.md`
  Directory-level purpose map for fast navigation without broad filesystem sweeps.
- `path_index` [navigation] priority 2 — present — `C:\PRISM\mcp-server\data\docs\PATH_INDEX.md`
  Path-oriented lookup for locating files and subsystems quickly.
- `code_system_index_json` [code] priority 1 — present — `C:\PRISM\mcp-server\data\docs\CODE_SYSTEM_INDEX.json`
  Machine-readable code shortcode and location index for low-token code lookup.
- `code_system_index_md` [code] priority 2 — present — `C:\PRISM\mcp-server\data\docs\CODE_SYSTEM_INDEX.md`
  Human-readable companion to the code system index.
- `engine_digest` [code] priority 1 — present — `C:\PRISM\mcp-server\data\docs\ENGINE_DIGEST.md`
  Engine inventory with short descriptions for engine discovery before file greps.
- `dispatcher_digest` [code] priority 1 — present — `C:\PRISM\mcp-server\data\docs\DISPATCHER_DIGEST.md`
  Dispatcher inventory with action counts for fast tool/action orientation.
- `script_index` [code] priority 2 — present — `C:\PRISM\mcp-server\data\docs\SCRIPT_INDEX.json`
  Machine-readable script index for locating automation and maintenance scripts.
- `roadmap_index` [roadmap] priority 1 — present — `C:\PRISM\mcp-server\data\roadmap-index.json`
  Canonical roadmap envelope index and milestone lookup surface.
- `roadmap_section_index` [roadmap] priority 2 — present — `C:\PRISM\mcp-server\data\docs\roadmap\ROADMAP_SECTION_INDEX.md`
  Section-level roadmap navigation before scanning full roadmap docs.

## Summary

- Present: 11
- Missing: 0

