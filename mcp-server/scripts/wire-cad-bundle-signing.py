#!/usr/bin/env python3
"""Wire CADBundleSigningVersioningEngine to cadAutomationDispatcher - U-CUC36"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (4 signing actions)
new_actions = '''  "cad_bundle_key_create",
  "cad_bundle_key_get",
  "cad_bundle_sign",
  "cad_bundle_verify",
'''

# Find last action before ] as const
old_actions_end = b'"cad_bundle_retrain_drain",\r\n] as const;'
new_actions_end = b'"cad_bundle_retrain_drain",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_bundle_key_create' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - fix verify sig type
case_code = '''          case "cad_bundle_key_create": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const keyId = params["key_id"] as string;
            const alg = params["alg"] as "ed25519" | "ed25519-hmac" | undefined;
            const issuer = params["issuer"] as string | undefined;
            const seedHex = params["seed_hex"] as string | undefined;
            if (!keyId) {
              throw new Error("cad_bundle_key_create requires 'key_id'");
            }
            const key = engine.createKey({ keyId, alg, issuer, seedHex });
            result = { key, source: "CADBundleSigningVersioningEngine.createKey" };
            break;
          }
          case "cad_bundle_key_get": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const keyId = params["key_id"] as string;
            if (!keyId) {
              throw new Error("cad_bundle_key_get requires 'key_id'");
            }
            const key = engine.publicKey(keyId);
            result = { key: key ?? null, found: !!key, source: "CADBundleSigningVersioningEngine.publicKey" };
            break;
          }
          case "cad_bundle_sign": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const bundleId = params["bundle_id"] as string;
            const bundleDigestSha256 = params["bundle_digest_sha256"] as string;
            const version = params["version"] as string;
            const keyId = params["key_id"] as string;
            const predicate = params["predicate"] as { predicateType: string; builder: string; buildType: string; metadata?: Record<string, string> };
            const bump = params["bump"] as "major" | "minor" | "patch" | undefined;
            if (!bundleId || !bundleDigestSha256 || !version || !keyId || !predicate) {
              throw new Error("cad_bundle_sign requires 'bundle_id', 'bundle_digest_sha256', 'version', 'key_id', 'predicate'");
            }
            const signature = engine.sign({ bundleId, bundleDigestSha256, version, keyId, predicate, bump });
            result = { signature, source: "CADBundleSigningVersioningEngine.sign" };
            break;
          }
          case "cad_bundle_verify": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const sig = params["signature"] as Parameters<typeof engine.verify>[0];
            const expectedDigest = params["expected_digest"] as string | undefined;
            if (!sig) {
              throw new Error("cad_bundle_verify requires 'signature'");
            }
            const verifyResult = engine.verify(sig, expectedDigest);
            result = { result: verifyResult, source: "CADBundleSigningVersioningEngine.verify" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_bundle_key_create"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADBundleSigningVersioningEngine wired successfully (4 actions)')
