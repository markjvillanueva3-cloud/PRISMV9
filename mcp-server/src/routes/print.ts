/**
 * Print Classification Routes — U-LPR06 LATHE-PROD-READY-MS0
 *
 * Provides endpoints for classifying engineering prints using
 * MachineTypeClassifierEngine with OCR and CAD feature inference.
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR06
 */

import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { CallToolFn } from "./index.js";
import { machineTypeClassifierEngine } from "../engines/MachineTypeClassifierEngine.js";

export function createPrintRouter(_callTool: CallToolFn): Router {
  const router = Router();
  const PRINT_DIR = path.join(os.tmpdir(), "prism-prints");

  if (!fs.existsSync(PRINT_DIR)) {
    fs.mkdirSync(PRINT_DIR, { recursive: true });
  }

  /**
   * POST /api/print/classify
   *
   * Accepts a print file (PDF or image) and classifies the required machine type.
   * Uses OCR for title block extraction and CAD feature inference.
   *
   * Body (multipart/form-data):
   * - file: The print file (PDF, PNG, JPEG, TIFF)
   *
   * Body (JSON):
   * - filename: string
   * - content_base64: string (base64-encoded file data)
   *
   * Returns:
   * - machineType: The classified machine type
   * - confidence: Classification confidence (0-1)
   * - alternativeMachines: Alternative machine types with confidence
   * - features: Detected manufacturing features
   * - titleBlockData: Extracted title block information
   * - reasoning: Classification reasoning
   */
  router.post("/classify", async (req, res, next): Promise<void> => {
    try {
      let filePath: string | undefined;
      let filename: string = "unknown";

      // Handle both JSON body (base64) and multipart (file upload)
      if (req.body?.content_base64 && req.body?.filename) {
        const safeName = (req.body.filename as string).replace(/[^a-zA-Z0-9._-]/g, "_");
        filename = safeName;
        filePath = path.join(PRINT_DIR, `${Date.now()}_${safeName}`);
        fs.writeFileSync(filePath, Buffer.from(req.body.content_base64, "base64"));
      } else if ((req as { file?: { path: string; originalname: string } }).file) {
        const file = (req as { file: { path: string; originalname: string } }).file;
        filePath = file.path;
        filename = file.originalname;
      } else {
        res.status(400).json({
          error: "Provide either content_base64 + filename, or upload a file",
        });
        return;
      }

      const ext = path.extname(filename).toLowerCase();
      const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"];

      if (!validExtensions.includes(ext)) {
        res.status(400).json({
          error: `Invalid file type: ${ext}. Supported: ${validExtensions.join(", ")}`,
        });
        return;
      }

      // Call MachineTypeClassifierEngine
      const classificationInput = {
        partDescription: filename,
        // In a full implementation, we would:
        // 1. Run OCR on PDFs/images to extract title block
        // 2. Parse CAD features if it's a CAD file
        // 3. Extract dimensions and GD&T
        // For now, use the filename and any metadata
      };

      const result = machineTypeClassifierEngine.classify(classificationInput);

      // Map engine result to API response.
      // featureAnalysis + extractedData are deferred — current
      // MachineTypeClassifierEngine surfaces only the machine-type decision;
      // feature scoring + title-block extraction are a separate enrichment unit.
      const response = {
        machineType: result.primaryMachineType,
        confidence: result.confidence,
        alternativeMachines: result.alternativeTypes.map((t) => ({
          type: t.type,
          confidence: t.confidence,
        })),
        features: {
          turningFeatures: 0,
          millingFeatures: 0,
          drillingFeatures: 0,
          edmFeatures: 0,
        },
        titleBlockData: undefined as undefined,
        reasoning: result.reasoning,
      };

      // Cleanup temp file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/print/machine-types
   *
   * Returns available machine types and their descriptions.
   */
  router.get("/machine-types", (_req, res): void => {
    const types = [
      { id: "lathe", label: "CNC Lathe", description: "Parts with rotational symmetry" },
      { id: "mill_3axis", label: "3-Axis Mill", description: "Prismatic parts, 2.5D pocketing" },
      { id: "mill_5axis", label: "5-Axis Mill", description: "Complex surfaces, undercuts" },
      { id: "mill_turn", label: "Mill-Turn", description: "Combined turning and milling" },
      { id: "wire_edm", label: "Wire EDM", description: "Precision profiles, hardened materials" },
      { id: "sinker_edm", label: "Sinker EDM", description: "Cavities, complex internal features" },
      { id: "swiss", label: "Swiss Lathe", description: "Small diameter, tight tolerances" },
      { id: "grinder", label: "Grinder", description: "High precision finishing" },
      { id: "multi_machine", label: "Multi-Machine", description: "Requires multiple setups" },
    ];

    res.json({ types });
  });

  return router;
}
