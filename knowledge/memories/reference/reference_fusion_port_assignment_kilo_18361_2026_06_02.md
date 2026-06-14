---
name: reference_fusion_port_assignment_kilo_18361_2026_06_02
description: "OPERATOR-AUTHORITATIVE Fusion port assignment: kilo=:18361, delta=:18362 (CAD). kilo must drive :18361, NEVER :18362. The resolver's /documents-capability + saved/modified heuristic mis-inferred ownership and wrongly picked :18362 — instance IDENTITY (doc title) > endpoint heuristic."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.122Z
aliases: reference_fusion_port_assignment_kilo_18361_2026_06_02
---


# Fusion port assignment — kilo = :18361, delta = :18362 (CAD) — OPERATOR-CONFIRMED 2026-06-02

**Canonical, operator-authoritative:**
- **:18362 = delta (CAD).** The document open on :18362 "literally says CAD" — it is delta's CAD work. kilo must NEVER drive or close :18362.
- **:18361 = kilo (CAM).** kilo drives :18361 only.

## The mistake this corrects (R12 lesson)
kilo's `fusion-instance-resolver.mjs` / `fusion-claim-instance.mjs` inferred *ownership* from endpoint capability: it picked :18362 because it answered `/documents` (the PRISM_Fusion_Drive add-in) and reported "0 foreign docs," and it dismissed :18361 as "old-addin (no /documents)." Both inferences were wrong for OWNERSHIP:
1. Which add-in is loaded on a port ≠ which slot owns that Fusion window. The operator assigns windows; the add-in loaded can lag.
2. The "0 foreign docs" was a false-negative — the resolver's foreign = `not-PRISM-scratch AND (saved OR modified)` heuristic missed delta's CAD doc on :18362 (e.g. unsaved-unmodified default-titled, or a title the heuristic didn't read).

**Rule:** instance OWNERSHIP comes from the operator assignment (or the document TITLE naming a CAD part), NOT from `/documents` capability or saved/modified flags. kilo's port is operator-pinned to **:18361** via `PRISM_FUSION_KILO_PORT` (default in `fusion-claim-instance.mjs`); the auto-detect is advisory only and must never override the pin.

## Artifacts corrected (this session)
- `state/shared/cam-drive/fusion-kilo-claim.json` → claimedPort 18361 (was wrongly 18362).
- `state/shared/cam-drive/FUSION-INSTANCE-COORDINATION.md` → kilo=:18361, delta=:18362(CAD).
- `scripts/fusion-claim-instance.mjs` → `PRISM_FUSION_KILO_PORT` operator-pin (default 18361); pinned port wins over auto-detect; :18362 excluded as delta-owned.

Supersedes the kilo=:18362 claim in [[reference_cam_fusion_live_path_unblocked_2026_06_02]] (that commit `d1914afb96` picked :18362 via the buggy auto-detect; the port is now corrected to :18361). The live-drive readiness (endpoint #3 etc.) is unchanged — only the PORT is corrected. NOTE: if :18361 currently runs the old add-in (no /documents), the operator loads PRISM_Fusion_Drive there before kilo can drive CAM.
