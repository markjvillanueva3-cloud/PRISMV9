---
name: reference-oscar-sfc-vendor-parity-state
description: Operator's live HSMAdvisor + G-Wizard vendor state — 41,209 PRISM tools + 12 machines applied 2026-05-27. AppData paths + backup originals + the parity exporter engines.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.259Z
aliases: reference_oscar_sfc_vendor_parity_state
---


# SFC vendor-parity live state (operator's HSMAdvisor + G-Wizard)

PRISM exports its tool catalog + machine fleet INTO the operator's two commercial speed-feed apps so their recommendations align with PRISM's.

**Applied 2026-05-27 (round-trip-clean):**
- `C:/Users/wompu/AppData/Roaming/HSMAdvisor/user_tool_lib.tooldb2.xml` — 41,209 PRISM tools (.NET XmlSerializer compatible; .bak-2026-05-27T02-58-25-176Z = TRUE ORIGINAL).
- `C:/Users/wompu/AppData/Roaming/HSMAdvisor/machines.xml` — 12 PRISM machines (ADO.NET DataSet; .bak-2026-05-27T12-28-06).
- `C:/Users/wompu/AppData/Roaming/HSMAdvisor/settings_v2.xml` — operator defaults (read by HSMAdvisorAdapter; BOM-sniff UTF-16-declared/UTF-8-stored fix).
- `C:/Users/wompu/AppData/Roaming/GWizard.*/Local Store/toolcrib.csv` — 41,209 tools (RFC-4180 escaped; .bak original).

**Exporter engines (U-OSC9-15):** `PRISMToolCatalogAggregatorEngine` (24 *-extracted.json → 41,192 dedupe) → `{GWizard,HSMAdvisor}LibraryExporterEngine` + `HSMAdvisorMachineExporterEngine`. Dispatchers: `prism_calc:{gwizard,hsmadvisor}_library_export`, `hsmadvisor_machine_export`.

**Deferred:** `GWizard.db` (11KB SQLite, opaque schema) → U-OSC9-15-GWIZARD-MACHINE-DB. **ALWAYS verify the .bak before re-exporting.** Cross-ref [[reference_oscar_sfc_domain_map_2026_05_27]].
