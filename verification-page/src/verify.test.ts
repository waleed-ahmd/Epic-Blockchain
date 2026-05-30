import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "ethers";
import { computeMessagesHashFromMessages } from "./hashMessages";
import type { MessageBatchInput } from "./types";

const fetchMessagesHashRecordMock = vi.fn();
const contractAddress = getAddress("0x699a37c68c99DF26b179b98811F5d25597FBA816");
const recorder = "0x1111111111111111111111111111111111111111";

vi.mock("./blockchain", () => ({
  DEFAULT_SEPOLIA_RPC_URL: "https://ethereum-sepolia-rpc.publicnode.com",
  fetchMessagesHashRecord: fetchMessagesHashRecordMock,
}));

const validBatch: MessageBatchInput = {
  messages: [
    {
      index: 1,
      sender_public_key: "alice-public-key",
      ciphertext: "second-ciphertext",
    },
    {
      index: 0,
      sender_public_key: "alice-public-key",
      ciphertext: "first-ciphertext",
    },
  ],
};

const expectedMessagesHash = computeMessagesHashFromMessages(validBatch.messages);

describe("verifyMessageBatch", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_CONTRACT_ADDRESS", contractAddress);
    fetchMessagesHashRecordMock.mockReset();
    fetchMessagesHashRecordMock.mockResolvedValue({
      messages_hash: expectedMessagesHash,
      recorder,
      timestamp: 1710000000,
    });
  });

  it("accepts a valid batch with a matching on-chain record", async () => {
    const { verifyMessageBatch } = await import("./verify");

    const result = await verifyMessageBatch(validBatch, "https://rpc.example");

    expect(result).to.deep.equal({
      ok: true,
      statusMessage: "Message batch is valid and matches the Sepolia record",
      computedMessagesHash: expectedMessagesHash,
      onChainRecord: {
        messages_hash: expectedMessagesHash,
        recorder,
        timestamp: 1710000000,
      },
    });
    expect(fetchMessagesHashRecordMock).toHaveBeenCalledWith(
      "https://rpc.example",
      contractAddress,
      expectedMessagesHash,
    );
  });

  it("returns a failed result when the computed batch hash is not on-chain", async () => {
    const { verifyMessageBatch } = await import("./verify");
    fetchMessagesHashRecordMock.mockResolvedValue(undefined);

    const result = await verifyMessageBatch(validBatch, "https://rpc.example");

    expect(result).to.deep.equal({
      ok: false,
      statusMessage: "Message batch hash has not been recorded on Sepolia",
      computedMessagesHash: expectedMessagesHash,
    });
  });

  it("rejects malformed batch JSON", async () => {
    const { parseMessageBatch } = await import("./verify");

    expect(() => parseMessageBatch("not-json")).to.throw(
      "Invalid JSON. Please provide a valid message batch.",
    );
    expect(() => parseMessageBatch("{}")).to.throw(
      "Message batch must contain a messages array",
    );
  });

  it("parses either a message array or an object with messages", async () => {
    const { parseMessageBatch } = await import("./verify");

    expect(parseMessageBatch(JSON.stringify(validBatch)).messages.length).to.equal(2);
    expect(parseMessageBatch(JSON.stringify(validBatch.messages)).messages.length).to.equal(2);
  });

  it("requires the contract address to come from the environment", async () => {
    const { getTrustedMessageIntegrityAddress } = await import("./verify");

    vi.stubEnv("VITE_CONTRACT_ADDRESS", "");

    expect(() => getTrustedMessageIntegrityAddress()).to.throw("VITE_CONTRACT_ADDRESS is required");
  });
});
