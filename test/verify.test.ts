import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "ethers";
import type { ProofPackage } from "../verification-page/src/types";

const fetchSegmentRecordMock = vi.fn();
const defaultContractAddress = "0x699a37c68c99DF26b179b98811F5d25597FBA816";
const configuredContractAddress = import.meta.env.CONTRACT_ADDRESS;
const contractAddress = getAddress(
  typeof configuredContractAddress === "string" && configuredContractAddress.trim()
    ? configuredContractAddress.trim()
    : defaultContractAddress,
);

vi.mock("../verification-page/src/blockchain", () => ({
  SEPOLIA_CHAIN_ID: 11155111,
  fetchSegmentRecord: fetchSegmentRecordMock,
}));

const envelopeHash = "0x6a8c5f7af40f9a35ee4d36c03b57d6e26b1597a789133707a10736306d9ed70f";
const segmentHash = "0x172d2b4547aa5f7b7ba88889b824ee060e840be8c5d7e1326d5df4c4fc8bd205";
const recorder = "0x1111111111111111111111111111111111111111";

const validPackage: ProofPackage = {
  envelope: {
    ciphertext: "ciphertext-base64",
    conversation_id: "direct-1-2",
    message_id: 7,
    ratchet_header_enc: "header-base64",
    recipient_id: 2,
    schema_version: "securemsg-envelope-v1",
    sender_id: 1,
  },
  proof: {
    segment_index: 0,
    transaction_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    contract_address: contractAddress,
    chain_name: "sepolia",
    chain_id: 11155111,
    segment_hash: segmentHash,
    envelope_hash: envelopeHash,
    segment_hashes: [envelopeHash],
    recorded_timestamp: 1710000000,
    recorder,
  },
};

describe("verifyProofPackage", () => {
  beforeEach(() => {
    fetchSegmentRecordMock.mockReset();
    fetchSegmentRecordMock.mockResolvedValue({
      segment_hash: segmentHash,
      recorder,
      timestamp: 1710000000,
      recorded: true,
    });
  });

  it("accepts a valid proof package with a matching on-chain record", async () => {
    const { verifyProofPackage } = await import("../verification-page/src/verify");

    const result = await verifyProofPackage(validPackage, "https://rpc.example");

    expect(result.ok).to.equal(true);
    expect(result.computedEnvelopeHash).to.equal(envelopeHash);
    expect(result.computedSegmentHash).to.equal(segmentHash);
    expect(fetchSegmentRecordMock).toHaveBeenCalledWith(
      "https://rpc.example",
      contractAddress,
      segmentHash,
    );
  });

  it("rejects proof packages for the wrong chain", async () => {
    const { verifyProofPackage } = await import("../verification-page/src/verify");
    const packageData = {
      ...validPackage,
      proof: { ...validPackage.proof, chain_id: 1 },
    };

    await expect(verifyProofPackage(packageData, "")).rejects.toThrow(
      "Proof chain_id must be Sepolia 11155111",
    );
  });

  it("rejects proof packages for a different contract", async () => {
    const { verifyProofPackage } = await import("../verification-page/src/verify");
    const packageData = {
      ...validPackage,
      proof: {
        ...validPackage.proof,
        contract_address: "0x2222222222222222222222222222222222222222",
      },
    };

    await expect(verifyProofPackage(packageData, "")).rejects.toThrow(
      "Proof contract address does not match the trusted contract",
    );
    expect(fetchSegmentRecordMock).not.toHaveBeenCalled();
  });

  it("rejects malformed segment hash lists before reading the blockchain", async () => {
    const { verifyProofPackage } = await import("../verification-page/src/verify");
    const packageData = {
      ...validPackage,
      proof: { ...validPackage.proof, segment_hashes: ["0x1234"] },
    };

    await expect(verifyProofPackage(packageData, "")).rejects.toThrow(
      "Every proof segment_hashes entry must be bytes32",
    );
    expect(fetchSegmentRecordMock).not.toHaveBeenCalled();
  });

  it("returns a failed result when the on-chain timestamp does not match", async () => {
    const { verifyProofPackage } = await import("../verification-page/src/verify");
    fetchSegmentRecordMock.mockResolvedValue({
      segment_hash: segmentHash,
      recorder,
      timestamp: 1710000001,
      recorded: true,
    });

    const result = await verifyProofPackage(validPackage, "");

    expect(result.ok).to.equal(false);
    expect(result.message).to.equal("Proof timestamp does not match the on-chain record");
  });

  it("rejects malformed recorder addresses with a clear error", async () => {
    const { verifyProofPackage } = await import("../verification-page/src/verify");
    const packageData = {
      ...validPackage,
      proof: { ...validPackage.proof, recorder: "not-an-address" },
    };

    await expect(verifyProofPackage(packageData, "")).rejects.toThrow(
      "Proof recorder is invalid",
    );
  });

  it("rejects proof package JSON that is too large", async () => {
    const { parseProofPackage } = await import("../verification-page/src/verify");

    expect(() => parseProofPackage(" ".repeat(256 * 1024 + 1))).to.throw(
      "Proof package JSON is too large",
    );
  });
});
