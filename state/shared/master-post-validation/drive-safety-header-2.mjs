const URL = "http://127.0.0.1:3100/mcp";
async function call(action, params) {
  const r = await fetch(URL, { method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } }) });
  const txt = await r.text();
  const m = txt.match(/data:\s*(\{.*\})\s*$/s) || txt.match(/^\s*(\{.*\})\s*$/s);
  let json; try { json = JSON.parse(m ? m[1] : txt); } catch { return { _raw: txt.slice(0,300) }; }
  const inner = json?.result?.content?.[0]?.text;
  try { return JSON.parse(inner); } catch { return inner ?? json; }
}
const baseOp = (extra={}) => ({ operation_type:"contour", tool_number:1, tool_diameter_mm:10, tool_flutes:4,
  tool_description:"10MM 4FL CARBIDE", material_iso:"P", spindle_rpm:3000, feed_mm_min:800, axial_depth_mm:2, radial_depth_mm:5,
  coolant:"flood", coordinates:[{x:0,y:0,z:5,type:"rapid"},{x:10,y:0,z:-2,type:"linear"}], ...extra });

const head = (o) => (o?.engine_output?.gcode || []).slice(0, 9);
const grep = (o, re) => (o?.engine_output?.gcode || []).filter(l => re.test(l));

const inch = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number:2002, units:"inch" } });
const wcsExt = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number:2003, work_offset:110 } });
const aggr = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number:2004, aggressiveness:4 } });
const proveout = await call("master_post_hurco_v11", { operations:[baseOp(), baseOp({operation_type:"drill"})], config:{ program_number:2005, prove_out:{ enabled:true, feed_factor:0.4 } } });
const tsc = await call("master_post_hurco_v11", { operations:[baseOp({coolant:"tsc"})], config:{ program_number:2006, coolant_mode:"tsc" } });
const noUlti = await call("master_post_hurco_v11", { operations:[baseOp()], config:{ program_number:2007, use_ultimotion:false } });

console.log("INCH head:", JSON.stringify(head(inch)));
console.log("WCSEXT g54:", JSON.stringify(grep(wcsExt, /WORK OFFSET|G54/)));
console.log("AGGR header:", JSON.stringify(grep(aggr, /AGGRESSIVENESS|PROVE/)));
console.log("PROVEOUT header+M01:", JSON.stringify(grep(proveout, /PROVE-OUT|M01|OPTIONAL/)));
console.log("TSC emit:", JSON.stringify(grep(tsc, /M88|TSC|COOLANT/)));
console.log("NO-ULTI G05.3:", JSON.stringify(grep(noUlti, /G05\.3/)), "(empty=ok)");
