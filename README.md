# Mikey 2.0 Discord Bot

Mikey 2.0 can run in two modes:

- Docker/Gateway mode for normal chat messages like `when stream`.
- Vercel slash-command mode for `/stream` and `/mikey`.

Commands:

- `/stream` replies with Capy's usual stream time and info link.
- `/mikey message:...` lets people talk to Mikey. If the message is a variation of "when is the stream?", Mikey sends the stream reply.

## Requirements

- Node.js 20 or newer
- A Discord application with a bot token
- A Docker/always-on host for normal chat replies, or a free Vercel account for slash commands

## Discord Setup

1. Open the Discord Developer Portal and create an application.
2. Go to **General Information** and copy:
   - Application ID
   - Public Key
3. Go to **Bot**, create a bot, and copy the bot token.
4. For normal chat replies, go to **Bot** and enable **Message Content Intent**.
5. Copy `.env.example` to `.env` and fill in:

   ```env
   DISCORD_TOKEN=your-real-bot-token
   APPLICATION_ID=your-application-id
   PUBLIC_KEY=your-application-public-key
   GUILD_ID=optional-test-server-id
   ```

## Install

```bash
npm install
```

## Run As A Normal Chat Bot

Use this mode on Docker/always-on hosts. Mikey will answer phrases like `when stream` without a slash command.

Required environment variable:

```env
DISCORD_TOKEN=your-real-bot-token
BARK_CHANNEL_ID=optional-channel-id-for-hourly-barks
```

Start locally:

```bash
npm start
```

Docker hosts can build the included `Dockerfile`. The container starts `npm start` through pnpm and runs the Gateway bot.

Mikey says `bark` once per hour. Set `BARK_CHANNEL_ID` to choose the channel. If it is blank, Mikey barks in the last server channel where he replied after the current restart.

## Register Commands

For fast testing, put your test server ID in `GUILD_ID`, then run:

```bash
npm run register
```

Guild commands update almost instantly. If `GUILD_ID` is blank, the script registers global commands, which can take a while to appear.

## Invite Mikey

Generate an invite URL:

```bash
npm run invite
```

Open the printed URL and add Mikey to your server.

## Deploy To Vercel

1. Push this folder to a GitHub repo or import it directly into Vercel.
2. In Vercel, add these environment variables:
   - `DISCORD_TOKEN`
   - `APPLICATION_ID`
   - `PUBLIC_KEY`
   - `GUILD_ID` only if you want guild-only command registration while testing
3. Deploy the project.
4. Copy your deployment URL and add this to your Discord app's **Interactions Endpoint URL**:

   ```text
   https://your-project.vercel.app/api/interactions
   ```

5. Save the Discord application. Discord will ping the endpoint and verify the signature.

## Stream Reply

`/stream` replies:

```text
@user Capy usually streams every day for atleast an hour, usually after 8PM UTC+2 (Romanian time) but check out https://discord.com/channels/1330595460112449556/1331588384954515567 for more information.
```

`/mikey message:when stream?` sends the same reply.

## Test

```bash
npm test
```
