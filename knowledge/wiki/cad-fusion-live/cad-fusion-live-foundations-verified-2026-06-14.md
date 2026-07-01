---
name: cad-fusion-live-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the cad-fusion-live galaxy (live Fusion 360 automation — API object model, events, custom features, .f3d round-trip). 7 fetched Autodesk API docs. FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: cad-fusion-live
  tier: VERIFIED
  verifiedBy: WebFetch
---

# cad-fusion-live galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted from the official Autodesk Fusion API manual.

## Synthesis
Live Fusion 360 automation centers on four interlocking systems: (1) the **hierarchical object model** (Application → Documents → Design → RootComponent → Collections) where all in-host geometry mutation is driven by Input objects and `collection.add()` calls mirroring dialog semantics; (2) the **event + command lifecycle** — handlers via `event.add()` with `notify()` callbacks, and the command pipeline (commandCreated → activate → inputChanged → validateInputs → executePreview → execute → destroy) where everything in `execute()` is a **single atomic undo transaction**; (3) **custom features** with declared dependencies that fire `customFeatureCompute` on upstream parametric change (model rewinds to feature-creation state during compute); (4) the **.f3d round-trip** via `ExportManager.createFusionArchiveExportOptions()` for desktop scripts, with the cloud Design Automation API lifting the same 7,000-endpoint surface to headless pay-per-use scale (3.0 Flex tokens/hr). **Critical Python-runtime constraint:** all script/add-in code runs on Fusion's main thread → long mutation loops must call `doEvents()` to yield UI; event-handler objects must stay in scope or the GC silently reclaims them, causing handlers to vanish mid-session.

## Verified sources
### [Fusion API: Basic Concepts](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/BasicConcepts_UM.htm) — article
> "Collections also provide support for the creation of new objects by means of various add methods. The Design object includes a single, top-level component known as the root component."

**Knowledge:** Object hierarchy Application → Documents → Design → RootComponent; geometry mutation via collection `add()`; feature creation via Input objects mirroring dialog options.

### [Events in the Fusion API](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Events_UM.htm) — article
> "Events allow you to receive notifications when specific actions occur within Fusion. Fusion will call your handler function whenever the related action occurs..."

**Knowledge:** Event-driven architecture — handlers via `event.add(handler)`, all derive from `notify()`, EventArgs carry context. Enables reactive add-ins without polling.

### [Custom Features in the Fusion API](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/CustomFeatures_UM.htm) — article
> "Whenever the user edits any of the custom parameters... or any of the dependencies change... Fusion will fire the compute event to allow the add-in to update the feature."

**Knowledge:** Custom features group parametric operations under one timeline node; dependency declarations trigger `customFeatureCompute` on upstream change; model reverts to creation time during compute.

### [Creating Custom Fusion Commands](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Commands_UM.htm) — article
> "everything you do in the execute event handler is bundled within a single transaction and can be undone with one undo."

**Knowledge:** Command lifecycle (commandCreated → activate → inputChanged → validateInputs → executePreview → execute → destroy); all mutations in `execute()` = one atomic undo transaction (essential for production geometry automation).

### [Fusion 360 ExportManager API Sample](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ExportManager_Sample.htm) — article
> "archOptions = exportMgr.createFusionArchiveExportOptions(fileName, comp) followed by exportMgr.execute(archOptions)"

**Knowledge:** ExportManager is the canonical .f3d round-trip surface (also IGES/SAT/SMT/STEP/USD from the same pattern) — multi-format pipelines from one script.

### [Fusion Automation API Now Generally Available (Autodesk Platform Services)](https://aps.autodesk.com/blog/design-automation-api-fusion-now-generally-available) — article
> "Tasks you traditionally scripted in your Fusion desktop client can now run at scale in the cloud without requiring any user interaction."

**Knowledge:** Cloud Design Automation API lifts the full 7,000-endpoint scripting surface to headless pay-per-use (3.0 Flex tokens/hr) — headless .f3d mutation, milling automation, PLM/MES integration at scale.

### [Python-Specific Issues in the Fusion API](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/PythonSpecific_UM.htm) — article
> "Python runs within the Fusion process and also runs in the main Fusion thread. The doEvents() function temporarily halts the execution... and gives Fusion a chance to handle any queued up messages."

**Knowledge:** Single-threaded main-thread execution; `doEvents()` yields control during long mutation loops; use `==` not `is`, `isinstance()` for inheritance, tuple-unpacking for multi-return.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_a7a6a364-1d1). Ledger: state/shared/galaxy-knowledge-iterations.json._
