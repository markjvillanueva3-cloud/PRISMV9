# /tolerance-stack — Tolerance Stack-Up Analysis

Perform tolerance stack-up analysis with variability-aware worst-case and statistical methods.

## Usage
```
/tolerance-stack <assembly> [--method WC|RSS|MC] [--iterations <N>] [--confidence <N>]
```

## Workflow

1. **Assembly Analysis**
   - Load part geometries
   - Identify tolerance chain
   - Extract individual tolerances
   - Determine stack direction

2. **Stack-Up Methods**
   - **Worst Case (WC)**: simple sum
   - **RSS**: root-sum-square statistical
   - **Monte Carlo**: full distribution simulation

3. **Variability Integration**
   - **Use VariabilityEnvelopeEngine distributions per dimension**
   - **Apply InfiniteConditionCombinatorEngine for material×process combinations**
   - Account for thermal effects
   - Include measurement uncertainty

4. **Monte Carlo Simulation**
   - Sample from actual distributions
   - Run N iterations (default 10,000)
   - Calculate assembly statistics
   - Determine defect rate

5. **Results**
   - Stack-up result with method
   - Confidence interval
   - Sensitivity analysis (which dims matter most)
   - Recommendations for tightening

## Engines Used
- ToleranceStackupEngine
- MonteCarloSimulationEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- InfiniteConditionCombinatorEngine (Phase 0.25)
- StatisticalAnalysisEngine

## Example
```
/tolerance-stack H:/assemblies/gearbox.step --method MC --iterations 50000
```
