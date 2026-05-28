// verification-page/digestUtils.js

/**
 * SecureMsg digest utility.
 *
 * This file handles:
 * 1. Canonicalising encrypted message envelopes
 * 2. Hashing each canonical envelope with keccak256
 * 3. Hashing up to 5 envelope hashes into one segment hash
 *
 * It expects ethers.js v6 to be available.
 */

(function () {
  "use strict";

  const CONFIG = window.SecureMsgConfig || {};

  const DIRECT_ENVELOPE_FIELDS = [
    "ciphertext",
    "conversation_id",
    "message_id",
    "message_type",
    "ratchet_header_enc",
    "recipient_id",
    "schema_version",
    "sender_id",
  ];

  const EXPECTED_SCHEMA_VERSION = "securemsg-envelope-v1";
  const EXPECTED_MESSAGE_TYPE = "direct";
  const SEGMENT_DIGEST_DOMAIN = "SecureMsgSegmentDigest:v1";
  const DEFAULT_MAX_SEGMENT_ENVELOPES = 5;
  const MAX_SEGMENT_ENVELOPES = Number.isInteger(CONFIG.maxSegmentEnvelopes)
    ? CONFIG.maxSegmentEnvelopes
    : DEFAULT_MAX_SEGMENT_ENVELOPES;

  function requireEthers() {
    if (typeof ethers === "undefined") {
      throw new Error(
        "ethers.js is not loaded. Include ethers before digestUtils.js."
      );
    }
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
  }

  function idToString(value, fieldName) {
    if (value === null || value === undefined) {
      throw new Error(`${fieldName} is required`);
    }

    return String(value);
  }

  function normaliseDirectEnvelope(envelope) {
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
      throw new Error("Envelope must be a JSON object");
    }

    const normalised = {
      ciphertext: envelope.ciphertext,
      conversation_id: envelope.conversation_id,
      message_id: idToString(envelope.message_id, "message_id"),
      message_type: envelope.message_type,
      ratchet_header_enc: envelope.ratchet_header_enc,
      recipient_id: idToString(envelope.recipient_id, "recipient_id"),
      schema_version: envelope.schema_version,
      sender_id: idToString(envelope.sender_id, "sender_id"),
    };

    if (normalised.schema_version !== EXPECTED_SCHEMA_VERSION) {
      throw new Error(
        `Invalid schema_version. Expected ${EXPECTED_SCHEMA_VERSION}`
      );
    }

    if (normalised.message_type !== EXPECTED_MESSAGE_TYPE) {
      throw new Error(`Invalid message_type. Expected ${EXPECTED_MESSAGE_TYPE}`);
    }

    for (const field of DIRECT_ENVELOPE_FIELDS) {
      if (!isNonEmptyString(normalised[field])) {
        throw new Error(`${field} must be a non-empty string`);
      }
    }

    return normalised;
  }

  function canonicaliseEnvelope(envelope) {
    const normalised = normaliseDirectEnvelope(envelope);
    const canonicalObject = {};

    for (const field of DIRECT_ENVELOPE_FIELDS) {
      canonicalObject[field] = normalised[field];
    }

    return JSON.stringify(canonicalObject);
  }

  function computeEnvelopeHash(envelope) {
    requireEthers();

    const canonicalJson = canonicaliseEnvelope(envelope);
    return ethers.keccak256(ethers.toUtf8Bytes(canonicalJson));
  }

  function validateEnvelopeHashes(envelopeHashes) {
    requireEthers();

    if (!Array.isArray(envelopeHashes) || envelopeHashes.length === 0) {
      throw new Error("At least one envelope hash is required");
    }

    if (envelopeHashes.length > MAX_SEGMENT_ENVELOPES) {
      throw new Error(
        `A segment cannot contain more than ${MAX_SEGMENT_ENVELOPES} envelope hashes`
      );
    }

    for (const hash of envelopeHashes) {
      if (!ethers.isHexString(hash, 32)) {
        throw new Error("All envelope hashes must be bytes32 hex strings");
      }
    }
  }

  function computeSegmentHashFromEnvelopeHashes(envelopeHashes) {
    requireEthers();
    validateEnvelopeHashes(envelopeHashes);

    return ethers.keccak256(
      ethers.concat([ethers.toUtf8Bytes(SEGMENT_DIGEST_DOMAIN), ...envelopeHashes])
    );
  }

  function buildSegmentDigest(envelopes) {
    if (!Array.isArray(envelopes) || envelopes.length === 0) {
      throw new Error("At least one envelope is required");
    }

    if (envelopes.length > MAX_SEGMENT_ENVELOPES) {
      throw new Error(
        `A segment cannot contain more than ${MAX_SEGMENT_ENVELOPES} envelopes`
      );
    }

    const canonicalJsonList = envelopes.map(canonicaliseEnvelope);
    const allEnvelopeHashes = envelopes.map(computeEnvelopeHash);
    const segmentHash = computeSegmentHashFromEnvelopeHashes(allEnvelopeHashes);
    const envelopeHashesByMessageId = {};

    for (let index = 0; index < envelopes.length; index++) {
      const normalisedEnvelope = normaliseDirectEnvelope(envelopes[index]);
      const messageId = normalisedEnvelope.message_id;

      if (Object.prototype.hasOwnProperty.call(envelopeHashesByMessageId, messageId)) {
        throw new Error(`Duplicate message_id in segment: ${messageId}`);
      }

      envelopeHashesByMessageId[messageId] = allEnvelopeHashes[index];
    }

    return {
      segmentHash,
      envelopeHashes: envelopeHashesByMessageId,
      canonicalJsonList,
      allEnvelopeHashes,
      messageCount: envelopes.length,
    };
  }

  window.SecureMsgDigest = {
    canonicaliseEnvelope,
    computeEnvelopeHash,
    computeSegmentHashFromEnvelopeHashes,
    buildSegmentDigest,
    MAX_SEGMENT_ENVELOPES,
  };
})();
