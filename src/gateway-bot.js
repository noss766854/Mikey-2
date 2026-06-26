import "dotenv/config";
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Partials
} from "discord.js";
import {
  BARK_RESPONSE,
  isStreamQuestion,
  makeCasualReply,
  makeStreamReply,
  shouldCasuallyReply
} from "./responses.js";

const token = process.env.DISCORD_TOKEN;
const barkChannelId = process.env.BARK_CHANNEL_ID;
const HOUR_MS = 60 * 60 * 1000;
let lastReplyChannelId = null;

if (!token) {
  console.error("Missing DISCORD_TOKEN. Set it in your host's environment variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Mikey 2.0 is online as ${readyClient.user.tag}`);
  readyClient.user.setActivity("for stream questions", {
    type: ActivityType.Listening
  });

  setInterval(() => {
    sendHourlyBark(readyClient);
  }, HOUR_MS);
});

function rememberReplyChannel(message) {
  if (message.guild && typeof message.channel?.send === "function") {
    lastReplyChannelId = message.channel.id;
  }
}

async function sendHourlyBark(readyClient) {
  const channelId = barkChannelId || lastReplyChannelId;

  if (!channelId) {
    return;
  }

  try {
    const channel = await readyClient.channels.fetch(channelId);

    if (typeof channel?.send === "function") {
      await channel.send(BARK_RESPONSE);
    }
  } catch (error) {
    console.error("Failed to send hourly bark:", error);
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    return;
  }

  if (isStreamQuestion(message.content)) {
    rememberReplyChannel(message);
    await message.channel.send({
      content: makeStreamReply(message.author.id),
      allowedMentions: {
        users: [message.author.id]
      }
    });
    return;
  }

  if (shouldCasuallyReply(message, client.user?.id)) {
    rememberReplyChannel(message);
    const displayName =
      message.member?.displayName ??
      message.author.globalName ??
      message.author.username;

    await message.reply({
      content: makeCasualReply(message.content, displayName),
      allowedMentions: {
        repliedUser: false
      }
    });
  }
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

client.login(token);
