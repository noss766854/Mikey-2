import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BARK_RESPONSE,
  isStreamQuestion,
  makeCasualReply,
  makeStreamReply,
  shouldCasuallyReply,
  STREAM_RESPONSE
} from "../src/responses.js";

describe("stream question detection", () => {
  const matches = [
    "when is the stream",
    "when's stream?",
    "when stream",
    "stream when",
    "stream when?",
    "stream time",
    "capy stream when",
    "wen streem",
    "strem when",
    "stram time",
    "stram whne",
    "next strem",
    "what tiem is the streem",
    "when does capi stram",
    "WHEN STREAM???",
    "what time is the stream",
    "when does Capy stream",
    "when is Capy going live",
    "next stream?",
    "<@123456789> when is the stream"
  ];

  for (const phrase of matches) {
    it(`matches: ${phrase}`, () => {
      assert.equal(isStreamQuestion(phrase), true);
    });
  }

  const misses = [
    "imagine if i had something like a stream in my house, when would it stop?",
    "imagine if i had something like a streem in my house, when would it stop?",
    "I watched the stream yesterday",
    "when would a stream in my garden stop",
    "what time does my stream stop",
    "what time does my strem stop",
    "when is the steam sale",
    "Mikey hello",
    "Capy is live",
    "stream clips are funny"
  ];

  for (const phrase of misses) {
    it(`does not match: ${phrase}`, () => {
      assert.equal(isStreamQuestion(phrase), false);
    });
  }
});

describe("replies", () => {
  it("replies to lurk", () => {
    assert.equal(makeCasualReply("lurk", "Dragos"), "good boy");
  });

  it("treats lurk as a casual trigger", () => {
    const message = {
      content: "lurk",
      mentions: {
        users: {
          has: () => false
        }
      },
      channel: {
        isDMBased: () => false
      }
    };

    assert.equal(shouldCasuallyReply(message, "bot-id"), true);
  });

  it("mentions the asker in the stream reply", () => {
    assert.equal(makeStreamReply("42"), `<@42> ${STREAM_RESPONSE}`);
  });

  it("thanks Mikey politely", () => {
    assert.equal(makeCasualReply("thanks mikey", "Dragos"), "You're welcome.");
  });

  it("forgives sorry Mikey", () => {
    assert.equal(makeCasualReply("sorry mikey", "Dragos"), "all good love you");
  });

  it("apologizes when told to be quiet", () => {
    assert.equal(makeCasualReply("shut up mikey", "Dragos"), "Sorry.");
  });

  it("has an hourly bark response", () => {
    assert.equal(BARK_RESPONSE, "bark");
  });

  it("makes a casual reply", () => {
    assert.equal(makeCasualReply("hello mikey", "Dragos"), "Hey Dragos, Mikey 2.0 is online.");
  });
});
