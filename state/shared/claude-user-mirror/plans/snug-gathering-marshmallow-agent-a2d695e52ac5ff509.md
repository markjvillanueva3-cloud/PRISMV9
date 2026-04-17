# PRISM Pricing Strategy Critique — SaaS Pricing Strategist Review

## Executive Summary

The current pricing design has a fundamental contradiction: APP-MS0 specifies **Free/Machinist/Programmer/Engineer/Enterprise** but the already-built `PricingTable.tsx` implements **Free/Starter/Pro/Shop/Enterprise** at $0/$29/$79/$199/$499. These need to be reconciled before any more code is written. Beyond that inconsistency, the 5-tier model is overcomplicated for the manufacturing vertical, the feature gating logic is unspecified, and the add-on model creates decision fatigue. Below is a point-by-point critique of all 8 questions.

---

## 1. Is 5 Tiers Too Many?

**Verdict: Yes. Reduce to 3 tiers + 1 self-serve Enterprise contact.**

### The Problem

Five paid tiers (or 4 paid + free) create three concrete harms in B2B manufacturing SaaS:

- **Decision paralysis.** A machinist evaluating PRISM has 6-8 minutes of patience. Comparing 5 columns with 8+ feature rows means 40+ cells to scan. Research from the Hick-Hyman law and SaaS conversion studies (Paddle 2024, OpenView 2023) shows that going from 3 to 5 options reduces conversion by 15-25%.

- **Internal confusion.** When a shop owner is comparing "Machinist" vs. "Programmer" tiers, the question becomes: "Am I a machinist or a programmer?" In a real shop, the same person often does both. Role-based tier naming forces customers to self-categorize into boxes that don't match their actual workflow.

- **Existing code conflict.** `PricingTable.tsx` already implements Free/Starter/$29/Pro/$79/Shop/$199/Enterprise/$499. APP-MS0 says Free/Machinist/Programmer/Engineer/Enterprise. Two different mental models in the same codebase.

### The Recommendation

| Tier | Name | Price | Who It's For |
|------|------|-------|-------------|
| Free | **PRISM Free** | $0 | Individual machinists, students, evaluators |
| Paid | **PRISM Pro** | $49/mo ($39/mo annual) | Working machinists, programmers, estimators — one seat |
| Paid | **PRISM Shop** | $199/mo ($159/mo annual) | Shop owners — multi-seat, quoting, ERP, scheduling |
| Contact | **Enterprise** | Custom | Multi-location, SSO, API, SLA, on-prem |

**Why 3 tiers work for manufacturing:**

- **HSMAdvisor** (closest competitor to the SFC calculator) uses a single $129 one-time purchase. No tiers at all. That simplicity is why machinists actually buy it.
- **ProShop ERP** (closest competitor to the shop management side) uses a flat "starts at $995/mo" with seat-based scaling. No feature matrix to decode.
- **Machining Cloud** gives away the tool database for free, monetizing through manufacturer partnerships. PRISM's 86K tool catalog is a natural free hook.

The "Machinist vs. Programmer vs. Engineer" distinction is an internal product management taxonomy, not a customer-facing buying decision. A CNC programmer does not think "I'm a $29/mo person, not a $79/mo person." They think "Does this tool solve my problem? What does it cost?"

### Mapping the 5 Tiers to 3

| Old Tier | Maps To | Rationale |
|----------|---------|-----------|
| Free | Free | Same |
| Machinist ($29) | Pro ($49) | Machinist + Programmer merge; the features at $29 are too limited to be useful, so $29 churns to $0 or upgrades to $49 |
| Programmer ($79) | Pro ($49) | Core user, gets everything a single contributor needs |
| Engineer ($199) | Shop ($199) | Reframe from "engineering features" to "shop management features" — the real differentiator is multi-seat + quoting + ERP |
| Enterprise ($499) | Enterprise (custom) | Remove fixed price; enterprise deals are always negotiated |

---

## 2. What Features Gate Each Tier?

**Verdict: The plan mentions tier badges (P0-U02 acceptance criteria) but never specifies which of the 1,003+ engines/actions belong to which tier. This is the most critical gap in the entire APP-MS0 milestone.**

### The Problem

P0-U01 says: "Every dispatcher action mapped to a tier." That's 1,286 actions across 53 dispatchers. But nowhere in the plan or the milestone JSON is there an actual mapping. Without this, the engineering team will make arbitrary decisions file-by-file, creating inconsistencies that are painful to fix post-launch.

### The Recommended Feature Map (3-tier model)

| Feature Area | Free | Pro ($49/mo) | Shop ($199/mo) |
|-------------|------|-------------|----------------|
| **PRISM Calculator (SFC)** | 5 calcs/day, basic results | Unlimited, full results (force, torque, power, deflection, MRR) | Unlimited + comparison mode + export |
| **Material database** | Full 2,957 materials (read-only) | Full + custom materials | Full + custom + API |
| **Tool catalog** | Full 86K tools (browse) | Full + "My Tools" crib + import/export | Full + shop-wide tool crib + purchase integration |
| **Machine database** | Full 910 machines (browse) | Full + "My Machines" saved | Full + shop-wide fleet management |
| **Post processing** | View sample output | 3 controllers included, buy more a-la-carte | 10 controllers included + custom post dev |
| **G-code simulation** | -- | Basic (force/thermal plots) | Full + Monte Carlo + safety analysis |
| **Quoting** | -- | Basic quote builder (5/mo) | Full quoting pipeline + PDF export + history + analytics |
| **Job tracking** | -- | -- | Full Kanban, scheduling, routing |
| **ERP features** | -- | -- | Inventory, purchasing, financial dashboard |
| **HR/Payroll** | -- | -- | Full crew management |
| **Quality/Compliance** | -- | -- | SPC, FAI, AS9100, CoC generation |
| **API access** | -- | -- | REST API (or Enterprise add-on) |
| **Seats** | 1 | 1 | 5 included, $29/mo per additional |
| **Support** | Community forum | Email (48h SLA) | Priority (4h SLA) + onboarding call |

### The Gating Principle

**Gate by workflow scope, not by calculation depth.** A machinist running a speed-and-feed check should never hit a paywall mid-calculation. The paywall belongs between "calculate" and "manage my shop." This means:

- **Calculations are generous in Free.** 5/day is enough to evaluate the product seriously. Not so much that a production user can avoid paying.
- **Data is free.** Materials, tools, machines — never gate read access to reference data. This is how Machining Cloud built a massive user base. PRISM's 86K tool catalog is the growth engine.
- **Workflows are paid.** Quoting, scheduling, ERP, quality — these are complex workflows that justify subscription pricing because they replace expensive standalone software (ProShop: $995/mo, JobBOSS: $500/mo, E2 Shop: $400/mo).

---

## 3. Should the PRISM Calculator (SFC) Be Free or Gated?

**Verdict: Free with metering. The calculator is the top-of-funnel product. Gating it kills growth.**

### The Argument for Free (with limits)

The SFC calculator is to PRISM what the spreadsheet is to Google Workspace — the thing people come for, which creates the habit that sells the platform. Consider:

- **HSMAdvisor charges $129 one-time for a desktop-only calculator.** If PRISM's web-based calculator is free, every HSMAdvisor evaluation becomes a PRISM evaluation too. The web advantage (no install, always updated, mobile-friendly) is massive.
- **Machining Cloud gives away tool data + basic feeds/speeds for free.** Manufacturers subsidize it because it drives tool purchases. PRISM could explore similar manufacturer partnerships later.
- **The 5/day limit is the conversion mechanism.** A student or hobbyist runs 2-3 calcs and is happy. A production machinist hits the limit by 10am and upgrades. This is the same model that works for Figma (3 free projects), Vercel (100 deploys/mo), and Notion (1,000 blocks).

### The Argument Against Fully Free (no limits)

If the calculator is completely unlimited and free, there is no reason for a solo machinist to ever pay. The $49/mo Pro tier needs a value gap. That gap is:

1. **Full results** — Free shows speed, feed, RPM, feed rate. Pro adds cutting force, torque, power, MRR, deflection estimate, surface finish prediction, tool life estimate.
2. **Export** — Free shows results on screen. Pro exports to CSV, PDF, clipboard, and can send results to a quote.
3. **History and comparison** — Free has no history. Pro saves last 100 calculations and enables side-by-side comparison.
4. **Custom materials/tools** — Free uses the built-in databases. Pro lets you add your shop's specific material grades and custom tools.

### The Specific Implementation

```
Free:  5 calculations/day
       Basic results (speed, feed, RPM, feed_rate, safety score)
       No export, no history, no custom data
       Full database access (browse only)

Pro:   Unlimited calculations
       Full results (+ force, torque, power, MRR, deflection, Ra, tool life)
       Export (CSV, PDF, clipboard)
       History (100 saved), Comparison mode
       Custom materials + "My Tools" crib
       3 post-processor controllers included
```

This means the `SfcCalculatorPage.tsx` tier gating logic at line P1-U03 ("Free=5/day, Machinist+=unlimited") is approximately right but needs the results-depth gating added.

---

## 4. Is the Add-On Model Good or Confusing?

**Verdict: The general concept is sound, but the current framing (CAD Recognition $39/mo, AI $49/mo as separate line items) creates decision fatigue. Restructure as a simpler model.**

### The Problem with Granular Add-Ons

The plan mentions add-ons but doesn't define them concretely. If we infer from the billing API (`purchasePost` for individual controllers) and the milestone description ("a la carte add-ons"), the model seems to be:

- Base subscription (one of 5 tiers)
- Plus individual add-ons at $X/mo each
- Plus per-controller post-processor purchases

This creates a "cable TV bundle" problem. A shop owner comparing PRISM to ProShop ($995/mo, everything included) now has to do arithmetic: "$199/mo + $39 CAD + $49 AI + $15/controller x 3 = $332/mo... or is the AI included in Engineer? Let me re-read the matrix..." They abandon the page.

### The Recommended Add-On Structure

**Only 2 add-ons, both clearly positioned:**

| Add-On | Price | What It Includes | Available On |
|--------|-------|-----------------|-------------|
| **Post Processor Pack** | $19/mo per controller (or $149 one-time permanent license) | G-code post processor for a specific controller dialect (Fanuc, Haas, Siemens, etc.) | Pro and Shop |
| **API Access** | $99/mo | REST API, webhooks, batch calculations, integration endpoints | Shop and Enterprise |

Everything else (CAD recognition, AI features, advanced simulation) should be bundled into the tier it belongs to, not sold separately. The reason:

- **Post processors are naturally a-la-carte** because shops only need the 2-3 controllers they own. A Haas-only shop shouldn't pay for Siemens posts. This is how Autodesk sells Fusion 360 post-processors and how BobCAD sells controller packs. The existing `purchasePost` API already supports this model.
- **API access is a clear enterprise upsell** because only shops with ERP integrations or custom dashboards need it. It's binary: you need it or you don't.
- **AI, CAD recognition, and advanced simulation are perceived as "product quality" not "optional modules."** When PRISM recommends cutting parameters using AI, the user doesn't think "I'm using the AI add-on" — they think "this product is smart." Gating it as a separate purchase makes the base product feel deliberately crippled.

### Post Processor Pricing Detail

The `purchasePost` API already supports monthly/annual/permanent purchase types. The recommended pricing:

| Purchase Type | Price | When It Makes Sense |
|--------------|-------|-------------------|
| Monthly | $19/mo | Trying a new controller, short-term project |
| Annual | $179/yr ($14.92/mo) | Production use, known need |
| Permanent | $149 one-time | Budget-conscious shops, comparable to standalone post-processor purchases ($99-$299 range) |

This is directly comparable to: Autodesk HSM posts ($0 — bundled), BobCAD posts ($195 one-time), Cimco ($300-500 per post). PRISM's $149 permanent is competitive.

---

## 5. How Does Usage-Based Pricing Work for a Manufacturing Tool?

**Verdict: Pure usage-based pricing is wrong for manufacturing. Use metered free tier + unlimited paid tiers.**

### Why Per-Calculation Pricing Fails in Manufacturing

Manufacturing is not like API calls or cloud compute. The usage pattern is:

- A machinist programs 5-15 new jobs per week, each needing 2-5 speed-and-feed calculations.
- Cycle: intense usage during job setup (maybe 20 calcs in a morning), then zero for days while the machine runs.
- A shop of 5 machinists might collectively run 100-400 calcs/month during busy periods, 30-50 during slow periods.

Per-calculation pricing creates anxiety about "wasting" a calculation on exploration. A machinist should feel free to try "what if I use a smaller endmill?" or "what if I bump feed 10%?" without thinking about cost. **This kills the exploratory behavior that makes the tool indispensable.**

### The Right Metering Model

| Tier | Metering | Rationale |
|------|----------|-----------|
| Free | 5 calculations/day (resets at midnight UTC) | High enough to evaluate seriously, low enough to convert production users |
| Pro | Unlimited | No friction. This is what the $49/mo pays for. |
| Shop | Unlimited for all seats | No per-seat metering on calculations. Seats are metered, not actions. |

**What to meter on the free tier:**
- Speed & feed calculations: 5/day
- Quote generations: 0 (Pro+ feature)
- Post-processor runs: 0 (Pro+ feature, requires purchased controller)
- Report exports: 0 (Pro+ feature)

**What NOT to meter:**
- Database browsing (materials, tools, machines): unlimited on all tiers
- Saving preferences and defaults: unlimited on all tiers
- Learning content (PRISM Academy): unlimited on all tiers

### Implementation Note

The existing `SfcCalculatorPage.tsx` tier gating line ("Free=5/day, Machinist+=unlimited") is correct in principle. The implementation should be:

1. `checkAccess(userId, 'sfc:calculate')` returns `{ allowed: boolean, remaining?: number, resetAt?: Date }`
2. Show remaining count in the UI as a subtle pill: "3 of 5 free calculations remaining today"
3. When limit hit: show upgrade prompt with comparison of free vs. Pro results
4. Never block mid-calculation. If they started it, show the result. Count it against the limit, but don't truncate results after the fact. Truncating results after the user already invested effort feels punitive.

---

## 6. Competitive Pricing Range

**Verdict: PRISM is correctly positioned between free tools and enterprise ERP, but needs to be more aggressive on the calculator tier and more clearly differentiated on the shop management tier.**

### Competitive Landscape

| Competitor | Model | Price | What It Does | PRISM Overlap |
|-----------|-------|-------|-------------|---------------|
| **HSMAdvisor** | One-time purchase | $129 | Desktop S&F calculator, tool deflection, power | PRISM Calculator (SFC) |
| **Machining Cloud** | Free (manufacturer-funded) | $0 | Tool catalog, basic feeds/speeds, machine specs | Tool/machine/material databases |
| **FSWizard** | One-time / subscription | $5-40 (mobile) | Mobile S&F calculator | PRISM Calculator mobile |
| **ProShop ERP** | SaaS subscription | $995-2500/mo | Full shop ERP, quality, scheduling | Shop tier + Quality + Scheduling |
| **JobBOSS2** | SaaS subscription | $400-800/mo | Job tracking, quoting, scheduling | Shop tier |
| **E2 Shop** | SaaS subscription | $400-600/mo | ERP for small job shops | Shop tier |
| **Mastercam** | Annual subscription | $10,000-25,000/yr | CAM software with built-in S&F | Indirect — PRISM complements CAM |
| **Fusion 360** | Annual subscription | $680/yr (personal $0) | CAD/CAM with integrated mfg | Indirect — PRISM is deeper on calcs |
| **Kennametal NOVO** | Free | $0 | Tool selection + recommendations | Tool catalog + recommendations |

### Pricing Positioning Analysis

**The PRISM Calculator (Free/Pro):**
- Must be free enough to beat HSMAdvisor's one-time $129 barrier. A machinist doing the math: "Free PRISM forever vs. $129 HSMAdvisor?" is an easy win for PRISM.
- At $49/mo Pro, PRISM pays for itself after 3 months vs. HSMAdvisor — but only if the calculator is meaningfully better (more materials, real-time, web-based, integrated with quoting). The value proposition must be "HSMAdvisor gives you a number; PRISM gives you a number AND connects it to your quote, your job, your shop."

**The PRISM Shop ($199/mo):**
- At $199/mo vs. ProShop at $995/mo, PRISM is 80% cheaper. This is a strong position IF the ERP features are genuinely usable (not just stubs).
- The risk: if the quality/scheduling/quoting features feel half-baked compared to ProShop, the $199/mo feels expensive for "a calculator with some extras." Feature depth on the shop tier must be production-ready, not MVP.
- JobBOSS2 at $400-800/mo is the more realistic comparison. PRISM at $199/mo is a compelling alternative for 5-20 person shops that find JobBOSS too expensive.

**Enterprise:**
- Remove the $499/mo fixed price. Enterprise manufacturing customers (50+ seats, multiple locations, AS9100, ITAR) always negotiate. The $499/mo cap actually leaves money on the table. A 50-person aerospace shop would happily pay $2,000-5,000/mo for compliant shop management software. Use "Contact Sales" instead.

### Price Sensitivity Warning

Machine shop owners are notoriously price-sensitive on software. Many still use paper travelers and Excel spreadsheets. The conversion funnel is:

1. Free calculator gets them in the door (30-60 day evaluation)
2. They hit the 5/day limit and upgrade to Pro ($49/mo — "less than a broken endmill")
3. After 3-6 months using Pro, they start using quoting features
4. Quoting ROI makes Shop tier ($199/mo) an obvious upgrade ("I quoted $2K more accurately this month because of PRISM")
5. Enterprise comes from inbound ("We have 3 locations and need SSO")

This funnel takes 6-12 months. Do not expect immediate Shop-tier conversions from cold traffic.

---

## 7. Should the Onboarding Wizard Immediately Show Pricing?

**Verdict: Absolutely not. The onboarding wizard (Phase 2, Sprint 3) should focus entirely on getting the user to their first successful calculation. Pricing shows only when they hit a limit or actively seek it.**

### The Optimal Onboarding Flow

```
Step 1: Welcome + Role
        "What do you do?"
        [Machinist] [Programmer] [Shop Owner] [Student]
        (This sets experience level defaults and sidebar ordering — NOT tier assignment)

Step 2: Quick Setup
        "What machines do you run?"
        [Search and add 1-3 machines]
        "What materials do you usually cut?"
        [Quick-pick common materials: 6061, 4140, 304SS, Ti-6Al-4V]

Step 3: First Calculation
        "Let's run your first speed & feed calculation."
        [Pre-fill material + operation from Step 2 selections]
        [Auto-calculate with defaults]
        [Show results with "This is what PRISM can do" moment]

Step 4: Dashboard
        "Your workspace is ready."
        [Route to role-appropriate page]
        [Show "3 of 5 free calculations remaining today" if on free tier]
```

**No pricing shown during onboarding.** The user hasn't experienced the product yet. Showing pricing before value is like a restaurant handing you the check before the food arrives.

### When to Show Pricing

| Trigger | What to Show | Tone |
|---------|-------------|------|
| User hits 5/day calc limit | Inline upgrade prompt in results area: "You've used all 5 free calculations today. Upgrade to Pro for unlimited calculations, detailed force/power analysis, and export." | Helpful, not blocking |
| User clicks a Pro-gated feature (export, comparison, custom tools) | Tooltip or small modal: "Export is available on Pro. See what's included." | Informational |
| User clicks a Shop-gated feature (quoting, scheduling, jobs) | Feature preview with upgrade CTA: show a screenshot/mockup of the feature with "Available on PRISM Shop" | Aspirational |
| User navigates to Settings > Billing | Full pricing page with comparison matrix | Detailed |
| User clicks "Upgrade" badge in sidebar/header | Full pricing page | Direct |

### What the Plan Gets Right (Phase 2.1)

The onboarding wizard steps in the plan (Role select, Experience level, Quick shop setup, "Dashboard ready") are structurally correct. The improvement is: add a "first calculation" step between setup and dashboard. Don't send someone to an empty dashboard.

---

## 8. How Does the Feature Gating UI Work Without Being Annoying?

**Verdict: Three levels of gating, from softest to hardest. Never use lock overlays on primary content.**

### The Gating Hierarchy

**Level 1: Soft Limits (Free tier calculation metering)**
- Show a subtle usage counter: `[3/5 free calculations today]` as a small pill in the results header
- When exhausted: replace the "Calculate" button text with "Upgrade to Continue" and show a single-sentence explanation
- Do NOT grey out or lock the entire page. The user should still be able to browse databases, change parameters, and see their last result
- Next-day reset: show "Your free calculations reset in 4 hours" countdown

**Level 2: Feature Preview (Pro features shown on Free)**
- For export, comparison, custom tools: show the UI element in a "preview" state
- The Export button exists but opens a small upgrade popover on click, not a full-page redirect
- The Comparison tab exists but shows "Save your first comparison — available on Pro" with a single CTA
- This is the Figma/Notion model: you can SEE what you're missing, but you're not slapped in the face with lock icons

**Level 3: Section Gate (Shop-only features)**
- For quoting, scheduling, jobs, ERP, HR, quality: these are entirely separate pages
- The sidebar shows these items but with a small "Pro" or "Shop" badge (not a lock icon)
- Clicking a gated sidebar item routes to a dedicated feature preview page (not a blank page with a lock)
- The preview page shows: hero screenshot, 3 bullet points of value, pricing comparison for their current tier vs. the tier that includes it, and a CTA

### What NOT to Do

- **No lock overlays on results.** The plan mentions "Lock overlay component for gated features" (P0-U02). Never use this on calculation results. A machinist who just entered 8 parameters and clicked Calculate should never see a padlock on the RPM field. Show the basic results and upsell the advanced results.
- **No modal interruptions.** Never show a "Upgrade Now!" modal unprompted. Modals are only for explicit user actions (clicking an upgrade button).
- **No feature degradation.** Don't make the free experience feel broken. It should feel complete but limited in scope. "You got a great answer; here's how to get an even better one" not "Here's half an answer; pay to see the rest."
- **No nag banners.** A persistent "You're on the Free plan!" banner at the top of every page is counterproductive. Upgrade prompts should be contextual (triggered by hitting a limit or clicking a gated feature), not ambient.

### Implementation Specifics for `product-catalog.ts`

The P0-U01 acceptance criteria calls for `checkAccess(userId, action) -> boolean`. This should be expanded:

```typescript
interface AccessResult {
  allowed: boolean;
  reason?: 'plan_limit' | 'feature_gate' | 'seat_limit';
  remaining?: number;        // for metered features
  resetAt?: Date;            // for daily limits
  requiredTier?: string;     // what tier unlocks this
  upgradeUrl?: string;       // direct link to upgrade
}

function checkAccess(userId: string, action: string): AccessResult;
```

This lets the UI render the appropriate gating level based on the `reason` field rather than just showing "locked."

---

## Summary of Recommended Changes to APP-MS0

### Changes to P0-U01 (Product Catalog)

1. **Reduce to 3 tiers** (Free / Pro $49 / Shop $199) + Enterprise (contact sales)
2. **Create explicit feature-to-tier mapping** for all 53 dispatchers — this is the most critical missing artifact
3. **Limit add-ons to 2**: Post Processor Pack ($19/mo per controller) and API Access ($99/mo)
4. **Replace boolean `checkAccess` with `AccessResult` object** that includes reason, remaining count, and upgrade path
5. **Define metering only on Free tier**: 5 calcs/day, 0 quotes, 0 exports

### Changes to P0-U02 (Design System)

1. **Replace 5 tier badge colors with 3**: Free=gray, Pro=blue, Shop=purple. Drop Machinist/Programmer/Engineer colors.
2. **Replace "Lock overlay" component with 3 gating components**: UsageMeter, FeaturePreview, SectionGate
3. **Add UpgradePopover component**: lightweight popover (not modal) for contextual upgrade prompts

### Changes to P1-U01 (Landing/Pricing Page)

1. **3-column pricing table** (not 5) with annual/monthly toggle
2. **Separate "Post Processor" add-on card** below the pricing table
3. **Feature comparison matrix simplified** to ~10 rows (not 8+ rows x 5 columns)

### Changes to P1-U03 (SFC Calculator Page)

1. **Free tier shows full basic results** (speed, feed, RPM, feed_rate, safety)
2. **Pro results add**: force, torque, power, MRR, deflection, Ra, tool life
3. **Pro features add**: export, history, comparison, custom data
4. **Usage counter in results header**, not a blocking overlay

### Reconcile PricingTable.tsx

The existing component at `web/src/components/billing/PricingTable.tsx` must be updated:
- Current: Free/$0, Starter/$29, Pro/$79, Shop/$199, Enterprise/$499
- Target: Free/$0, Pro/$49, Shop/$199, Enterprise/Contact Sales
- The FEATURES array must be rebuilt with the actual feature-to-tier mapping from P0-U01

### No Changes Needed

- The billing API (`web/src/api/billing.ts`) is well-structured and supports the recommended model
- The `purchasePost` endpoint already supports the per-controller add-on model
- The onboarding wizard design (Phase 2) is structurally sound; just ensure no pricing during onboarding
- The Stripe checkout flow is correct; just reduce the number of checkout variants

---

## Risk: The "Everything Free" Trap

One final caution. The plan has 1,003 engines and 1,286 actions. The temptation will be to make most of them free ("we need usage data to validate the model"). This is how PLG companies end up giving away the product and never converting. The discipline required:

- **Free = individual contributor, limited scope, evaluation mode.** It should feel generous but clearly incomplete for production use.
- **Pro = production individual.** Everything a single person needs to do their job without friction.
- **Shop = production team.** Everything a shop needs to replace their patchwork of Excel + paper + separate ERP.

The gating line is not "basic vs. advanced calculations." It is "individual vs. team, evaluation vs. production." This framing makes the pricing feel natural rather than punitive.
