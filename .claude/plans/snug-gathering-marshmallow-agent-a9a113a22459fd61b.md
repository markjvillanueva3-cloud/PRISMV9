# PRISM v9 Feature Naming Critique

## Executive Summary

The naming scheme shows strong creative ambition and a genuine understanding of shop floor culture. However, it suffers from three structural problems: suffix overuse ("Forge" x4, "Pulse" x2, "IQ" x3, "Vault" x2), a mix of naming philosophies that makes the suite feel assembled rather than designed, and several names that sacrifice clarity for cleverness. Below is a point-by-point critique followed by concrete recommendations.

---

## 1. Is the "Forge" Suffix Overused?

**Yes, critically so.** Four names use "Forge": QuoteForge, CodeForge, BillForge, ReportForge.

Problems:
- **Dilutes the metaphor.** "Forge" implies heat, metal shaping, craftsmanship. That metaphor is powerful for G-code generation (CodeForge) and arguably for quoting (forging a deal). But invoicing (BillForge) and reporting (ReportForge) have nothing to do with forging. You do not forge an invoice. You issue one.
- **Navigation confusion.** A user scanning a sidebar with four "Forge" items will conflate them. The eye skips past repeated prefixes/suffixes -- this is a well-documented UX pattern called "banner blindness for repeated stems."
- **Brand fatigue.** If everything is a Forge, nothing is.

Additionally, "IQ" appears three times (CapacityIQ, ProcessIQ, CostIQ) and "Pulse" appears twice (ProfitPulse, OrderPulse). The "Vault" suffix shows up twice (StockVault, DataVault). This compounds the repetition problem.

**Recommendation:** Reserve "Forge" for exactly one feature -- the most forge-like one. CodeForge is the natural winner (generating machine code is the closest digital analogue to metalworking). Kill the other three Forge names.

---

## 2. Are the Names Memorable and Self-Explanatory?

Mixed results. Scoring each on a "would a machinist get it in 2 seconds" test:

**Instantly clear (good):**
- Job Tracker -- plain English, universally understood
- TimeSheet -- industry standard term
- PayRoll -- everyone knows this
- CutPlanner -- obvious action + object
- PartView -- obvious
- Config -- universal

**Clear with a moment's thought (acceptable):**
- CodeForge -- "code" + "forge" signals G-code creation, works well
- PathAdvisor -- "path" could mean toolpath to a machinist, good enough
- Command Center -- generic but understandable
- MarginTracker -- clear for anyone who thinks about money
- QualityGate -- manufacturing term, well-chosen

**Ambiguous or misleading:**
- **SimLab** -- A machinist hears "SimLab" and thinks simulation software (Vericut, NCSIMUL). The actual feature is "What-If" scenario analysis for quoting/planning, not toolpath simulation. This name overpromises. A programmer who clicks expecting to verify G-code visually will be confused.
- **FloorPlan** -- The "double meaning" cited in the rationale is actually a naming collision. A floor plan is a building layout. A machinist who hears "floor plan" thinks of the physical shop layout, not job scheduling. This will confuse people.
- **PrintScan** -- Sounds like a scanning/printing utility. The actual feature scans blueprints to generate quotes, but "PrintScan" reads like a driver utility.
- **SafeTeam** -- Sounds like a team communication tool, not HR compliance. The "safe" prefix is misleading; this is not about physical safety but regulatory/HR compliance.

**Too clever / requires explanation:**
- **BuyDesk** -- Purchasing professionals do not call their workspace a "BuyDesk." This is a made-up compound that sounds like a furniture e-commerce site.
- **FinishLine** -- The pun (secondary ops "finish" the part / reaching the "finish line") is cute but: (a) it sounds like a shoe store, (b) machinists call these "secondary ops" or "finishing operations," not a finish line, (c) it implies completion/done rather than an active work area.
- **MetalMarket** -- Sounds like a commodity trading platform or scrap exchange, not a material pricing lookup.
- **WinRate** -- This is sales/marketing jargon. A shop owner might get it, but the floor foreman who also builds quotes will not instinctively associate "WinRate" with quote analytics.
- **ProfitPulse** -- Overly metaphorical. "Pulse" implies real-time monitoring, but financial analysis is usually periodic.
- **ClockIn** -- Simple enough, but it is also the name of at least three existing time-tracking SaaS products.

---

## 3. Naming Collisions with Existing Products

Several names conflict with or are uncomfortably close to established products:

| Proposed Name | Collision Risk | Existing Product |
|--------------|---------------|-----------------|
| **ClockIn** | HIGH | ClockIn Portal, ClockIn Easy (time tracking SaaS) |
| **SafeGuard** | HIGH | McAfee SafeGuard, Sophos SafeGuard, SafeGuard World (multiple product categories) |
| **MetalMarket** | MEDIUM | MetalMiner, MetalsMarket.net |
| **InspectPro** | MEDIUM | InspectPro (home inspection software) |
| **PostStore** | MEDIUM | Sounds like an app store / e-commerce, not post processor management |
| **Command Center** | LOW-MEDIUM | Google Command Center, SolarWinds Command Center, extremely generic |
| **PRISM Academy** | LOW | Multiple "Academy" branded products, but PRISM prefix distinguishes it |
| **PartView** | LOW | PartViewer exists in some CAD ecosystems |

None of these are likely trademark infringement issues since PRISM is the product name and these are feature names, not standalone products. But the cognitive collision -- a user Googling "ClockIn help" and getting results for a different product -- is a real support burden.

---

## 4. Does the Naming Feel Cohesive as a Product Suite?

**No.** The current scheme uses at least six different naming philosophies simultaneously:

1. **Compound-Forge:** CodeForge, QuoteForge, BillForge, ReportForge
2. **Compound-IQ:** CapacityIQ, ProcessIQ, CostIQ
3. **Compound-Pulse:** ProfitPulse, OrderPulse
4. **Compound-Vault/Book/Desk:** StockVault, DataVault, ClientBook, BuyDesk
5. **Action-oriented:** ClockIn, CutPlanner, Job Tracker, MarginTracker
6. **Plain English:** TimeSheet, PayRoll, Config, Crew

This makes the suite feel like it was assembled by six different marketing interns. Compare to products that feel unified:
- **Atlassian:** Jira, Confluence, Trello, Bitbucket -- all short, distinctive, no shared suffixes
- **Salesforce:** Sales Cloud, Service Cloud, Marketing Cloud -- shared "Cloud" suffix with clear differentiator
- **HubSpot:** Marketing Hub, Sales Hub, Service Hub -- same pattern

For PRISM, the brand name itself is the unifying element. Features should not need their own branding gimmick on top of that. A user says "open PRISM" and navigates to a clearly-named feature. The feature names should be functional, not branded.

---

## 5. Are the Sidebar Group Names Intuitive?

| Group | Verdict | Notes |
|-------|---------|-------|
| **Calculate** | WEAK | Too generic. "Calculate what?" A machinist opens PRISM to calculate feeds and speeds, but also to calculate quotes, costs, and capacity. Everything in the app calculates something. |
| **Shop Floor** | STRONG | Universally understood. Every machinist knows this term. |
| **QuoteForge** | WEAK | A sidebar group should not be named after a specific feature within it. This is like naming a folder after one of its files. If someone is looking for WinRate (quote analytics), would they think to look under "QuoteForge"? |
| **Money** | TOO CASUAL | Shop owners and controllers deal with "Finance" or "Accounting," not "Money." This reads as informal/unprofessional. A $200K/year CNC shop does not want their ERP module labeled "Money." |
| **Crew** | ACCEPTABLE | Informal but fits the shop floor culture. Slightly better than "HR" for a small shop context. |
| **Intelligence** | WEAK | Vague. Intelligence could mean BI, AI, analytics, or reporting. |
| **Quality** | STRONG | Direct, universally understood in manufacturing (QA/QC). |
| **Admin** | STRONG | Universal, expected. |

---

## 6. Would "PRISM Calculator" Be Confused with a Basic Calculator App?

**Yes, this is a real risk.** When a user tells a colleague "use the PRISM Calculator," the listener may picture a simple arithmetic tool. The word "calculator" is one of the most overloaded terms in software.

However, within the context of the app (the user is already in PRISM, looking at a sidebar), the confusion is minimal. The icon (Gauge) helps disambiguate.

**Bigger problem:** "PRISM Calculator" as a brand name for the SFC feature buries the specific value proposition. It does not tell you it calculates speeds and feeds. Compare:
- "PRISM Calculator" -- calculator for what?
- "Speeds & Feeds" -- instantly clear
- "Cut Calculator" -- clear, short, manufacturing-specific

---

## 7. Is "Command Center" Too Generic?

**Yes.** It is the default name for every dashboard in every B2B SaaS product. It communicates nothing specific about what this dashboard shows. That said, dashboards are inherently generic, so the name matters less than the content. The icon (LayoutDashboard) is appropriate.

The real question is whether "Command Center" sets an expectation of real-time machine monitoring (like a SCADA system) when it may just be a KPI dashboard. If it shows live machine status via WebSocket, the name works. If it is a static summary page, it overpromises.

---

## 8. Names That Are Too Clever or Obscure

Ranked from most problematic to least:

1. **FloorPlan** -- Active misdirection. Rename immediately.
2. **BuyDesk** -- No one calls purchasing a "buy desk." Too cute.
3. **FinishLine** -- Sounds like a shoe store or a race. Does not say "secondary operations."
4. **PrintScan** -- Sounds like a peripheral driver, not a blueprint-to-quote tool.
5. **SimLab** -- Overpromises simulation capability.
6. **MetalMarket** -- Implies trading, not lookup.
7. **SafeTeam** -- Mixes safety (physical) with compliance (legal/HR).
8. **WinRate** -- Sales jargon that may not resonate with shop floor users.
9. **ProfitPulse** -- Overly metaphorical.
10. **OrderPulse** -- Same issue as ProfitPulse; "Pulse" does not add clarity.

---

## 9. Should the Naming Follow a Consistent Pattern?

**Yes, but a lightweight one.** A rigid pattern (all "Forge," all "IQ") becomes a straitjacket and leads to forced names. Instead, I recommend this principle:

> **Every feature name must pass the "shop floor phone test": if a machinist calls the front office and says "open [name]," the person on the other end should know exactly which screen to navigate to without further explanation.**

This means:
- **Prefer descriptive 1-2 word names** over branded compounds
- **Use industry-standard terms** where they exist (TimeSheet, not TimeForge)
- **Reserve creative names** for features that genuinely lack an industry term
- **The PRISM brand provides cohesion** -- features do not need their own sub-brands

---

## Recommended Revised Naming Table

| Current Proposed Name | Recommended Name | Rationale |
|----------------------|-----------------|-----------|
| PRISM Calculator | **Speeds & Feeds** | Says exactly what it does. Every machinist knows this phrase. PRISM branding is implicit (they are already in PRISM). |
| CodeForge | **CodeForge** | KEEP. Strong metaphor, unique, clear to CNC programmers. This is the one feature that earns a creative name. |
| PathAdvisor | **PathAdvisor** | KEEP. Clear and specific. |
| Command Center | **Shop Dashboard** | More specific. "Dashboard" is expected; "Shop" scopes it. If it has live machine feeds, **Shop Monitor** works too. |
| Job Tracker | **Job Tracker** | KEEP. Plain, effective. |
| FloorPlan | **Scheduler** | Industry-standard term. No ambiguity. |
| CapacityIQ | **Capacity Planner** | Drop the "IQ" gimmick. "Planner" is what it does. |
| StockVault | **Inventory** | The original name was fine. Every ERP user knows "Inventory." "StockVault" adds nothing. |
| BatchOptimizer | **Batch Planner** | "Optimizer" overpromises. "Planner" is accurate. |
| QuoteForge | **Quote Builder** | The original name was actually clearer. "Builder" conveys the interactive construction of a quote. |
| PrintScan | **Blueprint Quote** | Keep the original. "Blueprint Quote" tells you: give me a blueprint, get a quote. |
| WinRate | **Quote Analytics** | Keep the original. Descriptive and clear. |
| FinishLine | **Secondary Ops** | Keep the original industry term. Every machinist knows "secondary ops." |
| MetalMarket | **Material Pricing** | Keep the original. Clear and direct. |
| CutPlanner | **CutPlanner** | KEEP. Clear action + object, no collision issues. |
| BillForge | **Invoicing** | Standard business term. No one needs a creative name for invoices. |
| ProfitPulse | **Financial Reports** | Or simply **Financials**. Descriptive, professional. |
| MarginTracker | **Job Costing** | Industry-standard term in manufacturing accounting. Every shop owner knows "job costing." |
| ToolSpend | **Tooling Costs** | Slightly more natural phrasing. |
| Crew | **Crew** | KEEP. Short, fits shop culture. |
| ClockIn | **Time Clock** | Industry-standard term, avoids ClockIn product collision. |
| TimeSheet | **Timecards** | "Timecard" is the physical-world term machinists already use. Or keep TimeSheet -- both work. |
| PayRoll | **Payroll** | KEEP (but as one word, which is the standard spelling). |
| SafeTeam | **HR Compliance** | Keep the original. "Compliance" is the correct domain term. |
| OpsCenter | **OpsCenter** | KEEP. Short, clear for ERP-level operations overview. |
| ProcessIQ | **Process Planner** | Drop "IQ." "Planner" says what it does. The AI aspect should be shown in the UI, not the name. |
| SimLab | **What-If Analysis** | Keep the original concept. "What-If" is universally understood in planning contexts. |
| RateCard | **Machine Rates** | Keep the original. "Rate Card" is fine too but "Machine Rates" is more specific. |
| OrderPulse | **Order Tracking** | Keep the original. Descriptive and clear. |
| ClientBook | **Customers** | Keep the original. Every business system calls it "Customers." |
| BuyDesk | **Purchasing** | Keep the original. Standard term. |
| PartView | **3D Viewer** | Keep the original. "Part View" could mean a BOM view or a detail view. "3D Viewer" is unambiguous. |
| DataVault | **Data Manager** | "Vault" implies cold storage. "Manager" implies active data operations. |
| SafeGuard | **Safety** | Simple, direct, avoids SafeGuard product collision. Or **Safety Dashboard** if more context is needed. |
| QualityGate | **QualityGate** | KEEP. Legitimate manufacturing term (quality gates in production flow). |
| InspectPro | **Inspection** | Standard term. "Pro" suffix is generic SaaS filler. |
| ReportForge | **Reports** | No one needs a creative name for reports. |
| ExportHub | **Exports** | Keep the original. Simple and clear. |
| PostStore | **Post Processors** | Keep the original. "PostStore" sounds like a marketplace. |
| CostIQ | **Cost Estimator** | Keep the original. Descriptive, professional. |
| PRISM Academy | **PRISM Academy** | KEEP. "Academy" is an established pattern for learning sections. |
| Config | **Settings** | "Config" is developer jargon. "Settings" is the universal user-facing term. |

---

## Revised Sidebar Groups

| Current Proposed | Recommended | Rationale |
|-----------------|-------------|-----------|
| Calculate | **Engineering** | Scopes to the technical calculation tools. "Calculate" is a verb, not a category. |
| Shop Floor | **Shop Floor** | KEEP. Perfect. |
| QuoteForge | **Quoting** | A group name should describe the category, not be a feature name. |
| Money | **Finance** | Professional. Every ERP uses this term. "Money" is too casual for a B2B product. |
| Crew | **People** | Slightly more inclusive (covers HR compliance + payroll + timekeeping, not just the "crew"). Alternatively, keep **Crew** if the target audience is exclusively small job shops. |
| Intelligence | **Analytics** | Universally understood. "Intelligence" is vague -- "analytics" immediately tells you: charts, data, insights. |
| Quality | **Quality** | KEEP. |
| Admin | **Admin** | KEEP. |

This gives you 8 groups, all one or two words, all instantly parseable by anyone in manufacturing.

---

## Summary of Principles

1. **The product is PRISM. Features do not need their own brand.** Let PRISM be the creative name; let features be functional names.
2. **When an industry-standard term exists, use it.** Machinists already have a shared vocabulary: speeds and feeds, secondary ops, job costing, purchasing. Use their words.
3. **Reserve creative names for genuinely novel features.** CodeForge earns it because "G-code generator" is a mouthful and "forge" captures the craft. QualityGate earns it because it is already a manufacturing term.
4. **One creative suffix per product, maximum.** If you use "Forge," use it once.
5. **Sidebar groups are wayfinding, not branding.** They should be the most boring, most obvious category labels possible. Users do not admire sidebar group names; they scan them in 200ms to find where to click.
6. **The "shop floor phone test" should be the gatekeeper** for every name. If it needs explanation, it needs a new name.
