/** Type declarations for optional ws dependency */
declare module "ws" {
  import { Server as HttpServer } from "http";

  interface ServerOptions {
    server?: HttpServer;
    path?: string;
  }

  class WebSocketServer {
    constructor(options: ServerOptions);
    on(event: "connection", cb: (ws: WebSocket) => void): this;
    close(): void;
  }

  interface WebSocket {
    on(event: string, cb: (...args: any[]) => void): this;
    send(data: string): void;
    ping(): void;
    close(): void;
    terminate(): void;
    readyState: number;
  }

  export { WebSocketServer, WebSocket };
}
