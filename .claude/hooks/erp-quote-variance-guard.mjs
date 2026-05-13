#!/usr/bin/env node
// tier: T0
/**
 * erp-quote-variance-guard.mjs — PreToolUse hook (U-LTH57 P5)
 *
 * Blocks ship/invoice transitions when the quote→actual variance exceeds
 * 20% without approval. Protects the shop from closing out unprofitable
 * jobs silently.
 *
 * Fires on: prism_business calls carrying action === "lathe_order_transition"
 *           with to_state ∈ { shipped, invoiced, closed }.
 *
 * Guard logic:
 *   1. Read latest reconciliation for the order's job_id
 *   2. If |variance_pct| ≥ 20 AND metadata.approval_override !== true → block
 *   3. Else allow
 *
 * Reads state/shared/lathe-reconciliation-state.json (U-LTH49 output).
 *
 * @milestone LATHE-MASTER U-LTH57
 */

import * as fs from "fs";

const VARIANCE_BLOCK_THRESHOLD_PCT = 20;
const TRIGGER_STATES = new Set(["shipped", "invoiced", "closed"]);
const RECON_STATE_PATH = "H:/prism/state/shared/lathe-reconciliation-state.json";

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
  const output = {
    continue: false,
    decision: "block",
    reason,
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(2);
}

async function main() {
  const input = await readStdin();
  const toolName = input.tool_name ?? input.toolName ?? "";
  if (toolName !== "prism_business" && toolName !== "mcp__prism__prism_business") {
    return allow();
  }

  const params = input.tool_input?.params ?? input.params ?? {};
  const action = input.tool_input?.action ?? input.action ?? params.action;
  if (action !== "lathe_order_transition") {
    return allow();
  }

  const toState = params.to_state;
  if (!TRIGGER_STATES.has(toState)) {
    return allow();
  }

  // approval_override bypass
  const override = params.metadata?.approval_override;
  if (override === true) {
    return allow();
  }

  const orderId = params.order_id;
  if (!orderId) {
    return allow(); // no way to correlate — let the engine reject on its own
  }

  // Read reconciliation state and find the most-recent record tied to this order
  let state;
  try {
    const raw = fs.readFileSync(RECON_STATE_PATH, "utf-8");
    state = JSON.parse(raw);
  } catch {
    return allow(); // no reconciliation state yet — nothing to block
  }

  const records = Array.isArray(state.records) ? state.records : [];
  // Match by order_id via job_id linkage if provided; fall back to any matching customer
  const customer = params.customer;
  const candidates = records.filter((r) =>
    (customer && r.customer === customer) ||
    (r.customer && r.customer.includes(orderId))
  );
  if (candidates.length === 0) {
    return allow();
  }
  const latest = candidates[candidates.length - 1];
  const variance = Math.abs(Number(latest.variance_pct) || 0);

  if (variance >= VARIANCE_BLOCK_THRESHOLD_PCT) {
    return block(
      `QUOTE→ACTUAL VARIANCE ${variance.toFixed(1)}% ≥ ${VARIANCE_BLOCK_THRESHOLD_PCT}% ` +
      `for order ${orderId}. Pass params.metadata.approval_override=true to proceed.`,
    );
  }
  return allow();
}

main().catch(() => allow());
