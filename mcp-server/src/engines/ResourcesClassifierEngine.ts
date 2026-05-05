/**
 * ResourcesClassifierEngine — bucket files/dirs in H:/prism/Resources/ by
 * content type so the Knowledge Ingestion Pipeline (P14-U02) can skip
 * machining-specific posts and CAD assets and ingest only the general
 * knowledge corpus (training PDFs, MIT chapters, vendor manuals).
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U01.
 *
 * Classification rules (priority order — first match wins):
 *
 *   1. machining-specific  — file ext in .nc, .min, .mcx, .cnc, .nc1,
 *      .ngc, .tap, .gcode, .h, .ptp; OR name fragment matches one of
 *      ['cam', 'cnc', 'mill', 'lathe', 'wedm', 'fusion', 'hypermill',
 *      'mastercam', 'esprit', 'post', 'fanuc', 'okuma', 'haas', 'hurco']
 *      (case-insensitive). These directly encode shop tooling state and
 *      should be ingested by domain-specific harvesters, not the
 *      general-knowledge LLM pipeline.
 *
 *   2. binary-assets        — ext in .png, .jpg, .jpeg, .gif, .bmp,
 *      .zip, .rar, .7z, .iso, .stl, .step, .stp, .iges, .igs, .obj,
 *      .dwg, .dxf, .sldprt, .sldasm, .ipt, .iam. Not text-extractable
 *      without OCR / step-parsing — outside KIP scope.
 *
 *   3. general-knowledge   — ext in .pdf, .epub, .md, .txt, .docx,
 *      .doc, .pptx, .ppt, .html, .htm. Falls through here only if NOT
 *      flagged machining-specific by name. The KIP target.
 *
 *   4. mixed               — anything else (or directories whose
 *      contents span multiple buckets without majority).
 *
 * Pure functions — no I/O. Caller (resources-inventory.mjs) does the fs
 * walk and feeds entry-by-entry.
 *
 * @module engines/ResourcesClassifierEngine
 */

const MACHINING_EXTS = new Set([
  ".nc", ".min", ".mcx", ".cnc", ".nc1", ".ngc", ".tap",
  ".gcode", ".h", ".ptp", ".eia", ".pim", ".pi", ".pun",
  ".sub", ".cls", ".apt", ".pst",
]);

const MACHINING_NAME_FRAGMENTS = [
  "cam", "cnc", "mill", "lathe", "wedm", "fusion", "hypermill",
  "mastercam", "esprit", "post", "fanuc", "okuma", "haas", "hurco",
  "edm", "swiss", "nakamura", "mitsubishi", "siemens", "heidenhain",
  "sodick", "agie", "controller", "g-code", "gcode", "macro",
  "fixture", "vise", "chuck", "tooling", "feed", "speed",
];

const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif",
  ".zip", ".rar", ".7z", ".iso", ".tar", ".gz", ".bz2",
  ".stl", ".step", ".stp", ".iges", ".igs", ".obj", ".x_t", ".x_b",
  ".dwg", ".dxf", ".sldprt", ".sldasm", ".ipt", ".iam",
  ".f3d", ".sat", ".prt", ".asm",
  ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".webm",
  ".exe", ".msi", ".dll",
]);

const TEXT_EXTS = new Set([
  ".pdf", ".epub", ".md", ".txt", ".docx", ".doc",
  ".pptx", ".ppt", ".html", ".htm", ".rtf", ".odt",
]);

export type ResourceCategory =
  | "machining-specific"
  | "binary-assets"
  | "general-knowledge"
  | "mixed";

export interface FileEntry {
  /** Path relative to the resources root; uses forward slashes. */
  relPath: string;
  /** Lowercased file extension including the dot, or "" for no ext. */
  ext: string;
  /** File size in bytes. */
  size: number;
}

export interface DirSummary {
  relPath: string;
  fileCount: number;
  totalBytes: number;
  byCategory: Record<ResourceCategory, { fileCount: number; bytes: number }>;
  category: ResourceCategory;
  /** Dominant extension by file count, "" if dir is empty. */
  dominantExt: string;
}

export class ResourcesClassifierEngine {
  /**
   * Classify a single file by extension + path-name fragments.
   * Path-name machining fragments override neutral text extensions, so a
   * `.pdf` named "Hurco Manual" still gets routed to machining-specific.
   */
  classifyFile(entry: FileEntry): ResourceCategory {
    const ext = entry.ext.toLowerCase();
    const lowerPath = entry.relPath.toLowerCase();

    // Priority 1: machining-specific extensions are unambiguous
    if (MACHINING_EXTS.has(ext)) return "machining-specific";

    // Priority 2: name-fragment machining flag (overrides general text exts)
    for (const frag of MACHINING_NAME_FRAGMENTS) {
      if (lowerPath.includes(frag)) return "machining-specific";
    }

    // Priority 3: binary
    if (BINARY_EXTS.has(ext)) return "binary-assets";

    // Priority 4: general-knowledge text formats
    if (TEXT_EXTS.has(ext)) return "general-knowledge";

    // Fallback: anything else is mixed — likely small config / spreadsheet
    return "mixed";
  }

  /**
   * Aggregate a flat list of FileEntry under a given dir relPath into a
   * DirSummary. Caller passes only the entries that belong under this dir
   * (use `entry.relPath.startsWith(dirRelPath + '/')` for the filter).
   *
   * The directory's overall category is the one with the highest byte
   * total (not file count — a single 50MB PDF beats 200 .nc files for
   * "what kind of thing is this dir"). Empty dirs become "mixed".
   */
  summarizeDir(dirRelPath: string, entries: readonly FileEntry[]): DirSummary {
    const byCategory: Record<ResourceCategory, { fileCount: number; bytes: number }> = {
      "machining-specific": { fileCount: 0, bytes: 0 },
      "binary-assets":      { fileCount: 0, bytes: 0 },
      "general-knowledge":  { fileCount: 0, bytes: 0 },
      "mixed":              { fileCount: 0, bytes: 0 },
    };
    const extCounts = new Map<string, number>();
    let totalBytes = 0;

    for (const e of entries) {
      const cat = this.classifyFile(e);
      byCategory[cat].fileCount++;
      byCategory[cat].bytes += Math.max(0, e.size);
      totalBytes += Math.max(0, e.size);
      extCounts.set(e.ext, (extCounts.get(e.ext) ?? 0) + 1);
    }

    // Dir category = whichever bucket has the most BYTES.
    // Ties broken by deterministic priority order.
    const priority: ResourceCategory[] = [
      "machining-specific", "general-knowledge", "binary-assets", "mixed",
    ];
    let bestCat: ResourceCategory = "mixed";
    let bestBytes = -1;
    for (const cat of priority) {
      if (byCategory[cat].bytes > bestBytes) {
        bestBytes = byCategory[cat].bytes;
        bestCat = cat;
      }
    }
    if (entries.length === 0) bestCat = "mixed";

    let dominantExt = "";
    let dominantCount = 0;
    for (const [ext, count] of extCounts) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantExt = ext;
      }
    }

    return {
      relPath: dirRelPath,
      fileCount: entries.length,
      totalBytes,
      byCategory,
      category: bestCat,
      dominantExt,
    };
  }

  /**
   * Convenience: filter a list of DirSummary down to only the
   * general-knowledge dirs (the KIP ingest set).
   */
  filterIngestable(dirs: readonly DirSummary[]): DirSummary[] {
    return dirs.filter((d) => d.category === "general-knowledge" && d.fileCount > 0);
  }
}

export const resourcesClassifierEngine = new ResourcesClassifierEngine();
