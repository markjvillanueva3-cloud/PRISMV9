const URL = "http://127.0.0.1:3100/mcp";
async function call(action, params) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "prism_cam", arguments: { action, params } } }),
  });
  const txt = await r.text();
  // SSE or JSON
  let json;
  const m = txt.match(/data:\s*(\{.*\})\s*$/s) || txt.match(/^\s*(\{.*\})\s*$/s);
  try { json = JSON.parse(m ? m[1] : txt); } catch { return { _raw: txt.slice(0, 400) }; }
  const inner = json?.result?.content?.[0]?.text;
  try { return JSON.parse(inner); } catch { return inner ?? json; }
}

const baseOp = (extra={}) => ({
  operation_type: "contour", tool_number: 1, tool_diameter_mm: 10, tool_flutes: 4,
  tool_description: "10MM 4FL CARBIDE", material_iso: "P", spindle_rpm: 3000,
  feed_mm_min: 800, axial_depth_mm: 2, radial_depth_mm: 5, coolant: "flood",
  coordinates: [{x:0,y:0,z:5,type:"rapid"},{x:10,y:0,z:-2,type:"linear"},{x:10,y:10,z:-2,type:"linear"}],
  ...extra
});

const out = {};

// 1) metric (G21) default
out.metric = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number: 2001, units:"metric" } });
// 2) inch (G20)
out.inch = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number: 2002, units:"inch" } });
// 3) extended work offset G54.1 P
out.wcsExt = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number: 2003, work_offset: 110 } });
// 4) aggressiveness header
out.aggr = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number: 2004, aggressiveness: 4 } });
// 5) prove-out header + M01
out.proveout = await call("master_post_hurco_v11", { operations:[baseOp(), baseOp({operation_type:"drill"})], config:{ program_number: 2005, prove_out:{ enabled:true, feed_factor:0.4 } } });
// 6) tsc coolant
out.tsc = await call("master_post_hurco_v11", { operations:[baseOp({coolant:"tsc"})], config:{ program_number: 2006, coolant_mode:"tsc" } });

console.log(JSON.stringify(out, null, 1).slice(0, 9000));
