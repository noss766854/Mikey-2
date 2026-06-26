export const ApplicationCommandOptionType = Object.freeze({
  STRING: 3
});

export const COMMAND_NAMES = Object.freeze({
  STREAM: "stream",
  MIKEY: "mikey",
  STOP_BARK: "stopbark",
  START_BARK: "startbark"
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
  }
];
