// tier: T3
/**
 * rag-relevance-guard.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI06
 *
 * Monitors RAG retrieval quality and warns on issues:
 * - Empty retrieval results (no similar parts found)
 * - Low similarity scores (potential poor matches)
 * - Customer mismatch warnings (cross-customer retrieval)
 * - High retrieval latency (> 500ms)
 */

const MIN_SIMILARITY_WARN = 0.5; // Warn if best match < 50% similarity
const HIGH_LATENCY_MS = 500;

export default async function ragRelevanceGuard({ tool, toolInput, toolResult }) {
  // Only check RAG-related operations
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like RAG work
  if (!content.includes('rag') && !content.includes('retrieve') && !content.includes('similarity')) {
    return;
  }

  const warnings = [];

  // Check for empty retrieval
  const emptyMatch = content.match(/retrievedCount[":]\s*0|results.*?\[\s*\]/i);
  if (emptyMatch) {
    warnings.push({
      severity: 'warning',
      msg: 'RAG retrieval returned no results — check corpus coverage and filters',
    });
  }

  // Check for low similarity
  const similarityMatch = content.match(/similarity[":]\s*(0\.\d+)/g);
  if (similarityMatch) {
    const similarities = similarityMatch.map(m => parseFloat(m.match(/\d+\.\d+/)?.[0] ?? '1'));
    const maxSim = Math.max(...similarities);
    if (maxSim < MIN_SIMILARITY_WARN) {
      warnings.push({
        severity: 'warning',
        msg: `Best RAG match has only ${(maxSim * 100).toFixed(0)}% similarity — results may be poor`,
      });
    }
  }

  // Check for high latency
  const latencyMatch = content.match(/retrievalTimeMs[":]\s*(\d+(?:\.\d+)?)/i);
  if (latencyMatch) {
    const latency = parseFloat(latencyMatch[1]);
    if (latency > HIGH_LATENCY_MS) {
      warnings.push({
        severity: 'info',
        msg: `RAG retrieval took ${latency.toFixed(0)}ms — consider VP-tree index for large corpora`,
      });
    }
  }

  // Check for customer mismatch in context
  const customerMatch = content.match(/customer[":]\s*"(\w+)"/gi);
  if (customerMatch && customerMatch.length > 1) {
    const customers = new Set(customerMatch.map(m => m.match(/"(\w+)"/)?.[1]));
    if (customers.size > 1) {
      warnings.push({
        severity: 'info',
        msg: `RAG results span ${customers.size} customers — consider customer-filtered retrieval`,
      });
    }
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');
  const infos = warnings.filter(w => w.severity === 'info');

  let message = '';
  if (errors.length > 0) {
    message += `\n⛔ RAG ERRORS:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ RAG WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }
  if (infos.length > 0) {
    message += `\nℹ️ RAG INFO:\n${infos.map(i => `  - ${i.msg}`).join('\n')}`;
  }

  return message.trim();
}
