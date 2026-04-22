---
name: Path Migration C-drive to H-drive Complete
description: All PRISM paths migrated from C:\PRISM to H:\prism (2026-03-30). Hooks, constants, engines, configs, claude_desktop_config all updated.
type: project
---

## Path Migration: C:\PRISM → H:\prism (2026-03-30, updated same day)

The PRISM project moved from C: drive (laptop clone) to H: portable SSD. All hardcoded paths updated:

### Phase 1 (Initial — engine/dispatcher/constants):
- `H:/prism/mcp-server/src/constants.ts` — PATHS object (50+ entries)
- `H:/prism/mcp-server/src/engines/*.ts` — 24 engine files
- `H:/prism/mcp-server/src/tools/dispatchers/*.ts` — dispatcher files
- ESM fix: `__dirname` → `import.meta.dirname` across 32 files

### Phase 2 (Portability audit — hooks/configs/scripts):
- `review-gate.sh`, `review-complete.sh` — C:/PRISM/state → H:/prism/state
- `error-recovery.sh` — C:\\PRISM\\mcp-server → H:\\prism\\mcp-server
- `compaction-survival.sh` — removed hardcoded plan path, C:\PRISM → H:\prism
- `pre-compact.sh` — DIGITALSTORM-PC memory paths → $HOME-based dynamic lookup, C:\\PRISM → H:\\prism
- `sync-memory.sh` — all Admin.DIGITALSTORM-PC paths → $HOME-based dynamic lookup
- `search-optimizer.sh` — added H: drive variants to broad search check
- `settings.local.json` — removed Mark Villanueva desktop shortcut permissions
- `constants.ts` PYTHON fallback — removed DIGITALSTORM-PC path, now uses `"python"` (PATH lookup)
- `claude_desktop_config.json` (USER_PROFILE backup) — C:/PRISM → H:/prism, removed API key
- `.compaction-survival.md` — removed stale user-specific plan path

### Remaining known H:/prism hardcodes (acceptable — drive letter is the portable constant):
- `SystemVariabilityIndexEngine.ts` — 26 path constants (use H:/prism/state/shared/)
- `CpsPostParserEngine.ts`, `boxDataActionSchemas.ts`, `camDispatcher.ts` — BOX folder defaults
- `PATH_CONFIG.json` — all entries use H:\prism (correct for portable drive)
- Various engine files with H:/prism defaults for data paths

**Why:** Drive was cloned from laptop where C:\PRISM was the live path. All C: references were stale clone artifacts.

**How to apply:** If paths break, check `constants.ts` PATHS object and hook scripts. Use `import.meta.dirname` not `__dirname` in new .ts files. H: is the correct drive letter for the portable SSD.
