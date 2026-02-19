/**
 * PRISM MCP Server - Data Loader Service
 * Centralized data loading from PRISM databases
 */

import * as path from "path";
import { PATHS } from "../constants.js";
import { readJsonFile, listFiles, fileExists } from "../utils/files.js";
import { NotFoundError } from "../utils/errors.js";
import { log } from "../utils/Logger.js";
import type { Material, Machine, Tool, Alarm, Fixture, Formula, Agent, Script, Hook, Workflow } from "../types.js";

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface DataCache<T> {
  data: Map<string, T>;
  lastLoaded: Date | null;
  ttlMs: number;
}

const caches = {
  materials: { data: new Map<string, Material>(), lastLoaded: null, ttlMs: 300000 } as DataCache<Material>,
  machines: { data: new Map<string, Machine>(), lastLoaded: null, ttlMs: 300000 } as DataCache<Machine>,
  tools: { data: new Map<string, Tool>(), lastLoaded: null, ttlMs: 300000 } as DataCache<Tool>,
  alarms: { data: new Map<string, Alarm>(), lastLoaded: null, ttlMs: 300000 } as DataCache<Alarm>,
  fixtures: { data: new Map<string, Fixture>(), lastLoaded: null, ttlMs: 300000 } as DataCache<Fixture>,
  formulas: { data: new Map<string, Formula>(), lastLoaded: null, ttlMs: 600000 } as DataCache<Formula>,
  agents: { data: new Map<string, Agent>(), lastLoaded: null, ttlMs: 600000 } as DataCache<Agent>,
  scripts: { data: new Map<string, Script>(), lastLoaded: null, ttlMs: 600000 } as DataCache<Script>,
  hooks: { data: new Map<string, Hook>(), lastLoaded: null, ttlMs: 600000 } as DataCache<Hook>,
  workflows: { data: new Map<string, Workflow>(), lastLoaded: null, ttlMs: 600000 } as DataCache<Workflow>
};

function isCacheValid<T>(cache: DataCache<T>): boolean {
  if (!cache.lastLoaded) return false;
  return Date.now() - cache.lastLoaded.getTime() < cache.ttlMs;
}

export function clearCache(cacheName?: keyof typeof caches): void {
  if (cacheName) {
    caches[cacheName].data.clear();
    caches[cacheName].lastLoaded = null;
  } else {
    Object.values(caches).forEach(cache => {
      cache.data.clear();
      cache.lastLoaded = null;
    });
  }
  log.debug(`Cache cleared: ${cacheName || "all"}`);
}

// ============================================================================
// MATERIAL LOADING
// ============================================================================

export async function loadMaterials(): Promise<Map<string, Material>> {
  if (isCacheValid(caches.materials)) {
    return caches.materials.data;
  }
  
  log.info("Loading materials database...");
  const materialsPath = PATHS.MATERIALS;
  
  if (!await fileExists(materialsPath)) {
    log.warn(`Materials path not found: ${materialsPath}`);
    return caches.materials.data;
  }
  
  const files = await listFiles(materialsPath, { extension: ".json", recursive: true });
  
  for (const file of files) {
    try {
      const content = await readJsonFile<any>(file);
      // Handle both formats: {materials: [...]} wrapper and direct array/object
      let materials: Material[];
      if (content.materials && Array.isArray(content.materials)) {
        materials = content.materials;
      } else if (Array.isArray(content)) {
        materials = content;
      } else {
        materials = [content];
      }
      
      for (const material of materials) {
        const id = material.id || material.material_id;
        if (id) {
          material.id = id;  // Normalize to .id
          caches.materials.data.set(id, material);
          // Also index by common name for lookup
          if (material.name) {
            caches.materials.data.set(material.name.toLowerCase(), material);
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to load material file: ${file}`, { error });
    }
  }
  
  caches.materials.lastLoaded = new Date();
  log.info(`Loaded ${caches.materials.data.size} materials`);
  return caches.materials.data;
}

export async function getMaterial(identifier: string): Promise<Material> {
  const materials = await loadMaterials();
  
  // Try direct ID match
  let material = materials.get(identifier);
  if (material) return material;
  
  // Try lowercase name match
  material = materials.get(identifier.toLowerCase());
  if (material) return material;
  
  // Try partial match
  for (const [key, mat] of materials) {
    if (key.includes(identifier.toLowerCase()) || mat.name?.toLowerCase().includes(identifier.toLowerCase())) {
      return mat;
    }
  }
  
  throw new NotFoundError("Material", identifier);
}

export async function searchMaterials(criteria: {
  query?: string;
  iso_group?: string;
  category?: string;
  hardness_min?: number;
  hardness_max?: number;
  machinability_min?: number;
}): Promise<Material[]> {
  const materials = await loadMaterials();
  const results: Material[] = [];
  
  for (const material of materials.values()) {
    // Skip duplicate entries (name-indexed) — accept 1-3 letter prefixes for gen_v5 IDs
    if (!material.id?.match(/^[A-Z]{1,3}-/)) continue;
    
    // Apply filters
    if (criteria.iso_group && material.iso_group !== criteria.iso_group) continue;
    if (criteria.category && material.category !== criteria.category) continue;
    
    if (criteria.hardness_min !== undefined) {
      const hb = material.mechanical?.hardness?.brinell;
      if (!hb || hb < criteria.hardness_min) continue;
    }
    
    if (criteria.hardness_max !== undefined) {
      const hb = material.mechanical?.hardness?.brinell;
      if (!hb || hb > criteria.hardness_max) continue;
    }
    
    if (criteria.machinability_min !== undefined) {
      if (!material.machining?.machinability_rating || 
          material.machining.machinability_rating < criteria.machinability_min) continue;
    }
    
    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      const searchable = [
        material.id,
        material.name,
        material.designation?.aisi_sae,
        material.designation?.uns,
        ...(material.applications || [])
      ].filter(Boolean).join(" ").toLowerCase();
      
      if (!searchable.includes(q)) continue;
    }
    
    results.push(material);
  }
  
  return results;
}

// ============================================================================
// MACHINE LOADING
// ============================================================================

export async function loadMachines(): Promise<Map<string, Machine>> {
  if (isCacheValid(caches.machines)) {
    return caches.machines.data;
  }
  
  log.info("Loading machines database...");
  const machinesPath = PATHS.MACHINES;
  
  if (!await fileExists(machinesPath)) {
    log.warn(`Machines path not found: ${machinesPath}`);
    return caches.machines.data;
  }
  
  const files = await listFiles(machinesPath, { extension: ".json", recursive: true });
  
  for (const file of files) {
    try {
      const content = await readJsonFile<Machine | Machine[] | { machines: Machine[] }>(file);
      const machines = Array.isArray(content) 
        ? content 
        : "machines" in content 
          ? content.machines 
          : [content];
      
      for (const machine of machines) {
        if (machine.id) {
          caches.machines.data.set(machine.id, machine);
        }
      }
    } catch (error) {
      log.warn(`Failed to load machine file: ${file}`, { error });
    }
  }
  
  caches.machines.lastLoaded = new Date();
  log.info(`Loaded ${caches.machines.data.size} machines`);
  return caches.machines.data;
}

export async function getMachine(identifier: string): Promise<Machine> {
  const machines = await loadMachines();
  
  let machine = machines.get(identifier);
  if (machine) return machine;
  
  // Try partial match on model
  for (const [, mach] of machines) {
    if (mach.model?.toLowerCase().includes(identifier.toLowerCase()) ||
        `${mach.manufacturer} ${mach.model}`.toLowerCase().includes(identifier.toLowerCase())) {
      return mach;
    }
  }
  
  throw new NotFoundError("Machine", identifier);
}

export async function searchMachines(criteria: {
  manufacturer?: string;
  type?: string;
  controller?: string;
  min_x_travel?: number;
  min_spindle_rpm?: number;
  min_spindle_power?: number;
}): Promise<Machine[]> {
  const machines = await loadMachines();
  const results: Machine[] = [];
  
  for (const machine of machines.values()) {
    if (criteria.manufacturer && 
        !machine.manufacturer.toLowerCase().includes(criteria.manufacturer.toLowerCase())) continue;
    if (criteria.type && machine.type !== criteria.type) continue;
    if (criteria.controller && machine.controller.manufacturer !== criteria.controller) continue;
    if (criteria.min_x_travel && machine.envelope.x < criteria.min_x_travel) continue;
    if (criteria.min_spindle_rpm && machine.spindle.max_rpm < criteria.min_spindle_rpm) continue;
    if (criteria.min_spindle_power && machine.spindle.power < criteria.min_spindle_power) continue;
    
    results.push(machine);
  }
  
  return results;
}

// ============================================================================
// ALARM LOADING
// ============================================================================

export async function loadAlarms(): Promise<Map<string, Alarm>> {
  if (isCacheValid(caches.alarms)) {
    return caches.alarms.data;
  }
  
  log.info("Loading alarms database...");
  const alarmsPath = path.join(PATHS.CONTROLLERS, "alarms");
  
  if (!await fileExists(alarmsPath)) {
    log.warn(`Alarms path not found: ${alarmsPath}`);
    return caches.alarms.data;
  }
  
  const files = await listFiles(alarmsPath, { extension: ".json" });
  
  for (const file of files) {
    try {
      const content = await readJsonFile<Alarm[] | { alarms: Alarm[] }>(file);
      const alarms = Array.isArray(content) ? content : content.alarms || [];
      
      for (const alarm of alarms) {
        if (alarm.alarm_id || alarm.code) {
          const id = alarm.alarm_id || `${alarm.controller_family}-${alarm.code}`;
          caches.alarms.data.set(id, { ...alarm, alarm_id: id });
          // Also index by raw code for lookup
          caches.alarms.data.set(`${alarm.controller_family}-${alarm.code}`, alarm);
        }
      }
    } catch (error) {
      log.warn(`Failed to load alarm file: ${file}`, { error });
    }
  }
  
  caches.alarms.lastLoaded = new Date();
  log.info(`Loaded ${caches.alarms.data.size} alarms`);
  return caches.alarms.data;
}

export async function decodeAlarm(code: string, controller?: string): Promise<Alarm> {
  const alarms = await loadAlarms();
  
  // If controller specified, look for exact match
  if (controller) {
    const key = `${controller}-${code}`;
    const alarm = alarms.get(key);
    if (alarm) return alarm;
  }
  
  // Try to find by code across all controllers
  for (const alarm of alarms.values()) {
    if (alarm.code === code || alarm.code === code.replace(/^0+/, "")) {
      return alarm;
    }
  }
  
  throw new NotFoundError("Alarm", code);
}

// ============================================================================
// FORMULA LOADING
// ============================================================================

export async function loadFormulas(): Promise<Map<string, Formula>> {
  if (isCacheValid(caches.formulas)) {
    return caches.formulas.data;
  }
  
  log.info("Loading formulas database...");
  
  // Try multiple potential locations
  const potentialPaths = [
    path.join(PATHS.COORDINATION, "FORMULA_REGISTRY.json"),
    path.join(PATHS.PRISM_ROOT, "data", "formulas.json")
  ];
  
  for (const formulaPath of potentialPaths) {
    if (await fileExists(formulaPath)) {
      try {
        const content = await readJsonFile<{ formulas: Formula[] } | Formula[]>(formulaPath);
        const formulas = Array.isArray(content) ? content : content.formulas || [];
        
        for (const formula of formulas) {
          if (formula.id) {
            caches.formulas.data.set(formula.id, formula);
          }
        }
      } catch (error) {
        log.warn(`Failed to load formulas from: ${formulaPath}`, { error });
      }
    }
  }
  
  caches.formulas.lastLoaded = new Date();
  log.info(`Loaded ${caches.formulas.data.size} formulas`);
  return caches.formulas.data;
}

export async function getFormula(formulaId: string): Promise<Formula> {
  const formulas = await loadFormulas();
  const formula = formulas.get(formulaId);
  if (formula) return formula;
  throw new NotFoundError("Formula", formulaId);
}

// ============================================================================
// AGENT LOADING
// ============================================================================

export async function loadAgents(): Promise<Map<string, Agent>> {
  if (isCacheValid(caches.agents)) {
    return caches.agents.data;
  }
  
  log.info("Loading agents registry...");
  
  // Method 1: Load from AGENT_REGISTRY.json (legacy support)
  const agentRegistryPath = PATHS.AGENT_REGISTRY;
  if (await fileExists(agentRegistryPath)) {
    try {
      const content = await readJsonFile<{ agents: Agent[] } | { agentRegistry: { totalAgentInventory: Record<string, string[]> } } | Agent[]>(agentRegistryPath);
      
      if (Array.isArray(content)) {
        for (const agent of content) {
          if (agent.id) {
            caches.agents.data.set(agent.id, agent);
          }
        }
      } else if ('agents' in content) {
        for (const agent of content.agents) {
          if (agent.id) {
            caches.agents.data.set(agent.id, agent);
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to load agents from registry: ${error}`);
    }
  }
  
  // Method 2: Load from individual agent JSON files (primary method)
  const agentsDir = PATHS.AGENTS;
  if (await fileExists(agentsDir)) {
    try {
      const files = await listFiles(agentsDir, { extension: ".json", recursive: false });
      
      for (const file of files) {
        // Only load AGT-*.json files (skip schema files)
        const filename = path.basename(file);
        if (!filename.startsWith("AGT-")) continue;
        
        try {
          const agent = await readJsonFile<Agent>(file);
          if (agent.agent_id) {
            // Use agent_id as the key (standard field)
            caches.agents.data.set(agent.agent_id, { ...agent, id: agent.agent_id });
          } else if (agent.id) {
            caches.agents.data.set(agent.id, agent);
          }
        } catch (err) {
          log.warn(`Failed to load agent file ${filename}: ${err}`);
        }
      }
    } catch (error) {
      log.warn(`Failed to list agent files: ${error}`);
    }
  }
  
  caches.agents.lastLoaded = new Date();
  log.info(`Loaded ${caches.agents.data.size} agents`);
  return caches.agents.data;
}

export async function getAgent(agentId: string): Promise<Agent> {
  const agents = await loadAgents();
  const agent = agents.get(agentId);
  if (agent) return agent;
  throw new NotFoundError("Agent", agentId);
}

// ============================================================================
// STATE LOADING
// ============================================================================

export async function loadState(): Promise<Record<string, unknown>> {
  const statePath = PATHS.STATE_FILE;
  
  if (await fileExists(statePath)) {
    return await readJsonFile<Record<string, unknown>>(statePath);
  }
  
  return {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    currentSession: { status: "NEW" }
  };
}
