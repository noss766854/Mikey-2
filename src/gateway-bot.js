import "dotenv/config";
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits
} from "discord.js";
import { COMMAND_NAMES } from "./commands.js";
import {
  BARK_RESPONSE,
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === COMMAND_NAMES.STREAM) {
    await interaction.reply({
      content: makeStreamReply(interaction.user.id),
      allowedMentions: { users: [interaction.user.id] }
    });
    return;
  }

  if (interaction.commandName === COMMAND_NAMES.MIKEY) {
    const message = interaction.options.getString("message") ?? "help";

    if (isStreamQuestion(message)) {
      await interaction.reply({
        content: makeStreamReply(interaction.user.id),
        allowedMentions: { users: [interaction.user.id] }
      });
      return;
    }

    const displayName =
      interaction.member?.displayName ??
      interaction.user.globalName ??
      interaction.user.username;
    await interaction.reply(makeCasualReply(message, displayName));
    return;
  }

  const isBarkCommand =
    interaction.commandName === COMMAND_NAMES.STOP_BARK ||
    interaction.commandName === COMMAND_NAMES.START_BARK;

  if (!isBarkCommand) {
    return;
  }

  const isAdmin =
    interaction.inGuild() &&
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (!isAdmin) {
    await interaction.reply({
      content: "Only an administrator can control the barking.",
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === COMMAND_NAMES.STOP_BARK) {
    if (!barkInterval) {
      await interaction.reply("Barking is already disabled.");
      return;
    }

    clearInterval(barkInterval);
    barkInterval = null;
    await interaction.reply("Stopped barking.");
    return;
  }

  const started = startScheduledBarking(client);
  await interaction.reply(
    started ? "Started barking." : "Barking is already enabled."
  );
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

client.login(token);
