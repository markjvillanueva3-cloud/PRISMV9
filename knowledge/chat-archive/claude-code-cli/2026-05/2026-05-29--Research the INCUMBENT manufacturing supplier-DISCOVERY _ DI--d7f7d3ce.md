---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Research the INCUMBENT manufacturing supplier-DISCOVERY / DIRECTORY / RFQ-MARKET"
date: "2026-05-29"
first_ts: "2026-05-29T20:07:01.135Z"
last_ts: "2026-05-29T20:09:47.963Z"
cwd: "H:\\prism-slot-hotel\\mcp-server"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a8ff78e5d31c475db.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Research the INCUMBENT manufacturing supplier-DISCOVERY / DIRECTORY / RFQ-MARKET

> **claude-code-cli** | 2026-05-29 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism-slot-hotel\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-a8ff78e5d31c475db.jsonl`

## Transcript

### User | 2026-05-29T20:07:01.135Z

Research the INCUMBENT manufacturing supplier-DISCOVERY / DIRECTORY / RFQ-MARKETPLACE competitors (the networking layer specifically). Use web search. Cover each: Thomasnet (the industrial supplier-discovery OG, now owned by Xometry), MFG.com (manufacturing RFQ marketplace), Maker's Row (US manufacturing directory), Kompass / IndustryNet (industrial directories), and any other major US supplier-discovery/networking platform you find.

We are planning a PRISM manufacturing networking+marketplace+instant-quote platform to beat axhera.com (a process-specific capacity marketplace: drawing upload→RFQ→capability/capacity search→direct shop match, organized by 8 process networks: Wire/Sinker EDM, 5-axis, turning, mill-turn, swiss, waterjet, laser, brake) PLUS xometry/fictiv/protolabs.

For EACH competitor return a tight structured block:
- name + positioning (one line)
- networking/discovery model (directory vs marketplace vs RFQ; how buyers find suppliers; reputation/vetting/profiles; connections/messaging)
- monetization
- quoting approach (none / RFQ-to-human / instant)
- weaknesses PRISM can exploit (esp. self-reported capability data, no real DFM/physics, no live capacity, stale listings)
- what PRISM must match (table-stakes) or steal (standout ideas)

End with a 4-line verdict: which of these is the most direct threat to a "networking + live capacity + physics-quote" platform, and the single biggest networking-layer feature PRISM must not miss. Keep total output under ~900 words — dense, no fluff.

### Assistant | 2026-05-29T20:07:11.163Z

I'll research these manufacturing supplier-discovery competitors. Let me run parallel searches.

### Assistant | 2026-05-29T20:07:11.886Z

[tool_use: WebSearch]

### Assistant | 2026-05-29T20:07:12.395Z

[tool_use: WebSearch]

### Assistant | 2026-05-29T20:07:12.719Z

[tool_use: WebSearch]

### User | 2026-05-29T20:07:45.477Z

[tool_result] Web search results for query: "Maker's Row US manufacturing directory how it works find factories pricing subscription"

I'll search for information about Maker's Row, the US manufacturing directory.

Links: [{"title":"Maker's Row Pricing Plans | Connect With US Manufacturers","url":"https://makersrow.com/pricing/"},{"title":"Maker’s Row | Connect With US Top Manufacturers & Factories","url":"http
... [+6493 chars truncated]

### User | 2026-05-29T20:07:49.447Z

[tool_result] Web search results for query: "Thomasnet supplier discovery platform how it works Xometry acquisition business model monetization advertising"

I'll search for information about Thomasnet and its acquisition by Xometry.

Links: [{"title":"Xometry Acquires Thomas, Accelerating Manufacturing Industry’s Digital Transformation","url":"https://www.thomasnet.com/insights/xometry-acquires-thomas-accelera
... [+10597 chars truncated]

### User | 2026-05-29T20:08:00.171Z

[tool_result] Web search results for query: "MFG.com manufacturing RFQ marketplace how it works buyers suppliers monetization fees"

I'll search for information about MFG.com and how it works.

Links: [{"title":"Marketplace FAQs - MFG","url":"https://www.mfg.com/marketplace-faqs/"},{"title":"The World's Largest Custom Manufacturing Marketplace - MFG","url":"https://www.mfg.com/"},{"title":"Shop Management and O
... [+9528 chars truncated]

### Assistant | 2026-05-29T20:08:08.324Z

Now the remaining competitors plus the axhera positioning check.

### Assistant | 2026-05-29T20:08:08.821Z

[tool_use: WebSearch]

### Assistant | 2026-05-29T20:08:10.233Z

[tool_use: WebSearch]

### Assistant | 2026-05-29T20:08:10.534Z

[tool_use: WebSearch]

### User | 2026-05-29T20:08:43.243Z

[tool_result] Web search results for query: "axhera capacity marketplace CNC machine shop process network instant quote drawing upload"

I'll search for information about this query for you.

Links: [{"title":"Online CNC Machining Service : Custom part production","url":"https://www.hubs.com/cnc-machining/"},{"title":"Online CNC Machine Shop | Custom CNC Machining | Get Quote","url":"https://parts-badger.com/"}
... [+6107 chars truncated]

### User | 2026-05-29T20:08:47.402Z

[tool_result] Web search results for query: "Kompass B2B industrial directory how it works business model vs IndustryNet supplier directory"

I'll search for information about how Kompass and IndustryNet B2B industrial directories work and their business models.

Links: [{"title":"Global B2B Online Directory - Search for company information - Kompass","url":"https://www.kompass.com/businessplace/"},{"title":"Ko
... [+10616 chars truncated]

### User | 2026-05-29T20:09:03.297Z

[tool_result] Web search results for query: "manufacturing supplier discovery marketplace platforms 2025 Xometry Fictiv Protolabs instant quote capacity"

I'll search for information about manufacturing supplier discovery marketplace platforms and the companies you mentioned.

Links: [{"title":"Comparing Top On-demand Manufacturing Platforms 2025","url":"https://www.factorem.co/knowledge-hub/comparing-top-on-de
... [+11467 chars truncated]

### Assistant | 2026-05-29T20:09:47.963Z

I have enough to write the structured competitive intel. Here it is.

---

# Incumbent Supplier-Discovery / Networking Competitor Intel

## Thomasnet (Xometry-owned)
- **Positioning:** The industrial supplier-discovery OG — 500K+ US/Canada supplier profiles, 1.3M registered buyers, ~20M sourcing sessions/yr; now the discovery front-door to Xometry's transactional marketplace.
- **Networking/discovery model:** Directory-first. Buyers search/filter 500K+ profiles by location, certs, capability; build shortlists; send RFIs/RFQs in-platform. "Vetting" is thin — profiles are largely supplier-supplied + paid-placement ranked. Messaging = RFI/RFQ broadcast, not relationship/connection graph.
- **Monetization:** Free for buyers; supplier-side advertising. Tiered premium profiles, **performance-based listings (pay-per-click/interaction)**, category-based paid ranking (pay-to-rank, like search ads), premium subs that reveal who viewed your profile, + data/digital-marketing services. Xometry adds buyer-side transaction take downstream.
- **Quoting:** Discovery = RFQ-to-human; instant quoting bolted on via Xometry engine integration (2022+).
- **Weaknesses to exploit:** Ranking is *bought*, not earned — buyers can't trust top results reflect best fit. Profiles are self-reported + stale; no live capacity, no DFM/physics, no real machine-level data. Lead-gen black box.
- **Match/steal:** Must match — scale of profiles + first-party buyer-intent data + shortlist/RFI UX. Steal — "who viewed your profile" prospect signal for shops.

## MFG.com
- **Positioning:** "Tinder for sourcing" — global custom-parts RFQ marketplace (~26K manufacturers, 75K buyers); explicitly *not a broker*.
- **Networking/discovery model:** RFQ-centric. Buyers post one RFQ → multiple bids; or search suppliers by capacity/capability/cert. NDA enforcement on drawings. Peer ratings/reviews, NPS, intelligent RFQ routing by manufacturer attributes.
- **Monetization:** Free for buyers; suppliers pay **pay-per-RFQ-u
... [+5786 chars truncated]
