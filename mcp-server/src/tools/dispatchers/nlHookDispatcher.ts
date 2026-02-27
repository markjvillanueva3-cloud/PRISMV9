/**
 * PRISM F6: Natural Language Hook Dispatcher (#28)
 * =================================================
 * 
 * prism_nl_hook — 8 actions for NL hook authoring.
 * 
 * Actions:
 *   create     — Full pipeline: NL → parse → compile → validate → sandbox → deploy
 *   parse      — Parse NL to HookSpec only (no compile/deploy)
 *   approve    — Approve a pending LLM-generated hook
 *   remove     — Remove/rollback a deployed hook
 *   list       — List all NL-authored hooks
 *   get        — Get single hook details
 *   stats      — Registry statistics
 *   config     — View or update config
 * 
 * @version 1.0.0
 * @feature F6
 */

import { z } from 'zod';
import { log } from '../../utils/Logger.js';
import { nlHookEngine } from '../../engines/NLHookEngine.js';
import { slimResponse } from '../../utils/responseSlimmer.js';
import { dispatcherError } from '../../utils/dispatcherMiddleware.js';

const ACTIONS = ['create', 'parse', 'approve', 'remove', 'list', 'get', 'stats', 'config'] as const;

function ok(data: any) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(slimResponse(data)) }] };
}

export function registerNLHookDispatcher(server: any): void {
  server.tool(
    'prism_nl_hook',
    `Natural language hook authoring (8 actions). Parse NL descriptions into live hooks. Actions: ${ACTIONS.join(', ')}`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_nl_hook] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import('../../utils/paramNormalizer.js');
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      try {
        switch (action) {
          case 'create': {
            if (!params.description) return ok({ error: 'Missing required param: description (natural language hook description)' });
            const result = nlHookEngine.createFromNL(params.description);
            return ok({ status: result.deploy?.status || result.stage_failed || 'unknown', ...result });
          }

          case 'parse': {
            if (!params.description) return ok({ error: 'Missing required param: description' });
            const result = nlHookEngine.parse(params.description);
            return ok(result);
          }

          case 'approve': {
            if (!params.hook_id) return ok({ error: 'Missing required param: hook_id' });
            const approver = params.approver || 'admin';
            const result = nlHookEngine.approve(params.hook_id, approver);
            return ok(result);
          }

          case 'remove': {
            if (!params.hook_id) return ok({ error: 'Missing required param: hook_id' });
            const result = nlHookEngine.remove(params.hook_id);
            return ok(result);
          }

          case 'list': {
            const filter: any = {};
            if (params.status) filter.status = params.status;
            if (params.tag) filter.tag = params.tag;
            const hooks = nlHookEngine.list(filter);
            return ok({
              count: hooks.length,
              hooks: hooks.map(h => ({
                id: h.id, name: h.spec.name, status: h.deploy_status,
                natural_language: h.natural_language.slice(0, 100),
                phase: h.spec.phase, mode: h.spec.mode,
                compile_method: h.compile_method,
                error_count: h.error_count, execution_count: h.execution_count,
                created_at: new Date(h.created_at).toISOString(),
              })),
            });
          }

          case 'get': {
            if (!params.hook_id) return ok({ error: 'Missing required param: hook_id' });
            const record = nlHookEngine.get(params.hook_id);
            if (!record) return ok({ error: 'Hook not found' });
            return ok(record);
          }

          case 'stats': {
            return ok(nlHookEngine.getStats());
          }

          case 'config': {
            if (params.updates && typeof params.updates === 'object') {
              const updated = nlHookEngine.updateConfig(params.updates);
              return ok({ status: 'updated', config: updated });
            }
            return ok(nlHookEngine.getConfig());
          }

          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_nl_hook");
      }
    }
  );
}
