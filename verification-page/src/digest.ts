import { ethers } from "ethers";
import type { Envelope, NormalisedEnvelope } from "./types";

const DIRECT_ENVELOPE_FIELDS: Array<keyof NormalisedEnvelope> = [
  "ciphertext",
  "conversation_id",
  "message_id",
  "ratchet_header_enc",
  "recipient_id",
  "schema_version",
  "sender_id",
];

const EXPECTED_SCHEMA_VERSION = "securemsg-envelope-v1";
const SEGMENT_DIGEST_DOMAIN = "SecureMsgSegmentDigest:v1";
const MAX_SEGMENT_ENVELOPES = 5;

function idToString(value: unknown, fieldName: string): string {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }

  return String(value);
}

function requireNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

function assertMessageIdOrderable(messageId: string): void {
  if (!/^(0|[1-9]\d*)$/.test(messageId)) {
    throw new Error("message_id must be a non-negative integer");
  }
}

function compareMessageIds(left: NormalisedEnvelope, right: NormalisedEnvelope): number {
  const leftId = BigInt(left.message_id);
  const rightId = BigInt(right.message_id);

  if (leftId < rightId) return -1;
  if (leftId > rightId) return 1;
  return 0;
}

export function normaliseEnvelope(envelope: Envelope): NormalisedEnvelope {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("Envelope must be a JSON object");
  }

  const normalised: NormalisedEnvelope = {
    ciphertext: envelope.ciphertext,
    conversation_id: envelope.conversation_id,
    message_id: idToString(envelope.message_id, "message_id"),
    ratchet_header_enc: envelope.ratchet_header_enc,
    recipient_id: idToString(envelope.recipient_id, "recipient_id"),
    schema_version: envelope.schema_version,
    sender_id: idToString(envelope.sender_id, "sender_id"),
  };

  if (normalised.schema_version !== EXPECTED_SCHEMA_VERSION) {
    throw new Error(`Invalid schema_version. Expected ${EXPECTED_SCHEMA_VERSION}`);
  }

  for (const field of DIRECT_ENVELOPE_FIELDS) {
    requireNonEmptyString(normalised[field], String(field));
  }

  assertMessageIdOrderable(normalised.message_id);
  return normalised;
}

export function canonicaliseEnvelope(envelope: Envelope): string {
  const normalised = normaliseEnvelope(envelope);
  const canonicalObject = {} as NormalisedEnvelope;

  for (const field of DIRECT_ENVELOPE_FIELDS) {
    canonicalObject[field] = normalised[field];
  }

  return JSON.stringify(canonicalObject);
}

export function computeEnvelopeHash(envelope: Envelope): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicaliseEnvelope(envelope)));
}

export function sortEnvelopesByMessageId(envelopes: Envelope[]): Envelope[] {
  if (!Array.isArray(envelopes) || envelopes.length === 0) {
    throw new Error("At least one envelope is required");
  }

  if (envelopes.length > MAX_SEGMENT_ENVELOPES) {
    throw new Error(`A segment cannot contain more than ${MAX_SEGMENT_ENVELOPES} envelopes`);
  }

  const normalised = envelopes.map((envelope, index) => ({
    envelope,
    index,
    normalised: normaliseEnvelope(envelope),
  }));
  const seenMessageIds = new Set<string>();

  for (const item of normalised) {
    if (seenMessageIds.has(item.normalised.message_id)) {
      throw new Error("message_id values must be unique within a segment");
    }
    seenMessageIds.add(item.normalised.message_id);
  }

  return normalised
    .sort((left, right) => compareMessageIds(left.normalised, right.normalised) || left.index - right.index)
    .map((item) => item.envelope);
}

export function computeSegmentHashFromEnvelopes(envelopes: Envelope[]): {
  sortedEnvelopes: Envelope[];
  canonicalEnvelopes: string[];
  envelopeHashes: string[];
  segmentHash: string;
} {
  const sortedEnvelopes = sortEnvelopesByMessageId(envelopes);
  const canonicalEnvelopes = sortedEnvelopes.map(canonicaliseEnvelope);
  const envelopeHashes = sortedEnvelopes.map((envelope) => computeEnvelopeHash(envelope));

  return {
    sortedEnvelopes,
    canonicalEnvelopes,
    envelopeHashes,
    segmentHash: computeSegmentHashFromEnvelopeHashes(envelopeHashes),
  };
}

export function computeSegmentHashFromEnvelopeHashes(envelopeHashes: string[]): string {
  if (!Array.isArray(envelopeHashes) || envelopeHashes.length === 0) {
    throw new Error("At least one envelope hash is required");
  }

  if (envelopeHashes.length > MAX_SEGMENT_ENVELOPES) {
    throw new Error(`A segment cannot contain more than ${MAX_SEGMENT_ENVELOPES} envelope hashes`);
  }

  for (const hash of envelopeHashes) {
    if (!ethers.isHexString(hash, 32)) {
      throw new Error("All envelope hashes must be bytes32 hex strings");
    }
  }

  return ethers.keccak256(
    ethers.concat([ethers.toUtf8Bytes(SEGMENT_DIGEST_DOMAIN), ...envelopeHashes]),
  );
}
