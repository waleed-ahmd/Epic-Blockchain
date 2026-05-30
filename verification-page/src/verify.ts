import { ethers } from "ethers";
import { fetchSegmentRecord } from "./blockchain";
import { computeSegmentHashFromEnvelopes } from "./digest";
import type { Envelope, MessageBatchInput, VerificationOutput } from "./types";

const DEFAULT_MESSAGE_INTEGRITY_ADDRESS = "0x699a37c68c99DF26b179b98811F5d25597FBA816";
const MAX_MESSAGE_BATCH_BYTES = 256 * 1024;

function trustedContractAddress(): string {
  const configuredAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const address =
    typeof configuredAddress === "string" && configuredAddress.trim()
      ? configuredAddress.trim()
      : DEFAULT_MESSAGE_INTEGRITY_ADDRESS;

  if (!ethers.isAddress(address)) {
    throw new Error("VITE_CONTRACT_ADDRESS must be a valid Ethereum address");
  }

  return ethers.getAddress(address);
}

export const TRUSTED_MESSAGE_INTEGRITY_ADDRESS = trustedContractAddress();

function assertEnvelopeArray(value: unknown): asserts value is Envelope[] {
  if (!Array.isArray(value)) {
    throw new Error("Message batch must be an array of envelopes");
  }
}

function normaliseBatchInput(value: unknown): MessageBatchInput {
  if (Array.isArray(value)) {
    return { envelopes: value };
  }

  if (!value || typeof value !== "object") {
    throw new Error("Message batch must be a JSON object or array");
  }

  const batch = value as Partial<MessageBatchInput>;
  assertEnvelopeArray(batch.envelopes);
  return { envelopes: batch.envelopes };
}

export function parseMessageBatch(raw: string): MessageBatchInput {
  if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BATCH_BYTES) {
    throw new Error("Message batch JSON is too large");
  }

  if (!raw.trim()) {
    throw new Error("Message batch JSON is required");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON. Please provide a valid message batch.");
  }

  return normaliseBatchInput(parsed);
}

export async function verifyMessageBatch(
  batch: MessageBatchInput,
  rpcUrl: string,
): Promise<VerificationOutput> {
  const { canonicalEnvelopes, envelopeHashes, segmentHash } = computeSegmentHashFromEnvelopes(
    batch.envelopes,
  );
  const onChainRecord = await fetchSegmentRecord(
    rpcUrl,
    TRUSTED_MESSAGE_INTEGRITY_ADDRESS,
    segmentHash,
  );

  if (!onChainRecord.recorded) {
    return {
      ok: false,
      message: "Message batch hash has not been recorded on Sepolia",
      canonicalEnvelopes,
      computedEnvelopeHashes: envelopeHashes,
      computedSegmentHash: segmentHash,
      onChainRecord,
    };
  }

  return {
    ok: true,
    message: "Message batch is valid and matches the Sepolia record",
    canonicalEnvelopes,
    computedEnvelopeHashes: envelopeHashes,
    computedSegmentHash: segmentHash,
    onChainRecord,
  };
}
