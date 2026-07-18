/**
 * serve-web-static.test.mjs -- unit tests for the pure helpers of the standalone web server
 * (U-QP-WEB-STANDALONE-SERVE). The HTTP static/proxy streaming is verified live (start server ->
 * curl static + proxied POST); these pin the pure routing/safety logic hermetically.
 *
 * Run: node scripts/serve-web-static.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, sep } from "node:path";
import { contentTypeFor, isProxyPath, safeStaticPath } from "./serve-web-static.mjs";

test("contentTypeFor: known extensions map correctly; unknown -> octet-stream", () => {
  assert.equal(contentTypeFor("app.js"), "text/javascript; charset=utf-8");
  assert.equal(contentTypeFor("index.html"), "text/html; charset=utf-8");
  assert.equal(contentTypeFor("style.css"), "text/css; charset=utf-8");
  assert.equal(contentTypeFor("logo.svg"), "image/svg+xml");
  assert.equal(contentTypeFor("font.woff2"), "font/woff2");
  assert.equal(contentTypeFor("data.json"), "application/json; charset=utf-8");
  assert.equal(contentTypeFor("bundle.js.map"), "application/json; charset=utf-8");
  assert.equal(contentTypeFor("noext"), "application/octet-stream");
  assert.equal(contentTypeFor("weird.xyz"), "application/octet-stream");
  assert.equal(contentTypeFor("UPPER.PNG"), "image/png"); // case-insensitive
});

test("isProxyPath: backend prefixes match with a boundary; static routes do not", () => {
  // proxied
  assert.equal(isProxyPath("/api/mcp/quoting"), true);
  assert.equal(isProxyPath("/api"), true);
  assert.equal(isProxyPath("/health"), true);
  assert.equal(isProxyPath("/health?x=1"), true, "query stripped before match");
  assert.equal(isProxyPath("/ws/chat"), true);
  assert.equal(isProxyPath("/.well-known/x"), true);
  // NOT proxied (static / SPA)
  assert.equal(isProxyPath("/apifoo"), false, "prefix without boundary must not match");
  assert.equal(isProxyPath("/quote-builder"), false);
  assert.equal(isProxyPath("/assets/index-abc.js"), false);
  assert.equal(isProxyPath("/"), false);
  assert.equal(isProxyPath("/healthz"), false, "no false boundary match");
});

test("safeStaticPath: resolves inside dist; blocks traversal/escape", () => {
  const D = resolve("/srv/fake-dist");
  const root = resolve(D);
  // inside
  const idx = safeStaticPath(D, "/index.html");
  assert.ok(idx && idx.startsWith(root + sep), "index.html resolves inside dist");
  const asset = safeStaticPath(D, "/assets/app-123.js");
  assert.ok(asset && asset.startsWith(root + sep), "nested asset inside dist");
  // root itself
  assert.equal(safeStaticPath(D, "/"), root, "/ maps to dist root");
  // traversal blocked -> null
  assert.equal(safeStaticPath(D, "/../../../etc/passwd"), null, "../ escape blocked");
  assert.equal(safeStaticPath(D, "/..%2f..%2fsecret"), null, "encoded ../ escape blocked");
});

test("safeStaticPath: malformed percent-encoding -> null (no throw)", () => {
  const D = resolve("/srv/fake-dist");
  assert.equal(safeStaticPath(D, "/%E0%A4%A"), null, "bad percent-encoding returns null, not throw");
});
