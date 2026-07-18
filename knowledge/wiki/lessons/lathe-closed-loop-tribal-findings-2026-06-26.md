---
title: Lathe closed-loop + tribal — reusable lessons & bug-finding classes (2026-06-26)
type: lessons
galaxy: lathe
slot: whiskey
created: 2026-06-26
tags: [lathe, closed-loop, tribal, step-geometry, safety-envelope, classifier, bug-class]
related:
  - "[[reference_whiskey_rungc_step_loop_closed_2026_06_26]]"
  - "[[reference_whiskey_tribal_not_in_generation_gap_2026_06_26]]"
  - "[[node-fetch-localhost-ollama-broken-use-curl]]"
---

# Lathe closed-loop + tribal — reusable lessons (Kienzle session, 2026-06-26)

Compounding lessons from the Kienzle/Lathe-Wizard closed-loop + tribal session (slot:whiskey). The
per-session detail lives in the linked memories; this is the queryable, generalizable distillation
(bug-finding→wiki gate, `feedback_always_update_wiki_on_bug_finding`).

## 1. STEP geometry → turning leg WITHOUT analytic B-rep (pattern)
occt-import-js returns a surface MESH, not analytic cylinders — `TurningCADImportEngine.importSolid`
wants analytic faces. **Pattern:** reconstruct the turning silhouette by a radial sweep about the
detected revolution axis (`step-mesh-rotational-profile.mjs` → od/id profile), then map the profile
→ `od_contour`/`id_contour` TurningFeatures (mirror `TurningPrintIntakeEngine.profileToTurningFeature`)
→ `normalizeLatheInput` → `runPipeline`. Bypasses the analytic-face requirement entirely. The
`suspect` flag (angular-symmetry score) + multi-body `selectBestBodyProfile` reject non-revolution
bodies (electrodes/molds/toolholders) so the loop never scores against bad geometry (R12).
**Corpus reality:** JM STEP CAD is electrode/mold-dominated — genuine turned bodies of revolution are
RARE (~1 in 20). Turned-part ground-truth lives in the `.MIN` programs, not STEP.

## 2. Safety envelope: use the fleet FLOOR, never the MAX
When a closed-loop safety check needs machine limits but the specific machine is unknown, derive the
envelope from the shop fleet and **consume the FLOOR (most restrictive machine), not the max**. A
program within the floor is feasible on EVERY machine; the floor can NEVER mark SAFE a program that
would overspeed/stall the weakest one (no false-SAFE — honors the "never soften safety thresholds"
refuse). Source the limits from `ShopConfigurationEngine.getMachines()`, never inline. `sfm_max` is
ft/min (SFM) in `LatheTribalSignal` — a m/min cap is a 3.28x safety error (UNITS-FIRST).
Note: an rpm floor written into the program's own G50 clamp makes the overspeed axis CONFIRMATORY;
POWER is the discriminating axis — disclose this so `overspeed=0` isn't over-read.

## 3. Tribal advisory-vs-parametric LAW (vendor catalog corpus)
A vendor-catalog / machine-manual tribal corpus is **overwhelmingly ADVISORY** (tool/insert selection,
coating, holding, safety) — empirically **~0% genuine parametric** (speed/feed/depth) signals. So:
- **DO** surface relevant tips per part as ADVISORY (lexical match op-types+material → top-N).
- **DO NOT** wire free-text tips into program GENERATION as adjustment factors — net-NEGATIVE: the
  LLM classifier *hallucinates* factors from control-code mentions (e.g. "Use FF2 for the feedrate"
  → `feed_factor:1.2`), which would inject bad biases into real programs.
- Measure yield on a sample BEFORE committing to a wiring build — the measurement is the payoff.

## 4. Bug-finding classes (R12 — do not repeat)
- **Windows path-casing double-count:** a resumable cursor keyed on a raw path double-counts the same
  file reached via `H:/PRISM/...` vs `H:/prism/...` (case-insensitive FS, distinct strings). Key the
  cursor on a canonical lowercased path.
- **sfm_max units drift:** a producer emitting m/min into a consumer that reads ft/min is a 3.28x
  safety-cap error. Match the consumer's unit at the producer; band-bound absolute caps ([20,3000] ft/min)
  since the consumer doesn't re-clamp them.
- **Classifier factor-hallucination:** an LLM invents a parametric factor from a number-in-a-code.
  Guard: accept a relative factor ONLY when the source text states a directional CHANGE verb + a number
  (`hasFactorEvidence`); an absolute cap only with a surface-speed context + number. Monotonically safe
  (only restricts acceptance).
- **dashboard `safety_basis` from a live var on a rebuild-only run:** derive display fields from what the
  scored ROWS used, or resolve the source even when nothing was processed this fire — else the dashboard
  self-contradicts (rows SAFE, header says PARTIAL).

## 5. Resumable $0-Ollama drain cadence (host-specific)
`--limit 1` per fire is the ONLY non-reaped cadence for GPU-heavy Ollama drains on this host
(`--limit ≥2` → exit 255 fleet-reaper kill). Resumable cursor = no loss on a kill. node `fetch` is
broken for localhost Ollama — use a `curl` subprocess ([[node-fetch-localhost-ollama-broken-use-curl]]).
