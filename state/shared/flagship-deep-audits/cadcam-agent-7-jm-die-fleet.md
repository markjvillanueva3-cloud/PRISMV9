# CAD/CAM Audit — Agent 7: JM Die Fleet Validation

## Corpus Comparison Status
**Ground-truth available but disconnected from autonomous pipeline.** PRISM holds 509 proven Haas mill programs across 53 customers with full metadata: tool selections (T9/T10 5/8" ball endmills), spindle speeds (S5000/S3500), feed rates, operation numbers, proven dates. **Autonomous validation: zero.** No evidence that CAD/CAM autonomous generation has been tested against JM Die proven programs. CAM AI validation framework exists (reasoning chain engines, confidence calibration, feedback loops, transfer learning) but is NOT applied to JM Die regression testing. Proven part fixtures documented (FONTANA B-1289-11 grip blocks with OP1/OP2, 3D surfacing, G154 work offset, 0.03" stepover precision).

## Per-Machine Coverage

| Machine | Status | Proven Programs | Autonomous Coverage |
|---|---|---:|---|
| Haas VF-2 (NGC) | READY | 26 | No autonomous validation |
| Hurco VM30i | BROKEN | 0 | Engine targets VMX24, not VM30i |
| Haas OM-2 (NGC) | UNKNOWN | 0 | No NGC verification catalog |
| Roku HC-658-II (Fanuc 31i-B5) | PARTIAL | 1 (ITW) | Parser exists, no post-processor wired |
| Okuma M460V-5AX (OSP-P300MA-H) | READY | 0 mill | G169/G170 RTCP wired, zero test programs |
| Okuma Multus B250II (OSP-P300SA) | LATHE ONLY | — | Lathe master-post wired; **no mill-turn B-axis autonomous strategy** |

## Customer Variability
118 customers in JM Die profile (ALCOA, OPTIMAS, ITW, FASTENAL, SFS, Holo-Krome confirmed). Haas mill programs concentrated: FONTANA (98), OMG (50), ATF (48), HEADALLOY (45), HOLO-KROME (38). Part type taxonomy defined (grip_block, guided_backstop, die_insert, punch, fixture, electrode) but **zero per-type autonomous generation strategy documented.** Customer-specific tool preferences NOT indexed in autonomous CAM bridge.

## Score: 42/100

**Rationale:**
- Ground-truth corpus (509 programs): 90/100 — comprehensive, production-validated
- Autonomous pipeline wiring: 20/100 — master posts for 3/5 mills; 2 blocked/unknown; zero jm-die-program-corpus validation harness
- Per-machine validation: 30/100 — Haas VF-2 + Okuma M460V-5AX ready but untested; Hurco + Roku broken/partial
- Mill-turn B-axis support: 0/100 — **CRITICAL**: Multus B250II has lathe wiring but no mill-turn B-axis autonomous strategy
- ERP/probing integration: 0/100 — zero machine_rates/tool magazines/probing routines wired

**Blockers:** (1) jm-die-program-corpus engine never instantiated; (2) zero autonomous-vs-proven G-code diff validation; (3) Multus B250II B-axis mill-turn logic missing; (4) customer variability NOT modeled in CAM strategy selection

**Action Required:**
1. Wire jm-die-program-corpus validation harness (compare autonomous G-code to proven program diffs)
2. Implement per-machine test fixtures (Haas VF-2 26-program baseline, Okuma M460V-5AX 5-program baseline)
3. Add Multus B250II mill-turn B-axis strategy (rotary axis kinematics + RTCP)
4. Index customer-specific tool preferences and feeds into CAM bridge

**Time to production:** 15-20 days
