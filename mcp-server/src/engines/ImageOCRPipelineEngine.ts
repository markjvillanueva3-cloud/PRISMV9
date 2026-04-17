/**
 * ImageOCRPipelineEngine — OCR Processing for Images
 *
 * Extracts text from images using OCR with preprocessing
 * optimizations for manufacturing documents (drawings, specs, labels).
 *
 * U-AWR27: Image OCR Pipeline
 *
 * @module engines/ImageOCRPipelineEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ImageFormat = "jpg" | "jpeg" | "png" | "tif" | "tiff" | "bmp" | "gif" | "webp";

export type ContentType =
  | "engineering_drawing"
  | "specification_sheet"
  | "label"
  | "photograph"
  | "screenshot"
  | "scan"
  | "handwritten"
  | "mixed"
  | "unknown";

export type OCRQuality = "excellent" | "good" | "fair" | "poor" | "unusable";

export interface PreprocessingStep {
  name: string;
  description: string;
  applied: boolean;
  improvement?: number;
}

export interface OCRRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
  type: "text" | "number" | "dimension" | "tolerance" | "symbol";
}

export interface OCRResult {
  imagePath: string;
  format: ImageFormat;
  contentType: ContentType;
  width: number;
  height: number;
  dpi: number;
  quality: OCRQuality;
  overallConfidence: number;
  rawText: string;
  regions: OCRRegion[];
  preprocessingSteps: PreprocessingStep[];
  extractedData: ExtractedData;
  processingTimeMs: number;
  warnings: string[];
}

export interface ExtractedData {
  dimensions: string[];
  tolerances: string[];
  partNumbers: string[];
  materials: string[];
  specifications: string[];
  dates: string[];
  quantities: string[];
}

export interface OCRConfig {
  language: string;
  psm: number; // Page segmentation mode
  oem: number; // OCR engine mode
  whitelist?: string;
  deskew: boolean;
  denoise: boolean;
  binarize: boolean;
  enhanceContrast: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORMAT_MAP: Record<string, ImageFormat> = {
  ".jpg": "jpg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".tif": "tif",
  ".tiff": "tiff",
  ".bmp": "bmp",
  ".gif": "gif",
  ".webp": "webp",
};

const DEFAULT_CONFIG: OCRConfig = {
  language: "eng",
  psm: 3, // Fully automatic page segmentation
  oem: 3, // Default, based on availability
  deskew: true,
  denoise: true,
  binarize: true,
  enhanceContrast: true,
};

const DIMENSION_PATTERN = /\d+\.?\d*\s*(mm|in|"|cm|m)\b/gi;
const TOLERANCE_PATTERN = /[±+\-]\s*\d+\.?\d*\s*(mm|in|")?/gi;
const PART_NUMBER_PATTERN = /(?:P\/N|PN|Part\s*#?|Item\s*#?)\s*:?\s*([A-Z0-9\-]+)/gi;
const MATERIAL_PATTERN = /(?:Material|Mat'l|Steel|Aluminum|Al|SS|Brass|Bronze|Plastic)\s*:?\s*([A-Z0-9\-\s]+)/gi;
const DATE_PATTERN = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
const QUANTITY_PATTERN = /(?:Qty|Quantity|QTY)\s*:?\s*(\d+)/gi;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getImageFormat(filename: string): ImageFormat {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return FORMAT_MAP[ext] || "jpg";
}

function assessQuality(confidence: number, dpi: number): OCRQuality {
  if (confidence >= 0.95 && dpi >= 300) return "excellent";
  if (confidence >= 0.85 && dpi >= 200) return "good";
  if (confidence >= 0.7 && dpi >= 150) return "fair";
  if (confidence >= 0.5) return "poor";
  return "unusable";
}

function detectContentType(text: string, filename: string): ContentType {
  const lower = text.toLowerCase();
  const nameLower = filename.toLowerCase();

  if (nameLower.includes("dwg") || nameLower.includes("drawing")) {
    return "engineering_drawing";
  }
  if (lower.includes("specification") || lower.includes("spec sheet")) {
    return "specification_sheet";
  }
  if (nameLower.includes("label") || lower.includes("label")) {
    return "label";
  }
  if (nameLower.includes("scan")) {
    return "scan";
  }
  if (nameLower.includes("screenshot") || nameLower.includes("screen")) {
    return "screenshot";
  }

  // Check for mixed content indicators
  const hasDimensions = DIMENSION_PATTERN.test(text);
  const hasTolerances = TOLERANCE_PATTERN.test(text);

  if (hasDimensions && hasTolerances) {
    return "engineering_drawing";
  }
  if (hasDimensions) {
    return "specification_sheet";
  }

  return "unknown";
}

function extractDataFromText(text: string): ExtractedData {
  const dimensions: string[] = [];
  const tolerances: string[] = [];
  const partNumbers: string[] = [];
  const materials: string[] = [];
  const specifications: string[] = [];
  const dates: string[] = [];
  const quantities: string[] = [];

  // Extract dimensions
  let match;
  const dimRegex = new RegExp(DIMENSION_PATTERN.source, "gi");
  while ((match = dimRegex.exec(text)) !== null) {
    if (!dimensions.includes(match[0])) {
      dimensions.push(match[0]);
    }
  }

  // Extract tolerances
  const tolRegex = new RegExp(TOLERANCE_PATTERN.source, "gi");
  while ((match = tolRegex.exec(text)) !== null) {
    if (!tolerances.includes(match[0])) {
      tolerances.push(match[0]);
    }
  }

  // Extract part numbers
  const pnRegex = new RegExp(PART_NUMBER_PATTERN.source, "gi");
  while ((match = pnRegex.exec(text)) !== null) {
    if (match[1] && !partNumbers.includes(match[1])) {
      partNumbers.push(match[1]);
    }
  }

  // Extract materials
  const matRegex = new RegExp(MATERIAL_PATTERN.source, "gi");
  while ((match = matRegex.exec(text)) !== null) {
    if (match[1] && !materials.includes(match[1].trim())) {
      materials.push(match[1].trim());
    }
  }

  // Extract dates
  const dateRegex = new RegExp(DATE_PATTERN.source, "g");
  while ((match = dateRegex.exec(text)) !== null) {
    if (!dates.includes(match[0])) {
      dates.push(match[0]);
    }
  }

  // Extract quantities
  const qtyRegex = new RegExp(QUANTITY_PATTERN.source, "gi");
  while ((match = qtyRegex.exec(text)) !== null) {
    if (match[1] && !quantities.includes(match[1])) {
      quantities.push(match[1]);
    }
  }

  return {
    dimensions,
    tolerances,
    partNumbers,
    materials,
    specifications,
    dates,
    quantities,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ImageOCRPipelineEngine {
  private static results: Map<string, OCRResult> = new Map();
  private static config: OCRConfig = { ...DEFAULT_CONFIG };

  /**
   * Simulates OCR processing on an image.
   * In production, this would call Tesseract or cloud OCR.
   */
  static processImage(
    imagePath: string,
    options: {
      simulatedText?: string;
      simulatedDpi?: number;
      simulatedConfidence?: number;
    } = {}
  ): OCRResult {
    const startTime = Date.now();
    const format = getImageFormat(imagePath);

    // Simulated values (would come from actual OCR)
    const dpi = options.simulatedDpi || 300;
    const confidence = options.simulatedConfidence || 0.85;
    const text = options.simulatedText || "";

    const preprocessingSteps: PreprocessingStep[] = [];

    if (this.config.deskew) {
      preprocessingSteps.push({
        name: "Deskew",
        description: "Correct image rotation",
        applied: true,
        improvement: 0.05,
      });
    }

    if (this.config.denoise) {
      preprocessingSteps.push({
        name: "Denoise",
        description: "Remove image noise",
        applied: true,
        improvement: 0.08,
      });
    }

    if (this.config.binarize) {
      preprocessingSteps.push({
        name: "Binarize",
        description: "Convert to black and white",
        applied: true,
        improvement: 0.1,
      });
    }

    if (this.config.enhanceContrast) {
      preprocessingSteps.push({
        name: "Enhance Contrast",
        description: "Improve text visibility",
        applied: true,
        improvement: 0.07,
      });
    }

    const contentType = detectContentType(text, imagePath);
    const quality = assessQuality(confidence, dpi);
    const extractedData = extractDataFromText(text);

    const warnings: string[] = [];
    if (dpi < 150) {
      warnings.push("Low DPI may affect OCR accuracy");
    }
    if (confidence < 0.7) {
      warnings.push("Low confidence — manual verification recommended");
    }

    const result: OCRResult = {
      imagePath,
      format,
      contentType,
      width: 2000, // Simulated
      height: 1500, // Simulated
      dpi,
      quality,
      overallConfidence: confidence,
      rawText: text,
      regions: [], // Would be populated by actual OCR
      preprocessingSteps,
      extractedData,
      processingTimeMs: Date.now() - startTime,
      warnings,
    };

    this.results.set(imagePath, result);
    log.info(`[ImageOCRPipeline] Processed ${imagePath}: ${quality} quality`);

    return result;
  }

  /**
   * Processes multiple images in batch.
   */
  static processBatch(
    images: Array<{
      path: string;
      simulatedText?: string;
      simulatedDpi?: number;
    }>
  ): OCRResult[] {
    return images.map((img) =>
      this.processImage(img.path, {
        simulatedText: img.simulatedText,
        simulatedDpi: img.simulatedDpi,
      })
    );
  }

  /**
   * Gets the result for a processed image.
   */
  static getResult(imagePath: string): OCRResult | null {
    return this.results.get(imagePath) || null;
  }

  /**
   * Gets all results.
   */
  static getAllResults(): OCRResult[] {
    return [...this.results.values()];
  }

  /**
   * Gets results by quality level.
   */
  static getResultsByQuality(quality: OCRQuality): OCRResult[] {
    return [...this.results.values()].filter((r) => r.quality === quality);
  }

  /**
   * Gets results by content type.
   */
  static getResultsByContentType(contentType: ContentType): OCRResult[] {
    return [...this.results.values()].filter((r) => r.contentType === contentType);
  }

  /**
   * Gets results that need manual review.
   */
  static getResultsNeedingReview(): OCRResult[] {
    return [...this.results.values()].filter(
      (r) => r.quality === "poor" || r.quality === "unusable" || r.warnings.length > 0
    );
  }

  /**
   * Sets OCR configuration.
   */
  static setConfig(config: Partial<OCRConfig>): void {
    this.config = { ...this.config, ...config };
    log.info("[ImageOCRPipeline] Config updated");
  }

  /**
   * Gets current configuration.
   */
  static getConfig(): OCRConfig {
    return { ...this.config };
  }

  /**
   * Resets configuration to defaults.
   */
  static resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Extracts manufacturing data from text.
   */
  static extractManufacturingData(text: string): ExtractedData {
    return extractDataFromText(text);
  }

  /**
   * Assesses image quality for OCR.
   */
  static assessImageQuality(dpi: number, confidence: number): OCRQuality {
    return assessQuality(confidence, dpi);
  }

  /**
   * Gets supported image formats.
   */
  static getSupportedFormats(): ImageFormat[] {
    return Object.values(FORMAT_MAP);
  }

  /**
   * Checks if a file is a supported image format.
   */
  static isSupportedFormat(filename: string): boolean {
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
    return ext in FORMAT_MAP;
  }

  /**
   * Gets statistics across all processed images.
   */
  static getStatistics(): {
    totalProcessed: number;
    byQuality: Record<OCRQuality, number>;
    byContentType: Record<ContentType, number>;
    averageConfidence: number;
    averageProcessingTime: number;
    totalDimensions: number;
    totalPartNumbers: number;
  } {
    const results = [...this.results.values()];

    const byQuality: Record<OCRQuality, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unusable: 0,
    };

    const byContentType: Record<ContentType, number> = {
      engineering_drawing: 0,
      specification_sheet: 0,
      label: 0,
      photograph: 0,
      screenshot: 0,
      scan: 0,
      handwritten: 0,
      mixed: 0,
      unknown: 0,
    };

    let totalConfidence = 0;
    let totalTime = 0;
    let totalDimensions = 0;
    let totalPartNumbers = 0;

    for (const result of results) {
      byQuality[result.quality]++;
      byContentType[result.contentType]++;
      totalConfidence += result.overallConfidence;
      totalTime += result.processingTimeMs;
      totalDimensions += result.extractedData.dimensions.length;
      totalPartNumbers += result.extractedData.partNumbers.length;
    }

    return {
      totalProcessed: results.length,
      byQuality,
      byContentType,
      averageConfidence: results.length > 0 ? totalConfidence / results.length : 0,
      averageProcessingTime: results.length > 0 ? totalTime / results.length : 0,
      totalDimensions,
      totalPartNumbers,
    };
  }

  /**
   * Clears all results.
   */
  static reset(): void {
    this.results.clear();
    this.config = { ...DEFAULT_CONFIG };
    log.info("[ImageOCRPipeline] Reset complete");
  }
}

export const imageOCRPipelineEngine = ImageOCRPipelineEngine;
export default ImageOCRPipelineEngine;
