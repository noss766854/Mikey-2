export const STREAM_INFO_URL =
  "https://discord.com/channels/1330595460112449556/1331588384954515567";

export const STREAM_RESPONSE = `Capy usually streams every day for atleast an hour, usually after 8PM UTC+2 (Romanian time) but check out ${STREAM_INFO_URL} for more information.`;

const STREAM_WORDS = /\b(stream|streams|streaming|livestream|live)\b/i;
const GENERIC_STREAM_CONTEXT =
  /\b(a stream|my stream|your stream|their stream|some stream|something like a stream|stream in my|stream in the|stream at my|stream at the)\b/i;

export function normalizeMessage(content) {
  return content
    .toLowerCase()
    .replace(/<@!?\d+>/g, " ")
    .replace(/\bwhen['\u2019]s\b/g, "whens")
    .replace(/\bwhat['\u2019]s\b/g, "what is")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isStreamQuestion(content) {
  const normalized = normalizeMessage(content);

  if (!STREAM_WORDS.test(normalized)) {
    return false;
  }

  if (GENERIC_STREAM_CONTEXT.test(normalized)) {
    return false;
  }

  const schedulePatterns = [
    /\bwhen(?: is|s| does)? (?:the )?stream(?: start| starts| starting)?\b/,
    /\bwhen (?:does |is )?capy (?:stream|go live|going live|live)\b/,
    /\bwhat time (?:is|does)? ?(?:the )?(?:stream|capy stream|capy go live|capy going live)\b/,
    /\b(?:next|schedule|start|starting) (?:stream|livestream)\b/,
    /\b(?:stream|livestream) (?:schedule|start|starts|starting)\b/,
    /^(?:capy(?:s)? )?(?:the )?(?:stream|livestream) (?:when|time)$/,
    /\bcapy(?:s)? (?:next )?(?:stream|livestream) (?:schedule|start|starts|starting|when)\b/
  ];

  if (schedulePatterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return /^(?:when )?stream(?:ing)?$/.test(normalized) && /[?]/.test(content);
}

export function makeStreamReply(userId) {
  return `<@${userId}> ${STREAM_RESPONSE}`;
}

export function shouldCasuallyReply(message, botUserId) {
  const text = normalizeMessage(message.content ?? "");
  const botWasMentioned = message.mentions?.users?.has(botUserId) ?? false;
  const isDm = message.channel?.isDMBased?.() ?? false;

  return isDm || botWasMentioned || /\bmikey(?:\s*2(?:\s*0)?)?\b/i.test(text);
}

export function makeCasualReply(content, displayName = "there") {
  const text = normalizeMessage(content);
  const name = displayName.trim() || "there";

  if (/\b(hi|hello|hey|yo|sup)\b/.test(text)) {
    return `Hey ${name}, Mikey 2.0 is online.`;
  }

  if (/\b(how are you|how r u|hru)\b/.test(text)) {
    return `I'm doing good, ${name}. Ready whenever you need me.`;
  }

  if (/\b(thanks|thank you|ty)\b/.test(text)) {
    return `Anytime, ${name}.`;
  }

  if (/\b(help|commands?)\b/.test(text)) {
    return `Mention me or DM me to chat. Ask "when is the stream?" and I'll point you to Capy's stream info.`;
  }

  return `I heard you, ${name}. Ask me about the stream or mention me when you need me.`;
}
