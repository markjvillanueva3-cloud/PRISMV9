# PRISM PATH_INDEX

Quick reference for all file locations. Use Code System Index (DSL) shortcodes for compact refs.

## Directory Structure

```
mcp-server/
  src/
    engines/          # 857 engines (E0001-E0857)
    tools/dispatchers/ # 58 dispatchers (D01-D58)
    tools/schemas/     # Action schemas
    algorithms/        # 51 algorithms (A01-A51)
    registries/        # 22 registries (RG01-RG22)
    hooks/             # 21 hooks (H01-H21)
    utils/             # 16 utils (U01-U16)
    services/          # 3 services (SV01-SV03)
    data/              # 67 catalogs/data (C01-C67)
    __tests__/         # 530 test files (T0001-T0530)
  data/
    milestones/        # 110 milestone envelopes
    docs/              # 36 documentation files
    *.json             # Config data (roadmap, strategies, tips, etc.)
  web/                 # Web frontend
```

## Key Files

| Purpose | Path |
|---------|------|
| Engine index | `src/engines/index.ts` |
| Dispatcher index | `src/tools/dispatchers/index.ts` |
| Algorithm index | `src/algorithms/index.ts` |
| Registry index | `src/registries/index.ts` |
| MCP server entry | `src/index.ts` |
| Roadmap | `data/roadmap-index.json` |
| Master Index | `data/docs/MASTER_INDEX.md` |
| System Inventory | `data/docs/SYSTEM_INVENTORY.md` |
| Code System Index | `data/docs/CODE_SYSTEM_INDEX.json` |
| Compact DSL ref | `data/docs/DSL_COMPACT.md` |
| Build config | `tsconfig.json` / `vitest.config.ts` |

## Totals

- **1,850** indexed files (Code System Index)
- **857** engines | **58** dispatchers | **51** algorithms
- **530** test files | **22** registries | **67** data/catalog files
- **134** slash commands | **110** milestones | **36** docs

## DSL Shortcode Format

E=Engine, D=Dispatcher, A=Algorithm, S=Schema, H=Hook, U=Util,
RG=Registry, T=Test, C=Catalog, M=Milestone, DOC=Doc, SV=Service, R=Root

Resolve: `CodeSystemIndexEngine.resolve('E0001')` or `/code-index E0001`