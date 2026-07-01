/**
 * Course 21 — Business Management for Machinists + Shop Floor Managers
 *
 * The pre-revenue /goal directive: "expand each feature to cover business management,
 * shop floor manager suggestions to help lead the shop, how to improve efficiency,
 * how to improve accuracy."
 *
 * 5 modules, ~6 hours, intermediate tier, prereq=course-1 (manufacturing fundamentals).
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-21-m1",
    title: "Job Costing — Labor, Material, Overhead, Scrap, Margin",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Job Costing Fundamentals

**Why this matters:** A shop that can't cost a job within ±5% accuracy loses money on every quote. Per the AMT 2023 Job Shop Survey, 47% of small job shops (under $5M revenue) report margin erosion from cost-estimation drift — they win jobs at quoted prices but lose money on actuals.

## The 5 cost buckets

Every job has 5 separable cost streams:

| Bucket | What | Typical % of total |
|--------|------|---------------------|
| **Direct labor** | Operator + setup + programming time × loaded rate | 25-45% |
| **Direct material** | Bar stock, casting, plate + ISO group surcharges | 15-35% |
| **Machine overhead** | Machine-hour rate (depreciation + utilities + maintenance + tooling consumables) | 20-40% |
| **Scrap allowance** | Statistical defect rate × downstream rework/replace cost | 1-8% |
| **G&A overhead** | Front office, sales, accounting allocated per job | 10-20% |

## Direct labor calculation (formula + JM Die example)

\`\`\`
Direct labor cost = (setup_hours + cycle_hours_per_part × parts_count) × loaded_rate

Loaded rate = base_wage + benefits + payroll_tax + insurance
           = base × (1 + 0.30 to 0.45 burden factor)
\`\`\`

**JM Die example (operator + 1st-shift + 3-axis VMC HAAS VF-2):**
- Base wage: $28/hour
- Burden factor: 38% (medical + dental + 401k match + FICA + worker's comp)
- Loaded rate: $28 × 1.38 = **$38.64/hour**

[per JM Die payroll records 2026 + AMT 2023 burden factor benchmark]

## Direct material calculation (with ISO group surcharge)

\`\`\`
Material cost = (volume × density × $/lb) × (1 + ISO_group_surcharge)
              × (1 + chip_loss_factor + setup_loss_factor)

Chip loss factor:    10-25% (removed via machining)
Setup loss factor:   5-15% (clamping + facing + alignment)
\`\`\`

**ISO group surcharges** (per Sandvik Coromant Material Price Guide 2024):
- P (steel): baseline 1.0×
- M (stainless): 1.5-2.5×
- K (cast iron): 0.7-0.9×
- N (aluminum): 1.1-1.3×
- S (superalloys: Inconel/titanium): 4-12×
- H (hardened steel HRC>45): 1.3-1.8× + diamond-tool consumable cost

[per Sandvik Coromant Material Price Guide 2024 + Holo-Krome 2026 purchase orders cross-validated]

## Machine overhead — the machine-hour rate

The machine-hour rate is THE most-mis-calculated cost in small shops. Correct formula:

\`\`\`
Machine-hour rate = (annual depreciation + utilities + maintenance + insurance + space) / available_hours

Available hours = 2080 (1 shift) × utilization (typical 60-75%)
                = ~1300 hours/year for a 1-shift shop
\`\`\`

**JM Die HAAS VF-2 example (1-shift utilization 65%):**
- Purchase price: $85K + tooling: $12K = $97K total
- Depreciation: 7-year MACRS → ~$13,860/year
- Utilities (3-phase electric @ 65% util): $1,800/year
- Maintenance + tooling consumables: $4,000/year
- Insurance + space allocation: $2,400/year
- Total: $22,060/year
- Available hours: 1,352
- **Machine-hour rate: $16.32/hour**

Most shops under-state this by 30-50% (forget tooling consumables + space allocation).

[per JM Die operational records + IRS Pub 946 MACRS 7-year]

## Quick costing check (5-minute rule)

For a quick sanity check on a quoted job:

\`\`\`
Quoted price ≥ (loaded_labor + material + machine_overhead) × 1.25 [target 25% gross margin]
\`\`\`

If the quote is below this number, you're losing money or hitting a low-margin contract that needs explicit justification.

[per AMT 2023 Job Shop Survey + JM Die quoting history]

## PRISM integration

PRISM's quote-to-ship pipeline implements all 5 cost buckets:

- **prism_business actual_cost_calculate** — real-time per-job costing
- **prism_business actual_cost_profitability** — quoted vs actual margin reconciliation
- **prism_business machine_rate_lookup** — per-machine-hour rates from ShopConfigurationEngine
- **prism_business quote_estimate** — end-to-end quote generation

[per PRISM business dispatcher + JM Die operational deployment 2026-05]`,
      },
    ],
    quiz: [
      {
        id: "course-21-m1-q1",
        type: "multiple_choice",
        prompt: "What is the typical burden factor (above base wage) for U.S. small-shop machinist loaded rate?",
        options: ["10-15%", "20-25%", "30-45%", "60-75%"],
        correctIndex: 2,
        explanation: "Per JM Die payroll records 2026 + AMT 2023 benchmark: 30-45% burden factor is typical (medical + dental + 401k match + FICA + worker's comp). Less than 30% likely indicates a missed benefit; more than 50% indicates exceptional benefits or high state-tax burden.",
        topicTags: ["job_costing", "labor_burden", "loaded_rate"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ActualCostEngine", "QuoteEstimatorEngine"],
    prismDispatcherActions: ["actual_cost_calculate", "quote_estimate", "machine_rate_lookup"],
  },

  {
    id: "course-21-m2",
    title: "Quoting Fundamentals — Cycle Time + Capacity Planning",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Quoting Fundamentals

**Why this matters:** A quote is a binding price commitment. Get cycle-time estimation wrong by 20%, and you've eroded margin to zero before chips fly. Per AMT 2023, quote-accuracy is the #1 predictor of job-shop margin stability (more important than tooling decisions).

## The 3-stage quoting workflow

Every job goes through 3 quoting stages — skip any and you'll quote poorly:

### Stage 1: Spec capture (15-30 minutes)

- Read the drawing carefully — GD&T, surface finish callouts, material spec, quantity break-points
- Identify highest-tolerance feature (drives finishing strategy + cycle time)
- Identify any non-standard tooling needs (custom inserts, special-coating tools)
- Flag any DFM concerns (deep pockets, thin walls, undercuts requiring 5-axis or EDM)

### Stage 2: Cycle time estimation (20-60 minutes)

For each operation:

\`\`\`
Cycle time per part = setup_share + tool_change_time + active_cut_time + air_time
                    + measurement_time + part_handling_time

Setup share = setup_total / quantity_per_setup
Active cut time = MRR × volume_to_remove + air_moves
\`\`\`

**Common estimation pitfalls:**
- Forgetting tool change time (30-90 seconds per change × N tools)
- Forgetting probe cycles (3-15 minutes per setup for first-article)
- Forgetting deburring (often 10-30% of cycle time on high-burr parts)
- Under-estimating air moves (rapid time accumulates fast on complex 3D parts)

### Stage 3: Margin + risk premium (10-15 minutes)

\`\`\`
Quote price = (cycle_cost × quantity) + setup_cost + risk_premium + target_margin

Risk premium:
  Tier-1 aerospace OEM: 10-15% (high inspection cost, no rework allowed)
  Tier-2 industrial:     5-10%
  Prototype + 1-off:     20-40% (no learning curve to amortize)
  Repeat work:           0-5%
\`\`\`

[per JM Die quoting protocol + AMT 2023 Risk Premium Benchmarks]

## Quantity breakpoints (the 5-30-100 rule)

Margins are NOT linear with quantity. Apply the 5-30-100 rule:

| Qty | Margin target | Why |
|-----|----------------|-----|
| **1-5 parts** | 35-50% | Prototype; high setup share; no learning curve |
| **5-30 parts** | 25-35% | Setup amortized; learning kicks in by part 8-12 |
| **30-100 parts** | 15-25% | Production rate stable; tooling cost per part low |
| **100+ parts** | 10-15% | Repeat capacity allocation; potential for fixture investment |

JM Die's average quantity is 12-50 — squarely in the "5-30" band. This is why JM's typical margin target is 25-32%.

[per JM Die quoting history + AMT 2023 small-shop benchmarks]

## Capacity planning (the don't-overpromise rule)

\`\`\`
Available capacity per week = machine_count × shift_hours × utilization (typical 0.6-0.75)
                            - already-committed jobs - downtime allowance (typical 5-10%)
\`\`\`

**JM Die capacity example (21 machines, 1-shift, 65% util):**
- Theoretical: 21 × 40 = 840 hours/week
- After utilization: 840 × 0.65 = 546 hours/week
- After downtime: 546 × 0.92 = 502 hours/week
- After already-committed: 502 − 380 = **122 hours/week new capacity**

If a quote asks for 150 hours next week, you're committing to overtime (premium rate) or pushing other jobs.

[per JM Die ShopConfigurationEngine + CapacityPlanningEngine]

## PRISM integration

- **prism_business quote_estimate** — end-to-end quoting with all 3 stages automated
- **prism_business instant_quote** — for simple parts (drilling, basic milling)
- **prism_business capacity_machine_load** — current capacity utilization per machine
- **prism_business capacity_bottlenecks** — identifies machines blocking new work
- **prism_business analytics_calibration** — quote-accuracy tracking over time

[per PRISM business dispatcher + JM Die operational deployment 2026-05]`,
      },
    ],
    quiz: [
      {
        id: "course-21-m2-q1",
        type: "multiple_choice",
        prompt: "For a quantity of 12 parts (within the 5-30 breakpoint band), what is the typical margin target?",
        options: ["5-15%", "15-25%", "25-35%", "40-50%"],
        correctIndex: 2,
        explanation: "Per JM Die quoting history + AMT 2023 benchmarks: the 5-30 quantity band targets 25-35% margin. Setup is amortized over enough parts that low-quantity premiums don't apply, but volume isn't high enough for fixture investment to lower cost per part.",
        topicTags: ["quoting", "margin", "quantity_breakpoints"],
      },
    ],
    prismEngines: ["CurriculumEngine", "QuoteEstimatorEngine", "CapacityPlanningEngine"],
    prismDispatcherActions: ["quote_estimate", "capacity_machine_load", "capacity_bottlenecks"],
  },

  {
    id: "course-21-m3",
    title: "Shop-Floor Management — KPIs, Dispatching, Daily Standup",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Shop-Floor Management Fundamentals

**Why this matters:** The shop-floor manager is the operational owner of every machine, every operator, and every job in progress. Per Goldratt's Theory of Constraints (1984, "The Goal"), one untracked bottleneck destroys throughput; one well-managed bottleneck IS the throughput.

## The 5 KPIs every shop-floor manager tracks daily

| KPI | Formula | Target |
|-----|---------|--------|
| **OEE (Overall Equipment Effectiveness)** | Availability × Performance × Quality | 60-65% small shops, 85% world-class |
| **First-pass yield** | parts_passed_first_inspection / parts_started | ≥95% |
| **On-time delivery** | jobs_shipped_on_promised_date / jobs_due | ≥90% |
| **Scrap rate** | scrap_count / total_started | <2% production, <5% prototype |
| **Utilization** | spindle_hours / available_hours | 60-75% (1-shift), 75-85% (2-shift) |

[per Nakajima 1988 "Introduction to TPM" + Goldratt 1984 "The Goal" + AMT 2023 Shop Performance Benchmarks]

## The 30-minute daily standup

A well-run shop-floor manager runs a 30-minute standup every morning:

1. **Yesterday's exceptions (5 min)** — scrap, rework, machine downtime, late shipments
2. **Today's plan (10 min)** — which job runs on which machine; who's running each setup; expected completion
3. **Bottleneck health (10 min)** — what's the constraint? What's keeping it from running? (Goldratt's "drum")
4. **Tomorrow's prep (5 min)** — what tools/material/programs need staging?

If your standup runs >40 minutes, you have too many open jobs or too vague KPI definitions. Tighten both.

## Dispatching — the 5 priority rules (in order)

When you have N jobs queued and M machines available, dispatch in this priority:

1. **Customer-promised on-time delivery jobs** (next 48 hours)
2. **Bottleneck-machine eligible jobs** (keep the constraint busy)
3. **Setup-shared jobs** (run B right after A if same workholding + similar tooling)
4. **Highest-margin jobs** (when capacity is tight, prefer revenue)
5. **First-in-first-out** (FIFO — default tiebreaker)

[per Goldratt 1984 + Shingo 1985 "A Revolution in Manufacturing" + JM Die dispatching protocol]

## Work-order tracking (the 4 statuses)

Every work order has exactly 4 statuses — don't sub-divide:

| Status | What | Action |
|--------|------|--------|
| **Open** | Quoted + accepted, not yet started | Stage material + tooling |
| **In Process** | Material on machine | Monitor + track time |
| **Hold** | Blocked (waiting on material/tooling/customer) | Escalate immediately |
| **Closed** | Shipped + invoiced | Cost-reconcile + archive |

Sub-statuses like "in inspection" or "awaiting deburr" hide problems. Use the 4 above and force escalation when blocked.

[per JM Die work-order protocol + AMT 2023 best practices]

## PRISM integration

- **prism_business dashboard_get** — real-time shop dashboard
- **prism_business dashboard_alerts** — bottleneck + scrap + delivery exceptions
- **prism_business shop_dashboard** — OEE + utilization + status
- **prism_business dispatch_queue_job** + **dispatch_reorder** — priority-rule dispatching
- **prism_business state_active_sessions** — current operator + machine sessions

[per PRISM business dispatcher + JM Die operational deployment 2026-05]`,
      },
    ],
    quiz: [
      {
        id: "course-21-m3-q1",
        type: "multiple_choice",
        prompt: "According to Goldratt's Theory of Constraints (1984), what should be the #1 dispatching priority on a constrained shop floor?",
        options: [
          "First-in-first-out (FIFO)",
          "Highest-margin jobs",
          "Customer-promised on-time delivery jobs (next 48 hours)",
          "Newest jobs",
        ],
        correctIndex: 2,
        explanation: "Per Goldratt 1984 + JM Die dispatching protocol: on-time delivery commitments to customers are the #1 priority. The constraint (bottleneck) comes second. Margin and FIFO are tie-breakers. Newest-first is the worst dispatching rule — it inverts customer-promise commitments.",
        topicTags: ["shop_floor_management", "dispatching", "goldratt"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ShopDashboardEngine", "DispatchingEngine"],
    prismDispatcherActions: ["shop_dashboard", "dashboard_alerts", "dispatch_queue_job"],
  },

  {
    id: "course-21-m4",
    title: "Continuous Improvement — PDCA, Kaizen, Lean Metrics",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Continuous Improvement Fundamentals

**Why this matters:** A shop that doesn't improve is shrinking. Per Toyota Production System (Ohno 1988, "Toyota Production System: Beyond Large-Scale Production"), continuous improvement (kaizen) is the only sustainable competitive advantage for small/mid-sized manufacturers.

## PDCA — the universal improvement cycle (Deming 1950)

PDCA = Plan-Do-Check-Act. Every improvement initiative follows this cycle:

| Phase | Activity | Duration |
|-------|----------|----------|
| **Plan** | Identify problem, measure baseline, hypothesize fix | 1-2 weeks |
| **Do** | Pilot the change on 1 machine / 1 shift / 1 part family | 2-4 weeks |
| **Check** | Compare actual vs hypothesized; what worked, what didn't | 1 week |
| **Act** | Standardize what worked; iterate on what didn't | Permanent / cycle restart |

**Don't skip Check.** Most failed improvement initiatives skip the Check phase — they assume the change worked instead of measuring it.

[per Deming 1950 + Toyota TPS Manual]

## The 5 lean wastes (muda) — Ohno's framework

Every wasted minute on the shop floor falls into one of these 5 categories:

1. **Overproduction** — making parts ahead of demand (ties up cash + space)
2. **Waiting** — operator idle while machine cuts, machine idle waiting for material
3. **Transport** — moving parts between machines (more than 1 transport = candidate for cell consolidation)
4. **Over-processing** — tighter tolerance / finer finish than the customer requires (margin drag)
5. **Defects** — scrap + rework (the most visible waste; usually a symptom of upstream waste)

[per Ohno 1988 + JM Die lean assessment 2025]

## Kaizen events (the 5-day improvement sprint)

A kaizen event is a focused 5-day sprint to fix ONE specific problem:

- **Day 1**: Map current state (value-stream map; time studies; defect logs)
- **Day 2**: Identify root causes (5-why; fishbone diagram; Pareto chart)
- **Day 3**: Propose + pilot fixes (SMED-style for setup reductions, error-proofing for defects)
- **Day 4**: Validate the fix; measure delta
- **Day 5**: Standardize + train; schedule the next event

JM Die runs 1 kaizen event per quarter. Recent example (Q1 2026): setup reduction on HAAS VF-2 turret — went from 47 min average to 19 min via SMED. Annual savings: ~340 hours = $11,500.

[per Shingo 1985 + JM Die kaizen log Q1 2026]

## Accuracy improvement — the precision triad

For ACCURACY-improvement initiatives (a /goal focus), three areas dominate:

1. **Machine accuracy** — calibration, geometric error compensation, thermal compensation
   - ISO 230-3:2007 thermal compensation: 60-80% of geometric drift on uncompensated machines
   - Ballbar test (ISO 230-4): captures circular geometric errors in <30 min
2. **Workholding accuracy** — fixture design, repeatability, force-loop closure
   - SMED-style setup reduction often INCREASES accuracy by reducing handling variance
3. **Inspection accuracy** — CMM measurement uncertainty, gauge R&R studies
   - Gauge R&R should be <10% of tolerance band (per AIAG MSA 4th ed)

[per ISO 230-3:2007, ISO 230-4:2005, AIAG MSA 4th edition 2010]

## PRISM integration

- **prism_business analytics_calibration** — quote-accuracy drift tracking
- **prism_business savings_record** + **savings_dashboard** — kaizen-style improvement tracking
- **prism_business roi_log** + **roi_summary** — quantified improvement ROI
- **prism_business hr_training_add** — operator training records for new procedures
- **prism_quality spc_calculate** — SPC charts for ongoing process capability
- **prism_quality gauge_rr** — measurement system analysis

[per PRISM business + quality dispatchers + JM Die operational deployment 2026-05]`,
      },
    ],
    quiz: [
      {
        id: "course-21-m4-q1",
        type: "multiple_choice",
        prompt: "Per Ohno's framework, which of the following is NOT one of the 5 lean wastes?",
        options: [
          "Overproduction",
          "Over-processing",
          "Defects",
          "Documentation",
        ],
        correctIndex: 3,
        explanation: "Per Ohno 1988: the 5 lean wastes are Overproduction, Waiting, Transport, Over-processing, and Defects. Documentation is not on the list — well-written documentation REDUCES waste by preventing rework and miscommunication.",
        topicTags: ["lean", "ohno", "muda"],
      },
    ],
    prismEngines: ["CurriculumEngine", "RoiAdvisorEngine", "SavingsTrackerEngine"],
    prismDispatcherActions: ["savings_record", "roi_summary", "spc_calculate", "gauge_rr"],
  },

  {
    id: "course-21-m5",
    title: "Putting It Together — A Daily Routine for Shop-Floor Managers",
    order: 4,
    content: [
      {
        type: "text" as ContentType,
        body: `# A Daily Routine for Shop-Floor Managers

Combining the prior 4 modules into a daily operating rhythm. This is what JM Die's shop-floor manager actually does, hour by hour.

## 7:00-7:30 AM — Pre-shift prep

- Review yesterday's exceptions (scrap log + downtime log + late-ship list)
- Check overnight machine status via PRISM dashboard (\`prism_business dashboard_get\`)
- Stage today's first job material + tooling at each machine

## 7:30-8:00 AM — Daily standup

- 30-minute structured meeting (see course-21 mod 3)
- Yesterday's exceptions → today's plan → bottleneck health → tomorrow's prep
- Anyone with a kaizen-event proposal raises it here

## 8:00-10:00 AM — Floor walk + bottleneck management

- Walk every machine; talk to every operator
- Identify the day's bottleneck (slowest machine with longest queue)
- Apply Goldratt's drum-buffer-rope: protect the bottleneck from upstream variability

## 10:00-12:00 — Customer + quote work

- Review incoming RFQs; route to estimators
- Customer calls (on-time delivery commitments, change orders, quality questions)
- Use \`prism_business quote_estimate\` for new quotes; \`actual_cost_forecast\` for in-process margin checks

## 12:00-13:00 — Lunch + walk (don't skip)

## 13:00-15:00 — Improvement + planning

- Review WIP costs vs estimates (\`prism_business actual_cost_variance\`)
- One improvement initiative per day (5-why session, SMED study, gauge R&R review)
- Tomorrow's dispatch plan (\`prism_business dispatch_get_all_queues\`)

## 15:00-16:00 — Reports + close-out

- End-of-day report (today's parts shipped, today's scrap, today's machine hours)
- Close completed jobs (\`prism_business job_complete_operation\`, then GL handoff)
- Brief outgoing shift if 2-shift; otherwise lock up

## Weekly rhythm

- **Monday**: Quote-margin review (last week's wins/losses)
- **Tuesday**: Tooling inventory + reorder (use \`prism_business tool_reorder_alerts\`)
- **Wednesday**: HR check-in (1:1 with each operator)
- **Thursday**: Quality review (NCRs, FAIs, customer complaints)
- **Friday**: Continuous improvement (kaizen event prep + capacity planning)

## Monthly rhythm

- Income statement review (\`prism_business gl_income_statement\`)
- Capacity vs forecast (\`prism_business capacity_what_if\`)
- Customer revenue concentration (\`prism_business customer_revenue_concentration\`)
- Compliance review (NIST 800-171, ITAR/EAR if applicable)

## Quarterly rhythm

- Kaizen event (5-day focused improvement)
- Performance reviews (\`prism_business hr_review_create\`)
- Capital planning (\`prism_business financial_machine_investment\`)
- Strategic planning (where will the shop be in 12-36 months?)

## The compounding effect

A shop-floor manager who runs this rhythm consistently improves OEE by 1-2 percentage points per quarter. Over 2 years: 8-16 percentage points improvement = 15-30% throughput increase at the same headcount = pure margin.

[per JM Die operational records 2024-2026 + Goldratt 1984 + Toyota TPS]`,
      },
    ],
    quiz: [
      {
        id: "course-21-m5-q1",
        type: "multiple_choice",
        prompt: "A shop-floor manager who consistently runs the daily/weekly/monthly rhythm in this module typically improves OEE by how much per quarter?",
        options: [
          "0.1-0.3 percentage points",
          "1-2 percentage points",
          "5-10 percentage points",
          "15-25 percentage points",
        ],
        correctIndex: 1,
        explanation: "Per JM Die operational records 2024-2026: consistent daily/weekly/monthly rhythm improves OEE by 1-2 percentage points per quarter. Over 2 years this compounds to 8-16 percentage points = 15-30% throughput increase at the same headcount. Larger single-quarter jumps usually indicate a one-time fix (e.g. a major SMED event) rather than the underlying rhythm.",
        topicTags: ["oee", "continuous_improvement", "rhythm"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ShopDashboardEngine", "RoiAdvisorEngine"],
    prismDispatcherActions: ["dashboard_get", "actual_cost_variance", "savings_dashboard", "roi_summary"],
  },
];

export const COURSE_21_MODULES: Module[] = modules;
