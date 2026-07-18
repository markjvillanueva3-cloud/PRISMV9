---
name: prism-security-coding
version: "1.0"
level: 3
category: domain
description: |
  Security coding practices for PRISM Manufacturing Intelligence.
  Covers OWASP principles, input validation, output encoding, authentication,
  authorization, secure data handling, and manufacturing-specific security.
  Use when handling user input, API design, or data protection.
dependencies:
  - prism-typescript-safety
  - prism-error-handling-patterns
consumers:
  - ALL modules handling user input
  - ALL API endpoints
safety_critical: true
---

# PRISM SECURITY CODING
## Secure Coding for Manufacturing Intelligence
### Version 1.0 | Level 3 Domain Skill

---

## QUICK REFERENCE

| Category | Threat | Defense |
|----------|--------|---------|
| Input | Injection | Validate, sanitize, parameterize |
| Output | XSS | Encode for context |
| Auth | Credential theft | Hash, salt, secure storage |
| Access | Unauthorized access | RBAC, principle of least privilege |
| Data | Exposure | Encrypt at rest and in transit |
| API | Abuse | Rate limiting, authentication |
| Config | Secrets leak | Environment variables, vaults |
| Logging | Sensitive data | Redact PII, mask credentials |

### Safety Principle
⚠️ **LIFE-SAFETY**: Manufacturing systems control physical machines. Security breaches can lead to:
- Unauthorized parameter changes causing machine damage
- Stolen toolpath data revealing proprietary processes
- Malicious G-code injection causing crashes or injuries

---

## SECTION 1: INPUT VALIDATION

### Validate Everything
```typescript
// ❌ DANGEROUS: Trust user input
function setSpindleSpeed(request: Request): void {
  const speed = request.body.speed;  // Could be anything!
  machine.setSpindleSpeed(speed);
}

// ✅ SAFE: Validate and constrain
import { z } from 'zod';

const SpindleSpeedSchema = z.object({
  speed: z.number()
    .int('Speed must be integer')
    .min(0, 'Speed cannot be negative')
    .max(25000, 'Speed exceeds machine maximum')
});

function setSpindleSpeed(request: Request): Result<void, ValidationError> {
  const validation = SpindleSpeedSchema.safeParse(request.body);
  
  if (!validation.success) {
    return err(new ValidationError(validation.error.message));
  }
  
  // Additional business logic validation
  if (validation.data.speed > machine.maxSpindleRPM) {
    return err(new ValidationError(
      `Speed ${validation.data.speed} exceeds machine limit ${machine.maxSpindleRPM}`
    ));
  }
  
  machine.setSpindleSpeed(validation.data.speed);
  return ok(undefined);
}
```

### Material ID Validation
```typescript
// Pattern for material IDs: XX-XXXX-XXX (category-grade-condition)
const MATERIAL_ID_PATTERN = /^[A-Z]{2}-[A-Z0-9]{2,10}-[A-Z]{2,5}$/;

function validateMaterialId(id: unknown): Result<MaterialID, ValidationError> {
  if (typeof id !== 'string') {
    return err(new ValidationError('materialId', 'must be string'));
  }
  
  if (id.length > 20) {
    return err(new ValidationError('materialId', 'exceeds maximum length'));
  }
  
  if (!MATERIAL_ID_PATTERN.test(id)) {
    return err(new ValidationError(
      'materialId',
      'invalid format, expected XX-XXXX-XXX'
    ));
  }
  
  // Prevent path traversal
  if (id.includes('..') || id.includes('/') || id.includes('\\')) {
    return err(new ValidationError('materialId', 'contains invalid characters'));
  }
  
  return ok(id as MaterialID);
}
```

### Numeric Range Validation
```typescript
// Manufacturing-specific numeric validators
const NumericValidators = {
  // Cutting speed in SFM (Surface Feet per Minute)
  cuttingSpeed: z.number()
    .positive('Cutting speed must be positive')
    .max(5000, 'Cutting speed exceeds practical maximum'),
  
  // Feed rate in IPM (Inches Per Minute)
  feedRate: z.number()
    .positive('Feed rate must be positive')
    .max(500, 'Feed rate exceeds safe maximum'),
  
  // Depth of cut in inches
  depthOfCut: z.number()
    .positive('Depth must be positive')
    .max(1.0, 'Depth exceeds safe maximum for single pass'),
  
  // Tool diameter in inches
  toolDiameter: z.number()
    .positive('Diameter must be positive')
    .min(0.001, 'Diameter too small')
    .max(12, 'Diameter exceeds machine capacity'),
  
  // Force in Newtons
  cuttingForce: z.number()
    .nonnegative('Force cannot be negative')
    .max(100000, 'Force exceeds sensor range')
};

// Reusable schema
const CuttingParamsSchema = z.object({
  speed: NumericValidators.cuttingSpeed,
  feed: NumericValidators.feedRate,
  depth: NumericValidators.depthOfCut,
  toolDiameter: NumericValidators.toolDiameter
});
```

### Prevent Injection
```typescript
// ❌ DANGEROUS: String concatenation in queries
function findMaterial(name: string): Material[] {
  const query = `SELECT * FROM materials WHERE name = '${name}'`;  // SQL injection!
  return db.query(query);
}

// ✅ SAFE: Parameterized queries
function findMaterial(name: string): Material[] {
  const query = 'SELECT * FROM materials WHERE name = $1';
  return db.query(query, [name]);  // Parameter binding
}

// ❌ DANGEROUS: Dynamic file path
function loadMaterial(id: string): Material {
  const path = `./materials/${id}.json`;  // Path traversal!
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

// ✅ SAFE: Validate and constrain path
function loadMaterial(id: string): Result<Material, SecurityError> {
  // Validate ID format
  if (!MATERIAL_ID_PATTERN.test(id)) {
    return err(new SecurityError('Invalid material ID format'));
  }
  
  // Resolve and verify path
  const basePath = path.resolve('./materials');
  const filePath = path.resolve(basePath, `${id}.json`);
  
  // Ensure resolved path is within base directory
  if (!filePath.startsWith(basePath)) {
    return err(new SecurityError('Path traversal attempt detected'));
  }
  
  if (!fs.existsSync(filePath)) {
    return err(new MaterialNotFoundError(id));
  }
  
  return ok(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
}
```

---

## SECTION 2: OUTPUT ENCODING

### Context-Aware Encoding
```typescript
// Encode output based on context
class OutputEncoder {
  // HTML context - prevent XSS
  static html(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  // JavaScript string context
  static jsString(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }
  
  // URL parameter context
  static urlParam(value: string): string {
    return encodeURIComponent(value);
  }
  
  // CSS context
  static css(value: string): string {
    return value.replace(/[^\w-]/g, '');
  }
  
  // JSON - use built-in serialization
  static json(value: unknown): string {
    return JSON.stringify(value);
  }
}

// Usage in templates
const materialName = OutputEncoder.html(material.name);
const materialUrl = `/materials/${OutputEncoder.urlParam(material.id)}`;
```

### G-Code Output Safety
```typescript
// G-code must be sanitized before output
class GCodeSanitizer {
  private static readonly ALLOWED_COMMANDS = new Set([
    'G00', 'G01', 'G02', 'G03',  // Motion
    'G17', 'G18', 'G19',         // Plane select
    'G20', 'G21',                 // Units
    'G28', 'G30',                 // Return home
    'G40', 'G41', 'G42',         // Cutter comp
    'G43', 'G44', 'G49',         // Tool length
    'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', // Work offsets
    'G80', 'G81', 'G82', 'G83', 'G84', 'G85', // Canned cycles
    'G90', 'G91',                 // Positioning
    'M00', 'M01', 'M02', 'M03', 'M04', 'M05', // Spindle
    'M06',                        // Tool change
    'M08', 'M09',                 // Coolant
    'M30'                         // Program end
  ]);
  
  private static readonly DANGEROUS_PATTERNS = [
    /M99/,                // Subprogram return - could jump to malicious code
    /GOTO\s+\d+/i,        // Unconditional jump
    /IF\s+.+GOTO/i,       // Conditional jump
    /WHILE/i,             // Loop - could hang machine
    /POPEN/i,             // Open communication - data exfiltration
    /DPRNT/i,             // Data print - could leak info
  ];
  
  static sanitize(gcode: string): Result<string, SecurityError> {
    const lines = gcode.split('\n');
    const sanitized: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('(') || trimmed.startsWith(';')) {
        sanitized.push(line);
        continue;
      }
      
      // Check for dangerous patterns
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(trimmed)) {
          return err(new SecurityError(
            `Dangerous G-code pattern detected: ${pattern}`
          ));
        }
      }
      
      // Extract command (first word)
      const command = trimmed.split(/\s+/)[0].toUpperCase();
      const baseCommand = command.replace(/[0-9.]+$/, '');
      
      if (!this.isAllowedCommand(baseCommand)) {
        return err(new SecurityError(
          `Unsupported G-code command: ${command}`
        ));
      }
      
      sanitized.push(line);
    }
    
    return ok(sanitized.join('\n'));
  }
  
  private static isAllowedCommand(command: string): boolean {
    // Check exact match or prefix match (G0, G1, M0, etc.)
    return this.ALLOWED_COMMANDS.has(command) ||
           this.ALLOWED_COMMANDS.has(command.slice(0, 2) + command.slice(2).padStart(2, '0'));
  }
}
```

---

## SECTION 3: AUTHENTICATION & AUTHORIZATION

### Password Handling
```typescript
import * as crypto from 'crypto';

// ❌ DANGEROUS: Plain text or weak hashing
function checkPassword(password: string, stored: string): boolean {
  return password === stored;  // Plain text!
  // return crypto.createHash('md5').update(password).digest('hex') === stored;  // Weak!
}

// ✅ SAFE: bcrypt with salt
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  // Bcrypt includes salt automatically
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password strength requirements
const PasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');
```

### Role-Based Access Control
```typescript
// Define roles and permissions
type Permission = 
  | 'material:read'
  | 'material:write'
  | 'material:delete'
  | 'machine:read'
  | 'machine:write'
  | 'machine:control'
  | 'calculation:run'
  | 'gcode:generate'
  | 'admin:users'
  | 'admin:config';

type Role = 'viewer' | 'operator' | 'programmer' | 'engineer' | 'admin';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ['material:read', 'machine:read'],
  operator: ['material:read', 'machine:read', 'machine:control'],
  programmer: [
    'material:read', 'machine:read', 'machine:control',
    'calculation:run', 'gcode:generate'
  ],
  engineer: [
    'material:read', 'material:write',
    'machine:read', 'machine:write',
    'calculation:run', 'gcode:generate'
  ],
  admin: [
    'material:read', 'material:write', 'material:delete',
    'machine:read', 'machine:write', 'machine:control',
    'calculation:run', 'gcode:generate',
    'admin:users', 'admin:config'
  ]
};

// Permission checker
class AccessControl {
  static hasPermission(user: User, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[user.role];
    return permissions?.includes(permission) ?? false;
  }
  
  static requirePermission(user: User, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new AuthorizationError(
        `Permission '${permission}' required`,
        user.id,
        permission
      );
    }
  }
}

// Usage in API
function deleteMaterial(user: User, materialId: string): Result<void, Error> {
  AccessControl.requirePermission(user, 'material:delete');
  
  // Proceed with deletion
  return materialRepository.delete(materialId);
}
```

### API Key Management
```typescript
// Secure API key handling
class ApiKeyManager {
  // Generate secure API key
  static generate(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  // Hash for storage (never store plain keys)
  static hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
  
  // Compare securely (constant time)
  static verify(providedKey: string, storedHash: string): boolean {
    const providedHash = this.hash(providedKey);
    return crypto.timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(storedHash)
    );
  }
}

// API key validation middleware
function validateApiKey(req: Request): Result<ApiClient, AuthError> {
  const key = req.headers['x-api-key'];
  
  if (!key || typeof key !== 'string') {
    return err(new AuthError('API key required'));
  }
  
  const keyHash = ApiKeyManager.hash(key);
  const client = apiKeyStore.findByHash(keyHash);
  
  if (!client) {
    return err(new AuthError('Invalid API key'));
  }
  
  if (client.expiresAt && client.expiresAt < new Date()) {
    return err(new AuthError('API key expired'));
  }
  
  return ok(client);
}
```

---

## SECTION 4: SECURE DATA HANDLING

### Sensitive Data Protection
```typescript
// Mark sensitive fields
interface Material {
  id: string;
  name: string;
  publicProperties: MaterialProperties;
  // @sensitive - proprietary data
  proprietaryCoefficients?: {
    customKc1_1: number;
    customMc: number;
    tradeName: string;
  };
}

// Redact sensitive fields for logging/export
function redactSensitive<T extends object>(obj: T, sensitiveFields: string[]): T {
  const redacted = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      (redacted as any)[field] = '[REDACTED]';
    }
  }
  
  return redacted;
}

// Usage
const logSafeMaterial = redactSensitive(material, [
  'proprietaryCoefficients',
  'customerNotes'
]);
logger.info('Material accessed', { material: logSafeMaterial });
```

### Encryption at Rest
```typescript
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class DataEncryption {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes');
    }
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage for sensitive material data
const encryptor = new DataEncryption(
  Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
);

const encryptedCoefficients = encryptor.encrypt(
  JSON.stringify(material.proprietaryCoefficients)
);
```

---

## SECTION 5: SECURE CONFIGURATION

### Environment Variables
```typescript
// ❌ DANGEROUS: Hardcoded secrets
const API_KEY = 'sk-123456789';
const DB_PASSWORD = 'password123';

// ✅ SAFE: Environment variables with validation
const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.string().transform(v => v === 'true'),
  
  // API Keys (required in production)
  API_KEY: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(64),  // 32 bytes hex
  
  // Optional with defaults
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT: z.string().transform(Number).default('100'),
});

function loadConfig(): z.infer<typeof ConfigSchema> {
  const result = ConfigSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    process.exit(1);
  }
  
  return result.data;
}

const config = loadConfig();
```

### Secrets Management
```typescript
// Never log secrets
class SecureConfig {
  private secrets: Map<string, string> = new Map();
  
  set(key: string, value: string): void {
    this.secrets.set(key, value);
  }
  
  get(key: string): string | undefined {
    return this.secrets.get(key);
  }
  
  // Safe for logging
  toString(): string {
    return `SecureConfig(${this.secrets.size} secrets)`;
  }
  
  // Prevent JSON serialization of secrets
  toJSON(): object {
    return { keys: Array.from(this.secrets.keys()), values: '[PROTECTED]' };
  }
}
```

---

## SECTION 6: RATE LIMITING

### API Rate Limiting
```typescript
interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  keyGenerator: (req: Request) => string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  check(req: Request): Result<void, RateLimitError> {
    const key = this.config.keyGenerator(req);
    const now = Date.now();
    
    let record = this.requests.get(key);
    
    // Reset if window expired
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + this.config.windowMs };
      this.requests.set(key, record);
    }
    
    record.count++;
    
    if (record.count > this.config.maxRequests) {
      return err(new RateLimitError(
        'Too many requests',
        record.resetAt - now
      ));
    }
    
    return ok(undefined);
  }
}

// Different limits for different endpoints
const calculationLimiter = new RateLimiter({
  windowMs: 60000,  // 1 minute
  maxRequests: 100,
  keyGenerator: (req) => req.user?.id ?? req.ip
});

const gcodeGeneratorLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 10,  // More restrictive for expensive operations
  keyGenerator: (req) => req.user?.id ?? req.ip
});
```

---

## SECTION 7: LOGGING SECURITY

### Secure Logging
```typescript
// Fields to always redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /cookie/i,
  /credential/i,
  /ssn/i,
  /credit_card/i
];

function sanitizeForLogging(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Truncate long strings
    return obj.length > 1000 ? obj.slice(0, 1000) + '...[TRUNCATED]' : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map(item => sanitizeForLogging(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if key is sensitive
      const isSensitive = SENSITIVE_PATTERNS.some(p => p.test(key));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value, depth + 1);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

// Secure logger wrapper
class SecureLogger {
  info(message: string, context?: object): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      context: context ? sanitizeForLogging(context) : undefined,
      timestamp: new Date().toISOString()
    }));
  }
  
  error(message: string, error?: Error, context?: object): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        // Don't log full stack in production
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      } : undefined,
      context: context ? sanitizeForLogging(context) : undefined,
      timestamp: new Date().toISOString()
    }));
  }
}
```

---

## SECTION 8: ANTI-PATTERNS

| Anti-Pattern | Risk | Solution |
|--------------|------|----------|
| SQL concatenation | Injection | Parameterized queries |
| Storing plain passwords | Credential theft | bcrypt with salt |
| Hardcoded secrets | Exposure | Environment variables |
| Trust user input | All attacks | Validate everything |
| Return stack traces | Information leak | Generic error messages |
| Log sensitive data | Data exposure | Sanitize before logging |
| Weak random | Predictable tokens | crypto.randomBytes |
| HTTP for sensitive data | Interception | HTTPS only |

---

## SECTION 9: SECURITY CHECKLIST

```
□ All user input validated with schemas
□ Output encoded for context (HTML, JS, URL)
□ Parameterized queries for all database access
□ Passwords hashed with bcrypt (12+ rounds)
□ Role-based access control implemented
□ API keys hashed before storage
□ Sensitive data encrypted at rest
□ Secrets in environment variables only
□ No secrets in logs
□ Rate limiting on all endpoints
□ G-code sanitized before execution
□ Path traversal prevented
□ HTTPS enforced
□ Security headers set
□ Dependencies audited regularly
```

---

**Security protects people and machines. Breaches in manufacturing can cause physical harm.**

**Version:** 1.0 | **Date:** 2026-01-29 | **Level:** 3 (Domain)
