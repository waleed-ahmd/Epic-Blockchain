import { ethers } from "ethers";
import type { MessageForVerification } from "./types";

const MESSAGES_HASH_DOMAIN = "SecureMsgMessagesHash:v1";
const MAX_BATCH_MESSAGES = 5;

function requireNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

function normaliseMessageId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("message_id must be a non-negative integer");
  }

  return value;
}

function compareMessageIds(left: MessageForVerification, right: MessageForVerification): number {
  return left.message_id - right.message_id;
}

export function normaliseMessage(message: MessageForVerification): MessageForVerification {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    throw new Error("Message must be a JSON object");
  }

  const normalised: MessageForVerification = {
    message_id: normaliseMessageId(message.message_id),
    sender_public_key: message.sender_public_key,
    ciphertext: message.ciphertext,
  };

  requireNonEmptyString(normalised.sender_public_key, "sender_public_key");
  requireNonEmptyString(normalised.ciphertext, "ciphertext");

  return normalised;
}

export function canonicaliseMessage(message: MessageForVerification): string {
  const normalised = normaliseMessage(message);

  return JSON.stringify({
    message_id: normalised.message_id,
    sender_public_key: normalised.sender_public_key,
    ciphertext: normalised.ciphertext,
  });
}

export function computeMessageHash(message: MessageForVerification): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicaliseMessage(message)));
}

export function sortMessagesByMessageId(
  messages: MessageForVerification[],
): MessageForVerification[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("At least one message is required");
  }

  if (messages.length > MAX_BATCH_MESSAGES) {
    throw new Error(`A batch cannot contain more than ${MAX_BATCH_MESSAGES} messages`);
  }

  const normalised = messages.map((message, index) => ({
    message,
    index,
    normalised: normaliseMessage(message),
  }));
  const seenMessageIds = new Set<number>();

  for (const item of normalised) {
    if (seenMessageIds.has(item.normalised.message_id)) {
      throw new Error("message_id values must be unique within a batch");
    }
    seenMessageIds.add(item.normalised.message_id);
  }

  return normalised
    .sort((left, right) => compareMessageIds(left.normalised, right.normalised) || left.index - right.index)
    .map((item) => item.normalised);
}

export function computeMessagesHashFromMessages(messages: MessageForVerification[]): {
  sortedMessages: MessageForVerification[];
  canonicalMessages: string[];
  messageHashes: string[];
  messagesHash: string;
} {
  const sortedMessages = sortMessagesByMessageId(messages);
  const canonicalMessages = sortedMessages.map(canonicaliseMessage);
  const messageHashes = sortedMessages.map(computeMessageHash);

  return {
    sortedMessages,
    canonicalMessages,
    messageHashes,
    messagesHash: computeMessagesHashFromMessageHashes(messageHashes),
  };
}

export function computeMessagesHashFromMessageHashes(messageHashes: string[]): string {
  if (!Array.isArray(messageHashes) || messageHashes.length === 0) {
    throw new Error("At least one message hash is required");
  }

  if (messageHashes.length > MAX_BATCH_MESSAGES) {
    throw new Error(`A batch cannot contain more than ${MAX_BATCH_MESSAGES} message hashes`);
  }

  for (const hash of messageHashes) {
    if (!ethers.isHexString(hash, 32)) {
      throw new Error("All message hashes must be bytes32 hex strings");
    }
  }

  return ethers.keccak256(
    ethers.concat([ethers.toUtf8Bytes(MESSAGES_HASH_DOMAIN), ...messageHashes]),
  );
}
