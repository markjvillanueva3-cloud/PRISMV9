# PRISM-APP-QUEUE — Operator-Facing Work, Deferred After Backend-Dev Queue

> Generated 2026-05-17 by juliett v1.1 scrutiny — sibling to JULIETT-CONSOLIDATED-WORK-PLAN-V2.md
> **DO NOT DISPATCH** from here until Stages 1-4 of the backend-dev plan complete.
> Per operator directive: "high roi backend development features before anything prism app related".

---

## DISPATCHER-TARGET CLASSIFICATION RULE (the gate that put items here)

An item lands in PRISM-APP-QUEUE if its wiring target dispatcher is operator-facing:
- `camDispatcher`, `millDispatcher`, `edmDispatcher`, `ppDispatcher`, `machineLiveDispatcher`, `intelligenceDispatcher`, `businessDispatcher` — operator surfaces, PRISM-app
- `devDispatcher`, `contextDispatcher`, `hookDispatcher`, `localDispatcher`, `memoryDispatcher` — backend-dev (stays in main plan)

---

## DEFERRED DEEP-INTEGRATION BRIDGES (16 — all operator-facing)

| ID | From → To | Notes |
|----|-----------|-------|
| U-BRIDGE-SFC-FUSION | SFC → Fusion 360 toolpath | operator CAM |
| U-BRIDGE-SFC-HYPERMILL | SFC → hyperMILL | operator CAM |
| U-BRIDGE-SFC-MASTERCAM | SFC → Mastercam | operator CAM |
| U-BRIDGE-SFC-ESPRIT | SFC → Esprit | operator CAM (verify Esprit bridge exists) |
| U-BRIDGE-SFC-INVENTORHSM | SFC → Inventor HSM | **VAPORWARE — no HSM bridge engine found** |
| U-BRIDGE-SFC-SOLIDWORKS | SFC → SolidWorks CAM | operator CAM |
| U-BRIDGE-MASTERPOST-CAM | Master Post → 6 CAM bridges | G-code emission |
| U-BRIDGE-CAD-CAM-HANDOFF | CAD-AI → CAM-AI | IS the PRISM app itself |
| U-BRIDGE-AI-TIER1-TIER2 | Claude orchestrator → FullSystemAICoordinator | **could stay in backend** if defined as dev-orchestration |
| U-BRIDGE-AI-TIER2-TIER3 | Tier-2 → 7 domain specialists | **VAPORWARE — 7 not enumerated** |
| U-BRIDGE-SHOPFLOOR-LEARN | shop-floor / MTConnect → learning | operator infrastructure |
| U-BRIDGE-LEARN-SFC | learning → SFC params | transitively operator |
| U-BRIDGE-LEARN-CAM | learning → CAM strategy selectors | transitively operator |
| U-BRIDGE-ERP-SCHED | ERP → scheduling + capacity | operator/manager |
| U-BRIDGE-ERP-QUOTE | ERP → quoting + cost | sales/operator |
| U-BRIDGE-OPERATOR-GATES | operator-approval → CAD/CAM/post | name says it |

---

## DEFERRED CATEGORY-9 WIRING (operator-facing domains, ~190 named + 442 LongTail)

Apply U-BRIDGE-PRISM-APP-FILTER + fresh validate-unwired-signal re-run before any wiring. Realistic backend-dev slice may shrink from 836 → ~50.

| Domain | Engine count | Why deferred |
|--------|--------------|--------------|
| Lathe | 89 | already-flagged operator-facing |
| Mobile | 5 | shop-floor apps |
| Print | 6 | likely operator UI |
| Hyper (hyperMILL) | 7 | vendor CAM = operator seat |
| Milling | 7 | mill physics for operators |
| Mill | 4 | same |
| Mastercam | 5 | vendor CAM = operator seat |
| WET (Wire EDM) | 7 | EDM operator domain |
| Wire | 6 | EDM operator |
| Electrode | 4 | EDM electrode design = operator workflow |
| Okuma | 4 | controller-specific post |
| Turning | 11 | lathe-domain operator |
| Swiss | 6 | swiss-screw operator |
| Shop | 9 | ShopFloor/ShopConfig operator surface |
| Tool | 9 | tool catalog = operator-consumed |
| Fusion | 7 | vendor CAM |
| Machine | 17 | machine-live operator |
| **LongTail (80+ small domains)** | 442 | **~70-85% likely operator-facing** — needs per-engine triage |

**Notes:**
- Some engines in these domains MAY be backend-dev (cutting-physics libraries, parser utilities) — per-engine assessment via dispatcher-target rule is the gate.
- The 26 wiring units in v1 collapsed to single line "post-gate, see fresh report" per Axis #4 recommendation.

---

## NEW-SLOTS-NEEDED bridges (also deferred — no operator slot exists)

These v1 marked "NEW SLOT":
- U-BRIDGE-SHOPFLOOR-LEARN
- U-BRIDGE-ERP-SCHED
- U-BRIDGE-ERP-QUOTE
- U-BRIDGE-OPERATOR-GATES

Either: (a) operator claims a new dedicated PRISM-app slot, OR (b) these wait until existing slots have backend-dev capacity for adjacent work.

---

## DISPATCH PROTOCOL (when this queue activates)

1. Operator decides Stage 8 is open (backend-dev queue cleared)
2. Re-run `validate-unwired-signal.mjs` for fresh numbers
3. Re-classify each item against dispatcher-target rule (some may have shifted; new dispatchers may exist)
4. Distribute to operator-facing slots (currently no dedicated slots — operator decides expansion vs in-slot)
5. Each item must still pass per-engine PRISM-app filter (some Lathe engines may be backend-dev physics; some "Other" may be operator)

---

## RELATED REFERENCES

- Backend-dev plan: `JULIETT-CONSOLIDATED-WORK-PLAN-V2.md`
- Scrutiny deltas: `JULIETT-PLAN-V1.1-SCRUTINY-DELTAS-2026-05-17.md`
- Wire-noise audit: `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` (stale, regen needed)
- ROADMAP-CONSOLIDATED: `state/shared/specs/ROADMAP-CONSOLIDATED.json` (5826-item master)
