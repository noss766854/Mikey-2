export const ApplicationCommandOptionType = Object.freeze({
  SUB_COMMAND: 1,
  STRING: 3,
  INTEGER: 4,
  ROLE: 8
});

export const COMMAND_NAMES = Object.freeze({
  STREAM: "stream",
  MIKEY: "mikey",
  STOP_BARK: "stopbark",
  START_BARK: "startbark",
  ROLE_REPLY: "rolereply"
});

const ADMINISTRATOR_PERMISSION = "8";

export const MIKEY_COMMANDS = [
  {
    name: COMMAND_NAMES.STREAM,
    description: "Get Capy's usual stream time."
  },
  {
    name: COMMAND_NAMES.MIKEY,
    description: "Talk to Mikey 2.0.",
    options: [
      {
        type: ApplicationCommandOptionType.STRING,
        name: "message",
        description: "What you want to say to Mikey.",
        required: false
      }
    ]
  },
  {
    name: COMMAND_NAMES.STOP_BARK,
    description: "Stop Mikey's scheduled barking.",
    default_member_permissions: ADMINISTRATOR_PERMISSION,
    dm_permission: false
  },
  {
    name: COMMAND_NAMES.START_BARK,
    description: "Start Mikey's scheduled barking.",
    default_member_permissions: ADMINISTRATOR_PERMISSION,
    dm_permission: false
  },
  {
    name: COMMAND_NAMES.ROLE_REPLY,
    description: "Configure random replies for a server role.",
    default_member_permissions: ADMINISTRATOR_PERMISSION,
    dm_permission: false,
    options: [
      {
        type: ApplicationCommandOptionType.SUB_COMMAND,
        name: "add",
        description: "Add a random reply for a role.",
        options: [
          {
            type: ApplicationCommandOptionType.ROLE,
            name: "role",
            description: "The role that receives special replies.",
            required: true
          },
          {
            type: ApplicationCommandOptionType.STRING,
            name: "reply",
            description: "The reply Mikey can randomly choose.",
            required: true,
            max_length: 200
          }
        ]
      },
      {
        type: ApplicationCommandOptionType.SUB_COMMAND,
        name: "remove",
        description: "Remove one reply from a role.",
        options: [
          {
            type: ApplicationCommandOptionType.ROLE,
            name: "role",
            description: "The configured role.",
            required: true
          },
          {
            type: ApplicationCommandOptionType.INTEGER,
            name: "number",
            description: "The reply number shown by /rolereply list.",
            required: true,
            min_value: 1
          }
        ]
      },
      {
        type: ApplicationCommandOptionType.SUB_COMMAND,
        name: "list",
        description: "List the replies configured for a role.",
        options: [
          {
            type: ApplicationCommandOptionType.ROLE,
            name: "role",
            description: "The configured role.",
            required: true
          }
        ]
      },
      {
        type: ApplicationCommandOptionType.SUB_COMMAND,
        name: "clear",
        description: "Remove every special reply for a role.",
        options: [
          {
            type: ApplicationCommandOptionType.ROLE,
            name: "role",
            description: "The configured role.",
            required: true
          }
        ]
      }
    ]
  }
];
