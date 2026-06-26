import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStreamQuestion,
  makeCasualReply,
  makeStreamReply,
  STREAM_RESPONSE
} from "../src/responses.js";

describe("stream question detection", () => {
  const matches = [
    "when is the stream",
    "when's stream?",
    "when stream",
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
    "I watched the stream yesterday",
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
  it("mentions the asker in the stream reply", () => {
    assert.equal(makeStreamReply("42"), `<@42> ${STREAM_RESPONSE}`);
  });

  it("makes a casual reply", () => {
    assert.equal(makeCasualReply("hello mikey", "Dragos"), "Hey Dragos, Mikey 2.0 is online.");
  });
});
