#!/usr/bin/env node
/**
 * verify-mill-training-actions.mjs — invokes the 3 MCP actions directly
 * (without the MCP server) to prove they return content from the extracted
 * corpus. Bypasses the dispatcher; calls the underlying engine functions.
 */
import { createRequire } from "node:module";
const require_ = createRequire("file:///H:/prism/mcp-server/package.json");

// pdf-parse + tsx-style: we can't import .ts directly; instead, exercise the
// pure data export via a tiny TS->JS dynamic import shim using the project's
// existing pattern. Since the build artifact is in dist/, try that first.

async function main() {
  const idx = await import("file:///H:/prism/mcp-server/dist/data/tribal-tips/milling-training-index.js")
    .catch(() => null);
  const tipsModule = await import("file:///H:/prism/mcp-server/dist/data/tribal-tips/milling-pdf-cited-tips.js")
    .catch(() => null);

  if (!idx) {
    // Fall back: parse the source TS file directly with a minimal extractor.
    const fs = await import("node:fs");
    const ts = fs.readFileSync("H:/prism/mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts", "utf8");
    const tipCount = (ts.match(/^\s*id:\s*"MILL-TIP-/gm) || []).length;
    const operations = [...new Set([...ts.matchAll(/operation:\s*"([a-z_0-9]+)"/g)].map(m => m[1]))];
    const vendors = [...new Set([...ts.matchAll(/vendor:\s*"([^"]+)"/g)].map(m => m[1]))];
    const corroborated = (ts.match(/confidence:\s*"corroborated"/g) || []).length;
    const draft = (ts.match(/confidence:\s*"draft"/g) || []).length;
    console.log(JSON.stringify({
      mode: "src_fallback (dist not built — production-equivalent invocation will use dist/)",
      mill_training_summary: {
        totalNodes: tipCount,
        operations: operations.sort(),
        vendors: vendors.sort(),
        byConfidence: { corroborated, draft },
      },
    }, null, 2));
    return;
  }

  const summary = idx.summarizeMillingTrainingIndex();
  const faceMillingHits = idx.nodesForOperation("face_milling");
  const searchHits = idx.searchMillingTrainingNodes("chip thinning", 5);

  console.log(JSON.stringify({
    mode: "live_dist",
    "shop_practice:mill_training_summary": summary,
    "shop_practice:mill_training_for_operation(face_milling)": {
      count: faceMillingHits.length,
      first: faceMillingHits[0] ? {
        id: faceMillingHits[0].id,
        vendor: faceMillingHits[0].vendor,
        headline: faceMillingHits[0].headline,
        citation: faceMillingHits[0].citation,
        confidence: faceMillingHits[0].confidence,
      } : null,
    },
    "shop_practice:mill_training_search(chip thinning, 5)": {
      count: searchHits.length,
      hits: searchHits.map(h => ({ id: h.id, vendor: h.vendor, confidence: h.confidence, headline_first_80: h.headline.slice(0, 80) })),
    },
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
