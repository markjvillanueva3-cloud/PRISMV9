import fs from "node:fs";
const G = JSON.parse(fs.readFileSync("H:/prism/state/shared/system-viz/system-graph.json","utf8"));
const layers = {};
for (const n of G.nodes) layers[n.layer]=(layers[n.layer]||0)+1;
console.log("Layers:", JSON.stringify(layers, null, 2));
const idPrefixes = {};
for (const n of G.nodes) {
  const p = (n.id||"").split(":")[0];
  idPrefixes[p]=(idPrefixes[p]||0)+1;
}
console.log("ID prefixes:", JSON.stringify(Object.entries(idPrefixes).sort((a,b)=>b[1]-a[1]).slice(0,15)));
// Find engine-like nodes by id pattern (case-insensitive)
const engineByPrefix = G.nodes.filter(n => /^engine[:_]/i.test(n.id||""));
console.log("engine: prefix nodes:", engineByPrefix.length);
console.log("Sample 5:", JSON.stringify(engineByPrefix.slice(0,5).map(n=>({id:n.id,label:(n.label||"").split("\n")[0],layer:n.layer,subgroup:n.subgroup})), null, 2));
// Layer breakdown of engine: nodes
const engineLayers={};
for (const n of engineByPrefix) engineLayers[n.layer]=(engineLayers[n.layer]||0)+1;
console.log("Engine: nodes by layer:", JSON.stringify(engineLayers));
