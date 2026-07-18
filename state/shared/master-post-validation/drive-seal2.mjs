async function call(action, params, tries=8) {
  for (let k=0;k<tries;k++){
    try {
      const res = await fetch("http://127.0.0.1:3100/mcp", {
        method:"POST", headers:{ "Content-Type":"application/json", "Accept":"application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } })
      });
      const text = await res.text();
      if (text.startsWith("<!DOCTYPE")) { await new Promise(r=>setTimeout(r,700)); continue; }
      let p=text; const m=text.match(/data: (.*)/s); if(m)p=m[1];
      const obj = JSON.parse(p);
      const inner = obj?.result?.content?.[0]?.text;
      const parsed = inner ? JSON.parse(inner) : obj;
      if (parsed?.error && !parsed.engine_output && typeof parsed.error==='string' && /5\d\d|fetch|ECONN|timeout/i.test(parsed.error)) { await new Promise(r=>setTimeout(r,700)); continue; }
      return parsed;
    } catch(e){ await new Promise(r=>setTimeout(r,700)); }
  }
  return { error:"retries-exhausted" };
}
// EXACT same single-op shape that worked in drive-err earlier, + work_offset:131 + verify_tier
const r = await call("master_post_hurco_v11", {
  operations:[{ operation_type:"pocket", tool_number:3, tool_diameter_mm:10, tool_flutes:4, tool_description:"10MM EM",
    material_iso:"N", spindle_rpm:8000, feed_mm_min:1200, axial_depth_mm:6, radial_depth_mm:4, coolant:"flood",
    coordinates:[{x:0,y:0,z:5,type:"rapid"},{x:0,y:0,z:-6,type:"linear"},{x:50,y:30,z:-6,type:"arc_cw"}], arc_data:[{},{},{i:0,j:15}] }],
  config:{ program_number:3009, work_offset:131 }, verify_tier:"sim"
});
console.log("TOP_KEYS:", Object.keys(r));
if (r.error && Object.keys(r).length<=1) { console.log("ERR:", JSON.stringify(r).slice(0,200)); process.exit(0); }
const eo = r.engine_output ?? r;
console.log("EXT_WO:", (eo.gcode||[]).filter(l=>l.includes("WORK OFFSET")).join(" || "));
console.log("ARC_CW:", (eo.gcode||[]).filter(l=>l.includes("G02")).join(" || "));
console.log("SIDECAR:", r.physics_sidecar?Object.keys(r.physics_sidecar):(r.sidecar?Object.keys(r.sidecar):"none"));
console.log("VERIFY:", JSON.stringify(r.verify ?? r.verify_result ?? r.gate_result ?? "none").slice(0,300));
