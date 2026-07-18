# Cross-Dialect Token-Leak Triage (2026-05-26)

**Slot:** echo (claude-9029a5d7) · **Trigger:** iter14 P0 D11 fix unmasked these 5 leaks from POST-PROCESSOR-PROVE-OUT-2026-05-26

**What this is:** when the validator's iter14 fix made the engine actually run (was returning quality_score=0 short-circuit), 5 scenarios surfaced where the engine emitted G/M codes that the scenario explicitly forbids for that dialect. This is a real dialect-purity bug in MasterPostProcessorUnifiedAGIEngine — the offending tokens come either from (a) shared codegen templates that don't branch on dialect, or (b) the optimize-existing-gcode branch passing through stub tokens that the dialect rule rejects.

**Found:** 5 leak scenario(s) of 200 total.

## Per-scenario findings

### PP-S-00122 — heidenhain / drilling

**Banned tokens that leaked into engine output:** `G81`

**Engine output (first 800 chars):**
```
0 BEGIN PGM TEST MM
1 BLK FORM 0.1 Z X-50 Y-50 Z-25
T2 M06
S2500 M03
; HSM SMOOTHING ENABLED
M120
; --- TRIBAL KNOWLEDGE ---
; TIP: FUNCTION TCPM requires plane definition - M128 alone is insufficient
; ------------------------
G00 X10 Y10
G81 Z-10 R2 F150
G80
99 END PGM TEST MM

```

**Enhancements applied:** hsm_injected, physics_validated, tribal_knowledge_injected

**Quality score:** 75

---

### PP-S-00140 — heidenhain / drilling

**Banned tokens that leaked into engine output:** `G81`

**Engine output (first 800 chars):**
```
0 BEGIN PGM TEST MM
1 BLK FORM 0.1 Z X-50 Y-50 Z-25
T2 M06
S2500 M03
; HSM SMOOTHING ENABLED
M120
; --- TRIBAL KNOWLEDGE ---
; TIP: FUNCTION TCPM requires plane definition - M128 alone is insufficient
; ------------------------
G00 X10 Y10
G81 Z-10 R2 F150
G80
99 END PGM TEST MM

```

**Enhancements applied:** hsm_injected, physics_validated, tribal_knowledge_injected

**Quality score:** 75

---

### PP-S-00148 — heidenhain / drilling

**Banned tokens that leaked into engine output:** `G81`

**Engine output (first 800 chars):**
```
0 BEGIN PGM TEST MM
1 BLK FORM 0.1 Z X-50 Y-50 Z-25
T2 M06
S2500 M03
; HSM SMOOTHING ENABLED
M120
; --- TRIBAL KNOWLEDGE ---
; TIP: FUNCTION TCPM requires plane definition - M128 alone is insufficient
; ------------------------
G00 X10 Y10
G81 Z-10 R2 F150
G80
99 END PGM TEST MM

```

**Enhancements applied:** hsm_injected, physics_validated, tribal_knowledge_injected

**Quality score:** 75

---

### PP-S-00151 — heidenhain / drilling

**Banned tokens that leaked into engine output:** `G81`

**Engine output (first 800 chars):**
```
0 BEGIN PGM TEST MM
1 BLK FORM 0.1 Z X-50 Y-50 Z-25
T2 M06
S2500 M03
; HSM SMOOTHING ENABLED
M120
; --- TRIBAL KNOWLEDGE ---
; TIP: FUNCTION TCPM requires plane definition - M128 alone is insufficient
; ------------------------
G00 X10 Y10
G81 Z-10 R2 F150
G80
99 END PGM TEST MM

```

**Enhancements applied:** hsm_injected, physics_validated, tribal_knowledge_injected

**Quality score:** 75

---

### PP-S-00154 — heidenhain / drilling

**Banned tokens that leaked into engine output:** `G81`

**Engine output (first 800 chars):**
```
0 BEGIN PGM TEST MM
1 BLK FORM 0.1 Z X-50 Y-50 Z-25
T2 M06
S2500 M03
; HSM SMOOTHING ENABLED
M120
; --- TRIBAL KNOWLEDGE ---
; TIP: FUNCTION TCPM requires plane definition - M128 alone is insufficient
; ------------------------
G00 X10 Y10
G81 Z-10 R2 F150
G80
99 END PGM TEST MM

```

**Enhancements applied:** hsm_injected, physics_validated, tribal_knowledge_injected

**Quality score:** 75

---

## Triage tomorrow

For each leak above:
1. Identify whether the leaked token is in our stub (synthesizeOpStubGcode passes through to optimize-existing-gcode branch) OR in the engine's added enhancements (HSM injection / coolant / etc.)
2. If stub-source: scenario corpus is wrong (stub uses a non-dialect-pure base) OR validator should not gate stub passthrough
3. If engine-source: MasterPostProcessorUnifiedAGIEngine has a real dialect-purity bug — the enhancement path is not dialect-aware
4. Fix in priority order: engine-source bugs first (real product issue), then scenario/stub.

## Provenance
- Runner: `scripts/find-cross-dialect-leaks.mjs`
- Parent prove-out: `state/shared/specs/POST-PROCESSOR-PROVE-OUT-2026-05-26.md`
- Validator fix: iter14 commit (slot/echo)
- Engine: `mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts`
