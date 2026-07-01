# MACHINE-SHOP-NETWORK — outsourcing shop network (quoting galaxy)

> Generated 2026-05-29 · owner: slot:charlie (quoting) · VENDOR-NETWORK-MS0/U-VDN-SHOP-NETWORK. The SUPPLY side of outsourcing — shops PRISM routes work TO.

> **Engine (R8 — do NOT duplicate):** `ShopNetworkEngine` (E1134), singleton `shopNetworkEngine`, wired in camDispatcher: `shop_network_register`, `shop_network_search`, `shop_network_broadcast`, `shop_network_stats`. It owns ShopProfile + capability scoring + distance search + the NDA privacy model. This manifest is the DATA layer (marketplace access points + onboarding validator) the engine lacks.

**6 marketplace access-point(s) · 4 API-capable**

## Marketplace access points (external capacity — PRISM as buyer)
| marketplace | access | routes | note |
|-------------|--------|--------|------|
| [Xometry](https://www.xometry.com) | api | milling, turning, fabrication, additive, injection-mold | Instant Quoting Engine API; largest US on-demand network. |
| [Protolabs](https://www.protolabs.com) | api | milling, turning, fabrication, additive, injection-mold | Digital quoting; fast-turn CNC/IM/3DP. |
| [Fictiv](https://www.fictiv.com) | api | milling, turning, fabrication, injection-mold | Managed manufacturing network. |
| [Hubs (Protolabs Network)](https://www.hubs.com) | api | milling, turning, fabrication, additive | Distributed manufacturing network. |
| [MFG.com](https://www.mfg.com) | rfq | milling, turning, EDM, fabrication | RFQ marketplace — post a job, shops bid. |
| [Thomasnet](https://www.thomasnet.com) | directory | * | ~500k US manufacturer directory — candidate-shop discovery source. |

## How the network gets populated (R12 — no fabricated members)
Marketplace supplier networks are proprietary + a shop's machines/capacity/certs are real facts. Members enter three honest ways:
- onboard: validate a shop submission via toShopProfile() → shopNetworkEngine.registerShop()
- external: reach capacity via a marketplace API (Xometry/Protolabs/Fictiv/Hubs) as a buyer
- discover: harvest candidate shops from Thomasnet by process+region, then verify + onboard

## Onboarding contract (ShopProfile required fields)
A shop must supply: **name, location, machines, certifications, capacity_hours_per_week**. `toShopProfile(partial)` validates a submission + reports missing fields before `registerShop()`. Known certs: ISO_9001, AS9100, ITAR, NADCAP, ISO_13485, IATF_16949.

## Next (VENDOR-NETWORK-MS0)
- U-VDN-SHOP-PERSIST: give ShopNetworkEngine a persistent seed loader (it's in-memory — registered shops vanish on restart). Coordinate with the CAMX engine owner.
- U-VDN-SHOP-ONBOARD: onboarding form/flow → toShopProfile() → shop_network_register.
- U-VDN-MARKETPLACE-API: wire Xometry/Protolabs/Fictiv APIs (as buyer) for instant external quotes.
- U-VDN-THOMASNET-SEED: harvest candidate shops from Thomasnet by process+region, verify, onboard.