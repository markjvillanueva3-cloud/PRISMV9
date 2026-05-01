#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:\\PRISM\\state';
const TRACKER_FILE = path.join(STATE_DIR, 'utilization.json');

function loadTracker() {
  if (fs.existsSync(TRACKER_FILE)) return JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf-8'));
  return { dispatchers: {}, features: {}, sessions: 0, lastUpdated: null };
}

function saveTracker(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2));
}

function recordUsage(category, name) {
  const data = loadTracker();
  if (!data[category]) data[category] = {};
  if (!data[category][name]) data[category][name] = { count: 0, lastUsed: null };
  data[category][name].count++;
  data[category][name].lastUsed = new Date().toISOString();
  saveTracker(data);
  return data[category][name];
}

function getReport() {
  const data = loadTracker();
  const ALL_DISPATCHERS = [
    'prism_data','prism_orchestrate','prism_hook','prism_skill_script','prism_calc',
    'prism_session','prism_generator','prism_validate','prism_omega','prism_manus',
    'prism_sp','prism_context','prism_gsd','prism_safety','prism_thread',
    'prism_knowledge','prism_toolpath','prism_autopilot_d','prism_ralph',
    'prism_doc','prism_dev','prism_guard','prism_atcs','prism_autonomous',
    'prism_telemetry','prism_pfp','prism_memory','prism_nl_hook',
    'prism_compliance','prism_tenant','prism_bridge'
  ];
  const ALL_FEATURES = [
    'pfp_prefilter','hot_resume','snapshot','prebuild_gate','session_preflight',
    'yolo_mode','atcs','ralph_loop','omega_compute','swarm','agent_parallel',
    'nl_hooks','compliance_templates','multi_tenant','bridge_endpoints'
  ];
  
  const usedDisp = Object.keys(data.dispatchers || {});
  const unusedDisp = ALL_DISPATCHERS.filter(d => !usedDisp.includes(d));
  const usedFeat = Object.keys(data.features || {});
  const unusedFeat = ALL_FEATURES.filter(f => !usedFeat.includes(f));
  
  console.log(`[UTILIZATION REPORT]`);
  console.log(`Sessions: ${data.sessions || 0}`);
  console.log(`Dispatchers: ${usedDisp.length}/${ALL_DISPATCHERS.length} used (${unusedDisp.length} idle)`);
  if (unusedDisp.length > 0) console.log(`  Idle: ${unusedDisp.join(', ')}`);
  console.log(`Features: ${usedFeat.length}/${ALL_FEATURES.length} active (${unusedFeat.length} dormant)`);
  if (unusedFeat.length > 0) console.log(`  Dormant: ${unusedFeat.join(', ')}`);
  
  // Top 5 most used
  const sorted = Object.entries(data.dispatchers || {}).sort((a,b) => b[1].count - a[1].count).slice(0,5);
  if (sorted.length > 0) {
    console.log(`Top dispatchers:`);
    sorted.forEach(([name, info]) => console.log(`  ${name}: ${info.count} calls`));
  }
  return { usedDisp: usedDisp.length, totalDisp: ALL_DISPATCHERS.length, unusedDisp, unusedFeat };
}

const cmd = process.argv[2];
if (cmd === 'report') getReport();
else if (cmd === 'record') {
  const cat = process.argv[3], name = process.argv[4];
  if (cat && name) recordUsage(cat, name);
  else console.log('Usage: utilization_tracker.js record <category> <name>');
} else if (cmd === 'session') {
  const data = loadTracker();
  data.sessions = (data.sessions || 0) + 1;
  saveTracker(data);
  console.log(`Session ${data.sessions} started`);
} else { getReport(); }

module.exports = { loadTracker, saveTracker, recordUsage, getReport };
