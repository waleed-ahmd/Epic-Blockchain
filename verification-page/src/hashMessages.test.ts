import { describe, expect, it } from "vitest";
import { computeMessagesHashFromMessages, serialiseMessagesForHash } from "./hashMessages";
import type { MessageForVerification } from "./types";

const firstMessage: MessageForVerification = {
  index: 0,
  sender_public_key: "alice-public-key",
  ciphertext: "first-ciphertext",
};

const secondMessage: MessageForVerification = {
  index: 1,
  sender_public_key: "alice-public-key",
  ciphertext: "second-ciphertext",
};

describe("message batch hashing", () => {
  it("sorts messages by index before hashing", () => {
    const orderedHash = computeMessagesHashFromMessages([firstMessage, secondMessage]);
    const reversedHash = computeMessagesHashFromMessages([secondMessage, firstMessage]);

    expect(reversedHash).to.equal(orderedHash);
  });

  it("hashes the whole canonical message batch as one value", () => {
    const serialised = serialiseMessagesForHash([secondMessage, firstMessage]);

    expect(serialised).to.equal(
      '[{"index":0,"sender_public_key":"alice-public-key","ciphertext":"first-ciphertext"},{"index":1,"sender_public_key":"alice-public-key","ciphertext":"second-ciphertext"}]',
    );
    expect(computeMessagesHashFromMessages([firstMessage, secondMessage])).to.match(/^0x[0-9a-f]{64}$/);
  });

  it("changes the batch hash when ciphertext changes", () => {
    const originalHash = computeMessagesHashFromMessages([firstMessage, secondMessage]);
    const changedHash = computeMessagesHashFromMessages([
      firstMessage,
      { ...secondMessage, ciphertext: "tampered-ciphertext" },
    ]);

    expect(changedHash).not.to.equal(originalHash);
  });

  it("rejects invalid batches", () => {
    expect(() => computeMessagesHashFromMessages([])).to.throw("messages array cannot be empty");
    expect(() => computeMessagesHashFromMessages([firstMessage, firstMessage])).to.throw(
      "index values must be unique within a batch",
    );
  });
});
