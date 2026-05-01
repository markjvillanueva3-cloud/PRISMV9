# PRISM Full Business Synchronization Plan
## Zero-Gap, Mathematically Correct, Minimal Human Input

**Created:** 2026-04-09
**Goal:** Every business event automatically triggers all downstream effects. No data re-entry. All math from canonical formulas. Closed-loop feedback.

---

## THE PROBLEM: 7 of 10 Business Lifecycle Transitions are BROKEN

```
CURRENT STATE — data flow breaks (X = broken, ~ = partial, OK = wired):

  RFQ ──X──> Quote ──X──> Order ──X──> Job ──X──> Schedule
                                         │
                                         ├──X──> Material PO
                                         │
                                    Clock In/Out
                                         │
                                        OK ──> ActualCost ──> GL
                                         │
                                    Scrap ──X──> Cost Adjustment
                                         │
                                  QC Pass ──~──> Invoice ──X──> GL (payment)
                                                    │
                                              Payment ──X──> GL
                                                    │
                                              Actual ──~──> Quote Calibration
                                                    │
                                         Low Stock ──X──> Auto-PO
```

## TARGET STATE — fully synchronized:

```
  RFQ ──auto──> Quote ──accept──> Order ──auto──> Job + Routing
                                    │                    │
                                    │            auto──> Schedule to machine
                                    │            auto──> Check inventory
                                    │            auto──> PO if material short
                                    │
                               Operator scans badge
                                    │
                              auto──> Clock in + See handoff
                              auto──> Job queue sorted by priority
                              auto──> Speeds/feeds from physics
                                    │
                              Operator runs parts
                                    │
                              auto──> Time → Labor cost
                              auto──> Scrap → Cost adjustment
                              auto──> Tool wear → Life update
                                    │
                              QC pass
                                    │
                              auto──> Invoice from actual cost
                              auto──> GL posting (Revenue + COGS)
                              auto──> Packing list + Ship
                              auto──> Customer milestone update
                                    │
                              Payment received
                                    │
                              auto──> GL posting (Cash + AR)
                              auto──> Quote calibration (actual vs estimated)
                              auto──> Tool life model update (Weibull)
                              auto──> Scheduling model update (cycle time actual)
```

---

## SYNCHRONIZATION ENGINES TO BUILD/WIRE

### SYNC-01: Quote Acceptance → Order Creation
**Gap:** QuoteRevisionEngine.changeStatus("accepted") fires no downstream action
**Fix:** In QuoteRevisionEngine.changeStatus(), when newStatus === "accepted":
```typescript
// After status change:
const order = await orderManagerEngine.createOrder({
  customer_id: quote.customer_id,
  quote_id: quote.id,
  line_items: quote.line_items.map(li => ({
    part_number: li.part_number,
    quantity: li.quantity,
    unit_price: li.unit_price,
    material: li.material,
  })),
  due_date: quote.lead_time_options?.standard?.date,
  source: "quote_acceptance",
});
```
**Math:** Total order value = Σ(line_item.quantity × line_item.unit_price)
**Validation:** order.total_value === quote.total_price (must match within $0.01)

### SYNC-02: Order → Job + Routing
**Gap:** OrderManagerEngine.createOrder() creates order with empty workOrders[]
**Fix:** After order creation, auto-create job for each work order:
```typescript
// For each line item that needs manufacturing:
const job = await jobLifecycleEngine.createJob({
  order_id: order.id,
  part_number: item.part_number,
  quantity: item.quantity,
  material: item.material,
  routing: await routingEngine.generateRouting(item), // from quote's operation list
  due_date: order.due_date,
  priority: order.rush ? "rush" : "normal",
});
```
**Math:** Job estimated_hours = Σ(routing_step.cycle_time × quantity + routing_step.setup_time)
**Validation:** Job count per order = count of manufactureable line items

### SYNC-03: Job → Inventory Check → Auto-PO
**Gap:** InventoryOptimizationEngine computes reorder points but never triggers PO
**Fix:** On job creation, check material availability:
```typescript
// In JobLifecycleEngine.createJob():
const stockCheck = inventoryEngine.checkAvailability(job.material, job.quantity);
if (stockCheck.available < stockCheck.required) {
  const shortage = stockCheck.required - stockCheck.available;
  const po = await purchaseOrderEngine.createOrder({
    supplier: stockCheck.preferred_vendor,
    material: job.material,
    quantity: Math.max(shortage, stockCheck.eoq), // order at least EOQ
    job_id: job.id,
    required_by: job.due_date - lead_time_days,
    source: "auto_reorder",
  });
  job.materials.po_id = po.id;
  job.materials.ordered = true;
}
```
**Math:** Order quantity = max(shortage, EOQ) where EOQ = √(2DS/H)
- D = annual demand, S = order cost, H = holding cost per unit per year
**Validation:** PO quantity >= shortage AND PO quantity >= EOQ

### SYNC-04: Job → Auto-Schedule
**Gap:** JobLifecycleEngine.createJob() sets scheduled_start: null
**Fix:** After job creation, auto-schedule to best-fit machine:
```typescript
// In JobLifecycleEngine.createJob():
const schedule = await capacityPlanningEngine.scheduleJob({
  job_id: job.id,
  machine_type: job.routing[0].machine_type,
  estimated_hours: job.estimated_hours,
  due_date: job.due_date,
  priority: job.priority,
});
job.scheduled_start = schedule.start_time;
job.scheduled_end = schedule.end_time;
job.assigned_machine = schedule.machine_id;
```
**Math:** Scheduling uses EDD (Earliest Due Date) or SPT (Shortest Processing Time) per ShopSchedulerEngine
**Validation:** scheduled_end <= due_date (on-time flag)

### SYNC-05: Scrap → Cost Adjustment
**Gap:** TimeClockEngine.jobStop(scrap_count) stores count but never costs it
**Fix:** In TimeClockEngine.jobStop(), after recording scrap:
```typescript
if (scrap_count > 0) {
  const materialCostPerPart = await actualCostEngine.getMaterialCostPerPart(job_id);
  const scrapCost = scrap_count * materialCostPerPart;
  await actualCostEngine.recordScrapCost(job_id, {
    scrap_count,
    scrap_reason,
    material_cost: scrapCost,
    labor_cost: (scrap_count / (good_parts + scrap_count)) * laborCost,
    total_scrap_cost: scrapCost + scrapLaborCost,
  });
}
```
**Math:** Scrap cost = scrap_count × (material_cost_per_part + allocated_labor_per_part)
- Material cost per part = raw_material_cost / planned_quantity
- Labor per part = total_labor_cost / (good_parts + scrap_count)
**Validation:** total_job_cost = good_parts_cost + scrap_cost (must sum correctly)

### SYNC-06: Job Complete → Auto-Invoice
**Gap:** JobLifecycleEngine._onJobComplete() doesn't call InvoicingEngine
**Fix:** In _onJobComplete(), after ActualCost and GL posting:
```typescript
// Auto-create invoice from actual cost:
const invoice = await invoicingEngine.fromJobCost({
  job_id: job.id,
  order_id: job.order_id,
  customer_id: job.customer_id,
  costs: actualCost,
  markup: job.quoted_markup || 0.25,
  payment_terms: customer.payment_terms || "net_30",
});
// Auto-post revenue to GL:
await generalLedgerEngine.recordInvoice(invoice.id, invoice.total);
```
**Math:** Invoice total = Σ(actual_cost_category × (1 + markup)) + tax
- Revenue = invoice.subtotal
- COGS = actual_cost.total
- Gross margin = (Revenue - COGS) / Revenue × 100
**Validation:** Gross margin should be within ±15% of quoted margin (alert if not)

### SYNC-07: Invoice Payment → GL Auto-Post
**Gap:** InvoicingEngine.recordPayment() doesn't call GeneralLedgerEngine
**Fix:** In InvoicingEngine.recordPayment():
```typescript
// After updating invoice payment:
await generalLedgerEngine.recordPayment({
  invoice_id: invoice.id,
  amount: payment.amount,
  method: payment.method,
  reference: payment.reference,
});
// Debit: Cash (1000) for payment amount
// Credit: Accounts Receivable (1200) for payment amount
```
**Math:** Double-entry: Debit Cash = Credit AR (must balance to penny)
**Validation:** GL trial balance remains balanced after every payment posting

### SYNC-08: Actual → Quote Calibration (Closed Loop)
**Gap:** Only fires inside QuoteToShipOrchestratorEngine, not standalone
**Fix:** In ActualCostEngine.calculate() or JobLifecycleEngine._onJobComplete():
```typescript
// Feed actuals back to quote analytics:
if (job.quote_id) {
  await quoteAnalyticsEngine.recordActuals({
    quote_id: job.quote_id,
    job_id: job.id,
    estimated: {
      material: quote.costs.material,
      labor: quote.costs.labor,
      total: quote.total_price,
    },
    actual: {
      material: actualCost.material,
      labor: actualCost.labor,
      total: actualCost.total,
    },
    variance_pct: ((actualCost.total - quote.total_price) / quote.total_price) * 100,
  });
}
```
**Math:** Variance = (actual - estimated) / estimated × 100%
- Per-category drift tracks: material, labor, tooling, overhead independently
- Calibration adjustment = rolling 20-job weighted average of variance per category
**Validation:** Future quotes auto-adjust by calibration factor

### SYNC-09: Tool Wear → Life Model Update
**Gap:** Tool wear data from operations doesn't feed back to Weibull model
**Fix:** When tool is consumed/replaced, update tool life prediction:
```typescript
// In TimeClockEngine.jobStop() or ToolUsageEngine.endUsage():
await toolLifeEngine.recordActualLife({
  tool_id: entry.tool_id,
  material: job.material,
  operation: entry.process_type,
  actual_minutes: entry.productive_minutes,
  actual_parts: entry.good_parts,
  failure_mode: entry.tool_failure_mode, // wear/chipping/breakage
});
// Weibull update: β (shape) and η (scale) recalculated from all data points
// Taylor update: C and n recalculated for this tool-material pair
```
**Math:** Weibull: R(t) = e^(-(t/η)^β)
- β estimated via maximum likelihood from actual life data
- Taylor: VT^n = C, recalculated per tool-material combination
**Validation:** Predicted life within ±20% of actual (alert if systematic bias)

### SYNC-10: Cycle Time Feedback → Schedule Model
**Gap:** Actual cycle times don't feed back to improve scheduling estimates
**Fix:** On job completion, update the routing database:
```typescript
// In JobLifecycleEngine._onJobComplete():
for (const step of job.routing) {
  const actualTime = timeClockEngine.getStepTime(job.id, step.operation_number);
  await routingEngine.recordActualTime({
    part_number: job.part_number,
    operation: step.operation,
    machine_type: step.machine_type,
    estimated_minutes: step.estimated_minutes,
    actual_minutes: actualTime.productive_minutes,
    setup_minutes: actualTime.setup_minutes,
  });
  // Update: estimated = 0.8 × current_estimate + 0.2 × actual (exponential smoothing)
}
```
**Math:** Exponential smoothing: Ê(t+1) = α × A(t) + (1-α) × Ê(t), α = 0.2
**Validation:** Estimate accuracy should converge (variance decreasing over time)

---

## ADDITIONAL SYSTEMS FOR FULL AUTONOMY

### AUTO-11: Machine Alarm → Auto-Pause Job
When MTConnect/OPC-UA reports machine alarm:
- Auto-pause active job for that machine
- Record pause_reason = "machine_alarm", reason_category = "machine_down"
- Alert maintenance team
- **Math:** Downtime cost = machine_rate × alarm_duration

### AUTO-12: PM Due → Auto-Work Order
When calendar/hours threshold crossed for a machine:
- Auto-generate maintenance work order
- Auto-schedule during next planned downtime window
- **Math:** PM interval = min(calendar_days, machine_hours / hours_per_interval)

### AUTO-13: Operator Skill Gate
Before operator can clock into a job:
- Check: operator has required machine certification
- Check: operator has completed required training modules
- Block if not qualified, suggest alternative operator
- **Math:** Skill match score = Σ(required_skills ∩ operator_skills) / Σ(required_skills)

### AUTO-14: Dynamic Pricing Adjustment
Quote prices auto-adjust based on:
- Material price changes (market feed)
- Shop utilization (high util = premium pricing)
- Customer history (repeat customer discount)
- **Math:** Price = base_cost × (1 + margin) × material_index × utilization_factor × loyalty_factor

### AUTO-15: Cash Flow Projection
Auto-calculate rolling 30/60/90 day cash flow:
- Inflows: AR aging (expected collections by date)
- Outflows: AP aging + payroll + material POs + overhead
- **Math:** Net cash position(t) = current_cash + Σ(expected_inflows(0..t)) - Σ(expected_outflows(0..t))

### AUTO-16: Capacity-Aware Quoting
When estimating lead time, check real machine availability:
- Query CapacityPlanningEngine for available slots
- Lead time = max(material_lead_time, production_slot_start + cycle_time)
- **Math:** Slot = first_available_block where contiguous_hours >= job_hours

### AUTO-17: WIP Valuation (Real-Time)
At any moment, know the value of work in progress:
- For each active job: materials consumed + labor logged + overhead absorbed
- **Math:** WIP = Σ(job.material_issued + job.labor_hours × labor_rate + job.machine_hours × burden_rate)
- Posts to GL account 1300 (WIP) automatically
- On job completion: debit COGS, credit WIP

### AUTO-18: Burden Rate Calculation
Machine burden rate auto-calculated from actual data:
- **Math:** Burden rate = (depreciation + maintenance + utilities + insurance + rent_allocation) / available_hours
- Updated monthly from GL actuals
- Used in job costing and quoting

### AUTO-19: Learning Curve for Repeat Parts
When quoting a repeat part, apply Wright's learning curve:
- **Math:** T(n) = T(1) × n^(log(learning_rate) / log(2))
- learning_rate typically 0.85-0.95 for CNC
- Auto-detected from QuoteAnalyticsEngine actual vs estimated trend

### AUTO-20: Break-Even Analysis per Job
Before accepting an order, auto-calculate:
- **Math:** Break-even quantity = fixed_costs / (unit_price - variable_cost_per_unit)
- If order quantity < break-even quantity → flag as "below break-even"
- Show margin sensitivity: "at X% margin, need Y units"

---

## MATHEMATICAL VALIDATION REQUIREMENTS

Every calculation in the system MUST:

1. **Use canonical constants** — import from src/physics/constants.ts
2. **Carry units** — all values tagged with unit (USD, mm, min, kg)
3. **Double-entry accounting** — every GL entry must balance (debits = credits)
4. **Conservation of cost** — total_cost = material + labor + overhead + scrap (nothing unaccounted)
5. **Conservation of time** — shift_hours = productive_hours + setup_hours + idle_hours + break_hours
6. **Conservation of parts** — input_quantity = good_parts + scrap_count + WIP_remaining
7. **Margin chain** — quoted_margin ≈ actual_margin ± calibration_drift (tracked per job)
8. **Scheduling feasibility** — no machine double-booked, no infinite capacity assumed
9. **Payroll accuracy** — gross = (reg_hours × rate) + (OT_hours × rate × 1.5) + (DT_hours × rate × 2.0) + shift_diff
10. **Tax accuracy** — FICA SS capped at wage base ($168,600 for 2025), Medicare uncapped

---

## EXECUTION PRIORITY (What to wire first)

### TIER 1 — Revenue Chain (Quote → Cash): SYNC-01, 02, 06, 07, 08
These make money. Without them, every step requires manual intervention.

### TIER 2 — Cost Chain (Time → Cost → GL): SYNC-05, 17, 18
These track money. Without them, you don't know if you're profitable.

### TIER 3 — Operations Chain (Schedule → Dispatch → Material): SYNC-03, 04, 10
These run the shop. Without them, scheduling and material are manual.

### TIER 4 — Intelligence Chain (Calibration → Pricing → Learning): SYNC-08, 09, 14, 19
These make the system smarter over time. Without them, estimates never improve.

### TIER 5 — Safety Chain (Alarms → Skills → PM): AUTO-11, 12, 13
These prevent problems. Without them, reactive not proactive.

---

## FILES TO MODIFY

| Engine | Sync Points to Add |
|--------|-------------------|
| QuoteRevisionEngine.ts | SYNC-01: on accepted → create order |
| OrderManagerEngine.ts | SYNC-02: on create → create job |
| JobLifecycleEngine.ts | SYNC-03: on create → check inventory; SYNC-04: on create → schedule; SYNC-10: on complete → update routing estimates |
| TimeClockEngine.ts | SYNC-05: on jobStop with scrap → cost adjustment; SYNC-09: on tool replace → life update |
| InvoicingEngine.ts | SYNC-07: on payment → GL posting |
| ActualCostEngine.ts | SYNC-08: on calculate → quote calibration feedback |
| InventoryOptimizationEngine.ts | SYNC-03: on below reorder → auto-PO |
| GeneralLedgerEngine.ts | SYNC-17: WIP valuation auto-posting |

**New Engines Needed:**
| Engine | Purpose |
|--------|---------|
| BusinessSyncEngine.ts | Central event bus: publishes business events, subscribers react |
| BurdenRateEngine.ts | Monthly burden rate calculation from GL actuals |
| CashFlowProjectionEngine.ts | Rolling 30/60/90 day projection |
| LearningCurveEngine.ts | Wright's law for repeat part pricing |
