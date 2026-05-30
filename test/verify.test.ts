import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "ethers";
import type { MessageBatchInput } from "../verification-page/src/types";

const fetchSegmentRecordMock = vi.fn();
const defaultContractAddress = "0x699a37c68c99DF26b179b98811F5d25597FBA816";
const configuredContractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const contractAddress = getAddress(
  typeof configuredContractAddress === "string" && configuredContractAddress.trim()
    ? configuredContractAddress.trim()
    : defaultContractAddress,
);

vi.mock("../verification-page/src/blockchain", () => ({
  fetchSegmentRecord: fetchSegmentRecordMock,
}));

const envelopeHash = "0x6a8c5f7af40f9a35ee4d36c03b57d6e26b1597a789133707a10736306d9ed70f";
const olderEnvelopeHash = "0x90b8b00dd28da3e68bd0e7a4f5365f968b49c83471d48b41f2119d069614f50c";
const segmentHash = "0x63e159c55de26d1765ddf95e0cda467b666537e143d104a9d626eb04dd1bedc2";
const recorder = "0x1111111111111111111111111111111111111111";

const validBatch: MessageBatchInput = {
  envelopes: [
    {
      ciphertext: "ciphertext-base64",
      conversation_id: "direct-1-2",
      message_id: 7,
      ratchet_header_enc: "header-base64",
      recipient_id: 2,
      schema_version: "securemsg-envelope-v1",
      sender_id: 1,
    },
    {
      ciphertext: "older-ciphertext",
      conversation_id: "direct-1-2",
      message_id: 3,
      ratchet_header_enc: "older-header",
      recipient_id: 2,
      schema_version: "securemsg-envelope-v1",
      sender_id: 1,
    },
  ],
};

describe("verifyMessageBatch", () => {
  beforeEach(() => {
    fetchSegmentRecordMock.mockReset();
    fetchSegmentRecordMock.mockResolvedValue({
      segment_hash: segmentHash,
      recorder,
      timestamp: 1710000000,
      recorded: true,
    });
  });

  it("accepts a valid batch with a matching on-chain record", async () => {
    const { verifyMessageBatch } = await import("../verification-page/src/verify");

    const result = await verifyMessageBatch(validBatch, "https://rpc.example");

    expect(result.ok).to.equal(true);
    expect(result.computedEnvelopeHashes).to.deep.equal([olderEnvelopeHash, envelopeHash]);
    expect(result.computedSegmentHash).to.equal(segmentHash);
    expect(fetchSegmentRecordMock).toHaveBeenCalledWith(
      "https://rpc.example",
      contractAddress,
      segmentHash,
    );
  });

  it("returns a failed result when the computed batch hash is not on-chain", async () => {
    const { verifyMessageBatch } = await import("../verification-page/src/verify");
    fetchSegmentRecordMock.mockResolvedValue({
      segment_hash: segmentHash,
      recorder,
      timestamp: 0,
      recorded: false,
    });

    const result = await verifyMessageBatch(validBatch, "");

    expect(result.ok).to.equal(false);
    expect(result.message).to.equal("Message batch hash has not been recorded on Sepolia");
  });

  it("rejects malformed batch JSON", async () => {
    const { parseMessageBatch } = await import("../verification-page/src/verify");

    expect(() => parseMessageBatch("not json")).to.throw(
      "Invalid JSON. Please provide a valid message batch.",
    );
    expect(() => parseMessageBatch("{}")).to.throw(
      "Message batch must be an array of envelopes",
    );
  });

  it("parses either an envelope array or an object with envelopes", async () => {
    const { parseMessageBatch } = await import("../verification-page/src/verify");

    expect(parseMessageBatch(JSON.stringify(validBatch)).envelopes).to.have.length(2);
    expect(parseMessageBatch(JSON.stringify(validBatch.envelopes)).envelopes).to.have.length(2);
  });

  it("rejects message batch JSON that is too large", async () => {
    const { parseMessageBatch } = await import("../verification-page/src/verify");

    expect(() => parseMessageBatch(" ".repeat(256 * 1024 + 1))).to.throw(
      "Message batch JSON is too large",
    );
  });
});
