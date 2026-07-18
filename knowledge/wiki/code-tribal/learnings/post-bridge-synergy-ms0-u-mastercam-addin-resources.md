# POST-BRIDGE-SYNERGY-MS0/U-MASTERCAM-ADDIN-RESOURCES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-MASTERCAM-ADDIN-RESOURCES (slot:echo /loop iter33 /yolo): Mastercam add-in resource-manifest substrate.

**Commit:** `703f066fad22` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:27:29-05:00
**Tags:** post-bridge-synergy-ms0, u-mastercam-addin-resources, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-MASTERCAM-ADDIN-RESOURCES (slot:echo /loop iter33 /yolo): Mastercam add-in resource-manifest substrate.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-MASTERCAM-ADDIN-RESOURCES (slot:echo /loop iter33 /yolo): Mastercam add-in resource-manifest substrate.

The Mastercam add-in surfaces PRISM intelligence inside Mastercam itself
(post processors, tool library, material library, holder library, machine
profiles, sample programs, dialect-translation tables). The add-in must NOT
embed PRISM logic — it pulls a *resource manifest* describing what's
available, what version, and where to fetch it. This keeps the add-in thin
(UI only) while PRISM owns truth + versioning.

This iter ships scripts/lib/mastercam-addin-resource-manifest.mjs — the
manifest substrate:
  - RESOURCE_CATEGORIES (7-entry whitelist: post_processor, tool, material,
    holder, machine_profile, sample_program, dialect_map)
  - REQUIRED_MANIFEST_FIELDS + REQUIRED_RESOURCE_FIELDS schema definitions
  - MASTERCAM_DIALECT_MAP seed lookup: 13 work-offsets (G54..G59.7), M88/M89
    TSC, M8/M9 flood, G81/G82/G83 drill variants, G84 tap, G85 bore, G0/G1/
    G2/G3 motion — pre-resolved so the add-in doesn't re-derive
  - buildResourceCatalog() turns (versioned) PRISM state into a manifest;
    filters resources with missing id/category/name/version; preserves
    optional sha256, sizeBytes, url, tags
  - validateManifest() returns {ok, errors[]} with index-tagged errors
    (resource[0] missing required field: id); refuses schemaVersion or
    addinTarget mismatch — fail loud, never silently load wrong version
  - diffManifests(prev, next) emits {added[], removed[], changed[]} on id+
    version+sha256 — drives the add-in's delta-download path (no full re-pull)
  - summarize() per-category counts for dashboards
  - resolveDialect(op) returns the Mastercam token for a canonical PRISM op

11 exports. 47 concrete-value tests covering: 7 constant invariants
(MANIFEST_SCHEMA_VERSION=1, ADDIN_TARGET='mastercam', 13 work-offsets,
M88/G83/G84 dialect tokens), 13 buildResourceCatalog cases (filtering,
optional-field preservation, dialectMap embedding), 8 validateManifest fault
cases (null, schema mismatch, target mismatch, missing required, invalid
category), 6 diffManifests cases (identity, add/remove/change, sha256-only
change, null-prev), 5 summarize cases (per-category counting + null guard),
7 resolveDialect lookups + 3 invalid-input guards.

Bridge enabler: this manifest is the contract the add-in reads. Companion
units U-HYPERMILL-ADDIN-RESOURCES (iter34) + U-INVENTOR-ADDIN-RESOURCES
(iter35) follow the same pattern with target-specific dialect maps.
U-BRIDGE-CONTRACT-VERIFY (iter36) then proves cross-target parity (any
resource in one manifest can be located + diffed in the others).

Anti-pattern guards: rejects null/missing prismVersion → null; rejects
manifests with schemaVersion≠1 (no silent forward-compat); rejects manifests
with wrong addinTarget (no cross-bridge accidental ingestion); resource
tags arrays filtered to strings only.
```

## Files touched (3)
- scripts/lib/mastercam-addin-resource-manifest.mjs  | 192 +++++++++++++
- .../lib/mastercam-addin-resource-manifest.test.mjs | 302 +++++++++++++++++++++
- 2 files changed, 494 insertions(+)

## Lessons surfaced in commit body
- wrong version
- wrong addinTarget (no cross-bridge accidental ingestion); resource

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 703f066fad22`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._