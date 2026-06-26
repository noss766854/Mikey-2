export const ApplicationCommandOptionType = Object.freeze({
  STRING: 3
});

export const COMMAND_NAMES = Object.freeze({
  STREAM: "stream",
  MIKEY: "mikey"
});

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
  }
];
