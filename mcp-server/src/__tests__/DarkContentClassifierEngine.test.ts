/**
 * DarkContentClassifierEngine Tests — U-AWR22
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DarkContentClassifierEngine,
} from '../engines/DarkContentClassifierEngine.js';

describe('DarkContentClassifierEngine', () => {
  beforeEach(() => {
    DarkContentClassifierEngine.reset();
  });

  describe('classifyFile - Encrypted Content', () => {
    it('classifies encrypted files as impossible to extract', () => {
      const assessment = DarkContentClassifierEngine.classifyFile(
        '/path/to/secret.pdf',
        { isEncrypted: true }
      );

      expect(assessment.category).toBe('encrypted');
      expect(assessment.difficulty).toBe('impossible');
      expect(assessment.confidence).toBeGreaterThan(0.9);
    });

    it('provides password recommendation for encrypted files', () => {
      const assessment = DarkContentClassifierEngine.classifyFile(
        '/path/to/locked.zip',
        { isEncrypted: true }
      );

      expect(assessment.recommendations).toContain('Request decryption password from source');
    });
  });

  describe('classifyFile - Corrupted Content', () => {
    it('classifies corrupted files as impossible to extract', () => {
      const assessment = DarkContentClassifierEngine.classifyFile(
        '/path/to/damaged.pdf',
        { isCorrupted: true }
      );

      expect(assessment.category).toBe('corrupted');
      expect(assessment.difficulty).toBe('impossible');
    });
  });

  describe('classifyFile - Proprietary Formats', () => {
    it('classifies .mcx files as Mastercam proprietary', () => {
      const assessment = DarkContentClassifierEngine.classifyFile('/cam/project.mcx');

      expect(assessment.category).toBe('proprietary_binary');
      expect(assessment.difficulty).toBe('moderate');
    });

    it('classifies .hyp files as hyperMILL proprietary', () => {
      const assessment = DarkContentClassifierEngine.classifyFile('/cam/mold.hyp');

      expect(assessment.category).toBe('proprietary_binary');
    });

    it('classifies .sldprt files as SolidWorks proprietary', () => {
      const assessment = DarkContentClassifierEngine.classifyFile('/cad/bracket.sldprt');

      expect(assessment.category).toBe('proprietary_binary');
    });
  });

  describe('classifyFile - Scanned PDFs', () => {
    it('classifies scanned PDFs as hard to extract', () => {
      const assessment = DarkContentClassifierEngine.classifyFile(
        '/docs/old-drawing.pdf',
        { isScanned: true, hasTextLayer: false }
      );

      expect(assessment.category).toBe('scanned_pdf');
      expect(assessment.difficulty).toBe('hard');
    });

    it('classifies normal PDFs as extractable', () => {
      const assessment = DarkContentClassifierEngine.classifyFile(
        '/docs/text-doc.pdf',
        { hasTextLayer: true, isScanned: false }
      );

      expect(assessment.category).toBe('extractable');
    });
  });

  describe('classifyFile - Images', () => {
    it('classifies .jpg files as image_only', () => {
      const assessment = DarkContentClassifierEngine.classifyFile('/images/photo.jpg');

      expect(assessment.category).toBe('image_only');
    });

    it('classifies low DPI images as low_quality', () => {
      const assessment = DarkContentClassifierEngine.classifyFile(
        '/images/scan.png',
        { dpi: 72 }
      );

      expect(assessment.category).toBe('low_quality');
    });
  });

  describe('classifyFile - Unknown Formats', () => {
    it('classifies unknown extensions as hard to extract', () => {
      const assessment = DarkContentClassifierEngine.classifyFile('/files/data.xyz');

      expect(assessment.category).toBe('unknown_format');
      expect(assessment.difficulty).toBe('hard');
    });
  });

  describe('classifyBatch', () => {
    it('classifies multiple files at once', () => {
      const assessments = DarkContentClassifierEngine.classifyBatch([
        { path: '/docs/manual.pdf', metadata: { isScanned: true } },
        { path: '/cam/project.mcx' },
      ]);

      expect(assessments).toHaveLength(2);
    });
  });

  describe('isDarkContent', () => {
    it('returns true for non-extractable content', () => {
      const assessment = DarkContentClassifierEngine.classifyFile('/locked.zip', { isEncrypted: true });
      expect(DarkContentClassifierEngine.isDarkContent(assessment)).toBe(true);
    });

    it('returns false for extractable content', () => {
      const assessment = DarkContentClassifierEngine.classifyFile('/doc.pdf', { hasTextLayer: true, isScanned: false });
      expect(DarkContentClassifierEngine.isDarkContent(assessment)).toBe(false);
    });
  });

  describe('getDifficultyScore', () => {
    it('returns correct scores', () => {
      expect(DarkContentClassifierEngine.getDifficultyScore('easy')).toBe(0.1);
      expect(DarkContentClassifierEngine.getDifficultyScore('moderate')).toBe(0.4);
      expect(DarkContentClassifierEngine.getDifficultyScore('hard')).toBe(0.7);
      expect(DarkContentClassifierEngine.getDifficultyScore('impossible')).toBe(1.0);
    });
  });

  describe('generateReport', () => {
    it('generates comprehensive report', () => {
      DarkContentClassifierEngine.classifyFile('/a.pdf', { isScanned: true });
      DarkContentClassifierEngine.classifyFile('/b.pdf', { hasTextLayer: true });
      DarkContentClassifierEngine.classifyFile('/c.mcx');

      const report = DarkContentClassifierEngine.generateReport();

      expect(report.totalFiles).toBe(3);
      expect(report.darkContent).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears all cached assessments', () => {
      DarkContentClassifierEngine.classifyFile('/test.pdf', { isScanned: true });
      DarkContentClassifierEngine.reset();
      const report = DarkContentClassifierEngine.generateReport();
      expect(report.totalFiles).toBe(0);
    });
  });
});
