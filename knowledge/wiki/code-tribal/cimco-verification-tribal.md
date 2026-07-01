---
title: CIMCO Edit / Machine Simulation — tribal tips (verification, formats, automation)
type: code-tribal
status: active
domain: post-processor
tags: [cimco, tribal, machine-simulation, post-processor, mcfg, erpost, dnc, automation]
created: 2026-06-02
by: claude-321c1d3f (slot:echo)
related:
  - cimco-verification-simulation-integration
  - reference_cimco_install_corpus_2026_06_02
---

# CIMCO tribal tips — verification, formats, automation

Concrete, hard-won tips for using CIMCO Edit 2026 + Machine Simulation as PRISM's verification/sim oracle. Each cites the source so claims are checkable.

1. **`.mcfg` is JSON, not proprietary.** A machine definition opens as plain JSON: `MachineDefinition.Collision[]` is an array of named collision pairs (`GroupOne`/`GroupTwo`, e.g. "Tool | Workpiece", "C | Z"), and components reference `.stl` meshes by name. PRISM can parse + author machine defs directly without CIMCO's editor. *Source:* `resources/cimco-2026/CIMCOEdit/MachineCfg/Cimco Lathe 3 Axis C.mcfg`.

2. **CIMCO posts are JavaScript — readable and authorable.** `Posts/*.js` carry a `globals` block (decimalMark, axis names, `xDiameterProg`, tolerance), `PostInfo{type: POST_TYPE_TURN|POST_TYPE_MILL}`, and field tables (e.g. `TurnDrillingFields` with pecking/dwell flags). Echo can read AND generate these. *Source:* `Posts/Lathe/IsoLathe_X_down_Z_left_Processor.js`.

3. **`.eRPost` is BINARY/compiled — do NOT try to read or author it as text.** Opening `RPost/**/*.eRPost` yields raw bytes; it requires CIMCO's RPost editor. Same format as the JM `Haas_Lathe_NGC_96-8910J.eRPost`. Treat as reference/asset only; for editable dialect work use the `.js` posts. *Source:* `RPost/Centroid/Centroid_Milling.eRPost` (verified binary).

4. **Machine Simulation ships as its own exe (`CIMCOSimulation.exe`, 6.9 MB), separate from `CIMCOEdit.exe`.** This is the headless-automation candidate — drive sim without the full editor GUI. But confirm the CLI arg surface (`/?`, the `edit_us.chm` help, or vendor docs) before relying; do not assume a flag exists. *Source:* `resources/cimco-2026/CIMCOEdit/` root listing.

5. **CIMCO bundles MariaDB.** `mariadb.exe` + `mariadb-dump.exe` ship in the install — the NC-Base/DNC-Max/MDC-Max datastore is a real SQL DB. juliett/hotel read program-management + machine-data via SQL, not screen-scraping. *Source:* install root.

6. **Prefer API/CLI over UI-automation (R5).** Unlike Hurco WinMax (WCF + UIA only, forced screen-scrape), CIMCO exposes CLI switches, a 2026 REST API, the DNC-Max API/`DNCMaxCtrl.exe`/TCP. Build the control map API-first; reserve UIA (a `cimco-ui-map.json` cloned from `winmax-ui-map.mjs`) only for GUI-only actions like visual prove-out.

7. **Use CIMCO File Compare for golden byte-checks, but know it ignores trivial diffs.** File Compare flags new/changed/deleted lines but *ignores* block renumbering + spacing. For strict byte-equivalence vs a golden `.NC`, normalize only documented non-semantic whitespace; don't let File-Compare's leniency hide a real format drift. *Source:* cimco.com File Compare docs.

8. **Machine Simulation = the verification oracle, but label output honestly.** It detects collisions, over-travel, gouges, stock-vs-design deviation, and emits a line-linked Simulation Report + cycle time. Report results as "CIMCO-sim-verified (machine `<mcfg>`)" — never as "controller-verified": it models kinematics, not the controller's firmware (alarms/servo timing still differ from the real control).

9. **Sim fidelity depends on the `.mcfg` being right.** A wrong kinematic chain / travel limit / missing fixture STL gives false confidence. Build JM's VMC-01..05 + lathe machine defs from the CIMCO templates (e.g. "Cimco Lathe 4 Axis CY + Sub") and validate axis travels against the real machine specs before trusting a clean sim.

10. **WEDM is the weak spot.** CIMCO Edit edits + backplots wire NC, but full kinematic WEDM machine-sim is limited. For wire-EDM, keep PRISM's own discharge-physics sim authoritative; use CIMCO only for NC edit/compare/backplot. (mike, be explicit about this in any quote/verify claim.)

11. **Units still come first.** CIMCO sim will happily run an inch program against a metric machine def and "pass" — a 25.4× scale error that looks clean. Resolve G20/G21 + the machine-def units before trusting any sim result. See [[feedback_check_units_first]].

12. **Two CIMCO versions are on H:.** `cimco-2026` (2026.01.10, REST API) and `cimco-2025` (2025.01.25, the Machine-Sim minimum). Diff them when a 2026-only feature (REST API, sim shortcuts) is in question.

13. **When porting a fail/pass gate across languages, `??` is NOT `||` — that swap fails OPEN.** SPINE-1's `evaluateSimulationReport` TS port (`CimcoVerificationBridgeEngine.ts`) of the canonical `.mjs` `parseSimulationReport` used `rec[cat] ?? rec[\`${cat}s\`]` where the canonical was `input[cat] || input[\`${cat}s\`]`. A grouped report with a falsy-but-present singular key (`{collision: 0, collisions:[{line:2}]}`) kept the `0` (nullish-coalescing only falls through on null/undefined) → `Array.isArray(0)===false` → the real findings array was **silently dropped** → the gate returned `pass:true` on a program the canonical CLI FAILS. A fail-OPEN safety-gate bug. Caught by 3-of-3 scrutiny arm B (A + C both missed it; one even called `??`/`||` "behaviorally equivalent"). **Rule:** when a port claims parity with a safety gate, (a) match the boolean operator byte-for-byte, and (b) add a parity test that exercises the *divergent* input (falsy-but-present key), or the "lock" isn't load-bearing. *Source:* commit `d7dfb6ded6`; see [[cimco-verification-simulation-integration]] §Shipped.
