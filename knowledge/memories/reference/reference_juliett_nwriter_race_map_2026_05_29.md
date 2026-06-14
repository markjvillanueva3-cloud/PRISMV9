---
name: reference_juliett_nwriter_race_map_2026_05_29
description: Map of PRISM state paths with multiple writers (the N-writer-race bug class) and their fix status
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.175Z
aliases: reference_juliett_nwriter_race_map_2026_05_29
---


**N-writer race map (juliett, as-of 2026-05-29).** A single state path written by >1 chat/process without an advisory lock or single-canonical-writer is the recurring corruption class. Fix = `atomicWriteJson` + a designated canonical writer.

| Path | Writers | Status |
|------|---------|--------|
| `mcp-server/data/roadmap-index.json` | 5 (3 non-atomic) | the canonical case (DEV-TOOL-CONFLICT-AUDIT F4) — still partial |
| `state/shared/system-viz/system-graph.json` | 3 | regen-viz canonical-writer + abort-on-shrink guard added |
| `mcp-server/data/state/error-memory.json` | latent (orphan hooks) | not yet wired → latent race |
| `mcp-server/data/state/skill-usage-stats.json` | latent (orphan hooks) | not yet wired → latent race |
| `state/shared/tribal-embed-index.json` | regen (should be 1) | leaks tmp orphans → likely overlapping invocations |

**Pre-mortem:** before adding any writer to an existing path, `grep -rn '<filename>' mcp-server/src scripts .claude/hooks` to count existing writers. If >1, you need a lock or to BE the canonical writer — not a 2nd uncoordinated `writeFileSync`. See [[feedback_juliett_atomic_write_discipline]].
