import fs from "node:fs";
const G = JSON.parse(fs.readFileSync("H:/prism/state/shared/system-viz/system-graph.json","utf8"));

// Inspect L7+L8+L9 (where dispatchers + small engine groups live)
for (const layer of ["L4","L5","L6","L7","L8","L9"]) {
  const ns = G.nodes.filter(n => n.layer===layer);
  console.log(`\n=== Layer ${layer} (${ns.length} nodes) ===`);
  console.log("Sample 5:", JSON.stringify(ns.slice(0,5).map(n=>({id:n.id,label:(n.label||"").split("\n")[0],subgroup:n.subgroup,kind:n.kind,count:n.count,status:n.status,info:(n.info||"").slice(0,80)})), null, 2));
}

// Edge types
const edgeTypes = {};
for (const e of G.edges) edgeTypes[e.type]=(edgeTypes[e.type]||0)+1;
console.log("\nEdge types:", JSON.stringify(edgeTypes, null, 2));

// Sample dispatcher node
const dispatcher = G.nodes.find(n => n.layer === "L4");
if (dispatcher) {
  console.log("\nDispatcher sample:", JSON.stringify(dispatcher, null, 2));
  // Outgoing edges from this dispatcher
  const out = G.edges.filter(e => e.from === dispatcher.id);
  console.log(`Outgoing edges from ${dispatcher.id}: ${out.length}`);
  console.log("Sample 5:", JSON.stringify(out.slice(0,5), null, 2));
}

// How many actions have wired_engines info?
const actionNodes = G.nodes.filter(n => n.layer === "L9" || n.kind === "action");
console.log(`\nL9 + kind=action: ${actionNodes.length}`);
console.log("Sample:", JSON.stringify(actionNodes.slice(0,2), null, 2));

// Look at meta
console.log("\nMeta:", JSON.stringify(G.meta, null, 2).slice(0, 2000));
