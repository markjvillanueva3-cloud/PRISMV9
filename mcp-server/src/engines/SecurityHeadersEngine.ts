/**
 * SecurityHeadersEngine — U-LPR-SEC09
 *
 * HTTP security headers management:
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Strict-Transport-Security (HSTS)
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC09
 * @phase PHASE-9 (Security + Compliance)
 */

import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'report-uri'?: string[];
  'report-to'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

export interface SecurityHeadersConfig {
  tenantId: string;
  csp: CSPDirectives;
  frameOptions: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;
  xssProtection: '0' | '1' | '1; mode=block';
  referrerPolicy: string;
  permissionsPolicy: Record<string, string[]>;
  reportOnly: boolean;
}

export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'Content-Security-Policy-Report-Only'?: string;
  'X-Frame-Options': string;
  'X-Content-Type-Options'?: string;
  'Strict-Transport-Security'?: string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy'?: string;
}

export interface HeaderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityHeadersStats {
  totalGenerations: number;
  generationsByTenant: Record<string, number>;
  validationErrors: number;
  reportOnlyCount: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SecurityHeadersEngine {
  private configs: Map<string, SecurityHeadersConfig> = new Map();
  private stats: SecurityHeadersStats = {
    totalGenerations: 0,
    generationsByTenant: {},
    validationErrors: 0,
    reportOnlyCount: 0,
  };

  private defaultConfig: Omit<SecurityHeadersConfig, 'tenantId'> = {
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'upgrade-insecure-requests': true,
    },
    frameOptions: 'DENY',
    contentTypeOptions: true,
    hstsMaxAge: 31536000, // 1 year
    hstsIncludeSubdomains: true,
    hstsPreload: false,
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      'geolocation': [],
      'microphone': [],
      'camera': [],
      'payment': [],
    },
    reportOnly: false,
  };

  /**
   * Sets security headers configuration for a tenant.
   */
  setConfig(config: SecurityHeadersConfig): void {
    this.configs.set(config.tenantId, config);
    log.info(`[SecurityHeaders] Config set for tenant ${config.tenantId}`);
  }

  /**
   * Gets security headers configuration for a tenant.
   */
  getConfig(tenantId: string): SecurityHeadersConfig {
    return this.configs.get(tenantId) || { tenantId, ...this.defaultConfig };
  }

  /**
   * Generates all security headers for a tenant.
   */
  generateHeaders(tenantId: string): SecurityHeaders {
    const config = this.getConfig(tenantId);
    this.stats.totalGenerations++;
    this.stats.generationsByTenant[tenantId] = (this.stats.generationsByTenant[tenantId] || 0) + 1;

    const headers: SecurityHeaders = {
      'X-Frame-Options': config.frameOptions,
      'X-XSS-Protection': config.xssProtection,
      'Referrer-Policy': config.referrerPolicy,
    };

    // CSP
    const cspHeader = this.buildCSP(config.csp);
    if (config.reportOnly) {
      headers['Content-Security-Policy-Report-Only'] = cspHeader;
      this.stats.reportOnlyCount++;
    } else {
      headers['Content-Security-Policy'] = cspHeader;
    }

    // X-Content-Type-Options
    if (config.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // HSTS
    if (config.hstsMaxAge > 0) {
      let hsts = `max-age=${config.hstsMaxAge}`;
      if (config.hstsIncludeSubdomains) {
        hsts += '; includeSubDomains';
      }
      if (config.hstsPreload) {
        hsts += '; preload';
      }
      headers['Strict-Transport-Security'] = hsts;
    }

    // Permissions-Policy
    if (Object.keys(config.permissionsPolicy).length > 0) {
      headers['Permissions-Policy'] = this.buildPermissionsPolicy(config.permissionsPolicy);
    }

    return headers;
  }

  /**
   * Builds Content-Security-Policy header value.
   */
  buildCSP(directives: CSPDirectives): string {
    const parts: string[] = [];

    for (const [directive, value] of Object.entries(directives)) {
      if (value === true) {
        parts.push(directive);
      } else if (value === false) {
        continue;
      } else if (Array.isArray(value) && value.length > 0) {
        parts.push(`${directive} ${value.join(' ')}`);
      }
    }

    return parts.join('; ');
  }

  /**
   * Parses a CSP header string into directives.
   */
  parseCSP(cspString: string): CSPDirectives {
    const directives: CSPDirectives = {};
    const parts = cspString.split(';').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      const [directive, ...values] = part.split(/\s+/);
      const key = directive as keyof CSPDirectives;

      if (values.length === 0) {
        (directives as any)[key] = true;
      } else {
        (directives as any)[key] = values;
      }
    }

    return directives;
  }

  /**
   * Validates CSP directives.
   */
  validateCSP(directives: CSPDirectives): HeaderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unsafe values
    const unsafeValues = ["'unsafe-inline'", "'unsafe-eval'"];
    const scriptDirectives = ['script-src', 'default-src'] as const;

    for (const dir of scriptDirectives) {
      const values = directives[dir];
      if (Array.isArray(values)) {
        for (const unsafe of unsafeValues) {
          if (values.includes(unsafe)) {
            warnings.push(`${dir} contains ${unsafe} which may weaken security`);
          }
        }
      }
    }

    // Check for * wildcard
    for (const [directive, values] of Object.entries(directives)) {
      if (Array.isArray(values) && values.includes('*')) {
        warnings.push(`${directive} contains wildcard (*) which is overly permissive`);
      }
    }

    // Recommend frame-ancestors
    if (!directives['frame-ancestors']) {
      warnings.push("Missing 'frame-ancestors' directive for clickjacking protection");
    }

    // Recommend upgrade-insecure-requests
    if (!directives['upgrade-insecure-requests']) {
      warnings.push("Consider adding 'upgrade-insecure-requests' for HTTPS migration");
    }

    if (errors.length > 0) {
      this.stats.validationErrors++;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Adds a CSP directive value.
   */
  addCSPDirective(
    tenantId: string,
    directive: keyof CSPDirectives,
    value: string
  ): CSPDirectives {
    const config = this.getConfig(tenantId);
    const existing = config.csp[directive];

    if (Array.isArray(existing)) {
      if (!existing.includes(value)) {
        existing.push(value);
      }
    } else {
      (config.csp as any)[directive] = [value];
    }

    this.setConfig(config);
    return config.csp;
  }

  /**
   * Removes a CSP directive value.
   */
  removeCSPDirective(
    tenantId: string,
    directive: keyof CSPDirectives,
    value: string
  ): CSPDirectives {
    const config = this.getConfig(tenantId);
    const existing = config.csp[directive];

    if (Array.isArray(existing)) {
      const index = existing.indexOf(value);
      if (index > -1) {
        existing.splice(index, 1);
      }
    }

    this.setConfig(config);
    return config.csp;
  }

  /**
   * Generates a nonce for inline scripts/styles.
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
  }

  /**
   * Adds nonce to CSP for inline content.
   */
  addNonceToCSP(csp: CSPDirectives, nonce: string, directive: 'script-src' | 'style-src'): CSPDirectives {
    const nonceValue = `'nonce-${nonce}'`;
    const existing = csp[directive] || [];

    if (Array.isArray(existing) && !existing.includes(nonceValue)) {
      return {
        ...csp,
        [directive]: [...existing, nonceValue],
      };
    }

    return csp;
  }

  /**
   * Builds Permissions-Policy header value.
   */
  buildPermissionsPolicy(policies: Record<string, string[]>): string {
    const parts: string[] = [];

    for (const [feature, allowlist] of Object.entries(policies)) {
      if (allowlist.length === 0) {
        parts.push(`${feature}=()`);
      } else {
        const origins = allowlist.map(o => o === 'self' ? 'self' : `"${o}"`).join(' ');
        parts.push(`${feature}=(${origins})`);
      }
    }

    return parts.join(', ');
  }

  /**
   * Gets recommended headers for different security levels.
   */
  getRecommendedConfig(level: 'strict' | 'moderate' | 'relaxed'): Omit<SecurityHeadersConfig, 'tenantId'> {
    switch (level) {
      case 'strict':
        return {
          csp: {
            'default-src': ["'none'"],
            'script-src': ["'self'"],
            'style-src': ["'self'"],
            'img-src': ["'self'"],
            'font-src': ["'self'"],
            'connect-src': ["'self'"],
            'frame-ancestors': ["'none'"],
            'form-action': ["'self'"],
            'base-uri': ["'none'"],
            'object-src': ["'none'"],
            'upgrade-insecure-requests': true,
            'block-all-mixed-content': true,
          },
          frameOptions: 'DENY',
          contentTypeOptions: true,
          hstsMaxAge: 63072000, // 2 years
          hstsIncludeSubdomains: true,
          hstsPreload: true,
          xssProtection: '1; mode=block',
          referrerPolicy: 'no-referrer',
          permissionsPolicy: {
            'geolocation': [],
            'microphone': [],
            'camera': [],
            'payment': [],
            'usb': [],
            'fullscreen': ['self'],
          },
          reportOnly: false,
        };

      case 'moderate':
        return this.defaultConfig;

      case 'relaxed':
        return {
          csp: {
            'default-src': ["'self'", 'https:'],
            'script-src': ["'self'", "'unsafe-inline'", 'https:'],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ['*', 'data:'],
            'font-src': ["'self'", 'https:', 'data:'],
            'connect-src': ["'self'", 'https:'],
          },
          frameOptions: 'SAMEORIGIN',
          contentTypeOptions: true,
          hstsMaxAge: 31536000,
          hstsIncludeSubdomains: false,
          hstsPreload: false,
          xssProtection: '1',
          referrerPolicy: 'origin-when-cross-origin',
          permissionsPolicy: {},
          reportOnly: false,
        };
    }
  }

  /**
   * Merges CSP directives.
   */
  mergeCSP(base: CSPDirectives, override: CSPDirectives): CSPDirectives {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      const directive = key as keyof CSPDirectives;
      if (Array.isArray(value) && Array.isArray(merged[directive])) {
        merged[directive] = [...new Set([...(merged[directive] as string[]), ...value])] as any;
      } else {
        (merged as any)[directive] = value;
      }
    }

    return merged;
  }

  /**
   * Gets statistics.
   */
  getStats(): SecurityHeadersStats {
    return {
      ...this.stats,
      generationsByTenant: { ...this.stats.generationsByTenant },
    };
  }

  /**
   * Clears all configs (for testing).
   */
  clear(): void {
    this.configs.clear();
    this.stats = {
      totalGenerations: 0,
      generationsByTenant: {},
      validationErrors: 0,
      reportOnlyCount: 0,
    };
  }
}

export const securityHeadersEngine = new SecurityHeadersEngine();
