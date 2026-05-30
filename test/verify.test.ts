import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "ethers";
import { computeMessagesHashFromMessages } from "../verification-page/src/hashMessages";
import type { MessageBatchInput } from "../verification-page/src/types";

const fetchMessagesHashRecordMock = vi.fn();
const defaultContractAddress = "0x699a37c68c99DF26b179b98811F5d25597FBA816";
const configuredContractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const contractAddress = getAddress(
  typeof configuredContractAddress === "string" && configuredContractAddress.trim()
    ? configuredContractAddress.trim()
    : defaultContractAddress,
);

vi.mock("../verification-page/src/blockchain", () => ({
  fetchMessagesHashRecord: fetchMessagesHashRecordMock,
}));

const recorder = "0x1111111111111111111111111111111111111111";

const validBatch: MessageBatchInput = {
  messages: [
    {
      message_id: 7,
      sender_public_key: "alice-public-key",
      ciphertext: "ciphertext-base64",
    },
    {
      message_id: 3,
      sender_public_key: "alice-public-key",
      ciphertext: "older-ciphertext",
    },
  ],
};

const expectedBatch = computeMessagesHashFromMessages(validBatch.messages);

describe("verifyMessageBatch", () => {
  beforeEach(() => {
    fetchMessagesHashRecordMock.mockReset();
    fetchMessagesHashRecordMock.mockResolvedValue({
      messages_hash: expectedBatch.messagesHash,
      recorder,
      timestamp: 1710000000,
    });
  });

  it("accepts a valid batch with a matching on-chain record", async () => {
    const { verifyMessageBatch } = await import("../verification-page/src/verify");

    const result = await verifyMessageBatch(validBatch, "https://rpc.example");

    expect(result.ok).to.equal(true);
    expect(result.computedMessageHashes).to.deep.equal(expectedBatch.messageHashes);
    expect(result.computedMessagesHash).to.equal(expectedBatch.messagesHash);
    expect(result.onChainRecord).to.deep.equal({
      messages_hash: expectedBatch.messagesHash,
      recorder,
      timestamp: 1710000000,
    });
    expect(fetchMessagesHashRecordMock).toHaveBeenCalledWith(
      "https://rpc.example",
      contractAddress,
      expectedBatch.messagesHash,
    );
  });

  it("returns a failed result when the computed batch hash is not on-chain", async () => {
    const { verifyMessageBatch } = await import("../verification-page/src/verify");
    fetchMessagesHashRecordMock.mockResolvedValue(null);

    const result = await verifyMessageBatch(validBatch, "");

    expect(result.ok).to.equal(false);
    expect(result.statusMessage).to.equal("Message batch hash has not been recorded on Sepolia");
    expect(result.onChainRecord).to.equal(undefined);
  });

  it("rejects malformed batch JSON", async () => {
    const { parseMessageBatch } = await import("../verification-page/src/verify");

    expect(() => parseMessageBatch("not json")).to.throw(
      "Invalid JSON. Please provide a valid message batch.",
    );
    expect(() => parseMessageBatch("{}")).to.throw(
      "Message batch must be an array of messages",
    );
  });

  it("parses either a message array or an object with messages", async () => {
    const { parseMessageBatch } = await import("../verification-page/src/verify");

    expect(parseMessageBatch(JSON.stringify(validBatch)).messages.length).to.equal(2);
    expect(parseMessageBatch(JSON.stringify(validBatch.messages)).messages.length).to.equal(2);
  });

  it("rejects message batch JSON that is too large", async () => {
    const { parseMessageBatch } = await import("../verification-page/src/verify");

    expect(() => parseMessageBatch(" ".repeat(256 * 1024 + 1))).to.throw(
      "Message batch JSON is too large",
    );
  });
});
