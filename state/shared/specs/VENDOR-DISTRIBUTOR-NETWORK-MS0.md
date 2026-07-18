# VENDOR-DISTRIBUTOR-NETWORK-MS0 — manufacturing vendor/distributor directory + regional reps + rep-messaging

> **Status:** BACKLOG (not started). Owner: slot **charlie** (quoting) with cross-galaxy edges to **hotel** (CRM/contacts + email-auth), **quebec** (frontend/phone-app UI), **juliett** (vendor DB persistence).
> **Created:** 2026-05-29 (operator directive, session claude-e75608b8). **Spec is the source of truth** — the in-session task list dies on /compact; pick units from here via `/pick-unit` or `/checkin-charlie /loop`.

## Operator directive (verbatim)
> "gather all possible vendors and distributors for manufacturing: websites, catalogs, inventory, pricing, quoting, contacts (have a built in system for contacting reps from vendors and distributors for each region, allow prism users to utilize their email or prism account to send messages)"

## Why this is charlie's lane
Vendor/distributor pricing + quoting + cost-basis is the quoting domain. The directory feeds the `should_cost` decomposition (material/tooling/outside-process unit costs), the secondary-ops price book, and the bid-vs-actual loop. The rep-messaging half is CRM-adjacent (hotel's territory) and UI-heavy (quebec) — those legs are cross-galaxy; charlie owns the quoting-facing directory + pricing/quoting integration and coordinates the rest.

## SEED — already on disk (do NOT re-gather)
- **`state/shared/quoting/jm-vendor-cost-index.json`** (shipped 2026-05-29, U-QP-VENDOR-AP-INGEST) — **174 real vendors JM buys from + $10M spend history + per-category unit-cost priors** (material/tooling/outside-process/overhead/freight/inspection). This is the directory's first-class seed: every vendor here is a known-good, JM-validated supplier with real pricing history. Categories already classified.
- **`state/shared/databases/jm-vendors.jsonl`** (12 vendors, juliett-owned DB).
- **`H:/PRISM/Docustrata/`** — also holds `JMD Quotes/`, `JMD Sales Orders/`, `JMD Acct RecPay/` (un-ingested; vendor quote/order docs).

## BUILD ON — existing surface (R8, do NOT duplicate)
| Existing asset | Role | Reuse for |
|----------------|------|-----------|
| `DistributorSearchEngine.ts` (14.8K) | distributor search | extend → directory backbone, don't recreate |
| `EmailMessageEngine.ts` + `emailIntakeSingleton.ts` | email send/intake | the rep-messaging transport |
| `DocumentInboxEngine.ts` (37.9K) | inbox/threads | rep message threads |
| `NotificationEngine.ts` | notifications | message delivery + reply alerts |
| `EmailPrintIntakeEngine.ts` | email→print intake | pattern for inbound rep replies |
| quoting actions `vendor_realtime_price`, `quoting_mcmaster_quote`+`_batch`, `outsource_recommend`, `insert_box_lookup` | vendor pricing/quoting | the pricing-feed layer already started |
| `state/shared/quoting/jm-vendor-cost-index.json` | cost-basis | the spend/pricing prior |

## Units (decomposition)

### U-VDN-SEED — directory backbone from the JM cost-basis
Define the vendor record schema + seed it from `jm-vendor-cost-index.json` (174 vendors). Schema: `{vendor_id, name, category[], region, website, catalog_url, contacts[], pricing_source: real-time|quote|catalog|none, jm_spend_history, jm_unit_cost_priors}`. Extend `DistributorSearchEngine` rather than a new engine. Store: juliett-owned vendor DB (`state/shared/databases/vendors.jsonl`) — coordinate with juliett. Output: a queryable directory of the 174 known vendors with their real categories + spend.

### U-VDN-CATALOG — gather "all possible" manufacturing vendors/distributors
Web-research the manufacturing supplier universe beyond JM's 174, by category:
- **Material**: Alro, Cincinnati Tool Steel, Griggs, SB Specialty Metals, McMaster, Online Metals, Metal Supermarkets, Ryerson, Crucible.
- **Cutting tools**: Kennametal, Sandvik Coromant, Iscar, Kyocera, Harvey Tool, Helical, Niagara, OSG, Guhring, Walter, Seco.
- **Tooling/workholding/MRO**: MSC Industrial, Grainger, Fastenal, Travers, Production Tool Supply, Zoro, KBC.
- **Outside-process**: coating (Oerlikon Balzers, Armor, IonBond), heat-treat (Scientific Metal Treating, Bodycote), grinding, EDM, plating, deburr.
For each: website, catalog URL(s), product domains, regions served, has-API/punchout flag. Use `/deep-research` or `WebSearch`/`WebFetch`. Output: `state/shared/quoting/vendor-catalog.jsonl` (advisory + mustHumanVerify — contact/pricing data must be human-validated before customer-facing use).

### U-VDN-INVENTORY-PRICING — inventory + pricing feeds per vendor
Classify each vendor's pricing access: **API/punchout** (MSC, Grainger, McMaster have programmatic price/availability — wire to `vendor_realtime_price` / `quoting_mcmaster_quote`), **catalog** (PDF/scrape), **quote-only** (RFQ required → routes to U-VDN-MESSAGING). Live inventory where available. Honest tiering — never present a stale catalog price as live (R12; mirrors the quoting margin-floor discipline).

### U-VDN-CONTACTS-REGIONAL — rep/contact model mapped by region
Contact record: `{contact_id, vendor_id, name, email, phone, role, region/territory, preferred_channel}`. Each vendor → reps mapped by region (the user's "for each region"). Territory model (US regions + international). This is CRM data → **coordinate with hotel** (CRM/contacts owner). Conservative PII handling (charlie soul: never loosen, treat contact data as sensitive).

### U-VDN-MESSAGING — contact-a-rep system (dual-channel)
PRISM users message reps via EITHER:
- **(a) their own email** — OAuth (Gmail/Outlook) or SMTP creds; message sends from the user's address, PRISM logs the thread. (Email-auth infra = hotel/business; transport = `EmailMessageEngine`.)
- **(b) their PRISM account** — PRISM relays on the user's behalf from a PRISM address, thread tracked in `DocumentInboxEngine`.
Message templates: RFQ, price-check, lead-time check, availability, follow-up. Inbound replies via `EmailPrintIntakeEngine` pattern → thread. Delivery + reply alerts via `NotificationEngine`. **Security**: never store raw passwords (OAuth tokens only); rate-limit outbound; audit every send.

### U-VDN-FRONTEND — directory + rep-contact UI (quebec + charlie)
Vendor directory browse/search/filter (by category/region/has-API), vendor detail (catalog/pricing/spend-history/reps), rep contact panel + message composer (channel picker: my-email vs PRISM-account), thread/inbox view. Frontend = quebec; the quoting-data wiring = charlie. New page + the `web/src/api/client.ts` calls to the VDN dispatcher actions.

## Cross-galaxy coordination (post to AGENT_CHAT before building the shared legs)
- **hotel** — CRM/contacts model + email OAuth/SMTP auth (business-infra). U-VDN-CONTACTS-REGIONAL + the auth half of U-VDN-MESSAGING.
- **quebec** — the directory + messaging UI (web + phone app). U-VDN-FRONTEND.
- **juliett** — vendor DB persistence (`vendors.jsonl` / store schema + migration). U-VDN-SEED store.

## Acceptance (per the directive)
- [ ] Directory covers the JM 174 + the major manufacturing supplier universe, by category + region, with websites + catalog links.
- [ ] Inventory/pricing access classified per vendor (API/catalog/quote-only), live where possible, honestly tiered.
- [ ] Reps mapped by region with contact records.
- [ ] A PRISM user can send a rep a message via their own email OR their PRISM account, with the thread tracked.
- [ ] Frontend surfaces all of the above.

## Related prior work + overlap (R7 — surface, don't blend)
- **`reference_hotel_jm_die_vendor_data_ingest_2026_05_29` (slot:hotel, commit U-PSGB-HOTEL-ERPDATA)** — hotel ALSO ingested JM's A/P history TODAY, into the **ERP** (business/accounting view). My U-QP-VENDOR-AP-INGEST ingested the same source into the **quoting cost-basis** (`jm-vendor-cost-index.json`, should_cost priors). **These are complementary, not duplicate** (ERP = payables/accounting; cost-index = per-category unit-cost priors for quoting) — but **U-VDN-SEED MUST pick ONE canonical vendor-identity source** and reconcile, not create a 3rd. Coordinate with hotel before seeding: likely hotel's ERP vendor records are the contact/business master, charlie's cost-index is the pricing prior, juliett persists the merged directory. Post to AGENT_CHAT first.
- **`reference_lathe_wizard_vendor_lookup_design_2026_05_27`** — an existing vendor-lookup design (lathe wizard). Read before designing U-VDN-CATALOG/INVENTORY-PRICING — may already define a lookup pattern to reuse.
- **`cam-vendor-registry` (built)** + **`vendor` node (built, L10)** — existing vendor-registry surface in the graph; `/master-index vendor` before U-VDN-SEED to enumerate all vendor-registry assets and extend the canonical one.

## Doctrine pins
- All gathered contact/pricing data is **advisory + mustHumanVerify** until validated — never auto-emit a customer-facing RFQ on unverified contact data.
- Pricing tiering honest (R12) — stale catalog ≠ live price.
- Reuse `DistributorSearchEngine` + the email/inbox/notification engines (R8) — extend, don't fork.
- PII: OAuth tokens not passwords; audit every outbound send; conservative contact-data handling.
