/** probe-corpus-tool-shape.ts -- dump the real corpus tool + holder shapes (slot:romeo, R12: don't guess fields). */
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";

catalogCorpusLoaderEngine.load();
const all = toolCatalogEngine.search({ max_results: 200000 }) as Array<Record<string, unknown>>;

const corpusTool = all.find((t) => String(t.id).startsWith("corpus:") && String(t.type) === "end_mill");
const tsTool = all.find((t) => !String(t.id).startsWith("corpus:") && String(t.type) === "end_mill");
const drill = all.find((t) => String(t.type) === "drill");
const turning = all.find((t) => String(t.type) === "turning_tool");

for (const [label, t] of [["CORPUS end_mill", corpusTool], ["TS end_mill", tsTool], ["drill", drill], ["turning", turning]] as const) {
  console.log(`\n===== ${label} =====`);
  console.log(JSON.stringify(t, null, 2).slice(0, 1400));
}

// holder shape
const holders = toolCatalogEngine.getHolders ? toolCatalogEngine.getHolders() : null;
console.log("\n===== HOLDERS =====");
console.log("getHolders present?", typeof toolCatalogEngine.getHolders);
if (Array.isArray(holders) && holders.length) {
  console.log("holder count:", holders.length);
  console.log(JSON.stringify(holders[0], null, 2).slice(0, 1000));
}
