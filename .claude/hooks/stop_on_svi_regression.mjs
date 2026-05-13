#!/usr/bin/env node
// tier: T4
/**
 * stop_on_svi_regression.mjs — Tier 6 Stop Hook
 * Warns when System Variability Index decreased during session.
 */
import fs from "node:fs";

const SVI_STATE = "H:/prism/state/shared/SVI_SESSION_DELTA.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(SVI_STATE)) {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(SVI_STATE, "utf-8"));
    const delta = data.delta || 0;
    const psiChange = data.psiDelta || 0;

    if (delta < 0 || psiChange < -0.05) {
      console.log(JSON.stringify({ continue: false,
        stopReason: `SVI regression: delta=${delta.toExponential(2)}, Psi change=${(psiChange * 100).toFixed(1)}%`
      }));
    } else {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true, systemMessage: "pass" })));
