import "dotenv/config";
import nacl from "tweetnacl";
import { handleInteraction } from "../src/interaction-handler.js";

const SIGNATURE_HEADER = "x-signature-ed25519";
const TIMESTAMP_HEADER = "x-signature-timestamp";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function verifyDiscordSignature({ body, publicKey, signature, timestamp }) {
  const signatureBytes = hexToBytes(signature);
  const publicKeyBytes = hexToBytes(publicKey);

  if (!signatureBytes || !publicKeyBytes || !timestamp) {
    return false;
  }

  const message = new TextEncoder().encode(`${timestamp}${body}`);
  return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
}

export function GET() {
  return json({
    ok: true,
    name: "Mikey 2.0",
    endpoint: "/api/interactions"
  });
}

export async function POST(request) {
  const publicKey = process.env.PUBLIC_KEY;
  const signature = request.headers.get(SIGNATURE_HEADER);
  const timestamp = request.headers.get(TIMESTAMP_HEADER);
  const body = await request.text();

  if (!publicKey) {
    return json({ error: "PUBLIC_KEY is not configured." }, 500);
  }

  const verified = verifyDiscordSignature({
    body,
    publicKey,
    signature,
    timestamp
  });

  if (!verified) {
    return new Response("Bad request signature.", {
      status: 401
    });
  }

  let interaction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  return json(handleInteraction(interaction));
}
