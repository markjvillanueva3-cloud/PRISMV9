/**
 * Stdin reading utility for CLI piping support.
 * Reads all data from stdin when not a TTY.
 */

export function readStdin(timeoutMs = 1000): Promise<string | null> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    const MAX_STDIN = 50 * 1024 * 1024; // 50MB
    let data = "";
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners("data");
      process.stdin.removeAllListeners("end");
      resolve(data || null);
    }, timeoutMs);

    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => {
      data += chunk;
      if (data.length > MAX_STDIN) {
        clearTimeout(timer);
        process.stdin.removeAllListeners("data");
        process.stdin.removeAllListeners("end");
        resolve(null);
        return;
      }
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data || null);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    process.stdin.resume();
  });
}
