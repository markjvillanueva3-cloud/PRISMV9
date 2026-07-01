# Orphan .ts-N backup quarantine — 2026-06-15 (slot:tango, DISCOVERY-EFFICIENCY)

5 untracked `.ts-N` backup files were sitting in `mcp-server/src/engines/`, scanned
by every rg/grep/glob/tsc-glob in the tree (652 KB of dead bytes on every search)
and polluting the unwired-engine consumer-fan-in signal with false barrel re-exports.

All 5 verified: (a) UNTRACKED by git, (b) not imported by any real module (the lone
`index.ts-1` mention is a documentation comment in businessDispatcher.ts, not an import).

Quarantined (moved, NOT deleted — reversible per never-delete-only-disable):

| original path | size | mtime |
|---|---|---|
| mcp-server/src/engines/index.ts-1 | 252 KB | 2026-04-13 |
| mcp-server/src/engines/index.ts-2 | 319 KB | 2026-04-15 |
| mcp-server/src/engines/KnowledgeIngestionOrchestratorEngine.ts-1 | - | - |
| mcp-server/src/engines/QuoteAnalyticsEngine.ts-1 | - | - |
| mcp-server/src/engines/TimeClockEngine.ts-1 | - | - |

## Restore (if ever needed)
```bash
cd H:/prism/state/shared/_orphan-quarantine/2026-06-15-ts-n-backups
for f in *.ts-*; do cp "$f" "H:/prism/mcp-server/src/engines/$f"; done
```
