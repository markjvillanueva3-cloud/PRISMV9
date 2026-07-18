---
session: claude-0e5669d2
topic: oscar-sfc-9axis-ms0
slot: sierra
written_at: 2026-06-09T15:47:27.764Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-0e5669d2
status: active
---

# HANDOFF: claude-0e5669d2
Updated: 2026-06-09T15:47:27.764Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-0e5669d2

## STATE
Galaxy mapping to resources VERIFIED live (241 PDFs resolve, worklist exists, 5 vendor .ts built). 4 per-file gates PASS this window (toolmat/coolant/rigidity-Vc/alts-factor). Calibration source = MANUFACTURER_CATALOGS (Sandvik/Kennametal pending extraction). Ollama PDF-extraction is the right lever (my earlier no-PDF finding was wrong, operator-corrected).

## RESUME
CORRECTION (operator-confirmed): vendor PDFs ARE in H:/PRISM/resources/MANUFACTURER_CATALOGS (241 pulled + more — Sandvik GC Milling/Turning/Drilling, Kennametal Master Vol1/2, Guhring, Korloy, MA Ford, Accupro, BIG DAISHOWA). My earlier 'no vendor PDFs' recon was a narrow-pattern miss. Galaxy speed-feed IS mapped (verified): PATHS.md has critical-resource-roots block + vendor-catalog-corpus block (lines 104-113) pointing at the catalogs + worklist state/shared/quoting/catalog-sfc-extraction-manifest.json. 5 per-vendor S/F .ts already built (guhring-iscar/helical/osg/manufacturer/new-manufacturer); SANDVIK + KENNAMETAL NOT yet extracted (the authoritative ones for finding-1 calibration). TOP NEXT ACTION (operator-steered): Ollama PDF-extract Sandvik GC + Kennametal Master S/F tables -> mcp-server/src/data/sandvik-speed-feed-data.ts + kennametal-speed-feed-data.ts (cite source page, NEVER inline physics constants; ingest via ToolCatalogEngine.addTools()) -> calibrate base CUTTING_PARAMS in UltimateSpeedFeedEngine (PRISM under-speeds published ~25%, -53% on 6061 Al = finding 1) -> physics-reviewer + S(x) gate (raising Vc is unsafe-leaning) -> re-run sfc-baseline-compare-run.ts. This is the Ollama efficiency lever (offload 6% vs 30% target). Use lima pypdf extractor + qwen2.5-coder:32b on Blackwell. STILL OPEN: U-OSC-MRR-RECONCILE (P2 from alts fix), U-OSC-RIGIDITY-DOC, remaining axes (holder/spindle/controller/workholding/insert), G-Wizard live toolcrib. UNITS: catalogs are INCH/SFM -> convert SFM*0.3048=Vc m/min.

## CONTEXT

