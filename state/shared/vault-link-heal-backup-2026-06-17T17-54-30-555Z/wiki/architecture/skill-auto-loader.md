---
type: engine
domain: skills
status: wired
wired_to: prism_skill_script
actions: [skill_auto_load, skill_auto_load_clear_cache]
related: [[skill-tier-registry-engine]], [[skill-executor]], [[skill-bundle-engine]]
rescued_from_orphan: 2026-05-13
---

# SkillAutoLoader — pressure-adaptive smart-skill loader

**Engine:** `mcp-server/src/engines/SkillAutoLoader.ts` (455 LOC)
**Dispatcher:** `prism_skill_script` (2 actions, wired 2026-05-13)
**Status:** Built and wired. Previously orphaned (no dispatcher reference); rescued via the standard orphan-rescue recipe per [[reference_skill_tier_wire_pattern]].

## Purpose

Proactively load **relevant skill content** (not just hints) based on task-domain classification. Maps domains to predefined chains and extracts key content sections (formulas, tables, decision points) rather than dumping the full skill text. Pressure-adaptive: full excerpts at low pressure, compact at high.

## Public API (free functions)

| Export | Signature | Purpose |
|---|---|---|
| `autoLoadForTask` | `(callNumber, domain, action, params?) => SkillAutoLoadResult` | The orchestrator. Loads primary skill for action + chain skills for domain, budgeted by current context-pressure %. |
| `getChainForDomain` | `(domain) => ChainRecommendation \| null` | Look up the predefined chain for a domain (e.g. `"safety"` → `"safety-validate"`). |
| `getLoadedExcerptsBlock` | `(result) => string` | Render the result as a markdown-ish text block ready for inject. |
| `clearSkillCache` | `() => void` | Reset the in-memory per-session cache. Admin op. |

## Dispatcher wiring

Two actions exposed on `prism_skill_script`:

### `skill_auto_load`
```json
{
  "action": "skill_auto_load",
  "params": {
    "call_number": 7,
    "domain": "safety",
    "task_action": "check_toolpath_collision",
    "params": { "material": "AL6061" }
  }
}
```
Returns the canonical `SkillAutoLoadResult` plus `excerptsBlock` (the pre-rendered text form). The dispatcher remaps `call_number` ↔ `callNumber` and `task_action` ↔ `taskAction` so both spellings work; schema canonical is snake_case.

### `skill_auto_load_clear_cache`
```json
{ "action": "skill_auto_load_clear_cache", "params": {} }
```
Returns `{success: true, cleared: true}`. Use before a load when you need a guaranteed cache-cold pass.

## Decision logic (in plain English)

1. Read `context_pressure.json` for the current pressure %.
2. If pressure > 85%, bail with a one-line hint — `autoSkillHint` (a separate, lighter system) already handles the high-pressure floor.
3. Otherwise set budgets:
   - `maxPrimaryLines` — `15` at p>70%, `30` at p>50%, `50` baseline
   - `maxChainLines`   — `0` at p>70%, `10` at p>50%, `20` baseline
4. Load PRIMARY skill if the action is in `ACTION_PRIMARY_SKILL` (≈30 entries).
5. Load CHAIN skills (skip primary to avoid duplicate) if the domain is in `DOMAIN_CHAIN_MAP` (12 entries: calculations, materials, tooling, safety, physics, toolpath, alarms, threading, quality, validation, session, optimization).
6. Mark `cached: true` iff every loaded skill came from the in-memory excerpt cache.

## Failure surface

- **Both domain AND action unknown** → empty excerpts, `total_lines_loaded: 0` (verified by wiring test). The dispatcher's `slimResponse` may strip the empty `excerpts` array; callers should branch on `total_lines_loaded`.
- **Skill file missing on disk** → engine silently skips that skill (no excerpt added; no throw).
- **Pressure file missing** → treated as `pressure_pct: 0` (baseline budgets).

## Test coverage

`mcp-server/src/__tests__/skillScriptDispatcher.skill-auto-load-wire.test.ts` — 23 cases:

- Source-grep proofs: both actions registered in dispatcher enum + case-label; lazy-import only (no top-level static); destructured exports verified.
- Schema map registration: both schemas exposed as Zod safeParseable objects.
- Zod boundary: positive (minimal + full payload), negative (missing domain, missing task_action, non-string domain, negative call_number, non-integer call_number, accepts call_number=0). Empty-payload clear_cache accepted + passthrough tolerant.
- In-process round-trip: clear_cache returns `{success:true, cleared:true}`. skill_auto_load returns the documented result shape with `call_number`, `domain`, `excerpts`, `total_lines_loaded`, `hint`, `cached`, `excerptsBlock`. Bad-payload route returns the `dispatcherError` envelope (`{success:false, error, action, dispatcher}`). Known-domain chain load populates ≥1 excerpt.

## Why this was orphaned

Engine landed 2026-02-12 (per `@version 1.0.0`). The intended caller was an early variant of the cadence-executor / `autoSkillHint` plumbing, which evolved into a different shape before this engine was wired. ~3 months of orphan status until the OBSIDIAN-PRISM-OS-MS0 awareness work surfaced it in BUILD_STATE.NEEDS_WIRING.

## Cross-references

- [[reference_skill_tier_wire_pattern]] — the 5-file orphan-rescue recipe applied here (dispatcher enum + case + schema + lazy import + wiring test)
- [[reference_build_state_surface]] — how `NEEDS_WIRING` surfaces engines like this
- [[reference_master_index_surface]] — how the dispatcher actions become discoverable post-rescue
- [[reference_awareness_stack]] — the 6 surfaces that flagged this rescue candidate
