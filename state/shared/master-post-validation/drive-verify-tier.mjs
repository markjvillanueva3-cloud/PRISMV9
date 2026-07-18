const URL="http://127.0.0.1:3100/mcp";
async function call(action,params){const r=await fetch(URL,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"prism_cam",arguments:{action,params}}})});const txt=await r.text();const m=txt.match(/data:\s*(\{.*\})\s*$/s)||txt.match(/^\s*(\{.*\})\s*$/s);let j;try{j=JSON.parse(m?m[1]:txt);}catch{return{_raw:txt.slice(0,200)};}const inner=j?.result?.content?.[0]?.text;try{return JSON.parse(inner);}catch{return inner??j;}}
const baseOp={operation_type:"contour",tool_number:1,tool_diameter_mm:10,tool_flutes:4,tool_description:"T",material_iso:"P",spindle_rpm:3000,feed_mm_min:800,axial_depth_mm:2,radial_depth_mm:5,coolant:"flood",coordinates:[{x:0,y:0,z:5,type:"rapid"},{x:10,y:0,z:-2,type:"linear"}]};
// verify_tier present
const vt=await call("master_post_hurco_v11",{operations:[baseOp],config:{program_number:2009},verify_tier:"production"});
console.log("VERIFY_TIER keys:", Object.keys(vt||{}).join(","));
console.log("verify_result present:", !!vt?.verify_result, "sidecar present:", !!vt?.sidecar);
// prove_out clamp: feed_factor=5 (>1) should clamp to 1.00 in header
const clamp=await call("master_post_hurco_v11",{operations:[baseOp],config:{program_number:2010,prove_out:{enabled:true,feed_factor:5}}});
const hdr=(clamp?.engine_output?.gcode||[]).filter(l=>/PROVE-OUT/.test(l));
console.log("PROVE-OUT clamp header:", JSON.stringify(hdr));
