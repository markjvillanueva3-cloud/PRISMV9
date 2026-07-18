const fs = require('fs');
const path = require('path');

// Load the extracted tribal tips
const tipsDir = 'H:/prism/mcp-server/data/extracted-knowledge/hypermill';
const files = fs.readdirSync(tipsDir).filter(f => f.startsWith('hypermill-tribal-tips-')).sort().reverse();
const tipsFile = path.join(tipsDir, files[0]);
const data = JSON.parse(fs.readFileSync(tipsFile, 'utf-8'));

let tipId = 200;

// Check if string is safe for TypeScript (ASCII only, no special quotes)
function isSafe(str) {
  if (!str) return false;
  // Only allow ASCII printable chars
  return /^[\x20-\x7E]*$/.test(str) && !str.includes("'");
}

// Clean string for TypeScript
function clean(str) {
  if (!str) return '';
  return str
    .replace(/[\x00-\x1f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate TypeScript
let output = `/**
 * hyperMILL CAM Tribal Knowledge Tips — Extracted from PDF Documentation
 * High-quality tips extracted from official hyperMILL manuals
 * Generated ${new Date().toISOString().split('T')[0]}
 */
import type { KnowledgeTip } from '../engines/TribalKnowledgeEngine.js';

export const HYPERMILL_EXTRACTED_TIPS: KnowledgeTip[] = [
`;

// Filter for clean, high-quality tips only
const goodTips = data.tips.filter(t => {
  const title = clean(t.title || '');
  const body = clean(t.body || '');
  return title.length >= 5 && title.length <= 60 &&
         body.length >= 30 && body.length <= 300 &&
         isSafe(title) && isSafe(body);
}).slice(0, 80);

for (const tip of goodTips) {
  const id = 'hm-' + tipId++;
  const title = clean(tip.title).slice(0, 60);
  const body = clean(tip.body).slice(0, 280);
  const category = tip.category === 'Safety' ? 'safety_warning' : 'cam_strategy';
  const catTag = clean((tip.category || 'general').toLowerCase().replace(/\s+/g, '-'));

  output += `  {
    id: "${id}",
    title: "${title}",
    body: "${body}",
    category: "${category}",
    tags: ["hypermill", "${catTag}"],
    operation_types: ["general"],
    confidence: ${Math.round((tip.confidence || 0.8) * 100)},
    source: "extracted:hypermill-docs",
    created_at: "${new Date().toISOString().split('T')[0]}",
    usage_count: 0,
  },
`;
}

output += `];

// Export count for metrics
export const HYPERMILL_EXTRACTED_TIPS_COUNT = HYPERMILL_EXTRACTED_TIPS.length;
`;

// Write output
fs.writeFileSync('src/data/hypermill-extracted-tips.ts', output);
console.log('Generated ' + (tipId - 200) + ' clean tips');
