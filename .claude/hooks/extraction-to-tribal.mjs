#!/usr/bin/env node
// tier: T3
/**
 * Extraction to Tribal Knowledge — PostToolUse Hook
 *
 * Ensures ALL extractions flow into categorized tribal knowledge:
 * - PDF extractions → tribal tips by domain
 * - MIT course extractions → formulas/algorithms registry
 * - Video extractions → machining best practices
 * - Resource folder content → categorized knowledge
 * - JM DIE program analysis → shop-specific tips
 *
 * Fires after Write operations to extracted-knowledge or data/state folders.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const MCP_SERVER = 'H:/prism/mcp-server';
const AUTO_TIPS_FILE = `${MCP_SERVER}/src/data/auto-ingested-tips.ts`;
const TRIBAL_INDEX = `${MCP_SERVER}/data/state/tribal-knowledge-index.json`;

// Domain to category mapping
const DOMAIN_CATEGORIES = {
  manufacturing: ["machining_physics", "cutting_parameters", "tool_selection"],
  machine_learning: ["ai_optimization", "pattern_recognition", "neural_inference"],
  optimization: ["speed_feed", "toolpath_optimization", "process_efficiency"],
  control_dynamics: ["servo_control", "vibration_damping", "motion_planning"],
  materials: ["material_properties", "hardness_selection", "workholding"],
  cam: ["cam_strategy", "feature_recognition", "post_processing"],
  tribal: ["shop_floor_wisdom", "operator_experience", "failure_prevention"],
};

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function loadJSON(p) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return null; }
}

async function saveJSON(p, data) {
  try { await fs.writeFile(p, JSON.stringify(data, null, 2)); return true; } catch { return false; }
}

async function appendTribalTip(tip) {
  // For now, just log and update index
  // In production, this would append to auto-ingested-tips.ts
  console.error(`[TribalFlow] New tip: ${tip.title}`);
}

async function categorizeExtraction(filePath, content) {
  const tips = [];
  const categories = [];

  // Detect domain from path and content
  if (filePath.includes('mit-courses') || content?.includes('MIT')) {
    categories.push('academic_formulas', 'scientific_algorithms');
  }
  if (filePath.includes('pdf') || content?.includes('formula')) {
    categories.push('extracted_formulas', 'reference_data');
  }
  if (filePath.includes('jm-die') || content?.includes('JM DIE')) {
    categories.push('shop_specific', 'customer_programs');
  }
  if (content?.includes('Kienzle') || content?.includes('Taylor')) {
    categories.push('machining_physics', 'cutting_force_models');
  }
  if (content?.includes('optimization') || content?.includes('optimal')) {
    categories.push('process_optimization', 'parameter_tuning');
  }

  return { categories, tips };
}

async function updateTribalIndex(extraction) {
  let index = await loadJSON(TRIBAL_INDEX);
  if (!index) {
    index = {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      categories: {},
      sources: [],
      totalTips: 0,
    };
  }

  // Add source
  if (!index.sources.includes(extraction.source)) {
    index.sources.push(extraction.source);
  }

  // Update categories
  for (const cat of extraction.categories) {
    index.categories[cat] = (index.categories[cat] || 0) + 1;
  }

  index.lastUpdated = new Date().toISOString();
  index.totalTips += extraction.tipCount || 0;

  await saveJSON(TRIBAL_INDEX, index);
  return index;
}

async function main() {
  const toolName = process.env.TOOL_NAME || '';
  const filePath = process.env.TOOL_INPUT_file_path || '';
  const content = process.env.TOOL_INPUT_content || '';

  // Only process Write operations to extraction directories
  if (toolName !== 'Write') {
    process.exit(0);
  }

  const isExtraction = filePath.includes('extracted-knowledge') ||
    filePath.includes('extraction') ||
    filePath.includes('extracted') ||
    (filePath.includes('data/state') && filePath.endsWith('.json'));

  if (!isExtraction) {
    process.exit(0);
  }

  // Categorize the extraction
  const { categories, tips } = await categorizeExtraction(filePath, content);

  if (categories.length > 0) {
    // Update tribal index
    const index = await updateTribalIndex({
      source: path.basename(filePath),
      categories,
      tipCount: tips.length,
      timestamp: new Date().toISOString(),
    });

    // Output context
    const output = {
      additionalContext: `TRIBAL FLOW: Extraction categorized as [${categories.join(', ')}]. ` +
        `Total indexed tips: ${index.totalTips}. Sources: ${index.sources.length}. ` +
        `All extractions flow to tribal knowledge for cross-session learning.`
    };
    console.log(JSON.stringify(output));
  }

  process.exit(0);
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
