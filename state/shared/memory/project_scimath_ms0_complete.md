---
name: SCIMATH-MS0 Complete — Core Linear Algebra & Matrix Methods
description: 17-unit milestone complete (2026-04-02). 12 engines, 12 calcDispatcher actions, 355 tests (355 after scrutiny fixes). PCA upgraded to SVD-backed. FEM upgraded to EigensolverEngine + CG. FormulaRegistry gained NUMERICAL category. 20-agent scrutiny passed. 10-agent utilization audit found 10 CRITICAL + 20 HIGH integration gaps → SCIMATH-WIRE-MS0 roadmap generated (24 units).
type: project
---

## SCIMATH-MS0: Core Linear Algebra & Matrix Methods — COMPLETE

**Completed:** 2026-04-02 | **Units:** 17/17 | **Tests:** 353 across 16 files

### Phases
- **P0** (3 units): SVDEngine, QRDecompositionEngine, CholeskyEngine
- **P1** (6 units): EigensolverEngine, MatrixFactorizationEngine, IterativeSolverEngine, SparseMatrixEngine, MatrixNormEngine, TensorAlgebraEngine
- **P2** (4 units): SystemIdentificationEngine, RobustRegressionEngine, RandomMatrixEngine, calcDispatcher wiring (12 actions)
- **P3** (4 units): Cross-engine test suite (40 tests), PCA→SVD upgrade, FEM→sparse upgrade, FormulaRegistry+AlgorithmRegistry updates

### Key Cross-Engine Integration Decisions
1. **PrincipalComponentEngine** upgraded from ad-hoc power iteration to SVDEngine internally. Added 4 static methods: `svdPCA`, `kernelPCA` (RBF/polynomial/linear), `incrementalPCA` (streaming), `robustPCA` (ADMM/PCP).
2. **FiniteElementEngine** upgraded: dense solver→CG (via IterativeSolverEngine) for n>100, ad-hoc eigenvalue iteration→EigensolverEngine.generalizedEigen for modal analysis. Added Quad4 bilinear plane stress/strain element.
3. **calcDispatcher** has 12 new actions: `svd_decompose`, `qr_factorize`, `cholesky_factor`, `eigen_solve`, `sparse_solve`, `iterative_solve`, `matrix_norms`, `matrix_factorize`, `tensor_stress_invariants`, `system_identify`, `robust_regression`, `random_matrix_noise_floor`.
4. **FormulaRegistry** gained NUMERICAL category (F-NUM-001..012), total 511 formulas.
5. **AlgorithmRegistry** gained 4 entries: ALG-KPCA-001, ALG-IPCA-001, ALG-RPCA-001, ALG-QUAD4-001.
6. **Numerical tolerances** canonical in `src/physics/constants.ts`: EPS_SVD, EPS_CHOLESKY, EPS_EIGEN, EPS_ITERATIVE, EPS_RANK, CONDITION_WARNING_THRESHOLD.

### Field Name Gotchas (verified against TypeScript interfaces)
- SVDResult uses `sigma` (not `singularValues`)
- SVDOptions uses `truncateK` (not `truncatedRank`)
- QROptions has `pivoting: boolean` (no `method` field)
- EigensolverEngine.lanczos signature: `(A, n, options)` — requires matrix dimension as 2nd arg
- TensorInvariants uses `vonMises` (not `vonMises_MPa`)
- PrincipalStresses uses `values: [number, number, number]` (not `sigma1/sigma2/sigma3`)
- OrderingResult uses `permutation` (not `perm`)

**Why:** SCIMATH-MS0 is the foundation that downstream engines (PCA, FEM, chatter stability, system identification) depend on. These 12 engines are now the canonical numerical linear algebra layer.

**How to apply:** Import from these engines rather than reimplementing. Use calcDispatcher actions for MCP access. Check FormulaRegistry NUMERICAL category for method documentation.

### Post-Completion: 20-Agent Scrutiny (2026-04-02)
- 20 agents reviewed math correctness, wiring, stability, types, backward compat, test coverage, mfg relevance, duplicates
- Fixed: GMRES dead code cleanup, generalized eigen dead code removal, FEM nu>=0.5 guard, FEM detJ guard, Givens rotation guard, 6 engines canonical constant imports, 2 new cross-engine invariant tests
- **Tests: 355/355 PASS** (up from 353)

### Post-Completion: 10-Agent Utilization Audit (2026-04-02)
- Found **0 internal engine consumers** of SCIMATH (only calcDispatcher uses them)
- 10 CRITICAL gaps: Quality (3), ML/Optimization (3), Pipelines (2), SpeedFeed (1), Deflection (1)
- 20 HIGH gaps: Chatter/Vibration (2), Downstream math (5), Web app (1), Exports (1), etc.
- Generated **SCIMATH-WIRE-MS0** roadmap (24 units, 7 phases) to wire SCIMATH into ~25 downstream engines
- Execute with: `/rgs continue SCIMATH-WIRE-MS0`
