const URL="http://127.0.0.1:3100/mcp";
async function callRaw(action,params){const r=await fetch(URL,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"prism_cam",arguments:{action,params}}})});const txt=await r.text();const m=txt.match(/data:\s*(\{.*\})\s*$/s)||txt.match(/^\s*(\{.*\})\s*$/s);let j;try{j=JSON.parse(m?m[1]:txt);}catch{return txt.slice(0,300);}return j?.result?.content?.[0]?.text??JSON.stringify(j);}
const g=await callRaw("master_post_unified_agi_generate",{part:{name:"T"},controller:"hurco",material_iso:"P",operations:[{type:"contour"}]});
console.log("GEN RAW:", g.slice(0,400));
const k=await callRaw("master_post_unified_agi_kinematics",{gcode:"O1\nG21\nM30\n%",machine:"hurco_vmx42"});
console.log("KINEMATICS RAW:", k.slice(0,400));
