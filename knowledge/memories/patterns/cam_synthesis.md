---
name: cam_synthesis
description: "[auto-synth · verify] Compounding synthesis of the cam domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: cam
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:57:19.886Z
  sourceHash: 54e3c13d9266
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
- **Per‑slot enforcement** – every slot owns its own `CLAUDE.md` and related loaders, claim pipelines, and RGS allocators (e.g., [13], [16]–[22], [15]).  
- **Auto‑distilled post‑ship learnings** – each shipped component produces a wiki “auto‑distilled learning” entry that feeds back into the next iteration (e.g., [3]–[6], [14]–[18]).  
- **Full‑corpus tool distribution** – a single unified 118 k‑tool + holder corpus is copied to every CAD/CAM seat and exported to all supported DB formats ([7], [8]).  
- **Closed‑loop self‑learning persistence** – planner order externalized to `learned-op-order.json` and reloaded with soft fallback; persistent learning artifacts are versioned per slot ([11], [12]).  
- **Edge wiring between galaxies** – CAM (kilo) connects to the JULIETT database‑expansion PSN edge for persistence/indexing/migration ([10]); meta‑bus integration for closed‑loop across domains ([24]).  
- **LLM‑free autonomous recipe engine** – `CAMDRIVE‑RECIPE‑ENGINE‑MS0` executes full Fusion CAM programs without LLM assistance ([9]).  
- **Build‑out campaign lifecycle** – standardized pipeline “deepen → test → simulate → validate → fine‑tune → Kienzle frontend” applied to all operator‑named galaxies ([1]).  

## Key decisions & rules
- **Slot‑local `CLAUDE.md` mandatory** – each slot must edit and load its own domain‑tailored markdown; the monolithic 101 KB file is disabled ([13]).  
- **Planner order externalization** – hard‑coded lathe operation order replaced by a durable JSON artifact, loaded with fail‑soft fallback to ensure continuity ([11]).  
- **Tool corpus uniformity** – the complete tool + holder corpus must be present in Fusion `.tools`, hyperMILL `.hmt`, and Mastercam `.mcam-tools` for every active seat ([7], [8]).  
- **Deterministic per‑slot RGS allocation** – slot‑specific resource‑group scheduler is enforced to avoid cross‑slot contention ([15]).  
- **Claim pipeline sequencing** – step‑12 claim integration, auto‑release, and stop‑time advisory are required for safe concurrent operations ([16], [17]).  
- **Edge ownership split** – CAM retains data/schema; JULIETT owns persistence/indexing/migration responsibilities ([10]).  
- **Closed‑loop learning cycle** – self‑learned operation order persisted via `U-CAM-SELFLEARN-PERSIST` and fed back into the planner on each session start ([12], [24]).  

## Open threads
- **Validation of self‑learning persistence across all slots** – ensure `learned-op-order.json` remains consistent after slot upgrades and reboots.  
- **Scalability of full‑corpus export** – monitor performance when adding new CAD platforms or expanding the tool set beyond 118 k items.  
- **Performance metrics for the JULIETT PSN edge** – quantify latency and throughput impacts on CAM’s data pipelines.  
- **Final fine‑tuning of `CLAUDE.md` waves** – complete wave‑2 adjustments for the remaining 11 galaxies ([22]) and verify canonical alignment ([21]).  
- **Closed‑loop meta‑bus integration completeness** – confirm that all domain galax meta‑buses are fully wired and error‑free after the PER‑SLOT‑CLOSED‑LOOP‑INTEGRATION step ([24]).  
- **XRAY render timeout handling** – assess whether the PDF render count bump resolves timeout issues without side effects ([6]).  
- **Reaper chat capacity post‑upgrade** – monitor live‑chat memory usage to ensure the “keep live chats at full capacity” goal holds under peak loads ([12]).
