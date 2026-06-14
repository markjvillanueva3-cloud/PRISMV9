/**
 * DarkContentClassifierEngine — Classifies Hard-to-Extract Content
 *
 * Identifies "dark" content that resists standard extraction:
 * - Scanned PDFs (image-only, no text layer)
 * - Poor quality images
 * - Handwritten notes
 * - Proprietary binary formats
 * - Encrypted/password-protected files
 *
 * U-AWR22: Dark Content Classifier
 *
 * @module engines/DarkContentClassifierEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type DarkContentCategory =
  | "scanned_pdf"
  | "image_only"
  | "handwritten"
  | "proprietary_binary"
  | "encrypted"
  | "corrupted"
  | "unknown_format"
  | "low_quality"
  | "extractable";

export type ExtractionDifficulty = "easy" | "moderate" | "hard" | "impossible";

export interface ContentAssessment {
  filePath: string;
  fileName: string;
  category: DarkContentCategory;
  difficulty: ExtractionDifficulty;
  confidence: number;
  indicators: string[];
  recommendations: string[];
  alternativePipelines: string[];
  estimatedEffort: "minutes" | "hours" | "days" | "manual_only";
}

export interface DarkContentReport {
  totalFiles: number;
  extractable: number;
  darkContent: number;
  byCategory: Record<DarkContentCategory, number>;
  byDifficulty: Record<ExtractionDifficulty, number>;
  priorityQueue: ContentAssessment[];
  recommendations: string[];
}

export interface FileSignature {
  extension: string;
  magicBytes?: number[];
  indicators: string[];
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

const SCANNED_PDF_INDICATORS = [
  "single large image per page",
  "no text layer",
  "uniform DPI across pages",
  "OCR artifacts present",
  "image compression artifacts",
];

const HANDWRITTEN_INDICATORS = [
  "irregular stroke patterns",
  "non-uniform spacing",
  "variable baseline",
  "ink bleed patterns",
  "paper texture visible",
];

const PROPRIETARY_FORMATS: Record<string, { vendor: string; pipeline: string }> = {
  ".mcx": { vendor: "Mastercam", pipeline: "MastercamProjectAnalyzer" },
  ".mcx-8": { vendor: "Mastercam", pipeline: "MastercamProjectAnalyzer" },
  ".emcam": { vendor: "Mastercam", pipeline: "MastercamProjectAnalyzer" },
  ".hyp": { vendor: "hyperMILL", pipeline: "HyperMillProjectAnalyzer" },
  ".hmc": { vendor: "hyperMILL", pipeline: "HyperMillProjectAnalyzer" },
  ".catpart": { vendor: "CATIA", pipeline: "CATIAImportEngine" },
  ".catproduct": { vendor: "CATIA", pipeline: "CATIAImportEngine" },
  ".prt": { vendor: "NX/UG", pipeline: "NXImportEngine" },
  ".sldprt": { vendor: "SolidWorks", pipeline: "SolidWorksImportEngine" },
  ".sldasm": { vendor: "SolidWorks", pipeline: "SolidWorksImportEngine" },
  ".ipt": { vendor: "Inventor", pipeline: "InventorImportEngine" },
  ".iam": { vendor: "Inventor", pipeline: "InventorImportEngine" },
};

const ENCRYPTED_SIGNATURES = [
  { extension: ".pdf", indicator: "/Encrypt" },
  { extension: ".zip", indicator: "encrypted" },
  { extension: ".7z", indicator: "encrypted" },
  { extension: ".rar", indicator: "encrypted" },
  { extension: ".xlsx", indicator: "encrypted" },
];

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".gif"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot).toLowerCase();
}

function assessPDFContent(
  filename: string,
  metadata: { hasTextLayer?: boolean; pageCount?: number; isScanned?: boolean }
): ContentAssessment {
  const indicators: string[] = [];
  const recommendations: string[] = [];
  const alternativePipelines: string[] = [];

  let category: DarkContentCategory = "extractable";
  let difficulty: ExtractionDifficulty = "easy";
  let confidence = 0.9;

  if (metadata.isScanned || !metadata.hasTextLayer) {
    category = "scanned_pdf";
    difficulty = "hard";
    confidence = 0.85;
    indicators.push(...SCANNED_PDF_INDICATORS.slice(0, 3));
    recommendations.push("Run OCR pipeline (Tesseract or Adobe Acrobat)");
    recommendations.push("Verify OCR accuracy manually");
    alternativePipelines.push("OCRExtractionPipeline");
    alternativePipelines.push("AdobeOCRBridge");
  }

  return {
    filePath: filename,
    fileName: filename.split("/").pop() || filename,
    category,
    difficulty,
    confidence,
    indicators,
    recommendations,
    alternativePipelines,
    estimatedEffort: difficulty === "hard" ? "hours" : "minutes",
  };
}

function assessImageContent(
  filename: string,
  metadata: { width?: number; height?: number; dpi?: number; hasText?: boolean }
): ContentAssessment {
  const indicators: string[] = [];
  const recommendations: string[] = [];
  const alternativePipelines: string[] = [];

  let category: DarkContentCategory = "image_only";
  let difficulty: ExtractionDifficulty = "moderate";
  let confidence = 0.8;
  let estimatedEffort: ContentAssessment["estimatedEffort"] = "hours";

  // Check for low quality
  if (metadata.dpi && metadata.dpi < 150) {
    category = "low_quality";
    difficulty = "hard";
    indicators.push("Low DPI (<150)");
    recommendations.push("Request higher resolution source");
  }

  // Check for handwritten content
  if (metadata.hasText === false) {
    indicators.push("No machine text detected");
    recommendations.push("May contain handwritten content");
    alternativePipelines.push("HandwritingRecognitionPipeline");
  }

  recommendations.push("Run OCR with preprocessing");
  alternativePipelines.push("ImageOCRPipeline");

  return {
    filePath: filename,
    fileName: filename.split("/").pop() || filename,
    category,
    difficulty,
    confidence,
    indicators,
    recommendations,
    alternativePipelines,
    estimatedEffort,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class DarkContentClassifierEngine {
  private static assessments: Map<string, ContentAssessment> = new Map();

  /**
   * Classifies a file based on extension and optional metadata.
   */
  static classifyFile(
    filePath: string,
    metadata: {
      hasTextLayer?: boolean;
      isScanned?: boolean;
      isEncrypted?: boolean;
      isCorrupted?: boolean;
      dpi?: number;
      width?: number;
      height?: number;
    } = {}
  ): ContentAssessment {
    const ext = getFileExtension(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || filePath;

    // Check for encrypted
    if (metadata.isEncrypted) {
      const assessment: ContentAssessment = {
        filePath,
        fileName,
        category: "encrypted",
        difficulty: "impossible",
        confidence: 0.95,
        indicators: ["File is password-protected"],
        recommendations: ["Request decryption password from source"],
        alternativePipelines: [],
        estimatedEffort: "manual_only",
      };
      this.assessments.set(filePath, assessment);
      return assessment;
    }

    // Check for corrupted
    if (metadata.isCorrupted) {
      const assessment: ContentAssessment = {
        filePath,
        fileName,
        category: "corrupted",
        difficulty: "impossible",
        confidence: 0.95,
        indicators: ["File structure is corrupted"],
        recommendations: ["Request uncorrupted copy from source"],
        alternativePipelines: [],
        estimatedEffort: "manual_only",
      };
      this.assessments.set(filePath, assessment);
      return assessment;
    }

    // Check proprietary formats
    if (PROPRIETARY_FORMATS[ext]) {
      const info = PROPRIETARY_FORMATS[ext];
      const assessment: ContentAssessment = {
        filePath,
        fileName,
        category: "proprietary_binary",
        difficulty: "moderate",
        confidence: 0.9,
        indicators: [`${info.vendor} proprietary format`],
        recommendations: [`Export to neutral format (STEP, DXF) from ${info.vendor}`],
        alternativePipelines: [info.pipeline],
        estimatedEffort: "minutes",
      };
      this.assessments.set(filePath, assessment);
      return assessment;
    }

    // PDF assessment
    if (ext === ".pdf") {
      const assessment = assessPDFContent(filePath, metadata);
      this.assessments.set(filePath, assessment);
      return assessment;
    }

    // Image assessment
    if (IMAGE_EXTENSIONS.includes(ext)) {
      const assessment = assessImageContent(filePath, metadata);
      this.assessments.set(filePath, assessment);
      return assessment;
    }

    // Unknown format
    const assessment: ContentAssessment = {
      filePath,
      fileName,
      category: "unknown_format",
      difficulty: "hard",
      confidence: 0.5,
      indicators: [`Unknown extension: ${ext || "(none)"}`],
      recommendations: ["Identify file format using file magic"],
      alternativePipelines: ["GenericBinaryAnalyzer"],
      estimatedEffort: "hours",
    };
    this.assessments.set(filePath, assessment);
    return assessment;
  }

  /**
   * Batch classifies multiple files.
   */
  static classifyBatch(
    files: Array<{ path: string; metadata?: Parameters<typeof DarkContentClassifierEngine.classifyFile>[1] }>
  ): ContentAssessment[] {
    return files.map((f) => this.classifyFile(f.path, f.metadata));
  }

  /**
   * Checks if a file is considered "dark" (hard to extract).
   */
  static isDarkContent(assessment: ContentAssessment): boolean {
    return assessment.category !== "extractable";
  }

  /**
   * Gets extraction difficulty score (0-1, higher = harder).
   */
  static getDifficultyScore(difficulty: ExtractionDifficulty): number {
    const scores: Record<ExtractionDifficulty, number> = {
      easy: 0.1,
      moderate: 0.4,
      hard: 0.7,
      impossible: 1.0,
    };
    return scores[difficulty];
  }

  /**
   * Generates a report from all assessments.
   */
  static generateReport(): DarkContentReport {
    const byCategory: Record<DarkContentCategory, number> = {
      scanned_pdf: 0,
      image_only: 0,
      handwritten: 0,
      proprietary_binary: 0,
      encrypted: 0,
      corrupted: 0,
      unknown_format: 0,
      low_quality: 0,
      extractable: 0,
    };

    const byDifficulty: Record<ExtractionDifficulty, number> = {
      easy: 0,
      moderate: 0,
      hard: 0,
      impossible: 0,
    };

    let extractable = 0;
    let darkContent = 0;
    const priorityQueue: ContentAssessment[] = [];

    for (const assessment of this.assessments.values()) {
      byCategory[assessment.category]++;
      byDifficulty[assessment.difficulty]++;

      if (assessment.category === "extractable") {
        extractable++;
      } else {
        darkContent++;
        priorityQueue.push(assessment);
      }
    }

    // Sort priority queue by difficulty (easier first)
    priorityQueue.sort(
      (a, b) => this.getDifficultyScore(a.difficulty) - this.getDifficultyScore(b.difficulty)
    );

    const recommendations: string[] = [];
    if (byCategory.scanned_pdf > 0) {
      recommendations.push(`${byCategory.scanned_pdf} scanned PDFs need OCR processing`);
    }
    if (byCategory.encrypted > 0) {
      recommendations.push(`${byCategory.encrypted} encrypted files need passwords`);
    }
    if (byCategory.proprietary_binary > 0) {
      recommendations.push(
        `${byCategory.proprietary_binary} proprietary files need vendor tools`
      );
    }
    if (byCategory.low_quality > 0) {
      recommendations.push(`${byCategory.low_quality} low-quality images need enhancement`);
    }

    return {
      totalFiles: this.assessments.size,
      extractable,
      darkContent,
      byCategory,
      byDifficulty,
      priorityQueue,
      recommendations,
    };
  }

  /**
   * Gets assessment for a specific file.
   */
  static getAssessment(filePath: string): ContentAssessment | null {
    return this.assessments.get(filePath) || null;
  }

  /**
   * Gets all assessments.
   */
  static getAllAssessments(): ContentAssessment[] {
    return [...this.assessments.values()];
  }

  /**
   * Filters assessments by category.
   */
  static getByCategory(category: DarkContentCategory): ContentAssessment[] {
    return [...this.assessments.values()].filter((a) => a.category === category);
  }

  /**
   * Filters assessments by difficulty.
   */
  static getByDifficulty(difficulty: ExtractionDifficulty): ContentAssessment[] {
    return [...this.assessments.values()].filter((a) => a.difficulty === difficulty);
  }

  /**
   * Gets files that can be processed with a specific pipeline.
   */
  static getForPipeline(pipelineName: string): ContentAssessment[] {
    return [...this.assessments.values()].filter((a) =>
      a.alternativePipelines.includes(pipelineName)
    );
  }

  /**
   * Suggests the best extraction approach for a file.
   */
  static suggestApproach(filePath: string): {
    primary: string;
    alternatives: string[];
    estimatedSuccess: number;
  } {
    const assessment = this.assessments.get(filePath);
    if (!assessment) {
      return {
        primary: "Classify file first",
        alternatives: [],
        estimatedSuccess: 0,
      };
    }

    if (assessment.category === "extractable") {
      return {
        primary: "Standard extraction pipeline",
        alternatives: [],
        estimatedSuccess: 0.95,
      };
    }

    const successRates: Record<ExtractionDifficulty, number> = {
      easy: 0.9,
      moderate: 0.7,
      hard: 0.4,
      impossible: 0.05,
    };

    return {
      primary: assessment.recommendations[0] || "Manual review required",
      alternatives: assessment.alternativePipelines,
      estimatedSuccess: successRates[assessment.difficulty],
    };
  }

  /**
   * Gets supported proprietary formats.
   */
  static getSupportedProprietaryFormats(): Array<{
    extension: string;
    vendor: string;
    pipeline: string;
  }> {
    return Object.entries(PROPRIETARY_FORMATS).map(([ext, info]) => ({
      extension: ext,
      ...info,
    }));
  }

  /**
   * Clears all cached assessments.
   */
  static reset(): void {
    this.assessments.clear();
    log.info("[DarkContentClassifierEngine] Cache cleared");
  }
}

export const darkContentClassifierEngine = DarkContentClassifierEngine;
export default DarkContentClassifierEngine;
