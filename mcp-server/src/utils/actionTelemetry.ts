/**
 * Action telemetry logger — tracks dispatcher action execution metrics.
 * Used by dispatchers to record action duration, success/failure, and source.
 */

export function logActionTelemetry(
  action: string,
  durationMs: number,
  success: boolean,
  dispatcher: string,
): void {
  // Log to stderr in debug mode only (avoid polluting MCP stdout)
  if (process.env.PRISM_TELEMETRY_DEBUG === "1") {
    const status = success ? "OK" : "FAIL";
    process.stderr.write(
      `[telemetry] ${dispatcher}/${action} ${status} ${durationMs}ms\n`
    );
  }
}
