import { ethers } from "ethers";
import { fetchMessagesHashRecord } from "./blockchain";
import { computeMessagesHashFromMessages } from "./hashMessages";
import type { MessageBatchInput, MessageForVerification, VerificationOutput } from "./types";

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

function assertMessageArray(value: unknown): asserts value is MessageForVerification[] {
  if (!Array.isArray(value)) {
    throw new Error("Message batch must be an array of messages");
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
  const { canonicalMessages, messageHashes, messagesHash } = computeMessagesHashFromMessages(
    batch.messages,
  );
  const onChainRecord = await fetchMessagesHashRecord(
    rpcUrl,
    TRUSTED_MESSAGE_INTEGRITY_ADDRESS,
    messagesHash,
  );

  if (!onChainRecord) {
    return {
      ok: false,
      statusMessage: "Message batch hash has not been recorded on Sepolia",
      canonicalMessages,
      computedMessageHashes: messageHashes,
      computedMessagesHash: messagesHash,
    };
  }

  return {
    ok: true,
    statusMessage: "Message batch is valid and matches the Sepolia record",
    canonicalMessages,
    computedMessageHashes: messageHashes,
    computedMessagesHash: messagesHash,
    onChainRecord,
  };
}
