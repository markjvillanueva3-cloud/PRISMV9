/**
 * FusionProjectCrawlerEngine — U-BOX54
 *
 * Recursively crawls a Fusion 360 cloud project to build a complete
 * inventory of all designs. Extracts: name, dates, component count,
 * CAM setup count, operation types, tool count.
 *
 * Uses FusionCloudConnectorEngine for data access (live or mock mode).
 *
 * @module engines/FusionProjectCrawlerEngine
 */

import { log } from "../utils/Logger.js";
import type { FusionCloudConnectorEngine } from "./FusionCloudConnectorEngine.js";
import type { FolderListResult, FileMetadataResult } from "./Fusion360LiveBridgeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface DesignSummary {
  name: string;
  file_id: string;
  path: string;
  extension: string;
  size_bytes: number;
  modified: string | null;
  version_count: number;
  has_cam: boolean;
  setup_count: number;
  operation_count: number;
  tool_count: number;
  body_count: number;
  strategies: string[];
}

export interface ProjectTree {
  project_name: string;
  crawl_time: string;
  mode: "live" | "mock";
  total_files: number;
  total_designs: number;
  designs_with_cam: number;
  total_setups: number;
  total_operations: number;
  unique_tools: number;
  designs: DesignSummary[];
  folder_structure: FolderNode[];
}

export interface FolderNode {
  name: string;
  path: string;
  file_count: number;
  children: FolderNode[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class FusionProjectCrawlerEngine {
  /**
   * Crawl an entire Fusion 360 project and extract metadata for every design.
   */
  async crawl(
    connector: FusionCloudConnectorEngine,
    projectIndex: number,
    options?: { maxDepth?: number; extractMetadata?: boolean },
  ): Promise<ProjectTree> {
    const maxDepth = options?.maxDepth ?? 5;
    const extractMeta = options?.extractMetadata ?? true;

    const folderTree = await connector.listFolder(projectIndex, "", maxDepth);
    const allFiles = this._collectFiles(folderTree, "");
    const folderStructure = this._buildFolderNodes(folderTree, "");

    const designs: DesignSummary[] = [];
    const toolSet = new Set<string>();

    for (const file of allFiles) {
      const design: DesignSummary = {
        name: file.name,
        file_id: file.id,
        path: file.path,
        extension: file.extension,
        size_bytes: file.size_bytes,
        modified: file.modified ?? null,
        version_count: file.version_count,
        has_cam: false,
        setup_count: 0,
        operation_count: 0,
        tool_count: 0,
        body_count: 0,
        strategies: [],
      };

      if (extractMeta && file.extension === "f3d") {
        try {
          const meta = await connector.getFileMetadata(projectIndex, file.id);
          design.has_cam = meta.cam.has_cam;
          design.setup_count = meta.cam.setup_count ?? meta.cam.setups.length;
          design.body_count = meta.design.body_count;

          for (const setup of meta.cam.setups) {
            design.operation_count += setup.operations.length;
            for (const op of setup.operations) {
              if (op.strategy && !design.strategies.includes(op.strategy)) {
                design.strategies.push(op.strategy);
              }
              if (op.tool) {
                const toolKey = `${op.tool.type}_${op.tool.diameter_mm}`;
                toolSet.add(toolKey);
                design.tool_count++;
              }
            }
          }
        } catch (err: any) {
          log.warn(`[FusionProjectCrawler] Failed to get metadata for ${file.name}: ${err.message}`);
        }
      }

      designs.push(design);
    }

    const tree: ProjectTree = {
      project_name: folderTree.project_name,
      crawl_time: new Date().toISOString(),
      mode: connector.mode,
      total_files: allFiles.length,
      total_designs: designs.filter(d => d.extension === "f3d").length,
      designs_with_cam: designs.filter(d => d.has_cam).length,
      total_setups: designs.reduce((s, d) => s + d.setup_count, 0),
      total_operations: designs.reduce((s, d) => s + d.operation_count, 0),
      unique_tools: toolSet.size,
      designs,
      folder_structure: folderStructure,
    };

    log.info(`[FusionProjectCrawler] Crawled ${tree.project_name}: ` +
      `${tree.total_designs} designs, ${tree.designs_with_cam} with CAM, ` +
      `${tree.total_operations} operations, ${tree.unique_tools} unique tools`);

    return tree;
  }

  // ────────────────────────────────────────────────────────────────

  private _collectFiles(
    folder: FolderListResult,
    parentPath: string,
  ): Array<{ name: string; id: string; extension: string; size_bytes: number; modified?: string; version_count: number; path: string }> {
    const currentPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
    const files = folder.files.map(f => ({ ...f, path: currentPath }));
    for (const sub of folder.subfolders) {
      files.push(...this._collectFiles(sub, currentPath));
    }
    return files;
  }

  private _buildFolderNodes(folder: FolderListResult, parentPath: string): FolderNode[] {
    const currentPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
    return [{
      name: folder.name,
      path: currentPath,
      file_count: folder.files.length,
      children: folder.subfolders.flatMap(sub => this._buildFolderNodes(sub, currentPath)),
    }];
  }
}

// Singleton
export const fusionProjectCrawlerEngine = new FusionProjectCrawlerEngine();
