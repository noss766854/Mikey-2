import "dotenv/config";
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits
} from "discord.js";
import {
  BARK_RESPONSE,
  isStartBarkCommand,
  isStopBarkCommand,
  isStreamQuestion,
  makeCasualReply,
  makeStreamReply,
  shouldCasuallyReply
} from "./responses.js";

const token = process.env.DISCORD_TOKEN;
const defaultBarkChannelId = "1375559893133561886";
const barkChannelId = process.env.BARK_CHANNEL_ID || defaultBarkChannelId;
const BARK_INTERVAL_MS = 30 * 60 * 1000;
let lastReplyChannelId = null;
let barkInterval = null;

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

  startScheduledBarking(readyClient);
});

function rememberReplyChannel(message) {
  if (message.guild && typeof message.channel?.send === "function") {
    lastReplyChannelId = message.channel.id;
  }
}

async function sendScheduledBark(readyClient) {
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
    console.error("Failed to send scheduled bark:", error);
  }
}

function startScheduledBarking(readyClient) {
  if (barkInterval) {
    return false;
  }

  barkInterval = setInterval(() => {
    sendScheduledBark(readyClient);
  }, BARK_INTERVAL_MS);
  return true;
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    return;
  }

  if (isStopBarkCommand(message.content)) {
    const isAdmin =
      message.inGuild() &&
      message.member?.permissions.has(PermissionFlagsBits.Administrator);

    if (!isAdmin) {
      await message.reply({
        content: "Only an administrator can stop the barking.",
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (barkInterval) {
      clearInterval(barkInterval);
      barkInterval = null;
      await message.reply({
        content: "Stopped barking.",
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    await message.reply({
      content: "Barking is already disabled.",
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (isStartBarkCommand(message.content)) {
    const isAdmin =
      message.inGuild() &&
      message.member?.permissions.has(PermissionFlagsBits.Administrator);

    if (!isAdmin) {
      await message.reply({
        content: "Only an administrator can start the barking.",
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const started = startScheduledBarking(client);
    await message.reply({
      content: started ? "Started barking." : "Barking is already enabled.",
      allowedMentions: { repliedUser: false }
    });
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
