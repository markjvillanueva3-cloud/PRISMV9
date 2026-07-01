async function call(action, params) {
  const res = await fetch("http://127.0.0.1:3100/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } })
  });
  const text = await res.text();
  let p = text; const m = text.match(/data: (.*)/s); if (m) p = m[1];
  const obj = JSON.parse(p);
  const inner = obj?.result?.content?.[0]?.text;
  return inner ? JSON.parse(inner) : obj;
}
const ops = [
  { operation_type:"face", tool_number:1, tool_diameter_mm:50, tool_flutes:5, tool_description:"50MM FACE MILL",
    material_iso:"P", spindle_rpm:1500, feed_mm_min:600, axial_depth_mm:1, radial_depth_mm:40, coolant:"flood",
    coordinates:[{x:0,y:0,z:5,type:"rapid"},{x:0,y:0,z:0,type:"linear"},{x:100,y:0,z:0,type:"linear"}] },
  { operation_type:"contour", tool_number:5, tool_diameter_mm:12, tool_flutes:3, tool_description:"12MM EM",
    material_iso:"P", spindle_rpm:3000, feed_mm_min:800, axial_depth_mm:5, radial_depth_mm:6, coolant:"flood",
    coordinates:[{x:0,y:0,z:5,type:"rapid"},{x:0,y:0,z:-5,type:"linear"},{x:40,y:0,z:-5,type:"arc_ccw"}],
    arc_data:[{},{},{r:20}] },
  { operation_type:"tap", tool_number:9, tool_diameter_mm:8, tool_flutes:2, tool_description:"M8x1.25 TAP",
    material_iso:"P", spindle_rpm:500, feed_mm_min:625, axial_depth_mm:15, coolant:"flood",
    coordinates:[{x:20,y:20,z:5,type:"rapid"},{x:20,y:20,z:-15,type:"linear"}] }
];
// 1. Base + extended work offset G54.1
const r1 = await call("master_post_hurco_v11", { operations: ops, config:{ program_number:3001, work_offset:131, units:"metric", use_ultimotion:true } });
const eo1 = r1.engine_output ?? r1;
console.log("=== EXTENDED WORK OFFSET (work_offset:131) ===");
console.log((eo1.gcode||[]).filter(l=>l.includes("WORK OFFSET")||l.includes("G54")).join("\n"));
console.log("=== TAP/ARC/FACE present? ===", (eo1.gcode||[]).filter(l=>l.includes("G02")||l.includes("G03")||l.includes("M8")||l.includes("FACE")||l.includes("TAP")).join(" | "));
console.log("=== SETUP_SHEET tools ===", JSON.stringify(eo1.setup_sheet?.tools));
console.log("=== PHYSICS count ===", eo1.physics_checks?.length, "warnings:", JSON.stringify(eo1.warnings));
console.log("=== SEAL keys ===", Object.keys(r1));
console.log("=== VERIFY ===", JSON.stringify(r1.verify ?? r1.verify_result ?? r1.sidecar?.verify ?? "none").slice(0,250));
console.log("=== SIDECAR keys ===", r1.sidecar ? Object.keys(r1.sidecar) : "no-sidecar");

// 2. Aggressiveness L2 + prove-out
const r2 = await call("master_post_hurco_v11", { operations: ops.slice(0,1), config:{ program_number:3002, aggressiveness:2 } });
const eo2 = r2.engine_output ?? r2;
console.log("\n=== AGGRESSIVENESS L2 header+feedopt ===");
console.log((eo2.gcode||[]).filter(l=>l.includes("AGGRESSIVENESS")).join("\n"), "| applied:", eo2.aggressiveness_applied, "| feedopts:", JSON.stringify(eo2.feed_optimizations));

const r3 = await call("master_post_hurco_v11", { operations: ops, config:{ program_number:3003, prove_out:{ enabled:true, feed_factor:0.5 } } });
const eo3 = r3.engine_output ?? r3;
console.log("\n=== PROVE-OUT header+M01 ===");
console.log((eo3.gcode||[]).filter(l=>l.includes("PROVE-OUT")||l.includes("M01")).join("\n"), "| prove_out_mode:", eo3.prove_out_mode);

// 3. units inch
const r4 = await call("master_post_hurco_v11", { operations: ops.slice(0,1), config:{ program_number:3004, units:"inch" } });
const eo4 = r4.engine_output ?? r4;
console.log("\n=== INCH ===", (eo4.gcode||[]).filter(l=>l.includes("G20")||l.includes("G21")).join(" "));

// 4. mist + tsc coolant
const r5 = await call("master_post_hurco_v11", { operations:[{...ops[0], coolant:"tsc"}], config:{ program_number:3005 } });
const eo5 = r5.engine_output ?? r5;
console.log("=== TSC coolant ===", (eo5.gcode||[]).filter(l=>l.includes("M88")||l.includes("M07")||l.includes("M08")).join(" "));

// 5. unified AGI generate
const r6 = await call("master_post_unified_agi_generate", { operations: ops, controller:"hurco", material_iso:"P", machine:"hurco_vmx24" });
console.log("\n=== UNIFIED AGI GENERATE ===", JSON.stringify(r6).slice(0,400));
