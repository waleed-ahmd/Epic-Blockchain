// verification-page/merkleUtils.js

/**
 * SecureMsg Merkle Utility
 *
 * This file handles:
 * 1. Canonicalising encrypted message envelopes
 * 2. Hashing each canonical envelope with keccak256
 * 3. Building a Merkle root for a conversation segment
 * 4. Creating Merkle proofs for messages in the segment
 * 5. Verifying a Merkle proof
 *
 * It expects ethers.js v6 to be available.
 *
 * In the verification page, include ethers first:
 * <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js"></script>
 * <script src="merkleUtils.js"></script>
 */

(function () {
  "use strict";

  /**
   * Required fields for a direct one-to-one encrypted message envelope.
   *
   * These fields are the only fields included in the hash.
   * Any extra fields are ignored so that the hash stays predictable.
   */
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

  /**
   * Expected schema version for this project.
   */
  const EXPECTED_SCHEMA_VERSION = "securemsg-envelope-v1";

  /**
   * Expected message type for the first implementation.
   */
  const EXPECTED_MESSAGE_TYPE = "direct";

  /**
   * Checks that ethers.js is available.
   */
  function requireEthers() {
    if (typeof ethers === "undefined") {
      throw new Error(
        "ethers.js is not loaded. Include ethers before merkleUtils.js."
      );
    }
  }

  /**
   * Checks whether a value is a non-empty string.
   */
  function isNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
  }

  /**
   * Converts IDs to strings.
   *
   * Backend may return IDs as numbers, for example:
   * message_id: 1
   *
   * But the canonical envelope uses strings:
   * message_id: "1"
   */
  function idToString(value, fieldName) {
    if (value === null || value === undefined) {
      throw new Error(`${fieldName} is required`);
    }

    return String(value);
  }

  /**
   * Validates and normalises a direct encrypted message envelope.
   *
   * The result is a clean object with only the exact fields we hash.
   *
   * Expected envelope:
   * {
   *   "schema_version": "securemsg-envelope-v1",
   *   "message_type": "direct",
   *   "conversation_id": "direct-2-3",
   *   "message_id": "1",
   *   "sender_id": "3",
   *   "recipient_id": "2",
   *   "ciphertext": "<base64>",
   *   "ratchet_header_enc": "<base64>"
   * }
   *
   * @param {Object} envelope - Raw encrypted message envelope.
   * @returns {Object} Normalised direct envelope.
   */
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

    if (!isNonEmptyString(normalised.ciphertext)) {
      throw new Error("ciphertext must be a non-empty string");
    }

    if (!isNonEmptyString(normalised.conversation_id)) {
      throw new Error("conversation_id must be a non-empty string");
    }

    if (!isNonEmptyString(normalised.message_id)) {
      throw new Error("message_id must be a non-empty string");
    }

    if (!isNonEmptyString(normalised.ratchet_header_enc)) {
      throw new Error("ratchet_header_enc must be a non-empty string");
    }

    if (!isNonEmptyString(normalised.recipient_id)) {
      throw new Error("recipient_id must be a non-empty string");
    }

    if (!isNonEmptyString(normalised.sender_id)) {
      throw new Error("sender_id must be a non-empty string");
    }

    return normalised;
  }

  /**
   * Converts an envelope into deterministic canonical JSON.
   *
   * Why?
   * JSON can be written in different orders:
   * {"message_id":"1","sender_id":"3"}
   * {"sender_id":"3","message_id":"1"}
   *
   * These look the same to humans, but produce different hashes.
   *
   * So we force:
   * - exact field names
   * - exact field order
   * - no whitespace
   * - IDs as strings
   * - conversation_id included
   * - sent_at excluded
   *
   * @param {Object} envelope - Raw encrypted message envelope.
   * @returns {string} Canonical JSON string.
   */
  function canonicaliseEnvelope(envelope) {
    const normalised = normaliseDirectEnvelope(envelope);

    const canonicalObject = {};

    for (const field of DIRECT_ENVELOPE_FIELDS) {
      canonicalObject[field] = normalised[field];
    }

    return JSON.stringify(canonicalObject);
  }

  /**
   * Computes keccak256 hash of the canonical encrypted envelope.
   *
   * @param {Object} envelope - Raw encrypted message envelope.
   * @returns {string} 32-byte hash as 0x-prefixed hex string.
   */
  function computeEnvelopeHash(envelope) {
    requireEthers();

    const canonicalJson = canonicaliseEnvelope(envelope);
    return ethers.keccak256(ethers.toUtf8Bytes(canonicalJson));
  }

  /**
   * Hashes two 32-byte hashes together.
   *
   * The order matters:
   * parent = keccak256(left || right)
   *
   * @param {string} leftHash - 0x-prefixed bytes32 hash.
   * @param {string} rightHash - 0x-prefixed bytes32 hash.
   * @returns {string} Parent hash.
   */
  function hashPair(leftHash, rightHash) {
    requireEthers();

    if (!ethers.isHexString(leftHash, 32)) {
      throw new Error("leftHash must be a bytes32 hex string");
    }

    if (!ethers.isHexString(rightHash, 32)) {
      throw new Error("rightHash must be a bytes32 hex string");
    }

    return ethers.keccak256(ethers.concat([leftHash, rightHash]));
  }

  /**
   * Builds a Merkle tree from leaf hashes.
   *
   * Important rule:
   * If a level has an odd number of hashes, duplicate the last hash.
   *
   * Example:
   * [A, B, C]
   * becomes:
   * hash(A+B), hash(C+C)
   *
   * @param {string[]} leafHashes - List of envelope hashes.
   * @returns {string[][]} Merkle tree levels.
   */
  function buildMerkleTreeFromHashes(leafHashes) {
    requireEthers();

    if (!Array.isArray(leafHashes) || leafHashes.length === 0) {
      throw new Error("At least one leaf hash is required");
    }

    if (leafHashes.length > 5) {
      throw new Error("A segment cannot contain more than 5 messages");
    }

    for (const hash of leafHashes) {
      if (!ethers.isHexString(hash, 32)) {
        throw new Error("All leaf hashes must be bytes32 hex strings");
      }
    }

    const tree = [];
    tree.push([...leafHashes]);

    let currentLevel = [...leafHashes];

    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right =
          i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];

        nextLevel.push(hashPair(left, right));
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return tree;
  }

  /**
   * Builds a Merkle tree from encrypted message envelopes.
   *
   * @param {Object[]} envelopes - Encrypted message envelopes in segment order.
   * @returns {Object} Tree data.
   */
  function buildMerkleTreeFromEnvelopes(envelopes) {
    if (!Array.isArray(envelopes) || envelopes.length === 0) {
      throw new Error("At least one envelope is required");
    }

    if (envelopes.length > 5) {
      throw new Error("A segment cannot contain more than 5 envelopes");
    }

    const canonicalJsonList = envelopes.map(canonicaliseEnvelope);
    const leafHashes = envelopes.map(computeEnvelopeHash);
    const tree = buildMerkleTreeFromHashes(leafHashes);
    const root = tree[tree.length - 1][0];

    return {
      canonicalJsonList,
      leafHashes,
      tree,
      root,
      messageCount: envelopes.length,
    };
  }

  /**
   * Creates a Merkle proof for a specific leaf index.
   *
   * A proof is a list of sibling hashes needed to rebuild the root.
   *
   * Each proof item includes:
   * - siblingHash
   * - position
   *
   * position tells whether the sibling was on the left or right.
   *
   * @param {string[][]} tree - Merkle tree levels.
   * @param {number} leafIndex - Index of target message in the segment.
   * @returns {Object[]} Merkle proof.
   */
  function getMerkleProof(tree, leafIndex) {
    if (!Array.isArray(tree) || tree.length === 0) {
      throw new Error("Merkle tree is required");
    }

    if (!Number.isInteger(leafIndex) || leafIndex < 0) {
      throw new Error("leafIndex must be a non-negative integer");
    }

    if (leafIndex >= tree[0].length) {
      throw new Error("leafIndex is outside the leaf level");
    }

    const proof = [];
    let index = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];

      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      let siblingHash;
      let position;

      if (siblingIndex < currentLevel.length) {
        siblingHash = currentLevel[siblingIndex];
        position = isRightNode ? "left" : "right";
      } else {
        // Odd number of nodes: last node is duplicated.
        siblingHash = currentLevel[index];
        position = "right";
      }

      proof.push({
        siblingHash,
        position,
      });

      index = Math.floor(index / 2);
    }

    return proof;
  }

  /**
   * Verifies that a leaf hash belongs to a Merkle root.
   *
   * @param {string} leafHash - Hash of the target encrypted envelope.
   * @param {Object[]} proof - Merkle proof.
   * @param {string} expectedRoot - Expected Merkle root.
   * @returns {boolean} true if proof reconstructs expected root.
   */
  function verifyMerkleProof(leafHash, proof, expectedRoot) {
    requireEthers();

    if (!ethers.isHexString(leafHash, 32)) {
      throw new Error("leafHash must be a bytes32 hex string");
    }

    if (!Array.isArray(proof)) {
      throw new Error("proof must be an array");
    }

    if (!ethers.isHexString(expectedRoot, 32)) {
      throw new Error("expectedRoot must be a bytes32 hex string");
    }

    let computedHash = leafHash;

    for (const item of proof) {
      if (!item || typeof item !== "object") {
        throw new Error("Invalid proof item");
      }

      const { siblingHash, position } = item;

      if (!ethers.isHexString(siblingHash, 32)) {
        throw new Error("siblingHash must be a bytes32 hex string");
      }

      if (position === "left") {
        computedHash = hashPair(siblingHash, computedHash);
      } else if (position === "right") {
        computedHash = hashPair(computedHash, siblingHash);
      } else {
        throw new Error("proof position must be left or right");
      }
    }

    return computedHash.toLowerCase() === expectedRoot.toLowerCase();
  }

  /**
   * Builds proof data for all messages in a closed segment.
   *
   * This is the main function Person 1's client should call when a segment
   * closes after 5 accepted messages or 10 minutes.
   *
   * It returns:
   * - segmentRoot: the Merkle root to record on Sepolia
   * - leafHashes: message_id -> envelope hash
   * - messageProofs: message_id -> Merkle proof
   * - canonicalJsonByMessageId: message_id -> canonical JSON string
   *
   * @param {Object[]} envelopes - Segment envelopes in exact client-accepted order.
   * @returns {Object} Segment proof data for all messages.
   */
  function buildSegmentProof(envelopes) {
    const result = buildMerkleTreeFromEnvelopes(envelopes);

    const leafHashesByMessageId = {};
    const messageProofsByMessageId = {};
    const canonicalJsonByMessageId = {};

    for (let index = 0; index < envelopes.length; index++) {
      const normalisedEnvelope = normaliseDirectEnvelope(envelopes[index]);
      const messageId = normalisedEnvelope.message_id;

      if (Object.prototype.hasOwnProperty.call(leafHashesByMessageId, messageId)) {
        throw new Error(`Duplicate message_id in segment: ${messageId}`);
      }

      leafHashesByMessageId[messageId] = result.leafHashes[index];
      messageProofsByMessageId[messageId] = getMerkleProof(result.tree, index);
      canonicalJsonByMessageId[messageId] = result.canonicalJsonList[index];
    }

    return {
      segmentRoot: result.root,
      leafHashes: leafHashesByMessageId,
      messageProofs: messageProofsByMessageId,
      canonicalJsonByMessageId,
      messageCount: result.messageCount,
      allLeafHashes: result.leafHashes,
      tree: result.tree,
    };
  }

  /**
   * Optional helper:
   * Builds proof data for one target message only.
   *
   * This keeps the old behaviour available if needed for testing.
   *
   * @param {Object[]} envelopes - Segment envelopes in exact segment order.
   * @param {number} targetIndex - Index of target message in the segment.
   * @returns {Object} Single-message proof data.
   */
  function buildMessageProof(envelopes, targetIndex) {
    const result = buildMerkleTreeFromEnvelopes(envelopes);

    if (!Number.isInteger(targetIndex) || targetIndex < 0) {
      throw new Error("targetIndex must be a non-negative integer");
    }

    if (targetIndex >= envelopes.length) {
      throw new Error("targetIndex is outside the segment");
    }

    const proof = getMerkleProof(result.tree, targetIndex);
    const normalisedEnvelope = normaliseDirectEnvelope(envelopes[targetIndex]);

    return {
      segmentRoot: result.root,
      leafHash: result.leafHashes[targetIndex],
      proof,
      messageCount: result.messageCount,
      targetIndex,
      messageId: normalisedEnvelope.message_id,
      canonicalJson: result.canonicalJsonList[targetIndex],
      allLeafHashes: result.leafHashes,
    };
  }

  /**
   * Expose functions globally for browser usage.
   */
  window.SecureMsgMerkle = {
    canonicaliseEnvelope,
    computeEnvelopeHash,
    hashPair,
    buildMerkleTreeFromHashes,
    buildMerkleTreeFromEnvelopes,
    getMerkleProof,
    verifyMerkleProof,
    buildSegmentProof,
    buildMessageProof,
  };
})();