import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMMAND_NAMES, MIKEY_COMMANDS } from "../src/commands.js";

describe("slash commands", () => {
  it("registers both bark controls as server-only admin commands", () => {
    for (const name of [COMMAND_NAMES.STOP_BARK, COMMAND_NAMES.START_BARK]) {
      const command = MIKEY_COMMANDS.find((item) => item.name === name);

      assert.ok(command);
      assert.equal(command.default_member_permissions, "8");
      assert.equal(command.dm_permission, false);
    }
  });
});
