---
name: cam_synthesis
description: "[auto-synth · verify] Compounding synthesis of the cam domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: cam
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:47:07.054Z
  sourceHash: 1f5f69b7c627
  advisoryOnly: true
  mustHumanVerify: true
---

# cam — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Per‑slot enforcement & bootstrapping** – every major feature is gated behind a “BOOTSTRAP‑SLOT‑ENFORCE” stage that wires the new unit into the slot galaxy before it becomes live.  This appears in the closed‑loop integration work ([12], [13]) and the many *U‑ECHO* builds ([2], [14]‑[23]).
- **Closed‑loop data flow** – post‑processor (ECHO) modules generate, audit, and reward data in a deterministic loop: input DBs → generation → coverage audit → closed‑loop audit → post‑reward harvesting.  The sequence is documented across the *U‑ECHO* series ([16]‑[22]).
- **Deterministic per‑slot allocation** – resource‑group‑slot (RGS) assignment and claim handling are made deterministic and race‑free via dedicated allocators and auto‑release steps ([9], [10], [11]).
- **Externalized learning artifacts** – hard‑coded planner knowledge (e.g., LATHE_OP_ORDER) is moved to a durable JSON artifact that the planner loads with fail‑soft fallback, enabling self‑learning persistence ([7]).
- **Edge wiring between CAM and Juliett** – ownership of schema stays with CAM while persistence/indexing lives in Juliett; they are linked via a PSN edge for database expansion and migration ([6]).
- **Unified PRISM Paths** – core path handling is consolidated into a single library used by all per‑slot modules, reducing duplication and ensuring consistent routing ([23], [24]).

## Key decisions & rules
- **Persist learned operation order** – the planner must first attempt to load `learned-op-order.json`; if unavailable or corrupt it falls back to the built‑in default.  This rule is enforced in *U‑CAM‑SELFLEARN‑PERSIST* ([7]).
- **Slot ownership of data vs. persistence** – CAM retains authority over data definitions; Juliett owns the underlying storage and indexing layers.  All cross‑slot queries must pass through the PSN edge defined in the *kilo ↔ juliett* integration ([6]).
- **Deterministic RGS allocation per slot** – each slot runs `U‑PER‑SLOT‑RGS‑ALLOCATOR` to compute a static mapping; no dynamic rebalancing is allowed without an explicit migration plan ([9]).
- **Closed‑loop audit must achieve 100 % coverage** – the *U‑PSGB‑RECONCILIATION* test suite validates that every generated artifact is audited (20/20) before promotion ([3]).
- **Post‑generation reward harvesting must be non‑circular** – rewards are harvested only after all audits complete, preventing feedback loops that could corrupt learning signals ([21]).

## Open threads
- **Scalability of self‑learned op order** – while the JSON artifact is durable, its size and update frequency as the system learns more complex sequences remain untested at scale.
- **Cross‑slot meta‑bus extension** – `U‑PSCL04` extended wiring to nine additional non‑hybrid domains, but further integration points (e.g., with future slots) are still undefined ([13]).
- **PDF render count bump impact** – the increase in PDF render/count for the X‑ray slot (`U‑PSGB‑XRAY‑RENDER‑TIMEOUT`) may affect downstream storage quotas; monitoring plans are not documented ([4]).
- **Chat capacity rebalancing interaction with CAM slots** – *FLEET‑REAPER‑MS3* upgrades chat capacity, but its coordination with per‑slot claim and allocation mechanisms has not been formalized.
