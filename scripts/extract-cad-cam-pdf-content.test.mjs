// Tests for extract-cad-cam-pdf-content.mjs sha8 + textToHtml.
// Run via: node --test scripts/extract-cad-cam-pdf-content.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { sha8, textToHtml } from './extract-cad-cam-pdf-content.mjs';

test('sha8 is deterministic for same input', () => {
  assert.equal(sha8('HYPERMILL/foo.pdf'), sha8('HYPERMILL/foo.pdf'));
});

test('sha8 differs for different inputs', () => {
  assert.notEqual(sha8('HYPERMILL/foo.pdf'), sha8('MasterCam/bar.pdf'));
});

test('sha8 is exactly 8 hex chars', () => {
  const r = sha8('any-path.pdf');
  assert.equal(r.length, 8);
  assert.match(r, /^[0-9a-f]{8}$/);
});

test('textToHtml produces valid HTML5 document', () => {
  const html = textToHtml({
    title: 'Test Doc',
    domain: 'cam',
    software: 'hypermill',
    relPath: 'HYPERMILL/test.pdf',
    pageCount: 3,
    text: 'Sample extracted text',
  });
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<title>Test Doc<\/title>/);
  assert.match(html, /<pre>Sample extracted text<\/pre>/);
  assert.match(html, /<dd>cam<\/dd>/);
  assert.match(html, /<dd>hypermill<\/dd>/);
});

test('textToHtml escapes HTML special chars in title and text', () => {
  const html = textToHtml({
    title: '<script>alert(1)</script>',
    domain: 'cad',
    software: 'solidworks',
    relPath: 'p',
    pageCount: 1,
    text: '<svg onload=alert(2)>',
  });
  assert.ok(!html.includes('<script>alert(1)</script>'), 'title script tag must be escaped');
  assert.ok(!html.includes('<svg onload=alert(2)>'), 'text svg tag must be escaped');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;svg/);
});

test('textToHtml escapes ampersand without double-encoding existing entities', () => {
  const html = textToHtml({
    title: 'Q & A',
    domain: 'cam', software: 'x', relPath: 'p', pageCount: 1, text: 'A&B',
  });
  assert.match(html, /Q &amp; A/);
  assert.match(html, /A&amp;B/);
});
