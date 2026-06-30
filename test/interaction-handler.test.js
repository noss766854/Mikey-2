import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleInteraction,
  InteractionResponseType,
  InteractionType
} from "../src/interaction-handler.js";

function commandInteraction(name, options = []) {
  return {
    type: InteractionType.APPLICATION_COMMAND,
    data: {
      name,
      options
    },
    member: {
      nick: "Dragos",
      user: {
        id: "42",
        username: "dragos"
      }
    }
  };
}

describe("interaction handling", () => {
  it("responds to Discord pings", () => {
    assert.deepEqual(handleInteraction({ type: InteractionType.PING }), {
      type: InteractionResponseType.PONG
    });
  });

  it("returns the stream reply for /stream", () => {
    const response = handleInteraction(commandInteraction("stream"));

    assert.equal(response.type, InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    assert.match(response.data.content, /^<@42> Capy usually streams/);
    assert.deepEqual(response.data.allowed_mentions.users, ["42"]);
  });

  it("detects stream questions inside /mikey", () => {
    const response = handleInteraction(
      commandInteraction("mikey", [
        {
          name: "message",
          value: "when stream?"
        }
      ])
    );

    assert.match(response.data.content, /^<@42> Capy usually streams/);
  });

  it("casually replies to /mikey", () => {
    const response = handleInteraction(
      commandInteraction("mikey", [
        {
          name: "message",
          value: "hello"
        }
      ])
    );

    assert.equal(response.data.content, "Hey Dragos, Mikey 2.0 is online.");
  });

  it("does not pretend an HTTP state command changed the Gateway", () => {
    const response = handleInteraction(commandInteraction("rolereply"));

    assert.equal(
      response.data.content,
      "Stateful admin commands must be handled by Mikey's always-running Gateway bot."
    );
    assert.equal(response.data.flags, 64);
  });
});
