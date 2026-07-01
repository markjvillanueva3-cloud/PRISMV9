import { readFileSync } from "fs";

const main = readFileSync("src/data/machine-profiles-catalog.ts", "utf8");
const ext = readFileSync("src/data/machine-profiles-catalog-ext.ts", "utf8");
const combined = main + ext;
const catModels = {};
for (const m of combined.matchAll(/brand: "([^"]+)",\s*model: "([^"]+)"/g)) {
  if (!catModels[m[1]]) catModels[m[1]] = new Set();
  catModels[m[1]].add(m[2]);
}

const enrich = readFileSync("src/data/machine-enrichment-catalog.ts", "utf8");
const postModels = {};
for (const m of enrich.matchAll(/brand: "([^"]+)",\s*\n\s*model: "([^"]+)"/g)) {
  if (!postModels[m[1]]) postModels[m[1]] = new Set();
  postModels[m[1]].add(m[2]);
}

let totalNew = 0;
const newByBrand = {};
console.log("NEW machines in POST DB not in catalog:");
for (const [brand, models] of Object.entries(postModels).sort()) {
  const catSet = catModels[brand] || new Set();
  const newModels = [...models].filter(m => !catSet.has(m));
  if (newModels.length > 0) {
    totalNew += newModels.length;
    newByBrand[brand] = newModels;
    console.log(`  ${brand} (+${newModels.length}): ${newModels.slice(0, 12).join(", ")}${newModels.length > 12 ? "..." : ""}`);
  }
}
const overlap = [...Object.values(postModels)].reduce((s, v) => s + v.size, 0) - totalNew;
console.log(`\nTotal NEW unique models: ${totalNew}`);
console.log(`Already in catalog (overlap): ${overlap}`);
console.log(`Catalog total: ${Object.values(catModels).reduce((s, v) => s + v.size, 0)}`);
