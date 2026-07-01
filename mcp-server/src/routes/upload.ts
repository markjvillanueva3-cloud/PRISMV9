import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { CallToolFn } from "./index.js";

/** Authoritative max accepted upload size (DECODED bytes). NB the global `express.json({limit})`
 *  body parser (default 50MB RAW) is the FIRST gate -- a payload whose base64 text exceeds it is 413'd
 *  before this handler runs. This cap (32MiB decoded; base64 ~42.6MB, inside the 50MB body window) is
 *  therefore the BINDING decoded-size policy and guards the (optionalToken, non-blocking) base64 write
 *  against an unauthenticated disk-fill DoS. (A raw FILE read by /drawing/extract uses its own 64MB cap
 *  -- different surface: that path is not base64-wrapped.) */
export const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

/** Decoded byte length of a base64 string (4 chars -> 3 bytes, minus padding), WITHOUT decoding it
 *  (so an oversize payload is rejected before it is materialized in memory). */
export function decodedBase64Bytes(b64: string): number {
  const len = b64.length;
  if (len === 0) return 0;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor(len / 4) * 3 - padding;
}

export function createUploadRouter(callTool: CallToolFn): Router {
  const router = Router();
  const UPLOAD_DIR = path.join(os.tmpdir(), "prism-uploads");

  // Ensure upload dir exists
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // POST /api/v1/upload — Accept file upload (base64-encoded in JSON body)
  // Note: For production, use multer. This works without additional deps.
  router.post("/", async (req, res, next): Promise<void> => {
    try {
      const { filename, content_base64, content_text, file_type } = req.body;

      if (!filename && !content_text) {
        res.status(400).json({ error: "Provide filename + content_base64, or content_text" });
        return;
      }

      let filePath: string | undefined;
      let text: string | undefined;

      if (content_base64) {
        // Size guard BEFORE decoding/writing -- reject an oversize payload up front (disk-fill DoS).
        const approxBytes = decodedBase64Bytes(content_base64);
        if (approxBytes > MAX_UPLOAD_BYTES) {
          res.status(413).json({ error: `upload exceeds the ${MAX_UPLOAD_BYTES}-byte limit (${approxBytes} bytes)` });
          return;
        }
        // Save base64 file to temp directory
        const safeName = (filename || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
        filePath = path.join(UPLOAD_DIR, `${Date.now()}_${safeName}`);
        fs.writeFileSync(filePath, Buffer.from(content_base64, "base64"));
      } else if (content_text) {
        text = content_text;
      }

      // Determine processing based on file type
      const ext = path.extname(filename || "").toLowerCase();
      const type = file_type || ext.replace(".", "") || "unknown";

      const result: Record<string, unknown> = {
        uploaded: true,
        file_type: type,
        file_path: filePath,
      };

      // If it's G-code, run through parser
      if (type === "nc" || type === "gcode" || type === "tap" || type === "ngc" || ext === ".nc") {
        const gcode = text || (filePath ? fs.readFileSync(filePath, "utf-8") : "");
        result.line_count = gcode.split("\n").length;
        result.gcode_preview = gcode.slice(0, 500);
      }

      // If it's a DXF, note it for CAD import
      if (type === "dxf" || ext === ".dxf") {
        result.cad_type = "dxf";
        result.ready_for_import = true;
      }

      // If it's STEP/IGES
      if (["step", "stp", "iges", "igs"].includes(type) || [".step", ".stp", ".iges", ".igs"].includes(ext)) {
        result.cad_type = "step";
        result.ready_for_import = true;
      }

      // If it's a PDF (blueprint)
      if (type === "pdf" || ext === ".pdf") {
        result.document_type = "blueprint";
        result.ready_for_ocr = true;
      }

      // If it's an image (photo of blueprint)
      if (["jpg", "jpeg", "png", "bmp", "tiff"].includes(type) || [".jpg", ".jpeg", ".png"].includes(ext)) {
        result.document_type = "photo";
        result.ready_for_ocr = true;
      }

      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/upload/types — List supported file types
  router.get("/types", (_req, res) => {
    res.json({
      supported: [
        { extension: ".nc/.gcode/.tap", type: "gcode", description: "CNC program files" },
        { extension: ".dxf", type: "cad", description: "2D CAD drawings" },
        { extension: ".step/.stp", type: "cad", description: "3D CAD models" },
        { extension: ".iges/.igs", type: "cad", description: "3D CAD models (legacy)" },
        { extension: ".pdf", type: "blueprint", description: "Engineering drawings" },
        { extension: ".jpg/.png", type: "photo", description: "Photos of blueprints" },
      ],
    });
  });

  return router;
}
