---
name: dream-review
description: List staged DREAM-RECEIPT-MS0 receipt-bundle artifacts in state/shared/dream-artifacts/, render each artifact's REPORT.md + diff against live state, and gate operator approval before any prism_session:dream_apply. The operator-facing entry point to the Hermes Dreaming v0.1.0 receipt-bundle review workflow (U-DR10).
hermes_layer: governance
mapped_to: U-DR10
date: 2026-05-26
---

# /dream-review — operator review for staged receipt-bundle artifacts

PRISM's Hermes Dreaming v0.1.0 interop (DREAM-RECEIPT-MS0) writes proposed mutations into staged **receipt bundles** at `state/shared/dream-artifacts/<artifact-id>/`. Each bundle has 4 files:

```
manifest.json     — schemaVersion, artifact_id, status, created_by, parent_trace
REPORT.md         — human-readable summary
sources.jsonl     — what got scanned (one Source per line)
proposals.jsonl   — proposed mutations (one Proposal per line)
```

This skill is the operator-facing review loop closing dunik's mistake #4 *"Auto-deploying a consolidation you didn't read"*. **Do not call `prism_session:dream_apply` until you have run through this skill on the artifact in question.**

## Trigger

Invoke with `/dream-review [<artifact-id>]`:
- No arg → list every staged/validated artifact in `state/shared/dream-artifacts/`, surface their REPORT.md headlines + proposal counts, propose which to deep-review next.
- `<artifact-id>` → run the full 6-step review on that one artifact.

## Step-by-step (per artifact)

1. **Status** — `prism_session:dream_status` to confirm the schema version your bundle uses matches the current engine surface. Mismatch → STOP, surface the version drift, do not apply.
2. **Read REPORT** — read `state/shared/dream-artifacts/<id>/REPORT.md` end-to-end. The `## Proposals (N)` + `## Sources (M)` roll-ups tell you what changed and where it came from.
3. **Validate** — `prism_session:dream_validate` with `{bundle: <parsed bundle>}` — returns `{ok, errors[]}`. Any `ok:false` → STOP, surface the errors, do not apply.
4. **Diff against live** — build a `live_content` map by reading the current contents of every `target_path` in the bundle's proposals (use `Read` per target). Then call `prism_session:dream_diff` with `{bundle, live_content}` — returns `{diff: [{proposal_id, target_path, mutation_type, would_change, reason}]}`. Use this to:
   - Drop `would_change: false` no-ops from the approve list (don't waste cycles writing identical content).
   - Inspect each `would_change: true` entry. For high-risk classes (`memory`, `hook`, `engine`), open the target file and confirm the after_content is what you actually want.
5. **Operator decision** — surface the diff verdict to the operator with one of:
   - `APPROVE ALL` — `approve_list: "all"` (every would-change proposal applies)
   - `APPROVE SUBSET` — `approve_list: ["<proposal_id_1>", "<proposal_id_2>", ...]`
   - `DISCARD` — proceed to step 6 with `dream_discard` instead of `dream_apply`
6. **Apply** — `prism_session:dream_apply` with `{bundle, approve_list, backup_root: "state/shared/dream-backups"}` — returns `{plan: {writes, deletes, skipped}}`. The PLAN is pure-fn; the CALLER must then:
   - For each `writes[].backup_target` — read live + write to backup path FIRST (backup must succeed before mutation)
   - For each `writes[]` — write `after_content` to `target_path`
   - For each `deletes[]` — read live + write to backup_target FIRST, then delete `target_path`
   - Anything in `skipped[]` requires no action

   **OR discard:** `prism_session:dream_discard` with `{bundle, archive_root: "state/shared/dream-archive"}` → returns `{bundle (status=discarded), archive_path}`. Move the bundle directory to `archive_path`. No mutation happens.

## Refuse to apply when

- `dream_validate` returned `ok:false`
- `dream_status` capabilities don't include the bundle's schemaVersion
- Bundle creator slot ≠ applier slot AND no `--operator-override` flag from the operator
- Any `would_change: true` proposal targets a peer-claimed file (check `slot-task-claims.json`)
- Backup directory write fails on the first proposal (abort the whole bundle; don't proceed past the failure)

## What this skill is NOT

- Not an auto-applier — every artifact requires explicit operator review per dunik mistake #4
- Not a replacement for the 3-of-3 scrutiny gate — bundles that mutate engine/hook code still need scrutiny after dream_apply lands
- Not a wiki rendering tool — the REPORT.md is plain markdown; render it however you usually do (Read, /system-viz, or operator's editor)

## Surfaces in /system-viz

Bundles render as nodes under `ghost.dream_artifacts` (U-DR09), colour-coded by status: amber=staged/validated, green=applied, grey=discarded, red=failed. Use `/system-viz` to triage the queue visually before drilling into individual artifacts.

## See also

- `state/shared/specs/HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md` — spec
- [[reference_hermes_dreaming_and_webwright_2026_05_26]] — research synthesis
- `mcp-server/src/engines/DreamArtifactBundleEngine.ts` — engine + Bundle schema
- `mcp-server/src/engines/DreamMarkerScannerEngine.ts` — DREAM:-marker source parser (U-DR07)
- Hermes Dreaming v0.1.0 — https://github.com/asimons81/hermes-dreaming (Tony Simons)
