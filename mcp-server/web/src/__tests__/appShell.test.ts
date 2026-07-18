/**
 * App-shell activation guard (QX5/QX6, slot:quebec).
 *
 * The PRISM SPA ships to three form factors from ONE Vite build:
 *   - web (browser)         -> BrowserRouter, no shell
 *   - desktop (Electron)    -> electron/main.cjs + preload.cjs, HashRouter
 *   - mobile (Capacitor 6)  -> capacitor.config.json, native plugin bridge
 *
 * This test pins the SECURITY POSTURE and CONFIG WIRING of the two shells so a
 * future edit cannot silently weaken them (the desktop main<->renderer trust
 * boundary + the mobile config are the only places a regression would expose the
 * app). It reads the on-disk shell files (the .cjs are Node-context, not
 * importable in jsdom) and asserts their content + the package.json activation
 * scripts. Router selection is covered separately by desktopRouter.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..', '..'); // src/__tests__ -> web/
const read = (rel: string) => readFileSync(path.join(webRoot, rel), 'utf8');

describe('Electron desktop shell — secure defaults (main.cjs)', () => {
  const main = read('electron/main.cjs');

  it('enables contextIsolation and does not disable it', () => {
    expect(main).toContain('contextIsolation: true');
    expect(main).not.toContain('contextIsolation: false');
  });
  it('disables nodeIntegration (renderer gets no Node)', () => {
    expect(main).toContain('nodeIntegration: false');
    expect(main).not.toContain('nodeIntegration: true');
  });
  it('runs the renderer sandboxed', () => {
    expect(main).toContain('sandbox: true');
    expect(main).not.toContain('sandbox: false');
  });
  it('opens external links in the OS browser and denies in-app window opens', () => {
    expect(main).toContain('setWindowOpenHandler');
    expect(main).toContain('shell.openExternal');
    expect(main).toContain("action: 'deny'");
  });
  it('loads bundled dist when packaged and the dev server otherwise', () => {
    expect(main).toContain('app.isPackaged');
    expect(main).toMatch(/loadFile\(path\.join\(__dirname, '\.\.', 'dist', 'index\.html'\)\)/);
    expect(main).toContain('win.loadURL(DEV_URL)');
  });
  it('restricts external opens to an exact safe-scheme allowlist (no file:// to the OS)', () => {
    expect(main).toMatch(/EXTERNAL_SCHEMES = new Set\(\['https:', 'http:', 'mailto:'\]\)/);
    expect(main).toContain('new URL(url).protocol');
  });
  it('pins main-frame navigation to the app origin (will-navigate guard)', () => {
    expect(main).toContain("'will-navigate'");
    expect(main).toContain('event.preventDefault()');
  });
});

describe('Electron preload — minimal trust boundary (preload.cjs)', () => {
  const preload = read('electron/preload.cjs');

  it('exposes exactly one bridge, the read-only prismDesktop marker', () => {
    const exposeCalls = preload.match(/exposeInMainWorld/g) ?? [];
    expect(exposeCalls).toHaveLength(1);
    expect(preload).toContain("exposeInMainWorld('prismDesktop'");
    expect(preload).toContain('isDesktop: true');
  });
  it('requires no node module beyond electron, and exposes no ipc surface', () => {
    // The renderer must get no Node power. Assert against actual require() calls
    // and the ipcRenderer API (not bare words, which appear in the doc comment
    // describing exactly what is withheld).
    expect(preload).not.toMatch(/require\(['"](node:)?(fs|child_process|os|net|http|path)['"]\)/);
    expect(preload).not.toMatch(/ipcRenderer\b/);
    // The single require is electron, used only for contextBridge.
    const requires = preload.match(/require\((['"])(.*?)\1\)/g) ?? [];
    expect(requires).toEqual(["require('electron')"]);
  });
});

describe('Capacitor mobile config (capacitor.config.json)', () => {
  const cfg = JSON.parse(read('capacitor.config.json')) as {
    appId: string;
    appName: string;
    webDir: string;
    android?: { allowMixedContent?: boolean };
    server?: { androidScheme?: string };
  };

  it('targets the canonical app id, name, and the REAL Vite outDir as webDir', () => {
    expect(cfg.appId).toBe('tools.prism.app');
    expect(cfg.appName).toBe('Kienzle');
    // Vite writes the SPA to mcp-server/dist/web (vite.config.ts `outDir: '../dist/web'`,
    // relative to web/). Capacitor's webDir is relative to the same web/ project root, so
    // it MUST be '../dist/web' — the literal 'dist' Vite default would `cap sync` an empty
    // folder (the bug this guards). Pinned against the actual vite config below.
    expect(cfg.webDir).toBe('../dist/web');
  });
  it('webDir matches the actual Vite build.outDir (no path drift between build + sync)', () => {
    const viteCfg = read('vite.config.ts');
    const m = viteCfg.match(/outDir:\s*['"]([^'"]+)['"]/);
    expect(m).not.toBeNull();
    const viteOutDir = (m as RegExpMatchArray)[1];
    // Capacitor copies whatever Vite produced; if these two paths ever diverge,
    // `cap sync` ships a stale/empty bundle. They must be byte-identical.
    expect(cfg.webDir).toBe(viteOutDir);
  });
  it('forbids mixed content on Android and serves over https', () => {
    expect(cfg.android?.allowMixedContent).toBe(false);
    expect(cfg.server?.androidScheme).toBe('https');
  });
});

describe('package.json — shell activation scripts + deps are wired', () => {
  const pkg = JSON.parse(read('package.json')) as {
    main?: string;
    type?: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    build?: {
      appId?: string;
      productName?: string;
      directories?: { output?: string };
      files?: Array<string | { from?: string; to?: string }>;
    };
  };

  it('runs electron against the committed main.cjs and builds via electron-builder', () => {
    expect(pkg.scripts['electron:start']).toBe('electron electron/main.cjs');
    // electron:build must (a) produce the web bundle, then (b) package it with
    // electron-builder --dir (the unpacked app dir the zip --prepackaged step
    // zips). Asserted by substring so a behavior-neutral env prefix
    // (cross-env CSC_IDENTITY_AUTO_DISCOVERY=false, which skips winCodeSign) does
    // not break the guard -- the contract is "build then --dir", not the exact
    // command text.
    const electronBuild = pkg.scripts['electron:build'];
    expect(electronBuild).toContain('npm run build');
    expect(electronBuild).toContain('electron-builder --dir');
  });
  it('electron:dist delegates to the winCodeSign-free driver script', () => {
    // The standing distributable build must not depend on winCodeSign (which
    // fails on a Windows host that lacks SeCreateSymbolicLinkPrivilege). It runs
    // a driver that does --dir then zips the prepackaged win-unpacked dir,
    // tolerating the benign winCodeSign probe exit from --dir while failing loud
    // if win-unpacked is genuinely missing. NSIS stays opt-in via
    // electron:dist:nsis.
    expect(pkg.scripts['electron:dist']).toBe('node scripts/electron-dist.mjs');
  });
  it('the electron-dist driver encodes the signing-free contract (--dir, prepackaged zip, fail-loud gate)', () => {
    // Pin the driver's load-bearing behavior so a refactor cannot silently drop
    // the winCodeSign-free path or the fail-loud guard. Read the real file --
    // the contract lives in the script, not a package.json command string.
    const driver = read('scripts/electron-dist.mjs');
    expect(driver).toContain('electron:build'); // step 1: build + --dir
    expect(driver).toContain('--prepackaged'); // step 2: zip the unpacked dir
    expect(driver).toContain('dist_electron/win-unpacked');
    expect(driver).toContain('win-unpacked'); // the unpacked-app gate target
    expect(driver).toContain('Kienzle Academy.exe'); // the fail-loud existence check
    expect(driver).toMatch(/process\.exit\([^)]*\)/); // fails loud (non-zero exit)
    // Freshness gate: the unpacked app must be rewritten by THIS run, not a
    // stale prior artifact -- else a failed --dir would ship stale bits (R12).
    expect(driver).toContain('mtimeMs'); // gates on file mtime, not bare existence
    expect(driver).toContain('buildStartMs'); // the pre-build stamp it compares against
  });
  it('points the package "main" at the .cjs Electron entry (electron-builder resolves it; under type:module a default index.js would be ESM and fail)', () => {
    // electron-builder reads package.json "main" to find the app entry. With
    // "type":"module", the default (index.js) would be parsed as ESM and our
    // CommonJS electron/main.cjs would never load. The explicit .cjs main is
    // what makes `electron-builder --dir` produce a launchable package.
    expect(pkg.main).toBe('electron/main.cjs');
    expect(pkg.type).toBe('module'); // guards the coupling above
  });
  it('wires capacitor copy/sync (build-first) + platform-add scripts', () => {
    expect(pkg.scripts['cap:copy']).toBe('npm run build && cap copy');
    expect(pkg.scripts['cap:sync']).toBe('npm run build && cap sync');
    expect(pkg.scripts['mobile:add:android']).toBe('cap add android');
    expect(pkg.scripts['mobile:add:ios']).toBe('cap add ios');
  });
  it('declares the Capacitor 6 runtime + both platforms + the CLI', () => {
    expect(pkg.dependencies['@capacitor/core']).toMatch(/^\^?6\./);
    expect(pkg.dependencies['@capacitor/android']).toMatch(/^\^?6\./);
    expect(pkg.dependencies['@capacitor/ios']).toMatch(/^\^?6\./);
    expect(pkg.devDependencies['@capacitor/cli']).toMatch(/^\^?6\./);
  });
  it('declares electron 31+ and electron-builder as devDeps', () => {
    expect(pkg.devDependencies['electron']).toMatch(/^\^?3[1-9]\./);
    expect(pkg.devDependencies['electron-builder']).toMatch(/^\^?2[5-9]\./);
  });
  it('configures electron-builder output away from the Vite dist/ to avoid collision', () => {
    expect(pkg.build?.appId).toBe('tools.prism.app');
    expect(pkg.build?.directories?.output).toBe('dist_electron');
  });
  it('packages the electron shell AND remaps the real Vite output (../dist/web) to dist/ in the asar', () => {
    const files = pkg.build?.files ?? [];
    // The shell sources are copied verbatim.
    expect(files).toContain('electron/**');
    // The SPA lives at mcp-server/dist/web (Vite outDir), NOT web/dist. A bare
    // 'dist/**' glob packaged an EMPTY app (the asar had no index.html, so the
    // packaged app launched to a blank 404). A from/to remap copies the real
    // output to dist/ inside the asar so electron/main.cjs's
    // loadFile('../dist/index.html') resolves.
    const objEntries = files.filter(
      (f): f is { from?: string; to?: string } => typeof f === 'object' && f !== null,
    );
    expect(objEntries).toHaveLength(1);
    expect(objEntries[0].from).toBe('../dist/web');
    expect(objEntries[0].to).toBe('dist');
    // The remap source must equal vite's actual outDir — same drift guard as Capacitor.
    const viteOutDir = (read('vite.config.ts').match(/outDir:\s*['"]([^'"]+)['"]/) ?? [])[1];
    expect(objEntries[0].from).toBe(viteOutDir);
    // The asar destination ('dist') must match what main.cjs loads from:
    // loadFile(path.join(__dirname, '..', 'dist', 'index.html')).
    const main = read('electron/main.cjs');
    expect(main).toMatch(/loadFile\(path\.join\(__dirname, '\.\.', 'dist', 'index\.html'\)\)/);
  });
});
