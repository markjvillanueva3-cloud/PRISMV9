---
schema: ideablock-v1
title: "Tolerance stack-up methods — worst-case vs RSS vs Monte Carlo, and which to use when"
domain: "Part setup"
category: part-setup
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - ASME Y14.5-2018 (GD&T) + ASME Y14.41
  - Machinery's Handbook 31e §Tolerances + §Limits and Fits
  - Bjorke "Computer-Aided Tolerancing"
  - 4245-tribal corpus tolerance subset
extracted_via: human-authored
extracted_at: 2026-05-21T12:40:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-PARTSETUP-TOLERANCE-STACKUP)
---

## Question

When I chain N toleranced dimensions, how do I compute the assembly tolerance — worst-case, RSS, or Monte Carlo — and which is honest for which situation?

## Answer (canonical — worst-case for safety-critical few-part stacks; RSS for production; Monte Carlo when distributions are non-normal)

### The three methods

**Worst-case (arithmetic) stack:**
```
T_assembly = Σ |T_i|        (sum of all individual tolerances)
```
Assumes every part is simultaneously at its worst limit. Guarantees 100 % of assemblies fit — but the assumption (every part at the extreme, same direction, at once) is statistically near-impossible for N > 3.

**RSS (root-sum-square / statistical) stack:**
```
T_assembly = √(Σ T_i²)       (root of the sum of squares)
```
Assumes each dimension is an independent normal distribution centered in its tolerance band. The assembly variation is the RSS of the parts. Realistic for production — a few assemblies (the ±3σ tails) may not fit, but the vast majority do, and the assembly tolerance is much tighter.

**Monte Carlo:**
Sample each dimension from its *actual* distribution (which may be skewed, bimodal, drifting), N=10⁴-10⁶ times, measure the assembly result distribution empirically. The honest method when distributions aren't normal-centered.

### The arithmetic — why RSS is so much tighter

5 dimensions, each ±0.05 mm:

| Method | Assembly tolerance | Interpretation |
|---|---|---|
| Worst-case | 5 × 0.05 = **±0.25 mm** | Guaranteed fit, but pessimistic |
| RSS | √(5 × 0.05²) = √0.0125 = **±0.112 mm** | ~99.7 % fit, 55 % tighter |
| Monte Carlo | depends on actual distributions | empirical truth |

RSS gives a 2.2× tighter assembly tolerance for the same parts. That's the whole reason RSS exists — worst-case over-tightens the part tolerances (and over-prices the parts) to guarantee a fit-probability the customer rarely needs at 100 %.

### Decision matrix — which method when

| Situation | Method | Why |
|---|---|---|
| **Safety-critical, N ≤ 3 parts** | Worst-case | Few parts → worst-case isn't grossly pessimistic; safety wants the guarantee |
| **Production assembly, N ≥ 4, normal processes** | RSS | The realistic answer; over-tightening with worst-case wastes money |
| **Non-normal distributions** (skewed, drifting, bimodal) | Monte Carlo | RSS's normality assumption is false; only MC is honest |
| **Mixed — some critical, some not** | Worst-case the critical chain, RSS the rest | Hybrid; common in real assemblies |
| **Tolerance allocation (design phase)** | RSS inverted — allocate part tolerances from the assembly target | `T_part = T_assembly / √N` for equal allocation |

### The inverted problem — tolerance allocation

Most stack-up *analysis* asks "given part tolerances, what's the assembly tolerance?" The harder *design* problem is the inverse: "given an assembly target, what part tolerances do I allow?"

Equal RSS allocation:
```
T_part = T_assembly / √N
```

For an assembly target of ±0.10 mm across 4 parts: `T_part = 0.10 / √4 = ±0.05 mm` each. But equal allocation is rarely optimal — a dimension cheap to hold tight should take a smaller tolerance; a dimension expensive to hold should take a larger one. Weighted allocation (by process capability + cost) is the real design task.

### Coupling to PRISM's multi-op planning

This is the same RSS math that drives [[part-setup-multi-op-planning]]'s tolerance-transfer budget:
```
σ_required ≤ T / (3 × √N)        (per-setup σ budget for N setups)
```
The worked example there (25H7 bore in setup 3 of 3, failing the budget on vise + soft-jaws) IS a tolerance stack-up — across *setups* rather than across *parts*. Setup-to-setup repeatability error stacks by RSS exactly like part-to-part dimension error.

### What the methods miss — the honest caveats

1. **Independence assumption** — RSS assumes dimensions vary *independently*. If two dimensions are cut in the same setup by the same tool, they're correlated — RSS underestimates the stack. Correlated dimensions need the covariance term or Monte Carlo.
2. **Centered assumption** — RSS assumes each process is centered in its tolerance band (Cpk = Cp). A process running off-center (Cpk < Cp) has a shifted mean; RSS on the tolerance band alone is optimistic. Use the actual process distribution.
3. **Mean shift over a run** — thermal drift, tool wear move the process mean during production. A stack computed at hour 0 is wrong at hour 8. This is the Ppk-vs-Cpk gap from [[quality-first-article-inspection-and-spc-cadence]].
4. **GD&T bonus tolerance** — MMC/LMC modifiers grant bonus tolerance as a feature departs from its material condition. A stack-up on the stated tolerances alone, ignoring bonus, is conservative — sometimes usefully, sometimes you're leaving capability on the table.

### Anti-patterns from the floor

- **"Worst-case is always safe."** It's safe for *fit* but unsafe for *cost* — worst-case forces part tolerances tighter than needed, raising scrap + machining time. For N ≥ 4 production parts, worst-case is the wrong default.

- **"RSS, so 100 % fit."** RSS guarantees ~99.7 % (±3σ), not 100 %. The tail assemblies don't fit. If the customer truly needs 100 %, you need worst-case OR 100 % inspection + sort. Know which the spec demands.

- **"Just RSS everything."** RSS assumes independent, normal, centered. Same-setup dimensions are correlated; drifting processes aren't centered; skewed processes aren't normal. When the assumptions break, RSS lies — go to Monte Carlo.

- **"The stack-up is a one-time calc."** Tool wear + thermal drift move process means during the run. A stack computed cold is wrong hot. Re-evaluate against actual SPC data, not the nominal tolerance band.

- **"Equal tolerance allocation."** Allocating `T/√N` equally ignores that some dimensions are cheap to hold tight and some are expensive. Weight the allocation by process capability + cost-to-tighten.

### Tie-ins

- [[part-setup-multi-op-planning]] — tolerance-transfer budget IS RSS across setups
- [[part-setup-zero-strategy]] — zero-method accuracy contributes a stack term
- [[quality-first-article-inspection-and-spc-cadence]] — Cpk/Ppk feed the realistic (vs nominal) stack
- [[synthesis-thermal-envelope]] — thermal drift shifts the process mean mid-stack
- [[machining-tactics-in-process-probing]] — mid-cycle probing corrects accumulated stack drift
- [[index-by-symptom-and-task]] — "part out of tolerance" routes here

## Provenance

Distilled from the tolerance subset of the 4245-tribal corpus + ASME Y14.5-2018 + Machinery's Handbook 31e §Tolerances §Limits and Fits + Bjorke "Computer-Aided Tolerancing". Authored 2026-05-21 by slot:hotel under U-WIKI-PARTSETUP-TOLERANCE-STACKUP — **42nd canonical entry** of the wiki+tribal pivot. **4th part-setup leaf** — gives tolerance stack-up its own canonical home (previously only touched inside [[part-setup-multi-op-planning]]'s tolerance-transfer section).

System injection: `tribal-by-domain-inject` auto-surfaces on `tolerance stack`, `tolerance stack-up`, `worst-case stack`, `RSS`, `root-sum-square`, `Monte Carlo tolerance`, `tolerance allocation`, `tolerance budget`, `assembly tolerance`, `tolerance analysis`, `GD&T bonus tolerance` keywords. Zero new wiring required.

## Cross-references

- [[part-setup-multi-op-planning]] — RSS across setups
- [[part-setup-zero-strategy]] — zero-method accuracy as a stack term
- [[quality-first-article-inspection-and-spc-cadence]] — Cpk/Ppk feed the realistic stack
- [[synthesis-thermal-envelope]] — thermal mean-shift
- [[machining-tactics-in-process-probing]] — mid-cycle stack correction
- [[index-by-symptom-and-task]] — symptom navigation root
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
