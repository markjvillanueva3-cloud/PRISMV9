/**
 * DNCFileTransferEngine
 * =======================
 *
 * Direct-Numerical-Control file transfer protocol adapter for moving NC
 * programs from PRISM to shop-floor controllers.
 *
 * Protocols supported:
 *   - RS232 serial (XON/XOFF handshake, drip-feed for memory-limited controls)
 *   - FTP (Okuma/Mazak/Mori plant network stations)
 *   - USB filesystem drop (Haas NGC, Fanuc 30i+)
 *   - Ethernet share (SMB/NFS for Okuma OSP, Siemens 840D sl)
 *
 * Control-specific framing:
 *   - Fanuc: %<LF> start, %<LF> end, DC3 pause/DC1 resume for drip-feed
 *   - Okuma OSP: G291 start frame, M02 end frame
 *   - Mitsubishi M700/M80: O<number> followed by block numbers
 *   - Haas NGC: % start, % end (standard ISO framing)
 *   - Siemens 840D sl: %_N_<name>_MPF header
 *
 * Size and sanity checks:
 *   - Reject files > 4 MB for RS232 (transfer time > 45min @ 9600 baud)
 *   - Reject non-ASCII bytes for serial (control mangles them)
 *   - Warn on long block numbers (> N99999) for legacy Fanuc
 *
 * Distinct from existing:
 *   - PostProcessorEngine: generates the NC, doesn't transfer
 *   - JobTravelerEngine: paper routing, not the program itself
 *   - This engine: protocol-level file delivery + framing
 *
 * References:
 *   - Fanuc 0i-MF DNC Operator's Manual §11 (drip-feed flow control)
 *   - Okuma OSP Parameter Manual (DNC-B vs DNC-T vs tape input)
 *   - ISO 1055 punched-tape format (legacy standard, still used by RS232)
 *
 * @module engines/DNCFileTransferEngine
 * @milestone LATHE-PRO-MS11
 */

export type DNCProtocol = "rs232" | "ftp" | "usb" | "ethernet_share";
export type ControllerFamily = "fanuc" | "okuma_osp" | "mitsubishi" | "haas_ngc" | "siemens_840d";

export interface DNCTransferRequest {
  /** Program text (NC source) */
  program: string;
  /** Destination protocol */
  protocol: DNCProtocol;
  /** Controller family (selects framing) */
  controller: ControllerFamily;
  /** Program number (O-word / MPF name) */
  program_number: number;
  /** Baud rate (RS232 only; default 9600) */
  baud?: number;
  /** Max file size bytes (default 4 MB) */
  max_size_bytes?: number;
}

export interface DNCTransferPlan {
  framed_program: string;
  estimated_transfer_seconds: number;
  checks: Array<{ check: string; ok: boolean; note?: string }>;
  warnings: string[];
  header_bytes: number;
  trailer_bytes: number;
  total_bytes: number;
}

class DNCFileTransferEngineImpl {
  buildTransfer(req: DNCTransferRequest): DNCTransferPlan {
    const warnings: string[] = [];
    const checks: DNCTransferPlan["checks"] = [];
    const maxBytes = req.max_size_bytes ?? 4 * 1024 * 1024;
    const baud = req.baud ?? 9600;

    // Size check
    const rawBytes = Buffer.byteLength(req.program, "utf8");
    checks.push({
      check: "file_size_under_limit",
      ok: rawBytes <= maxBytes,
      note: `${rawBytes} / ${maxBytes} bytes`,
    });

    // ASCII check for serial
    if (req.protocol === "rs232") {
      const nonAscii = /[^\x00-\x7F]/.test(req.program);
      checks.push({
        check: "ascii_clean_for_serial",
        ok: !nonAscii,
        note: nonAscii ? "non-ASCII bytes present — serial transfer will mangle" : undefined,
      });
    }

    // Block number length check (legacy Fanuc)
    if (req.controller === "fanuc") {
      const longN = /N\d{6,}/.test(req.program);
      if (longN) warnings.push("Block numbers exceed N99999 — some legacy Fanuc 0 controls will overflow");
    }

    // Add framing
    let header = "";
    let trailer = "";
    switch (req.controller) {
      case "fanuc":
        header = `%\nO${String(req.program_number).padStart(4, "0")}\n`;
        trailer = `\n%\n`;
        break;
      case "okuma_osp":
        header = `G291\n`;
        trailer = `\nM02\n`;
        break;
      case "mitsubishi":
        header = `O${req.program_number}\n`;
        trailer = `\nM30\n`;
        break;
      case "haas_ngc":
        header = `%\nO${req.program_number} (DNC)\n`;
        trailer = `\nM30\n%\n`;
        break;
      case "siemens_840d":
        header = `%_N_PROG_${req.program_number}_MPF\n`;
        trailer = `\nM30\n`;
        break;
    }

    const framed = header + req.program.trim() + trailer;
    const totalBytes = Buffer.byteLength(framed, "utf8");

    // Estimate transfer time
    let transferSec = 0;
    if (req.protocol === "rs232") {
      // 10 bits per byte (1 start + 8 data + 1 stop), typical 60% duty for XON/XOFF
      transferSec = (totalBytes * 10) / (baud * 0.6);
    } else if (req.protocol === "ftp") {
      transferSec = totalBytes / (100 * 1024); // ~100 KB/s plant net
    } else if (req.protocol === "usb") {
      transferSec = totalBytes / (1024 * 1024); // ~1 MB/s USB 2.0 worst-case
    } else if (req.protocol === "ethernet_share") {
      transferSec = totalBytes / (5 * 1024 * 1024); // ~5 MB/s SMB
    }

    if (req.protocol === "rs232" && transferSec > 2700) {
      warnings.push(`Serial transfer > 45 min at ${baud} baud — consider drip-feed or faster protocol`);
    }

    return {
      framed_program: framed,
      estimated_transfer_seconds: round2(transferSec),
      checks,
      warnings,
      header_bytes: Buffer.byteLength(header, "utf8"),
      trailer_bytes: Buffer.byteLength(trailer, "utf8"),
      total_bytes: totalBytes,
    };
  }

  getStats(): { protocols: DNCProtocol[]; controllers: ControllerFamily[] } {
    return {
      protocols: ["rs232", "ftp", "usb", "ethernet_share"],
      controllers: ["fanuc", "okuma_osp", "mitsubishi", "haas_ngc", "siemens_840d"],
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const dncFileTransferEngine = new DNCFileTransferEngineImpl();
export type { DNCFileTransferEngineImpl };
