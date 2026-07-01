---
title: "Quoting Resource Atlas — one-stop easy-access index of LOCAL stores + curated video/seminars + reputable free online for manufacturing cost estimation & quoting"
galaxy: quoting
owner_slot: charlie
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL stores/corpora were confirmed on-disk on 2026-06-10 (each path stat'd + its index file/dir verified to exist; vendor counts read verbatim from the store's own manifest.json, NOT re-counted by this atlas). ONLINE + VIDEO sources were each WebFetched on 2026-06-10 and CONFIRMED to resolve to live, on-topic landing pages (trade body / standards / government data / industry-media homepage). Candidates that returned HTTP 403/404 twice, looped redirects, or rendered only an un-confirmable JavaScript shell were DROPPED, not listed (BLS PPI 403x2; all YouTube channel pages rendered as un-confirmable JS shells / 404). This atlas verifies each LINK is live + on-topic; it does NOT assert any dollar rate, percentage, or constant inside those sources — those stay owner-gated to charlie + constants.ts."
tags: [quoting, cost-estimation, job-order-costing, resource-atlas, vendor-catalog, docustrata, local-trove, manufacturing-media, cost-engineering, data-reports, charlie]
---

# Quoting Resource Atlas

A single **easy-access hub** that links **every** resource the quoting galaxy needs — the **LOCAL** stores/corpora (where JM Die's real pricing + vendor + procurement data lives), the **curated video / seminar / data-report** half, and the **reputable free online** half — so a chat working in this galaxy jumps straight to what it needs instead of re-deriving or re-searching.

**How this differs from the sibling layers (R8 — no duplication):**
- [[quoting-source-atlas]] is the **free-college-course / open-textbook curriculum** (MIT OCW, OpenStax, LibreTexts, standards bodies) — the "keep-learning" reading list.
- **This resource-atlas adds the two halves that one does not carry:** (1) the **LOCAL trove pointers** — the on-disk stores/corpora that hold the galaxy's actual cost basis; and (2) the **video / seminar / data-report** half (industry media, trade-association webinars, government price/economic data). It is the **one-stop cross-link hub** across all layers.

> **R12 honesty note:** a verified link only means the resource is real, free, and on-topic — it does **not** make any dollar rate, percentage, shop-rate, OEE, or constant inside it "verified." Pricing/rate/cost constants stay owner-gated for charlie (see the Owner-gate section + `quoting-foundations.md`). Several promising online candidates were attempted and **dropped** because they returned HTTP 403/404 twice or rendered only an un-confirmable JavaScript shell to the fetcher (BLS PPI program page — 403 on two attempts; all YouTube channel pages — un-confirmable JS shells / 404). They are real resources a human can reach in a browser, so the keep-fresh cadence re-attempts them; this atlas only lists what it could machine-confirm.

---

## Local stores + corpora

The on-disk trove. **Pathway = the store/corpus + its own index** — read the index, never re-OCR or re-count. Counts below are read **verbatim from each store's own manifest**, not recomputed here.

- **Vendor catalog DB** — `mcp-server/data/vendor-catalog-db/` (manifest `manifest.json` + `tables/{vendors,catalog-vendors,sfc-makers}.jsonl` + `tables/jm-tool-purchases.json` + `README.md`). Charlie's VENDOR-NETWORK-MS0 corpus consolidated into a committed, schema-versioned store (owner of the *store file*: juliett; owner of the *acquisition*: charlie). Headline framing: 425 vendors + 77 catalog-vendors + JM procurement $4.91M. **Authoritative live figures are the store's own `manifest.json`** (read it, don't trust a cached headline) — at last regen (2026-06-02) it reported `vendors: 482`, `catalogs: 114`, `sfc_makers: 169`, `jm_tool_vendors: 49`, `jm_total_tool_spend: $4,914,833.88`. The cost-basis + supplier-master spine for any quote. Regenerate after Charlie's pipeline reruns: `node scripts/build-vendor-catalog-db.mjs`.
- **DocuStrata pricing index** — `Docustrata/` (index: `manifest.json` + `.index/`; quote/order/sales-order/packing-slip sub-corpora e.g. `JMD Quotes/`, `JMD Sales Orders/`, `JMD Orders Closed/`, `JMD Acct RecPay/`). JM Die's scanned business-document corpus — historical quotes, sales orders, accounts. **NEVER re-OCR** — search the `manifest.json` + `.index/` projection instead (operator directive; the OCR is already done). The empirical pricing/quote-history backbone for quote-vs-actual reconciliation.
- **JM Die quote + financial records** — `JM DIE/` (programs root + business records; counts live in `mcp-server/src/data/jm-die-profile.ts`, not duplicated here). The canonical test-shop corpus — real customers, real jobs, real program history. Direct API: `prismSelfAwarenessEngine.getJMDieCustomerPath()`. The ground-truth a quote is validated against.
- **Manufacturer catalogs (cost basis)** — `resources/MANUFACTURER_CATALOGS/` (~365 catalog PDFs per the corpus headline; tooling/consumable/material maker catalogs). The published-price reference for line-item cost basis (cutter, insert, holder, consumable pricing). Cross-ref: `vendor-catalog-db` `tables/catalog-vendors.jsonl` maps the makers behind these PDFs; `crossRef.pulled_pdfs_dir` in the manifest points at the harvested PDF batch (not in repo).

> Cross-cutting: the 3 critical resource roots (`H:/PRISM/resources`, `H:/PRISM/JM DIE`, `H:/PRISM/Docustrata`) are the operator-marked roots every galaxy PATHS.md points at — see [[critical-resource-roots]]. Pathway discipline: root + its index, never re-OCR Docustrata.

## Curated YouTube + seminars

Free industry-media + trade-association homepages whose **webinars / conference programs / seminar archives** are the galaxy's living "watch + attend" surface for estimating, cost-engineering, and shop-economics talks. Each landing page below was WebFetch-confirmed live + on-topic on 2026-06-10.

- **Gardner Business Media (Modern Machine Shop)** — https://www.gardnerweb.com/ — "Manufacturing's leading information resource" (Modern Machine Shop, Production Machining, etc.); industry economics, shop-rate / capital-investment articles, and recorded webinars. The living trade-media index for machining cost + business trends.
- **SME — Society of Manufacturing Engineers** — https://www.sme.org/ — professional society; events, certifications, webinars, and education spanning manufacturing engineering and shop economics. Free webinar archive + event calendar are the curated "seminars" surface.
- **AMT — The Association For Manufacturing Technology** — https://www.amtonline.org/ — organizer of IMTS; industry intelligence, conference programs, and recorded technical sessions (incl. the IMTS Conference). The trade-body source for manufacturing-technology + business-of-machining talks.
- **IMTS — International Manufacturing Technology Show** — https://www.imts.com/ — the largest manufacturing show in the Western Hemisphere; its **Conference** program carries estimating / shop-management / automation-ROI sessions. The living event + seminar listing.
- **NTMA — National Tooling & Machining Association** — https://www.ntma.org/ — precision-manufacturing trade association; training, advocacy, and member webinars/events (incl. estimating + shop-business content). The trade-association "estimating webinar" surface.

> **Dropped (R12):** all attempted **YouTube channel pages** rendered as un-confirmable JavaScript shells / returned 404 to the fetcher — same machine-confirm limitation noted in [[quoting-source-atlas]]. The five trade-body homepages above are the confirmable route to the same talks/webinars; the keep-fresh cadence re-attempts direct channel URLs with a human-in-the-loop fetch.

## Reputable free online + data reports

Free, reputable, continuously-updated **cost-estimating handbooks, cost-engineering bodies, and government data portals** — the external sanity-check + benchmarking backbone for JM Die's internal rates. Each WebFetch-confirmed live + on-topic on 2026-06-10. **FREE + LEGAL only** (no LibGen/SciHub).

- **NASA Cost Estimating Handbook (CEH) Version 4.0** — https://www.nasa.gov/ocfo/ppc-corner/nasa-cost-estimating-handbook-ceh/ — free, government-published handbook (NASA OCFO / Cost Analysis Division); the CEH summary + downloadable appendices (Appendix C analogy/parametric/engineering-build-up methods; G cost-risk & uncertainty; H Basis-of-Estimate documentation; J Joint Cost-Schedule Confidence Level; N sensitivity/NPV). The canonical *methodology* reference for how a defensible estimate is built, risked, and documented — directly transferable to shop quoting. Maintained as a living document (annual review).
- **AACE International — Resources** — https://web.aacei.org/resources — the Association for the Advancement of Cost Engineering; 7,000+ peer-reviewed cost-engineering articles + Total Cost Management framework, much of it openly accessible. The standards-body reference for cost-estimate classification, contingency, and estimating-method rigor.
- **U.S. Census Bureau — Annual Survey of Manufactures (ASM) / Annual Integrated Economic Survey (AIES)** — https://www.census.gov/programs-surveys/asm.html — establishment-level manufacturing statistics (value of shipments, cost of materials, payroll, value added) by industry. The authoritative public baseline for "what does this industry actually spend on materials vs labor" — calibration data for a quote's cost-decomposition assumptions. (Page notes ASM transitioned into the AIES beginning March 2024.)
- **U.S. Bureau of Economic Analysis — Industry Economic Accounts** — https://www.bea.gov/industry — GDP-by-Industry, Gross Output by Industry, and Input-Output Accounts (free). Lets a quoting model situate a part's industry within sector-level cost/output structure and supplier interdependence — supply-chain-aware quoting context.

> **Dropped (R12):** **BLS Producer Price Index (PPI)** program page returned HTTP 403 on two attempts (bot-blocking, not dead) — the canonical material-price-trend data report a human can reach at `bls.gov/ppi/` in a browser. The keep-fresh cadence re-attempts it with an authenticated/human-in-the-loop fetch; until confirmed it is intentionally **not listed**.

## Cross-links

- [[quoting-foundations]] — domain theory + page-level cited facts (predetermined-overhead-rate, the three product-cost components, NRE amortization). Owner-gated cost constants live here.
- [[quoting-source-atlas]] — free college courses + open textbooks + standards-body curriculum (the "keep-learning" reading list this atlas complements).
- [[quoting-applied-practice]] — galaxy gotchas + applied estimating practice.
- [[quoting-advanced-techniques]] — world-leader quoting/estimating strategy.
- [[primary-domain-resource-map]] — the fleet-wide per-domain resource map this atlas plugs into.
- [[prism-methodology-foundations]] — PRISM build/verification methodology spine.
- Galaxy brain: `mcp-server/src/engines/quoting/MEMORY.md` · Galaxy doctrine: `mcp-server/src/engines/quoting/CLAUDE.md`.

## Keep-fresh cadence

This atlas is a **link + pointer directory**, so its failure modes are **link-rot** (online half) and **store drift** (local half). It must NOT stay stagnant. Re-verify on a periodic cadence (suggest quarterly, or whenever a galaxy-source-corpus rebuild runs):
1. **Online/video:** re-run the same confirm-each-link-resolves WebFetch pass that produced this file. **Drop** any URL that no longer resolves or is no longer free/on-topic (R12 — never carry a dead/paywalled link).
2. **Re-attempt the dropped candidates** (BLS PPI; reputable YouTube channels for Gardner/SME/AMT/NTMA) — they failed only on bot-blocking / JS-shell rendering, not because they are dead; a human-in-the-loop or authenticated fetch may confirm them and add direct video URLs.
3. **Local:** re-stat each store path + re-read its `manifest.json` for current counts (never hard-code counts into this atlas — they drift). Regenerate `vendor-catalog-db` via `node scripts/build-vendor-catalog-db.mjs` after Charlie's pipeline reruns.
4. **Promote** newly-confirmed living sources from `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (or its successor) that pass verification.
5. Bump `verified_by` to the date of the re-verification pass.

## Owner-gate (NOT promoted)

This atlas deliberately promotes **NO** numeric value out of any source above. The following stay owner-gated to **charlie** + `mcp-server/src/physics/constants.ts` and are referenced by *method/source only*, never copied here:
- Shop rate / labor rate / burden / overhead-rate dollar values (method: NASA CEH Appendix C/H, OpenStax managerial accounting — number gated).
- Material / tooling / consumable unit prices and the $4.91M JM procurement rollup (source: `vendor-catalog-db` manifest + `MANUFACTURER_CATALOGS` — values gated to the store, not restated as "facts" here).
- Any cutting constant (kc1.1, Taylor exponents), Cpk, OEE, or safety threshold — these belong to `constants.ts` / oscar's SFC domain, NOT quoting, and are NOT in this atlas.
- Census/BEA/BLS published rates are *external benchmarks* to compare against, never imported as PRISM constants.

A verified link/store pointer means the resource is real, free, and on-topic — it does **not** verify any number inside it.

## Sources

LOCAL (on-disk, confirmed 2026-06-10):
- `mcp-server/data/vendor-catalog-db/` (+ `manifest.json`, `tables/`, `README.md`) — counts read verbatim from `manifest.json` (regen 2026-06-02).
- `Docustrata/` (+ `manifest.json`, `.index/`, `JMD Quotes/` et al.)
- `JM DIE/` (counts: `mcp-server/src/data/jm-die-profile.ts`)
- `resources/MANUFACTURER_CATALOGS/`

ONLINE + VIDEO (WebFetch-confirmed live + on-topic 2026-06-10):
- https://www.gardnerweb.com/ — Gardner Business Media / Modern Machine Shop
- https://www.sme.org/ — Society of Manufacturing Engineers
- https://www.amtonline.org/ — AMT (IMTS organizer)
- https://www.imts.com/ — IMTS (conference/seminar program)
- https://www.ntma.org/ — National Tooling & Machining Association
- https://www.nasa.gov/ocfo/ppc-corner/nasa-cost-estimating-handbook-ceh/ — NASA Cost Estimating Handbook 4.0
- https://web.aacei.org/resources — AACE International resources
- https://www.census.gov/programs-surveys/asm.html — Census ASM / AIES
- https://www.bea.gov/industry — BEA Industry Economic Accounts

DROPPED (R12 — attempted, not machine-confirmable on 2026-06-10):
- `bls.gov/ppi/` + `bls.gov/ppi/home.htm` — HTTP 403 (both attempts) — re-attempt next cadence.
- YouTube channel pages (Gardner/SME et al.) — un-confirmable JS shells / 404 — re-attempt next cadence.
