const URL = "http://127.0.0.1:3100/mcp";
async function call(action, params) {
  const r = await fetch(URL, { method:"POST", headers:{ "Content-Type":"application/json", "Accept":"application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } }) });
  const txt = await r.text(); const m = txt.match(/data:\s*(\{.*\})\s*$/s) || txt.match(/^\s*(\{.*\})\s*$/s);
  let json; try { json = JSON.parse(m?m[1]:txt);} catch { return {_raw:txt.slice(0,300)};}
  const inner=json?.result?.content?.[0]?.text; try { return JSON.parse(inner);} catch { return inner??json;}
}
// analyze warnings keys
const a = await call("master_post_unified_agi_analyze", { gcode:["O1","T1 M06","G01 X10 F800","M30","%"].join("\n"), controller:"hurco", material_iso:"P" });
const d = a?.data ?? a;
console.log("ANALYZE keys:", Object.keys(d||{}).join(","));
console.log("ANALYZE warnings:", JSON.stringify(d?.warnings));
console.log("ANALYZE provenance?:", !!d?.provenance, "improvement_suggestions?:", !!d?.improvement_suggestions);

// generate provenance
const g = await call("master_post_unified_agi_generate", { part:{ name:"TEST" }, controller:"hurco", material_iso:"P", operations:[{ type:"contour" }] });
const gd = g?.data ?? g;
console.log("\nGENERATE keys:", Object.keys(gd||{}).join(","));
console.log("GENERATE quality_score:", gd?.quality_score, "provenance.total_confidence:", gd?.provenance?.total_confidence, "engines_invoked:", gd?.provenance?.engines_invoked?.length);
