import { ethers } from "ethers";
import { fetchMessagesHashRecord } from "./blockchain";
import { computeMessagesHashFromMessages } from "./hashMessages";
import type { MessageBatchInput, MessageForVerification, VerificationOutput } from "./types";

const MAX_MESSAGE_BATCH_BYTES = 256 * 1024;

export function getTrustedMessageIntegrityAddress(): string {
  const configuredAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

  if (typeof configuredAddress !== "string" || configuredAddress.trim().length === 0) {
    throw new Error("VITE_CONTRACT_ADDRESS is required");
  }

  if (!ethers.isAddress(configuredAddress)) {
    throw new Error("VITE_CONTRACT_ADDRESS must be a valid Ethereum address");
  }

  return ethers.getAddress(configuredAddress);
}

function assertMessageArray(value: unknown): asserts value is MessageForVerification[] {
  if (!Array.isArray(value)) {
    throw new Error("Message batch must contain a messages array");
  }
}

function normaliseBatchInput(value: unknown): MessageBatchInput {
  if (Array.isArray(value)) {
    return { messages: value };
  }

  if (!value || typeof value !== "object") {
    throw new Error("Message batch must be a JSON object or array");
  }

  const batch = value as Partial<MessageBatchInput>;
  assertMessageArray(batch.messages);

  return { messages: batch.messages };
}

export function parseMessageBatch(raw: string): MessageBatchInput {
  if (!raw.trim()) {
    throw new Error("Message batch JSON is required");
  }

  if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BATCH_BYTES) {
    throw new Error("Message batch JSON is too large");
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
  const computedMessagesHash = computeMessagesHashFromMessages(batch.messages);

  const onChainRecord = await fetchMessagesHashRecord(
    rpcUrl,
    getTrustedMessageIntegrityAddress(),
    computedMessagesHash,
  );

  if (!onChainRecord) {
    return {
      ok: false,
      statusMessage: "Message batch hash has not been recorded on Sepolia",
      computedMessagesHash,
    };
  }

  return {
    ok: true,
    statusMessage: "Message batch is valid and matches the Sepolia record",
    computedMessagesHash,
    onChainRecord,
  };
}
