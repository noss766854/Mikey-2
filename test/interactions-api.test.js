import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nacl from "tweetnacl";
import { verifyDiscordSignature } from "../api/interactions.js";

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("Discord request signature verification", () => {
  it("accepts a valid Ed25519 signature", () => {
    const keyPair = nacl.sign.keyPair();
    const body = JSON.stringify({ type: 1 });
    const timestamp = "1782510000";
    const message = new TextEncoder().encode(`${timestamp}${body}`);
    const signature = nacl.sign.detached(message, keyPair.secretKey);

    assert.equal(
      verifyDiscordSignature({
        body,
        timestamp,
        signature: bytesToHex(signature),
        publicKey: bytesToHex(keyPair.publicKey)
      }),
      true
    );
  });

  it("rejects a tampered body", () => {
    const keyPair = nacl.sign.keyPair();
    const body = JSON.stringify({ type: 1 });
    const timestamp = "1782510000";
    const message = new TextEncoder().encode(`${timestamp}${body}`);
    const signature = nacl.sign.detached(message, keyPair.secretKey);

    assert.equal(
      verifyDiscordSignature({
        body: JSON.stringify({ type: 2 }),
        timestamp,
        signature: bytesToHex(signature),
        publicKey: bytesToHex(keyPair.publicKey)
      }),
      false
    );
  });
});
