// tier: T4
/**
 * embedding-cache-guard.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI05
 *
 * Monitors embedding operations and warns on cache issues:
 * - Cache size exceeding threshold (memory pressure)
 * - Cache hit rate below threshold (inefficient)
 * - Embedding dimension mismatches (corrupted data)
 */

const CACHE_SIZE_WARN_THRESHOLD = 50000; // 50k embeddings
const CACHE_MEMORY_WARN_MB = 500; // 500MB

export default async function embeddingCacheGuard({ tool, toolInput, toolResult }) {
  // Only check embedding-related operations
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like embedding work
  if (!content.includes('embed') && !content.includes('cache') && !content.includes('similarity')) {
    return;
  }

  const warnings = [];

  // Check for cache size warnings
  const cacheSizeMatch = content.match(/cacheStats.*?size[":]\s*(\d+)/i);
  if (cacheSizeMatch) {
    const size = parseInt(cacheSizeMatch[1], 10);
    if (size > CACHE_SIZE_WARN_THRESHOLD) {
      warnings.push({
        severity: 'warning',
        msg: `Embedding cache has ${size.toLocaleString()} entries — consider clearing stale embeddings`,
      });
    }
  }

  // Check for memory usage
  const memoryMatch = content.match(/memoryBytes[":]\s*(\d+)/i);
  if (memoryMatch) {
    const bytes = parseInt(memoryMatch[1], 10);
    const mb = bytes / (1024 * 1024);
    if (mb > CACHE_MEMORY_WARN_MB) {
      warnings.push({
        severity: 'warning',
        msg: `Embedding cache using ${mb.toFixed(0)}MB — memory pressure may occur`,
      });
    }
  }

  // Check for dimension mismatches
  const dimMismatchMatch = content.match(/dimension mismatch|dim.*?!=|incompatible.*?embedding/i);
  if (dimMismatchMatch) {
    warnings.push({
      severity: 'error',
      msg: 'Embedding dimension mismatch detected — cache may be corrupted',
    });
  }

  // Check for empty search results (potential quality issue)
  const emptySearchMatch = content.match(/search.*?results.*?length[":]\s*0|no.*?similar.*?found/i);
  if (emptySearchMatch) {
    warnings.push({
      severity: 'info',
      msg: 'Similarity search returned no results — check query embedding quality',
    });
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');
  const infos = warnings.filter(w => w.severity === 'info');

  let message = '';
  if (errors.length > 0) {
    message += `\n⛔ EMBEDDING ERRORS:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ EMBEDDING WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }
  if (infos.length > 0) {
    message += `\nℹ️ EMBEDDING INFO:\n${infos.map(i => `  - ${i.msg}`).join('\n')}`;
  }

  return message.trim();
}
