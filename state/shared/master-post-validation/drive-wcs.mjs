const URL = "http://127.0.0.1:3100/mcp";
async function call(action, params) {
  const r = await fetch(URL, { method:"POST", headers:{ "Content-Type":"application/json", "Accept":"application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } }) });
  const txt = await r.text(); const m = txt.match(/data:\s*(\{.*\})\s*$/s) || txt.match(/^\s*(\{.*\})\s*$/s);
  let json; try { json = JSON.parse(m?m[1]:txt);} catch { return {_raw:txt.slice(0,300)};}
  const inner=json?.result?.content?.[0]?.text; try { return JSON.parse(inner);} catch { return inner??json;}
}
const baseOp = { operation_type:"contour", tool_number:1, tool_diameter_mm:10, tool_flutes:4, tool_description:"T", material_iso:"P", spindle_rpm:3000, feed_mm_min:800, axial_depth_mm:2, radial_depth_mm:5, coolant:"flood", coordinates:[{x:0,y:0,z:5,type:"rapid"}] };
const o = await call("master_post_hurco_v11", { operations:[baseOp], config:{ program_number:2003, work_offset:110 } });
console.log((o?.engine_output?.gcode||[]).slice(0,9).join("\n"));
console.log("---G55 (work_offset:55)---");
const o2 = await call("master_post_hurco_v11", { operations:[baseOp], config:{ program_number:2008, work_offset:55 } });
console.log((o2?.engine_output?.gcode||[]).slice(4,8).join("\n"));
