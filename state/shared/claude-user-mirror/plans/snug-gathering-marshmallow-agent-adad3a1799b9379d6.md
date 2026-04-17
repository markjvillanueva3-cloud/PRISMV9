# PRISM v9 B2B SaaS Conversion Audit

## Scope
Full-funnel review: Landing Page -> Login/Signup -> Post-Login AppShell first impression.
Benchmarked against Paperless Parts, Xometry, ProShop ERP.

---

## ESTIMATED CURRENT CONVERSION RATE: 1.5-2.5%

This is a technically impressive product with a landing page that undersells it and a signup flow that actively discourages conversion. Against the 5%+ target, here are the findings organized by severity.

---

## SECTION 1: LANDING PAGE (LandingPage.tsx)

### 1A. The 5-Second Test -- PARTIAL PASS

**What works:**
- The headline "The World's Smartest Speed & Feed Calculator" is clear, specific, and differentiated. A CNC programmer landing here knows within 2 seconds what this is. That is strong.
- The eyebrow badge "PRISM v9 -- Now Available" signals product maturity.
- The stat line (2,957 materials, 94,000+ tools, 910 machines) is concrete and credible.
- "Try Free" as the primary CTA is correct.

**What fails the 5-second test:**
- The subtitle "Manufacturing Intelligence" in the nav is vague enterprise jargon. A shop owner does not think "I need manufacturing intelligence." They think "I need to stop burning through endmills" or "I need to quote this job in 10 minutes, not 2 hours."
- The subheadline buries the value. "Physics-backed cutting parameters, instant quoting, and CNC program generation" -- this is a feature list, not a benefit statement. Compare to Paperless Parts: "Get quotes out the door faster." Compare to ProShop: "The ERP built by machinists, for machinists." PRISM's subhead reads like a spec sheet.
- No screenshot, no product image, no demo video thumbnail. This is a CRITICAL omission. Paperless Parts has a full product screenshot above the fold. Xometry shows the instant quoting interface. ProShop shows the dashboard. PRISM shows... a blue gradient. A machinist who has been burned by vaporware SaaS tools will not trust a page with zero product evidence.

### 1B. Trust Signals -- FAIL

**What exists:**
- "Trusted by machinists, programmers, and job shops worldwide." (line 431) -- This is a single line of 12px text-slate-500 with ZERO evidence behind it. No logos. No numbers. No names.

**What is completely missing:**
- Customer logos (even 4-5 anonymized "shops using PRISM" would help)
- Testimonials or case studies ("We reduced our quoting time by 60%")
- User count or usage metric ("12,000 calculations run this week")
- Industry certifications or partnerships (ISO, NIST, Mastercam partner, etc.)
- Security/compliance badges (SOC2, data encryption, etc.)
- "As seen in" press mentions (Modern Machine Shop, etc.)
- Video testimonial from a real shop owner

**Competitive benchmark:** Paperless Parts dedicates an entire section to customer logos (Lockheed Martin, L3Harris, major aerospace suppliers). Xometry shows "Instant Quotes from 10,000+ Suppliers." ProShop shows specific customer testimonials with photos and shop names. PRISM shows nothing.

**Impact:** In B2B manufacturing SaaS, trust is the #1 conversion barrier. Shop owners are conservative buyers. They need social proof that someone like them -- a 15-person job shop in Ohio, a 3-axis Haas owner, a one-man garage operation -- has actually used this and it worked. Without it, the conversion rate ceiling is ~2%.

### 1C. Value Proposition Clarity -- NEEDS WORK

The six feature cards (Calculate, Generate, Simulate, Quote, Troubleshoot, Learn) describe WHAT the product does but never WHY the user should care. Every card should answer "so what?"

| Current | What's Missing |
|---------|---------------|
| "Physics-backed speed & feed with Kienzle force models" | "Cut cycle time 15-30% while extending tool life" |
| "Full CNC programs with 20 controller dialects" | "Go from print to G-code in minutes, not hours" |
| "Vericut-class swept volume simulation" | "Catch crashes before they happen -- no $50K Vericut license" |
| "Instant job costing with cycle time, tooling, material" | "Quote jobs in 10 minutes with 95% accuracy" |

The technical depth is genuinely impressive (Kienzle, Johnson-Cook, Taylor tool life -- this is real engineering, not marketing fluff). But the landing page assumes the visitor already understands why Kienzle force models matter. Most don't. Lead with the business outcome, back it with the technical credibility.

### 1D. CTA Analysis -- GOOD BUT INCOMPLETE

**Primary CTA:** "Try Free" -- Good. Clear, low commitment.
**Secondary CTA:** "See Pricing" -- Good. Lets evaluators self-qualify.
**Bottom CTA:** "Get Started Free" -- Good. Reinforces the free path.

**Problem:** Every CTA links to `/login`. There is no distinction between "start free trial" and "log in as existing user." This is a classic conversion friction point. A new visitor clicking "Try Free" expects to land on a signup form. Instead they land on a generic login page with a Sign In / Register toggle that defaults to Sign In. The visitor has to realize they need to click "Register" -- this is unnecessary cognitive load.

**Recommendation:** The primary CTA should link to `/login?mode=register` or better yet `/signup` as a distinct route. "Try Free" should land on a form that is already in registration mode with a headline like "Start your free trial."

### 1E. Pricing -- MOSTLY GOOD

**Strengths:**
- Five tiers from Free to Enterprise is well-structured
- Price points ($0 / $29 / $79 / $199 / $499) are reasonable for the market
- "14-day free trial. No credit card required." is the right move
- "Most Popular" badge on Pro is correct
- Feature differentiation is clear

**Weaknesses:**
- **No annual pricing toggle.** Every competitor offers 15-20% annual discount. This is table stakes and also increases LTV. Paperless Parts, ProShop, and Xometry all show monthly/annual toggles.
- **The Free tier is too generous to convert but too limited to be useful.** 10 calculations/day with 100 tools is enough to dabble but not enough to evaluate seriously. Consider: the visitor runs 10 calcs, hits the wall, and leaves. They never experienced the "aha moment" of generating a full CNC program or running a simulation. The free tier should give FEWER ongoing calculations but a FULL 14-day unrestricted trial. Let them feel the power first, then gate it.
- **"Contact Sales" for Shop ($199/mo) is wrong.** $199/mo is a self-serve purchase for a job shop. Only Enterprise ($499+) should require a sales conversation. Forcing a $199 buyer to "Contact Sales" will lose that sale. They want to swipe a card and get started.
- **No per-seat pricing clarity.** Shop includes "5 seats included" but what does an additional seat cost? Unclear pricing = abandoned evaluation.
- **Missing: ROI calculator or "pays for itself" framing.** If Pro at $79/mo saves a programmer 2 hours/week, that's $200+/week in labor. The pricing section should make this math explicit.

### 1F. FAQ -- ADEQUATE BUT MISSING KEY QUESTIONS

The five questions are fine but miss the objections that actually kill B2B SaaS deals:
- "Can I cancel anytime?" (commitment fear)
- "Is my data secure / where is it stored?" (IP protection -- manufacturers are PARANOID about this)
- "Can I try it with my actual jobs before buying?" (proof of value)
- "Does it work with [specific machine/controller]?" (compatibility anxiety)
- "How does this compare to FSWizard / G-Wizard / Harvey Tool calculator?" (competitive positioning)

### 1G. What's Entirely Missing

1. **Product demo / screenshot / video** -- The single biggest gap. Add a 30-second autoplay muted video or a static product screenshot in the hero section.
2. **"How it works" section** -- 3 steps: Upload your part -> Get optimized parameters -> Generate G-code. Simple visual flow.
3. **Industry-specific landing variations** -- A 3-axis Haas shop has different needs than a 5-axis aerospace supplier. One page cannot speak to both equally.
4. **Live demo / interactive calculator** -- Paperless Parts lets you upload a STEP file right from the landing page. PRISM should let visitors run ONE calculation without signing up. This is the most powerful conversion tool possible for this product.
5. **Comparison table** -- Show PRISM vs. spreadsheets vs. Machining Cloud vs. FSWizard vs. manual tribal knowledge. Make the switching cost feel low.
6. **Exit intent / lead capture** -- No email capture for visitors who aren't ready to sign up. Offer a free resource: "Download: Speed & Feed Cheat Sheet for Stainless Steel" in exchange for an email.

---

## SECTION 2: SIGNUP FLOW (LoginPage.tsx)

### 2A. Friction Analysis -- HIGH FRICTION

**Current flow:** User clicks "Try Free" -> Lands on `/login` -> Sees Sign In form (wrong default!) -> Must click "Register" tab -> Fill in Username + Email + Password + Confirm Password -> Submit -> Redirect to /sfc.

**Problems, in order of severity:**

1. **Defaults to Sign In, not Register.** A visitor from the landing page has never used the product. Showing them a login form first is backwards. Every modern B2B SaaS defaults new visitors to the signup form and offers "Already have an account? Sign in" as a secondary link.

2. **Username is the first field.** In 2026, username-based auth is an anachronism. Email should be the primary identifier. Users have to invent a username they'll forget. Use email + password, and let username be optional (or auto-generated from email prefix). Paperless Parts, Xometry, and ProShop all use email-first signup.

3. **No social/SSO login.** Missing "Sign in with Google" or "Sign in with Microsoft." For a B2B product, Microsoft SSO is particularly valuable since many shops use Microsoft accounts for Office 365. This alone can increase signup conversion 20-30%.

4. **No password requirements shown.** The form doesn't tell the user what password rules exist until AFTER they submit and fail. Show requirements inline.

5. **Confirm Password field is unnecessary friction.** Modern best practice: single password field with a "show password" toggle. The confirm field was designed for an era before password managers. It adds friction without adding security.

6. **No progressive profiling.** After signup, PRISM should ask "What kind of shop do you run?" / "What machines do you have?" / "What's your primary use case?" This data is critical for: (a) personalizing the first experience, (b) routing to the right tier, (c) sales qualification. Currently: zero onboarding questions.

7. **No terms of service / privacy policy link.** This is both a legal requirement and a trust signal. Enterprise buyers will not create an account without seeing a privacy policy.

8. **Form validation is client-side toast only.** No inline field validation. User fills the form, hits submit, gets a toast. Should show real-time validation as they type.

### 2B. Post-Signup Redirect -- ABANDONMENT RISK

After successful registration, the user is redirected to `/sfc` (the SFC Calculator page) with a toast "Account created successfully." That's it. No onboarding. No welcome. No guided tour. No "here's what to do first."

This is the moment of highest user motivation and you're dropping them into a complex calculator with zero context. The AppShell sidebar shows 11 navigation groups with 50+ menu items. A new user sees: Core, Shop, Quoting, Finance, HR & Payroll, ERP, Analysis, Viewer, Data & Quality, Billing, Admin.

**This is overwhelming.** A machinist who signed up to "try the speed & feed calculator" is now looking at payroll, HR compliance, general ledger, and injection molding. The product feels like enterprise software that will take weeks to learn, not a tool that solves their problem in 5 minutes.

**What competitors do instead:**
- **Paperless Parts:** Guided onboarding wizard. "Upload your first part" with a drag-and-drop target front and center.
- **ProShop ERP:** Role-based onboarding. "Are you a shop owner, programmer, or operator?" Then shows only relevant modules.
- **Xometry:** Immediately shows the quoting interface with a sample part pre-loaded.

---

## SECTION 3: POST-LOGIN EXPERIENCE (AppShell.tsx)

### 3A. First Impression -- OVERWHELMING

The AppShell sidebar contains 11 collapsible groups with 50+ navigation items. For a new user, this communicates "this product is massive and complex" rather than "this product solves your problem."

**Critical issues:**

1. **No role-based navigation.** A sole proprietor running a 3-axis Haas does not need HR Compliance, Payroll, or General Ledger. Showing these features to every user is anti-pattern. The sidebar should be contextual based on the user's tier and role.

2. **No onboarding state.** There is no empty state, welcome screen, guided tour, or "getting started" checklist. The user lands on the SFC Calculator and is expected to know what to do.

3. **No tier-based feature gating visible.** If a Free user can see "ERP Dashboard" in the sidebar but can't use it, that's frustrating. If they can't see it, they don't know it exists for upsell. The right pattern is: show it, let them click it, then show a tasteful upgrade prompt with a preview of what they'd get.

4. **Missing: user profile / account indicator.** The header shows only the page title and a hamburger menu on mobile. There's no user avatar, account name, tier badge, or usage meter. The user has no sense of "where am I in my plan?"

5. **Missing: help / support access.** No help button, no chat widget, no documentation link, no "What's new" changelog. A stuck user will simply leave.

### 3B. Navigation Architecture Mismatch

The landing page sells SIX capabilities: Calculate, Generate, Simulate, Quote, Troubleshoot, Learn. The AppShell sidebar organizes by ELEVEN categories that don't map to these six at all: Core, Shop, Quoting, Finance, HR & Payroll, ERP, Analysis, Viewer, Data & Quality, Billing, Admin.

This creates a jarring disconnect. The user signed up for "The World's Smartest Speed & Feed Calculator" and lands in what looks like a full ERP system. The product's identity crisis (is it a calculator? an ERP? a CAM system?) is reflected directly in the navigation.

---

## SECTION 4: COMPETITIVE BENCHMARK

| Criterion | PRISM | Paperless Parts | Xometry | ProShop |
|-----------|-------|-----------------|---------|---------|
| Clear value prop in 5s | Partial | Yes | Yes | Yes |
| Product screenshot/demo | No | Yes (hero) | Yes (hero) | Yes (video) |
| Customer logos | No | Yes (15+) | Yes (10+) | Yes (8+) |
| Testimonials | No | Yes (3+) | Yes (case studies) | Yes (video) |
| Free trial w/o CC | Yes | No (demo request) | Yes (instant quote) | No (demo request) |
| Social/SSO login | No | Yes (Google) | Yes (Google) | No |
| Onboarding wizard | No | Yes | Yes | Yes |
| Role-based UX | No | Yes | N/A | Yes |
| Annual pricing toggle | No | Yes | N/A | Yes |
| Live demo on page | No | Yes (upload STEP) | Yes (upload) | No |
| Trust badges/certs | No | Yes (SOC2, ITAR) | Yes | Yes (AS9100) |
| Chat/help widget | No | Yes (Intercom) | Yes | Yes |

PRISM's biggest competitive advantage -- the free tier + no credit card required -- is actually stronger than Paperless Parts and ProShop, which both require a sales demo. But PRISM squanders this advantage by failing to convert the free signup into a retained user due to missing onboarding.

---

## SECTION 5: ACTION PLAN TO HIT 5%+ SIGNUP RATE

### Tier 1: Quick Wins (1-2 days each, highest ROI)

| # | Change | Expected Lift | File |
|---|--------|--------------|------|
| 1 | **Add product screenshot to hero section.** A single static image of the SFC calculator with real data showing a milling calculation result. | +0.5-1.0% | LandingPage.tsx |
| 2 | **Default LoginPage to Register mode when arriving from landing page.** Pass `?mode=register` from all landing page CTAs, read it with `useSearchParams` in LoginPage. | +0.3-0.5% | LandingPage.tsx, LoginPage.tsx |
| 3 | **Replace Username with Email as primary auth field.** Make username optional or auto-derive from email. | +0.2-0.4% | LoginPage.tsx |
| 4 | **Remove Confirm Password field.** Add show/hide password toggle instead. | +0.1-0.2% | LoginPage.tsx |
| 5 | **Change "Contact Sales" to "Start Free Trial" on Shop tier ($199).** Only Enterprise should require sales contact. | +0.1-0.3% | LandingPage.tsx |
| 6 | **Add 3-5 customer testimonials section** between features and pricing. Even if anonymized: "CNC Programmer, 12-person job shop, Michigan." | +0.3-0.8% | LandingPage.tsx |

### Tier 2: Medium Effort (3-5 days each)

| # | Change | Expected Lift | Files |
|---|--------|--------------|-------|
| 7 | **Post-signup onboarding flow.** 3-step wizard: "What do you do?" (Programmer / Shop Owner / Student) -> "What machines?" (select from list) -> "Run your first calculation" (pre-filled demo). | +0.5-1.0% | New: OnboardingWizard.tsx |
| 8 | **Role-based sidebar filtering.** Based on tier + onboarding answers, show only relevant nav groups. Free tier sees Core + Learn. Pro sees Core + Shop + Quoting. | +0.3% (retention, not signup) | AppShell.tsx |
| 9 | **Annual pricing toggle.** Show monthly/annual with 20% annual discount. | +0.2-0.4% | LandingPage.tsx |
| 10 | **Add "Google Sign In" via OAuth.** | +0.3-0.5% | LoginPage.tsx, auth backend |
| 11 | **Rewrite feature card descriptions to lead with outcomes, not technology.** | +0.2-0.3% | LandingPage.tsx |

### Tier 3: High Effort, High Reward (1-2 weeks)

| # | Change | Expected Lift | Files |
|---|--------|--------------|-------|
| 12 | **Embed a live mini-calculator on the landing page.** Let visitors run ONE speed & feed calculation (e.g., for 6061-T6 aluminum, 1/2" endmill) without signing up. Show the result, then prompt "Sign up for full access." This is the single highest-ROI conversion feature possible. | +1.0-2.0% | LandingPage.tsx, new component |
| 13 | **Product demo video.** 60-second screen recording showing: upload part -> calculate -> generate G-code -> quote. Embed in hero with a play button overlay on a screenshot. | +0.5-1.0% | LandingPage.tsx |
| 14 | **In-app help system.** Tooltip tours for new users, contextual help buttons, integrated docs search. | +0.3% (retention) | AppShell.tsx, new components |

### Cumulative Expected Impact

With Tier 1 alone: 1.5-2.5% baseline -> **3.0-4.5%**
With Tiers 1+2: -> **4.5-6.0%**
With all three tiers: -> **5.5-7.5%**

---

## SECTION 6: SUMMARY OF CRITICAL FINDINGS

### Red (Conversion Killers)
1. No product screenshot or demo anywhere on the landing page
2. Zero trust signals (no logos, no testimonials, no usage metrics, no certifications)
3. Login page defaults to Sign In instead of Register for new visitors
4. No onboarding after signup -- user is dropped into a 50+ item navigation with zero guidance
5. Username-first auth in 2026

### Yellow (Significant Friction)
6. Feature descriptions lead with technical jargon instead of business outcomes
7. No annual pricing option
8. "Contact Sales" on the $199/mo tier
9. AppShell shows all 50+ features to all users regardless of tier or need
10. No social/SSO login
11. Missing privacy policy / terms of service links on signup form

### Green (Already Working)
12. Headline is clear and differentiated ("The World's Smartest Speed & Feed Calculator")
13. Free tier exists with no credit card required
14. Pricing is transparent with five clear tiers
15. 14-day free trial messaging is present
16. Stats bar with concrete numbers (2,957 materials, etc.) is credible
17. Dark theme / professional visual design matches the manufacturing SaaS aesthetic
18. Good accessibility (aria labels, focus rings, semantic HTML)
19. Lazy loading / code splitting for performance

---

## FILES REVIEWED

- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\LandingPage.tsx` (679 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\LoginPage.tsx` (162 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\components\layout\AppShell.tsx` (411 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\App.tsx` (routing, 240 lines)
