# Manufacturing Networking Platform — Expanded Competitor Landscape

> Companion to `PRISM-NETWORKING-PLATFORM-PLAN.md`. The master plan's headline four are Axhera (the boss's target) + Xometry + Fictiv + Protolabs. The operator asked to "look into the other competitors as well" — this doc is the broader field (3 tiers), researched 2026-05-29 via 3 parallel recon agents. Sources cited inline per block. Feeds the parity matrix + risk section of the master plan.

## TL;DR — the three strategic facts the whole field reveals
1. **Live per-machine capacity is the unclaimed ranking primitive.** Every directory (Thomasnet, MFG.com, IndustryNet, Kompass) ranks by *paid placement* or *self-reported* capability; even Axhera matches *stated* capacity. NO ONE surfaces real-time machine state. PRISM's shop-floor-live → "rank shops by who has a provably-open spindle right now" is white space.
2. **No competitor computes manufacturing physics.** Xometry/Protolabs/Fictiv/Geomiq/Fractory/RapidDirect quote via geometry heuristics or ML-trained-on-past-jobs; sheet players (OSH Cut/SendCutSend/Komacut) use feature-count + pierce/bounding-box heuristics; supplier-side tools (Paperless/DigiFabster/ProShop) use formula-markup or ML-curve-fit. NONE compute cutting force / speed-feed / tool-life / cycle-time / WEDM discharge. PRISM's **explainable physics quote** is the wedge no black-box can answer "why" to.
3. **The supply side is the hard problem.** Shops already have quoting tools (Paperless Parts is the de-facto OS). Winning supply needs table-stakes parity (print-spec extraction, live material pricing, ERP bridge, CMMC) PLUS a faster/cheaper onboarding (2-week deploy + embeddable storefront) than their incumbent. Demand (buyers) won't show without supply liquidity → classic two-sided cold-start.

---

## TIER 1 — Supplier-discovery / directory / RFQ-marketplace incumbents (the NETWORKING layer)

**Thomasnet (Xometry-owned)** — industrial supplier-discovery OG. 500K+ US/CA supplier profiles, 1.3M buyers, ~20M sourcing sessions/yr; now the discovery front-door into Xometry's transactional marketplace.
- Model: directory-first; search/filter profiles by location/certs/capability → shortlist → in-platform RFI/RFQ. Vetting thin (supplier-supplied + **paid-placement ranked**).
- Monetization: free for buyers; supplier advertising + tiered premium profiles + **pay-per-click/pay-to-rank listings** + "who viewed your profile" prospect signal + data services.
- Exploit: ranking is *bought* not earned (buyers can't trust top results); profiles self-reported + stale; no live capacity, no physics/DFM.
- Match/steal: scale of profiles + first-party buyer-intent data + shortlist UX; steal the "who viewed your profile" prospect signal for shops.

**MFG.com** — global custom-parts RFQ marketplace ("Tinder for sourcing"), ~26K manufacturers / 75K buyers, *not a broker*.
- Model: post one RFQ → multiple bids, or search by capacity/capability/cert; NDA enforcement on drawings; peer ratings/NPS; intelligent RFQ routing.
- Monetization: free buyers; suppliers pay **per-RFQ-unlock** or **unlimited-bidding** subs (no commission).
- Exploit: structural conflict — platform profits from selling RFQ access regardless of award → floods shops with low-quality/tire-kicker leads, price-only competition; no capacity truth, no physics.
- Match/steal: NDA gating, intelligent RFQ routing, multi-bid compare, peer ratings/NPS reputation layer.

**IndustryNet (MNI)** — US industrial directory, ~350K suppliers; differentiator = **human-verified data** (researchers re-contact listings multiple times/yr).
- Model: free buyer search + multi-supplier single-RFQ; profiles with certs/capabilities/catalogs; explicitly attacks self-reported/pay-to-list models.
- Exploit: verification is human + periodic → still stale between cycles; no *live* capacity, no machine-level/tolerance data, no physics quote.
- Match/steal: verification-as-positioning. **PRISM one-ups with machine-level LIVE capacity = continuous truth vs their quarterly phone calls.**

**Maker's Row** — US consumer-product/apparel manufacturing directory (fashion/furniture/packaging — wrong vertical for precision metal, adjacent not direct). Steal: rich-media factory profiles (video/sample photos), project-posting reverse-discovery, embedded education funnel.

**Kompass** — global B2B directory (57M companies, 53K product codes); self-reported, broad-but-shallow, no mfg depth/capacity/quoting. Steal: the deep classification taxonomy idea (PRISM's process networks are the precision analog).

**Tier-1 verdict:** Most direct threat = **Axhera** — it already owns the exact wedge (process-network discovery + per-machine live capacity + no-take-rate "shops keep the relationship") and is locking a founding-100 cohort with permanent routing priority NOW. Thomasnet is the incumbent moat (scale + buyer-intent data) but pay-to-rank, stale, physics-blind. **PRISM networking-layer must-have: trustworthy real-time per-machine capacity as the ranking primitive** (Axhera's core, IndustryNet's verification taken live).

---

## TIER 2 — Instant-quote digital-manufacturing shops + distributed networks (the QUOTING/MARKETPLACE layer)

**Protolabs Network (ex-Hubs/3D Hubs)** — distributed network (250+ vetted partners, 1,600+ machines) + Protolabs in-house. Quoting: instant ML comparing CAD to "millions of past parts"; DFM shallow→human-routed for complex. Steal: dual in-house+network "always have capacity" pitch + real-time spec-change reprice.

**OSH Cut** — sheet/tube laser; **best instant pre-order DFM loop of the sheet players** (instant price + DFM feedback + flat-pattern/3D render + auto-nesting before order). In-house only, sheet/tube only, DFM = rule-based geometry not physics. **This is the instant-DFM UX benchmark to beat.**

**SendCutSend** — consumer-grade instant sheet/laser, single facility. Best self-serve UX + Parts Builder (no-CAD) + transparent cost-reduction tips; pricing = material/thickness/pierce-count/bounding-box heuristics; DFM is post-order human. Steal the UX.

**RapidDirect** — China hybrid (in-house + 700 audited partners), **two-layer DFM** (AI geometry flags + expert human review) + unified order dashboard (DFM→QC photos→invoice). DFM is feature-flags not physics; China lead-time/IP friction. Steal the two-layer DFM framing + order dashboard.

**Geomiq (UK)** — MaaS marketplace (350–1,000+ partners, 4,000+ machines), **GeomiqOS** AI agents; "G-Quote" shows **best-of-3 quotes**; on-model threaded-hole/tolerance tagging (kills supporting drawings). Complex → 24h human; DFM feature-recognition not physics. Steal: on-model tolerance tagging + best-of-N transparency + AI-OS narrative.

**Fractory (EU/UK/US)** — AI network quoting + **MSCM** multi-process orchestration (maps full multi-step production sequence across partners); cross-network "cheapest specialist even if farther" routing. Sheet-focused; DFM geometry not physics. Steal: cross-network specialist routing + MSCM production-blueprint sequencing.

**JLCPCB / PCBWay** — PCB-native giants; **gold-standard instant quote-to-cart UX** ($2/5 boards) extending into instant CNC (side bolt-on, minimal CNC DFM). Steal: frictionless instant-quote-to-cart + in-stock parts-library auto-match concept.

**Komacut** — factory-direct sheet+CNC, **sub-30s quote** + per-part feature enumeration ("Info Function") + multi-revision-in-minutes loop. Single-org, sheet-centric. Steal: sub-30s quote + per-part feature enumeration + fast iteration loop.

**Tier-2 verdict:** UX bars to clear = **OSH Cut** (instant pre-order DFM + flat-pattern + nesting) and **JLCPCB/Komacut** (sub-30s quote-to-cart). Match: real-time spec-change reprice (Protolabs), best-of-N transparency (Geomiq/Fractory), cross-network specialist routing (Fractory), one dashboard DFM→QC→invoice (RapidDirect). **Beat them with physics PRISM can prove + a quote-to-ship ERP they don't have.**

---

## TIER 3 — Supplier-side / job-shop quoting software (who PRISM displaces on the SHOP side — the supply-onboarding battle)

**Paperless Parts** — *category leader.* Cloud RFQ-to-order quoting + sales platform; geometry interrogation → **shop-configured pricing formulas + markup**; Wingman AI extracts specs from prints (10K+ ASTM/AMS/MIL/GD&T); live material pricing; ERP-agnostic (Epicor/JobBOSS²/Infor); **FedRAMP-Mod/CMMC** (defense moat). Exploit: formula-markup not physics; siloed from any buyer network; no live capacity. Steal: spec-recognition-from-print, live material feeds, ERP-bridge connectors, CMMC posture.

**DigiFabster** — embeddable **instant-quote storefront/widget** that turns a shop's website into an order portal (payments/checkout, per-customer pricing rules); cost = 20-pt geometry + ML-on-your-history. Exploit: ML curve-fits past mispricing; single-shop, no demand network. Steal: the embeddable storefront widget + payment rails (**this is the supply-side funnel back into the marketplace**).

**ProShop ERP / MIE Trak Pro / JobBOSS² (E2)** — full job-shop ERPs with built-in estimating (material+labor+OH+markup; ProShop has **profit-guard margin gates** + STEP import + quote→WO→BOM zero-re-entry). Exploit: estimating is template/formula bookkeeping, **no physics-derived cycle time** (estimator guesses run time); slow deploy; no buyer network. Steal: profit-guard margin gates + quote→WO→BOM flow (prism_business already has the ERP breadth).

**Steelhead** — all-in-one MES-ERP for finishing/plating; **2-week deploy, "10-min training"** + job costing + quote→SO→invoice. Niche, historical/labor-rate costing, no-API/closed. Steal: radically fast onboarding (2 weeks vs ERP's 18 months).

**CADDi (Drawer)** — AI drawing-data/procurement (NOT a quoter); drawing-similarity search + "find the historical reference price for this part." Steal: drawing-similarity recall as an estimator accelerator (PRISM's CAD/blueprint DFM already does the geometry half).

**Also notable:** **Machine Research** (in-house ML cycle-time, ITAR/CMMC-L2/GovCloud, nothing sent to external AI — defense play), **Toolpath** (Fusion tool-library-driven machining plans — closest to physics), **Phasio**, **Micro Estimating / KipwareQTE**.

**Tier-3 verdict:** Strongest = **Paperless Parts**. PRISM's wedge (true physics cost vs markup-guess/ML-curve-fit + a buyer network none of them have) is real but **narrow** — must clear table-stakes (print-spec extraction, live material pricing, ERP bridge, CMMC) or it reads as a science project. **The one must-have for shop adoption: 2-week low-friction onboarding + embeddable instant-quote storefront** (Steelhead-speed × DigiFabster-widget) — shops adopt only if PRISM is faster/cheaper than their current quoter, and the storefront is the funnel that closes the two-sided loop.

---

## Net implications for the PRISM plan (fold into master-plan parity matrix + risks)
- **Parity matrix must add columns/notes for:** Thomasnet (scale + buyer-intent), MFG.com (RFQ routing), Paperless Parts (shop-side quoting), OSH Cut (instant DFM UX), Geomiq/Fractory (best-of-N + cross-network routing), JLCPCB/Komacut (quote-to-cart speed).
- **Three defensible PRISM moats (un-vibecodeable):** (1) physics-explainable quote; (2) live per-machine capacity as the ranking primitive; (3) integrated quote→order→traveler→ship→invoice ERP loop spanning both sides.
- **Two existential risks the plan must answer head-on:** (a) two-sided cold-start — charlie's nationwide DB seeds *listings* but not *engagement*; (b) shop-side adoption friction vs entrenched Paperless Parts — needs the 2-week-onboarding + storefront-widget wedge.
- **MVP framing sharpened:** drawing upload → physics instant-quote + feature-by-feature explainable DFM → shortlist of capability-matched shops ranked by **live open capacity** (from charlie's nationwide DB + shop-floor-live) → in-network instant order OR RFQ to matched shops. That single flow beats Axhera (no instant quote, stated-not-live capacity) AND Xometry (black-box quote, no physics, no live capacity) simultaneously.
