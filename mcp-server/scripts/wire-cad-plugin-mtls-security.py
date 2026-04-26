#!/usr/bin/env python3
"""Wire CADPluginMTLSSecurityEngine to cadAutomationDispatcher - U-CUC45"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (7 mTLS security actions)
new_actions = '''  "cad_mtls_cert_add",
  "cad_mtls_cert_list",
  "cad_mtls_cert_validate",
  "cad_mtls_binary_verify",
  "cad_mtls_connection_validate",
  "cad_mtls_events",
  "cad_mtls_config",
'''

# Find last action before ] as const
old_actions_end = b'"cad_audit_clear",\r\n] as const;'
new_actions_end = b'"cad_audit_clear",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_mtls_cert_add' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - CADPluginMTLSSecurityEngine requires transport in constructor
case_code = '''          case "cad_mtls_cert_add": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const cert = params["certificate"] as Parameters<typeof engine.addCertificate>[0];
            if (!cert) {
              throw new Error("cad_mtls_cert_add requires 'certificate' (Certificate)");
            }
            engine.addCertificate(cert);
            result = { added: true, fingerprint: cert.fingerprint, source: "CADPluginMTLSSecurityEngine.addCertificate" };
            break;
          }
          case "cad_mtls_cert_list": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const certs = engine.listCertificates();
            result = { certificates: certs, count: certs.length, source: "CADPluginMTLSSecurityEngine.listCertificates" };
            break;
          }
          case "cad_mtls_cert_validate": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const fingerprint = params["fingerprint"] as string;
            if (!fingerprint) {
              throw new Error("cad_mtls_cert_validate requires 'fingerprint'");
            }
            const validation = engine.validateCertificate(fingerprint);
            result = { validation, source: "CADPluginMTLSSecurityEngine.validateCertificate" };
            break;
          }
          case "cad_mtls_binary_verify": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: (fp: string, eh?: string) => ({ filePath: fp, fileHash: eh ?? "mock", hashAlgorithm: "SHA256" as const, signature: "mocksig", signerCertFingerprint: "mockcert", timestamp: new Date().toISOString(), isValid: true }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const filePath = params["file_path"] as string;
            const expectedHash = params["expected_hash"] as string | undefined;
            if (!filePath) {
              throw new Error("cad_mtls_binary_verify requires 'file_path'");
            }
            const sig = engine.verifyBinary(filePath, expectedHash);
            result = { signature: sig, source: "CADPluginMTLSSecurityEngine.verifyBinary" };
            break;
          }
          case "cad_mtls_connection_validate": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const clientCertFingerprint = params["client_cert_fingerprint"] as string;
            if (!clientCertFingerprint) {
              throw new Error("cad_mtls_connection_validate requires 'client_cert_fingerprint'");
            }
            const validation = engine.validateConnection(clientCertFingerprint);
            result = { validation, source: "CADPluginMTLSSecurityEngine.validateConnection" };
            break;
          }
          case "cad_mtls_events": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const opts = {
              type: params["type"] as string | undefined,
              severity: params["severity"] as string | undefined,
              limit: params["limit"] as number | undefined,
            };
            const events = engine.getSecurityEvents(opts);
            result = { events, count: events.length, source: "CADPluginMTLSSecurityEngine.getSecurityEvents" };
            break;
          }
          case "cad_mtls_config": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const config = engine.getConfig();
            result = { config, source: "CADPluginMTLSSecurityEngine.getConfig" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_mtls_cert_add"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADPluginMTLSSecurityEngine wired successfully (7 actions)')
