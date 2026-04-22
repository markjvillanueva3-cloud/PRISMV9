/**
 * Emit CAM_TRIBAL_RAG_INDEX.json — U-CAM-ML-06 deliverable.
 */
import { camTribalRAGEngine } from "../src/engines/CAMTribalRAGEngine.js";

console.log("[U-CAM-ML-06] Scanning tip corpus + building RAG index...");
const idx = camTribalRAGEngine.buildIndex();
console.log(`[U-CAM-ML-06] Tips embedded:       ${idx.summary.total_tips}`);
console.log(`[U-CAM-ML-06] Vocabulary size:     ${idx.summary.total_vocab}`);
console.log(`[U-CAM-ML-06] Avg non-zeros/tip:   ${idx.summary.avg_nnz.toFixed(1)}`);
console.log(`[U-CAM-ML-06] Per-CAM embedding counts:`);
for (const [slug, n] of Object.entries(idx.summary.per_cam_count).sort((a, b) => b[1] - a[1])) {
  if (n === 0) continue;
  console.log(`  ${slug.padEnd(14)} ${n}`);
}

// Latency smoke-test
const queries = [
  "feed per tooth carbide steel",
  "surface finish Ra 32 tool steel",
  "tool deflection slot milling",
  "five axis swarf impeller",
  "titanium chip load coolant",
  "spindle power heavy roughing",
  "Kienzle cutting force kc1_1",
  "chatter stability lobe",
  "climb vs conventional",
  "pocket island avoidance",
];
const t0 = performance.now();
let totalHits = 0;
for (const q of queries) {
  const hits = camTribalRAGEngine.retrieve(q, { topK: 10 });
  totalHits += hits.length;
}
const elapsed = performance.now() - t0;
console.log(`[U-CAM-ML-06] ${queries.length} queries, top-10 each: ${elapsed.toFixed(1)}ms total, avg ${(elapsed / queries.length).toFixed(2)}ms/query`);
console.log(`[U-CAM-ML-06] Retrieved ${totalHits} total hits (non-zero score)`);

if (elapsed / queries.length > 50) {
  console.error("[U-CAM-ML-06] FAIL — avg latency exceeds 50ms budget");
  process.exit(1);
}
console.log("[U-CAM-ML-06] Latency budget: PASS");
