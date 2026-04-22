/**
 * Frontend Feature Audit Hook
 *
 * CRITICAL ENFORCEMENT: Before creating ANY new frontend page, this hook requires:
 * 1. Check existing 102+ pages for similar functionality
 * 2. Analyze existing pages for gaps and improvement opportunities
 * 3. Document coverage mapping (what exists vs what's needed)
 * 4. Only create new pages for genuinely new functionality not covered anywhere
 *
 * This hook blocks new page creation if:
 * - Existing page covers >50% of requested functionality
 * - Gap analysis was not performed
 * - Calculator Studio design language is not followed
 *
 * @module frontendFeatureAuditHook
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface PageCoverageReport {
  requestedPage: string;
  existingPages: ExistingPageMatch[];
  coveragePercent: number;
  gapAnalysis: GapItem[];
  recommendation: 'create_new' | 'enhance_existing' | 'blocked';
  blockedReason?: string;
}

export interface ExistingPageMatch {
  pageName: string;
  filePath: string;
  lineCount: number;
  features: string[];
  coveragePercent: number;
  improvementOpportunities: string[];
}

export interface GapItem {
  id: string;
  description: string;
  missingIn: string;
  priority: 'high' | 'medium' | 'low';
  implementationHint: string;
}

// Keywords mapped to page functionality
const PAGE_FUNCTIONALITY_MAP: Record<string, string[]> = {
  // Machine Monitoring
  'machine-live': ['ShopFloorLivePage', 'OEEDashboardPage', 'ShopFloorTVPage', 'PreventiveMaintenancePage'],
  'machine-status': ['ShopFloorLivePage', 'OEEDashboardPage'],
  'adaptive-control': ['ShopFloorLivePage', 'ToolOptimizationPage'],
  'predictive-maintenance': ['PreventiveMaintenancePage', 'MaintenanceWorkOrderPage'],
  'digital-twin': ['ShopFloorLivePage'],

  // Diagnosis & Troubleshooting
  'diagnosis': ['RootCausePage', 'A3ReportPage'],
  'forensics': ['RootCausePage'],
  'inverse-solver': ['CalculatorPage', 'ToolOptimizationPage'],
  'process-generator': ['PostProcessorGeneratorPage', 'ToolpathAdvisorPage'],
  'sustainability': ['ReportsPage'],

  // CNC Operations
  'cnc-ops': ['PostProcessorPage', 'PostProcessorGeneratorPage', 'SetupSheetPage'],
  'program-assembly': ['PostProcessorPage', 'ProgramReleasePage'],
  'motion-profile': ['ToolpathAdvisorPage', 'CycleTimePage'],
  'tool-magazine': ['ToolOptimizationPage', 'InventoryPage'],

  // Knowledge & Learning
  'knowledge': ['KnowledgeBrowserPage', 'KnowledgeIngestionPage', 'DocumentLearningPage'],
  'apprentice': ['LearningDashboard', 'AILearningDashboardPage', 'FleetLearningDashboardPage'],
  'knowledge-graph': ['KnowledgeBrowserPage'],

  // Vibration & Physics
  'vibration': ['CalculatorPage'],
  'chatter': ['CalculatorPage', 'ToolOptimizationPage'],
  'stability-lobes': ['CalculatorPage'],

  // Thermal & Fluid
  'thermal': ['CalculatorPage'],
  'heat-exchanger': ['CalculatorPage'],
  'coolant': ['CalculatorPage'],

  // Integration
  'integrations': ['IntegrationsPage'],
  'cam-integration': ['IntegrationsPage', 'PostProcessorPage'],
  'dnc': ['IntegrationsPage', 'ProgramReleasePage'],
  'erp': ['IntegrationsPage'],

  // EDM
  'edm': ['WireEdmWizardPage', 'WireEdmUploadPage', 'WireEdmResultsPage'],
  'wire-edm': ['WireEdmWizardPage', 'WireEdmUploadPage', 'WireEdmResultsPage'],
  'sinker-edm': [],  // Gap - needs enhancement

  // Turning
  'turning': ['LatheWizardPage', 'LatheUploadPage', 'LatheResultsPage'],

  // Grinding
  'grinding': [], // Gap - needs new page

  // Forming & Casting
  'forming': ['SheetMetalQuotePage', 'InjectionMoldPage'],
  'sheet-metal': ['SheetMetalQuotePage'],
  'casting': [], // Gap - needs new page
  'injection-molding': ['InjectionMoldPage'],

  // Welding
  'welding': [], // Gap - needs new page

  // Settings
  'settings': ['ShopProfilePage'],
};

/**
 * Analyzes existing pages to find coverage for a requested feature
 */
export function analyzeExistingPageCoverage(
  requestedFeature: string,
  webSrcPath: string = 'web/src/pages'
): PageCoverageReport {
  const featureKeywords = requestedFeature.toLowerCase().split(/[\s_-]+/);
  const matchedPages: ExistingPageMatch[] = [];

  // Find matching pages based on keywords
  for (const keyword of featureKeywords) {
    const potentialPages = PAGE_FUNCTIONALITY_MAP[keyword] ?? [];
    for (const pageName of potentialPages) {
      const filePath = join(webSrcPath, `${pageName}.tsx`);
      if (existsSync(filePath) && !matchedPages.find(p => p.pageName === pageName)) {
        const content = readFileSync(filePath, 'utf-8');
        const lineCount = content.split('\n').length;

        matchedPages.push({
          pageName,
          filePath,
          lineCount,
          features: extractFeatures(content),
          coveragePercent: calculateCoverage(featureKeywords, content),
          improvementOpportunities: findImprovementOpportunities(content, featureKeywords),
        });
      }
    }
  }

  // Sort by coverage
  matchedPages.sort((a, b) => b.coveragePercent - a.coveragePercent);

  const topCoverage = matchedPages[0]?.coveragePercent ?? 0;
  const gapAnalysis = identifyGaps(featureKeywords, matchedPages);

  let recommendation: 'create_new' | 'enhance_existing' | 'blocked';
  let blockedReason: string | undefined;

  if (topCoverage >= 70) {
    recommendation = 'enhance_existing';
    blockedReason = `Existing page "${matchedPages[0].pageName}" covers ${topCoverage}% of functionality. Enhance this page instead of creating new.`;
  } else if (topCoverage >= 40) {
    recommendation = 'enhance_existing';
  } else if (gapAnalysis.length === 0) {
    recommendation = 'blocked';
    blockedReason = 'No gaps identified - functionality may already exist. Run deeper audit.';
  } else {
    recommendation = 'create_new';
  }

  return {
    requestedPage: requestedFeature,
    existingPages: matchedPages,
    coveragePercent: topCoverage,
    gapAnalysis,
    recommendation,
    blockedReason,
  };
}

function extractFeatures(content: string): string[] {
  const features: string[] = [];

  // Extract tab names
  const tabMatch = content.match(/TabButton.*?label=["']([^"']+)["']/g);
  if (tabMatch) {
    features.push(...tabMatch.map(m => m.match(/label=["']([^"']+)["']/)?.[1] ?? ''));
  }

  // Extract section headings
  const headingMatch = content.match(/<h[123][^>]*>([^<]+)</g);
  if (headingMatch) {
    features.push(...headingMatch.map(m => m.replace(/<h[123][^>]*>/, '').replace('<', '')));
  }

  // Extract API endpoints
  const apiMatch = content.match(/\/api\/v1\/[^\s'"]+/g);
  if (apiMatch) {
    features.push(...apiMatch);
  }

  return [...new Set(features)].filter(Boolean);
}

function calculateCoverage(keywords: string[], content: string): number {
  const contentLower = content.toLowerCase();
  let matchCount = 0;

  for (const keyword of keywords) {
    if (contentLower.includes(keyword)) {
      matchCount++;
    }
  }

  return Math.round((matchCount / keywords.length) * 100);
}

function findImprovementOpportunities(content: string, keywords: string[]): string[] {
  const opportunities: string[] = [];

  // Check for missing Calculator Studio design elements
  if (!content.includes('prism-glow-')) {
    opportunities.push('Add PRISM glow effects (prism-glow-cyan/emerald/amber/red/violet)');
  }
  if (!content.includes('prism-chip')) {
    opportunities.push('Add prism-chip status badges');
  }
  if (!content.includes('prism-spectrum-fill')) {
    opportunities.push('Add prism-spectrum-fill progress bars');
  }
  if (!content.includes('prism-led-sweep')) {
    opportunities.push('Add prism-led-sweep animated effects');
  }

  // Check for missing API integration
  if (!content.includes('/api/v1/')) {
    opportunities.push('Add backend API integration');
  }

  // Check for missing hooks
  if (!content.includes('use') && !content.includes('useState')) {
    opportunities.push('Add React hooks for state management');
  }

  // Check for keyword-specific missing features
  for (const keyword of keywords) {
    if (!content.toLowerCase().includes(keyword)) {
      opportunities.push(`Add ${keyword} functionality`);
    }
  }

  return opportunities;
}

function identifyGaps(keywords: string[], matchedPages: ExistingPageMatch[]): GapItem[] {
  const gaps: GapItem[] = [];
  const coveredFeatures = new Set<string>();

  for (const page of matchedPages) {
    for (const feature of page.features) {
      coveredFeatures.add(feature.toLowerCase());
    }
  }

  for (const keyword of keywords) {
    if (!coveredFeatures.has(keyword)) {
      gaps.push({
        id: `gap-${keyword}`,
        description: `Missing ${keyword} functionality`,
        missingIn: matchedPages.map(p => p.pageName).join(', ') || 'all pages',
        priority: keyword.includes('calc') || keyword.includes('core') ? 'high' : 'medium',
        implementationHint: `Add ${keyword} tab/section to existing page or create dedicated component`,
      });
    }
  }

  return gaps;
}

/**
 * Pre-commit hook: Run before any frontend page creation
 */
export function runFrontendAuditHook(
  proposedPageName: string,
  proposedFeatures: string[]
): { allow: boolean; report: PageCoverageReport; action: string } {
  const report = analyzeExistingPageCoverage(proposedFeatures.join(' '));

  if (report.recommendation === 'blocked') {
    return {
      allow: false,
      report,
      action: `BLOCKED: ${report.blockedReason}`,
    };
  }

  if (report.recommendation === 'enhance_existing') {
    const topPage = report.existingPages[0];
    return {
      allow: false,
      report,
      action: `REDIRECT: Enhance ${topPage.pageName} (${topPage.coveragePercent}% coverage). Gaps: ${report.gapAnalysis.map(g => g.description).join(', ')}`,
    };
  }

  return {
    allow: true,
    report,
    action: `ALLOW: Create new page "${proposedPageName}". Gaps identified: ${report.gapAnalysis.length}`,
  };
}

/**
 * Generate coverage audit for WIRE-MS0 units
 */
export function generateWireMS0CoverageAudit(): Record<string, PageCoverageReport> {
  const units: Record<string, string[]> = {
    'P0-U02-machine-live': ['machine-live', 'machine-status', 'adaptive-control', 'predictive-maintenance', 'digital-twin'],
    'P0-U03-diagnosis': ['diagnosis', 'forensics', 'inverse-solver', 'process-generator', 'sustainability'],
    'P1-U01-cnc-ops': ['cnc-ops', 'program-assembly', 'motion-profile', 'tool-magazine'],
    'P1-U02-knowledge': ['knowledge', 'apprentice', 'knowledge-graph'],
    'P1-U03-vibration': ['vibration', 'chatter', 'stability-lobes'],
    'P1-U04-thermal': ['thermal', 'heat-exchanger', 'coolant'],
    'P1-U05-integrations': ['integrations', 'cam-integration', 'dnc', 'erp'],
    'P2-U01-edm': ['edm', 'wire-edm', 'sinker-edm'],
    'P2-U02-turning': ['turning'],
    'P2-U03-grinding': ['grinding'],
    'P2-U04-forming': ['forming', 'sheet-metal', 'casting', 'injection-molding'],
    'P2-U05-welding': ['welding'],
  };

  const audit: Record<string, PageCoverageReport> = {};

  for (const [unitId, features] of Object.entries(units)) {
    audit[unitId] = analyzeExistingPageCoverage(features.join(' '));
  }

  return audit;
}

export const frontendFeatureAuditHook = {
  name: 'frontend-feature-audit',
  description: 'Enforces gap analysis before creating new frontend pages',
  analyze: analyzeExistingPageCoverage,
  run: runFrontendAuditHook,
  auditWireMS0: generateWireMS0CoverageAudit,
};
