import "dotenv/config";
import { MIKEY_COMMANDS } from "./commands.js";

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.APPLICATION_ID ?? process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error("Missing DISCORD_TOKEN. Add your bot token to .env.");
  process.exit(1);
}

if (!applicationId) {
  console.error("Missing APPLICATION_ID. Add your Discord application ID to .env.");
  process.exit(1);
}

const route = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(route, {
  method: "PUT",
  headers: {
    authorization: `Bot ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify(MIKEY_COMMANDS)
});

if (!response.ok) {
  console.error(`Discord rejected the command registration: ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const commands = await response.json();
const location = guildId ? `guild ${guildId}` : "global";

console.log(`Registered ${commands.length} Mikey 2.0 commands for ${location}.`);
