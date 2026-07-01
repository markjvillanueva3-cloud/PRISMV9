/**
 * esbuild-file-url-external.plugin.mjs -- esbuild plugin that marks `file://` URL
 * imports as external so they are left intact for runtime instead of being bundled.
 *
 * WHY (slot:romeo 2026-06-12, [MAIN-FORCE]): a dispatcher action
 * (sessionHybridSearchAction.ts) does RUNTIME cross-tree dynamic imports of
 * scripts/lib/*.mjs via absolute `file:///H:/prism/scripts/lib/...` URLs. Those
 * libs live in the project tree, NOT in src, so they must not enter the bundle.
 * The dispatcher's `as string` cast was meant to keep them external, but esbuild
 * still resolves the literal URL at bundle time and fails:
 *   "Could not resolve file:///H:/prism/scripts/lib/hybrid-retrieval.mjs"
 * That single failure aborts the ENTIRE dist build -- a fleet-wide freeze (every
 * slot's `npm run build` / build:fast / build:incremental dies here, so dist
 * could not be rebuilt and no engine fix reached the running server). This plugin
 * is the standard esbuild remedy: any `file://` specifier resolves external, the
 * import survives verbatim, and node resolves it at runtime. Matches the author's
 * stated intent.
 */

/** @type {import("esbuild").Plugin} */
export const fileUrlExternalPlugin = {
  name: "file-url-external",
  setup(build) {
    build.onResolve({ filter: /^file:\/\// }, (args) => ({ path: args.path, external: true }));
  },
};

export default fileUrlExternalPlugin;
