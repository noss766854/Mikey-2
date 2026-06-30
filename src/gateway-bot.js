import "dotenv/config";
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
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
import { MAX_ROLE_REPLIES, RoleReplyStore } from "./role-replies.js";

const token = process.env.DISCORD_TOKEN;
const defaultBarkChannelId = "1375559893133561886";
const barkChannelId = process.env.BARK_CHANNEL_ID || defaultBarkChannelId;
const roleReplyChannelId =
  process.env.ROLE_REPLY_CONFIG_CHANNEL_ID || barkChannelId;
const BARK_INTERVAL_MS = 30 * 60 * 1000;
const roleReplyStore = new RoleReplyStore(roleReplyChannelId);
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

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Mikey 2.0 is online as ${readyClient.user.tag}`);
  readyClient.user.setActivity("for stream questions", {
    type: ActivityType.Listening
  });

  try {
    const roleCount = await roleReplyStore.load(readyClient);
    console.log(`Loaded role replies for ${roleCount} roles.`);
  } catch (error) {
    console.error("Failed to load role replies:", error);
  }

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

  const streamQuestion = isStreamQuestion(message.content);
  const casualTrigger = shouldCasuallyReply(message, client.user?.id);

  if (!streamQuestion && !casualTrigger) {
    return;
  }

  const roleReply = roleReplyStore.getReplyForMember(message.member);

  if (roleReply) {
    rememberReplyChannel(message);
    await message.reply({
      content: roleReply,
      allowedMentions: {
        parse: [],
        repliedUser: false
      }
    });
    return;
  }

  if (streamQuestion) {
    rememberReplyChannel(message);
    await message.channel.send({
      content: makeStreamReply(message.author.id),
      allowedMentions: {
        users: [message.author.id]
      }
    });
    return;
  }

  if (casualTrigger) {
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

  if (interaction.commandName === COMMAND_NAMES.ROLE_REPLY) {
    await handleRoleReplyCommand(interaction);
    return;
  }

  const roleReply = roleReplyStore.getReplyForMember(interaction.member);

  if (
    roleReply &&
    (interaction.commandName === COMMAND_NAMES.STREAM ||
      interaction.commandName === COMMAND_NAMES.MIKEY)
  ) {
    await interaction.reply({
      content: roleReply,
      allowedMentions: { parse: [] }
    });
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

async function handleRoleReplyCommand(interaction) {
  const isAdmin =
    interaction.inGuild() &&
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (!isAdmin) {
    await interaction.reply({
      content: "Only an administrator can configure role replies.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole("role", true);

    if (!roleReplyStore.channel) {
      await interaction.editReply("Role-reply storage is not available.");
      return;
    }

    if (interaction.guildId !== roleReplyStore.channel.guildId) {
      await interaction.editReply(
        "That role is not from the server containing Mikey's role-reply storage channel."
      );
      return;
    }

    if (subcommand === "add") {
      const reply = interaction.options.getString("reply", true);
      const result = await roleReplyStore.addReply(role.id, reply);
      const messages = {
        added: `Added reply ${result.count}/${MAX_ROLE_REPLIES} for ${role}.`,
        duplicate: `That reply is already configured for ${role}.`,
        empty: "The reply cannot be empty.",
        too_long: "The reply cannot be longer than 200 characters.",
        full: `${role} already has the maximum of ${MAX_ROLE_REPLIES} replies.`
      };

      await interaction.editReply({
        content: messages[result.status],
        allowedMentions: { parse: [] }
      });
      return;
    }

    if (subcommand === "remove") {
      const number = interaction.options.getInteger("number", true);
      const result = await roleReplyStore.removeReply(role.id, number);
      const content =
        result.status === "removed"
          ? `Removed reply ${number} from ${role}. ${result.count} remaining.`
          : `Reply ${number} does not exist for ${role}. Use /rolereply list first.`;

      await interaction.editReply({
        content,
        allowedMentions: { parse: [] }
      });
      return;
    }

    if (subcommand === "list") {
      const replies = roleReplyStore.getReplies(role.id);
      const content = replies.length
        ? [`Replies for ${role}:`, ...replies.map((reply, index) => `${index + 1}. ${reply}`)].join("\n")
        : `No replies are configured for ${role}.`;

      await interaction.editReply({
        content,
        allowedMentions: { parse: [] }
      });
      return;
    }

    const cleared = await roleReplyStore.clearRole(role.id);
    await interaction.editReply({
      content: cleared
        ? `Cleared all role replies for ${role}.`
        : `No replies are configured for ${role}.`,
      allowedMentions: { parse: [] }
    });
  } catch (error) {
    console.error("Failed to configure role replies:", error);
    await interaction.editReply(
      error instanceof Error
        ? error.message
        : "Could not update the role replies."
    );
  }
}

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

client.login(token);
