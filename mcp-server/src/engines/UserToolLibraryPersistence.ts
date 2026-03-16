/**
 * UserToolLibraryPersistence — File-based persistence for user tool libraries
 * Saves to ~/.prism/tools.json on every mutation, loads on startup.
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PRISM_DIR = path.join(os.homedir(), ".prism");
const TOOLS_FILE = path.join(PRISM_DIR, "tools.json");
const MACHINES_FILE = path.join(PRISM_DIR, "machines.json");

function ensureDir(): void {
  if (!fs.existsSync(PRISM_DIR)) fs.mkdirSync(PRISM_DIR, { recursive: true });
}

// Tool Library
export interface PersistedTool {
  id: string;
  type: string;
  diameter_mm: number;
  flutes?: number;
  material: string;
  coating?: string;
  condition: string;
  magazine_position?: number;
  max_depth_mm?: number;
  corner_radius_mm?: number;
  holder_type?: string;
  notes?: string;
  added_at: string;
  last_used?: string;
}

export interface PersistedMachine {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  controller: string;
  max_rpm: number;
  max_power_kw: number;
  taper: string;
  magazine_slots: number;
  axes: number;
  work_volume?: { x: number; y: number; z: number };
  notes?: string;
  added_at: string;
}

class PersistenceService {
  // ── Tool Library ──

  loadTools(): PersistedTool[] {
    try {
      ensureDir();
      if (fs.existsSync(TOOLS_FILE)) {
        return JSON.parse(fs.readFileSync(TOOLS_FILE, "utf-8"));
      }
    } catch { /* fresh start */ }
    return [];
  }

  saveTools(tools: PersistedTool[]): void {
    ensureDir();
    fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2));
  }

  addTool(tool: Omit<PersistedTool, "id" | "added_at">): PersistedTool {
    const tools = this.loadTools();
    const newTool: PersistedTool = {
      ...tool,
      id: `T${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      added_at: new Date().toISOString(),
    };
    tools.push(newTool);
    this.saveTools(tools);
    return newTool;
  }

  removeTool(id: string): boolean {
    const tools = this.loadTools();
    const filtered = tools.filter(t => t.id !== id);
    if (filtered.length === tools.length) return false;
    this.saveTools(filtered);
    return true;
  }

  updateTool(id: string, updates: Partial<PersistedTool>): PersistedTool | null {
    const tools = this.loadTools();
    const idx = tools.findIndex(t => t.id === id);
    if (idx === -1) return null;
    tools[idx] = { ...tools[idx], ...updates, id: tools[idx].id };
    this.saveTools(tools);
    return tools[idx];
  }

  // ── Machine Registry ──

  loadMachines(): PersistedMachine[] {
    try {
      ensureDir();
      if (fs.existsSync(MACHINES_FILE)) {
        return JSON.parse(fs.readFileSync(MACHINES_FILE, "utf-8"));
      }
    } catch { /* fresh start */ }
    return [];
  }

  saveMachines(machines: PersistedMachine[]): void {
    ensureDir();
    fs.writeFileSync(MACHINES_FILE, JSON.stringify(machines, null, 2));
  }

  addMachine(machine: Omit<PersistedMachine, "id" | "added_at">): PersistedMachine {
    const machines = this.loadMachines();
    const newMachine: PersistedMachine = {
      ...machine,
      id: `M${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      added_at: new Date().toISOString(),
    };
    machines.push(newMachine);
    this.saveMachines(machines);
    return newMachine;
  }

  removeMachine(id: string): boolean {
    const machines = this.loadMachines();
    const filtered = machines.filter(m => m.id !== id);
    if (filtered.length === machines.length) return false;
    this.saveMachines(filtered);
    return true;
  }

  updateMachine(id: string, updates: Partial<PersistedMachine>): PersistedMachine | null {
    const machines = this.loadMachines();
    const idx = machines.findIndex(m => m.id === id);
    if (idx === -1) return null;
    machines[idx] = { ...machines[idx], ...updates, id: machines[idx].id };
    this.saveMachines(machines);
    return machines[idx];
  }
}

export const persistenceService = new PersistenceService();
