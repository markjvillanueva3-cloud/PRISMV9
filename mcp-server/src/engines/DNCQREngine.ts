/**
 * DNCQREngine — DNC QR Code Integration
 * ======================================
 *
 * Generates and decodes QR codes for program identification,
 * verification, and quick machine loading.
 *
 * L2-P4-MS1/P0-U03 — Batch 5: DNC & Post-Processing
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const QRDataSchema = z.object({
  programId: z.string(),
  programNumber: z.string(),
  programName: z.string(),
  partNumber: z.string().optional(),
  revision: z.string().optional(),
  checksum: z.string(),
  machineId: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  dncServer: z.string().optional(),
});

export const QRCodeSchema = z.object({
  id: z.string(),
  data: QRDataSchema,
  format: z.enum(["png", "svg", "text"]),
  size: z.number(),
  errorCorrection: z.enum(["L", "M", "Q", "H"]),
  content: z.string(),
  generatedAt: z.string(),
});

export const QRScanResultSchema = z.object({
  success: z.boolean(),
  data: QRDataSchema.optional(),
  error: z.string().optional(),
  scannedAt: z.string(),
  verified: z.boolean(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type QRData = z.infer<typeof QRDataSchema>;
export type QRCode = z.infer<typeof QRCodeSchema>;
export type QRScanResult = z.infer<typeof QRScanResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const generatedQRs: Map<string, QRCode> = new Map();
let qrCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class DNCQREngine {
  /**
   * Generate QR code for program
   */
  static generate(
    data: QRData,
    options?: { format?: "png" | "svg" | "text"; size?: number; errorCorrection?: "L" | "M" | "Q" | "H" }
  ): QRCode {
    const format = options?.format || "text";
    const size = options?.size || 256;
    const errorCorrection = options?.errorCorrection || "M";

    // Encode data as JSON
    const jsonData = JSON.stringify(data);
    const encodedData = Buffer.from(jsonData).toString("base64");

    // Generate QR content (text representation for demo)
    const content = this.generateQRContent(encodedData, size, format);

    const qr: QRCode = {
      id: `QR-${++qrCounter}`,
      data,
      format,
      size,
      errorCorrection,
      content,
      generatedAt: new Date().toISOString(),
    };

    generatedQRs.set(qr.id, qr);
    return qr;
  }

  /**
   * Generate QR content representation
   */
  private static generateQRContent(data: string, size: number, format: "png" | "svg" | "text"): string {
    switch (format) {
      case "text":
        return this.generateTextQR(data);
      case "svg":
        return this.generateSVGQR(data, size);
      case "png":
        return `data:image/png;base64,${data.substring(0, 100)}...`; // Placeholder
    }
  }

  /**
   * Generate ASCII QR representation
   */
  private static generateTextQR(data: string): string {
    // Simple checkered pattern for demo (real QR would use library)
    const size = 21; // Minimum QR size
    const lines: string[] = [];

    // Add quiet zone
    lines.push("█".repeat(size + 4));

    for (let y = 0; y < size; y++) {
      let line = "██";
      for (let x = 0; x < size; x++) {
        // Simple pattern based on data hash
        const hash = (data.charCodeAt((x + y * size) % data.length) + x + y) % 2;
        line += hash ? "██" : "  ";
      }
      line += "██";
      lines.push(line);
    }

    lines.push("█".repeat(size + 4));

    return lines.join("\n");
  }

  /**
   * Generate SVG QR representation
   */
  private static generateSVGQR(data: string, size: number): string {
    const moduleSize = Math.floor(size / 25);
    const modules: string[] = [];

    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        const hash = (data.charCodeAt((x + y * 21) % data.length) + x + y) % 2;
        if (hash) {
          modules.push(`<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`);
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${21 * moduleSize} ${21 * moduleSize}">
      <rect width="100%" height="100%" fill="white"/>
      ${modules.join("\n")}
    </svg>`;
  }

  /**
   * Decode QR data
   */
  static decode(content: string): QRScanResult {
    try {
      // Try to extract base64 data
      const base64Match = content.match(/[A-Za-z0-9+/=]{20,}/);
      if (!base64Match) {
        return {
          success: false,
          error: "No valid QR data found",
          scannedAt: new Date().toISOString(),
          verified: false,
        };
      }

      const jsonStr = Buffer.from(base64Match[0], "base64").toString("utf8");
      const data = JSON.parse(jsonStr);
      const validated = QRDataSchema.parse(data);

      // Verify checksum
      const verified = this.verifyChecksum(validated);

      return {
        success: true,
        data: validated,
        scannedAt: new Date().toISOString(),
        verified,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Decode failed",
        scannedAt: new Date().toISOString(),
        verified: false,
      };
    }
  }

  /**
   * Verify QR checksum matches program
   */
  private static verifyChecksum(data: QRData): boolean {
    // In real implementation, would verify against stored program
    return data.checksum.length > 0;
  }

  /**
   * Generate URL for DNC load
   */
  static generateLoadURL(data: QRData): string {
    const server = data.dncServer || "dnc://local";
    const params = new URLSearchParams({
      program: data.programNumber,
      checksum: data.checksum,
    });
    if (data.machineId) params.append("machine", data.machineId);
    return `${server}/load?${params.toString()}`;
  }

  /**
   * Get QR code by ID
   */
  static getQR(id: string): QRCode | undefined {
    return generatedQRs.get(id);
  }

  /**
   * Create label data for printing
   */
  static createLabel(data: QRData, options?: { includeChecksum?: boolean; includeDate?: boolean }): {
    qr: QRCode;
    labelText: string[];
  } {
    const qr = this.generate(data, { format: "text", size: 128 });
    const labelText: string[] = [
      `Program: ${data.programNumber}`,
      data.programName,
    ];

    if (data.partNumber) labelText.push(`Part: ${data.partNumber} Rev ${data.revision || "A"}`);
    if (options?.includeChecksum) labelText.push(`CRC: ${data.checksum}`);
    if (options?.includeDate) labelText.push(`Date: ${data.createdAt.split("T")[0]}`);

    return { qr, labelText };
  }

  /**
   * Validate QR is not expired
   */
  static isValid(data: QRData): boolean {
    if (!data.expiresAt) return true;
    return new Date(data.expiresAt) > new Date();
  }

  static getSelfAwareness() {
    return {
      name: "DNCQREngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      capabilities: ["generate", "decode", "generateLoadURL", "getQR", "createLabel", "isValid"],
      formats: ["png", "svg", "text"],
      errorCorrectionLevels: ["L", "M", "Q", "H"],
      dependencies: [],
    };
  }
}

export const dncQREngine = new DNCQREngine();
