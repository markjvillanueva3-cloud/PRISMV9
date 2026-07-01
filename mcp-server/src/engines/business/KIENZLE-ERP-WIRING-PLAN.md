# Kienzle Tool Crib — Hotel Domain (Business/ERP) Wiring Plan
**Date:** 2026-06-26
**Source:** Claude Design Kienzle Tool Crib project + fleet directive
**Owner:** hotel slot

## Scope
Wire the entire hotel domain (HR, CRM, ERP, Accounting, Employee Portal, QuoteToOrderBridge, ERPCostFeedback, CustomerPortal, etc.) to the new Kienzle Tool Crib design.

## Current Assets (verified)
- 30+ Employee* engines (HR core, payroll, PTO, performance, academy)
- 7+ Customer* engines (CRM, portal, complaint, material map)
- 7+ ERP* engines (WorkOrder, CostFeedback, Quality, ToolInventory, Import, JM Die sim)
- Accounting/GL/Billing/DocuStrata engines
- businessDispatcher.ts (7,770 LOC, 50+ actions)

## Wiring Tasks (R15 — wire to all consumers)
1. Update all business engines to import Kienzle branding tokens (new CSS vars from redesign).
2. Wire QuoteToOrderBridge + ERPCostFeedback to new quote acceptance flows in Kienzle design.
3. Update CustomerPortal + EmployeeShopFloorMobileEngine to new iOS-style segmented controls + 44pt targets.
4. Add Kienzle-specific ERP simulation views (JMDieErpSimulationEngine).
5. Ensure business_sync_stats, quote_to_ship_run, customer_credit_check respect new design status colors.
6. Create KienzleBrandingEngine (if not duplicate) or extend BusinessSyncEngine.
7. Update businessDispatcher.ts action handlers to emit Kienzle-compliant payloads.

## Continuous Loops (auto-firing)
- hotel-business-wiring-monitor (every 15m)
- kienzle-erp-regression-watch (every 20m)
- employee-portal-sync-loop (every 30m)

## Verification
- Run businessDispatcher tests
- 3-of-3 scrutiny on any new wiring files
- Live :3100 smoke on ERP endpoints

**Status:** Wiring plan created. Background loops + memory directive active. Ready for implementation.
