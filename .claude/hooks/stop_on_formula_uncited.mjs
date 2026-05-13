#!/usr/bin/env node
// tier: T4
/**
 * stop_on_formula_uncited.mjs — Tier 6 Stop Hook
 * Warns when formula exists without provenance citation.
 */
import fs from "node:fs";

const FORMULA_AUDIT = "H:/prism/mcp-server/data/state/formula-provenance-audit.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(FORMULA_AUDIT)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(FORMULA_AUDIT, "utf-8"));
    const age = Date.now() - (data.timestamp || 0);

    if (age > 86400000) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const uncited = (data.formulas || [])
      .filter(f => !f.citation && !f.source && !f.reference)
      .filter(f => f.createdThisSession || f.isNew);

    if (uncited.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${uncited.length} formulas without citations: ${uncited.slice(0, 3).map(f => f.id || f.name).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
