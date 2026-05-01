# Plan: Phase 0-D-FUSION-2 — Physics Fusion Convergence Engine

## Context
Phase 0-D-FUSION-1 is complete (types + plugin registry). The roadmap (line 2273) specifies
SESSION 0-D-FUSION-2 to build the **convergence engine** — the mathematical heart of the
fusion system. Three nested feedback loops (FTW/FES/FDT) must converge reliably for ALL
materials including difficult titanium (ISO S) and Inconel. Silent convergence failure
would give machinists garbage parameters that break tools.

No existing Anderson acceleration, Broyden, spectral radius, or oscillation detection
implementations exist in PRISM — all numerical methods must be built from scratch.

## What to Build

### U-FUS-CONV: PhysicsFusionConvergenceEngine.ts (~1000 LOC)

**Class**: `PhysicsFusionConvergenceEngine` (singleton export: `physicsFusionConvergenceEngine`)

#### Core Architecture: Nested Loop Structure

```
converge(plugins, state, config, tier, iso_group, params):
  1. Partition plugins by descriptor.loop: FTW[], FES[], FDT[], single_pass[]
  2. Run single-pass plugins once (no loop field → one-shot)
  3. Initialize per-loop alpha from config.initial_alpha
  4. Nested iteration:
     FOR each FDT iteration (0..max_fdt):
       state_snapshot_fdt = clone(state)
       FOR each FES iteration (0..max_fes):
         state_snapshot_fes = clone(state)
         FOR each FTW iteration (0..max_ftw):
           state_snapshot_ftw = clone(state)
           Run all FTW plugins → relax → merge into state
           residual = computeResidual(snapshot_ftw, state, ftw_output_keys)
           Record iteration history
           Check oscillation/divergence → adjust alpha_ftw
           If residual < tolerance_ftw → FTW converged, break
         Run all FES plugins → relax → merge
         residual_fes = computeResidual(snapshot_fes, state, fes_output_keys)
         If residual_fes < tolerance_fes → FES converged, break
       Run all FDT plugins → relax → merge
       residual_fdt = computeResidual(snapshot_fdt, state, fdt_output_keys)
       If residual_fdt < tolerance_fdt → FDT converged, break
  5. Return LoopConvergenceReport[] for each loop + final FusionState
```

#### Public Methods

1. **`converge(input: ConvergenceInput): ConvergenceResult`** — Main entry point
   - Input: ordered plugins, initial FusionState, ConvergenceConfig, tier, iso_group, params
   - Output: final FusionState + LoopConvergenceReport[] + overall status + total iterations
   - Handles ALL failure modes: oscillation, divergence, degenerate, max_iterations, NaN

#### Internal Methods

2. **`_runLoopIteration(plugins, state, alpha, params, tier, iso_group, iteration)`**
   - Runs a set of plugins through one iteration with relaxation
   - Calls canRun() before each plugin (convergence engine's responsibility, not registry's)
   - Applies under-relaxation: `v_new = v_old + alpha * (v_computed - v_old)`
   - Returns updated state + per-plugin details

3. **`_computeResidual(old_values, new_values, keys, config)`**
   - Relative residual: max over keys of `|new - old| / max(|old|, epsilon)`
   - Returns scalar max-norm residual

4. **`_estimateSpectralRadius(history, loop)`**
   - Per-loop estimation from iteration history
   - Method: ratio of successive residual norms `rho ≈ ||r_k|| / ||r_{k-1}||`
   - Smoothed over last 3 iterations to avoid noise
   - Updates alpha: `alpha = min(max_alpha, 0.8 / rho)`
   - FTW: 3x3 system → tracks 3 output keys
   - FES: 2x2 system → tracks 2 output keys
   - FDT: 2x2 system → tracks 2 output keys

5. **`_detectOscillation(residualHistory, config)`**
   - Primary: Windowed DFT on last `oscillation_window` residuals
   - Compute DFT magnitudes, find dominant frequency
   - If dominant_freq > oscillation_frequency_threshold (0.25) → oscillation
   - Fallback (window < 4): sign alternation check (3x flip in 4 values)
   - Returns: { detected: boolean, frequency?: number }

6. **`_andersonAcceleration(history, m, currentState, keys)`** (Tier 3+ only)
   - Standard m-step Anderson mixing (m=3 default)
   - Stores last m (iterate, residual) pairs
   - Solves least-squares: min ||sum(theta_i * r_i)||^2, sum(theta_i)=1
   - For small m (3): QR decomposition or normal equations
   - Returns accelerated state
   - Active ONLY when `tier >= 3`

7. **`_broydenFallback(B, history, currentState, keys)`** (Tier 3+ fallback)
   - Activates if Anderson stalls (residual not decreasing for `anderson_stall_count` iters)
   - Init B0 = I, rebuild from last 3 (iterate, residual) pairs
   - Broyden "good" update: B_{k+1} = B_k + (Δf - B_k·Δx)·Δx^T / (Δx^T·Δx)
   - Step: x_{k+1} = x_k - B^{-1}·f(x_k) (direct inverse for small matrices)
   - NEVER runs simultaneously with Anderson

8. **`_handleNaN(state, lastKnownGood)`**
   - Checks all state.values for NaN/Infinity
   - Replaces with lastKnownGood values
   - Halves alpha for the current loop
   - Logs warning to state.warnings

9. **`_handleDivergence(residual, bestResidual, bestState, state, config)`**
   - If residual > best * divergence_factor: restore bestState, halve alpha
   - Tracks best-so-far state across iterations
   - If alpha < 0.01: give up → "diverged" status

10. **`_checkDegenerate(state, initialParams, config)`**
    - If ae/ap < degenerate_threshold * initial → "degenerate" status
    - Prevents convergence to physically meaningless solutions

#### Input/Output Types (local to engine, not in types file)

```typescript
interface ConvergenceInput {
  plugins: PhysicsPlugin[];        // Ordered from registry
  initial_state: FusionState;      // From createFusionState()
  config: ConvergenceConfig;       // From buildConvergenceConfig()
  tier: FusionTier;
  iso_group: ISOGroup;
  params: Record<string, unknown>; // Raw orchestrator inputs
}

interface ConvergenceResult {
  final_state: FusionState;
  convergence: LoopConvergenceReport[];
  overall_status: ConvergenceStatus;
  total_iterations: number;
  plugin_details: PluginExecutionDetail[];
}
```

## Knowledge Sources Consulted
- [x] PhysicsFusionOrchestrator.types.ts — all interfaces (541 LOC, frozen)
- [x] PhysicsPluginRegistry.ts — plugin ordering, feedback edges (462 LOC)
- [x] ThermalWearCouplingEngine.ts — ODE coupling pattern, RK4 (lines 1-100)
- [x] GraphAlgorithmsEngine.ts — topologicalSort signature (line 231)
- [x] OptimizationFormulasEngine.ts — convergence metrics (not reusable, different domain)
- [x] SpectralGraphEngine.ts — power iteration eigenvalue (exists but overkill for 2x2/3x3)
- [x] Roadmap v24 lines 2273-2340 — exact spec for U-FUS-CONV

## Machinist-Facing Output
**Indirect.** The convergence engine is consumed by the orchestrator (FUSION-3) which
produces FusionDetail in OrchestratorResult. Machinists see:
- "confidence: 0.92, tier: 2, converged in 6 iterations"
- "WARNING: convergence slow for this material — consider reducing depth of cut"
- "ALERT: oscillation detected in force-temperature loop — results are best-effort"

Failure messages must make sense to a shop floor operator (per roadmap scrutiny requirement).

## Edge Cases and Materials
- **ISO S (Inconel/Ti)**: alpha=0.20, may need 15+ FTW iterations. Strong thermal-wear coupling.
- **ISO N (Aluminum)**: alpha=0.85, converges in 2-3 iterations. Weak coupling.
- **ISO H (Hardened)**: alpha=0.25, strong force-wear coupling. Risk of oscillation.
- **NaN injection**: Plugin returns NaN → replace with last-known-good, halve alpha, warn
- **All plugins skip canRun()**: No convergence needed → return immediately with penalty
- **Impossible tolerance (1e-20)**: Hit max_iterations → "max_iterations" status (not crash)
- **Degenerate**: ae/ap converges to near-zero → "degenerate" status before iteration budget spent
- **Empty plugin list per loop**: Loop runs 0 iterations, reports "converged" trivially

## Wiring Targets
- **No dispatcher wiring in this session** — convergence engine only
- Future consumer: PhysicsFusionOrchestratorEngine (FUSION-3) calls converge()
- Import from: PhysicsFusionOrchestrator.types.ts, PhysicsPluginRegistry.ts

## Files to Create
1. `C:/PRISM/mcp-server/src/engines/PhysicsFusionConvergenceEngine.ts` — ~1000 LOC

## Files to Reference (read-only)
- `src/engines/PhysicsFusionOrchestrator.types.ts` — all types
- `src/engines/PhysicsPluginRegistry.ts` — registry (not directly called, but plugin ordering)
- `src/engines/ThermalWearCouplingEngine.ts` — ODE coupling pattern

## Numerical Method Details

### Under-Relaxation (all tiers)
```
F_new = F_old + alpha × (F_computed - F_old)
```
Applied per-value after each plugin's compute(). Alpha starts at material default,
adjusted by spectral radius estimation and halved on oscillation/divergence.

### Spectral Radius Estimation (all tiers ≥ 2)
Simple ratio method from residual norms:
```
rho_estimate = ||r_k|| / ||r_{k-1}||
alpha_loop = min(max_alpha, 0.8 / smoothed_rho)
```
Smoothed over 3 iterations. Per-loop (FTW, FES, FDT each get their own rho and alpha).

### Anderson Acceleration (Tier 3+ only)
Standard m-step (m=3):
1. Store last m iterates: x_{k-m+1}...x_k and residuals: r_{k-m+1}...r_k
2. Form ΔX = [Δx_1...Δx_{m-1}], ΔR = [Δr_1...Δr_{m-1}]
3. Solve θ* = argmin ||r_k - ΔR·θ||_2 (normal equations for small m)
4. x_{k+1} = (1-β)·(x_k - ΔX·θ*) + β·(g_k - ΔG·θ*) where β=1 (no damping)
   Simplified: x_{k+1} = x_k + r_k - (ΔX + ΔR)·θ*

### Broyden Fallback (Tier 3+, only if Anderson stalls)
Activates after anderson_stall_count (5) iterations without residual decrease.
```
B0 = I (identity)
For each iteration: B_{k+1} = B_k + (Δf - B_k·Δs)·Δs^T / (Δs^T·Δs)
Step: s = -B_k^{-1} · f_k
```
Direct inverse for 2x2/3x3 matrices (no need for Sherman-Morrison at this scale).

### Oscillation Detection
Primary (when window is full, ≥ oscillation_window residuals):
```
DFT of last W residuals → power spectrum
dominant_freq = argmax(|DFT[k]|) for k=1..W/2, normalized to [0, 0.5]
If dominant_freq > oscillation_frequency_threshold (0.25) → oscillation detected
```
Fallback (early iterations, < 4 residuals):
```
Count sign changes in consecutive residual deltas
If ≥ 3 sign changes in 4 values → oscillation
```

## Verification (20+ tests required per roadmap)

### Test file: `src/__tests__/u-fus-conv-convergence-engine.test.ts`

**Convergence tests (6 ISO classes)**:
1. ISO P (steel): converge in <8 FTW iterations with alpha=0.70
2. ISO N (aluminum): converge in <4 FTW iterations with alpha=0.85
3. ISO M (stainless): converge in <12 FTW iterations with alpha=0.50
4. ISO K (cast iron): converge in <8 FTW iterations with alpha=0.70
5. ISO H (hardened): converge in <15 FTW iterations with alpha=0.25
6. ISO S (superalloy): converge in <15 FTW iterations with alpha=0.20

**Failure mode tests**:
7. Oscillation detection triggers alpha halving
8. Divergence: best-so-far restoration
9. Degenerate: ae/ap→0 returns "degenerate" status
10. Max iterations: impossible tolerance → "max_iterations" (not crash)
11. NaN injection: plugin returns NaN → lastKnownGood + halve alpha + warning

**Nested loop tests**:
12. FTW converges, FES converges, FDT converges (3-level nesting)
13. FTW loop runs inside FES loop (verify iteration counts)
14. Empty loop (no plugins with that loop tag) → trivial convergence

**Alpha management tests**:
15. Spectral radius estimation updates alpha correctly
16. Alpha never exceeds max_alpha (0.90)
17. Alpha halved on oscillation detection

**Acceleration tests** (Tier 3+):
18. Anderson acceleration reduces iteration count vs plain relaxation
19. Broyden activates after Anderson stall
20. Anderson and Broyden never active simultaneously

**Plugin integration tests**:
21. canRun() false → plugin skipped with correct penalty
22. Plugin execution order preserved (topological from registry)
23. Under-relaxation applied correctly (F_new = F_old + alpha * delta)

**Serialization/traceability tests**:
24. ConvergenceIteration history recorded for each loop
25. LoopConvergenceReport has correct spectral_radius field

## Multi-Role Scrutiny (roadmap requirement)
- **Physicist**: Is convergence mathematically guaranteed for each material class?
- **Machinist**: Do failure messages make sense to a shop floor operator?
- **Architect**: Is iteration history serializable for checkpoint/resume?
