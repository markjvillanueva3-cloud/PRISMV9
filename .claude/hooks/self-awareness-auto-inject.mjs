#!/usr/bin/env node
/**
 * Self-Awareness Auto-Inject — UserPromptSubmit Hook
 *
 * Detects triggers in user prompts and automatically injects relevant
 * self-awareness context. Makes PRISM proactively helpful.
 *
 * Triggers:
 * - Customer names → JM Die customer paths
 * - "what can" / "capabilities" / "features" → AI feature recommendations
 * - Machine types → relevant machine data
 * - "existing" / "already" / "duplicate" → duplication guard reminder
 * - Material mentions → tribal knowledge
 * - Problem descriptions → feature recommendations
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const MCP_SERVER = 'H:/prism/mcp-server';
const JM_DIE_ROOT = 'H:/PRISM/JM DIE';

// Known JM Die customers (top 30)
const KNOWN_CUSTOMERS = [
  'ALCOA', 'ITW', 'OPTIMAS', 'SFS', 'HOLO-KROME', 'FASTENAL', 'NUCOR',
  'KAMAX', 'INFASCO', 'SEMBLEX', 'FONTANA', 'CAMCAR', 'ELGIN', 'BRYCE',
  'ROCKFORD', 'SNAP-ON', 'CATERPILLAR', 'JOHN DEERE', 'CASE', 'CNH',
  'AGCO', 'ILLINOIS TOOL', 'TEXTRON', 'ESCO', 'ATF', 'NYLOK', 'RING SCREW',
  'LAKESIDE', 'MACCLEAN', 'MEDALIST'
];

// Machine type triggers
const MACHINE_TRIGGERS = {
  lathe: ['lathe', 'turning', 'okuma', 'chuck', 'spindle', 'facing', 'boring'],
  mill: ['mill', 'milling', 'haas', 'hurco', 'roku', 'pocket', 'contour', 'slot'],
  wedm: ['wire edm', 'wedm', 'wire cut', 'mitsubishi', 'edm wire', 'spark'],
  sinker: ['sinker', 'sinker edm', 'ram edm', 'plunge edm', 'electrode'],
  grinder: ['grind', 'grinding', 'surface grind', 'od grind', 'id grind']
};

// Capability triggers
const CAPABILITY_TRIGGERS = [
  'what can you', 'what can prism', 'capabilities', 'features',
  'what do you know', 'help me with', 'can you do', 'able to'
];

// Duplication triggers
const DEDUP_TRIGGERS = [
  'create', 'build', 'new engine', 'make a', 'write a', 'implement',
  'existing', 'already have', 'duplicate', 'similar to'
];

// Material triggers for tribal knowledge
const MATERIAL_TRIGGERS = [
  'tool steel', 'm2', 'd2', 's7', 'a2', 'h13', 'carbide', 'tungsten',
  'inconel', 'titanium', 'stainless', '4140', '1018', 'aluminum', 'brass'
];

async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch { return null; }
}

async function findCustomerPath(customer) {
  const upperCustomer = customer.toUpperCase();
  const machineTypes = ['CNC LATHE', 'CNC MILL HAAS', 'WIRE EDM', 'OKUMA', 'HURCO'];

  for (const machineType of machineTypes) {
    const checkPath = path.join(JM_DIE_ROOT, machineType, upperCustomer);
    try {
      await fs.access(checkPath);
      return { customer: upperCustomer, path: checkPath, machineType };
    } catch { continue; }
  }
  return null;
}

async function getRelevantTribalTips(keywords) {
  try {
    const tipsPath = `${MCP_SERVER}/data/tribal-tips/tips-index.json`;
    const tips = await readJSON(tipsPath);
    if (!tips?.tips) return [];

    const matches = tips.tips.filter(tip => {
      const text = `${tip.title} ${tip.content}`.toLowerCase();
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    }).slice(0, 3);

    return matches;
  } catch { return []; }
}

async function getRelevantEngines(keywords) {
  try {
    const registryPath = `${MCP_SERVER}/data/state/cross-session-asset-registry.json`;
    const registry = await readJSON(registryPath);
    if (!registry?.assets) return [];

    const engines = registry.assets.filter(a =>
      a.type === 'engine' &&
      keywords.some(kw =>
        a.name.toLowerCase().includes(kw.toLowerCase()) ||
        (a.keywords || []).some(k => k.toLowerCase().includes(kw.toLowerCase()))
      )
    ).slice(0, 5);

    return engines;
  } catch { return []; }
}

function detectTriggers(prompt) {
  const lower = prompt.toLowerCase();
  const triggers = {
    customers: [],
    machines: [],
    capabilities: false,
    dedup: false,
    materials: []
  };

  // Check for customer names
  for (const customer of KNOWN_CUSTOMERS) {
    if (lower.includes(customer.toLowerCase())) {
      triggers.customers.push(customer);
    }
  }

  // Check for machine types
  for (const [type, keywords] of Object.entries(MACHINE_TRIGGERS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      triggers.machines.push(type);
    }
  }

  // Check for capability questions
  if (CAPABILITY_TRIGGERS.some(t => lower.includes(t))) {
    triggers.capabilities = true;
  }

  // Check for dedup triggers
  if (DEDUP_TRIGGERS.some(t => lower.includes(t))) {
    triggers.dedup = true;
  }

  // Check for material mentions
  for (const mat of MATERIAL_TRIGGERS) {
    if (lower.includes(mat.toLowerCase())) {
      triggers.materials.push(mat);
    }
  }

  return triggers;
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload.prompt || payload.message || '';
  if (!prompt || prompt.length < 5) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const triggers = detectTriggers(prompt);
  const contextParts = [];

  // Customer path injection
  if (triggers.customers.length > 0) {
    for (const customer of triggers.customers.slice(0, 2)) {
      const result = await findCustomerPath(customer);
      if (result) {
        contextParts.push(`📁 JM Die path for ${result.customer}: ${result.path} (${result.machineType})`);
      }
    }
  }

  // Machine type context
  if (triggers.machines.length > 0) {
    const engines = await getRelevantEngines(triggers.machines);
    if (engines.length > 0) {
      contextParts.push(`🔧 Relevant engines: ${engines.map(e => e.name).join(', ')}`);
    }
  }

  // Capability reminder
  if (triggers.capabilities) {
    contextParts.push(`💡 PRISM capabilities: Use prismSelfAwarenessEngine.searchAIFeatures() or prism_knowledge:search_features MCP call`);
  }

  // Dedup reminder
  if (triggers.dedup) {
    contextParts.push(`⚠️ DEDUP REMINDER: Run duplicationGuardEngine.checkBeforeCreating() BEFORE creating new assets!`);
  }

  // Tribal knowledge for materials
  if (triggers.materials.length > 0) {
    const tips = await getRelevantTribalTips(triggers.materials);
    if (tips.length > 0) {
      contextParts.push(`📚 Tribal tips for ${triggers.materials.join(', ')}: ${tips.map(t => t.title).join('; ')}`);
    }
  }

  if (contextParts.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const context = `## Self-Awareness Auto-Inject\n${contextParts.join('\n')}`;

  console.log(JSON.stringify({
    continue: true,
    additionalContext: context
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
