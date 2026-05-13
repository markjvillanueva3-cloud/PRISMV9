#!/usr/bin/env node
// tier: T4
/**
 * prompt-classifier-hook.mjs — UserPromptSubmit
 * Classifies user prompt into 9 task classes for optimal context loading.
 */
import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const _raw = readStdinSafe();
if (!_raw) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
const input = JSON.parse(_raw);
const prompt = (input.user_prompt || input.content || '').toLowerCase();

const TASK_KEYWORDS = {
  backend: ['engine', 'dispatcher', 'wiring', 'schema', 'typescript', 'build', 'compile', 'tsc'],
  web: ['react', 'component', 'page', 'frontend', 'tailwind', 'vite', 'ui', 'web'],
  cad_python: ['cad', 'cadquery', 'python', 'geometry', 'step', 'stl', 'brep'],
  roadmap: ['roadmap', 'milestone', 'phase', 'session', 'rgs', 'track', 'continue'],
  audit: ['audit', 'review', 'scrutinize', 'check', 'verify', 'gap', 'health'],
  speed_feed: ['speed', 'feed', 'rpm', 'sfm', 'chip', 'cutting', 'kienzle', 'taylor'],
  post_process: ['post', 'gcode', 'g-code', 'program', 'fanuc', 'siemens', 'haas', 'controller'],
  erp: ['quote', 'cost', 'price', 'oee', 'schedule', 'job', 'order', 'bid'],
  general: []
};

let bestClass = 'general';
let bestScore = 0;

for (const [cls, keywords] of Object.entries(TASK_KEYWORDS)) {
  let score = 0;
  for (const kw of keywords) {
    if (prompt.includes(kw)) score++;
  }
  if (score > bestScore) {
    bestScore = score;
    bestClass = cls;
  }
}

if (bestScore > 0) {
  console.log(JSON.stringify({
    additionalContext: `TASK CLASS: ${bestClass} (score: ${bestScore}). Load ${bestClass} context bundles for optimal token efficiency.`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
