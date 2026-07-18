import fs from "node:fs";
const G = JSON.parse(fs.readFileSync("H:/prism/state/shared/system-viz/system-graph.json","utf8"));
// Sample L10 nodes
const l10 = G.nodes.filter(n => n.layer === "L10").slice(0, 8);
console.log("L10 sample:", JSON.stringify(l10.map(n=>({id:n.id,label:(n.label||"").split("\n")[0],subgroup:n.subgroup,kind:n.kind,info:(n.info||"").slice(0,80)})), null, 2));

// All subgroup values in L10
const subs={};
for (const n of G.nodes) if (n.layer==="L10") subs[n.subgroup||"_"]=(subs[n.subgroup||"_"]||0)+1;
console.log("L10 subgroups:", JSON.stringify(subs, null, 2));

// Count edges; find common edge patterns
console.log("Edge count:", G.edges.length);
console.log("Sample edges:", JSON.stringify(G.edges.slice(0,5), null, 2));

// Look for engine-related l10 nodes
const engL10 = G.nodes.filter(n => n.layer==="L10" && /engine/i.test(n.label||"")).slice(0,5);
console.log("L10 nodes with 'engine' in label:", engL10.length);
console.log(JSON.stringify(engL10.map(n=>({id:n.id,label:(n.label||"").split("\n")[0],subgroup:n.subgroup})), null, 2));

// Total count of L10 with 'engine' in label or id
const allEngL10 = G.nodes.filter(n => n.layer==="L10" && (/engine/i.test(n.label||"") || /engine/i.test(n.id||"")));
console.log("Total L10 'engine' nodes:", allEngL10.length);
