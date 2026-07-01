/**
 * ImageOCRPipelineEngine — OCR Text Extraction from Images
 * U-AWR27: Image OCR Pipeline (550 images)
 */

import { log } from '../utils/Logger.js';

export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'tiff' | 'tif' | 'bmp' | 'gif' | 'webp';
export type OCRQuality = 'high' | 'medium' | 'low' | 'failed';

export interface ImageMetadata {
  path: string;
  name: string;
  format: ImageFormat;
  width?: number;
  height?: number;
  dpi?: number;
  sizeBytes: number;
}

export interface OCRResult {
  imagePath: string;
  success: boolean;
  quality: OCRQuality;
  confidence: number;
  text: string;
  wordCount: number;
  processingTimeMs: number;
  warnings: string[];
  extractedData: ExtractedData;
}

export interface ExtractedData {
  numbers: string[];
  dates: string[];
  measurements: string[];
  toolCodes: string[];
  partNumbers: string[];
}

export interface OCRBatchResult {
  totalImages: number;
  successful: number;
  failed: number;
  byQuality: Record<OCRQuality, number>;
  totalWords: number;
  averageConfidence: number;
  results: OCRResult[];
  processingTimeMs: number;
}

const PATTERNS = {
  toolCode: /[A-Z]{2,4}[-\s]?\d{3,6}/g,
  partNumber: /[A-Z0-9]{2,}-[A-Z0-9]{2,}(-[A-Z0-9]+)*/g,
  measurement: /\d+\.?\d*\s*(mm|in|"|cm)/gi,
  date: /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g,
  number: /\d+\.?\d*/g,
};

function detectFormat(filename: string): ImageFormat {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const formats: ImageFormat[] = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'gif', 'webp'];
  return formats.includes(ext as ImageFormat) ? (ext as ImageFormat) : 'jpg';
}

function assessQuality(confidence: number, wordCount: number): OCRQuality {
  if (confidence >= 0.9 && wordCount > 10) return 'high';
  if (confidence >= 0.7 && wordCount > 5) return 'medium';
  if (confidence >= 0.5 || wordCount > 0) return 'low';
  return 'failed';
}

function extractStructuredData(text: string): ExtractedData {
  return {
    numbers: text.match(PATTERNS.number) || [],
    dates: text.match(PATTERNS.date) || [],
    measurements: text.match(PATTERNS.measurement) || [],
    toolCodes: text.match(PATTERNS.toolCode) || [],
    partNumbers: text.match(PATTERNS.partNumber) || [],
  };
}

export class ImageOCRPipelineEngine {
  private static results: Map<string, OCRResult> = new Map();
  private static imageQueue: ImageMetadata[] = [];

  static registerImage(path: string, metadata: Partial<ImageMetadata> = {}): ImageMetadata {
    const name = path.split(/[\/\\]/).pop() || path;
    const format = detectFormat(name);
    const image: ImageMetadata = {
      path, name, format,
      width: metadata.width,
      height: metadata.height,
      dpi: metadata.dpi,
      sizeBytes: metadata.sizeBytes || 0,
    };
    this.imageQueue.push(image);
    log.info(`[ImageOCRPipeline] Registered image: ${name}`);
    return image;
  }

  static registerBatch(images: Array<{ path: string; metadata?: Partial<ImageMetadata> }>): ImageMetadata[] {
    return images.map((img) => this.registerImage(img.path, img.metadata));
  }

  static processImage(imagePath: string, simulatedText: string = '', simulatedConfidence: number = 0.85): OCRResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    const image = this.imageQueue.find((i) => i.path === imagePath);
    
    let confidence = simulatedConfidence;
    if (image?.dpi && image.dpi < 150) {
      warnings.push('Low DPI may affect OCR accuracy');
      confidence *= 0.8;
    }

    const wordCount = simulatedText.split(/\s+/).filter(Boolean).length;
    const quality = assessQuality(confidence, wordCount);
    
    const result: OCRResult = {
      imagePath,
      success: quality !== 'failed',
      quality,
      confidence,
      text: simulatedText,
      wordCount,
      processingTimeMs: Date.now() - startTime,
      warnings,
      extractedData: extractStructuredData(simulatedText),
    };

    this.results.set(imagePath, result);
    log.info(`[ImageOCRPipeline] Processed image: ${imagePath} quality=${quality}`);
    return result;
  }

  static processBatch(simulatedResults?: Map<string, { text: string; confidence: number }>): OCRBatchResult {
    const startTime = Date.now();
    const results: OCRResult[] = [];
    const byQuality: Record<OCRQuality, number> = { high: 0, medium: 0, low: 0, failed: 0 };
    let totalWords = 0, totalConfidence = 0, successful = 0;

    for (const image of this.imageQueue) {
      const simulated = simulatedResults?.get(image.path) || { text: '', confidence: 0.5 };
      const result = this.processImage(image.path, simulated.text, simulated.confidence);
      results.push(result);
      byQuality[result.quality]++;
      totalWords += result.wordCount;
      totalConfidence += result.confidence;
      if (result.success) successful++;
    }

    return {
      totalImages: this.imageQueue.length,
      successful,
      failed: this.imageQueue.length - successful,
      byQuality,
      totalWords,
      averageConfidence: this.imageQueue.length > 0 ? totalConfidence / this.imageQueue.length : 0,
      results,
      processingTimeMs: Date.now() - startTime,
    };
  }

  static getResult(imagePath: string): OCRResult | null {
    return this.results.get(imagePath) || null;
  }

  static getAllResults(): OCRResult[] {
    return [...this.results.values()];
  }

  static getByQuality(quality: OCRQuality): OCRResult[] {
    return [...this.results.values()].filter((r) => r.quality === quality);
  }

  static getQueueStats(): { queued: number; processed: number; pending: number; byFormat: Record<string, number> } {
    const byFormat: Record<string, number> = {};
    for (const img of this.imageQueue) {
      byFormat[img.format] = (byFormat[img.format] || 0) + 1;
    }
    return {
      queued: this.imageQueue.length,
      processed: this.results.size,
      pending: this.imageQueue.length - this.results.size,
      byFormat,
    };
  }

  static reset(): void {
    this.results.clear();
    this.imageQueue = [];
    log.info('[ImageOCRPipeline] State reset');
  }
}

export const imageOCRPipelineEngine = ImageOCRPipelineEngine;
export default ImageOCRPipelineEngine;
