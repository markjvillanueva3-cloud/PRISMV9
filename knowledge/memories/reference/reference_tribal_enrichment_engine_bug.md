---
name: reference-tribal-enrichment-engine-bug
description: "TribalEnrichmentCoordinatorEngine has 2 pre-existing latent type errors (lines 80/99) — wire shipped but engine's filter logic is silently broken because input fields are dropped at runtime; needs a semantic redesign in a follow-up unit"
aliases: reference_tribal_enrichment_engine_bug
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.227Z
---


# TribalEnrichmentCoordinatorEngine — pre-existing engine bugs surfaced by U-ORPHAN-RESCUE-TRIBAL-ENRICH

**Discovered 2026-05-15** during the orphan-rescue wire of this engine into `prism_shop_practice` (commits `244a7c71e` ship + `5f98f8318` fix). Wire itself ships clean (90 vitest passing, 3-of-3 PASS), but `tsc --noEmit` flags 2 errors **in the engine source** that the wire intentionally does NOT fix — they require a semantic redesign of the engine's dependency contracts, not a one-line type fix. Carry-forward to a separate unit.

## The bugs

`mcp-server/src/engines/TribalEnrichmentCoordinatorEngine.ts`:

**Line 80** — `fetchTribalTips` calls `tribalKnowledgeEngine.search({ ..., material: input.material, ... })` but `KnowledgeSearchInput` has no `material` field. Its actual fields (verified against the `shopPracticeDispatcher.handleTribalSearch` call site): `query?, category?, material_iso_group?, operation_type?, min_confidence?, limit?`. The `material` extra property is dropped at runtime, so `search()` returns tips that **aren't actually filtered by the requested material at all**.

**Line 99** — `fetchPlaybookRules` calls `machiningPlaybookEngine.advise({ process, material, depth_of_cut_mm, tool_diameter_mm, thin_wall })` but `PlaybookQuery` has **none** of those fields. Its actual fields: `material_iso?, features?, tolerance_mm?, wall_thickness_mm?, surface_finish_Ra?, batch_size?, machine_axes?, categories?, severity_min?`. The entire input is silently dropped → `advise()` returns the default rule set regardless of caller intent.

## Why the engine still "works" at runtime

Both `fetchTribalTips` and `fetchPlaybookRules` wrap the dependency call in `try/catch { return []; }`. The extra-property drops are silent — they don't throw — so the engine returns SOME tips and SOME rules, just not the ones the caller asked for. That's why all 61 engine tests pass even with these bugs (the tests assert structure + invariants, not "this specific material's tips appear").

## The proper fix (out of scope for the wire)

Three options for `fetchTribalTips`:
1. Drop the `material:` line. Cleanest but loses the material signal entirely.
2. Map `input.material` → `material_iso_group` via a free-text-to-ISO mapping (P/M/K/N/S/H based on substring matches like "steel"→P, "stainless"→M, "aluminum"→N, "titanium"/"inconel"→S, "hardened"→H, "cast iron"→K).
3. Pass `input.material` as `query: input.material` so the search treats it as a free-text query against tip titles/bodies/tags.

(2) is the right answer — it preserves filter fidelity without forcing callers to know the ISO group. Requires a small `materialNameToISOGroup(material: string): string | undefined` helper that the existing `prism_data:material_get` registry likely already exposes.

For `fetchPlaybookRules`, the engine's input must be mapped:
- `process_type` → `categories: [<process>]`? Actually `PlaybookQuery` has no process filter — the playbook applies cross-process. So drop it.
- `material` → `material_iso` (via the same mapper above).
- `thickness_mm` → `wall_thickness_mm` (semantic-ish — "thickness" in EDM/wire is the kerf-perpendicular dimension which IS the wall thickness for thin-wall scenarios).
- `is_thin_wall: true` → set `wall_thickness_mm` to a small constant (e.g. 1mm) so the playbook's thin-wall rules engage.
- `surface_finish_Ra_um` → `surface_finish_Ra` (unit conversion: μm → μm, same).
- `tolerance_mm` → `tolerance_mm` (already matches).
- Drop `depth_of_cut_mm`, `tool_diameter_mm`, `thin_wall` — not in PlaybookQuery.

## Suggested unit name

`U-FIX-TRIBAL-ENRICH-ENGINE-CONTRACTS` (independent of the wire). Estimated effort: 1-2 hours including a `materialNameToISOGroup` helper, ~10 new engine tests asserting material filtering actually works, and a re-run of the existing wire tests (they should still pass — the wire test asserts shape, not content).

## Why "not fixed in the wire commit"

The wire is a 5-file recipe with strict scope ("schema + dispatcher + 2 tests + verify"). Fixing the engine's semantic contracts:
1. Changes observable behavior (filter fidelity goes from broken-but-silent to actually-working).
2. Requires understanding the ISO-group mapping policy, which is its own decision.
3. Needs new engine tests asserting the filter behavior, which is a different test suite than the wire.

R3 (Surgical Changes) + R7 (surface conflicts, don't average them) → carry-forward, not blend with the wire commit.

Related: [[reference_skill_tier_wire_pattern]] · [[feedback_always_close_out]]
