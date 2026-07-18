/**
 * esbuild-file-url-external.plugin.test.mjs -- pins the build-unblock fix
 * (slot:romeo 2026-06-12). Fails LOUD if the plugin stops externalizing `file://`
 * imports -- i.e. if the fleet-wide dist-build freeze is about to regress.
 *
 * Drives the plugin's setup() with a mock esbuild `build` so no real bundle runs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileUrlExternalPlugin } from "./esbuild-file-url-external.plugin.mjs";

/** Capture the onResolve(filter, cb) registration the plugin makes. */
function drivePlugin() {
  let filter, cb;
  fileUrlExternalPlugin.setup({
    onResolve(opts, callback) {
      filter = opts.filter;
      cb = callback;
    },
  });
  return { filter, cb };
}

test("plugin registers exactly one onResolve handler keyed on the file:// scheme", () => {
  const { filter, cb } = drivePlugin();
  assert.ok(filter instanceof RegExp, "must register a regex filter");
  assert.equal(typeof cb, "function", "must register a resolve callback");
  // The filter must match a file:// URL and NOT a bare/relative/npm specifier.
  assert.ok(filter.test("file:///H:/prism/scripts/lib/hybrid-retrieval.mjs"));
  assert.ok(!filter.test("./ToolCatalogEngine.js"));
  assert.ok(!filter.test("zod"));
  assert.ok(!filter.test("node:path"));
  // Lower-bound pin (reviewer-B hardening): the filter must NOT broaden to match
  // RELATIVE .mjs siblings -- an over-broad `/(^file:|\.mjs$)/` regression would
  // wrongly externalize in-bundle code and break the build. These keep it `^file://`.
  assert.ok(!filter.test("./helper.mjs"));
  assert.ok(!filter.test("../scripts/lib/x.mjs"));
});

test("a file:// import resolves EXTERNAL with its path preserved verbatim", () => {
  const { cb } = drivePlugin();
  const url = "file:///H:/prism/scripts/lib/master-index-search-lib.mjs";
  const res = cb({ path: url });
  assert.deepEqual(res, { path: url, external: true },
    "must mark file:// external (left intact for runtime), not rewrite or inline it");
});

test("plugin has a stable name (esbuild requires it; downstream may reference it)", () => {
  assert.equal(fileUrlExternalPlugin.name, "file-url-external");
});

test("the four real cross-tree libs the dispatcher imports all match the filter", () => {
  const { filter } = drivePlugin();
  for (const lib of [
    "hybrid-retrieval.mjs",
    "memory-index-search-lib.mjs",
    "master-index-search-lib.mjs",
    "episode-store.mjs",
  ]) {
    assert.ok(filter.test(`file:///H:/prism/scripts/lib/${lib}`), `${lib} must externalize`);
  }
});
