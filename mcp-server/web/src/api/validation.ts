/**
 * DocumentInboxEngine — Unified document intake, classification, and part matching
 *
 * The "DocuRead" engine for PRISM: accepts any manufacturing document
 * (blueprint photo, PO, invoice, packing slip, material cert, quote request)
 * and automatically:
 *   1. Classifies document type via Claude Vision or text analysis
 *   2. Extracts key fields (part numbers, quantities, materials, amounts)
 *   3. Matches to existing PartsLibrary records
 *   4. Links the file via FileStorageEngine
 *   5. Routes to downstream engines (OCR for prints, PO engine for POs, etc.)
 *   6. Creates inbox entries with status tracking
 *
 * This replaces DocuRead (Evernote replacement) within PRISM, giving the shop
 * a single intake for all documents matched to part numbers and programs.
 *
 * Actions:
 *   inbox_ingest       — Accept and classify a new document
 *   inbox_list         — List inbox items with filters
 *   inbox_get          — Get a single inbox item with all extracted data
 *   inbox_match_part   — Manually match/override part number link
 *   inbox_batch_ingest — Accept multiple documents at once
 *   inbox_search       — Full-text search across all ingested documents
 *   inbox_stats        — Dashboard statistics
 *   inbox_update_status — Update processing status
 *
 * @module engines/DocumentInboxEngine
 * @version 1.0.0
 */
import { log } from "../utils/Logger.js";
import { blueprintVisionOCREngine } from "./BlueprintVisionOCREngine.js";
import { partsLibraryEngine } from "./PartsLibraryEngine.js";
import { fileStorageEngine } from "./FileStorageEngine.js";
// ============================================================================
// CLASSIFICATION PATTERNS
// ============================================================================
/** Keywords that indicate document type from filename or extracted text */
const CLASSIFICATION_PATTERNS = {
    blueprint: [
        /\bdrawing\b/i, /\bprint\b/i, /\bblueprint\b/i, /\bDWG\b/,
        /\brev\s*[A-Z0-9]/i, /\bscale\s*[:=]/i, /\btolerances?\b/i,
        /\bGD&?T\b/i, /\bsection\s+[A-Z]-[A-Z]/i, /\bdetail\s+[A-Z]/i,
        /\.dxf$/i, /\.dwg$/i, /\bsheet\s+\d+\s+of\s+\d+/i,
    ],
    purchase_order: [
        /\bpurchase\s*order\b/i, /\bP\.?O\.?\s*#?\s*\d/i, /\bPO\s*number/i,
        /\border\s*confirmation\b/i, /\bship\s*to\b/i, /\bbill\s*to\b/i,
        /\bline\s*items?\b/i, /\border\s*date\b/i,
    ],
    invoice: [
        /\binvoice\b/i, /\bINV[\s-]*#?\s*\d/i, /\bamount\s*due\b/i,
        /\bbalance\s*due\b/i, /\bpayment\s*terms?\b/i, /\bnet\s*\d+\b/i,
        /\btax\b/i, /\bsubtotal\b/i, /\bremit\s*to\b/i,
    ],
    packing_slip: [
        /\bpacking\s*slip\b/i, /\bpacking\s*list\b/i, /\bshipping\s*note\b/i,
        /\bBOL\b/, /\bbill\s*of\s*lading\b/i, /\bshipment\b/i,
        /\btracking\s*#?\s*\d/i, /\bfreight\b/i,
    ],
    material_cert: [
        /\bmill\s*cert/i, /\bmaterial\s*cert/i, /\btest\s*cert/i,
        /\bcertificate\s*of\s*conformance\b/i, /\bCofC\b/i, /\bMTR\b/,
        /\bheat\s*number\b/i, /\bchemical\s*analysis\b/i,
        /\bmechanical\s*properties\b/i, /\byield\s*strength\b/i,
    ],
    quote_request: [
        /\bRFQ\b/i, /\brequest\s*for\s*quot/i, /\bquote\s*request\b/i,
        /\bplease\s*quote\b/i, /\bquotation\b/i, /\bbid\s*request\b/i,
    ],
    setup_sheet: [
        /\bsetup\s*sheet\b/i, /\bjob\s*setup\b/i, /\btool\s*list\b/i,
        /\bfixture\b/i, /\bwork\s*offset\b/i, /\bG5[4-9]\b/,
        /\btool\s*#?\s*\d/i, /\bvise\b/i,
    ],
    inspection: [
        /\binspection\s*report\b/i, /\bCMM\b/, /\bfirst\s*article\b/i,
        /\bFAI\b/, /\bAS\s*9102\b/i, /\bdimensional\s*report\b/i,
        /\bPPAP\b/i, /\bmeasurement\b/i,
    ],
    program: [
        /\b[OG]\d{2,4}\b/, /\bM0[0-9]\b/, /\bG[04][012]\b/,
        /\.nc$/i, /\.tap$/i, /\.mpf$/i, /\.cnc$/i,
        /\bprogram\s*#?\s*\d/i, /\bN\d+\s*G/,
    ],
    photo: [
        /\bphoto\b/i, /\bpicture\b/i, /\bimage\b/i, /\bIMG_/i,
        /\bDSC_/i, /\bscreenshot\b/i,
    ],
    correspondenc