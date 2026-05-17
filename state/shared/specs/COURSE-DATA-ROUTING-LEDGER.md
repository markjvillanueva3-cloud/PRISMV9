# Course-Data Routing Ledger (U-KC-D1)

**Generator:** scripts/course-data-router.mjs
**Generated:** 2026-05-17T00:00:00Z
**Schema:** 1.0.0
**Advisory:** `advisoryOnly: true` · `mustHumanVerify: true`

## Caveat

> Routing decisions are ADVISORY. FORGE-QUEUE items require human /forge gate. Formulas require physics-reviewer agent before any port. DUPLICATE decisions are based on name-token overlap and may have false positives — human verify before discarding course intent.

## Inventory

- Algorithms scanned: 53
- Engines scanned: 3260

## Thresholds

- `ALGORITHM_FORGE_MIN_RELEVANCE`: 0.5
- `ENGINE_FORGE_MIN_RELEVANCE`: 0.6
- `FORMULA_DISCARD_FLOOR`: 0.3
- `DEDUP_MATCH_SCORE`: 0.6

## Summary

- **Candidates:** 65
- **Assets routed:** 126

### By decision

- **TRIBAL-SHIPPED**: 31
- **DUPLICATE**: 10
- **FORGE-QUEUE**: 69
- **DISCARD**: 16

### By node-type

- **knowledge**: 31
- **algorithm**: 50
- **formula**: 10
- **engine**: 35

### By lane

- **Lane A** (direct-wire autonomous): 31
- **Lane B** (port semi-autonomous): 10
- **Lane C** (forge human-gated): 69
- **No lane** (DISCARD): 16

## Forge-queue items (Lane C — recommended actions)

| Course | Asset | Kind | Lane | Recommended Action |
|--------|-------|------|------|--------------------|
| 10.34 | operator-splitting | algorithm | C | /forge-triple algorithm:operator-splitting |
| 2.854-fall-2016 | transition-equations-solver | algorithm | C | /forge-triple algorithm:transition-equations-solver |
| 1.060-spring-2006 | bernoullis-equation-solver | algorithm | C | /forge-triple algorithm:bernoullis-equation-solver |
| 1.060-spring-2006 | moody-diagram-analysis | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:moody-diagram-analysis |
| resources | operator-splitting | algorithm | C | /forge-triple algorithm:operator-splitting |
| 16.852j-fall-2005 | lean-enterprise-engine | engine | C | /forge-triple engine:lean-enterprise-engine |
| 16.852j-fall-2005 | lesat-algorithm | algorithm | C | /forge-triple algorithm:lesat-algorithm |
| 16.885j-fall-2004 | lean-manufacturing-engine | engine | C | /forge-triple engine:lean-manufacturing-engine |
| 2.003 | pendulum-cart-modeling | algorithm | C | /forge-triple algorithm:pendulum-cart-modeling |
| 2.003 | transfer-functions | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:transfer-functions |
| 2.007-spring-2009 | solidworks | engine | C | /forge-triple engine:solidworks |
| 2.007-spring-2009 | cam-path-optimization | algorithm | C | /forge-triple algorithm:cam-path-optimization |
| 2.003j-fall-2007 | euler-method | algorithm | C | /forge-triple algorithm:euler-method |
| 2.830j-spring-2008 | response-surface-modeling | algorithm | C | /forge-triple algorithm:response-surface-modeling |
| 6.871 | seelect | engine | C | /forge-triple engine:seelect |
| 6.871 | bayes-nets | algorithm | C | /forge-triple algorithm:bayes-nets |
| 18.02-spring-2006 | gradient-descent | algorithm | C | /forge-triple algorithm:gradient-descent |
| 18.02-spring-2006 | finite-element-analysis-fea | engine | C | /forge-triple engine:finite-element-analysis-fea |
| 12.864 | singular-value-decomposition | algorithm | C | /forge-triple algorithm:singular-value-decomposition |
| 16.225 | newmarks-algorithm | algorithm | C | /forge-triple algorithm:newmarks-algorithm |
| 18.086 | multigrid-method | algorithm | C | /forge-triple algorithm:multigrid-method |
| 2.004 | pid-tuning | algorithm | C | /forge-triple algorithm:pid-tuning |
| 2.004 | simulink-models | engine | C | /forge-triple engine:simulink-models |
| 3.016 | numerical-integration | algorithm | C | /forge-triple algorithm:numerical-integration |
| 9.66j | bayes-net-inference | algorithm | C | /forge-triple algorithm:bayes-net-inference |
| 9.66j | constraint-based-optimizer | engine | C | /forge-triple engine:constraint-based-optimizer |
| 16.07 | inertial-guidance-system | engine | C | /forge-triple engine:inertial-guidance-system |
| 16.07 | lagranges-equations | algorithm | C | /forge-triple algorithm:lagranges-equations |
| 16.682 | digital-logic-engine | engine | C | /forge-triple engine:digital-logic-engine |
| 16.682 | transistor-gain-formula | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:transistor-gain-formula |
| 2.086 | finite-difference-method | algorithm | C | /forge-triple algorithm:finite-difference-method |
| 2.141 | dynamic-system-simulation-engine | engine | C | /forge-triple engine:dynamic-system-simulation-engine |
| 3.21 | cahn-hilliard-equation-solver | algorithm | C | /forge-triple algorithm:cahn-hilliard-equation-solver |
| 3.60 | material-property-prediction-engine | engine | C | /forge-triple engine:material-property-prediction-engine |
| 3.60 | wave-propagation-simulation-algorithm | algorithm | C | /forge-triple algorithm:wave-propagation-simulation-algorithm |
| 6.231 | value-iteration | algorithm | C | /forge-triple algorithm:value-iteration |
| 6.231 | policy-iteration-engine | engine | C | /forge-triple engine:policy-iteration-engine |
| 6.883 | mutation-testing | algorithm | C | /forge-triple algorithm:mutation-testing |
| 6.883 | test-case-reduction-engine | engine | C | /forge-triple engine:test-case-reduction-engine |
| 8.022 | relativistic-dynamics-engine | engine | C | /forge-triple engine:relativistic-dynamics-engine |
| ESD.34 | architectural-engine | engine | C | /forge-triple engine:architectural-engine |
| 1.050-fall-2004 | finite-element-analysis | algorithm | C | /forge-triple algorithm:finite-element-analysis |
| 1.050-fall-2004 | buckling-formula | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:buckling-formula |
| 1.105-fall-2003 | finite-element-method | algorithm | C | /forge-triple algorithm:finite-element-method |
| 1.105-fall-2003 | euler-buckling-formula | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:euler-buckling-formula |
| 10.490-fall-2006 | batch-reactor-sizing-algorithm | algorithm | C | /forge-triple algorithm:batch-reactor-sizing-algorithm |
| 10.490-fall-2006 | kinetic-rate-equation | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:kinetic-rate-equation |
| 10.490-fall-2006 | economic-model-engine | engine | C | /forge-triple engine:economic-model-engine |
| 15.099-fall-2003 | differential-evolution | algorithm | C | /forge-triple algorithm:differential-evolution |
| 2.032 | lagranges-equations | algorithm | C | /forge-triple algorithm:lagranges-equations |
| 3.225-fall-2007 | material-property-prediction-engine | engine | C | /forge-triple engine:material-property-prediction-engine |
| esd.33-summer-2010 | operating-window-methods | engine | C | /forge-triple engine:operating-window-methods |
| esd.60-summer-2004 | pdca-cycle-engine | engine | C | /forge-triple engine:pdca-cycle-engine |
| 3.22 | finite-element-analysis | algorithm | C | /forge-triple algorithm:finite-element-analysis |
| 18.112-fall-2008 | cauchy-goursat-theorem | algorithm | C | /forge-triple algorithm:cauchy-goursat-theorem |
| esd.342-spring-2006 | louvain-algorithm | algorithm | C | /forge-triple algorithm:louvain-algorithm |
| esd.342-spring-2006 | ucinet | engine | C | /forge-triple engine:ucinet |
| 15.083J | ellipsoid-method | algorithm | C | /forge-triple algorithm:ellipsoid-method |
| 18.409 | lanczos-method | algorithm | C | /forge-triple algorithm:lanczos-method |
| 6.079 | gradient-descent-method | algorithm | C | /forge-triple algorithm:gradient-descent-method |
| 6.641 | maxwell-equations | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:maxwell-equations |
| 6.641 | method-of-images | algorithm | C | /forge-triple algorithm:method-of-images |
| 18.098 | taylor_series_expansion | algorithm | C | /forge-triple algorithm:taylor_series_expansion |
| 3.15 | ferromagnetism-formula | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:ferromagnetism-formula |
| 6.001 | scheme-evaluator-engine | engine | C | /forge-triple engine:scheme-evaluator-engine |
| 6.189 | cilk-runtime-system | engine | C | /forge-triple engine:cilk-runtime-system |
| 8.02 | gausss-law-for-magnetism | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:gausss-law-for-magnetism |
| 8.512 | boltzmann-equation | formula | C | physics-reviewer agent verify equation + dimensional consistency, then port constants to src/physics/constants.ts (NEVER inline) and wire to prism_calc/<action> via /forge-triple formula:boltzmann-equation |
| ec.s06-fall-2005 | pugh_chart_selection | algorithm | C | /forge-triple algorithm:pugh_chart_selection |

## Duplicate hits (Lane B — verify scope match)

| Course | Course asset | PRISM file | Score |
|--------|---------------|------------|-------|
| 2.008-spring-2003 | engine:mastercam-integration | MastercamHeadlessIntegrationTestEngine | 1.00 |
| 3.016 | engine:finite-element-analysis | FiniteElementEngine | 0.67 |
| 2.086 | engine:monte-carlo-simulation-engine | CapacityMonteCarloEngine | 0.67 |
| 6.034 | algorithm:decision-tree | DecisionTreeClassifier | 1.00 |
| 6.823 | engine:pipeline-engine | AdaptivePipelineGeneratorEngine | 1.00 |
| 1.010-fall-2008 | algorithm:monte-carlo-simulation | MonteCarlo | 0.67 |
| 1.010-fall-2008 | engine:uncertainty-propagation-engine | UncertaintyPropagationEngine | 1.00 |
| 2.032 | engine:dynamics-engine | CoolantDynamicsEngine | 1.00 |
| 2.670-january-iap-2004 | algorithm:wear-rate-prediction-model | ToolWearPrediction | 0.67 |
| 6.071j | engine:signal-processing-engine | SignalProcessingEngine | 1.00 |

## Re-run

```bash
node scripts/course-data-router.mjs
# or deterministic for diffs:
node scripts/course-data-router.mjs --frozen-time 2026-05-17T00:00:00Z
```
