import { ethers } from "ethers";
import { SEPOLIA_CHAIN_ID, fetchSegmentRecord } from "./blockchain";
import {
  canonicaliseEnvelope,
  computeEnvelopeHash,
  computeSegmentHashFromEnvelopeHashes,
} from "./digest";
import type { ProofPackage, VerificationOutput } from "./types";

function assertProofPackage(value: unknown): asserts value is ProofPackage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Proof package must be a JSON object");
  }

  const packageData = value as Partial<ProofPackage>;
  if (!packageData.envelope || typeof packageData.envelope !== "object") {
    throw new Error("Proof package must contain an envelope object");
  }

  if (!packageData.proof || typeof packageData.proof !== "object") {
    throw new Error("Proof package must contain a proof object");
  }
}

export function parseProofPackage(raw: string): ProofPackage {
  if (!raw.trim()) {
    throw new Error("Proof package JSON is required");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON. Please provide a valid proof package.");
  }

  assertProofPackage(parsed);
  return parsed;
}

export async function verifyProofPackage(
  packageData: ProofPackage,
  rpcUrl: string,
  contractAddressOverride: string,
): Promise<VerificationOutput> {
  const { envelope, proof } = packageData;
  const contractAddress = contractAddressOverride.trim() || proof.contract_address;

  if (!ethers.isAddress(contractAddress)) {
    throw new Error("Proof contract address is missing or invalid");
  }

  if (!ethers.isHexString(proof.segment_hash, 32)) {
    throw new Error("Proof segment_hash is missing or invalid");
  }

  if (Number(proof.chain_id) !== SEPOLIA_CHAIN_ID) {
    throw new Error(`Proof chain_id must be Sepolia ${SEPOLIA_CHAIN_ID}`);
  }

  if (proof.chain_name && proof.chain_name.toLowerCase() !== "sepolia") {
    throw new Error("Proof chain_name must be sepolia");
  }

  if (
    proof.transaction_hash !== undefined &&
    !ethers.isHexString(proof.transaction_hash, 32)
  ) {
    throw new Error("Proof transaction_hash must be a bytes32 hex string");
  }

  if (!Array.isArray(proof.segment_hashes)) {
    throw new Error("Proof segment_hashes must be an array");
  }

  if (proof.segment_hashes.length === 0 || proof.segment_hashes.length > 5) {
    throw new Error("Proof segment_hashes must contain between 1 and 5 hashes");
  }

  for (const hash of proof.segment_hashes) {
    if (!ethers.isHexString(hash, 32)) {
      throw new Error("Every proof segment_hashes entry must be bytes32");
    }
  }

  const segmentIndex = Number(proof.segment_index);
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) {
    throw new Error("Proof segment_index is missing or invalid");
  }

  if (segmentIndex >= proof.segment_hashes.length) {
    throw new Error("Proof segment_index is outside the segment_hashes list");
  }

  const canonicalEnvelope = canonicaliseEnvelope(envelope);
  const computedEnvelopeHash = computeEnvelopeHash(envelope);

  if (
    proof.envelope_hash &&
    computedEnvelopeHash.toLowerCase() !== proof.envelope_hash.toLowerCase()
  ) {
    return {
      ok: false,
      message: "Envelope hash does not match proof envelope_hash",
      canonicalEnvelope,
      computedEnvelopeHash,
    };
  }

  const listedHash = proof.segment_hashes[segmentIndex];
  if (!listedHash || listedHash.toLowerCase() !== computedEnvelopeHash.toLowerCase()) {
    return {
      ok: false,
      message: "Envelope hash does not match proof segment_hashes at segment_index",
      canonicalEnvelope,
      computedEnvelopeHash,
    };
  }

  const computedSegmentHash = computeSegmentHashFromEnvelopeHashes(proof.segment_hashes);
  if (computedSegmentHash.toLowerCase() !== proof.segment_hash.toLowerCase()) {
    return {
      ok: false,
      message: "Segment hash list does not rebuild proof segment_hash",
      canonicalEnvelope,
      computedEnvelopeHash,
      computedSegmentHash,
    };
  }

  const onChainRecord = await fetchSegmentRecord(rpcUrl, contractAddress, proof.segment_hash);
  if (!onChainRecord.recorded) {
    return {
      ok: false,
      message: "Segment hash has not been recorded on Sepolia",
      canonicalEnvelope,
      computedEnvelopeHash,
      computedSegmentHash,
      onChainRecord,
    };
  }

  if (proof.recorded_timestamp !== undefined) {
    if (
      !Number.isInteger(Number(proof.recorded_timestamp)) ||
      Number(proof.recorded_timestamp) <= 0
    ) {
      throw new Error("Proof recorded_timestamp is invalid");
    }

    if (Number(proof.recorded_timestamp) !== Number(onChainRecord.timestamp)) {
      return {
        ok: false,
        message: "Proof timestamp does not match the on-chain record",
        canonicalEnvelope,
        computedEnvelopeHash,
        computedSegmentHash,
        onChainRecord,
      };
    }
  }

  if (proof.recorder !== undefined) {
    if (!ethers.isAddress(proof.recorder)) {
      throw new Error("Proof recorder is invalid");
    }

    if (ethers.getAddress(proof.recorder) !== ethers.getAddress(onChainRecord.recorder)) {
      return {
        ok: false,
        message: "Proof recorder does not match the on-chain record",
        canonicalEnvelope,
        computedEnvelopeHash,
        computedSegmentHash,
        onChainRecord,
      };
    }
  }

  return {
    ok: true,
    message: "Proof package is valid and matches the Sepolia record",
    canonicalEnvelope,
    computedEnvelopeHash,
    computedSegmentHash,
    onChainRecord,
  };
}
