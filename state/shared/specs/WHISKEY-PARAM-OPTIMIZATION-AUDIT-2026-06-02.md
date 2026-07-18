# WHISKEY — JM Lathe Param-Optimization + Finishing-Allowance Fleet Audit (2026-06-02)

**Slot:** whiskey · **Goal:** print→lathe-program closed-loop — "check calculations and parameters… ensure our data is optimized" + "prove 100% accuracy."
**Method:** deterministic `scripts/lathe-fleet-param-audit.mjs` (U-CL15) over the **A-side (original) JM programs** of 31 deduped cached A/B-pair jsonls. Offline, no engine/dist. Machine JSON: `WHISKEY-PARAM-OPTIMIZATION-AUDIT-2026-06-02.json`.
**Workflow note (R5/R12 honesty):** the multi-agent Workflow run was *attempted* (operator "use workflow") but all 31 schema-bound agents failed `StructuredOutput` — the documented default-subagent incompatibility ([[reference_alpha_explore_agent_schema_incompat]]). A deterministic param-audit needs no LLM agent, so it was run directly. **Lesson: route pure transforms to code, schema-bound workflow agents only for judgment.**

## Fleet headline (1,467 original programs, 29 of 31 customers with data; ACUMENT/HEDALLOY a_paths unreadable on this PC)

| Metric | Fleet | Read |
|---|---|---|
| PROPER (0 ERROR-severity gotchas) | **98.8%** | originals are overwhelmingly safe |
| feed-mode **UNDECLARED** (no G94/G95) | **85.4%** | the #1 data-optimization gap |
| G96 CSS **without** G50 max-RPM cap | **1.2%** | the genuine SAFETY gap (chuck overspeed) |
| units declared (G20/G21) | **0%** (0/1467) | relies on Okuma machine-default inch |
| finishing-allowance **practice** annotated | **~0.1%** (od_grind 1, relief 1, hone 0, press-fit 0) | practice is tribal, NOT in the corpus |
| carbide mentioned | 327 (22%) | names insert material, not the allowance |
| op mix | bore_rough **759**, drill_axial 421, od_thread 127, od_rough 64 | bore-heavy = carbide-insert-bore workload |
| vc (S@G96, SFM — inch fleet) | n=2382, 100–1500, mean **242** | wide, material-dependent |
| feed F | n=894, **0.0015–150** | mixed IPR+IPM → the undeclared-feed ambiguity, made visible |
| G50 cap RPM | n=1445, 200–10005, mean 931 | caps present in ~98.8% |

## Is our data optimized? — NO, three systemic gaps (all SAFE, none ERROR-blocking except the cap)

1. **Feed-mode undeclared (85.4%).** The single biggest gap. With no G94/G95, an F value is ambiguous IPR vs IPM — a 10× feed error class. The F-range 0.0015→150 in one corpus is direct evidence the ambiguity is real (sub-thou IPR values and 100+ IPM values coexist with no declared mode). **Generator fix: always declare G95 (IPR) — PRISM's U-CL5/U-CL7 emitters do this by construction.**
2. **Units undeclared (100%).** Not one program emits G20/G21. JM relies on the Okuma OSP machine default (inch). Safe today on a 100%-Okuma fleet, but unit-implicit and non-portable, and it violates the UNITS-FIRST rail (resolve units from the source). **Generator fix: emit explicit G20.**
3. **Finishing-allowance practice is undocumented in the corpus (~0.1%).** JM leaves OD-grind / ID-hone stock for press-fit carbide and relieves counterbore corners — but only 2 of 1,467 programs textually annotate grind/relief and **none** annotate hone or press-fit. The practice cannot be learned from program comments. **It exists only in the tribal capture this session: `reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01` + `knowledge/wiki/code-tribal/jm-lathe-finishing-allowances.md`.** A print-accurate generator MUST apply the rule from print tolerances/GD&T, not from the program corpus.

### Safety gap (the only ERROR-class one): G96 without G50 cap — 1.2% fleet, worst offenders
BRICO ~10%, CFC ~10.5%, CHOCTAW 3.6%, CHERRY 2.7%, ELITE 2.5%, AGRATI 1.7%, OPTIMAS 1.3%. ~18 programs run constant-surface-speed with no spindle clamp → chuck-overspeed risk at small diameters. **Generator fix: pair every G96 with a G50 S<rpm> cap (PRISM bakes this in).**

## "Prove 100% accuracy" — the generation round-trip is BLOCKED (honest scope)
The success criterion (read print → write program → post G-code → compare to existing) needs the PRISM generation engines invokable. They require the built dist, and `npm run build:fast` is RED on this `slot/whiskey` branch from **pre-existing cross-tree staleness** (`turningDispatcher`→missing `LatheLiveToolingPlannerEngine.js`; `IdeaBlock*`→missing `ideaBlockSchema.js`) — not this session's edits. The engine-driven round-trip therefore cannot run offline here; it is unblocked by the `slot/whiskey → cad-fusion-live-ms0` merge (which also resolves the staleness). **This audit measures the TARGET side (what a generated program must match/beat); the round-trip itself is the documented next leg, gated on the merge.**

## What "more optimized than the original" means for the generator (the accuracy/optimization target)
A regenerated program is *better* than the JM original when it: (a) declares G95 feed-mode, (b) emits explicit G20 units, (c) pairs every G96 with a G50 cap, (d) leaves OD-grind/ID-hone finish stock + relieves counterbores on press-fit-carbide features per the tribal rule. (a)–(c) are already baked into PRISM's emitters by construction; (d) is now captured in memory+wiki for the generator to consume.

## Per-customer (worst feed-undeclared / any cssNoCap)
ALLSTAR 100% undecl · BIRMINGHAM 100% · ARCONIC/CRESCENT 100% · CHOCTAW 96.4% · ELITE 97.5% · ATF 95% · CLENDENIN 95% · BRICO 53.7% undecl **+10% cssNoCap** · CFC 84.2% undecl **+10.5% cssNoCap**. Full per-customer in the JSON.
