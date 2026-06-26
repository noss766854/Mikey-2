export const STREAM_INFO_URL =
  "https://discord.com/channels/1330595460112449556/1331588384954515567";

export const STREAM_RESPONSE = `Capy usually streams every day for atleast an hour, usually after 8PM UTC+2 (Romanian time) but check out ${STREAM_INFO_URL} for more information.`;
export const BARK_RESPONSE = "bark";

const GENERIC_STREAM_CONTEXT =
  /\b(a stream|my stream|your stream|their stream|some stream|something like a stream|stream in my|stream in the|stream at my|stream at the)\b/i;
const GENERIC_STREAM_PREVIOUS_WORDS = new Set([
  "a",
  "an",
  "my",
  "your",
  "their",
  "some"
]);
const GENERIC_STREAM_NEXT_WORDS = new Set(["in", "inside", "at"]);
const STREAM_WORDS = [
  ["stream", 1],
  ["streams", 1],
  ["streaming", 2],
  ["livestream", 2],
  ["livestreams", 2],
  ["live", 0]
];
const STREAM_WORD_EXCLUSIONS = new Set(["steam"]);
const SCHEDULE_WORDS = [
  ["when", 1],
  ["whens", 1],
  ["time", 1],
  ["next", 1],
  ["schedule", 2],
  ["scheduled", 2],
  ["start", 1],
  ["starts", 1],
  ["starting", 2]
];
const SCHEDULE_WORD_EXCLUSIONS = new Set(["then"]);
const FUZZY_FILLER_WORDS = new Set([
  "is",
  "the",
  "does",
  "do",
  "what",
  "wat",
  "whats",
  "go",
  "going",
  "to",
  "today",
  "tomorrow",
  "tmrw",
  "please",
  "pls"
]);

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

function editDistance(left, right) {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const distances = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => 0)
  );

  for (let row = 0; row < rows; row += 1) {
    distances[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    distances[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost =
        left[row - 1] === right[column - 1] ? 0 : 1;

      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + substitutionCost
      );

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distances[row][column] = Math.min(
          distances[row][column],
          distances[row - 2][column - 2] + 1
        );
      }
    }
  }

  return distances[left.length][right.length];
}

function matchesTerm(word, terms, exclusions = new Set()) {
  if (exclusions.has(word)) {
    return false;
  }

  return terms.some(([term, maxDistance]) => {
    if (word === term) {
      return true;
    }

    if (Math.abs(word.length - term.length) > maxDistance) {
      return false;
    }

    return editDistance(word, term) <= maxDistance;
  });
}

function isStreamWord(word) {
  return matchesTerm(word, STREAM_WORDS, STREAM_WORD_EXCLUSIONS);
}

function isScheduleWord(word) {
  return matchesTerm(word, SCHEDULE_WORDS, SCHEDULE_WORD_EXCLUSIONS);
}

function isCapyWord(word) {
  return matchesTerm(word, [["capy", 1], ["capys", 1], ["cappy", 1]]);
}

function getStreamWordIndexes(tokens) {
  return tokens.flatMap((token, index) => (isStreamWord(token) ? [index] : []));
}

function hasGenericStreamContext(tokens, streamIndexes) {
  return streamIndexes.some((index) => {
    const previous = tokens[index - 1];
    const next = tokens[index + 1];

    return (
      GENERIC_STREAM_PREVIOUS_WORDS.has(previous) ||
      GENERIC_STREAM_NEXT_WORDS.has(next)
    );
  });
}

function isFuzzyScheduleQuestion(tokens, streamIndexes) {
  const hasScheduleWord = tokens.some(isScheduleWord);

  if (!hasScheduleWord || tokens.length > 7) {
    return false;
  }

  return tokens.every((token, index) => {
    return (
      streamIndexes.includes(index) ||
      isScheduleWord(token) ||
      isCapyWord(token) ||
      FUZZY_FILLER_WORDS.has(token)
    );
  });
}

export function isStreamQuestion(content) {
  const normalized = normalizeMessage(content);
  const tokens = normalized ? normalized.split(" ") : [];
  const streamIndexes = getStreamWordIndexes(tokens);

  if (streamIndexes.length === 0) {
    return false;
  }

  if (
    GENERIC_STREAM_CONTEXT.test(normalized) ||
    hasGenericStreamContext(tokens, streamIndexes)
  ) {
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

  if (isFuzzyScheduleQuestion(tokens, streamIndexes)) {
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

  if (/\b(shut up|stfu|be quiet)\b/.test(text)) {
    return "Sorry.";
  }

  if (/\b(hi|hello|hey|yo|sup)\b/.test(text)) {
    return `Hey ${name}, Mikey 2.0 is online.`;
  }

  if (/\b(how are you|how r u|hru)\b/.test(text)) {
    return `I'm doing good, ${name}. Ready whenever you need me.`;
  }

  if (/\b(thanks|thank you|ty)\b/.test(text)) {
    return "You're welcome.";
  }

  if (/\b(help|commands?)\b/.test(text)) {
    return `Mention me or DM me to chat. Ask "when is the stream?" and I'll point you to Capy's stream info.`;
  }

  return `I heard you, ${name}. Ask me about the stream or mention me when you need me.`;
}
