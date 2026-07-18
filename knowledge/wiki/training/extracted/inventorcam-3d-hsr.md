---
type: extracted-book
source_book: "InventorCAM 2024 3D HSR User Guide"
author: "SolidCAM (Autodesk OEM)"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter78"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_3D_HSR_User_Guide.pdf"
extraction_focus: "InventorCAM 2024 3D HSR — roughing counterpart to 3D HSM finishing; 4 strategies (Roughing / Rest Roughing / Plunge / Adaptive), Stock Model load-bearing, trochoidal + dynamic entries, HFM regime (light DOC + 20× feed), chip thinning compensation, toolpath smoothing, HSR→HSM handoff checklist"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/inventorcam-3d-hsr-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_78_tips: 265
audience_slots: ["delta", "kilo", "alpha", "india", "bravo"]
---

# InventorCAM 2024 3D HSR User Guide — extraction

> Thirtieth pass overall (iter78). 3D HSR is the **roughing counterpart** to iter76's 3D HSM finishing. Together they form the full HSR→HSM→SWARF/Pencil 3-pass mold/die workflow. InventorCAM module coverage now **6 modules**.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| hsr24-001 | HSR/HSM pairing — same gouge-free core, HSR = bulk MRR, HSM = surface | CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + ToolDeflection + MillChipEvacuationPredictor + GCodeTimeEstimator |
| hsr24-002 | 4 first-class strategies (Roughing / Rest Roughing / Plunge / Adaptive) | CamStrategySelect + MillExpertAdvisor + AdaptiveFeedrate + HyperMillStrategy + CADFeatureRecognize + ToolDeflection |
| hsr24-003 | Stock Model is load-bearing — Rest Roughing degrades silently without it | CamStrategySelect + CADGeometry + CADFeatureRecognize + CollisionDetection + MillExpertAdvisor + GCodeTimeEstimator |
| hsr24-004 | Trochoidal + dynamic entries — full-slot cutting without tool breakage | CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + ToolDeflection + ChatterStabilityLobe + MillChipEvacuationPredictor |
| hsr24-005 | High-feed milling (HFM) — light DOC + 1.5-3mm feed/tooth (20× feed) | CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + ToolDeflection + KienzleForceModel + ChatterStabilityLobe + GCodeTimeEstimator |
| hsr24-006 | Chip thinning compensation — F = F_nom · sqrt(D/(2·ae)) at ae/D<0.3 | AdaptiveFeedrate + KienzleForceModel + MillExpertAdvisor + ToolWearProgression + ToolDeflection + CamStrategySelect |
| hsr24-007 | Toolpath smoothing — G2/G3 fillets recover 30-70% feed dump at corners | CamStrategySelect + AdaptiveFeedrate + GCodeTimeEstimator + PostProcessor + MachineController + MillExpertAdvisor |
| hsr24-008 | HSR→HSM handoff checklist — Stock Model + Stock-to-Leave + Z-band overlap | CamStrategySelect + CollisionDetection + ToolDeflection + CADGeometry + MillExpertAdvisor + AdaptiveFeedrate + GCodeTimeEstimator |

## High-leverage rules

- **HSR → HSM → SWARF/Pencil is the canonical mold/die workflow** — HSR alone leaves stair-step; HSM alone is starved by raw stock.
- **Rest Roughing without a Stock Model is a silent full-re-rough** — 10-40% cycle savings lost.
- **Trochoidal/Adaptive for slot widths < 1.5× tool dia** — never disable to "save planning time."
- **Enable Chip Thinning Compensation when ae/D < 0.3** — disable for full-slot to avoid over-loading.
- **HFM requires G2/G3 smoothness** — G1-G1 corners dump 30-70% of the feed gain.

## Pipeline status after iter78

- Roost: 111 book pivots, **493 tribal tips** (was 485), 605 total nodes
- NEW BOOK: 116 → 117 books
- Cumulative iter27-78: **265 page-cited tips**
- **Key unlock**: HSR/HSM pair closed — the iter76 3D HSM finishing layer now has its roughing predecessor. Combined with iter77 SWARF (aerospace finish) the InventorCAM stack covers the full 3-pass mold/die + 3-pass aerospace pipelines. 6th first-class InventorCAM module integrated (5-axis Vol-1 / Turning / Multiaxis Drilling / 3D HSM / SWARF / **3D HSR**).

## See also

- [[inventorcam-3d-hsm]] — h3d24 3D HSM finishing counterpart (iter76)
- [[inventorcam-swarf]] — swf24 SWARF aerospace finish (iter77)
- [[inventorcam-multiaxis-drilling]] — mxd24 multi-axis sibling (iter75)
- [[inventorcam-5axis-vol1]] — ic24 5-axis sim sibling (iter72)
- [[inventorcam-turning-millturn]] — ict24 turning sibling (iter73)
- [[mastercam-dynamic-milling]] — dm14 Dynamic Mill (HSR peer)
- [[hypermill-2018]] — hm18-002 Optimised Roughing (HSR peer)
