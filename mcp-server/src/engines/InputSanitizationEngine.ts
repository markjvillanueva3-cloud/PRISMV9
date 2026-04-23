/**
 * InputSanitizationEngine — U-LPR-SEC07
 *
 * Comprehensive input sanitization with:
 * - XSS prevention (HTML/JS escaping)
 * - SQL/NoSQL sanitization
 * - Path traversal prevention
 * - Command injection prevention
 * - Unicode normalization
 * - Content-type validation
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC07
 * @phase PHASE-9 (Security + Compliance)
 */

import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type SanitizationType =
  | 'html'
  | 'javascript'
  | 'sql'
  | 'nosql'
  | 'path'
  | 'command'
  | 'url'
  | 'filename'
  | 'email'
  | 'alphanumeric';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  stripNull?: boolean;
  normalizeUnicode?: boolean;
  trimWhitespace?: boolean;
}

export interface SanitizeResult {
  original: string;
  sanitized: string;
  modified: boolean;
  removedPatterns: string[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: string;
}

export interface SanitizationStats {
  totalSanitizations: number;
  modifiedCount: number;
  byType: Record<string, number>;
  blockedPatterns: Record<string, number>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class InputSanitizationEngine {
  private stats = {
    totalSanitizations: 0,
    modifiedCount: 0,
    byType: {} as Record<string, number>,
    blockedPatterns: {} as Record<string, number>,
  };

  // HTML entities for escaping
  private readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  // Dangerous patterns
  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:\s*text\/html/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*["']?\s*javascript:/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<form\b/gi,
  ];

  private readonly SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
    /--/g,
    /;/g,
    /\/\*/g,
    /\*\//g,
    /xp_/gi,
    /EXEC(\s|\+)+(s|x)p\w+/gi,
  ];

  private readonly COMMAND_PATTERNS = [
    /[;&|`$(){}[\]<>]/g,
    /\n|\r/g,
    /\0/g,
  ];

  private readonly PATH_PATTERNS = [
    /\.\./g,
    /\.\.\\/g,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
    /%2e%2e/gi,
    /%252e/gi,
    /\0/g,
  ];

  /**
   * Sanitizes input for HTML context (XSS prevention).
   */
  sanitizeHtml(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('html');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Strip null bytes
    if (options.stripNull !== false) {
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Normalize unicode
    if (options.normalizeUnicode !== false) {
      sanitized = sanitized.normalize('NFC');
    }

    // Remove dangerous patterns
    for (const pattern of this.XSS_PATTERNS) {
      const matches = sanitized.match(pattern);
      if (matches) {
        removedPatterns.push(...matches);
        this.recordBlockedPattern('xss');
      }
      sanitized = sanitized.replace(pattern, '');
    }

    // Escape HTML entities
    sanitized = this.escapeHtml(sanitized);

    // Apply max length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
      warnings.push(`Truncated to ${options.maxLength} characters`);
    }

    // Trim whitespace
    if (options.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes input for JavaScript context.
   */
  sanitizeJavaScript(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('javascript');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Strip null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Escape for JavaScript string context
    sanitized = sanitized
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e')
      .replace(/&/g, '\\x26');

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
      warnings.push(`Truncated to ${options.maxLength} characters`);
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes input for SQL context.
   */
  sanitizeSql(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('sql');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Strip null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Check for SQL injection patterns
    for (const pattern of this.SQL_PATTERNS) {
      const matches = sanitized.match(pattern);
      if (matches) {
        removedPatterns.push(...matches);
        this.recordBlockedPattern('sql_injection');
        warnings.push('SQL injection pattern detected');
      }
    }

    // Escape single quotes (primary SQL escape)
    sanitized = sanitized.replace(/'/g, "''");

    // Remove dangerous characters
    sanitized = sanitized.replace(/[;\-\-]/g, '');

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes input for NoSQL context.
   */
  sanitizeNoSql(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('nosql');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Strip null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove MongoDB operators
    const nosqlPatterns = [/\$\w+/g, /\{/g, /\}/g];
    for (const pattern of nosqlPatterns) {
      const matches = sanitized.match(pattern);
      if (matches) {
        removedPatterns.push(...matches);
        this.recordBlockedPattern('nosql_injection');
      }
      sanitized = sanitized.replace(pattern, '');
    }

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes file path to prevent traversal.
   */
  sanitizePath(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('path');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Strip null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Normalize unicode
    sanitized = sanitized.normalize('NFC');

    // URL decode
    try {
      sanitized = decodeURIComponent(sanitized);
    } catch {
      // Invalid encoding, keep as-is
    }

    // Remove path traversal patterns
    for (const pattern of this.PATH_PATTERNS) {
      const matches = sanitized.match(pattern);
      if (matches) {
        removedPatterns.push(...matches);
        this.recordBlockedPattern('path_traversal');
        warnings.push('Path traversal pattern detected');
      }
      sanitized = sanitized.replace(pattern, '');
    }

    // Normalize path separators
    sanitized = sanitized.replace(/[\\\/]+/g, '/');

    // Remove leading slashes to make relative
    sanitized = sanitized.replace(/^\/+/, '');

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes input for shell command context.
   */
  sanitizeCommand(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('command');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Strip null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove dangerous shell characters
    for (const pattern of this.COMMAND_PATTERNS) {
      const matches = sanitized.match(pattern);
      if (matches) {
        removedPatterns.push(...matches);
        this.recordBlockedPattern('command_injection');
        warnings.push('Command injection pattern detected');
      }
      sanitized = sanitized.replace(pattern, '');
    }

    // Only allow alphanumeric, dash, underscore, dot, space
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_.\s]/g, '');

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes URL.
   */
  sanitizeUrl(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('url');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input.trim();

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const proto of dangerousProtocols) {
      if (sanitized.toLowerCase().startsWith(proto)) {
        removedPatterns.push(proto);
        this.recordBlockedPattern('dangerous_protocol');
        warnings.push(`Dangerous protocol: ${proto}`);
        sanitized = '';
        break;
      }
    }

    // Ensure valid protocol if not empty
    if (sanitized && !sanitized.match(/^https?:\/\//i)) {
      // Add https if no protocol
      if (!sanitized.includes('://')) {
        sanitized = 'https://' + sanitized;
      }
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes filename.
   */
  sanitizeFilename(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('filename');
    const removedPatterns: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Strip null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove path separators
    sanitized = sanitized.replace(/[\\\/]/g, '');

    // Remove dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/g;
    const matches = sanitized.match(dangerousChars);
    if (matches) {
      removedPatterns.push(...matches);
    }
    sanitized = sanitized.replace(dangerousChars, '');

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // Limit length
    const maxLength = options.maxLength || 255;
    if (sanitized.length > maxLength) {
      const ext = sanitized.match(/\.[^.]+$/)?.[0] || '';
      sanitized = sanitized.substring(0, maxLength - ext.length) + ext;
      warnings.push(`Truncated to ${maxLength} characters`);
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return { original: input, sanitized, modified, removedPatterns, warnings };
  }

  /**
   * Sanitizes to alphanumeric only.
   */
  sanitizeAlphanumeric(input: string, options: SanitizeOptions = {}): SanitizeResult {
    this.recordSanitization('alphanumeric');
    const warnings: string[] = [];
    let sanitized = input.replace(/[^a-zA-Z0-9]/g, '');

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
      warnings.push(`Truncated to ${options.maxLength} characters`);
    }

    const modified = sanitized !== input;
    if (modified) this.stats.modifiedCount++;

    return {
      original: input,
      sanitized,
      modified,
      removedPatterns: [],
      warnings,
    };
  }

  /**
   * Validates email format.
   */
  validateEmail(input: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = input.trim().toLowerCase();

    if (!emailRegex.test(sanitized)) {
      return { valid: false, errors: ['Invalid email format'] };
    }

    // Check for dangerous patterns in email
    if (sanitized.includes('<') || sanitized.includes('>')) {
      return { valid: false, errors: ['Invalid characters in email'] };
    }

    return { valid: true, errors: [], sanitized };
  }

  /**
   * Generic sanitize method that applies type-specific sanitization.
   */
  sanitize(input: string, type: SanitizationType, options: SanitizeOptions = {}): SanitizeResult {
    switch (type) {
      case 'html':
        return this.sanitizeHtml(input, options);
      case 'javascript':
        return this.sanitizeJavaScript(input, options);
      case 'sql':
        return this.sanitizeSql(input, options);
      case 'nosql':
        return this.sanitizeNoSql(input, options);
      case 'path':
        return this.sanitizePath(input, options);
      case 'command':
        return this.sanitizeCommand(input, options);
      case 'url':
        return this.sanitizeUrl(input, options);
      case 'filename':
        return this.sanitizeFilename(input, options);
      case 'alphanumeric':
        return this.sanitizeAlphanumeric(input, options);
      default:
        return this.sanitizeHtml(input, options);
    }
  }

  /**
   * Batch sanitize multiple inputs.
   */
  sanitizeBatch(
    inputs: Array<{ value: string; type: SanitizationType; options?: SanitizeOptions }>
  ): SanitizeResult[] {
    return inputs.map(({ value, type, options }) => this.sanitize(value, type, options));
  }

  /**
   * Gets sanitization statistics.
   */
  getStats(): SanitizationStats {
    return {
      totalSanitizations: this.stats.totalSanitizations,
      modifiedCount: this.stats.modifiedCount,
      byType: { ...this.stats.byType },
      blockedPatterns: { ...this.stats.blockedPatterns },
    };
  }

  /**
   * Resets statistics (for testing).
   */
  resetStats(): void {
    this.stats = {
      totalSanitizations: 0,
      modifiedCount: 0,
      byType: {},
      blockedPatterns: {},
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private escapeHtml(input: string): string {
    return input.replace(/[&<>"'`=\/]/g, char => this.HTML_ENTITIES[char] || char);
  }

  private recordSanitization(type: string): void {
    this.stats.totalSanitizations++;
    this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
  }

  private recordBlockedPattern(pattern: string): void {
    this.stats.blockedPatterns[pattern] = (this.stats.blockedPatterns[pattern] || 0) + 1;
    log.warn(`[Sanitize] Blocked pattern: ${pattern}`);
  }
}

export const inputSanitizationEngine = new InputSanitizationEngine();
