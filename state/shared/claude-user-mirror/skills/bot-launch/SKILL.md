---
name: bot-launch
description: >
  Launch PRISM Discord/Slack bot for manufacturing assistance
  via messaging platforms. Configures and starts the bot with
  specified platform adapter.
model: sonnet
effort: medium
argument-hint: "[discord|slack] [--webhook]"
---

# Bot Launch Skill

Launch and manage the PRISM messaging bot infrastructure.

## Usage

- `/bot-launch discord` - Start Discord bot with slash commands
- `/bot-launch slack` - Start Slack bot in Socket Mode
- `/bot-launch discord --webhook` - Start bot + webhook receiver
- `/bot-launch status` - Show active adapters and connection status

## Steps

1. Verify environment variables are set:
   - Discord: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID,
     optionally DISCORD_GUILD_ID
   - Slack: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN

2. Import from C:/PRISM/mcp-server/src/bot/:
   - discord-bot.ts - Command map, embed formatter, context
   - bot-config.ts - Rate limits, output constraints
   - messaging-adapter.ts - Platform adapter factory
   - webhook-receiver.ts - External event ingestion

3. Create adapter via createAdapter(platform), call connect().

4. Register PRISM command handler that:
   - Parses incoming slash command/message
   - Checks rate limits via checkAllRateLimits(userId, channelId)
   - Merges channel context with command args
   - Routes to appropriate PRISM dispatcher via COMMAND_MAP
   - Formats response as embed via formatEmbed()
   - Sends response back to channel

5. If --webhook flag present, start webhook server via
   startWebhookServer().

6. Register default webhook handlers for:
   - alarm - Forward machine alarms to notification channel
   - ci - Forward build failures/successes
   - wear - Forward tool wear threshold alerts

## 15 PRISM Commands Available

| Command | Dispatcher | Description |
|---------|-----------|-------------|
| /calc | calcDispatcher | Quick calculation |
| /sf | sfDispatcher | Speed and feed (67-point) |
| /quote | quoteDispatcher | Job quote estimation |
| /material | materialDispatcher | Material lookup |
| /tool | toolCatalogDispatcher | Tool search (95K+) |
| /machine | machineDispatcher | Machine lookup (910) |
| /playbook | playBookDispatcher | Best practices (296) |
| /alarm | alarmDispatcher | Alarm code lookup |
| /simulate | simulationDispatcher | CNC simulation |
| /feasibility | feasibilityDispatcher | Feasibility check |
| /program | camDispatcher | Generate CNC program |
| /post | postProcessorDispatcher | Post-process G-code |
| /setup | machineSetupDispatcher | Setup sheet |
| /wear | calcDispatcher | Tool wear prediction |
| /stability | calcDispatcher | Stability lobe diagram |

## Channel Context

The bot maintains per-channel context so users do not need to
repeat machine/material/tool info:
- Setting material carries forward to subsequent commands
- Context expires after 24 hours
- Explicit args always override implicit context
