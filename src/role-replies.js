export const MAX_ROLE_REPLIES = 6;
export const MAX_ROLE_REPLY_LENGTH = 200;

const CONFIG_PREFIX = "MIKEY_ROLE_REPLIES_V1:";

export function encodeRoleReplyConfig(roleId, replies) {
  const payload = Buffer.from(
    JSON.stringify({ roleId, replies }),
    "utf8"
  ).toString("base64");

  return `Mikey role replies for <@&${roleId}>.\n||${CONFIG_PREFIX}${payload}||`;
}

export function decodeRoleReplyConfig(content) {
  const markerIndex = content.indexOf(CONFIG_PREFIX);

  if (markerIndex === -1) {
    return null;
  }

  const encoded = content
    .slice(markerIndex + CONFIG_PREFIX.length)
    .replace(/\|\|.*$/s, "")
    .trim();

  try {
    const config = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));

    if (
      !/^\d+$/.test(config.roleId) ||
      !Array.isArray(config.replies) ||
      config.replies.length === 0 ||
      config.replies.length > MAX_ROLE_REPLIES ||
      config.replies.some(
        (reply) =>
          typeof reply !== "string" ||
          reply.length === 0 ||
          reply.length > MAX_ROLE_REPLY_LENGTH
      )
    ) {
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

export function pickRandomReply(replies, random = Math.random) {
  if (!replies?.length) {
    return null;
  }

  const index = Math.min(Math.floor(random() * replies.length), replies.length - 1);
  return replies[index];
}

export class RoleReplyStore {
  constructor(channelId) {
    this.channelId = channelId;
    this.channel = null;
    this.entries = new Map();
  }

  async load(client) {
    const channel = await client.channels.fetch(this.channelId);

    if (!channel?.isTextBased() || !channel.messages) {
      throw new Error(`Role-reply channel ${this.channelId} is not text-based.`);
    }

    this.channel = channel;
    this.entries.clear();

    let before;
    let hasMore = true;

    while (hasMore) {
      const page = await channel.messages.fetchPins({ before, limit: 50 });

      for (const item of page.items) {
        const message = item.message;

        if (message.author.id !== client.user.id) {
          continue;
        }

        const config = decodeRoleReplyConfig(message.content);

        if (config) {
          this.entries.set(config.roleId, {
            replies: config.replies,
            message
          });
        }
      }

      hasMore = page.hasMore && page.items.length > 0;
      before = page.items.at(-1)?.pinnedAt;
    }

    return this.entries.size;
  }

  getReplies(roleId) {
    return [...(this.entries.get(roleId)?.replies ?? [])];
  }

  getReplyForMember(member, random = Math.random) {
    const roles = member?.roles?.cache;

    if (!roles) {
      const roleIds = Array.isArray(member?.roles) ? member.roles : [];
      const roleId = roleIds.find((id) => this.entries.has(id));

      return pickRandomReply(this.entries.get(roleId)?.replies, random);
    }

    const matchingRoles = [...roles.values()]
      .filter((role) => this.entries.has(role.id))
      .sort((left, right) => right.position - left.position);
    const replies = this.entries.get(matchingRoles[0]?.id)?.replies;

    return pickRandomReply(replies, random);
  }

  async addReply(roleId, reply) {
    const cleanReply = reply.trim();
    const current = this.entries.get(roleId);
    const replies = current?.replies ?? [];

    if (!cleanReply) {
      return { status: "empty" };
    }

    if (cleanReply.length > MAX_ROLE_REPLY_LENGTH) {
      return { status: "too_long" };
    }

    if (replies.includes(cleanReply)) {
      return { status: "duplicate" };
    }

    if (replies.length >= MAX_ROLE_REPLIES) {
      return { status: "full" };
    }

    const nextReplies = [...replies, cleanReply];
    const message = await this.saveRole(roleId, nextReplies, current?.message);
    this.entries.set(roleId, { replies: nextReplies, message });

    return { status: "added", count: nextReplies.length };
  }

  async removeReply(roleId, replyNumber) {
    const current = this.entries.get(roleId);
    const index = replyNumber - 1;

    if (!current || index < 0 || index >= current.replies.length) {
      return { status: "missing" };
    }

    const nextReplies = current.replies.filter((_, itemIndex) => itemIndex !== index);

    if (nextReplies.length === 0) {
      await current.message.delete();
      this.entries.delete(roleId);
    } else {
      const message = await this.saveRole(roleId, nextReplies, current.message);
      this.entries.set(roleId, { replies: nextReplies, message });
    }

    return { status: "removed", count: nextReplies.length };
  }

  async clearRole(roleId) {
    const current = this.entries.get(roleId);

    if (!current) {
      return false;
    }

    await current.message.delete();
    this.entries.delete(roleId);
    return true;
  }

  async saveRole(roleId, replies, existingMessage) {
    if (!this.channel) {
      throw new Error("Role-reply storage is not available.");
    }

    const content = encodeRoleReplyConfig(roleId, replies);

    if (content.length > 2_000) {
      throw new Error("The configured replies are too large for Discord storage.");
    }

    if (existingMessage) {
      return existingMessage.edit({
        content,
        allowedMentions: { parse: [] }
      });
    }

    const message = await this.channel.send({
      content,
      allowedMentions: { parse: [] }
    });

    try {
      await message.pin("Persistent Mikey role-reply configuration");
    } catch (error) {
      await message.delete().catch(() => {});
      throw new Error(
        `Mikey needs Manage Messages in <#${this.channelId}> to save role replies.`,
        { cause: error }
      );
    }

    return message;
  }
}
