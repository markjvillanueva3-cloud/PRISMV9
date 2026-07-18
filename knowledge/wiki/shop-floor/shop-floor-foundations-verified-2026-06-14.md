---
name: shop-floor-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the shop-floor galaxy (machine monitoring + execution — MTConnect, OPC UA, SEMI E10/E79 OEE, ISA-95). 6 fetched sources. FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: shop-floor
  tier: VERIFIED
  verifiedBy: WebFetch
---

# shop-floor galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. Protocol/KPI standards — no machining cutting constants.

## Synthesis
Shop-floor execution rests on two interlocking protocol standards — **MTConnect** (ANSI/MTC1.4, read-only semantic XML/HTTP REST) and **OPC UA** (IEC 62541, bidirectional client-server + PubSub, security-by-design per IEC 62443) — the machine-data layer. Equipment state + productivity are formally measured via **SEMI E10** (6-state RAM model: Productive/Standby/Engineering/Scheduled-DT/Unscheduled-DT/Non-Scheduled; MTBF/MTTR) and **SEMI E79** (OEE = Availability × Performance × Quality, surfacing the six big losses). **ISA-95/IEC 62264** defines the 5-level automation hierarchy + MES/MOM activity models (scheduling, dispatching, execution, resource tracking) and the ERP(L4)↔shop-floor(L3) data-exchange contract on which MTConnect/OPC UA adapters deploy. The active frontier closes the loop: generative ML (GAN-GRU, Diffusion, Transformers; arXiv 2505.00210) consumes monitoring data and re-optimizes process parameters for real-time adaptive control.

## Verified sources
### [MTConnect Getting Started](https://www.mtconnect.org/getting-started) — standard
> "data definitions, schema, and rules for how an agent must operate — enables machine monitoring (utilization, OEE), lights-out manufacturing, job scheduling, process analytics, predictive maintenance"

**Knowledge:** MTConnect (ANSI/MTC1.4) — open royalty-free XML/HTTP REST semantic vocabulary for device data; read-only, machine-agnostic. OEE instrumentation without proprietary adapters.

### [OPC Foundation — IEC 62541 OPC UA](https://opcfoundation.org/news/opc-foundation-news/update-iec-62541-opc-ua-published/) — standard
> "the foundation for connectivity for the Internet of Things (IoT) and for the Industrie 4.0 initiative — client-server and PubSub communication models with security built-in"

**Knowledge:** IEC 62541 — client-server + PubSub transport, security-by-design (IEC 62443). Companion specs for MTConnect, ISA-95, robotics. The interoperability backbone for Industry 4.0 monitoring.

### [SEMI E10 — Equipment RAM and Utilization](https://store-us.semi.org/products/e01000-semi-e10-specification-for-definition-and-measurement-of-equipment-reliability-availability-and-maintainability-ram-and-utilization) — standard
> "establishes a common basis for communication... regarding RAM performance — defines 6 mutually exclusive equipment states, MTBF, MTTR"

**Knowledge:** 6-state equipment model + RAM metrics (MTBF, MTTR, MTTPM). Prerequisite for SEMI E79 (OEE) and E116. The state taxonomy underlies shop-floor monitoring state machines.

### [SEMI E79 — Equipment Productivity / OEE](https://store-us.semi.org/products/e07900-semi-e79-specification-for-definition-and-measurement-of-equipment-productivity) — standard
> "metrics and calculations for measurement of equipment productivity, including overall equipment efficiency (OEE)"

**Knowledge:** Canonical OEE = Availability × Performance × Quality. With E10, forms the complete equipment-performance framework; surfaces the six big losses driving adaptive scheduling.

### [ISA-95 Enterprise-Control System Integration](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) — standard
> "an abstract model for information exchange among manufacturing control functions and business functions in an enterprise"

**Knowledge:** ISA-95 (IEC 62264) — 5-level automation hierarchy + MES/MOM activity models (scheduling, dispatching, execution, resource tracking). The ERP(L4)↔execution(L3) contract under MTConnect/OPC UA adapters.

### [Generative ML in Adaptive Control of Dynamic Manufacturing Processes (arXiv 2025)](https://arxiv.org/html/2505.00210v1) — paper
> "Dynamic manufacturing processes exhibit complex characteristics defined by time-varying parameters, nonlinear behaviors, and uncertainties"

**Knowledge:** 2025 survey of generative ML (VAEs, GANs, GAN-GRU, Transformers, Diffusion) for adaptive process control; GAN-GRU for real-time weld quality. Bridges MTConnect/OPC UA monitoring → closed-loop adaptive control.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_a7a6a364-1d1). Ledger: state/shared/galaxy-knowledge-iterations.json._
