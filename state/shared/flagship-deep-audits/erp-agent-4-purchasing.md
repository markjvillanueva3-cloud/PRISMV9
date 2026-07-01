# ERP Audit — Agent 4: Purchasing / MRP

## PO Engines
**PurchaseOrderEngine** (src/engines/PurchaseOrderEngine.ts): Core PO lifecycle engine with full lifecycle support (draft → submitted → approved → partially_received → received → invoiced → paid). Implements receiving workflow (ReceivingRecord), three-way invoice matching (ThreeWayMatch), AP aging, and receive-hooks for ToolUsageEngine auto-restock integration. Line items track category (raw_material, cutting_tool, workholding, consumable, machine_part, service). **Status: PRODUCTION** with solid foundation.

**LathePurchaseOrderAutomationEngine**: Lathe-specific PO automation, extends core engine for turning operations. Automates PO creation from turning jobs.

**Gaps**: No explicit RFQ (Request-for-Quote) engine found; quoting flows through QuoteEngine → QuoteEstimatorEngine → businessDispatcher. Blanket PO and release-against-blanket patterns not detected. Drop-ship workflows absent.

## MRP Logic Status
**InventoryOptimizationEngine**: EOQ, safety stock (z-score service level 80-99.9%), ABC classification, tool reorder point calculations. Uses canonical z-scores from NIST Engineering Statistics. **Status: ACTIVE** but limited scope — no BOM explosion, no net demand calculation, no pegging to jobs.

**No dedicated MRP engine found**. Material Requirements Planning (demand → on-hand → on-order → net demand) not implemented at engine level. Capacity planning exists (CapacityPlanningEngine), but no time-phased MRP logic.

## BOM Engines
**SBOMReviewEngine** (detected): Likely Bill of Materials review but not examined in detail. **AssemblyEngine & AssemblyPlannerEngine** handle assembly logic but BOM structure/explosion not verified. **ComplexPartPlannerEngine** present but scope unknown.

**Gap**: No BOM tree explosion, no multi-level indentation, no scrap factors or yield adjustments detected.

## Vendor Performance
**VendorEngine** (src/engines/VendorEngine.ts): Vendor master data, scorecards, spend analysis. Tracks 8 vendor categories (tooling, material, consumables, equipment, services, office, maintenance). **VendorScorecard** includes on-time %, quality %, price competitiveness, composite score, spend YTD, risk flags. **Status: IMPLEMENTED** with real performance metrics.

**VendorCatalogManifestEngine**: Scans H:/prism/resources/MANUFACTURER_CATALOGS/ for PDF manifests, classifies by manufacturer (Sandvik, Iscar, Kennametal, etc.), tracks extraction state. Drives PDF catalog ingest for vendor tool databases (target: 54K → 90K+ entries). **Status: ACTIVE** — catalog aggregation layer.

**PurchasingDirectoryEngine**: National distributors (MSC, Grainger, McMaster, Travers, KBC, Zoro, Fastenal, MISUMI), specialty suppliers (Carbide Depot, Maritool, Carr Lane), manufacturer direct links (Sandvik, Kennametal, ISCAR, Walter, Seco, etc.). Supports search, categorization, supplier recommendations by priority (price/speed/quality/selection).

## Score: 52/100

**Strengths**:
- PurchaseOrderEngine: Solid receiving/3-way-match/AP aging
- VendorEngine: Scorecard tracking, spend analysis
- InventoryOptimizationEngine: EOQ, safety stock, ABC
- Purchasing Directory: 15+ major distributors + manufacturer links
- Catalog ingest pipeline (PDF extraction)

**Critical Gaps** (−48 points):
- **No RFQ engine**: No supplier quote request automation
- **No MRP logic**: No BOM explosion, net demand, time-phasing
- **No blanket PO / release scheduling**: Only transactional POs
- **No vendor-managed inventory (VMI)**: No consignment logic
- **No backorder management**: No shortage alerts or expediting
- **No receiving inspection workflow**: PO receiving is basic (no QC gating)
- **No invoice-to-PO matching automation**: 3-way match exists but no auto-reconciliation
- **No approved vendor list (AVL)**: Vendor database present but no procurement authorization/compliance layer
- **No drop-ship orchestration**: No pass-through supplier integration
- **No demand forecasting**: Cannot predict future supply needs (depends on MRP)

**Recommendation**: Implement MRP core (BOM.calculateDemand, MRP.netDemand, MRP.scheduleReceipts) before scaling purchasing automation. Current system is **transactional PO processor**, not **demand-driven procurement system**.

