---
title: Canonical Business / Finance / Operations Equations — money-making seed
type: formula-collection
domain: business
status: seeded
last_verified: 2026-05-23
generated_by: slot:foxtrot iter7 (PSN equation-ingestion loop — revenue leg)
source_attribution: mandatory_per_slot_soul
tags: [formula, equation, business, finance, operations, npv, irr, eoq, breakeven, capacity, pricing, machining-job-economics]
related:
  - knowledge/wiki/formulas/canonical-machining-equations-2026-05-23.md
  - mcp-server/src/engines/QuoteEstimatorEngine.ts
  - mcp-server/src/engines/JobLifecycleEngine.ts
  - mcp-server/src/engines/CapacityPlanningEngine.ts
---

# Canonical Business / Finance / Operations Equations — Money-Making Seed (Foxtrot iter 7, 2026-05-23)

> Companion to [[canonical-machining-equations-2026-05-23]]. These are the revenue / finance / operations equations that drive PRISM's money-making features — quoting, costing, capacity, pricing, inventory, ROI. Each equation cites a canonical source (textbook + edition, or original paper). Numeric defaults belong in registries, NOT inline — the symbolic forms below are the canonical bridge.

## 1. Net Present Value (NPV)

$$NPV = \sum_{t=0}^{N} \frac{CF_t}{(1 + r)^t} = -C_0 + \sum_{t=1}^{N} \frac{CF_t}{(1 + r)^t}$$

- $CF_t$ — cash flow in period $t$ (positive = inflow)
- $C_0$ — initial investment (often negative cash flow at $t=0$)
- $r$ — discount rate / required rate of return (decimal, per period)
- $N$ — analysis horizon (periods)

**Decision rule:** Invest if $NPV > 0$. Used in PRISM for machine acquisition ROI, capex justification, multi-year shop-investment decisions.

**Source:** Brealey, R.A., Myers, S.C. & Allen, F. (2020). *Principles of Corporate Finance*, 13th ed., McGraw-Hill, ch.5. Also: Damodaran, A. (2014). *Applied Corporate Finance*, 4th ed., Wiley.

## 2. Internal Rate of Return (IRR)

$$0 = -C_0 + \sum_{t=1}^{N} \frac{CF_t}{(1 + IRR)^t}$$

IRR is the discount rate that makes $NPV = 0$. Solved via Newton-Raphson (per PRISM math doctrine: numerical stability matters).

**Decision rule:** Accept if $IRR >$ hurdle rate (typically WACC).

**Source:** Brealey et al. (2020), ch.5. Also: Berk, J. & DeMarzo, P. (2019). *Corporate Finance*, 5th ed., Pearson, ch.7.

## 3. Economic Order Quantity (EOQ) — Wilson formula

$$Q^* = \sqrt{\frac{2 \cdot D \cdot S}{H}}$$

- $D$ — annual demand (units/year)
- $S$ — fixed setup/ordering cost per order ($/order)
- $H$ — annual holding cost per unit ($/unit/year)
- $Q^*$ — optimal order quantity that minimizes total cost

Total cost: $TC = (D/Q) \cdot S + (Q/2) \cdot H + D \cdot P$ (with $P$ = unit purchase price).

**Source:** Harris, F.W. (1913). *How many parts to make at once*. Factory: The Magazine of Management, 10(2):135–136. Wilson, R.H. (1934). Hopp, W.J. & Spearman, M.L. (2008). *Factory Physics*, 3rd ed., Waveland Press, §2.

## 4. Breakeven analysis

$$Q_{BE} = \frac{FC}{P - VC}$$

- $FC$ — fixed cost ($)
- $VC$ — variable cost per unit ($/unit)
- $P$ — price per unit ($/unit)
- $Q_{BE}$ — breakeven volume (units)

Contribution margin: $CM = P - VC$. Breakeven revenue: $R_{BE} = Q_{BE} \cdot P$.

**Source:** Horngren, C.T., Datar, S.M. & Rajan, M.V. (2014). *Cost Accounting: A Managerial Emphasis*, 15th ed., Pearson, ch.3.

## 5. Hourly shop rate (manufacturing cost recovery)

$$R_{hr} = \frac{TC_{annual}}{H_{billable}} = \frac{Labor + Burden + Overhead + Depreciation + Target\_Profit}{H_{available} \cdot \eta_{billable}}$$

- $H_{available}$ — annual available shop hours (typical 2080 hrs/yr per shift)
- $\eta_{billable}$ — billable utilization fraction (typical 0.55-0.75 for job-shop)
- Target profit included so rate produces target margin at full utilization

PRISM use: see `QuoteEstimatorEngine` and `JobLifecycleEngine` — feeds quote unit-cost computation.

**Source:** Polywood, K. (2010). *Manufacturing Cost Estimating*, SME, ch.4. Also: Black, J.T. & Kohser, R.A. (2019). *DeGarmo's Materials and Processes in Manufacturing*, 13th ed., Wiley, ch.40.

## 6. Job-shop cycle time — Little's Law

$$WIP = TH \cdot CT$$

- $WIP$ — work-in-process (units in system)
- $TH$ — throughput (units / time)
- $CT$ — cycle time (time / unit)

Universal in steady-state queueing systems. PRISM application: estimate cash-flow lag from WIP for working-capital sizing.

**Source:** Little, J.D.C. (1961). *A Proof for the Queuing Formula: L = λW*. Operations Research 9(3):383–387. Hopp & Spearman (2008), §7.

## 7. M/M/c queueing — capacity sizing

$$\rho = \frac{\lambda}{c \mu}, \quad L_q = \frac{P_0 \cdot (\lambda/\mu)^c \cdot \rho}{c! \cdot (1 - \rho)^2}$$

- $\lambda$ — arrival rate (jobs/hr)
- $\mu$ — service rate per server (jobs/hr per machine)
- $c$ — number of parallel machines
- $\rho$ — utilization (must be < 1 for stability)
- $L_q$ — expected queue length

PRISM use: shop-floor capacity planning, machine-add decision support.

**Source:** Gross, D., Shortle, J.F., Thompson, J.M. & Harris, C.M. (2008). *Fundamentals of Queueing Theory*, 4th ed., Wiley, ch.2.

## 8. Black-Scholes option pricing (financial hedging baseline)

$$C = S_0 \cdot N(d_1) - K \cdot e^{-r T} \cdot N(d_2)$$
$$d_1 = \frac{\ln(S_0/K) + (r + \sigma^2/2)T}{\sigma \sqrt{T}}, \quad d_2 = d_1 - \sigma\sqrt{T}$$

- $S_0$ — spot price of underlying
- $K$ — strike price
- $r$ — risk-free rate (continuous compounding)
- $\sigma$ — volatility of returns
- $T$ — time to expiration (years)
- $N(\cdot)$ — standard normal CDF

PRISM use: raw-material hedging (cu, ni, steel) for long-cycle quotes; commodity-price-risk pricing premium.

**Source:** Black, F. & Scholes, M. (1973). *The Pricing of Options and Corporate Liabilities*. Journal of Political Economy 81(3):637–654. Hull, J.C. (2017). *Options, Futures, and Other Derivatives*, 10th ed., Pearson, ch.15.

## 9. Capital Asset Pricing Model (CAPM)

$$E[R_i] = R_f + \beta_i (E[R_m] - R_f)$$

- $E[R_i]$ — expected return on asset
- $R_f$ — risk-free rate
- $\beta_i$ — sensitivity of asset to market
- $E[R_m] - R_f$ — market risk premium

PRISM use: derive WACC (Weighted Average Cost of Capital) for the IRR hurdle rate in #2.

**Source:** Sharpe, W.F. (1964). *Capital Asset Prices*. Journal of Finance 19(3):425–442. Lintner, J. (1965). *Review of Economics and Statistics* 47(1):13–37.

## 10. Weighted Average Cost of Capital (WACC)

$$WACC = \frac{E}{V} \cdot R_E + \frac{D}{V} \cdot R_D \cdot (1 - T_c)$$

- $E$ — market value of equity, $D$ — debt, $V = E + D$
- $R_E, R_D$ — cost of equity (from CAPM), cost of debt
- $T_c$ — corporate tax rate (interest tax shield)

**Source:** Modigliani, F. & Miller, M.H. (1958). *The Cost of Capital, Corporation Finance and the Theory of Investment*. American Economic Review 48(3):261–297.

## 11. Learning curve (Wright)

$$T_n = T_1 \cdot n^{\log_2(b)}$$

- $T_n$ — time per unit at unit $n$
- $T_1$ — time for first unit
- $b$ — learning rate (e.g. 0.85 for 85% learning curve — every doubling cuts time by 15%)

PRISM use: batch-quote pricing, capacity ramp planning for new-part introduction.

**Source:** Wright, T.P. (1936). *Factors affecting the cost of airplanes*. Journal of the Aeronautical Sciences 3(4):122–128.

## 12. Process capability — Cp, Cpk

$$C_p = \frac{USL - LSL}{6\sigma}, \quad C_{pk} = \min\left(\frac{\mu - LSL}{3\sigma}, \frac{USL - \mu}{3\sigma}\right)$$

- $USL, LSL$ — upper/lower specification limit
- $\mu, \sigma$ — process mean and standard deviation

Six-sigma criteria: $C_{pk} \geq 1.33$ "capable", $\geq 1.67$ "six-sigma-class". PRISM use: SPC engine + AS9100 quote-eligibility filter.

**Source:** Montgomery, D.C. (2019). *Introduction to Statistical Quality Control*, 8th ed., Wiley, ch.8. AIAG (2005). *Statistical Process Control (SPC)*, 2nd ed.

## 13. Overall Equipment Effectiveness (OEE)

$$OEE = Availability \times Performance \times Quality$$

- $Availability = (Run Time)/(Planned Production Time)$
- $Performance = (Ideal Cycle Time \times Total Pieces)/(Run Time)$
- $Quality = (Good Pieces)/(Total Pieces)$

World-class benchmark: OEE = 85%. Job-shop reality: 40-60%.

**Source:** Nakajima, S. (1988). *Introduction to TPM: Total Productive Maintenance*. Productivity Press. SEMI E10 standard for tool reliability.

## 14. Activity-Based Costing (ABC) — cost driver allocation

$$C_{product} = \sum_{a \in activities} R_a \cdot d_a$$

- $R_a$ — cost rate of activity $a$ ($/driver-unit)
- $d_a$ — driver consumption by product (setup hours, machine cycles, inspection passes, …)

Replaces flat-overhead allocation. PRISM use: per-feature cost attribution in `QuoteEstimatorEngine` (drilling pass ≠ milling pass ≠ thread pass).

**Source:** Cooper, R. & Kaplan, R.S. (1992). *Activity-Based Systems: Measuring the Costs of Resource Usage*. Accounting Horizons 6(3):1–13.

## 15. Pricing power — markup over marginal cost (Lerner index)

$$L = \frac{P - MC}{P} = -\frac{1}{\epsilon_d}$$

- $P$ — price, $MC$ — marginal cost
- $\epsilon_d$ — own-price elasticity of demand (negative)

Inelastic demand ($|\epsilon_d| < 1$) → high pricing power → high markup. PRISM use: tactic feedback for quote-win-rate vs margin tradeoff in revenue-maximization layer.

**Source:** Lerner, A.P. (1934). *The Concept of Monopoly and the Measurement of Monopoly Power*. Review of Economic Studies 1(3):157–175.

## 16. Discounted payback period (DPP)

$$DPP = \min\left\{ T : \sum_{t=1}^{T} \frac{CF_t}{(1+r)^t} \geq C_0 \right\}$$

Time for discounted cash flows to recover initial investment. PRISM use: machine acquisition (when payback < useful-life × 0.5 → green-light).

**Source:** Berk & DeMarzo (2019), ch.7.

---

## How to extend (per slot:foxtrot tribal-knowledge doctrine)

Every new equation requires:
1. **Canonical source** — textbook + edition + chapter, or seminal paper with year and journal
2. **≥2-source corroboration** before promotion to PRISM doctrine
3. **Cross-reference** to existing PRISM revenue engines (`QuoteEstimatorEngine`, `JobLifecycleEngine`, `CapacityPlanningEngine`, `OEEEngine`, `SPCProcessCapability`, …) — if no consuming engine exists, propose one
4. **Variable definitions** — units explicit, never inline numeric constants

Future iter targets per operator /goal "develop new formulas, equations to improve entire prism system especially machining related and money making features":
- **Real options valuation** for capacity-add decisions under uncertain demand
- **Stochastic learning curve** (Wright + variance) for noisy batch-quote pricing
- **Inventory-cycle-time-cash-flow joint optimization** (Little + EOQ + DPP composed)
- **Machine-utilization-aware pricing** (high-utilization machine quotes carry queue-time premium per M/M/c)
- **Energy-cost-aware quoting** (kWh × machining time × time-of-use rate)
- **Tariff/duty-aware international quote pricing** (HS-code → duty rate → landed cost)
- **Tool-life-aware quote pricing** (Taylor's tool-life × per-quote tool-consumption → tooling cost line)

Each future addition lands as a new section here OR a sibling file `canonical-<topic>-equations-<date>.md`, plus FormulaRegistry entry, plus consuming-engine wiring.

Companion: [[canonical-machining-equations-2026-05-23]] (physics leg).
