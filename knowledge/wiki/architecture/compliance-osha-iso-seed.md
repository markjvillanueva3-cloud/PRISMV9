---
title: OSHA + ISO compliance seed (U-VICTOR-B4)
type: architecture
status: seed
created: 2026-05-27
slot: victor
related:
  - knowledge/wiki/architecture/engines/compliance-safety.md
  - knowledge/wiki/architecture/dispatcher-safety.md
tags: [osha, iso, compliance, safety, audit, seed]
---

# OSHA + ISO compliance — seed

Operator named **OSHA**, **ISO certification**, and **audits** as domains (per /goal 2026-05-27). Iter-1 found:
- OSHA: 14 wiki / 1 tribal / 0 memory — sparse
- ISO: 207 wiki / 6 tribal — moderate (overstated; many are ISO-286 fit values, not certification)
- Audits: 426 wiki / 99 tribal — strong, but mixed (development audits ≠ compliance audits)

The `mcp-server/src/engines/compliance-safety/` galaxy sentinel exists but the `mcp-server/data/docs/galaxies/compliance-safety/ENGINE_DIGEST.md` is absent. This is the gap.

## Existing prior art (R8 — flagged by pre-write graph context)

- **`osha-300-log`** (L10/built) — OSHA 300 injury/illness log engine ALREADY exists. Compliance-safety galaxy is not greenfield; this seed maps remaining standards (1910.x, ISO-12100, AS9100, IATF 16949) onto where they belong relative to that engine.
- **`compliance`** (L4/built) — compliance layer is built; check `mcp-server/src/engines/compliance-safety/CLAUDE.md` for current dispatcher contract.
- **`state/compliance`** (L8/built) — compliance state surface for audit-trail persistence.

The standards table below is a **coverage matrix** against the existing engines — use to identify which standards still need engine surface.

## What the compliance galaxy needs to cover

| Surface | Standard | PRISM enforcement point |
|---------|----------|-------------------------|
| **Machine guarding** | OSHA 29 CFR 1910.212 + ISO 12100 | engine-spawn safety pre-flight (`prism_safety:validate_machine_guard`) |
| **Lockout/tagout (LOTO)** | OSHA 29 CFR 1910.147 | maintenance work-order gating |
| **Hearing protection** | OSHA 29 CFR 1910.95 | machine-spec sound-pressure threshold (already in `MachineRegistryEngine`) |
| **Respiratory** | OSHA 29 CFR 1910.134 | coolant/mist + dry-machining mode tags |
| **Quality mgmt** | ISO 9001 | audit-trail dispatcher (already partial) |
| **Med devices** | ISO 13485 | not yet — JM Die does aerospace/auto, not med-dev |
| **Aerospace** | AS9100 + Nadcap | JM Die scope — chip control + traceability + first-article inspection |
| **Auto** | IATF 16949 | JM Die scope — PPAP packaging |

## Engine-digest gap

Run this to populate the missing digest (per `scripts/generate-per-galaxy-engine-digest.mjs`):

```bash
node H:/prism/scripts/generate-per-galaxy-engine-digest.mjs --galaxy compliance-safety
```

This emits `mcp-server/data/docs/galaxies/compliance-safety/ENGINE_DIGEST.md` for engines named with `Compliance*`, `Safety*`, `OSHA*`, `ISO*`, `Audit*`. Run is operator-time (not part of this seed).

## Tribal seeds

OSHA and ISO knowledge in the shop comes from three sources:
1. **Vendor manuals** — controllers ship with sound/vibration/emission specs (already in `JM DIE/` corpus; `pdf-parse-extract.mjs` would surface them)
2. **Shop SOPs** — JM Die has a binder of paper SOPs; needs digitization run
3. **Standards bodies** — OSHA + ISO publish PDFs (free for OSHA, paid for ISO); legal-to-ingest under fair-use research carve-out

Lane assignment: tribal seeds for OSHA-1910 + ISO-12100 land first (highest-risk, most-cited). Other standards as the shop encounters them.

## Closed-loop wiring (when engines ship)

1. Machine spec published → `prism_safety:validate_physics` runs guarding + sound checks
2. Operator overrides a safety gate → audit-trail dispatcher logs the override + flags review
3. Quality dispatcher computes Cpk → ISO 9001 audit-evidence chain auto-populates
4. AS9100 first-article inspection → traveler completion (shop-floor) writes the FAI form

## References

- [[feedback_psn_definition]] — compliance sits in PSN leg #2 (PRISM OS), audit role + leg #11 (PRISM AI) safety route
- [[reference_existing_tribal_wiki_pipeline_2026_05_27]] — promote tribal standards extracts via the existing pipeline
- CLAUDE.md §SAFETY — Ω≥0.95 / S(x)≥0.98 floor for all safety-relevant engines
