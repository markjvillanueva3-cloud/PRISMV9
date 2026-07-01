async function call(action, params, tries=4) {
  for (let k=0;k<tries;k++){
    try {
      const res = await fetch("http://127.0.0.1:3100/mcp", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Accept":"application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } })
      });
      const text = await res.text();
      let p=text; const m=text.match(/data: (.*)/s); if(m)p=m[1];
      const obj = JSON.parse(p);
      const inner = obj?.result?.content?.[0]?.text;
      const parsed = inner ? JSON.parse(inner) : obj;
      if (parsed?.error && !parsed.engine_output) { await new Promise(r=>setTimeout(r,400)); continue; }
      return parsed;
    } catch(e){ await new Promise(r=>setTimeout(r,400)); }
  }
  return { error:"all-retries-failed" };
}
const ops = [
  { operation_type:"contour", tool_number:5, tool_diameter_mm:12, tool_flutes:3, tool_description:"12MM EM",
    material_iso:"P", spindle_rpm:3000, feed_mm_min:800, axial_depth_mm:5, radial_depth_mm:6, coolant:"flood",
    coordinates:[{x:0,y:0,z:5,type:"rapid"},{x:0,y:0,z:-5,type:"linear"},{x:40,y:0,z:-5,type:"arc_ccw"}], arc_data:[{},{},{r:20}] },
  { operation_type:"tap", tool_number:9, tool_diameter_mm:8, tool_flutes:2, tool_description:"M8x1.25 TAP",
    material_iso:"P", spindle_rpm:500, feed_mm_min:625, axial_depth_mm:15, coolant:"flood",
    coordinates:[{x:20,y:20,z:5,type:"rapid"},{x:20,y:20,z:-15,type:"linear"}] }
];
const r1 = await call("master_post_hurco_v11", { operations: ops, config:{ program_number:3001, work_offset:131, use_ultimotion:true } });
const eo1 = r1.engine_output ?? r1;
console.log("EXT_WO:", (eo1.gcode||[]).filter(l=>l.includes("WORK OFFSET")).join(" || "));
console.log("ARC_CCW:", (eo1.gcode||[]).filter(l=>l.includes("G03")).join(" || "));
console.log("SETUP_SHEET:", JSON.stringify(eo1.setup_sheet)?.slice(0,400));
console.log("SEAL_KEYS:", Object.keys(r1));
console.log("SIDECAR:", r1.sidecar? Object.keys(r1.sidecar): (r1.physics_sidecar?Object.keys(r1.physics_sidecar):"none"));
console.log("VERIFY:", JSON.stringify(r1.verify ?? r1.verify_result ?? "none").slice(0,200));

const r3 = await call("master_post_hurco_v11", { operations: ops, config:{ program_number:3003, prove_out:{ enabled:true, feed_factor:0.5 } } });
const eo3 = r3.engine_output ?? r3;
console.log("\nPROVEOUT:", (eo3.gcode||[]).filter(l=>l.includes("PROVE-OUT")||l.includes("M01")).join(" || "), "| mode:", eo3.prove_out_mode);
console.log("PROVEOUT_FEEDOPT:", JSON.stringify(eo3.feed_optimizations));
