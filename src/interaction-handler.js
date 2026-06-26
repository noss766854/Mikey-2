import { COMMAND_NAMES } from "./commands.js";
import {
  isStreamQuestion,
  makeCasualReply,
  makeStreamReply
} from "./responses.js";

export const InteractionType = Object.freeze({
  PING: 1,
  APPLICATION_COMMAND: 2
});

export const InteractionResponseType = Object.freeze({
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4
});

export const MessageFlags = Object.freeze({
  EPHEMERAL: 1 << 6
});

function getRequester(interaction) {
  const user = interaction.member?.user ?? interaction.user ?? {};

  return {
    id: user.id,
    displayName:
      interaction.member?.nick ??
      user.global_name ??
      user.username ??
      "there"
  };
}

function getStringOption(interaction, optionName) {
  return (
    interaction.data?.options?.find((option) => option.name === optionName)
      ?.value ?? ""
  );
}

function commandReply(content, options = {}) {
  const data = {
    content,
    allowed_mentions: options.allowedMentions ?? {
      parse: []
    }
  };

  if (options.ephemeral) {
    data.flags = MessageFlags.EPHEMERAL;
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data
  };
}

function streamReply(interaction) {
  const requester = getRequester(interaction);

  return commandReply(makeStreamReply(requester.id), {
    allowedMentions: {
      parse: [],
      users: [requester.id]
    }
  });
}

function mikeyReply(interaction) {
  const requester = getRequester(interaction);
  const message = getStringOption(interaction, "message");

  if (message && isStreamQuestion(message)) {
    return streamReply(interaction);
  }

  return commandReply(
    makeCasualReply(message || "help", requester.displayName)
  );
}

export function handleInteraction(interaction) {
  if (interaction.type === InteractionType.PING) {
    return {
      type: InteractionResponseType.PONG
    };
  }

  if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
    return commandReply("Mikey 2.0 only handles slash commands right now.", {
      ephemeral: true
    });
  }

  if (interaction.data?.name === COMMAND_NAMES.STREAM) {
    return streamReply(interaction);
  }

  if (interaction.data?.name === COMMAND_NAMES.MIKEY) {
    return mikeyReply(interaction);
  }

  if (
    interaction.data?.name === COMMAND_NAMES.STOP_BARK ||
    interaction.data?.name === COMMAND_NAMES.START_BARK
  ) {
    return commandReply(
      "Bark controls must be handled by Mikey's always-running Gateway bot.",
      { ephemeral: true }
    );
  }

  return commandReply("Unknown command.", {
    ephemeral: true
  });
}
