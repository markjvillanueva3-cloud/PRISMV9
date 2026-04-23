/**
 * FusionCloudConnectorEngine — U-BOX53
 *
 * Connection layer for Fusion 360 data extraction. Two modes:
 *   1. Live Bridge: Fusion 360 add-in running on localhost:18360
 *   2. Offline Mock: structured mock data for testing
 *
 * Handles connection health checks, retry logic, and provides
 * a unified interface for downstream extraction engines.
 *
 * @module engines/FusionCloudConnectorEngine
 */

import { log } from "../utils/Logger.js";
import type { DataProject, CloudFile, FolderListResult, FileMetadataResult, FileVersionResult } from "./Fusion360LiveBridgeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ConnectionStatus {
  connected: boolean;
  mode: "live" | "mock";
  fusion_version: string | null;
  projects_available: number;
  last_check: string;
  error: string | null;
}

export interface FusionCloudConfig {
  mode: "auto" | "live" | "mock";
  bridge_url: string;
  timeout_ms: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_CONFIG: FusionCloudConfig = {
  mode: "auto",
  bridge_url: "http://127.0.0.1:18360",
  timeout_ms: 5000,
};

export class FusionCloudConnectorEngine {
  private config: FusionCloudConfig;
  private _connected = false;
  private _mode: "live" | "mock" = "mock";

  constructor(config?: Partial<FusionCloudConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Fusion 360 live bridge is available.
   * Falls back to mock mode if not reachable.
   */
  async checkConnection(): Promise<ConnectionStatus> {
    if (this.config.mode === "mock") {
      this._mode = "mock";
      this._connected = true;
      return {
        connected: true,
        mode: "mock",
        fusion_version: null,
        projects_available: 2,
        last_check: new Date().toISOString(),
        error: null,
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout_ms);
      const resp = await fetch(`${this.config.bridge_url}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        this._connected = true;
        this._mode = "live";
        const data = await resp.json().catch(() => ({})) as Record<string, unknown>;
        return {
          connected: true,
          mode: "live",
          fusion_version: (data.version as string) ?? null,
          projects_available: (data.project_count as number) ?? 0,
          last_check: new Date().toISOString(),
          error: null,
        };
      }
      throw new Error(`Bridge returned ${resp.status}`);
    } catch (err: any) {
      if (this.config.mode === "auto") {
        this._mode = "mock";
        this._connected = true;
        log.info("[FusionCloudConnector] Bridge unreachable, using mock mode");
        return {
          connected: true,
          mode: "mock",
          fusion_version: null,
          projects_available: 2,
          last_check: new Date().toISOString(),
          error: `Bridge unreachable: ${err.message}. Using mock data.`,
        };
      }
      this._connected = false;
      this._mode = "mock";
      return {
        connected: false,
        mode: "mock",
        fusion_version: null,
        projects_available: 0,
        last_check: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  get isConnected(): boolean { return this._connected; }
  get mode(): "live" | "mock" { return this._mode; }

  /**
   * List all accessible projects.
   */
  async listProjects(): Promise<DataProject[]> {
    if (this._mode === "mock") return MOCK_PROJECTS;
    const { fusion360LiveBridgeEngine } = await import("./Fusion360LiveBridgeEngine.js");
    const result = await fusion360LiveBridgeEngine.listDataProjects();
    return result.projects;
  }

  /**
   * Browse a project's folder tree.
   */
  async listFolder(projectIndex: number, folderPath = "", maxDepth = 3): Promise<FolderListResult> {
    if (this._mode === "mock") return MOCK_FOLDER_TREE;
    const { fusion360LiveBridgeEngine } = await import("./Fusion360LiveBridgeEngine.js");
    return fusion360LiveBridgeEngine.listDataFolder(projectIndex, folderPath, maxDepth);
  }

  /**
   * Search files across projects.
   */
  async searchFiles(query: string, extension?: string): Promise<CloudFile[]> {
    if (this._mode === "mock") {
      return MOCK_FILES.filter(f =>
        f.name.toLowerCase().includes(query.toLowerCase()) &&
        (!extension || f.extension === extension)
      );
    }
    const { fusion360LiveBridgeEngine } = await import("./Fusion360LiveBridgeEngine.js");
    const result = await fusion360LiveBridgeEngine.searchCloudFiles(query, extension);
    return result.results;
  }

  /**
   * Get design + CAM metadata for a file.
   */
  async getFileMetadata(projectIndex: number, fileId: string): Promise<FileMetadataResult> {
    if (this._mode === "mock") {
      const file = MOCK_FILES.find(f => f.id === fileId);
      return mockMetadata(file?.name ?? "Unknown");
    }
    const { fusion360LiveBridgeEngine } = await import("./Fusion360LiveBridgeEngine.js");
    await fusion360LiveBridgeEngine.openCloudFile(projectIndex, fileId);
    return fusion360LiveBridgeEngine.getFileMetadata();
  }

  /**
   * Get file version history.
   */
  async getFileVersions(projectIndex: number, fileId: string): Promise<FileVersionResult> {
    if (this._mode === "mock") {
      return {
        file_name: "mock-file.f3d",
        file_id: fileId,
        version_count: 5,
        is_mature: false,
        versions: Array.from({ length: 5 }, (_, i) => ({
          version_number: i + 1,
          id: `v${i + 1}`,
          created: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
          creator: "JM Die Shop",
          comment: i === 4 ? "Final revision" : `Rev ${i + 1}`,
        })),
      };
    }
    const { fusion360LiveBridgeEngine } = await import("./Fusion360LiveBridgeEngine.js");
    return fusion360LiveBridgeEngine.getFileVersions(false, projectIndex, fileId);
  }
}

// ============================================================================
// MOCK DATA — JM Die Team project structure
// ============================================================================

const MOCK_PROJECTS: DataProject[] = [
  { id: "proj-jmdie-001", name: "JM Die Team", index: 0 },
  { id: "proj-personal-001", name: "Personal Projects", index: 1 },
];

const MOCK_FILES: CloudFile[] = [
  { name: "PUNCH HOLDER.f3d", id: "f001", project: "JM Die Team", path: "Parts/Die Components", extension: "f3d", size_bytes: 2500000, modified: "2026-03-15" },
  { name: "STRIPPER PLATE.f3d", id: "f002", project: "JM Die Team", path: "Parts/Die Components", extension: "f3d", size_bytes: 1800000, modified: "2026-03-20" },
  { name: "DIE BLOCK.f3d", id: "f003", project: "JM Die Team", path: "Parts/Die Components", extension: "f3d", size_bytes: 3200000, modified: "2026-03-25" },
  { name: "GUIDE PIN.f3d", id: "f004", project: "JM Die Team", path: "Parts/Standard", extension: "f3d", size_bytes: 500000, modified: "2026-02-10" },
  { name: "CAM DRIVER.f3d", id: "f005", project: "JM Die Team", path: "Parts/Cam Action", extension: "f3d", size_bytes: 1200000, modified: "2026-03-28" },
  { name: "HEEL BLOCK.f3d", id: "f006", project: "JM Die Team", path: "Parts/Die Components", extension: "f3d", size_bytes: 900000, modified: "2026-01-15" },
];

const MOCK_FOLDER_TREE: FolderListResult = {
  name: "JM Die Team",
  project_name: "JM Die Team",
  files: [],
  subfolders: [
    {
      name: "Parts",
      project_name: "JM Die Team",
      files: [],
      subfolders: [
        {
          name: "Die Components",
          project_name: "JM Die Team",
          files: MOCK_FILES.filter(f => f.path.includes("Die Components")).map(f => ({
            name: f.name, id: f.id, extension: f.extension,
            size_bytes: f.size_bytes, modified: f.modified, version_count: 3,
          })),
          subfolders: [],
          truncated: false,
        },
        {
          name: "Standard",
          project_name: "JM Die Team",
          files: MOCK_FILES.filter(f => f.path.includes("Standard")).map(f => ({
            name: f.name, id: f.id, extension: f.extension,
            size_bytes: f.size_bytes, modified: f.modified, version_count: 5,
          })),
          subfolders: [],
          truncated: false,
        },
        {
          name: "Cam Action",
          project_name: "JM Die Team",
          files: MOCK_FILES.filter(f => f.path.includes("Cam Action")).map(f => ({
            name: f.name, id: f.id, extension: f.extension,
            size_bytes: f.size_bytes, modified: f.modified, version_count: 2,
          })),
          subfolders: [],
          truncated: false,
        },
      ],
      truncated: false,
    },
  ],
  truncated: false,
};

function mockMetadata(name: string): FileMetadataResult {
  return {
    document_name: name,
    design: {
      body_count: 3,
      occurrence_count: 5,
      sketch_count: 8,
      feature_count: 24,
      parameter_count: 12,
      bodies: [
        { name: "Body1", volume_mm3: 45000, area_mm2: 12000, face_count: 26, edge_count: 48 },
        { name: "Body2", volume_mm3: 8000, area_mm2: 3200, face_count: 12, edge_count: 20 },
        { name: "Pocket", volume_mm3: 2500, area_mm2: 1800, face_count: 8, edge_count: 14 },
      ],
    },
    cam: {
      has_cam: true,
      setup_count: 2,
      setups: [
        {
          name: "Setup1 - Top",
          type: "milling",
          operations: [
            { name: "Face1", type: "face", strategy: "face", tool: { description: "2\" Face Mill", type: "face mill", diameter_mm: 50.8, flute_count: 5 }, speed_feed: { rpm: 2400, feed_mm_min: 1200, stepdown_mm: 2.0, stepover_mm: 38.0 } },
            { name: "Adaptive1", type: "adaptive2d", strategy: "adaptive_clearing", tool: { description: "1/2\" EM 4FL", type: "flat end mill", diameter_mm: 12.7, flute_count: 4 }, speed_feed: { rpm: 6000, feed_mm_min: 2400, stepdown_mm: 12.7, stepover_mm: 5.0 } },
            { name: "Contour1", type: "contour2d", strategy: "contour", tool: { description: "1/2\" EM 4FL", type: "flat end mill", diameter_mm: 12.7, flute_count: 4 }, speed_feed: { rpm: 5500, feed_mm_min: 1100, stepdown_mm: 12.7 } },
            { name: "Drill1", type: "drilling", strategy: "drill", tool: { description: "#7 Drill", type: "drill", diameter_mm: 5.105, flute_count: 2 }, speed_feed: { rpm: 3500, feed_mm_min: 700 } },
          ],
        },
        {
          name: "Setup2 - Side",
          type: "milling",
          operations: [
            { name: "Pocket1", type: "pocket2d", strategy: "pocket_clearing", tool: { description: "3/8\" EM 3FL", type: "flat end mill", diameter_mm: 9.525, flute_count: 3 }, speed_feed: { rpm: 7000, feed_mm_min: 2100, stepdown_mm: 9.5, stepover_mm: 4.0 } },
            { name: "Bore1", type: "bore", strategy: "bore", tool: { description: "5/8\" Boring Bar", type: "boring bar", diameter_mm: 15.875, flute_count: 1 }, speed_feed: { rpm: 2200, feed_mm_min: 220 } },
          ],
        },
      ],
    },
  };
}

// Singleton
export const fusionCloudConnectorEngine = new FusionCloudConnectorEngine();
