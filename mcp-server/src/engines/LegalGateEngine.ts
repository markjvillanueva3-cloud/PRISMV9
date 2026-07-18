// WIRE-EXEMPT: Tests at __tests__/engines/LegalGateEngine.test.ts (41 tests), dispatcher at securityDispatcher.ts
/**
 * LegalGateEngine.ts — CAM-UIX-INFRA-00/U-LEGAL-GATES01
 *
 * Consolidated legal compliance gates for CAM-UIX ingestion:
 * - Customer consent verification
 * - Export control (ITAR/EAR) screening
 * - Patent cleanroom isolation
 * - DMCA agent registration
 * - Standards license verification
 *
 * All gates return { allowed: boolean, reason: string, auditRef: string }
 */
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Types
// ============================================================================

export interface GateResult {
  allowed: boolean;
  reason: string;
  auditRef: string;
  gateType: LegalGateType;
  timestamp: string;
}

export type LegalGateType =
  | "customer_consent"
  | "export_control"
  | "patent_cleanroom"
  | "dmca"
  | "standards_license";

export type ConsentStatus = "granted" | "pending" | "denied" | "revoked" | "not_requested";

export interface CustomerConsent {
  display_name: string;
  consent_status: ConsentStatus;
  consents_granted: string[];
  consent_date: string | null;
  consent_method: string | null;
  consent_document_ref: string | null;
  revocation_date: string | null;
  programs_in_scope: number;
  notes?: string;
}

export interface ExportControlClassification {
  customer_id: string;
  itar_controlled: boolean;
  ear_controlled: boolean;
  usml_category?: string;
  eccn?: string;
  license_exception?: string;
  last_review_date: string;
  reviewer: string;
}

export interface PatentRecord {
  patent_number: string;
  title: string;
  holder: string;
  status: "active" | "expired" | "pending_review";
  affected_features: string[];
  cleanroom_required: boolean;
  workaround_available: boolean;
  notes?: string;
}

export interface StandardLicense {
  title: string;
  body: string;
  license_type: string;
  license_status: string;
  abstract_ingested: boolean;
  full_text_ingested: boolean;
}

// ============================================================================
// LegalGateEngine
// ============================================================================

export class LegalGateEngine {
  private static instance: LegalGateEngine;
  private consentsPath: string;
  private standardsPath: string;
  private auditLogPath: string;
  private consentsCache: Record<string, CustomerConsent> | null = null;
  private standardsCache: Record<string, StandardLicense> | null = null;

  // Known export-controlled customers (simplified — real impl would query external DB)
  private exportControlledCustomers: Map<string, ExportControlClassification> = new Map();

  // Known patent blocks
  private patentBlocks: Map<string, PatentRecord> = new Map([
    [
      "US_8489224",
      {
        patent_number: "US 8,489,224",
        title: "Morphed spiral toolpath method",
        holder: "SolidCAM",
        status: "active",
        affected_features: ["imachining", "imachining_3d", "morphed_spiral"],
        cleanroom_required: true,
        workaround_available: true,
        notes: "Use PRISM Forces (physics-based adaptive clearing) instead — Kienzle force prediction + engagement dynamics, no patent conflict",
      },
    ],
  ]);

  private constructor() {
    const dataRoot = process.cwd().includes("mcp-server")
      ? process.cwd()
      : path.join(process.cwd(), "mcp-server");

    this.consentsPath = path.join(dataRoot, "data/state/customer-consents.json");
    this.standardsPath = path.join(dataRoot, "data/state/standards-licenses.json");
    this.auditLogPath = path.join(dataRoot, "data/ingestion_cache/legal_audit.ndjson");

    // Initialize export control classifications
    this.exportControlledCustomers.set("alcoa", {
      customer_id: "alcoa",
      itar_controlled: true,
      ear_controlled: true,
      usml_category: "Category XI — Military Electronics",
      eccn: "9E003",
      license_exception: undefined,
      last_review_date: "2026-01-15",
      reviewer: "legal_team",
    });
  }

  public static getInstance(): LegalGateEngine {
    if (!LegalGateEngine.instance) {
      LegalGateEngine.instance = new LegalGateEngine();
    }
    return LegalGateEngine.instance;
  }

  // ==========================================================================
  // Customer Consent Gate
  // ==========================================================================

  /**
   * Check if a customer has granted consent for AI training use
   */
  public async checkCustomerConsent(
    customerId: string,
    consentType: string = "ai_training"
  ): Promise<GateResult> {
    const auditRef = `CONSENT-${Date.now()}-${customerId}`;
    const timestamp = new Date().toISOString();

    try {
      const consents = await this.loadConsents();
      const customer = consents[customerId];

      if (!customer) {
        const result: GateResult = {
          allowed: false,
          reason: `Unknown customer: ${customerId}. Customer must be registered before ingestion.`,
          auditRef,
          gateType: "customer_consent",
          timestamp,
        };
        await this.logAudit(result, { customerId, consentType });
        return result;
      }

      if (customer.consent_status !== "granted") {
        const result: GateResult = {
          allowed: false,
          reason: `Customer ${customer.display_name} consent status is '${customer.consent_status}', not 'granted'.`,
          auditRef,
          gateType: "customer_consent",
          timestamp,
        };
        await this.logAudit(result, { customerId, consentType, status: customer.consent_status });
        return result;
      }

      if (!customer.consents_granted.includes(consentType)) {
        const result: GateResult = {
          allowed: false,
          reason: `Customer ${customer.display_name} has not granted '${consentType}' consent. Granted: [${customer.consents_granted.join(", ")}]`,
          auditRef,
          gateType: "customer_consent",
          timestamp,
        };
        await this.logAudit(result, { customerId, consentType, granted: customer.consents_granted });
        return result;
      }

      const result: GateResult = {
        allowed: true,
        reason: `Customer ${customer.display_name} has granted '${consentType}' consent (${customer.consent_date}).`,
        auditRef,
        gateType: "customer_consent",
        timestamp,
      };
      await this.logAudit(result, { customerId, consentType });
      return result;
    } catch (error) {
      const result: GateResult = {
        allowed: false,
        reason: `Consent check failed: ${error instanceof Error ? error.message : String(error)}`,
        auditRef,
        gateType: "customer_consent",
        timestamp,
      };
      await this.logAudit(result, { customerId, consentType, error: true });
      return result;
    }
  }

  // ==========================================================================
  // Export Control Gate
  // ==========================================================================

  /**
   * Check if customer data is subject to ITAR/EAR export controls
   */
  public checkExportControl(customerId: string): GateResult {
    const auditRef = `EXPORT-${Date.now()}-${customerId}`;
    const timestamp = new Date().toISOString();

    const classification = this.exportControlledCustomers.get(customerId);

    if (!classification) {
      return {
        allowed: true,
        reason: `Customer ${customerId} has no export control restrictions on file.`,
        auditRef,
        gateType: "export_control",
        timestamp,
      };
    }

    if (classification.itar_controlled) {
      return {
        allowed: false,
        reason: `BLOCKED: Customer ${customerId} is ITAR-controlled (${classification.usml_category}). Technical data cannot be used for AI training without State Department license.`,
        auditRef,
        gateType: "export_control",
        timestamp,
      };
    }

    if (classification.ear_controlled && !classification.license_exception) {
      return {
        allowed: false,
        reason: `BLOCKED: Customer ${customerId} is EAR-controlled (ECCN ${classification.eccn}) with no license exception.`,
        auditRef,
        gateType: "export_control",
        timestamp,
      };
    }

    return {
      allowed: true,
      reason: `Customer ${customerId} EAR-controlled but license exception ${classification.license_exception} applies.`,
      auditRef,
      gateType: "export_control",
      timestamp,
    };
  }

  // ==========================================================================
  // Patent Cleanroom Gate
  // ==========================================================================

  /**
   * Check if a feature requires patent cleanroom isolation
   */
  public checkPatentCleanroom(featureName: string): GateResult {
    const auditRef = `PATENT-${Date.now()}-${featureName}`;
    const timestamp = new Date().toISOString();
    const normalizedFeature = featureName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    for (const [patentId, patent] of this.patentBlocks) {
      if (patent.status !== "active") continue;

      const isAffected = patent.affected_features.some(
        (f) => normalizedFeature.includes(f) || f.includes(normalizedFeature)
      );

      if (isAffected && patent.cleanroom_required) {
        const workaroundMsg = patent.workaround_available
          ? "Use PRISM Forces (physics-based adaptive clearing) instead."
          : "";
        return {
          allowed: false,
          reason: `BLOCKED: Feature '${featureName}' potentially infringes ${patent.patent_number} (${patent.title}). Cleanroom implementation required. ${workaroundMsg}`,
          auditRef,
          gateType: "patent_cleanroom",
          timestamp,
        };
      }
    }

    return {
      allowed: true,
      reason: `Feature '${featureName}' has no patent blocks.`,
      auditRef,
      gateType: "patent_cleanroom",
      timestamp,
    };
  }

  /**
   * Get list of all active patent blocks
   */
  public getActivePatentBlocks(): PatentRecord[] {
    return Array.from(this.patentBlocks.values()).filter((p) => p.status === "active");
  }

  // ==========================================================================
  // DMCA Gate
  // ==========================================================================

  /**
   * Check DMCA compliance for content ingestion
   */
  public checkDMCACompliance(sourceUrl: string, contentType: string): GateResult {
    const auditRef = `DMCA-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Check for known DMCA-problematic sources
    const blockedDomains = [
      "sci-hub.se",
      "libgen.is",
      "z-library.org",
      // Add other known infringing sources
    ];

    try {
      const url = new URL(sourceUrl);
      const isBlocked = blockedDomains.some((d) => url.hostname.includes(d));

      if (isBlocked) {
        return {
          allowed: false,
          reason: `BLOCKED: Source ${url.hostname} is on DMCA block list. Use official/licensed sources only.`,
          auditRef,
          gateType: "dmca",
          timestamp,
        };
      }

      // Check content type for DRM indicators
      const drmContentTypes = ["application/x-silverlight", "video/x-ms-wmv"];
      if (drmContentTypes.includes(contentType)) {
        return {
          allowed: false,
          reason: `BLOCKED: Content type '${contentType}' suggests DRM protection. DMCA §1201 prohibits circumvention.`,
          auditRef,
          gateType: "dmca",
          timestamp,
        };
      }

      return {
        allowed: true,
        reason: `Source ${sourceUrl} passes DMCA compliance checks.`,
        auditRef,
        gateType: "dmca",
        timestamp,
      };
    } catch {
      return {
        allowed: false,
        reason: `Invalid URL format: ${sourceUrl}`,
        auditRef,
        gateType: "dmca",
        timestamp,
      };
    }
  }

  // ==========================================================================
  // Standards License Gate
  // ==========================================================================

  /**
   * Check if we have license to ingest a standards document
   */
  public async checkStandardsLicense(
    standardId: string,
    extractionType: "abstract" | "full_text"
  ): Promise<GateResult> {
    const auditRef = `STANDARD-${Date.now()}-${standardId}`;
    const timestamp = new Date().toISOString();

    try {
      const standards = await this.loadStandards();
      const standard = standards[standardId];

      if (!standard) {
        return {
          allowed: false,
          reason: `Unknown standard: ${standardId}. Add to standards-licenses.json before ingestion.`,
          auditRef,
          gateType: "standards_license",
          timestamp,
        };
      }

      if (extractionType === "abstract") {
        // Abstracts are generally allowed
        return {
          allowed: true,
          reason: `Abstract extraction allowed for ${standard.title} (${standard.body}).`,
          auditRef,
          gateType: "standards_license",
          timestamp,
        };
      }

      // Full text requires appropriate license
      if (standard.license_status !== "owned" && standard.license_type !== "public_abstract" && standard.license_type !== "withdrawn_free") {
        return {
          allowed: false,
          reason: `BLOCKED: No license for full text of ${standardId} (${standard.title}). License type: ${standard.license_type}, status: ${standard.license_status}.`,
          auditRef,
          gateType: "standards_license",
          timestamp,
        };
      }

      return {
        allowed: true,
        reason: `Full text extraction allowed for ${standard.title} (license: ${standard.license_type}).`,
        auditRef,
        gateType: "standards_license",
        timestamp,
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Standards license check failed: ${error instanceof Error ? error.message : String(error)}`,
        auditRef,
        gateType: "standards_license",
        timestamp,
      };
    }
  }

  // ==========================================================================
  // Combined Gate Check
  // ==========================================================================

  /**
   * Run all applicable legal gates for an ingestion request
   */
  public async checkAllGates(params: {
    customerId?: string;
    sourceUrl?: string;
    contentType?: string;
    featureName?: string;
    standardId?: string;
  }): Promise<{ allPassed: boolean; results: GateResult[] }> {
    const results: GateResult[] = [];

    // Customer consent (if customer specified)
    if (params.customerId) {
      const consentResult = await this.checkCustomerConsent(params.customerId);
      results.push(consentResult);

      // Export control
      const exportResult = this.checkExportControl(params.customerId);
      results.push(exportResult);
    }

    // DMCA (if URL specified)
    if (params.sourceUrl) {
      const dmcaResult = this.checkDMCACompliance(
        params.sourceUrl,
        params.contentType || "text/html"
      );
      results.push(dmcaResult);
    }

    // Patent cleanroom (if feature specified)
    if (params.featureName) {
      const patentResult = this.checkPatentCleanroom(params.featureName);
      results.push(patentResult);
    }

    // Standards license (if standard specified)
    if (params.standardId) {
      const standardResult = await this.checkStandardsLicense(params.standardId, "full_text");
      results.push(standardResult);
    }

    const allPassed = results.every((r) => r.allowed);

    return { allPassed, results };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async loadConsents(): Promise<Record<string, CustomerConsent>> {
    if (this.consentsCache) return this.consentsCache;

    try {
      const content = fs.readFileSync(this.consentsPath, "utf-8");
      const data = JSON.parse(content);
      const loaded: Record<string, CustomerConsent> = data.customers || {};
      this.consentsCache = loaded;
      return loaded;
    } catch {
      return {};
    }
  }

  private async loadStandards(): Promise<Record<string, StandardLicense>> {
    if (this.standardsCache) return this.standardsCache;

    try {
      const content = fs.readFileSync(this.standardsPath, "utf-8");
      const data = JSON.parse(content);
      const loaded: Record<string, StandardLicense> = data.standards || {};
      this.standardsCache = loaded;
      return loaded;
    } catch {
      return {};
    }
  }

  private async logAudit(result: GateResult, context: Record<string, unknown>): Promise<void> {
    try {
      const logEntry = {
        ...result,
        context,
      };
      const logDir = path.dirname(this.auditLogPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(this.auditLogPath, JSON.stringify(logEntry) + "\n");
    } catch {
      // Audit logging failure should not block the gate
    }
  }

  /**
   * Clear caches (for testing)
   */
  public clearCaches(): void {
    this.consentsCache = null;
    this.standardsCache = null;
  }
}

// Export singleton
export const legalGateEngine = LegalGateEngine.getInstance();
