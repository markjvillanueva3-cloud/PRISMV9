/**
 * lathe-safety-efficiency-score.mjs -- slot:whiskey  [U-W2D: closed-loop safety+efficiency scoring]
 * ==========================================================================
 * The operator's closed-loop test REQUIRES "collision avoidance, cost
 * efficiency, machining efficiency factored in". The turning pipeline
 * (TurningPrintToProgramEngine.runPipeline) already COMPUTES the raw signals
 * (collision_checks[], boring_bar_checks[], chatter_checks[], per-op
 * physics.{power_kW,mrr_mm3_min,tool_life_min}, estimated_cycle_time_sec); this
 * lib AGGREGATES + GRADES them into the closed-loop test verdict. It does NOT
 * recompute physics and is NOT a shop-floor safety gate (S(x) /
 * SafetyVetoSimulationGateEngine own that) -- it is the TEST measurement layer.
 *
 * R5: pure aggregation, no I/O, no engine imports -- fully unit-testable.
 *
 * SAFETY DOCTRINE (lathe soul -- NEVER soften): a single critical collision
 * failure, an overspeed op (rpm > G50/max cap), an overpower op (power > machine
 * limit), a critical warning, or a boring-bar out-of-tolerance => UNSAFE. And we
 * NEVER assert SAFE on an axis we could not check (missing machine limit /
 * collision_checks not run) -- that axis is reported as an `unknown`, and the
 * verdict degrades to PARTIAL, never SAFE (R12 -- no false safety).
 */

import { economicOptimumLifeMin } from "./lathe-jm-cost-rates.mjs";

const isNum = (x) => Number.isFinite(x);

// Economical tool-life floor (minutes/edge). An insert edge changed more often than this is uneconomical
// -- insert + index downtime cost outweighs the cycle-time gain. Shops target 15-30 min/edge; <15 is the
// machining-economy warning band (Trent & Wright; Armarego & Brown, economic machining). ADVISORY ONLY --
// a short tool life is a cost/efficiency signal, NOT a collision/overspeed hazard, so it never vetoes SAFE.
const ECONOMICAL_TOOL_LIFE_MIN = 15;

// Tool-cost share floor. A short tool life is only ECONOMICALLY harmful when tooling is a meaningful
// share of part cost. For machine-cost-dominated parts (cheap insert vs expensive machine time) the
// cost-optimal speed is AGGRESSIVE -- a short tool life there is correct (minimizes TOTAL cost). So flag
// "uneconomical" only when tool life is short AND tooling is >= this share of total cost (Boothroyd &
// Knight, economic machining: optimal Vc rises as C_tool/C_machine falls). Uses the injected cost leg;
// falls back to the raw tool-life floor when no cost was computed.
const TOOL_COST_SHARE_FLOOR = 0.20;

/**
 * Score a TurningProgramResult's safety + efficiency envelope.
 * @param prog   TurningProgramResult ({operations, collision_checks?, boring_bar_checks?,
 *               chatter_checks?, warnings?, estimated_cycle_time_sec})
 * @param limits machine limits ({max_spindle_rpm?, max_power_kW?}) -- usually from TurningInput
 * @returns { verdict: "SAFE"|"UNSAFE"|"PARTIAL", safety_violations, breakdown, efficiency, unknowns }
 */
export function scoreSafetyEfficiency(prog, limits = {}) {
  const ops = Array.isArray(prog?.operations) ? prog.operations : [];
  const lim = limits || {};

  // ---- collision avoidance (pipeline-computed) -------------------------
  const collisions = Array.isArray(prog?.collision_checks) ? prog.collision_checks : null;
  const boring = Array.isArray(prog?.boring_bar_checks) ? prog.boring_bar_checks : null;
  const chatter = Array.isArray(prog?.chatter_checks) ? prog.chatter_checks : null;
  const warnings = Array.isArray(prog?.warnings) ? prog.warnings : [];

  const collisionRun = collisions !== null;
  const collisionFails = collisionRun ? collisions.filter((c) => c && c.passed === false).length : 0;
  const collisionCriticalFails = collisionRun
    ? collisions.filter((c) => c && c.passed === false && c.severity === "critical").length : 0;
  // A FAILED collision check is a collision risk REGARDLESS of its severity LABEL -- ANY passed:false
  // vetoes SAFE (never-soften; 3-of-3 arm C). LatheCollisionZoneEngine emits passed:false at severity
  // "warning" for REAL conflicts (live-tool-vs-tailstock CONFLICT, grooving/parting overhang), so
  // gating only on "critical" let a failed collision check grade SAFE. Erring toward UNSAFE on a
  // non-pass is the correct (safe) direction; collisionVetoFails == collisionFails by design.
  const collisionVetoFails = collisionFails;
  const boringOutOfTol = boring ? boring.filter((b) => b && b.within_tolerance === false).length : 0;
  const chatterUnstable = chatter ? chatter.filter((c) => c && c.stable === false).length : 0;
  const criticalWarnings = warnings.filter((w) => w && w.severity === "critical").length;

  // ---- overspeed (G50 cap) + overload (machine power) ------------------
  const maxRpm = isNum(lim.max_spindle_rpm) ? lim.max_spindle_rpm : null;
  const maxPow = isNum(lim.max_power_kW) ? lim.max_power_kW : null;
  const overspeedOps = maxRpm === null ? null
    : ops.filter((o) => isNum(o?.cutting_params?.spindle_rpm) && o.cutting_params.spindle_rpm > maxRpm).length;
  const overpowerOps = maxPow === null ? null
    : ops.filter((o) => isNum(o?.physics?.power_kW) && o.physics.power_kW > maxPow).length;

  // A present-but-non-finite op physics/rpm value (NaN/Infinity) is UNVERIFIABLE -- treat it as an
  // unknown axis (degrade to PARTIAL), never an implicit pass (R12 fail-open guard; 3-of-3 arm C P2).
  const nonfinitePhysics = ops.some((o) =>
    (o?.physics && o.physics.power_kW != null && !isNum(o.physics.power_kW)) ||
    (o?.cutting_params && o.cutting_params.spindle_rpm != null && !isNum(o.cutting_params.spindle_rpm)));

  // ---- unknowns: axes we could NOT check (never counted as SAFE) -------
  const unknowns = [];
  if (maxRpm === null) unknowns.push("max_spindle_rpm");
  if (maxPow === null) unknowns.push("max_power_kW");
  if (!collisionRun) unknowns.push("collision_checks");
  if (nonfinitePhysics) unknowns.push("op_physics_nonfinite");

  // ---- safety verdict (NEVER soften) -----------------------------------
  const safety_violations =
    collisionVetoFails + (overspeedOps || 0) + (overpowerOps || 0) + criticalWarnings + boringOutOfTol;
  let verdict;
  if (safety_violations > 0) verdict = "UNSAFE";
  else if (unknowns.length > 0) verdict = "PARTIAL"; // passed what was checkable; cannot claim SAFE on unchecked axes
  else verdict = "SAFE";

  // ---- efficiency (cost + machining) -----------------------------------
  const mrrVals = ops.map((o) => o?.physics?.mrr_mm3_min).filter(isNum);
  const toolLifeVals = ops.map((o) => o?.physics?.tool_life_min).filter(isNum);
  const round = (x, p = 2) => (isNum(x) ? Math.round(x * 10 ** p) / 10 ** p : null);

  // Cost-aware tool-life economy: a short tool life is uneconomical ONLY when tooling is a meaningful
  // share of total cost. A machine-cost-dominated part with a cheap insert is cost-optimal AT an
  // aggressive Vc / short tool life, so it must NOT be flagged. Needs the injected cost leg; without it,
  // fall back to the raw tool-life floor (the crude heuristic) so the non-cost paths still get a signal.
  const _bk = limits?.partCost?.buckets;
  const _total = limits?.partCost?.total_cost_with_scrap_amortized;
  const toolCostShare = (_bk && isNum(_bk.tool) && _bk.tool >= 0 && isNum(_total) && _total > 0) ? round(_bk.tool / _total, 3) : null;
  const _minToolLife = toolLifeVals.length ? Math.min(...toolLifeVals) : null;

  // Economic-optimum tool life (Gilbert T_econ) -- the floor below which an op runs FASTER than
  // cost-optimal. REPLACES the arbitrary fixed 15-min heuristic, which mislabels a part running AT the
  // cost optimum (~7.8 min for P-steel + JM economics) as uneconomical. taylorN from the material's
  // CANONICAL_TAYLOR (passed via limits.taylorN; default P n=0.25); economics default to canonical JM rates.
  const _tEcon = economicOptimumLifeMin(isNum(limits?.taylorN) ? limits.taylorN : 0.25, limits?.economics);
  const _floor = isNum(_tEcon) && _tEcon > 0 ? round(_tEcon, 2) : ECONOMICAL_TOOL_LIFE_MIN;

  // Dominant tool-CONSUMPTION op among ECONOMICALLY-FREE ops -- the op consuming the most insert life
  // (cycle_time_sec / tool_life_s) whose cutting speed the generator is actually free to optimize for cost
  // (rough/face/bore material removal). Finish/thread/groove/part-off/drill are EXCLUDED: their Vc is
  // operation- or surface-constrained (e.g. a finish pass runs fast @320 m/min for surface integrity / BUE
  // avoidance, not tool economy), so their tool cost is an unavoidable consequence of the spec, NOT economic
  // waste. Judging economy on a FREE op (where Vc is a real cost lever) is the correct signal: a rough op
  // run above its Gilbert optimum is genuinely wasteful; a fast finish pass is a justified cost-vs-surface
  // trade. Root-cause fix for the closed-loop "uneconomical" artifact (U-W-ECONOMY-FLAG-RECALIBRATE).
  const isEconFreeOp = (t) => !/finish|thread|groov|part[_-]?off|cut[_-]?off|drill/i.test(String(t || ""));
  let _domLife = null, _domConsump = -1;
  for (const o of ops) {
    if (!isEconFreeOp(o?.operation_type)) continue;
    const life = o?.physics?.tool_life_min;
    const cyc = o?.cycle_time_sec;
    if (isNum(life) && life > 0 && isNum(cyc) && cyc > 0) {
      const consump = cyc / (life * 60);
      if (consump > _domConsump) { _domConsump = consump; _domLife = life; }
    }
  }
  // A program is uneconomical iff its DOMINANT-tool-cost op runs ABOVE the cost optimum (life < T_econ)
  // AND tooling is a meaningful share of cost (machine-dominated parts stay economical at an aggressive Vc
  // -- Boothroyd & Knight). Without per-op cycle (legacy programs) fall back to the min-life-vs-floor path.
  const _econLife = _domLife !== null ? _domLife : _minToolLife;
  const toolLifeEconomical =
    _econLife === null ? null
    : _econLife >= _floor ? true                                       // dominant op at/below the cost-optimal speed
    : toolCostShare !== null ? toolCostShare < TOOL_COST_SHARE_FLOOR   // above optimum: only wasteful if tooling is a real cost share
    : false;                                                           // above optimum, no cost leg -> uneconomical

  return {
    verdict,
    safety_violations,
    breakdown: {
      collision_checks_run: collisionRun,
      collision_fails: collisionFails,
      collision_veto_fails: collisionVetoFails,        // passed:false at warning|critical -> vetoes SAFE
      collision_critical_fails: collisionCriticalFails,
      boring_bar_out_of_tolerance: boringOutOfTol,
      chatter_unstable: chatterUnstable,          // efficiency/quality risk, not a hard safety veto
      critical_warnings: criticalWarnings,
      overspeed_ops: overspeedOps,                // null = max_spindle_rpm unknown (not checkable)
      overpower_ops: overpowerOps,                // null = max_power_kW unknown (not checkable)
    },
    efficiency: {
      cycle_time_sec: isNum(prog?.estimated_cycle_time_sec) ? prog.estimated_cycle_time_sec : null,
      total_operations: ops.length,
      avg_mrr_mm3_min: mrrVals.length ? round(mrrVals.reduce((s, v) => s + v, 0) / mrrVals.length) : null,
      min_tool_life_min: toolLifeVals.length ? round(Math.min(...toolLifeVals)) : null,
      // Tool-life economy (U-W-TOOLLIFE-ECONOMY -> U-W-ECONOMY-FLAG-RECALIBRATE): advisory machining-
      // efficiency flag. Now graded against the Gilbert economic-optimum tool life (T_econ) on the
      // DOMINANT-tool-consumption op -- not a fixed 15-min floor on the shortest-raw-life op. NOT a safety veto.
      economical_tool_life_min: _floor,                // the floor actually used (Gilbert T_econ, else 15-min legacy)
      economic_optimum_life_min: isNum(_tEcon) ? round(_tEcon, 2) : null, // Gilbert T_econ (null if no taylorN/econ)
      dominant_tool_cost_op_life_min: _domLife,        // life of the op consuming the most insert (drives the flag)
      tool_cost_share: toolCostShare,                  // tool bucket / total cost (null if no cost leg)
      tool_life_economical: toolLifeEconomical,         // dominant op at/below cost optimum (T_econ) -> economical
      // Cost leg (U-W-COST-WIRE): the runner (tsx context) computes a per-part cost via the REAL
      // LathePartCostModelEngine and injects it as `limits.partCost` = { total_cost_with_scrap_amortized,
      // buckets, _basis }. The pure scorer stays engine-free (node:test-pure); cost is null when the
      // caller did not compute it. Closes the prior R12 manifest fiction ("cost EXISTS" but never ran).
      cost_usd: isNum(limits?.partCost?.total_cost_with_scrap_amortized)
        ? round(limits.partCost.total_cost_with_scrap_amortized) : null,
      cost_breakdown: limits?.partCost?.buckets ?? null,
      cost_basis: limits?.partCost?._basis ?? "not-computed",
    },
    unknowns,
  };
}
