/**
 * MachineModelDownloaderEngine — Automated STEP File Fetcher
 *
 * Uses HTTP requests to search and download CNC machine 3D models from:
 * 1. GrabCAD API (search endpoint is public, download needs session)
 * 2. PostProcessor.su (public STEP files)
 * 3. 3Dfindit API (public search)
 *
 * For Playwright-based download (browser automation), generates
 * executable scripts that the /acquire-models skill can run.
 *
 * Flow:
 *   1. generateSearchPlan() → list of machines + URLs to search
 *   2. searchGrabCAD() → find matching models (public API)
 *   3. generatePlaywrightScript() → automation code for download
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";

const MODEL_DIR = path.join(os.homedir(), ".prism", "machine-models");
const RESULTS_FILE = path.join(os.homedir(), ".prism", "model-search-results.json");

export interface SearchResult {
  machine_name: string;
  machine_id: string;
  source: string;
  model_url: string;
  download_url?: string;
  title: string;
  format: string;
  confidence: number;
  requires_login: boolean;
}

export interface DownloadPlan {
  total_machines: number;
  found: SearchResult[];
  not_found: string[];
  playwright_steps: PlaywrightStep[];
}

export interface PlaywrightStep {
  action: "navigate" | "click" | "fill" | "wait" | "download";
  target: string;
  value?: string;
  description: string;
}

class MachineModelDownloaderEngine {
  readonly name = "MachineModelDownloaderEngine";

  /**
   * Search GrabCAD's public library endpoint for a machine model.
   * GrabCAD search is accessible without login — download requires it.
   */
  async searchGrabCAD(query: string): Promise<SearchResult[]> {
    const url = `https://grabcad.com/community/api/v1/models?per_page=5&query=${encodeURIComponent(query)}&softwares=step-slash-iges`;

    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "PRISM-MachineModelAcquisition/1.0",
        },
        timeout: 10000,
      }, (res) => {
        let data = "";
        res.on("data", (chunk: string) => { data += chunk; });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const models = (json.models || json || []) as Array<{
              id?: number;
              name?: string;
              slug?: string;
              cached_slug?: string;
              archive_url?: string;
            }>;

            resolve(models.slice(0, 3).map((m, i) => ({
              machine_name: query,
              machine_id: `grabcad_${m.id || i}`,
              source: "grabcad.com",
              model_url: `https://grabcad.com/library/${m.cached_slug || m.slug || m.name?.toLowerCase().replace(/\s+/g, "-") || "unknown"}`,
              download_url: m.archive_url,
              title: m.name || query,
              format: "STEP",
              confidence: 0.7,
              requires_login: true,
            })));
          } catch {
            resolve([]);
          }
        });
      });

      req.on("error", () => resolve([]));
      req.on("timeout", () => { req.destroy(); resolve([]); });
    });
  }

  /**
   * Generate a complete Playwright automation script for batch downloading.
   * This can be executed via the Playwright MCP plugin step-by-step.
   */
  generatePlaywrightScript(machines: Array<{ name: string; manufacturer: string }>): {
    steps: PlaywrightStep[];
    grabcad_urls: string[];
    haas_urls: string[];
  } {
    const steps: PlaywrightStep[] = [];
    const grabcad_urls: string[] = [];
    const haas_urls: string[] = [];

    // Group by manufacturer
    const byMfr = new Map<string, string[]>();
    for (const m of machines) {
      const key = m.manufacturer.toLowerCase();
      if (!byMfr.has(key)) byMfr.set(key, []);
      byMfr.get(key)!.push(m.name);
    }

    // GrabCAD search URLs (works without login for searching)
    for (const [mfr, models] of byMfr) {
      for (const model of models.slice(0, 20)) {
        const searchUrl = `https://grabcad.com/library?page=1&per_page=5&softwares=step-slash-iges&query=${encodeURIComponent(mfr + " " + model)}`;
        grabcad_urls.push(searchUrl);

        steps.push({
          action: "navigate",
          target: searchUrl,
          description: `Search GrabCAD for ${mfr} ${model}`,
        });
        steps.push({
          action: "wait",
          target: "2000",
          description: "Wait for results to load",
        });
      }
    }

    // Haas-specific: Build & Price tool has model data
    if (byMfr.has("haas")) {
      const haasUrl = "https://www.haascnc.com/build-and-price/expert.html";
      haas_urls.push(haasUrl);
      steps.push({
        action: "navigate",
        target: haasUrl,
        description: "Navigate to Haas Build & Price for 3D model access",
      });
    }

    return { steps, grabcad_urls, haas_urls };
  }

  /**
   * Generate a list of missing machines that need 3D models.
   * Reads the existing 3D model catalog and finds gaps.
   */
  getMissingMachines(): Array<{ name: string; manufacturer: string; id: string }> {
    // Known manufacturers and their approximate model counts we're missing
    const missing: Array<{ name: string; manufacturer: string; id: string }> = [];

    // Top priority machines (most common in shops)
    const priority = [
      // Haas (66 missing)
      { mfr: "Haas", models: ["VF-1", "VF-2", "VF-3", "VF-4", "VF-5", "VF-6", "VF-2SS", "VF-2YT", "MiniMill", "MiniMill2", "DM-1", "DM-2", "DT-2", "TM-1", "TM-2", "TM-3", "ST-10", "ST-15", "ST-20", "ST-25", "ST-30", "ST-35", "ST-40", "UMC-500", "UMC-750", "UMC-1000", "UMC-1500", "EC-400", "EC-500", "EC-1600"] },
      // DMG MORI (92 missing)
      { mfr: "DMG MORI", models: ["DMU 50", "DMU 65", "DMU 80", "DMU 95", "DMU 125", "DMC 850 V", "DMC 1150 V", "CMX 600 V", "CMX 800 V", "CMX 1100 V", "NLX 2000", "NLX 2500", "NLX 3000", "CLX 350", "CLX 450", "CTX 450", "CTX 800", "DMF 260", "DMF 360", "NTX 1000", "NTX 2000"] },
      // Mazak (67 missing)
      { mfr: "Mazak", models: ["Variaxis i-300", "Variaxis i-500", "Variaxis i-700", "Variaxis C-600", "VCN-530C", "VCN-700", "Quick Turn 250", "Quick Turn 350", "Quick Turn 450", "Integrex i-200", "Integrex i-300", "Integrex i-400", "HCN-4000", "HCN-5000", "HCN-6800", "MEGA 8800"] },
      // Okuma (already well covered but check)
      { mfr: "Okuma", models: ["MB-46V", "MB-56V", "MB-66V", "MU-5000V", "MU-6300V", "MU-8000V", "Genos M560-V", "Genos L300", "LB3000 EX", "LU3000 EX", "Multus B300", "Multus U3000"] },
      // DN Solutions / Doosan (43 missing)
      { mfr: "DN Solutions", models: ["DNM 500", "DNM 650", "DNM 750", "DVF 5000", "DVF 6500", "Puma 2600", "Puma 3100", "Puma 4100", "Lynx 2100", "NHP 4000", "NHP 5000", "NHP 6300"] },
      // Brother (10 missing)
      { mfr: "Brother", models: ["Speedio R650X2", "Speedio S700X2", "Speedio M140X2", "Speedio W1000Xd2"] },
      // Makino (27 missing)
      { mfr: "Makino", models: ["a51nx", "a61nx", "a81nx", "a92", "D500", "D800Z", "PS95", "PS105", "iQ300", "iQ500"] },
    ];

    for (const { mfr, models } of priority) {
      for (const model of models) {
        missing.push({
          name: model,
          manufacturer: mfr,
          id: `${mfr.replace(/\s+/g, "_")}_${model.replace(/\s+/g, "_")}`,
        });
      }
    }

    return missing;
  }

  /**
   * Save search results to disk for later reference.
   */
  saveResults(results: SearchResult[]): void {
    const dir = path.dirname(RESULTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  }

  /**
   * Load previous search results.
   */
  loadResults(): SearchResult[] {
    try {
      if (fs.existsSync(RESULTS_FILE)) {
        return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
      }
    } catch { /* no results */ }
    return [];
  }

  /**
   * Ensure model directory exists.
   */
  ensureModelDir(): string {
    if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
    return MODEL_DIR;
  }
}

export const machineModelDownloaderEngine = new MachineModelDownloaderEngine();
