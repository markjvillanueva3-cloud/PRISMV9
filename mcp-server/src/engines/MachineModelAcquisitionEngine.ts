/**
 * MachineModelAcquisitionEngine — Automated CNC Machine STEP File Acquisition
 *
 * Searches multiple 3D model sources for CNC machine STEP files:
 * 1. Haas CNC official product pages (haascnc.com)
 * 2. GrabCAD community library (grabcad.com)
 * 3. 3Dfindit (3dfindit.com)
 * 4. TraceParts (traceparts.com)
 *
 * Generates search URLs and download instructions per machine.
 * For automated download, use with Playwright MCP plugin (browser_navigate).
 *
 * Usage:
 *   const plan = acquisitionEngine.generateAcquisitionPlan(machines);
 *   // Then execute via Playwright or manual download
 *
 * @module MachineModelAcquisitionEngine
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface MachineModelTarget {
  machine_id: string;
  name: string;
  manufacturer: string;
  model: string;
  machine_type: string;
}

export interface ModelSource {
  source: string;
  search_url: string;
  direct_url?: string;
  format: string;
  confidence: "high" | "medium" | "low";
  notes: string;
}

export interface AcquisitionPlan {
  machine_id: string;
  machine_name: string;
  manufacturer: string;
  sources: ModelSource[];
  priority: "high" | "medium" | "low";
  estimated_availability: number; // 0-1 probability of finding a model
}

export interface AcquisitionResult {
  total_machines: number;
  with_existing_models: number;
  plans_generated: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  plans: AcquisitionPlan[];
  download_script?: string;
}

const MODEL_DIR = path.join(os.homedir(), ".prism", "machine-models");

export class MachineModelAcquisitionEngine {
  readonly name = "MachineModelAcquisitionEngine";

  /**
   * Generate acquisition plan for machines missing 3D models.
   */
  generateAcquisitionPlan(machines: MachineModelTarget[]): AcquisitionResult {
    const plans: AcquisitionPlan[] = [];

    for (const m of machines) {
      const sources = this.findSources(m);
      const maxConf = sources.reduce((best, s) =>
        s.confidence === "high" ? "high" : s.confidence === "medium" && best !== "high" ? "medium" : best,
        "low" as "high" | "medium" | "low"
      );

      plans.push({
        machine_id: m.machine_id,
        machine_name: m.name,
        manufacturer: m.manufacturer,
        sources,
        priority: this.getPriority(m.manufacturer),
        estimated_availability: maxConf === "high" ? 0.8 : maxConf === "medium" ? 0.5 : 0.2,
      });
    }

    // Sort by priority then availability
    plans.sort((a, b) => {
      const pOrd = { high: 0, medium: 1, low: 2 };
      if (pOrd[a.priority] !== pOrd[b.priority]) return pOrd[a.priority] - pOrd[b.priority];
      return b.estimated_availability - a.estimated_availability;
    });

    return {
      total_machines: machines.length,
      with_existing_models: 0,
      plans_generated: plans.length,
      high_confidence: plans.filter(p => p.estimated_availability >= 0.7).length,
      medium_confidence: plans.filter(p => p.estimated_availability >= 0.4 && p.estimated_availability < 0.7).length,
      low_confidence: plans.filter(p => p.estimated_availability < 0.4).length,
      plans,
      download_script: this.generateDownloadScript(plans),
    };
  }

  /**
   * Find all possible sources for a machine's 3D model.
   */
  private findSources(machine: MachineModelTarget): ModelSource[] {
    const sources: ModelSource[] = [];
    const mfr = machine.manufacturer.toLowerCase();
    const model = machine.model.replace(/\s+/g, "-").toLowerCase();
    const searchTerms = encodeURIComponent(`${machine.manufacturer} ${machine.model}`);

    // 1. Manufacturer direct (highest confidence)
    if (mfr.includes("haas")) {
      const haasModel = machine.model.replace(/\s+/g, "-").toUpperCase();
      sources.push({
        source: "haascnc.com",
        search_url: `https://www.haascnc.com/machines/vertical-mills/${haasModel}.html`,
        format: "STEP",
        confidence: "high",
        notes: "Haas publishes STEP files on product pages — look for '3D Model' download link",
      });
    }

    if (mfr.includes("okuma")) {
      sources.push({
        source: "myokuma.com",
        search_url: `https://www.myokuma.com/machines`,
        format: "STEP",
        confidence: "high",
        notes: "Okuma MyOkuma portal — 3D models available via STEP-NC Machine app",
      });
    }

    if (mfr.includes("dmg") || mfr.includes("mori seiki")) {
      sources.push({
        source: "dmgmori.com",
        search_url: `https://www.dmgmori.com/products/machines?q=${searchTerms}`,
        format: "STEP",
        confidence: "medium",
        notes: "DMG MORI product pages sometimes include CAD downloads — check 'Downloads' tab",
      });
    }

    if (mfr.includes("mazak")) {
      sources.push({
        source: "mazakusa.com",
        search_url: `https://www.mazakusa.com/machines/?search=${searchTerms}`,
        format: "STEP",
        confidence: "medium",
        notes: "Mazak product pages — check for 3D model downloads section",
      });
    }

    if (mfr.includes("brother")) {
      sources.push({
        source: "brother.com",
        search_url: `https://www.brother.co.jp/en/product/mctool/catalog/index.aspx`,
        format: "STEP",
        confidence: "medium",
        notes: "Brother machine tool catalog — 3D data available for Speedio series",
      });
    }

    // 2. GrabCAD (community — medium-high confidence)
    sources.push({
      source: "grabcad.com",
      search_url: `https://grabcad.com/library?page=1&per_page=20&softwares=step-slash-iges&query=${searchTerms}`,
      format: "STEP/IGES",
      confidence: this.grabcadConfidence(mfr),
      notes: "Community-contributed models — verify accuracy before using for simulation",
    });

    // 3. 3Dfindit
    sources.push({
      source: "3dfindit.com",
      search_url: `https://www.3dfindit.com/en/search?q=${searchTerms}&output=step`,
      format: "STEP",
      confidence: "low",
      notes: "Multi-catalog search engine — may have manufacturer-contributed models",
    });

    // 4. TraceParts
    sources.push({
      source: "traceparts.com",
      search_url: `https://www.traceparts.com/en/search/traceparts?s=${searchTerms}`,
      format: "STEP",
      confidence: "low",
      notes: "Industrial parts catalog — some machine tool manufacturers publish here",
    });

    // 5. PostProcessor.su (known CNC machine models)
    sources.push({
      source: "postprocessor.su",
      search_url: "https://postprocessor.su/machine_models_eng.html",
      format: "STEP",
      confidence: mfr.includes("haas") || mfr.includes("dmg") ? "medium" : "low",
      notes: "Russian CNC resource — has verified machine models for CAM simulation",
    });

    return sources;
  }

  /**
   * GrabCAD confidence by manufacturer (based on known library contents).
   */
  private grabcadConfidence(mfr: string): "high" | "medium" | "low" {
    const high = ["haas", "okuma", "mazak", "dmg", "fanuc"];
    const medium = ["doosan", "dn solutions", "hurco", "brother", "makino", "hermle"];
    if (high.some(h => mfr.includes(h))) return "high";
    if (medium.some(m => mfr.includes(m))) return "medium";
    return "low";
  }

  /**
   * Priority based on manufacturer popularity (most common in shops).
   */
  private getPriority(manufacturer: string): "high" | "medium" | "low" {
    const mfr = manufacturer.toLowerCase();
    const high = ["haas", "dmg", "mazak", "okuma", "makino"];
    const medium = ["doosan", "dn solutions", "hurco", "brother", "hermle", "matsuura", "fanuc"];
    if (high.some(h => mfr.includes(h))) return "high";
    if (medium.some(m => mfr.includes(m))) return "medium";
    return "low";
  }

  /**
   * Generate a Playwright-compatible download script.
   * This can be executed via the Playwright MCP plugin to automate downloads.
   */
  private generateDownloadScript(plans: AcquisitionPlan[]): string {
    const lines: string[] = [
      "# PRISM Machine Model Acquisition Script",
      "# Execute with Playwright MCP plugin or manually visit URLs",
      `# Generated: ${new Date().toISOString()}`,
      `# Machines to find: ${plans.length}`,
      "",
      `# Save downloaded STEP files to: ${MODEL_DIR}`,
      "",
    ];

    // Group by manufacturer for efficient browsing
    const byMfr = new Map<string, AcquisitionPlan[]>();
    for (const p of plans) {
      const key = p.manufacturer;
      if (!byMfr.has(key)) byMfr.set(key, []);
      byMfr.get(key)!.push(p);
    }

    for (const [mfr, mPlans] of byMfr) {
      lines.push(`## ${mfr} (${mPlans.length} machines)`);
      for (const p of mPlans.slice(0, 20)) { // limit per manufacturer
        const bestSource = p.sources.sort((a, b) => {
          const conf = { high: 0, medium: 1, low: 2 };
          return conf[a.confidence] - conf[b.confidence];
        })[0];
        lines.push(`# ${p.machine_name}`);
        lines.push(`# Source: ${bestSource.source} (${bestSource.confidence})`);
        lines.push(`# URL: ${bestSource.search_url}`);
        lines.push(`# Save as: ${MODEL_DIR}/${p.machine_id}.step`);
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Check which machines already have models in our catalog.
   */
  hasModel(machineId: string): boolean {
    const modelPath = path.join(MODEL_DIR, `${machineId}.step`);
    return fs.existsSync(modelPath);
  }

  /**
   * Ensure model directory exists.
   */
  ensureModelDir(): void {
    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
    }
  }
}

export const machineModelAcquisitionEngine = new MachineModelAcquisitionEngine();
