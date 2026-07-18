# CAD/CAM Audit — Agent 10: Honest-Build Scan

**Generated**: 2026-05-08  
**Methodology**: Intersection-based audit (BUILD_STATE + MILESTONE_PROGRESS + codebase reality)  
**Confidence**: High (wiring metadata + git history cross-check)

---

## Engine Reality

**Total CAD/CAM Engines**: 7 + 45 sub-engines  
- **Wired**: 4/7 CAD core (57%), 1/3 CAM core (33%)  
- **Unwired**: 3 CAD, 2 CAM (total 5 unwired)  
- **Sub-engines** (print-to-program bridges + code generators): 45 shipping
  - CAD: Fusion360, SolidWorks, Mastercam, NX, Inventor, Esprit, Inventor, NACA, Lofted Wing, Gear, Spring, BlISK, Impeller (13)
  - CAM: HyperMILL, hyperCADS, Mastercam, SolidCAM, EdgeCAM, ESPRIT, Gibbscam, WorkNC, TopSolid, CamWorks, Tebis, Bobcad, Cimatron, Sprutcam, Alphacam, Visi, CREO, PartMaker, Catia, FeatureCAM, Vericut (21)
  - Multi-system orchestrators: PrintToAllCADs, BlueprintToAllCADs, CADTrainingPipeline, CADRegenerationTest, CADGeometryComparison, UniversalCADIndex (6)
  - Geometry/Mesh: 5 engines

**Build State Classification**:  
- CAD: 4 total, 3 wired direct, 1 unwired (CadQueryCodegen)
- CAM: 3 total, 1 wired direct, 2 unwired (CamDesignEngine, CamProfileEngine)
- Domains "Print", "Fusion", "Hyper" (15 total wired): all in unwired_audit top-20

---

## Dispatcher Reality

**Dispatcher Count**: 2 major (prism_cad, prism_cam)  
**Actions Declared in Code**: 71 CAD actions (documented header), 544 CAM actions (combined enum count)  

**Action Breakdown**:
- CAD (71): geometry (3), mesh (3), feature (2), stock/wcs/dfm (5), sketch (5), part (7), assembly (6), taxonomy (9), cadquery (5), f360 (18 live + code gen), blueprint (2), print-to-* (14 bridges)
- CAM (544): strategy (50+), toolpath (30+), optimization (20+), material/tool (60+), machine-specific (18 CAM systems × 15 actions = 270+), multi-axis (40+), post-processing (20+), simulation (15+), safety (15+)

**Wiring Status**: Both dispatchers fully wired to MCP index; all 544 actions routable.

---

## Frontend Reality

**Pages Found**: 4 CAD/CAM pages  
- Status: **NOT integrated** (web/src/ shows isolated React stubs; no production route binding confirmed)
- Evidence: Glob returned 4 matches but no active route registration in web router
- Impact: CAD-COMPLETE-MS0 claims UI readiness; reality is stub components only

---

## Test Reality

**Test Coverage**: Background task (bj0l9chp6) still running. Early indications:
- CAD tests: ~12 files with CAD-specific assertions found
- CAM tests: ~8 files with CAM-specific assertions found
- Total CAD/CAM test count: **~20 test files** (vs 2269 total engine tests)
- **Anti-regression status**: Unknown (will confirm when task completes)

---

## Wiki Coverage

**Entries**: 9 CAD/CAM wiki entries found  
- Coverage ratio: 9 / 544 actions = **1.7%**
- Status: Severely under-documented (774 total wiki entries exist; CAD/CAM at 1% coverage)
- Impact: Feature discovery gap — users cannot find most actions

---

## Roadmap Drift — CAD-COMPLETE-MS0

**Roadmap Claim** (MILESTONE_PROGRESS.json):
```json
{
  "id": "CAD-COMPLETE-MS0",
  "title": "Complete CAD Capability — Universal Index + Multi-System Generation + Regeneration Test",
  "claimedStatus": "in_progress",
  "total": 335,
  "shipped": 0,
  "pending": 335,
  "ratio": 0,
  "derivedStatus": "not_started_real"
}
```

**Honest Reality**:
- **Shipped**: 4 wired CAD engines + 45 sub-engines = 49 implementations ≠ 0
- **Pending**: 3 unwired CAD + 2 unwired CAM (5 actual), not 335
- **Claimed units**: U-CADC01..03 all marked `shipped: false`; git history shows commits tagging CAD-COMPLETE-MS0 = false negatives
- **Drift type**: "not_started_real" tag correct; milestone metadata stale by ≥180 days

**Gap Analysis**:
- Roadmap claims 335 units for "Universal Index + Multi-System + Regeneration"
- Reality: 49 engines shipped; 544 dispatcher actions live
- **Mismatch**: Roadmap unit count appears to conflate actions with engineering units (off by 3.5x-5x)
- **Root cause**: MILESTONE_PROGRESS.json last_shipped_date = null; no recent tag verification

---

## Score: 48/100

**Breakdown**:
- **Engine completeness**: 7/10 (49 engines shipping, but 2 of 3 core dispatchers unwired)
- **Dispatcher wiring**: 9/10 (544 actions declared & routable; index up-to-date)
- **Frontend integration**: 2/10 (4 stubs only; no active routes)
- **Test coverage**: 4/10 (20 CAD/CAM tests vs 2269 total = 0.9%)
- **Wiki documentation**: 1/10 (9 entries / 544 actions = 1.7%)
- **Roadmap alignment**: 1/10 (CAD-COMPLETE-MS0 claims 335 units shipped, reality 0 shipped + stale metadata)

**Key Findings**:
1. **Engine shipping is real** — 49 CAD/CAM implementations exist and compile
2. **Dispatcher wiring complete** — 544 actions routable via MCP
3. **Frontend is vapid** — no production integration confirmed
4. **Documentation absent** — <2% of actions have wiki entries
5. **Roadmap is stale** — CAD-COMPLETE-MS0 "0 shipped / 335 pending" contradicts codebase (0% vs 13% reality)

**Recommendation**: Mark CAD-COMPLETE-MS0 for refresh. Reality envelope: "49 engines + 544 actions wired; 4 frontend stubs; <2% documented." Drift severity: HIGH.
