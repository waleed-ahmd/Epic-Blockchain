// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MessageIntegrity
 * @notice Stores Merkle roots for client-created SecureMsg conversation segments.
 *
 * A conversation segment is a small batch of encrypted message envelopes.
 * In this project, the client closes a segment when either:
 *   - 5 accepted messages are collected, or
 *   - 10 minutes have passed,
 * whichever happens first.
 *
 * The client creates the segment locally, calculates the Merkle root off-chain,
 * and records only that Merkle root on-chain.
 *
 * The contract stores only the Merkle root and minimal segment metadata.
 * It does NOT store plaintext messages.
 * It does NOT store ciphertext messages.
 * It does NOT store full message envelopes.
 * It does NOT store Merkle proofs.
 * It does NOT store user private keys.
 */
contract MessageIntegrity {
    /**
     * @notice A blockchain record for one client-created conversation segment.
     *
     * segmentRoot:
     *   The Merkle root created from encrypted message envelope hashes.
     *
     * conversationRef:
     *   A client-generated conversation reference, for example "direct-2-3".
     *
     * segmentRef:
     *   A client-generated segment reference, for example "direct-2-3-local-seg-1".
     *
     * messageCount:
     *   Number of messages included in this segment.
     *   For this project, this should be between 1 and 5.
     *
     * timestamp:
     *   The blockchain timestamp when the segment root was recorded.
     *
     * recorder:
     *   The wallet address that submitted the segment root.
     */
    struct SegmentRecord {
        bytes32 segmentRoot;
        string conversationRef;
        string segmentRef;
        uint8 messageCount;
        uint256 timestamp;
        address recorder;
    }

    // recordId => SegmentRecord
    mapping(uint256 => SegmentRecord) private records;

    // Total number of records stored.
    // Record IDs start from 1.
    uint256 private recordCount;

    /**
     * @notice Emitted whenever a new segment root is recorded.
     */
    event SegmentRootRecorded(
        uint256 indexed recordId,
        bytes32 indexed segmentRoot,
        string conversationRef,
        string segmentRef,
        uint8 messageCount,
        uint256 timestamp,
        address indexed recorder
    );

    /**
     * @notice Records a Merkle root for a client-created conversation segment.
     *
     * @param segmentRoot The Merkle root of the segment.
     * @param conversationRef Client-generated conversation reference.
     * @param segmentRef Client-generated segment reference.
     * @param messageCount Number of messages in this segment.
     *
     * @return recordId The ID of the stored blockchain record.
     */
    function recordSegmentRoot(
        bytes32 segmentRoot,
        string calldata conversationRef,
        string calldata segmentRef,
        uint8 messageCount
    ) external returns (uint256 recordId) {
        require(segmentRoot != bytes32(0), "Segment root cannot be empty");
        require(bytes(conversationRef).length > 0, "Conversation reference required");
        require(bytes(segmentRef).length > 0, "Segment reference required");
        require(messageCount > 0, "Message count must be greater than zero");
        require(messageCount <= 5, "Message count cannot exceed 5");

        recordCount += 1;
        recordId = recordCount;

        records[recordId] = SegmentRecord({
            segmentRoot: segmentRoot,
            conversationRef: conversationRef,
            segmentRef: segmentRef,
            messageCount: messageCount,
            timestamp: block.timestamp,
            recorder: msg.sender
        });

        emit SegmentRootRecorded(
            recordId,
            segmentRoot,
            conversationRef,
            segmentRef,
            messageCount,
            block.timestamp,
            msg.sender
        );

        return recordId;
    }

    /**
     * @notice Retrieves a stored segment record by record ID.
     *
     * @param recordId The blockchain record ID.
     *
     * @return segmentRoot The stored Merkle root.
     * @return conversationRef Client-generated conversation reference.
     * @return segmentRef Client-generated segment reference.
     * @return messageCount Number of messages in the segment.
     * @return timestamp Blockchain timestamp when recorded.
     * @return recorder Wallet address that recorded the segment root.
     */
    function getRecord(uint256 recordId)
        external
        view
        returns (
            bytes32 segmentRoot,
            string memory conversationRef,
            string memory segmentRef,
            uint8 messageCount,
            uint256 timestamp,
            address recorder
        )
    {
        require(recordId > 0, "Record ID must be greater than zero");
        require(recordId <= recordCount, "Record does not exist");

        SegmentRecord memory record = records[recordId];

        return (
            record.segmentRoot,
            record.conversationRef,
            record.segmentRef,
            record.messageCount,
            record.timestamp,
            record.recorder
        );
    }

    /**
     * @notice Returns the total number of segment records stored in the contract.
     */
    function getRecordCount() external view returns (uint256) {
        return recordCount;
    }
}