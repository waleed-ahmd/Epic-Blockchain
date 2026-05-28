// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MessageIntegrity
 * @notice Records signed SecureMsg segment hashes on-chain.
 *
 * The caller signs the of 5 messages hash off-chain and submits it with their signature.
 * The contract verifies the signature matches msg.sender, stores the timestamp,
 * It proves the identity and providing a retrievable on-chain record.
 */
contract MessageIntegrity {
    struct DigestRecord {
        address recorder;
        uint64 timestamp;
    }

    /// @notice Look up a recorded digest by its hash. timestamp == 0 means not recorded.
    mapping(bytes32 => DigestRecord) private records;

    event DigestRecorded(bytes32 indexed hash, address indexed recorder, uint64 timestamp);

    /**
     * @notice Records a segment hash. The caller must have signed the segment hash.
     * @param hash      keccak256 segment hash.
     * @param signature EIP-191 signature of the segment hash.
     * @param timestamp The block timestamp when the hash is recorded.
     */
    function recordDigest(bytes32 hash, bytes calldata signature, uint64 timestamp) external {
        require(hash != bytes32(0), "Hash cannot be empty");
        require(signature.length > 0, "Signature cannot be empty");
        require(timestamp > 0, "Timestamp cannot be zero");
        require(timestamp <= block.timestamp, "Timestamp cannot be in the future");
        require(records[hash].timestamp == 0, "Hash already recorded");

        address recovered = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(hash), signature);
        require(recovered == msg.sender, "Signature does not match caller");

        records[hash] = DigestRecord({ recorder: msg.sender, timestamp: timestamp });
        emit DigestRecorded(hash, msg.sender, timestamp);
    }

    /**
     * @notice Retrieve the on-chain record for a given segment hash.
     * @param hash keccak256 hash of the conversation segment.
     * @return recorder  The address that submitted this hash.
     * @return timestamp The block timestamp when it was recorded (0 if not found).
     */
    function getRecord(bytes32 hash) external view returns (address recorder, uint256 timestamp) {
        DigestRecord memory r = records[hash];
        return (r.recorder, r.timestamp);
    }
}
