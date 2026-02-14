/**
 * PRISM Safety Validator
 * ======================
 * Ensures S(x) >= 0.70 for all outputs
 * CRITICAL: This system controls CNC machines where LIVES ARE AT STAKE
 */

import { Logger } from './Logger.js';
import { Config } from './Config.js';

export interface SafetyResult {
  safe: boolean;
  score: number;
  violations: string[];
  warnings: string[];
  blocked: boolean;
}

export interface SafetyRule {
  id: string;
  name: string;
  description: string;
  check: (toolName: string, args: any) => { passed: boolean; reason?: string };
  severity: 'critical' | 'high' | 'medium' | 'low';
  weight: number;
}

export class SafetyValidator {
  private logger: Logger;
  private threshold: number;
  private rules: SafetyRule[];

  constructor() {
    this.logger = new Logger('SafetyValidator');
    this.threshold = Config.get('safetyThreshold', 0.70);
    this.rules = this.initializeRules();
  }

  /**
   * Validate a tool call for safety
   */
  async validate(toolName: string, args: any): Promise<SafetyResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let totalWeight = 0;
    let passedWeight = 0;

    for (const rule of this.rules) {
      totalWeight += rule.weight;
      
      try {
        const result = rule.check(toolName, args);
        
        if (result.passed) {
          passedWeight += rule.weight;
        } else {
          const message = `${rule.name}: ${result.reason || 'Failed'}`;
          
          if (rule.severity === 'critical' || rule.severity === 'high') {
            violations.push(message);
          } else {
            warnings.push(message);
            passedWeight += rule.weight * 0.5; // Partial credit for warnings
          }
        }
      } catch (error) {
        this.logger.warn(`Rule ${rule.id} failed to execute`, error);
        warnings.push(`${rule.name}: Unable to evaluate`);
        passedWeight += rule.weight * 0.5;
      }
    }

    const score = totalWeight > 0 ? passedWeight / totalWeight : 1;
    const safe = score >= this.threshold && violations.length === 0;

    const result: SafetyResult = {
      safe,
      score: Math.round(score * 100) / 100,
      violations,
      warnings,
      blocked: !safe,
    };

    if (!safe) {
      this.logger.warn(`Safety check FAILED for ${toolName}`, result);
    }

    return result;
  }

  /**
   * Initialize safety rules
   */
  private initializeRules(): SafetyRule[] {
    return [
      {
        id: 'SF-001',
        name: 'Parameter Bounds Check',
        description: 'Ensures numerical parameters are within safe ranges',
        severity: 'critical',
        weight: 0.25,
        check: (toolName, args) => {
          // Check for extreme values
          const checkValue = (value: any, path: string): { passed: boolean; reason?: string } => {
            if (typeof value === 'number') {
              if (value < -1e9 || value > 1e9) {
                return { passed: false, reason: `Value at ${path} is out of bounds: ${value}` };
              }
              if (!Number.isFinite(value)) {
                return { passed: false, reason: `Value at ${path} is not finite` };
              }
            }
            return { passed: true };
          };

          const checkObject = (obj: any, path: string = ''): { passed: boolean; reason?: string } => {
            if (typeof obj !== 'object' || obj === null) {
              return checkValue(obj, path);
            }
            
            for (const [key, value] of Object.entries(obj)) {
              const result = checkObject(value, path ? `${path}.${key}` : key);
              if (!result.passed) return result;
            }
            return { passed: true };
          };

          return checkObject(args);
        },
      },
      {
        id: 'SF-002',
        name: 'Speed/Feed Safety',
        description: 'Validates cutting parameters are within safe limits',
        severity: 'critical',
        weight: 0.30,
        check: (toolName, args) => {
          // Only apply to relevant tools
          if (!toolName.includes('speed') && !toolName.includes('feed') && !toolName.includes('cutting')) {
            return { passed: true };
          }

          // Check RPM limits
          if (args.rpm !== undefined) {
            if (args.rpm < 0) return { passed: false, reason: 'RPM cannot be negative' };
            if (args.rpm > 100000) return { passed: false, reason: 'RPM exceeds maximum safe limit (100,000)' };
          }

          // Check feed rate limits
          if (args.feed_rate !== undefined) {
            if (args.feed_rate < 0) return { passed: false, reason: 'Feed rate cannot be negative' };
            if (args.feed_rate > 100000) return { passed: false, reason: 'Feed rate exceeds maximum safe limit' };
          }

          // Check depth of cut
          if (args.doc !== undefined) {
            if (args.doc < 0) return { passed: false, reason: 'Depth of cut cannot be negative' };
            if (args.doc > 100) return { passed: false, reason: 'Depth of cut exceeds 100mm - verify intent' };
          }

          return { passed: true };
        },
      },
      {
        id: 'SF-003',
        name: 'Material Validation',
        description: 'Ensures material parameters are physically valid',
        severity: 'high',
        weight: 0.20,
        check: (toolName, args) => {
          if (!args.material && !args.material_id) {
            return { passed: true };
          }

          const material = args.material || {};

          // Check physical properties
          if (material.physical?.density !== undefined) {
            if (material.physical.density <= 0 || material.physical.density > 25) {
              return { passed: false, reason: 'Density outside valid range (0-25 g/cm³)' };
            }
          }

          // Check thermal conductivity
          if (material.thermal?.thermal_conductivity !== undefined) {
            if (material.thermal.thermal_conductivity <= 0 || material.thermal.thermal_conductivity > 500) {
              return { passed: false, reason: 'Thermal conductivity outside valid range' };
            }
          }

          // Check machinability
          if (material.machining?.machinability_rating !== undefined) {
            if (material.machining.machinability_rating < 0 || material.machining.machinability_rating > 200) {
              return { passed: false, reason: 'Machinability rating outside valid range (0-200%)' };
            }
          }

          return { passed: true };
        },
      },
      {
        id: 'SF-004',
        name: 'Injection Prevention',
        description: 'Prevents code injection in string parameters',
        severity: 'critical',
        weight: 0.15,
        check: (toolName, args) => {
          const checkString = (value: any, path: string): { passed: boolean; reason?: string } => {
            if (typeof value === 'string') {
              // Check for potential injection patterns
              const dangerousPatterns = [
                /\$\{.*\}/,           // Template literals
                /<script/i,            // Script tags
                /javascript:/i,        // JavaScript URLs
                /eval\s*\(/,          // eval() calls
                /Function\s*\(/,      // Function constructor
                /exec\s*\(/,          // exec() calls
                /import\s*\(/,        // Dynamic imports
              ];

              for (const pattern of dangerousPatterns) {
                if (pattern.test(value)) {
                  return { passed: false, reason: `Potentially dangerous pattern detected in ${path}` };
                }
              }
            }
            return { passed: true };
          };

          const checkObject = (obj: any, path: string = ''): { passed: boolean; reason?: string } => {
            if (typeof obj === 'string') {
              return checkString(obj, path);
            }
            if (typeof obj === 'object' && obj !== null) {
              for (const [key, value] of Object.entries(obj)) {
                const result = checkObject(value, path ? `${path}.${key}` : key);
                if (!result.passed) return result;
              }
            }
            return { passed: true };
          };

          return checkObject(args);
        },
      },
      {
        id: 'SF-005',
        name: 'Completeness Check',
        description: 'Ensures no placeholder or incomplete data',
        severity: 'medium',
        weight: 0.10,
        check: (toolName, args) => {
          const checkValue = (value: any, path: string): { passed: boolean; reason?: string } => {
            if (typeof value === 'string') {
              const placeholders = ['TODO', 'FIXME', 'TBD', 'PLACEHOLDER', 'XXX', '???'];
              const lower = value.toLowerCase();
              
              for (const ph of placeholders) {
                if (lower.includes(ph.toLowerCase())) {
                  return { passed: false, reason: `Placeholder '${ph}' found in ${path}` };
                }
              }
            }
            return { passed: true };
          };

          const checkObject = (obj: any, path: string = ''): { passed: boolean; reason?: string } => {
            if (typeof obj === 'string') {
              return checkValue(obj, path);
            }
            if (typeof obj === 'object' && obj !== null) {
              for (const [key, value] of Object.entries(obj)) {
                const result = checkObject(value, path ? `${path}.${key}` : key);
                if (!result.passed) return result;
              }
            }
            return { passed: true };
          };

          return checkObject(args);
        },
      },
    ];
  }

  /**
   * Add a custom safety rule
   */
  addRule(rule: SafetyRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all rules
   */
  getRules(): SafetyRule[] {
    return [...this.rules];
  }
}

export default SafetyValidator;
