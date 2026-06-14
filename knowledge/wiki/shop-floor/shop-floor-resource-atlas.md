---
title: Shop-Floor Resource Atlas — one-stop index fusing the LOCAL trove with curated free YouTube / seminars / data-reports for shop-floor operations, OEE, MES, lean, and industrial safety
galaxy: shop-floor
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL pointers reproduced verbatim from the operator-given trove (store/corpus + its index) — NOT re-counted or fabricated. Every YouTube/online/standards/data-report URL below was fetched with WebFetch this pass and confirmed to RESOLVE on-topic, OR (for client-side-rendered YouTube channel pages that fetch to a footer-only shell) its existence + free-content was corroborated via WebSearch result snippets pointing at the canonical channel URL. Links that 403/404'd or could not be confirmed on-topic were DROPPED after one retry, not listed. This atlas verifies LINK liveness + topical fit + that the local pointers are the real store names — it does NOT assert the numeric claims those sources contain (every OEE/availability/Cpk/cutting threshold stays owner-gated to golf + constants.ts per R12)."
tags: [shop-floor, resource-atlas, free-sources, video, seminars, data-reports, local-trove, oee, mes, lean, tpm, industrial-safety, mtconnect, nist, osha, lean-enterprise-institute, gemba-academy, keep-fresh, one-stop-hub]
---

# Shop-Floor Resource Atlas

A single **easy-access** index that links **every** resource for the shop-floor galaxy — the **LOCAL** stores/corpora that already live in this repo, plus the **curated free online half** (YouTube channels, free seminars/webinars, standards bodies, and government data reports) — so a chat working in this galaxy jumps straight to what it needs without re-discovering it.

This atlas **fuses the two halves**: the local trove pointers (where PRISM's own shop-floor data + machine-fleet config live) AND the reputable free video/seminar/data-report sources on the open web. It is deliberately **non-stagnant**: it points at living homepages / channels / program hubs that update themselves, and it carries a keep-fresh cadence so the links do not rot.

**How this differs from its siblings (R8 — no duplication):**
- [[shop-floor-source-atlas]] is the **free-college-course + textbook curriculum** (MIT OCW, OpenStax, the Lean Lexicon glossary, standards landing pages). This resource-atlas instead adds the **LOCAL trove pointers**, the **video + seminar + data-report half**, and a **one-stop cross-link hub** — the directory a chat hits first, then drills into the source-atlas for deep theory.
- [[shop-floor-foundations]] extracts *specific verified facts*; this atlas links the *living homepages/channels* those facts derive from, plus the local stores those facts get applied against.

---

## Local stores + corpora

The shop-floor galaxy's own in-repo trove. Pathway convention = **store/corpus + its index** (jump to the store via its index, never re-scan). Reproduced verbatim from the known trove (not re-counted):

- **shop-floor engine** — `mcp-server/src/engines/shop-floor/` — live machine status → adaptive optimization + ERP. The galaxy's primary backend: ingests real machine state and routes it into the adaptive (speed/feed) and ERP/scheduling surfaces. Index/brain: `mcp-server/src/engines/shop-floor/MEMORY.md` (galaxy brain — the live machine-status → adaptive + ERP map). Start here.
- **JM DIE 21-machine fleet config (ShopConfigurationEngine)** — `mcp-server/src/engines/ShopConfigurationEngine.ts` — the canonical JM Die shop machine-fleet configuration (the 21-machine fleet definition the shop-floor status model maps against). The authoritative source of *which machines exist on this shop floor* and their characteristics; pair every machine-status / OEE attribution with this config so a status row is bound to a real machine.
- **MES / OEE telemetry stores** — the persisted machine-event / OEE telemetry the shop-floor engine reads/writes (availability, performance, quality event streams keyed per machine). Resolve the live store paths through the galaxy brain (`mcp-server/src/engines/shop-floor/MEMORY.md`) + the `database-expansion` persistence registry (`mcp-server/src/engines/database-expansion/MEMORY.md`) rather than hardcoding a path — they are the index into the telemetry corpus.

> Local-trove rule: the **number** behind any OEE / availability / performance / quality reading sourced from these stores is owner-gated (golf) — surface the *method* and the *store pointer*, not a promoted threshold (R12, see Owner-gate below).

## Curated YouTube + seminars

Reputable, **named + confirmed** free video channels and free seminar/webinar hubs. Each was verified this pass (channel URL confirmed live via WebFetch or corroborated via WebSearch result snippets). Use the durable **channel/playlist** entry points below rather than chasing individual video IDs (which rot).

- **MTConnect Institute — YouTube channel** — https://www.youtube.com/channel/UCIPwiCMtpsc_eMWF7qhAVhg — The official channel of the body behind the MTConnect machine-data open standard (AMT). Hosts the multi-part **"The MTConnect Standard Defined"** educational series (Part 1 of 6: https://www.youtube.com/watch?v=p59jonxxIII) plus adapter/agent/data-model tutorials. The durable free video entry point for the machine-monitoring standard that feeds OEE. (Channel existence + free educational content corroborated via WebSearch; the standard homepage is verified live below.)
- **Gemba Academy — YouTube channel** — https://www.youtube.com/user/gembaacademy — Free lean / TPM / continuous-improvement video content from a named lean-training provider (founded 2009): the **Concept Tutorials** playlist (5S, Kaizen, Value-Stream Mapping in short bursts) and the **Gemba Insights** series of free lean-question answers. Intentionally short (5–10 min) practitioner-presented lessons — a strong free durable lean-video spine. (Channel + free-content corroborated via WebSearch; the site's free hub is verified live below.)
- **Lean Enterprise Institute — YouTube channel** — https://www.youtube.com/@LeanEnterpriseInst — The nonprofit LEI's official channel: free **webinars** and instructional videos rooted in the Toyota Business System (e.g. lean-learning webinars, lean-coaching "humble inquiry" tips). The free seminar/webinar half of the authoritative lean body. (Channel + free webinar content corroborated via WebSearch; lean.org free hub verified live below.)
- **Gemba Academy — free site hub (blog / podcast / glossary / Insights)** — https://www.gembaacademy.com/ — Verified live. Beyond YouTube, the site lists free resources: the improvement **blog** (blog.gembaacademy.com), a weekly continuous-improvement **podcast**, the **Gemba Glossary** (quick reference for improvement terms), and **Gemba Insights** practical guidance. A living free-seminar-style hub for lean/Six-Sigma operational excellence.
- **Lean Enterprise Institute — free learning hub (The Lean Post / webinars / podcasts)** — https://www.lean.org/ — Verified live. LEI's free content surface: **The Lean Post** articles, **podcasts**, free **webinars** (e.g. the Lean-AI webinar), and the "Explore Lean" learning section. The authoritative free seminar/webinar + article hub for lean thinking on the shop floor (the glossary lives in the source-atlas; this is the living seminar/article feed). Confirmed current with 2026 events.

## Reputable free online + data reports

Living standards-body homepages and government program/data hubs — the free authoritative reference + "data reports" half. Every URL below was WebFetch-confirmed live + on-topic this pass.

- **NIST — Manufacturing (topic landing hub)** — https://www.nist.gov/manufacturing — Verified live. NIST's manufacturing front door: a "Manufacturing Topics" section (16 areas incl. additive, robotics, supply chain, sustainable manufacturing, systems engineering) plus a **News & Updates** feed, **blog posts**, and links to all manufacturing publications / projects / patents. The continuously-updated source of free NIST manufacturing research + reports for the shop-floor galaxy.
- **MTConnect Institute (homepage)** — https://www.mtconnect.org/ — Verified live. The body behind the MTConnect open standard (ANSI/MTC1.4-2018): a domain-specific semantic vocabulary that standardizes factory-device data with no proprietary format. Getting-started, docs, GitHub, Slack. The authoritative living home of the machine-monitoring standard that feeds the Availability + Performance legs of OEE.
- **MTConnect — standard model documentation (model.mtconnect.org)** — https://model.mtconnect.org/ — Verified live. The normative SysML model documentation for the standard (versions 2.0 → 2.8, 2.7 stable), maintained by AMT. The implementation-grade technical reference for reading the MTConnect data model — pair with the homepage above when wiring telemetry ingest.
- **OSHA — Machine Guarding eTool** — https://www.osha.gov/etools/machine-guarding — Verified live. OSHA's interactive web-based machine-safeguarding training tool (saws, presses, plastics machinery; ~18,000 amputations/lacerations/crushing injuries + 800+ deaths/yr context). Navigable sections on guards, devices, general requirements, and hazardous motions — the maintained, hands-on industrial-safety reference for the shop-floor safety surface (a richer source than a plain topic page).
- **lean.org — Lean Enterprise Institute (free articles + data + webinars)** — https://www.lean.org/ — Verified live. (Listed in the seminars section above as the video/webinar hub; cross-referenced here as the authoritative free lean **reference + article/data** surface — The Lean Post, the "Explore Lean" portal, and the Lean Lexicon glossary index covered in [[shop-floor-source-atlas]].)

> Data-report rule: these sources publish authoritative *methods and frameworks* (OEE = Availability × Performance × Quality; the MTConnect data model; LOTO/guarding requirements). Promote the **method + the link**, never a numeric target (R12). Any OEE/availability/quality cutoff a chat needs stays owner-gated to golf.

## Cross-links

The one-stop hub — every sibling wiki layer + the cross-galaxy resource map, in one place so a chat orients in a single read:

- [[shop-floor-foundations]] — verified theory + extracted facts (OEE formula, MTConnect-is-read-only, ISA-95 levels).
- [[shop-floor-source-atlas]] — free college courses + textbooks + glossaries (MIT OCW, OpenStax, Lean Lexicon, standards landing pages).
- [[shop-floor-applied-practice]] — shop-floor gotchas / applied pitfalls.
- [[shop-floor-advanced-techniques]] — world-leader strategy (TPS-grade practice).
- [[primary-domain-resource-map]] — the cross-galaxy resource-map index (this galaxy's row + the other primary manufacturing domains).
- [[prism-methodology-foundations]] — the shared PRISM build/verification methodology.
- Galaxy brain: `mcp-server/src/engines/shop-floor/MEMORY.md` — the live machine-status → adaptive + ERP map (start every shop-floor task here).

## Keep-fresh cadence

Link-rot + store-drift are the failure modes; this atlas is only as good as its freshest sweep.

- **Quarterly (or on-demand) re-verify** every URL in this file with WebFetch; for client-side-rendered YouTube channels, re-corroborate via WebSearch against the canonical channel URL. Any link that begins to 403/404 or drifts off-topic is **dropped** and, where possible, replaced with the current canonical landing page (URLs under `nist.gov`, `osha.gov`, and channel handles are the most prone to path/handle changes). Government/standards pages were chosen at **landing-page** level because landing pages are the most durable.
- **Re-confirm the LOCAL pointers** against the galaxy brain (`mcp-server/src/engines/shop-floor/MEMORY.md`) on the same sweep — if `ShopConfigurationEngine` moves or the machine-fleet count changes, update the pointer text (never hardcode the count here; read it from the engine).
- **Run alongside** the [[shop-floor-source-atlas]] + [[shop-floor-foundations]] verification passes; bump `verified_by` with the new date + slot each sweep.
- This atlas must **not stay stagnant** (operator directive): when a new reputable free channel / seminar / data report for shop-floor / OEE / MES / lean / TPM / safety surfaces and verifies live, add it here so the galaxy keeps learning.

## Owner-gate (NOT promoted)

The following are **deliberately not promoted** in this atlas — they are owner-gated to **golf** (the shop-floor galaxy owner) + `mcp-server/src/physics/constants.ts`, and resolved from the local trove, never copied into the wiki body:

- Any numeric **OEE / Availability / Performance / Quality** threshold or target (the *formula* OEE = A × P × Q is method; the *cutoff* is owner-gated).
- Any numeric **machine-uptime / downtime / utilization** target derived from the MES/OEE telemetry stores.
- Any **Cpk / SPC** control limit or capability target (links to method/source only).
- Any **cutting constant** (Kienzle kc1.1, Taylor, material) — import from `constants.ts`, never inline.
- Any **safety threshold** (guarding clearance, LOTO timing) — link the OSHA method; the enforced value is owner-gated.

This atlas surfaces the **method + the source link + the store pointer**. The number stays with the owner.

## Sources

LOCAL trove (verbatim, operator-given — not re-counted):
- shop-floor engine — `mcp-server/src/engines/shop-floor/` (+ `MEMORY.md` index/brain)
- JM Die 21-machine fleet config — `mcp-server/src/engines/ShopConfigurationEngine.ts`
- MES / OEE telemetry stores — resolved via the galaxy brain + `database-expansion` persistence registry

Online (WebFetch-confirmed live + on-topic this pass, 2026-06-10):
- NIST Manufacturing hub — https://www.nist.gov/manufacturing
- MTConnect Institute homepage — https://www.mtconnect.org/
- MTConnect standard model docs — https://model.mtconnect.org/
- OSHA Machine Guarding eTool — https://www.osha.gov/etools/machine-guarding
- Lean Enterprise Institute (lean.org) free hub — https://www.lean.org/
- Gemba Academy free site hub — https://www.gembaacademy.com/

Video/seminar channels (canonical URL + free-content corroborated via WebSearch where the channel page renders client-side, 2026-06-10):
- MTConnect Institute YouTube — https://www.youtube.com/channel/UCIPwiCMtpsc_eMWF7qhAVhg ("The MTConnect Standard Defined" series: https://www.youtube.com/watch?v=p59jonxxIII)
- Gemba Academy YouTube — https://www.youtube.com/user/gembaacademy
- Lean Enterprise Institute YouTube — https://www.youtube.com/@LeanEnterpriseInst

Dropped this pass (not listed above): none required a drop — all candidate URLs fetched/corroborated live. (The Gemba Academy YouTube *channel* page itself fetched to a footer-only client-side shell; its existence + free Concept-Tutorials/Gemba-Insights content was corroborated via WebSearch per the verification method, so it is listed.)

Cross-references (PRISM internal):
- [[shop-floor-foundations]] · [[shop-floor-source-atlas]] · [[shop-floor-applied-practice]] · [[shop-floor-advanced-techniques]] · [[primary-domain-resource-map]] · [[prism-methodology-foundations]]
