import "dotenv/config";

const applicationId = process.env.APPLICATION_ID ?? process.env.CLIENT_ID;

if (!applicationId) {
  console.error("Missing APPLICATION_ID. Add your Discord application ID to .env.");
  process.exit(1);
}

const inviteUrl = new URL("https://discord.com/oauth2/authorize");
inviteUrl.searchParams.set("client_id", applicationId);
inviteUrl.searchParams.set("scope", "bot applications.commands");
inviteUrl.searchParams.set("permissions", "0");

console.log(inviteUrl.toString());
