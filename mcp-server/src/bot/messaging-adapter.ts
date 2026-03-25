/**
 * Cross-platform messaging adapter for PRISM bot.
 *
 * Abstracts Discord, Slack, Teams, and Telegram into a unified interface
 * so PRISM's dispatcher integration layer only needs one code path.
 *
 * @module bot/messaging-adapter
 */

// ---------------------------------------------------------------------------
// Unified message types
// ---------------------------------------------------------------------------

export interface Message {
  platform: 'discord' | 'slack' | 'teams' | 'telegram';
  channelId: string;
  userId: string;
  userName?: string;
  content: string;
  command?: string;
  args?: Record<string, string | number>;
  timestamp: number;
  threadId?: string;        // For threaded replies
  replyToMessageId?: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface ResponseEmbed {
  title: string;
  description?: string;
  color: number;
  fields: EmbedField[];
  footer?: string;
  thumbnail?: string;
}

export interface ResponseFile {
  name: string;
  content: string;
  type: string;  // 'gcode' | 'json' | 'csv' | 'yaml'
}

export interface Response {
  text: string;
  embed?: ResponseEmbed;
  files?: ResponseFile[];
  ephemeral?: boolean;  // Only visible to the command invoker
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export type MessageHandler = (msg: Message) => Promise<Response>;

export interface MessagingAdapter {
  readonly platform: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendResponse(channelId: string, response: Response): Promise<void>;
  onMessage(handler: MessageHandler): void;
  isConnected(): boolean;
}

// ---------------------------------------------------------------------------
// Discord adapter
// ---------------------------------------------------------------------------

export class DiscordAdapter implements MessagingAdapter {
  readonly platform = 'discord';
  private handlers: MessageHandler[] = [];
  private connected = false;

  async connect(): Promise<void> {
    // In production: new Client({ intents: [GatewayIntentBits.Guilds, ...] }).login(token)
    this.connected = true;
    console.log('[PRISM Bot] Discord adapter connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('[PRISM Bot] Discord adapter disconnected');
  }

  async sendResponse(channelId: string, response: Response): Promise<void> {
    // In production: channel.send({ content, embeds, files })
    console.log(`[PRISM Bot] Discord -> ${channelId}: ${response.text?.substring(0, 80) || '(embed)'}`);
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Dispatch incoming message to all handlers, return first response */
  async dispatch(msg: Message): Promise<Response | null> {
    for (const handler of this.handlers) {
      const res = await handler(msg);
      if (res) return res;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Slack adapter (Web API + Socket Mode)
// ---------------------------------------------------------------------------

export class SlackAdapter implements MessagingAdapter {
  readonly platform = 'slack';
  private handlers: MessageHandler[] = [];
  private connected = false;

  async connect(): Promise<void> {
    // In production: new App({ token, signingSecret, socketMode, appToken }).start()
    this.connected = true;
    console.log('[PRISM Bot] Slack adapter connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('[PRISM Bot] Slack adapter disconnected');
  }

  async sendResponse(channelId: string, response: Response): Promise<void> {
    // In production: web.chat.postMessage({ channel, text, blocks })
    console.log(`[PRISM Bot] Slack -> ${channelId}: ${response.text?.substring(0, 80) || '(blocks)'}`);
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async dispatch(msg: Message): Promise<Response | null> {
    for (const handler of this.handlers) {
      const res = await handler(msg);
      if (res) return res;
    }
    return null;
  }

  /** Convert PRISM embed to Slack Block Kit format */
  static toBlocks(response: Response): unknown[] {
    const blocks: unknown[] = [];

    if (response.text) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: response.text } });
    }

    if (response.embed) {
      if (response.embed.title) {
        blocks.push({ type: 'header', text: { type: 'plain_text', text: response.embed.title } });
      }
      if (response.embed.description) {
        blocks.push({ type: 'section', text: { type: 'mrkdwn', text: response.embed.description } });
      }
      // Fields as 2-column sections
      const fields = response.embed.fields || [];
      for (let i = 0; i < fields.length; i += 2) {
        const section: { type: string; fields: unknown[] } = { type: 'section', fields: [] };
        section.fields.push({ type: 'mrkdwn', text: `*${fields[i].name}*\n${fields[i].value}` });
        if (fields[i + 1]) {
          section.fields.push({ type: 'mrkdwn', text: `*${fields[i + 1].name}*\n${fields[i + 1].value}` });
        }
        blocks.push(section);
      }
      if (response.embed.footer) {
        blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: response.embed.footer }] });
      }
    }

    return blocks;
  }
}

// ---------------------------------------------------------------------------
// Teams adapter (stub for future)
// ---------------------------------------------------------------------------

export class TeamsAdapter implements MessagingAdapter {
  readonly platform = 'teams';
  private handlers: MessageHandler[] = [];
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
    console.log('[PRISM Bot] Teams adapter connected');
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  async sendResponse(channelId: string, response: Response): Promise<void> {
    console.log(`[PRISM Bot] Teams -> ${channelId}: ${response.text?.substring(0, 80) || '(card)'}`);
  }
  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }
  isConnected(): boolean {
    return this.connected;
  }
}

// ---------------------------------------------------------------------------
// Telegram adapter (stub for future)
// ---------------------------------------------------------------------------

export class TelegramAdapter implements MessagingAdapter {
  readonly platform = 'telegram';
  private handlers: MessageHandler[] = [];
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
    console.log('[PRISM Bot] Telegram adapter connected');
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  async sendResponse(channelId: string, response: Response): Promise<void> {
    console.log(`[PRISM Bot] Telegram -> ${channelId}: ${response.text?.substring(0, 80) || '(message)'}`);
  }
  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }
  isConnected(): boolean {
    return this.connected;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAdapter(platform: string): MessagingAdapter {
  switch (platform) {
    case 'discord':  return new DiscordAdapter();
    case 'slack':    return new SlackAdapter();
    case 'teams':    return new TeamsAdapter();
    case 'telegram': return new TelegramAdapter();
    default: throw new Error(`Unsupported messaging platform: ${platform}. Supported: discord, slack, teams, telegram`);
  }
}

/**
 * Create multiple adapters for multi-platform deployment.
 */
export function createMultiAdapter(platforms: string[]): MessagingAdapter[] {
  return platforms.map(createAdapter);
}
