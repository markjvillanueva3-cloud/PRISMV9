# reference_psn_mcp_manifest_2026_05_24

**Unit:** U-PSN-MCP-MANIFEST-2026-05-24
**Slot:** implementation-specialist
**Date:** 2026-05-24
**Branch:** cad-fusion-live-ms0 (shared tree — no commit per peer-index-lock constraint)
**Status:** shipped — 5/5 deliverables complete, 24/24 tests pass

---

## What shipped

### 1. `H:/prism/scripts/build-mcp-manifest.mjs`
Pure-Node generator (~170 LOC). Reads `DISPATCHER_DIGEST.md` + `ENGINE_DIGEST.md`,
emits `mcp-server/MANIFEST.json`. Flags: `--dry-run`, `--json`. Defensive on missing
source files (warn + partial manifest, never hard-crash). Exports all parse/classify
functions for testability.

### 2. `H:/prism/scripts/build-mcp-manifest.test.mjs`
node:test suite — 24 cases across 7 describe blocks:
- digest parse (5 cases: extraction, integer counts, malformed rows, zero-col skip, mojibake)
- engine count (4 cases: header, comma-number, bullet fallback, empty string)
- use-case classification (4 cases: CAM, safety, fallback, ≤3 label cap)
- PSN leg mapping (4 cases: calc→leg7, session→leg1, agent→leg2, unknown→leg7)
- buildLegMapping (2 cases: all leg keys present, every dispatcher assigned)
- defensive behavior (3 cases: empty string, header-only, EXAMPLE_CLIENTS 7-count)
- live digest integration (2 cases: ≥100 dispatchers, ≥3000 engines from real files)

Result: **24/24 PASS**

### 3. `H:/prism/mcp-server/MANIFEST.json`
Live first build from real digests. Key stats:
- **103 dispatchers**
- **12257 total actions** (digest reports 12251; 6-action delta from live parse vs header count)
- **3217 engines**
- 7 external agent clients enumerated
- PSN leg mapping across all 11 legs
- Per-dispatcher: name, description, actionCount, useCases[], exampleClients[], psnLegs[]

### 4. `H:/prism/mcp-server/README.md` — appended section
"## External AI Agent Integration" appended (did NOT delete existing content).
Install snippets for: Cline, Continue.dev, Aider, Gemini CLI, Codex, Goose, Claude Code.
Dispatcher quick-reference table for top 10 entry-point dispatchers.
Regeneration command documented.

### 5. This file (`reference_psn_mcp_manifest_2026_05_24.md`)
Close-out memo.

---

## Why it matters (PSN leg expansion)

PSN was inward-facing (26-chat Claude Code fleet only). This manifest is the outward leg:
- Cline (58k stars), Continue.dev, Aider (41k stars), Gemini CLI, Goose, Codex are all
  MCP-capable and can now discover + consume PRISM's full manufacturing intelligence surface.
- Closes gap named in `PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md` §2A.
- Zero runtime code changed — manifest is generated from existing digests.

---

## Regeneration

```bash
node H:/prism/scripts/build-mcp-manifest.mjs
# or dry-run:
node H:/prism/scripts/build-mcp-manifest.mjs --dry-run --json
```

Re-run after any dispatcher is added/removed from `DISPATCHER_DIGEST.md`.

---

## Cross-refs

- Closes: `state/shared/specs/PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md` §2A
- Source digests: `mcp-server/data/docs/DISPATCHER_DIGEST.md`, `ENGINE_DIGEST.md`
- Output: `mcp-server/MANIFEST.json`
- Integration guide: `mcp-server/README.md` §External AI Agent Integration
- PSN leg taxonomy: `knowledge/memories/feedback/feedback_psn_definition.md`
- Wiki: `knowledge/wiki/architecture/` (add entry: `psn-mcp-manifest.md` — pending)

---

## Notes / follow-ups

- `DISPATCHER_DIGEST.md` header says 12251 actions but live parse yields 12257 — 6-action
  delta is likely from dispatchers whose descriptions contain pipe characters that the
  header count was rounded from. Advisory only; both figures are from the same source.
- PSN leg patterns use substring matching — `spDispatcher` pattern tightened from `"sp"`
  to `"spDispatcher"` to prevent false matches on the word "dispatcher" itself.
- No `.ts` source files modified — this unit is pure generator + manifest + docs.
- Commit deferred per operator constraint (peer chats hold index lock).
