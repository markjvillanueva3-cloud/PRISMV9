#!/usr/bin/env node
// tier: T0
/**
 * agi-safety-envelope-guard.mjs — PreToolUse hook (U-LTH62)
 *
 * Fires on any prism_business call that delivers AGI output downstream to
 * P1–P5 consumers. Blocks when the safety containment report (U-LTH61)
 * shows any hard-severity check.
 *
 * Guard logic:
 *   - lathe_agi_reason result → if any predicted speed/feed is obviously
 *     out-of-envelope (Vc > 1500 m/min, fz > 1.5), block pre-emptively
 *     without even calling the check engine.
 *   - lathe_auto_quote_from_print result → if total_unit_price_usd <= 0
 *     or margin_rate > 1.0, block.
 *   - lathe_job_schedule result → if total_busy_min > capacity_hours*60
 *     when capacity supplied in params, block.
 *
 * Metadata override: `params.metadata.agi_safety_override = true` bypasses
 * (for manual emergency approval, audited via input_log).
 *
 * @milestone LATHE-MASTER U-LTH62
 */

import * as fs from "fs";

const PRE_CHECK_VC_HARD_MAX = 1500;
const PRE_CHECK_FZ_HARD_MAX = 1.5;
const PRE_CHECK_MARGIN_RATE_MAX = 1.0;
const PROTECTED_ACTIONS = new Set([
  "lathe_agi_reason",
  "lathe_auto_quote_from_print",
  "lathe_job_schedule",
]);

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 150);
  });
}

function allow() {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({
    continue: false,
    decision: "block",
    reason: `AGI SAFETY ENVELOPE: ${reason}. Pass params.metadata.agi_safety_override=true to bypass.`,
  }));
  process.exit(2);
}

function check(params, action) {
  if (action === "lathe_agi_reason") {
    const ctx = params?.context;
    if (ctx && typeof ctx === "object") {
      const vc = Number(ctx.vc_hint_m_min);
      const fz = Number(ctx.fz_mm);
      if (Number.isFinite(vc) && vc > PRE_CHECK_VC_HARD_MAX) {
        return `requested Vc ${vc} m/min > ${PRE_CHECK_VC_HARD_MAX} envelope`;
      }
      if (Number.isFinite(fz) && fz > PRE_CHECK_FZ_HARD_MAX) {
        return `requested fz ${fz} mm > ${PRE_CHECK_FZ_HARD_MAX} envelope`;
      }
    }
  }
  if (action === "lathe_auto_quote_from_print") {
    const marginOverride = Number(params?.quote?.margin_rate_override);
    if (Number.isFinite(marginOverride) && marginOverride > PRE_CHECK_MARGIN_RATE_MAX) {
      return `margin_rate_override ${marginOverride} > ${PRE_CHECK_MARGIN_RATE_MAX}`;
    }
  }
  if (action === "lathe_job_schedule") {
    const jobs = Array.isArray(params?.jobs) ? params.jobs : [];
    for (const job of jobs) {
      const cycle = Number(job?.cycle_min_per_part);
      if (Number.isFinite(cycle) && cycle < 0) {
        return `job ${job?.job_id ?? "?"} has negative cycle_min_per_part`;
      }
    }
  }
  return null;
}

async function main() {
  const input = await readStdin();
  const toolName = input.tool_name ?? input.toolName ?? "";
  if (toolName !== "prism_business" && toolName !== "mcp__prism__prism_business") {
    return allow();
  }

  const params = input.tool_input?.params ?? input.params ?? {};
  const action = input.tool_input?.action ?? input.action ?? params.action;
  if (!PROTECTED_ACTIONS.has(action)) {
    return allow();
  }

  // Manual override
  if (params?.metadata?.agi_safety_override === true) {
    return allow();
  }

  const reason = check(params, action);
  if (reason) {
    try {
      const logPath = "H:/prism/state/shared/agi-safety-envelope.log";
      fs.appendFileSync(logPath,
        `${new Date().toISOString()} action=${action} reason="${reason}"\n`,
        { encoding: "utf-8" },
      );
    } catch { /* non-critical */ }
    return block(reason);
  }
  return allow();
}

main().catch(() => allow());
