# PPG Deep Audit — Agent 3: Frontend

## Pages (table)

| Page | File | Route | Purpose | Status |
|------|------|-------|---------|--------|
| PPG (Post Processor Gen) | PpgPage.tsx | `/ppg-lite` | G-code editor, controller selection, template browser, validation | ✅ Live |
| Lathe Print-to-Program | LathePrintToProgramPage.tsx | (not yet routed) | PDF/image→G-code pipeline for lathe, 7-stage workflow | ✅ Exists |
| Milling Upload | MillingUploadPage.tsx | `/milling/upload` | Photo/CAD/STL/PDF intake, routes to wizard | ✅ Live |
| Wire EDM Upload | WireEdmUploadPage.tsx | `/wire-edm/upload` | OCR & geometry parsing for EDM intake | ✅ Live |
| Print Drop | PrintDropPage.tsx | (inferred) | OCR-driven machine type classification, print analyzer | ✅ Exists |
| Lathe Upload | LatheUploadPage.tsx | `/lathe/upload` | Blueprint upload entry for lathe | ✅ Live |
| Milling Results | MillingResultsPage.tsx | `/milling/results` | Tabs: summary, toolpath, setup, G-code; cost/time metrics | ✅ Live |
| Lathe Results | LatheResultsPage.tsx | `/lathe/results` | Backplot, safety checks, setup instructions, AI panel | ✅ Live |

## Drawing Viewer / GD&T overlay

**Finding:** No dedicated drawing viewer or GD&T overlay components found.

- **Viewer3D.tsx** (7 viewer components): 3D mesh visualization with orbit controls, grid, axes, camera presets — for **toolpath** visualization, NOT drawing/GD&T.
- **HeatmapOverlay.tsx, ToolpathLayer.tsx, StockMesh.tsx**: All CAM-focused; no PDF or blueprint rendering.
- **No GD&T component exists** in codebase; dimension/tolerance display is text-only (title block data in PrintDropPage).

**Gap:** PPG lacks integrated PDF preview + GD&T annotation layer. Users see extracted text data but cannot visually overlay dimensions/tolerances on drawing.

## Per-flagship vs unified

**Architecture:** **Flagship-specific, not unified.**

- **Lathe**: LathePrintToProgramPage (custom 7-stage pipeline) → LatheUploadPage → LatheWizardPage → LatheResultsPage
- **Milling**: MillingUploadPage → MillingWizardPage → MillingResultsPage
- **Wire EDM**: WireEdmUploadPage → WireEdmWizardPage → WireEdmResultsPage
- **Print Routing**: PrintDropPage classifies machine type via OCR + feature inference (entry point for auto-routing)

**PPG itself** (PpgPage) is **unified but post-process only** — G-code editing/validation across all controllers. Does NOT handle print intake.

**Component Inventory:**
- 21 PPG-specific components (editor, previews, validators, AI panel)
- 7 upload/results pages across flagships
- 1 shared ResultsPageLayout component

## Strengths / Gaps

### Strengths
1. **Clear pipeline stages**: Upload → Wizard → Results with consistent tab structures
2. **PPG unified for editing**: One G-code editor serves all controllers (Fanuc, Okuma OSP, generic ISO)
3. **Lathe P2P pipeline**: Full 7-stage workflow (ingesting → recognizing → planning → generating → verifying)
4. **AI integration**: AIIntelligencePanel in PPG + LatheAIPanel in results
5. **Machine type auto-routing**: PrintDropPage uses OCR + CAD inference for intelligent dispatch

### Critical Gaps
1. **No drawing viewer** in PPG frontend — operators must reference external documents
2. **No GD&T overlay** — dimensions/tolerances extracted to text only; no visual annotation
3. **PPG not integrated with upload pages** — no path from Print → PPG (editor only reaches post-process stage)
4. **Lathe P2P not routed** — LathePrintToProgramPage exists but has no active route in App.tsx
5. **No feature recognition panel** — results pages show tool/operation summary but lack visual feature highlights
6. **Print preview fragmented** — PrintDropPage handles classification; viewers are 3D-only

## Score (0-100)

**62/100**

- **Upload pipeline**: 85/100 (all flagships covered, file classification working)
- **PPG editor**: 78/100 (rich editor, validation, AI; but isolated from intake)
- **Drawing viewer**: 20/100 (missing PDF viewer, GD&T overlay)
- **Feature recognition UI**: 45/100 (extracted text only; no visual panel)
- **Process plan visualization**: 60/100 (toolpath 3D + backplot exist; no Gantt/timeline)
- **Per-flagship consistency**: 70/100 (similar flow; Lathe P2P incomplete)

**Next milestone:** Wire drawing viewer + GD&T overlay into PPG, integrate Print→PPG handoff, activate LathePrintToProgramPage route.

