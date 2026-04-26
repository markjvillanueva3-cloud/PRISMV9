#!/usr/bin/env python3
"""Wire CADReasoningChainEngine to cadAutomationDispatcher - U-CUC22"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (4 actions)
new_actions = '''  "cad_reasoning_generate",
  "cad_reasoning_why",
  "cad_reasoning_get",
  "cad_reasoning_list",
'''

# Insert after cad_revision_group in the ACTIONS array
old_actions_end = b'"cad_revision_group",\r\n] as const;'
new_actions_end = b'"cad_revision_group",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_reasoning_generate' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_reasoning_generate": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const input = params["input"] as {
              description: string;
              constraints?: string[];
              material?: string;
              targetSystem?: string;
              verbosity?: "minimal" | "standard" | "verbose";
            };
            if (!input || !input.description) {
              throw new Error("cad_reasoning_generate requires 'input' with description");
            }
            const output = await cadReasoningChainEngine.generateWithReasoning(input);
            result = { ...output, source: "CADReasoningChainEngine.generateWithReasoning" };
            break;
          }
          case "cad_reasoning_why": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const chainId = params["chain_id"] as string;
            const query = params["query"] as string;
            if (!chainId || !query) {
              throw new Error("cad_reasoning_why requires 'chain_id' and 'query' strings");
            }
            const answer = cadReasoningChainEngine.queryWhy(chainId, query);
            result = { ...answer, source: "CADReasoningChainEngine.queryWhy" };
            break;
          }
          case "cad_reasoning_get": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const chainId = params["chain_id"] as string;
            if (!chainId) {
              throw new Error("cad_reasoning_get requires 'chain_id' string");
            }
            const chain = cadReasoningChainEngine.getChain(chainId);
            result = { chain, found: !!chain, source: "CADReasoningChainEngine.getChain" };
            break;
          }
          case "cad_reasoning_list": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const limit = (params["limit"] as number) ?? 10;
            const chains = cadReasoningChainEngine.listChains(limit);
            result = { chains, count: chains.length, source: "CADReasoningChainEngine.listChains" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_reasoning_generate"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADReasoningChainEngine wired successfully (4 actions)')
