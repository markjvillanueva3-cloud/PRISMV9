#!/usr/bin/env node
/**
 * AI Duplication Guard — PreToolUse Hook (Phase 0.1 Fix)
 *
 * HARD BLOCKS duplicate creation of:
 * - Engines (*.ts in /engines/)
 * - Formulas (FormulaRegistry additions)
 * - Algorithms (AlgorithmRegistry additions)
 * - Extractions (data/extracted-knowledge/)
 * - Skills (skills/, commands/)
 * - Hooks (hooks/)
 * - Dispatchers/Actions
 *
 * This is NOT honor-system. This hook BLOCKS with `permissionDecision: "deny"`.
 * Uses cross-session registry + file system scan + Levenshtein similarity.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

const MCP_SERVER = 'H:/prism/mcp-server';
const REGISTRY_PATH = `${MCP_SERVER}/data/state/cross-session-asset-registry.json`;

// Asset type detection patterns (expanded for better coverage)
const ASSET_PATTERNS = [
  { pattern: /[/\\]engines[/\\][A-Z].*Engine\.ts$/, type: 'engine', dir: `${MCP_SERVER}/src/engines` },
  { pattern: /[/\\]engines[/\\][A-Z].*\.ts$/, type: 'engine', dir: `${MCP_SERVER}/src/engines` },
  { pattern: /[/\\]algorithms[/\\][A-Z].*\.(ts|js)$/, type: 'algorithm', dir: `${MCP_SERVER}/src/algorithms` },
  { pattern: /[/\\]registries[/\\]Formula/, type: 'formula', dir: `${MCP_SERVER}/src/registries` },
  { pattern: /[/\\]registries[/\\]Algorithm/, type: 'algorithm', dir: `${MCP_SERVER}/src/registries` },
  { pattern: /[/\\]extracted-knowledge[/\\]/, type: 'extraction', dir: `${MCP_SERVER}/data/extracted-knowledge` },
  { pattern: /[/\\]skills[/\\].*\.ts$/, type: 'skill', dir: `${MCP_SERVER}/src/skills` },
  { pattern: /[/\\]commands[/\\].*\.md$/, type: 'skill', dir: null },
  { pattern: /[/\\]hooks[/\\].*\.(ts|mjs)$/, type: 'hook', dir: `${MCP_SERVER}/src/hooks` },
  { pattern: /[/\\]dispatchers[/\\].*Dispatcher\.ts$/, type: 'dispatcher', dir: `${MCP_SERVER}/src/tools/dispatchers` },
];

// Known formulas that should NEVER be re-implemented
const KNOWN_FORMULAS = [
  'Kienzle', 'Taylor', 'Johnson-Cook', 'Merchant', 'Archard', 'Preston',
  'Bellman', 'PID', 'Kalman', 'Bayesian', 'Monte Carlo', 'Gradient Descent',
  'Newton-Raphson', 'Runge-Kutta', 'Euler', 'Hooke', 'Von Mises', 'Tresca',
  'Fourier', 'Laplace', 'Reynolds', 'Navier-Stokes', 'Bernoulli',
  'Black-Scholes', 'Shannon', 'Gibbs', 'Boltzmann', 'Carnot'
];

// Known algorithms that already exist (only check longer names to avoid false positives)
const KNOWN_ALGORITHMS = [
  'Dijkstra', 'Bellman-Ford', 'QLearning', 'Q-Learning', 'SARSA', 'DQN',
  'GeneticAlgorithm', 'SimulatedAnnealing', 'ParticleSwarm', 'AntColony',
  'Kmeans', 'K-means', 'DBSCAN', 'RandomForest', 'SupportVectorMachine',
  'NeuralNetwork', 'Backpropagation', 'AdamOptimizer', 'StochasticGradient',
  'RMSprop', 'FFTAnalyzer', 'KalmanFilter', 'MonteCarlo', 'BayesianOptimizer'
];

// Read stdin for hook input
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    const rl = createInterface({ input: process.stdin, terminal: false });
    rl.on('line', (line) => { data += line + '\n'; });
    rl.on('close', () => resolve(data.trim()));
    // Timeout after 100ms if no input
    setTimeout(() => { rl.close(); resolve(''); }, 100);
  });
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function loadRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf8');
    return JSON.parse(data);
  } catch { return { entries: [] }; }
}

async function scanDir(dir, extension = '.ts') {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith(extension)).map(f => f.replace(extension, ''));
  } catch { return []; }
}

function normalize(name) {
  return name.toLowerCase()
    .replace(/engine$/i, '')
    .replace(/algorithm$/i, '')
    .replace(/formula$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1))
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshtein(longer, shorter)) / longer.length;
}

function findDuplicates(proposed, existingList, threshold = 0.75) {
  const normalizedProposed = normalize(proposed);
  const matches = [];

  for (const existing of existingList) {
    const normalizedExisting = normalize(existing);

    // Exact match
    if (normalizedProposed === normalizedExisting) {
      matches.push({ name: existing, similarity: 1.0, reason: 'EXACT DUPLICATE' });
      continue;
    }

    // Substring containment
    if (normalizedProposed.includes(normalizedExisting) || normalizedExisting.includes(normalizedProposed)) {
      if (normalizedProposed.length > 3 && normalizedExisting.length > 3) {
        matches.push({ name: existing, similarity: 0.9, reason: 'NAME OVERLAP' });
        continue;
      }
    }

    // Similarity check
    const sim = similarity(normalizedProposed, normalizedExisting);
    if (sim >= threshold) {
      matches.push({ name: existing, similarity: sim, reason: 'SIMILAR NAME' });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

function checkContentDuplication(content) {
  const warnings = [];
  const contentLower = content.toLowerCase();

  // Check for known formulas being re-implemented (require word boundary match)
  for (const formula of KNOWN_FORMULAS) {
    const formulaLower = formula.toLowerCase();
    // Only match if formula appears as a word (not substring)
    const regex = new RegExp(`\\b${formulaLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(content) &&
        (contentLower.includes('implement') || contentLower.includes('calculate') ||
         contentLower.includes('formula') || contentLower.includes('equation'))) {
      warnings.push(`Re-implementing "${formula}" — already exists in FormulaRegistry or CrossDisciplinaryDeepLearningEngine`);
    }
  }

  // Check for known algorithms (require word boundary match, skip short names)
  for (const algo of KNOWN_ALGORITHMS) {
    if (algo.length < 5) continue; // Skip short algorithm names to avoid false positives
    const algoNormalized = algo.toLowerCase().replace(/[^a-z]/g, '');
    const regex = new RegExp(`\\b${algoNormalized}\\b`, 'i');
    if (regex.test(contentLower) &&
        (contentLower.includes('class ') || contentLower.includes('implement'))) {
      warnings.push(`Re-implementing "${algo}" — already exists in AlgorithmRegistry`);
    }
  }

  return warnings;
}

function outputBlock(reason) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  };
  console.log(JSON.stringify(output));
  process.exit(0);
}

function outputAllow() {
  process.exit(0);
}

async function main() {
  // Try to read from stdin first (proper hook format)
  let input;
  try {
    const stdinData = await readStdin();
    if (stdinData) {
      input = JSON.parse(stdinData);
    }
  } catch {
    // Fall back to environment variables
  }

  // Extract file path and content from input or environment
  const filePath = input?.tool_input?.file_path ||
                   process.env.TOOL_INPUT_file_path ||
                   '';
  const content = input?.tool_input?.content ||
                  process.env.TOOL_INPUT_content ||
                  '';
  const toolName = input?.tool_name ||
                   process.env.TOOL_NAME ||
                   '';

  // Only check Write/Edit operations
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
    outputAllow();
    return;
  }

  // Skip if no file path
  if (!filePath) {
    outputAllow();
    return;
  }

  // Normalize path separators for pattern matching
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Detect asset type
  let assetType = null;
  let assetDir = null;
  for (const { pattern, type, dir } of ASSET_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      assetType = type;
      assetDir = dir;
      break;
    }
  }

  if (!assetType) {
    outputAllow(); // Not an asset file
    return;
  }

  // Skip if editing existing file (not creating new)
  if (await fileExists(filePath)) {
    outputAllow();
    return;
  }

  const warnings = [];
  const proposedName = path.basename(filePath).replace(/\.(ts|js|json|md|mjs)$/, '');

  // Load existing assets
  const [registry, existingFiles] = await Promise.all([
    loadRegistry(),
    assetDir ? scanDir(assetDir) : []
  ]);

  const registryNames = registry.entries
    .filter(e => e.type === assetType)
    .map(e => e.name);

  const allNames = [...new Set([...existingFiles, ...registryNames])];

  // Check name duplicates
  const nameMatches = findDuplicates(proposedName, allNames);
  if (nameMatches.length > 0) {
    const top = nameMatches[0];
    if (top.similarity >= 0.85) {
      warnings.push(`${top.reason}: "${proposedName}" ≈ "${top.name}" (${Math.round(top.similarity * 100)}% similar)`);
    } else if (top.similarity >= 0.75) {
      warnings.push(`SIMILAR: "${proposedName}" ≈ "${top.name}" (${Math.round(top.similarity * 100)}% — consider extending existing)`);
    }
  }

  // Check content duplicates
  if (content) {
    const contentWarnings = checkContentDuplication(content);
    warnings.push(...contentWarnings);
  }

  // BLOCK if high-confidence duplicate detected
  if (warnings.length > 0) {
    const hasHighConfidence = warnings.some(w =>
      w.includes('EXACT DUPLICATE') ||
      w.includes('NAME OVERLAP') ||
      w.includes('Re-implementing')
    );

    if (hasHighConfidence || warnings.length >= 2) {
      outputBlock(
        `🚫 DUPLICATION GUARD BLOCKED: Creating "${proposedName}" (${assetType})\n\n` +
        `WARNINGS:\n${warnings.map(w => `  • ${w}`).join('\n')}\n\n` +
        `REQUIRED ACTIONS:\n` +
        `1. Run /dedup to verify no duplicates exist\n` +
        `2. Use existing asset or extend it instead\n` +
        `3. If truly unique, use /forge-triple for proper creation\n\n` +
        `This hook BLOCKS to prevent duplicate work. ` +
        `DuplicationGuardEngine.mustCheckBeforeCreating() is MANDATORY.`
      );
      return;
    }
  }

  // Allow if no duplicates found
  outputAllow();
}

main().catch(err => {
  // On error, allow the operation but log
  console.error('DuplicationGuard error:', err.message);
  process.exit(0);
});
