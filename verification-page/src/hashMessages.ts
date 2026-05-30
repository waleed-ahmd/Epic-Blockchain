import { ethers } from "ethers";
import type { MessageForVerification } from "./types";

const MESSAGES_HASH_DOMAIN = "SecureMsgMessagesHash:v1";
const MAX_BATCH_MESSAGES = 5;

type CanonicalMessage = {
  index: number;
  sender_public_key: string;
  ciphertext: string;
};

function requireNonEmptyString(
  value: string | undefined,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

function normaliseIndex(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("index must be a non-negative integer");
  }

  return value;
}

function normaliseMessage(message: Partial<MessageForVerification>): CanonicalMessage {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    throw new Error("Message must be a JSON object");
  }

  requireNonEmptyString(message.sender_public_key, "sender_public_key");
  requireNonEmptyString(message.ciphertext, "ciphertext");

  return {
    index: normaliseIndex(message.index),
    sender_public_key: message.sender_public_key,
    ciphertext: message.ciphertext,
  };
}

export function canonicaliseMessagesForHash(
  messages: MessageForVerification[],
): CanonicalMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("At least one message is required");
  }

  if (messages.length > MAX_BATCH_MESSAGES) {
    throw new Error(`A batch cannot contain more than ${MAX_BATCH_MESSAGES} messages`);
  }

  const normalisedMessages = messages.map(normaliseMessage);
  const seenIndexes = new Set<number>();

  for (const message of normalisedMessages) {
    if (seenIndexes.has(message.index)) {
      throw new Error("index values must be unique within a batch");
    }

    seenIndexes.add(message.index);
  }

  return normalisedMessages.sort((left, right) => left.index - right.index);
}

export function serialiseMessagesForHash(messages: MessageForVerification[]): string {
  return JSON.stringify(canonicaliseMessagesForHash(messages));
}

export function computeMessagesHashFromMessages(messages: MessageForVerification[]): string {
  const canonicalBatchJson = serialiseMessagesForHash(messages);

  return ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes(MESSAGES_HASH_DOMAIN),
      ethers.toUtf8Bytes(canonicalBatchJson),
    ]),
  );
}
