#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const TIMESTAMP = "2026-02-26T22:00:00Z";
const VERSION = "1.0.0";
const TITLE = "PRISM App — Comprehensive Layered Roadmap v3.1";
const SKIP_IF_EXISTS = new Set(["S1-MS1", "S1-MS2"]);
const base = path.dirname(path.resolve(__filename));
const dataDir = path.join(base, "data");
const msDir = path.join(dataDir, "milestones");
const milestones = JSON.parse(fs.readFileSync(path.join(base, "_milestones_data.json"), "utf-8"));
fs.mkdirSync(msDir, { recursive: true });
console.log("[OK] Directory ensured: " + msDir);
const SCRUTINY_CFG = {pass_mode:"adaptive",min_passes:3,max_passes:7,convergence_rule:"delta < 2",escalation_rule:"if pass 4+ finds CRITICAL, flag for human review",scrutinizer_model:"opus-4.6",scrutinizer_effort:90,gap_categories:["missing_tools","missing_deps","missing_exit_conditions","missing_rollback","sequence_errors","role_mismatch","effort_mismatch","missing_indexing","missing_skills","orphaned_deliverables","underspecified_steps","missing_tests"],improvement_threshold:0.92};
const GATE_CFG = {omega_floor:0.75,safety_floor:0.70,ralph_required:false,ralph_grade_floor:"B",anti_regression:true,test_required:true,build_required:true,checkpoint:true,learning_save:true,custom_checks:[]};
function makeEnvelope(m){const units=[];for(let i=1;i<=m.units;i++){units.push({id:"P0-U"+String(i).padStart(2,"0"),title:"Execute milestone step "+i,phase:"P0",sequence:i-1,role:"R2",role_name:"Implementer",model:"sonnet-4.6",effort:80,tools:[],skills:[],scripts:[],hooks:[],features:[],dependencies:[],entry_conditions:[],exit_conditions:[],rollback:"git checkout -- [files modified by this unit]",steps:[],deliverables:[],index_in_master:false,creates_skill:false,creates_script:false,creates_hook:false,creates_command:false});}return{id:m.id,version:VERSION,title:m.title,brief:m.brief,created_at:TIMESTAMP,created_by:"claude-opus-4.6",phases:[{id:"P0",title:m.title,description:m.brief,sessions:m.sessions,primary_role:"R2",primary_model:"sonnet-4.6",units,gate:{...GATE_CFG},scrutiny_checkpoint:false,scrutiny_focus:[]}],total_units:m.units,total_sessions:m.sessions,role_matrix:[],tool_map:[],deliverables_index:[],existing_leverage:[],scrutiny_config:{...SCRUTINY_CFG}};}
function makeIndexEntry(m){return{id:m.id,title:m.title,track:m.track,dependencies:m.deps,status:m.status,total_units:m.units,completed_units:m.completed,sessions:m.sessions,envelope_path:"milestones/"+m.id+".json",position_path:"state/"+m.id+"/position.json"};}
const completedCount=milestones.filter(m=>m.status==="complete").length;
const totalUnits=milestones.reduce((s,m)=>s+m.units,0);
const completedUnits=milestones.reduce((s,m)=>s+m.completed,0);
const indexData={version:VERSION,title:TITLE,updated_at:TIMESTAMP,milestones:milestones.map(makeIndexEntry),total_milestones:milestones.length,completed_milestones:completedCount};
const idxPath=path.join(dataDir,"roadmap-index.json");
fs.writeFileSync(idxPath,JSON.stringify(indexData,null,2),"utf-8");
console.log("[OK] Written: "+idxPath);
let created=0,skipped=0;
for(const m of milestones){const ep=path.join(msDir,m.id+".json");if(SKIP_IF_EXISTS.has(m.id)&&fs.existsSync(ep)){console.log("[SKIP] "+m.id+".json already exists");skipped++;continue;}fs.writeFileSync(ep,JSON.stringify(makeEnvelope(m),null,2),"utf-8");created++;}
const ns=milestones.filter(m=>m.status==="not_started").length;
const ip=milestones.filter(m=>m.status==="in_progress").length;
console.log("");
console.log("============================================================");
console.log("SUMMARY");
console.log("============================================================");
console.log("  Total milestones in index:  "+milestones.length);
console.log("  Completed milestones:       "+completedCount);
console.log("  Not started milestones:     "+ns);
console.log("  In progress milestones:     "+ip);
console.log("  Total units across all:     "+totalUnits);
console.log("  Completed units:            "+completedUnits);
console.log("  Envelope files created:     "+created);
console.log("  Envelope files skipped:     "+skipped);
console.log("  roadmap-index.json written: "+idxPath);
console.log("  Envelope directory:         "+msDir);
console.log("");
const tracks=[],seen=new Set();for(const m of milestones){if(!seen.has(m.track)){tracks.push(m.track);seen.add(m.track);}}
console.log("  Tracks ("+tracks.length+"): "+tracks.join(", "));
console.log("");
console.log("  Phase breakdown:");
const pmap=[["Phase -1/0",["S0"]],["Phase 1 (L0 Data)",["L0"]],["Phase 2 (L1 Algos)",["L1"]],["Phase 3 (L2 Engines)",["L2"]],["Phase 4 (L3-L5 Infra)",["L3","L4","L5"]],["Phase 5 (L6 API)",["L6"]],["Phase 6 (Products)",["S3","S4","L8"]],["Phase 7 (CC Learning)",["CC","CC-EXT"]],["Phase 8 (L9-L10)",["L9","L10"]]];
for(const[pn,pt]of pmap){const pms=milestones.filter(m=>pt.includes(m.track));const pu=pms.reduce((s,m)=>s+m.units,0);console.log("    "+pn+": "+pms.length+" milestones, "+pu+" units");}
