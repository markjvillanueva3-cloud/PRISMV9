---
session: claude-c0895ba0
topic: doc-pipeline-run-all
slot: charlie
written_at: 2026-06-13T15:11:20.013Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-c0895ba0
status: active
---

# HANDOFF: claude-c0895ba0
Updated: 2026-06-13T15:11:20.014Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-c0895ba0

## STATE
FULL Orders-Closed run DONE: 12,761 -> 6,718 actuals = $355M (53% yield, 98% hi-conf). Join keys: customer 4367/part 3007/order# 2398/date 6606. Heap-guard makes it repeatable (PRISM_OC_HEAP_MB). ~10 units shipped this session across 2 operator directives (all-means-all rule + doc-pipeline). Remaining = train-cycle-feed (value-closing, gate-sensitive) + other folders + dispatcher-wire.

## RESUME
Doc-pipeline 'run all documents through it' -- ACTUAL-PRICE SIDE DONE. The full JMD Orders Closed corpus (12,761 PDFs) ran -> 6,718 standalone actuals = $355,028,170.89 real settled-price ground truth (state/shared/quoting/orders-closed-actuals.jsonl). Shipped (cad-fusion-live-ms0 trunk [MAIN-FORCE]): CLOSEDORDER-ROUTING-FIX, DOCTYPE-FIELD-MINING, EMIT-STANDALONE-ACTUALS, PART-MINER, PART-PHONE-GUARD, RUN-ALL-HEAP-GUARD (orchestrator self-raises 16GB heap now). Lib scripts/lib/docustrata-outcome-extract-lib.mjs (28 tests). NEXT (per spec RUN-ALL-DOCS-PIPELINE-PLAN-2026-06-12.md + memory reference_charlie_orders_closed_355m_2026_06_12): (1) U-QP-TRAINCYCLE-FEED -- wire the 6,718 actuals into quoting-train-cycle.mjs (QUOTING_DATA_SOURCES docustrata_invoices consumed:false -> point at real actuals; the OODA loop matches them vs PRISM predictions; NEVER soften PLACEHOLDER_MARKERS gate -- DO ON FRESH CONTEXT, calibration core). (2) run Sales Orders (21,515) + Quotes (955) folders. (3) streaming-merge refinement. (4) U-QP-DISPATCHER-WIRE. (5) orchestrator 'pairs extracted' metric counts JSON lines not records (R12 fix). Charlie commits TRUNK [MAIN-FORCE].

## CONTEXT

