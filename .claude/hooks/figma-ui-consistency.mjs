#!/usr/bin/env node
// tier: T1
/**
 * figma-ui-consistency.mjs — PreToolUse hook
 *
 * Checks UI component changes against Figma design specs when Figma plugin is active.
 *
 * Triggers on: Write/Edit to web/src/components/**
 *
 * REQUIRES: Figma plugin authenticated + FIGMA_FILE_KEY env
 *
 * To enable Figma integration:
 * 1. Connect Figma plugin via /mcp
 * 2. Set FIGMA_FILE_KEY env var to your design file
 * 3. This hook will suggest Figma components when editing UI
 *
 * BENEFITS:
 * - Design-to-code consistency
 * - Auto-suggest Figma component specs
 * - Track design drift
 * - Generate component skeletons from Figma frames
 */

import { existsSync, readFileSync, promises as fsPromises } from 'fs';
import { resolve, basename } from 'path';

const WEB_COMPONENTS_PATH = 'mcp-server/web/src/components';
const FIGMA_STATE_PATH = 'H:/prism/mcp-server/data/state/figma-sync-state.json';

/**
 * Check if Figma is configured
 */
function isFigmaConfigured() {
  return !!process.env.FIGMA_FILE_KEY;
}

/**
 * Check if path is a UI component
 */
function isUIComponent(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.includes('/web/src/components/') &&
         (normalized.endsWith('.tsx') || normalized.endsWith('.jsx'));
}

/**
 * Extract component name from path
 */
function getComponentName(filePath) {
  return basename(filePath).replace(/\.(tsx|jsx)$/, '');
}

/**
 * Load Figma component mapping (if exists)
 */
function loadFigmaMapping() {
  try {
    if (!existsSync(FIGMA_STATE_PATH)) return { components: {} };
    return JSON.parse(readFileSync(FIGMA_STATE_PATH, 'utf8'));
  } catch {
    return { components: {} };
  }
}

/**
 * Generate Figma context for a component
 */
function generateFigmaContext(componentName, figmaState) {
  const lines = [];
  const mapping = figmaState.components?.[componentName];

  lines.push(`## Figma Design Context: ${componentName}`);
  lines.push('');

  if (!isFigmaConfigured()) {
    lines.push('ℹ️ Figma plugin not configured.');
    lines.push('');
    lines.push('**To enable design consistency checks:**');
    lines.push('1. Connect Figma plugin via /mcp');
    lines.push('2. Set FIGMA_FILE_KEY env var');
    lines.push('3. Map components to Figma frames');
    lines.push('');
    lines.push('**Benefits:**');
    lines.push('- See design specs while coding');
    lines.push('- Auto-generate component skeletons');
    lines.push('- Track design-code drift');
    return lines.join('\n');
  }

  if (mapping) {
    lines.push(`✅ Figma frame: ${mapping.frameId}`);
    lines.push('');
    if (mapping.specs) {
      lines.push('**Design Specs:**');
      if (mapping.specs.width) lines.push(`  - Width: ${mapping.specs.width}px`);
      if (mapping.specs.height) lines.push(`  - Height: ${mapping.specs.height}px`);
      if (mapping.specs.padding) lines.push(`  - Padding: ${mapping.specs.padding}`);
      if (mapping.specs.colors) lines.push(`  - Colors: ${mapping.specs.colors.join(', ')}`);
    }
    lines.push('');
    lines.push(`Last synced: ${mapping.lastSync || 'never'}`);
  } else {
    lines.push('⚠️ No Figma mapping for this component.');
    lines.push('');
    lines.push('**Suggested actions:**');
    lines.push('1. Create/find matching Figma frame');
    lines.push('2. Add mapping to figma-sync-state.json');
    lines.push('3. Or skip if this is a utility component');
  }

  return lines.join('\n');
}

/**
 * Main hook handler
 */
async function main() {
  let input;
  try {
    // /dev/stdin is POSIX-only. Read from fd 0 for cross-platform (Windows).
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const { tool, input: toolInput } = input;
  const filePath = toolInput?.file_path || '';

  // Only trigger for UI component files
  if (!isUIComponent(filePath)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const componentName = getComponentName(filePath);
  const figmaState = loadFigmaMapping();
  const context = generateFigmaContext(componentName, figmaState);

  // Never block - just provide context
  console.log(JSON.stringify({
    decision: 'approve',
    reason: isFigmaConfigured()
      ? `Figma context loaded for ${componentName}`
      : `Editing UI component: ${componentName} (Figma not configured)`,
    context
  }));
}

main().catch(err => {
  console.log(JSON.stringify({
    decision: 'approve',
    reason: `Figma hook error: ${err.message}`
  }));
});
