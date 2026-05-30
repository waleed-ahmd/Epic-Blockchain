// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MessageIntegrity
 * @notice Records keccak256 hashes of message batches on-chain.
 *
 * The caller signs the messages_hash off-chain and submits it with their signature.
 * The contract verifies the signature matches msg.sender, stores the timestamp,
 * and proves identity by providing a retrievable on-chain record.
 */
contract MessageIntegrity {
    // address (20 bytes) + uint64 (8 bytes) = 28 bytes, fits in one 32-byte storage slot
    struct DigestRecord {
        address recorder;
        uint64 timestamp;
    }

    mapping(bytes32 => DigestRecord) private records;

    event DigestRecorded(bytes32 indexed hash, address indexed recorder, uint64 timestamp);

    error EmptyHash();
    error EmptySignature();
    error InvalidTimestamp();
    error FutureTimestamp();
    error AlreadyRecorded();
    error SignerMismatch();

    /**
     * @notice Records a message batch hash. The caller must have signed the hash.
     * @param hash      keccak256 messages_hash for the batch.
     * @param signature EIP-191 signature of hash produced by msg.sender's key.
     * @param timestamp Unix timestamp (seconds) when the message batch was recorded.
     */
    function recordDigest(bytes32 hash, bytes calldata signature, uint64 timestamp) external {
        if (hash == bytes32(0)) revert EmptyHash();
        if (signature.length == 0) revert EmptySignature();
        if (timestamp == 0) revert InvalidTimestamp();
        if (timestamp > block.timestamp) revert FutureTimestamp();
        if (records[hash].timestamp != 0) revert AlreadyRecorded();

        address recovered = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(hash), signature);
        if (recovered != msg.sender) revert SignerMismatch();

        records[hash] = DigestRecord({ recorder: msg.sender, timestamp: timestamp });
        emit DigestRecorded(hash, msg.sender, timestamp);
    }

    /**
     * @notice Retrieve the on-chain record for a given message batch hash.
     * @param hash keccak256 messages_hash for the batch.
     * @return recorder  The address that submitted this hash.
     * @return timestamp The block timestamp when it was recorded (0 if not found).
     */
    function getRecord(bytes32 hash) external view returns (address recorder, uint64 timestamp) {
        DigestRecord memory r = records[hash];
        return (r.recorder, r.timestamp);
    }
}
