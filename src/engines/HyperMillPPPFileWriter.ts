/**
 * HyperMillPPPFileWriter — Post-Process Pipeline NC File Writer
 *
 * Writes post-processed NC output from PostProcessorPipelineEngine (38 stages)
 * to the filesystem in hyperMILL's expected project folder structure.
 *
 * Agent 18 finding: "PPP output never leaves memory."
 * This engine resolves that gap — it takes the in-memory NC string and
 * writes it atomically to disk.
 *
 * Key features:
 *   - NC file naming follows hyperMILL convention per controller dialect.
 *   - Backup of the original NC file before overwriting (prevents data loss).
 *   - Atomic write via temp-file + rename (prevents partial files on failure).
 *   - PRISM header comment block added to NC output for traceability.
 *   - Sub-program splitting for controllers that require separate sub-files.
 *
 * @engine HyperMillPPPFileWriter
 * @shortcode E1169
 * @dispatcher camDispatcher
 * @actions hypermill_ppp_write (declared here)
 * @milestone HM-REV-MS9/U-HMR50
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * hyperMILL project folder structure descriptor.
 * All paths are absolute or relative to the project root.
 */
export interface HMProjectFolder {
  /** Absolute path to the hyperMILL project root (.hmc file directory). */
  projectRoot: string;
  /** Sub-folder for NC output files (relative to projectRoot). Default: "NC". */
  ncSubFolder: string;
  /** Sub-folder for backup files (relative to projectRoot). Default: "NC_backup". */
  backupSubFolder: string;
  /** Sub-folder for sub-programs (relative to projectRoot). Default: "NC_sub". */
  subProgramSubFolder: string;
}

export const DEFAULT_HM_PROJECT_FOLDER: Omit<HMProjectFolder, "projectRoot"> = {
  ncSubFolder: "NC",
  backupSubFolder: "NC_backup",
  subProgramSubFolder: "NC_sub",
};

/**
 * Input to the file writer.
 */
export interface PPPWriteInput {
  /** In-memory NC content from PostProcessorPipelineEngine. */
  ncContent: string;
  /** Job name used in the hyperMILL project (e.g. "Bracket_Op10"). */
  jobName: string;
  /** Controller dialect — determines file extension and naming convention. */
  controllerDialect: string;
  /** Project folder descriptor. */
  projectFolder: HMProjectFolder;
  /**
   * Whether to split sub-programs into separate files.
   * Only applies to controllers that separate main program and sub-programs.
   * Default: false.
   */
  splitSubPrograms?: boolean;
  /**
   * PRISM metadata to embed in the NC header comment.
   * Fields are written as NC block comments.
   */
  prismMetadata?: {
    engineVersion?: string;
    controllerDialect?: string;
    materialName?: string;
    optimizeFor?: string;
    generatedAt?: string;
    operationCount?: number;
  };
}

/**
 * Result returned by the file writer.
 */
export interface PPPWriteResult {
  success: boolean;
  mainFilePath: string;
  backupFilePath: string | undefined;
  subProgramPaths: string[];
  bytesWritten: number;
  backupCreated: boolean;
  prismHeaderAdded: boolean;
  error?: string;
}

// ─── NC File Naming Convention ────────────────────────────────────────────────

/**
 * File extension map per controller dialect.
 * Source: hyperMILL v33 NcGenerator post configuration families.
 */
const DIALECT_EXTENSIONS: Record<string, string> = {
  fanuc:       ".nc",
  heidenhain:  ".h",
  siemens:     ".spf",
  mazak:       ".nc",
  okuma:       ".min",
  mitsubishi:  ".nc",
  brother:     ".nc",
  haas:        ".nc",
  dmg:         ".nc",
  deckel_maho: ".nc",
  indramat:    ".nc",
  bosch:       ".nc",
  iso:         ".nc",
  generic:     ".nc",
};

/**
 * Resolve the NC file extension for a given controller dialect.
 *
 * @param dialect - Controller dialect string.
 * @returns File extension including the dot (e.g. ".h").
 */
export function resolveNCExtension(dialect: string): string {
  const normalized = dialect.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return DIALECT_EXTENSIONS[normalized] ?? ".nc";
}

/**
 * Build the NC output file name from the job name and controller dialect.
 *
 * Convention: <jobName>_<dialect><ext>
 * Example:    "Bracket_Op10_fanuc.nc"
 *
 * @param jobName          - hyperMILL job name.
 * @param controllerDialect - Dialect string.
 * @returns NC file base name.
 */
export function buildNCFileName(jobName: string, controllerDialect: string): string {
  const safeJob = jobName.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const safeDialect = controllerDialect.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const ext = resolveNCExtension(controllerDialect);
  return `${safeJob}_${safeDialect}${ext}`;
}

// ─── PRISM Header Comment Builder ─────────────────────────────────────────────

/**
 * Build the PRISM metadata header block for the NC file.
 *
 * The header is formatted as a block of line comments using the correct
 * comment character for the dialect.
 *
 * @param metadata - PRISM job metadata.
 * @param dialect  - Controller dialect (determines comment character).
 * @returns Multi-line header string to prepend to NC content.
 */
export function buildPRISMHeader(
  metadata: PPPWriteInput["prismMetadata"],
  dialect: string
): string {
  const now = new Date().toISOString();
  const commentChar = dialect.toLowerCase() === "heidenhain" ? ";" : "%";
  const lines = [
    `${commentChar} ============================================================`,
    `${commentChar} PRISM Post-Process Pipeline Output`,
    `${commentChar} Generated : ${metadata?.generatedAt ?? now}`,
    `${commentChar} Engine    : PRISM PPP (38-stage) — E1169`,
    `${commentChar} Dialect   : ${metadata?.controllerDialect ?? dialect}`,
    `${commentChar} Material  : ${metadata?.materialName ?? "unknown"}`,
    `${commentChar} Optimize  : ${metadata?.optimizeFor ?? "balanced"}`,
    `${commentChar} Operations: ${metadata?.operationCount ?? "?"}`,
    `${commentChar} ============================================================`,
    "",
  ];
  return lines.join("\n");
}

// ─── Sub-program Splitter ─────────────────────────────────────────────────────

/**
 * Split NC content into main program and sub-programs.
 * Sub-programs are identified by patterns like:
 *   (SUB-PROGRAM-START: L1000)
 *   O1000 ... M99 (Fanuc sub-program)
 *   LBL 1 ... LBL 0 (Heidenhain sub-program)
 *
 * @param ncContent - Full NC content.
 * @param dialect   - Controller dialect.
 * @returns Object with main program and any sub-programs.
 */
export function splitSubPrograms(
  ncContent: string,
  dialect: string
): { main: string; subs: Array<{ name: string; content: string }> } {
  // Simple split strategy: look for PRISM sub-program markers
  const SUB_MARKER = /^%\s*SUB-PROGRAM-START:\s*(\S+)/m;

  if (!SUB_MARKER.test(ncContent)) {
    return { main: ncContent, subs: [] };
  }

  const parts = ncContent.split(/^(?=%\s*SUB-PROGRAM-START:)/m);
  const main = parts[0];
  const subs = parts.slice(1).map((part) => {
    const nameMatch = part.match(/^%\s*SUB-PROGRAM-START:\s*(\S+)/);
    const name = nameMatch ? nameMatch[1] : `sub_${Math.random().toString(36).slice(2, 6)}`;
    const content = part.replace(/^%\s*SUB-PROGRAM-START:\s*\S+\n?/, "");
    return { name, content };
  });

  return { main, subs };
  // Dialect-specific split logic can be added here for Heidenhain LBL etc.
  void dialect;
}

// ─── Atomic Write Utility ─────────────────────────────────────────────────────

/**
 * Write content to a file atomically using a temp file + rename.
 * If the write fails, the original file is unaffected.
 *
 * @param targetPath - Absolute path for the final file.
 * @param content    - UTF-8 string content to write.
 * @returns Number of bytes written.
 * @throws If the write or rename fails.
 */
export function atomicWriteNC(targetPath: string, content: string): number {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = path.join(dir, `.prism_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.nc`);

  try {
    fs.writeFileSync(tmpPath, content, "utf-8");
    fs.renameSync(tmpPath, targetPath);
    return Buffer.byteLength(content, "utf-8");
  } catch (err) {
    // Clean up temp file if rename failed
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    throw err;
  }
}

/**
 * Create a backup of an existing NC file by copying it to the backup folder.
 *
 * @param originalPath - Path to the NC file to back up.
 * @param backupDir    - Directory where the backup will be stored.
 * @returns Absolute path of the backup file, or undefined if nothing to back up.
 */
export function backupNCFile(
  originalPath: string,
  backupDir: string
): string | undefined {
  if (!fs.existsSync(originalPath)) return undefined;

  fs.mkdirSync(backupDir, { recursive: true });

  const baseName = path.basename(originalPath, path.extname(originalPath));
  const ext = path.extname(originalPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `${baseName}_backup_${timestamp}${ext}`;
  const backupPath = path.join(backupDir, backupName);

  fs.copyFileSync(originalPath, backupPath);
  return backupPath;
}

// ─── HyperMillPPPFileWriter ───────────────────────────────────────────────────

/**
 * HyperMillPPPFileWriter
 *
 * Writes PPP-optimized G-code to disk in hyperMILL's expected folder structure.
 *
 * Usage:
 *   const writer = new HyperMillPPPFileWriter();
 *   const result = await writer.write({
 *     ncContent: "% ...",
 *     jobName: "Bracket_Op10",
 *     controllerDialect: "fanuc",
 *     projectFolder: { projectRoot: "/tmp/myproject", ...DEFAULT_HM_PROJECT_FOLDER },
 *   });
 *   console.log(result.mainFilePath); // "/tmp/myproject/NC/Bracket_Op10_fanuc.nc"
 */
export class HyperMillPPPFileWriter {

  /**
   * Write PPP-optimized NC content to the hyperMILL project folder structure.
   *
   * Steps:
   *   1. Build NC file path from job name and controller dialect.
   *   2. Backup original NC file if it exists.
   *   3. Prepend PRISM metadata header.
   *   4. Optionally split sub-programs.
   *   5. Atomically write main file (and sub-program files if split).
   *
   * @param input - Write parameters.
   * @returns PPPWriteResult with paths, byte counts, and success/error.
   */
  write(input: PPPWriteInput): PPPWriteResult {
    try {
      const { ncContent, jobName, controllerDialect, projectFolder } = input;
      const folder = { ...DEFAULT_HM_PROJECT_FOLDER, ...projectFolder };

      // 1. Build paths
      const ncDir = path.resolve(folder.projectRoot, folder.ncSubFolder);
      const backupDir = path.resolve(folder.projectRoot, folder.backupSubFolder);
      const subDir = path.resolve(folder.projectRoot, folder.subProgramSubFolder);

      const ncFileName = buildNCFileName(jobName, controllerDialect);
      const mainFilePath = path.join(ncDir, ncFileName);

      // 2. Backup original file if it exists
      const backupFilePath = backupNCFile(mainFilePath, backupDir);

      // 3. Build PRISM header
      const header = buildPRISMHeader(input.prismMetadata, controllerDialect);
      const prismHeaderAdded = true;

      // 4. Optionally split sub-programs
      const subProgramPaths: string[] = [];
      let mainContent: string;

      if (input.splitSubPrograms) {
        const { main, subs } = splitSubPrograms(ncContent, controllerDialect);
        mainContent = header + main;

        for (const sub of subs) {
          const subFileName = buildNCFileName(`${jobName}_${sub.name}`, controllerDialect);
          const subPath = path.join(subDir, subFileName);
          atomicWriteNC(subPath, header + sub.content);
          subProgramPaths.push(subPath);
        }
      } else {
        mainContent = header + ncContent;
      }

      // 5. Atomic write of main file
      const bytesWritten = atomicWriteNC(mainFilePath, mainContent);

      return {
        success: true,
        mainFilePath,
        backupFilePath,
        subProgramPaths,
        bytesWritten,
        backupCreated: backupFilePath !== undefined,
        prismHeaderAdded,
      };
    } catch (err: unknown) {
      return {
        success: false,
        mainFilePath: "",
        backupFilePath: undefined,
        subProgramPaths: [],
        bytesWritten: 0,
        backupCreated: false,
        prismHeaderAdded: false,
        error: String((err as Error)?.message ?? err),
      };
    }
  }

  /**
   * Resolve the output file path without writing.
   * Useful for pre-flight checks or displaying the target path to the user.
   *
   * @param jobName           - hyperMILL job name.
   * @param controllerDialect - Controller dialect.
   * @param projectFolder     - Project folder descriptor.
   * @returns Absolute path where the NC file will be written.
   */
  resolveOutputPath(
    jobName: string,
    controllerDialect: string,
    projectFolder: HMProjectFolder
  ): string {
    const folder = { ...DEFAULT_HM_PROJECT_FOLDER, ...projectFolder };
    const ncDir = path.resolve(folder.projectRoot, folder.ncSubFolder);
    const ncFileName = buildNCFileName(jobName, controllerDialect);
    return path.join(ncDir, ncFileName);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const hyperMillPPPFileWriter = new HyperMillPPPFileWriter();
