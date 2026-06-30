import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeRoleReplyConfig,
  encodeRoleReplyConfig,
  pickRandomReply,
  RoleReplyStore
} from "../src/role-replies.js";

function createWritableStore() {
  const messages = [];
  const channel = {
    async send(options) {
      const message = {
        content: options.content,
        deleted: false,
        pinned: false,
        async delete() {
          this.deleted = true;
        },
        async edit(nextOptions) {
          this.content = nextOptions.content;
          return this;
        },
        async pin() {
          this.pinned = true;
        }
      };

      messages.push(message);
      return message;
    }
  };
  const store = new RoleReplyStore("channel-id");
  store.channel = channel;

  return { messages, store };
}

describe("role reply configuration", () => {
  it("round-trips persistent Discord message content", () => {
    const content = encodeRoleReplyConfig("123456", ["first", "second"]);

    assert.deepEqual(decodeRoleReplyConfig(content), {
      roleId: "123456",
      replies: ["first", "second"]
    });
    assert.equal(decodeRoleReplyConfig("not a config message"), null);
  });

  it("selects a deterministic random reply", () => {
    assert.equal(pickRandomReply(["one", "two", "three"], () => 0), "one");
    assert.equal(
      pickRandomReply(["one", "two", "three"], () => 0.99),
      "three"
    );
  });

  it("loads role replies from pinned bot messages", async () => {
    const content = encodeRoleReplyConfig("123", ["persisted reply"]);
    const channel = {
      isTextBased: () => true,
      messages: {
        fetchPins: async () => ({
          hasMore: false,
          items: [
            {
              pinnedAt: new Date(),
              message: {
                author: { id: "bot-id" },
                content
              }
            }
          ]
        })
      }
    };
    const client = {
      channels: { fetch: async () => channel },
      user: { id: "bot-id" }
    };
    const store = new RoleReplyStore("channel-id");

    assert.equal(await store.load(client), 1);
    assert.deepEqual(store.getReplies("123"), ["persisted reply"]);
  });

  it("adds, deduplicates, removes, and clears replies", async () => {
    const { messages, store } = createWritableStore();

    assert.deepEqual(await store.addReply("123", "one"), {
      status: "added",
      count: 1
    });
    assert.equal(messages[0].pinned, true);
    assert.deepEqual(await store.addReply("123", "one"), {
      status: "duplicate"
    });
    await store.addReply("123", "two");
    assert.deepEqual(store.getReplies("123"), ["one", "two"]);

    assert.deepEqual(await store.removeReply("123", 1), {
      status: "removed",
      count: 1
    });
    assert.deepEqual(store.getReplies("123"), ["two"]);
    assert.equal(await store.clearRole("123"), true);
    assert.deepEqual(store.getReplies("123"), []);
    assert.equal(messages[0].deleted, true);
  });

  it("uses the highest configured role on a member", () => {
    const { store } = createWritableStore();
    store.entries.set("lower", { replies: ["lower reply"] });
    store.entries.set("higher", { replies: ["higher reply"] });

    const member = {
      roles: {
        cache: new Map([
          ["lower", { id: "lower", position: 2 }],
          ["higher", { id: "higher", position: 8 }]
        ])
      }
    };

    assert.equal(store.getReplyForMember(member, () => 0), "higher reply");
  });
});
