async function call(action, params, tries=6) {
  for (let k=0;k<tries;k++){
    try {
      const res = await fetch("http://127.0.0.1:3100/mcp", {
        method:"POST", headers:{ "Content-Type":"application/json", "Accept":"application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } })
      });
      const text = await res.text();
      if (text.startsWith("<!DOCTYPE")) { await new Promise(r=>setTimeout(r,500)); continue; }
      let p=text; const m=text.match(/data: (.*)/s); if(m)p=m[1];
      const obj = JSON.parse(p);
      const inner = obj?.result?.content?.[0]?.text;
      const parsed = inner ? JSON.parse(inner) : obj;
      if (parsed?.error && !parsed.engine_output) { await new Promise(r=>setTimeout(r,500)); continue; }
      return parsed;
    } catch(e){ await new Promise(r=>setTimeout(r,500)); }
  }
  return { error:"retries-exhausted" };
}
// minimal single contour op w/ arc + extended work offset + verify_tier
const r = await call("master_post_hurco_v11", {
  operations:[{ operation_type:"contour", tool_number:5, tool_diameter_mm:12, tool_flutes:3, tool_description:"12MM EM",
    material_iso:"P", spindle_rpm:3000, feed_mm_min:800, axial_depth_mm:5, radial_depth_mm:6, coolant:"flood",
    coordinates:[{x:0,y:0,z:5,type:"rapid"},{x:0,y:0,z:-5,type:"linear"},{x:40,y:0,z:-5,type:"arc_ccw"}], arc_data:[{},{},{r:20}] }],
  config:{ program_number:3001, work_offset:131 },
  verify_tier:"sim"
});
console.log("TOP_KEYS:", Object.keys(r));
const eo = r.engine_output ?? r;
console.log("EXT_WO:", (eo.gcode||[]).filter(l=>l.includes("WORK OFFSET")).join(" || "));
console.log("ARC:", (eo.gcode||[]).filter(l=>l.includes("G03")||l.includes("G02")).join(" || "));
console.log("SIDECAR_KEYS:", r.physics_sidecar?Object.keys(r.physics_sidecar):(r.sidecar?Object.keys(r.sidecar):"none"));
console.log("VERIFY:", JSON.stringify(r.verify ?? r.verify_result ?? "none").slice(0,300));
