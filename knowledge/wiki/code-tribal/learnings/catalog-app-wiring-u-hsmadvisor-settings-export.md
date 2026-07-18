# CATALOG-APP-WIRING/U-HSMADVISOR-SETTINGS-EXPORT — [MAIN] [CATALOG-APP-WIRING]/U-HSMADVISOR-SETTINGS-EXPORT (slot:romeo): PRISM tool -> HSMAdvisor settings_v2.xml write-back exporter

**Commit:** `658c8280fe24` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T08:49:49-05:00
**Tags:** catalog-app-wiring, u-hsmadvisor-settings-export, auto-distilled

## Subject
[MAIN] [CATALOG-APP-WIRING]/U-HSMADVISOR-SETTINGS-EXPORT (slot:romeo): PRISM tool -> HSMAdvisor settings_v2.xml write-back exporter

## Body
```
[MAIN] [CATALOG-APP-WIRING]/U-HSMADVISOR-SETTINGS-EXPORT (slot:romeo): PRISM tool -> HSMAdvisor settings_v2.xml write-back exporter

Closes the HSMAdvisor read-only gap symmetrically with G-Wizard. HSMAdvisorAdapterEngine could READ settings_v2.xml; nothing wrote a PRISM tool INTO it. New HSMAdvisorSettingsExportEngine (sibling to the read adapter). SCOPE (honest): settings_v2.xml is the operator's CURRENT-SELECTION state (single <Tool>), NOT a bulk library — HSMAdvisor's library is a separate format PRISM has no reader for, so a bulk export could not be round-trip-verified (romeo refuses unverifiable wiring). This pushes ONE PRISM tool into HSMAdvisor's <Tool>/<Settings> state. Safety: emits INCH (HSMAdvisor-native), converting mm->inch (/25.4); the round-trip test reads back with convert_to_mm=true (x25.4) and asserts mm is recovered — proving the 25.4x conversion direction (units-first as a test). Deterministic SHA-1 GUID; material/coating enum ids left 0 + warned (no clean PRISM->HSMAdvisor mapping); XML-entity escaping; non-destructive staging-path default (live settings write opt-in via out_path). Wired prism_calc:hsmadvisor_export_settings (no out_path -> returns XML; out_path -> writes file). 9/9 round-trip tests through real hsmAdvisorAdapterEngine.parseXml.
```

## Files touched (3)
- mcp-server/src/__tests__/toolMaterialSpeedFactor.test.ts | 14 ++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts        |  9 +++++++--
- 2 files changed, 21 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 658c8280fe24`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._